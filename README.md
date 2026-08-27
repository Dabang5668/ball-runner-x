# Ball Runner X

An endless runner built with plain HTML5 Canvas and vanilla JavaScript.
No build step, no framework - open it in a browser and play.

Play: dodge obstacles, collect coins, chase the rank.

## Features

- 9 obstacle types, 4 power-ups, combo multipliers and close-call bonuses
- 6 world presets that reskin the ball, background and every obstacle at once
- Adaptive soundtrack that speeds up as levels rise
- Accounts (email/password or Google) with cloud-saved progress
- Global leaderboard

## Controls

| Action | Keys |
|---|---|
| Jump / double jump | `SPACE` `↑` `W` or tap |
| Duck | `↓` `S` or hold the duck button |
| Pause | `P` or `ESC` |
| Sound effects | `M` |
| Music | `N` |

## Running it locally

The game needs a real HTTP server. Opening `index.html` straight from the
file system (`file://`) breaks Supabase login, because browsers block
authentication requests from file URLs.

```bash
python -m http.server 5500
```

Then open http://localhost:5500

## Cloud saves (optional)

Without configuration the game still works - progress is kept in
`localStorage` on the device. To switch on accounts and the leaderboard:

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the SQL Editor
3. Put your project URL and anon key in `js/supabase-config.js`
4. Add your site's URL under Authentication → URL Configuration → Redirect URLs

The anon key is meant to be public. Access is controlled by the Row Level
Security policies in `supabase-schema.sql`: a player can only read and write
their own profile row, and the leaderboard comes from a function that
returns usernames and scores only.

## Project layout

```
index.html          home, stats, leaderboard
play.html           the game canvas
customize.html      ball / background / obstacle skins
howtoplay.html      controls and obstacle reference

css/style.css       shared page styling
css/game.css        in-game layout
css/auth.css        login widget and modal

js/game.js          engine: physics, obstacles, rendering, scoring
js/audio.js         procedural sound effects and music
js/customize.js     customization page with live preview
js/starfield.js     animated background for the static pages
js/nav-settings.js  carries the chosen look into play.html
js/auth.js          Supabase wrapper: sessions, cloud save, leaderboard
js/auth-ui.js       login / signup modal and nav widget
js/home.js          home page stats and leaderboard rendering

supabase-schema.sql database tables, security policies, triggers
```
