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

    /* Which account the numbers currently in localStorage belong to.
       Empty / missing means "guest progress made on this device".
       This is what stops account A's cloud save from being merged into
       a brand new account B that signs up right after A logs out. */
    const LS_OWNER        = "ballRunnerProgressOwner";

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

    /* every read of a profile row asks for the same shape */
    const PROFILE_COLUMNS_BASE = "id,username,best_score,total_coins,achievements,settings";
    const PROFILE_COLUMNS_FULL = "id,username,avatar,best_score,total_coins,achievements,settings";

    /* The avatar column arrived after the first release. If a project is
       still on the old schema the first select fails, so we detect that
       once and quietly fall back instead of breaking cloud saves. */
    let avatarSupported = true;

    function cols(){
        return avatarSupported ? PROFILE_COLUMNS_FULL : PROFILE_COLUMNS_BASE;
    }

    function isMissingAvatar(error){
        return !!error && /avatar/i.test(String(error.message || error));
    }

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

    /* ---------- progress ownership ---------- */

    function getOwner(){
        try{
            return localStorage.getItem(LS_OWNER) || "";
        }catch(e){
            return "";
        }
    }

    function setOwner(id){
        try{
            if(id) localStorage.setItem(LS_OWNER, id);
            else localStorage.removeItem(LS_OWNER);
        }catch(e){}
    }

    /* Wipes the device's score/coin/achievement progress so the next
       player on this browser starts from zero. Cosmetic settings are
       deliberately kept - they are a device preference, not progress. */

    function clearLocalProgress(){
        try{
            localStorage.setItem(LS_BEST, "0");
            localStorage.setItem(LS_COINS, "0");
            localStorage.setItem(LS_ACHIEVEMENTS, "[]");
            localStorage.removeItem(LS_OWNER);
        }catch(e){}

        if(window.GameProgressReset) window.GameProgressReset();
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

        function read(){
            return client
                .from("profiles")
                .select(cols())
                .eq("id", currentUser.id)
                .maybeSingle();
        }

        return read().then(res => {

            /* old schema without the avatar column: retry once */
            if(res.error && avatarSupported && isMissingAvatar(res.error)){
                avatarSupported = false;
                return read();
            }

            return res;

        }).then(({data, error}) => {

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

    /* Brings the account's cloud save onto this device.

       Local progress is only merged INTO the cloud when it actually
       belongs to this account or to a guest who has never logged in on
       this browser. If the numbers in localStorage were left behind by a
       different account, they are discarded instead - otherwise player B
       would inherit player A's high score just by signing up on the
       same browser. */

    function syncProgress(){

        if(!client || !currentUser) return Promise.resolve(null);

        const userId = currentUser.id;
        syncedUsers.add(userId);

        const owner = getOwner();
        const claimLocal = (owner === "" || owner === userId);

        return fetchProfile().then(cloud => {

            const local = localSnapshot();

            const merged = claimLocal ? {
                best_score:  Math.max(local.best_score,  (cloud && cloud.best_score)  || 0),
                total_coins: Math.max(local.total_coins, (cloud && cloud.total_coins) || 0),
                achievements: [...new Set([
                    ...local.achievements,
                    ...((cloud && Array.isArray(cloud.achievements)) ? cloud.achievements : [])
                ])],
                settings: Object.keys(local.settings).length
                    ? local.settings
                    : ((cloud && cloud.settings) || {})
            } : {
                /* foreign device progress: cloud is the only truth */
                best_score:  (cloud && cloud.best_score)  || 0,
                total_coins: (cloud && cloud.total_coins) || 0,
                achievements: (cloud && Array.isArray(cloud.achievements)) ? cloud.achievements : [],
                settings: Object.keys(local.settings).length
                    ? local.settings
                    : ((cloud && cloud.settings) || {})
            };

            applyToLocal(merged);
            setOwner(userId);

            if(window.GameProgressReset) window.GameProgressReset();

            /* The signup trigger normally creates the row. If it is missing
               for any reason, upsert so cloud saves still work. */

            const write = cloud
                ? client.from("profiles").update(merged).eq("id", currentUser.id)
                : client.from("profiles").upsert(Object.assign({
                      id: currentUser.id,
                      username: defaultUsername()
                  }, merged));

            return write
                .select(cols())
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

        /* the numbers being pushed are this account's from now on */
        setOwner(currentUser.id);

        return client
            .from("profiles")
            .update(localSnapshot())
            .eq("id", currentUser.id)
            .select(cols())
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

            /* The next player on this browser must not inherit these
               numbers, and the ex-player's cloud row already has them. */
            clearLocalProgress();

            notify();
        }

        return pushProgress()
            .then(() => client.auth.signOut())
            .then(clear)
            .catch(clear);
    }

    /* ---------- profile editing ---------- */

    const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

    /* Updates username and/or avatar. Both are optional; only the keys
       that are actually provided get written. */

    function updateProfile(changes){

        if(!client || !currentUser)
            return Promise.resolve({profile:null, error:"You need to be logged in."});

        const patch = {};

        if(typeof changes.username === "string"){

            const name = changes.username.trim();

            if(!USERNAME_RE.test(name))
                return Promise.resolve({
                    profile:null,
                    error:"Username must be 3-20 characters: letters, numbers or underscore."
                });

            patch.username = name;
        }

        if(typeof changes.avatar === "string" && avatarSupported)
            patch.avatar = changes.avatar.trim().slice(0, 40);

        if(!Object.keys(patch).length)
            return Promise.resolve({profile:currentProfile, error:null});

        return client
            .from("profiles")
            .update(patch)
            .eq("id", currentUser.id)
            .select(cols())
            .maybeSingle()
            .then(({data, error}) => {

                if(error) return {profile:null, error:friendlyError(error)};

                currentProfile = data || currentProfile;
                notify();
                return {profile:currentProfile, error:null};
            })
            .catch(e => ({profile:null, error:friendlyError(e)}));
    }

    function changePassword(newPassword){

        if(!client || !currentUser)
            return Promise.resolve({error:"You need to be logged in."});

        const pass = String(newPassword || "");

        if(pass.length < 6)
            return Promise.resolve({error:"Password must be at least 6 characters."});

        return client.auth.updateUser({password: pass})
            .then(({error}) => ({error: error ? friendlyError(error) : null}))
            .catch(e => ({error: friendlyError(e)}));
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

        /* emoji avatar id, or "" when the player has not picked one */
        getAvatar(){
            return (currentProfile && currentProfile.avatar) || "";
        },

        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        syncProgress,
        pushProgress,
        getLeaderboard,
        updateProfile,
        changePassword,

        onChange(fn){
            if(typeof fn !== "function") return () => {};
            listeners.add(fn);
            fn(currentUser, currentProfile);
            return () => listeners.delete(fn);
        }
    };
})();

