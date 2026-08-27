-- ============================================================
-- BALL RUNNER X - SUPABASE SCHEMA
-- ------------------------------------------------------------
-- Run this once in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
-- ============================================================


-- ------------------------------------------------------------
-- 1. profiles table (one row per player)
-- ------------------------------------------------------------

create table if not exists public.profiles (
    id            uuid        primary key references auth.users(id) on delete cascade,
    username      text        not null,
    avatar        text        not null default '',
    best_score    integer     not null default 0,
    total_coins   integer     not null default 0,
    achievements  jsonb       not null default '[]'::jsonb,
    settings      jsonb       not null default '{}'::jsonb,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),

    constraint profiles_username_length check (char_length(username) between 3 and 20),
    constraint profiles_avatar_length check (char_length(avatar) <= 40),
    constraint profiles_best_score_positive check (best_score >= 0),
    constraint profiles_total_coins_positive check (total_coins >= 0)
);

-- existing projects: add the avatar column without touching the data
alter table public.profiles
    add column if not exists avatar text not null default '';

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'profiles_avatar_length'
    ) then
        alter table public.profiles
            add constraint profiles_avatar_length check (char_length(avatar) <= 40);
    end if;
end $$;

-- usernames are player-editable, so keep them inside a safe character set.
-- NOT VALID: only new/updated rows are checked, so any legacy row with an
-- odd username is left alone instead of blocking the migration.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'profiles_username_charset'
    ) then
        alter table public.profiles
            add constraint profiles_username_charset
            check (username ~ '^[A-Za-z0-9_]{3,20}$') not valid;
    end if;
end $$;

-- case-insensitive unique usernames
create unique index if not exists profiles_username_unique_idx
    on public.profiles (lower(username));

-- fast leaderboard reads
create index if not exists profiles_best_score_idx
    on public.profiles (best_score desc);


-- ------------------------------------------------------------
-- 2. Row Level Security
--    A player can only read and write their OWN profile row.
--    Leaderboard data is served by the security-definer function
--    in section 5, which exposes username + scores only - never
--    ids, emails or settings.
--    Nobody can delete rows from the client.
-- ------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;

drop policy if exists "players can read their own profile" on public.profiles;
create policy "players can read their own profile"
    on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);

drop policy if exists "players can insert their own profile" on public.profiles;
create policy "players can insert their own profile"
    on public.profiles
    for insert
    to authenticated
    with check (auth.uid() = id);

drop policy if exists "players can update their own profile" on public.profiles;
create policy "players can update their own profile"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);


-- ------------------------------------------------------------
-- 3. Auto-create a profile row whenever someone signs up.
--    Username source order:
--      1. "username" from the sign-up form (email/password flow)
--      2. "full_name" / "name" from the OAuth provider (Google)
--      3. the name part of the email address
--    Non-alphanumeric characters are stripped so Google display
--    names like "Ravi Kumar" become "ravi_kumar".
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    wanted_username text;
begin
    wanted_username := nullif(trim(new.raw_user_meta_data->>'username'), '');

    if wanted_username is null then
        wanted_username := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
    end if;

    if wanted_username is null then
        wanted_username := nullif(trim(new.raw_user_meta_data->>'name'), '');
    end if;

    if wanted_username is null then
        wanted_username := split_part(coalesce(new.email, 'player'), '@', 1);
    end if;

    -- spaces to underscores, then drop anything that is not a-z 0-9 _
    wanted_username := lower(regexp_replace(wanted_username, '\s+', '_', 'g'));
    wanted_username := regexp_replace(wanted_username, '[^a-z0-9_]', '', 'g');

    if wanted_username is null or wanted_username = '' then
        wanted_username := 'player';
    end if;

    -- keep it inside the length constraint
    wanted_username := left(wanted_username, 20);

    if char_length(wanted_username) < 3 then
        wanted_username := wanted_username || '_player';
    end if;

    -- de-duplicate by appending a short slice of the user id
    if exists (select 1 from public.profiles p where lower(p.username) = lower(wanted_username)) then
        wanted_username := left(wanted_username, 13) || '_' || left(replace(new.id::text, '-', ''), 6);
    end if;

    insert into public.profiles (id, username)
    values (new.id, wanted_username)
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- 4. Keep updated_at honest
-- ------------------------------------------------------------

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
    before update on public.profiles
    for each row execute function public.touch_profile_updated_at();


-- ------------------------------------------------------------
-- 5. Leaderboard
--    A security-definer function so it can read past RLS while
--    returning only the columns that are safe to show publicly.
--    Anonymous visitors can call it too, so the home page shows
--    a leaderboard before anyone logs in.
-- ------------------------------------------------------------

drop view if exists public.leaderboard;

drop function if exists public.get_leaderboard(integer);

create or replace function public.get_leaderboard(row_limit integer default 10)
returns table (
    username    text,
    avatar      text,
    best_score  integer,
    total_coins integer
)
language sql
security definer
stable
set search_path = public
as $$
    select p.username, p.avatar, p.best_score, p.total_coins
    from public.profiles p
    where p.best_score > 0
    order by p.best_score desc, p.updated_at asc
    limit least(greatest(coalesce(row_limit, 10), 1), 50);
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
