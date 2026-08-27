"use strict";

/* ============================================================
   BALL RUNNER X - AUTH + CLOUD SAVE
   ------------------------------------------------------------
   Thin wrapper around the Supabase JS v2 UMD build.

   Everything degrades gracefully: if js/supabase-config.js still
   holds the placeholder values (or the CDN is unreachable) the
   game keeps running in "offline / localStorage only" mode and
   the auth UI explains that instead of throwing errors.

   Public API (window.GameAuth):
     isConfigured()            -> boolean
     ready()                   -> Promise (resolves once session restored)
     getUser()                 -> user object or null
     getProfile()              -> cached profile row or null
     signUp(email,pass,name)   -> Promise<{user,error}>
     signIn(email,pass)        -> Promise<{user,error}>
     signOut()                 -> Promise
     onChange(fn)              -> subscribe to auth changes
     pushProgress()            -> Promise (local -> cloud)
     syncProgress()            -> Promise (cloud <-> local merge)
     getLeaderboard(limit)     -> Promise<{rows,error}>
   ============================================================ */

(function(){

    /* ---------- local storage keys used by the game ---------- */

    const LS_BEST         = "ballRunnerHighScore";
    const LS_COINS        = "ballRunnerTotalCoins";
    const LS_ACHIEVEMENTS = "ballRunnerAchievements";
    const LS_SETTINGS     = "ballRunnerSettings";

    const PLACEHOLDER_URL = "YOUR_SUPABASE_PROJECT_URL";
    const PLACEHOLDER_KEY = "YOUR_SUPABASE_ANON_KEY";

    const config = window.SUPABASE_CONFIG || {};

    const configured =
        typeof config.url === "string" &&
        typeof config.anonKey === "string" &&
        config.url.trim() !== "" &&
        config.anonKey.trim() !== "" &&
        config.url.trim() !== PLACEHOLDER_URL &&
        config.anonKey.trim() !== PLACEHOLDER_KEY &&
        /^https?:\/\//.test(config.url.trim());

    let client = null;
    let currentUser = null;
    let currentProfile = null;

    /* users whose cloud save has already been merged during this page load */
    const syncedUsers = new Set();

    const listeners = new Set();

    function notify(){
        for(const fn of listeners){
            try{ fn(currentUser, currentProfile); }catch(e){}
        }
    }


    /* ---------- localStorage helpers ---------- */

    function readNumber(key){
        return Number(localStorage.getItem(key) || 0) || 0;
    }

    function readAchievements(){
        try{
            const parsed = JSON.parse(localStorage.getItem(LS_ACHIEVEMENTS) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        }catch(e){
            return [];
        }
    }

    function readSettings(){
        try{
            const parsed = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
            return (parsed && typeof parsed === "object") ? parsed : {};
        }catch(e){
            return {};
        }
    }

    function localSnapshot(){
        return {
            best_score:   Math.floor(readNumber(LS_BEST)),
            total_coins:  Math.floor(readNumber(LS_COINS)),
            achievements: readAchievements(),
            settings:     readSettings()
        };
    }


    /* ---------- client bootstrap ---------- */

    const readyPromise = (function(){

        if(!configured) return Promise.resolve(null);

        if(!window.supabase || typeof window.supabase.createClient !== "function"){
            console.warn("[GameAuth] Supabase library not loaded - running offline.");
            return Promise.resolve(null);
        }

        try{
            client = window.supabase.createClient(config.url.trim(), config.anonKey.trim(), {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
        }catch(e){
            console.warn("[GameAuth] Could not create Supabase client:", e.message);
            client = null;
            return Promise.resolve(null);
        }

        client.auth.onAuthStateChange((event, session) => {

            currentUser = (session && session.user) || null;

            if(!currentUser){
                currentProfile = null;
                notify();
                return;
            }

            /* A Google login lands here after the redirect, so this is the
               only place where that session can be merged with the device's
               local progress. Password logins already sync inside signIn(),
               hence the guard against syncing the same user twice. */

            if(!syncedUsers.has(currentUser.id)){
                syncProgress();
                return;
            }

            /* SIGNED_IN also fires on tab focus / token refresh, so the
               profile fetch stays cheap and idempotent. */
            fetchProfile().then(notify);
        });

        return client.auth.getSession().then(({data}) => {

            currentUser = (data && data.session && data.session.user) || null;

            if(!currentUser) return null;

            return fetchProfile().then(p => { notify(); return p; });

        }).catch(e => {
            console.warn("[GameAuth] Session restore failed:", e.message);
            return null;
        });
    })();


    /* ---------- profile ---------- */

    function fetchProfile(){

        if(!client || !currentUser) return Promise.resolve(null);

        return client
            .from("profiles")
            .select("id,username,best_score,total_coins,achievements,settings")
            .eq("id", currentUser.id)
            .maybeSingle()
            .then(({data, error}) => {

                if(error){
                    console.warn("[GameAuth] Profile fetch failed:", error.message);
                    return null;
                }

                currentProfile = data || null;
                return currentProfile;
            });
    }


    /* ---------- progress sync ---------- */

    function applyToLocal(profile){

        if(!profile) return;

        localStorage.setItem(LS_BEST, Math.floor(profile.best_score || 0));
        localStorage.setItem(LS_COINS, Math.floor(profile.total_coins || 0));

        const achievements = Array.isArray(profile.achievements) ? profile.achievements : [];
        localStorage.setItem(LS_ACHIEVEMENTS, JSON.stringify(achievements));

        if(profile.settings && typeof profile.settings === "object" && Object.keys(profile.settings).length){
            localStorage.setItem(LS_SETTINGS, JSON.stringify(profile.settings));
            if(window.updateNavPlayLinks) window.updateNavPlayLinks(profile.settings);
        }
    }

    /* Merges device progress with cloud progress, keeping the best of
       both, then writes the result back to Supabase and localStorage. */

    function syncProgress(){

        if(!client || !currentUser) return Promise.resolve(null);

        const userId = currentUser.id;
        syncedUsers.add(userId);

        return fetchProfile().then(cloud => {

            const local = localSnapshot();

            const merged = {
                best_score:  Math.max(local.best_score,  (cloud && cloud.best_score)  || 0),
                total_coins: Math.max(local.total_coins, (cloud && cloud.total_coins) || 0),
                achievements: [...new Set([
                    ...local.achievements,
                    ...((cloud && Array.isArray(cloud.achievements)) ? cloud.achievements : [])
                ])],
                settings: Object.keys(local.settings).length
                    ? local.settings
                    : ((cloud && cloud.settings) || {})
            };

            applyToLocal(merged);

            /* The signup trigger normally creates the row. If it is missing
               for any reason, upsert so cloud saves still work. */

            const write = cloud
                ? client.from("profiles").update(merged).eq("id", currentUser.id)
                : client.from("profiles").upsert(Object.assign({
                      id: currentUser.id,
                      username: defaultUsername()
                  }, merged));

            return write
                .select("id,username,best_score,total_coins,achievements,settings")
                .maybeSingle()
                .then(({data, error}) => {

                    if(error){
                        console.warn("[GameAuth] Progress sync failed:", error.message);
                        return currentProfile;
                    }

                    currentProfile = data || currentProfile;
                    notify();
                    return currentProfile;
                });
        });
    }

    function defaultUsername(){

        const meta = currentUser && currentUser.user_metadata;
        const fromMeta = meta && typeof meta.username === "string" ? meta.username.trim() : "";

        if(fromMeta.length >= 3) return fromMeta.slice(0, 20);

        const email = (currentUser && currentUser.email) || "";
        const base = email.split("@")[0] || "player";

        return (base.length >= 3 ? base : base + "_player").slice(0, 20);
    }

    /* One-way push, used right after a run ends. */

    function pushProgress(){

        if(!client || !currentUser) return Promise.resolve(null);

        return client
            .from("profiles")
            .update(localSnapshot())
            .eq("id", currentUser.id)
            .select("id,username,best_score,total_coins,achievements,settings")
            .maybeSingle()
            .then(({data, error}) => {

                if(error){
                    console.warn("[GameAuth] Progress push failed:", error.message);
                    return null;
                }

                currentProfile = data || currentProfile;
                notify();
                return currentProfile;
            })
            .catch(e => {
                console.warn("[GameAuth] Progress push failed:", e.message);
                return null;
            });
    }



    /* ---------- auth actions ---------- */

    function friendlyError(error){

        if(!error) return null;

        const msg = String(error.message || error);

        if(/invalid login credentials/i.test(msg))
            return "Email or password is incorrect.";

        if(/email not confirmed/i.test(msg))
            return "Please confirm your email first - check your inbox.";

        if(/user already registered|already been registered/i.test(msg))
            return "That email already has an account. Try logging in.";

        if(/password should be at least/i.test(msg))
            return "Password must be at least 6 characters.";

        if(/rate limit|too many/i.test(msg))
            return "Too many attempts. Please wait a minute and try again.";

        if(/duplicate key|profiles_username_unique/i.test(msg))
            return "That username is already taken.";

        if(/provider is not enabled|Unsupported provider/i.test(msg))
            return "Google sign-in is not switched on in Supabase yet.";

        if(/failed to fetch|networkerror|load failed/i.test(msg))
            return "Can't reach the server. Check your connection.";

        return msg;
    }

    function signUp(email, password, username){

        if(!client)
            return Promise.resolve({user:null, error:"Cloud saves are not configured yet."});

        return client.auth.signUp({
            email: String(email || "").trim(),
            password: String(password || ""),
            options: {
                data: { username: String(username || "").trim() }
            }
        }).then(({data, error}) => {

            if(error) return {user:null, error:friendlyError(error)};

            /* When email confirmation is ON there is no session yet. */
            const needsConfirm = !data.session;

            if(needsConfirm)
                return {user:data.user, error:null, needsConfirm:true};

            currentUser = data.user;

            return syncProgress().then(() => ({
                user:data.user, error:null, needsConfirm:false
            }));

        }).catch(e => ({user:null, error:friendlyError(e)}));
    }

    function signIn(email, password){

        if(!client)
            return Promise.resolve({user:null, error:"Cloud saves are not configured yet."});

        return client.auth.signInWithPassword({
            email: String(email || "").trim(),
            password: String(password || "")
        }).then(({data, error}) => {

            if(error) return {user:null, error:friendlyError(error)};

            currentUser = data.user;

            return syncProgress().then(() => ({user:data.user, error:null}));

        }).catch(e => ({user:null, error:friendlyError(e)}));
    }

    function signInWithGoogle(){

        if(!client)
            return Promise.resolve({error:"Cloud saves are not configured yet."});

        /* Redirects away from the page. Coming back, detectSessionInUrl
           picks up the session and onAuthStateChange merges the progress,
           so there is nothing to await here on success. */

        return client.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.href.split("#")[0],
                queryParams: { prompt: "select_account" }
            }
        }).then(({error}) => {

            if(error) return {error:friendlyError(error)};
            return {error:null};

        }).catch(e => ({error:friendlyError(e)}));
    }

    function signOut(){

        if(!client) return Promise.resolve();

        function clear(){
            currentUser = null;
            currentProfile = null;
            syncedUsers.clear();
            notify();
        }

        return pushProgress()
            .then(() => client.auth.signOut())
            .then(clear)
            .catch(clear);
    }

    function getLeaderboard(limit){

        if(!client)
            return Promise.resolve({rows:[], error:"Cloud saves are not configured yet."});

        const max = Math.min(Math.max(Number(limit) || 10, 1), 50);

        /* RPC instead of a direct table read: RLS keeps profile rows
           private, and get_leaderboard() returns only username + scores.
           Wrapped in try/catch so a bad client can never throw
           synchronously into the caller's render code. */

        try{
            return client
                .rpc("get_leaderboard", {row_limit: max})
                .then(({data, error}) => ({
                    rows: data || [],
                    error: error ? friendlyError(error) : null
                }))
                .catch(e => ({rows:[], error:friendlyError(e)}));
        }catch(e){
            return Promise.resolve({rows:[], error:friendlyError(e)});
        }
    }


    /* ---------- public API ---------- */

    window.GameAuth = {
        isConfigured: () => configured && !!client,
        ready: () => readyPromise,
        getClient: () => client,
        getUser: () => currentUser,
        getProfile: () => currentProfile,

        getDisplayName(){
            if(currentProfile && currentProfile.username) return currentProfile.username;
            if(currentUser && currentUser.email) return currentUser.email.split("@")[0];
            return "Guest";
        },

        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        syncProgress,
        pushProgress,
        getLeaderboard,

        onChange(fn){
            if(typeof fn !== "function") return () => {};
            listeners.add(fn);
            fn(currentUser, currentProfile);
            return () => listeners.delete(fn);
        }
    };
})();

