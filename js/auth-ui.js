"use strict";

/* ============================================================
   AUTH UI
   ------------------------------------------------------------
   Injects the login/signup widget into the nav bar and builds
   the modal used for both flows. Works on every page that has
   a <nav class="nav"> element.

   Requires: js/auth.js (window.GameAuth)
   ============================================================ */

(function(){

    if(!window.GameAuth){
        console.warn("[AuthUI] GameAuth missing - auth UI disabled.");
        return;
    }

    let overlay, modal, msgBox, tabLogin, tabSignup, form, submitBtn, usernameField, googleBtn;
    let mode = "login";


    /* ---------- modal ---------- */

    function buildModal(){

        overlay = document.createElement("div");
        overlay.className = "auth-overlay";
        overlay.id = "authOverlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "authTitle");

        overlay.innerHTML = `
            <div class="auth-modal">
                <h3 id="authTitle">Welcome back, runner</h3>
                <div class="sub" id="authSub">Log in to save your score to the cloud.</div>

                <div class="auth-tabs" role="tablist">
                    <button class="auth-tab active" id="authTabLogin" role="tab" aria-selected="true">LOG IN</button>
                    <button class="auth-tab" id="authTabSignup" role="tab" aria-selected="false">SIGN UP</button>
                </div>

                <div class="auth-msg" id="authMsg" role="alert"></div>

                <button type="button" class="auth-google" id="authGoogle">
                    <span class="g-icon" aria-hidden="true">
                        <svg viewBox="0 0 18 18" width="18" height="18">
                            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A8.99 8.99 0 0 0 9 18z"/>
                            <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a8.99 8.99 0 0 0 0 8.12l3.01-2.34z"/>
                            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
                        </svg>
                    </span>
                    <span id="authGoogleLabel">Continue with Google</span>
                </button>

                <div class="auth-divider"><span>or use email</span></div>

                <form id="authForm" novalidate>
                    <div class="auth-field" id="authUsernameField" style="display:none;">
                        <label for="authUsername">Username</label>
                        <input type="text" id="authUsername" name="username" autocomplete="nickname"
                               placeholder="RunnerX" minlength="3" maxlength="20">
                    </div>

                    <div class="auth-field">
                        <label for="authEmail">Email</label>
                        <input type="email" id="authEmail" name="email" autocomplete="email"
                               placeholder="you@example.com" required>
                    </div>

                    <div class="auth-field">
                        <label for="authPassword">Password</label>
                        <input type="password" id="authPassword" name="password"
                               autocomplete="current-password" placeholder="At least 6 characters"
                               minlength="6" required>
                    </div>

                    <div class="auth-actions">
                        <button type="button" class="auth-btn" id="authCancel">CANCEL</button>
                        <button type="submit" class="auth-btn primary" id="authSubmit">LOG IN</button>
                    </div>
                </form>

                <div class="auth-note" id="authNote">
                    Your best score, coins and achievements sync automatically once you are logged in.
                </div>
            </div>`;

        document.body.appendChild(overlay);

        modal         = overlay.querySelector(".auth-modal");
        msgBox        = overlay.querySelector("#authMsg");
        tabLogin      = overlay.querySelector("#authTabLogin");
        tabSignup     = overlay.querySelector("#authTabSignup");
        form          = overlay.querySelector("#authForm");
        submitBtn     = overlay.querySelector("#authSubmit");
        usernameField = overlay.querySelector("#authUsernameField");
        googleBtn     = overlay.querySelector("#authGoogle");

        tabLogin.addEventListener("click", () => setMode("login"));
        tabSignup.addEventListener("click", () => setMode("signup"));

        googleBtn.addEventListener("click", onGoogle);

        overlay.querySelector("#authCancel").addEventListener("click", close);

        overlay.addEventListener("mousedown", e => {
            if(e.target === overlay) close();
        });

        document.addEventListener("keydown", e => {
            if(e.key === "Escape" && overlay.classList.contains("open")) close();
        });

        form.addEventListener("submit", onSubmit);
    }


    function setMode(next){

        mode = next === "signup" ? "signup" : "login";

        const isSignup = mode === "signup";

        tabLogin.classList.toggle("active", !isSignup);
        tabSignup.classList.toggle("active", isSignup);

        tabLogin.setAttribute("aria-selected", String(!isSignup));
        tabSignup.setAttribute("aria-selected", String(isSignup));

        usernameField.style.display = isSignup ? "" : "none";

        const username = overlay.querySelector("#authUsername");
        username.required = isSignup;

        overlay.querySelector("#authPassword").setAttribute(
            "autocomplete", isSignup ? "new-password" : "current-password"
        );

        overlay.querySelector("#authTitle").textContent =
            isSignup ? "Create your account" : "Welcome back, runner";

        overlay.querySelector("#authSub").textContent =
            isSignup
                ? "Pick a username - it shows up on the leaderboard."
                : "Log in to save your score to the cloud.";

        overlay.querySelector("#authGoogleLabel").textContent =
            isSignup ? "Sign up with Google" : "Continue with Google";

        submitBtn.textContent = isSignup ? "SIGN UP" : "LOG IN";

        hideMessage();
    }

    function showMessage(text, kind){
        msgBox.textContent = text;
        msgBox.className = "auth-msg show " + (kind || "info");
    }

    function hideMessage(){
        msgBox.textContent = "";
        msgBox.className = "auth-msg";
    }

    function open(startMode){

        if(!overlay) buildModal();

        setMode(startMode || "login");

        overlay.classList.add("open");

        if(!window.GameAuth.isConfigured()){
            showMessage(
                "Cloud saves are not set up yet. Add your Supabase URL and anon key in js/supabase-config.js. " +
                "Until then your progress is still saved on this device.",
                "info"
            );
            submitBtn.disabled = true;
            googleBtn.disabled = true;
        }else{
            submitBtn.disabled = false;
            googleBtn.disabled = false;
        }

        const first = mode === "signup"
            ? overlay.querySelector("#authUsername")
            : overlay.querySelector("#authEmail");

        setTimeout(() => first.focus(), 40);
    }

    function close(){
        if(!overlay) return;
        overlay.classList.remove("open");
        form.reset();
        hideMessage();
    }

    function onGoogle(){

        if(!window.GameAuth.isConfigured()) return;

        hideMessage();

        googleBtn.disabled = true;
        submitBtn.disabled = true;

        const label = overlay.querySelector("#authGoogleLabel");
        const original = label.textContent;
        label.textContent = "Redirecting…";

        window.GameAuth.signInWithGoogle().then(result => {

            /* On success the browser navigates away, so this only runs
               when something went wrong. */

            googleBtn.disabled = false;
            submitBtn.disabled = false;
            label.textContent = original;

            if(result.error) showMessage(result.error, "error");
        });
    }

    function onSubmit(e){

        e.preventDefault();

        if(!window.GameAuth.isConfigured()) return;

        const username = overlay.querySelector("#authUsername").value.trim();
        const email    = overlay.querySelector("#authEmail").value.trim();
        const password = overlay.querySelector("#authPassword").value;

        if(!email || !password){
            showMessage("Please fill in every field.", "error");
            return;
        }

        if(password.length < 6){
            showMessage("Password must be at least 6 characters.", "error");
            return;
        }

        if(mode === "signup" && (username.length < 3 || username.length > 20)){
            showMessage("Username must be 3-20 characters.", "error");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = mode === "signup" ? "CREATING..." : "LOGGING IN...";
        hideMessage();

        const action = mode === "signup"
            ? window.GameAuth.signUp(email, password, username)
            : window.GameAuth.signIn(email, password);

        action.then(result => {

            submitBtn.disabled = false;
            submitBtn.textContent = mode === "signup" ? "SIGN UP" : "LOG IN";

            if(result.error){
                showMessage(result.error, "error");
                return;
            }

            if(result.needsConfirm){
                form.reset();
                setMode("login");
                showMessage(
                    "Account created. Check your email to confirm it, then log in.",
                    "success"
                );
                return;
            }

            close();
        });
    }



    /* ---------- nav widget ---------- */

    function initials(name){
        return String(name || "?").trim().charAt(0).toUpperCase() || "?";
    }

    /* usernames come from the database, so never trust them as raw HTML */
    function escapeHtml(value){
        return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
            "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
        })[ch]);
    }

    function mountNav(){

        const nav = document.querySelector(".nav") || document.getElementById("playHeader");
        if(!nav || nav.querySelector(".nav-auth")) return;

        const box = document.createElement("div");
        box.className = "nav-auth";
        box.id = "navAuth";
        nav.appendChild(box);

        function renderLoggedOut(){

            if(!window.GameAuth.isConfigured()){
                box.innerHTML = `
                    <button class="auth-btn" id="navLoginBtn" title="Cloud saves need Supabase keys">
                        ☁ ENABLE CLOUD SAVE
                    </button>`;
            }else{
                box.innerHTML = `
                    <button class="auth-btn" id="navLoginBtn">LOG IN</button>
                    <button class="auth-btn primary" id="navSignupBtn">SIGN UP</button>`;
            }

            const loginBtn = box.querySelector("#navLoginBtn");
            if(loginBtn) loginBtn.addEventListener("click", () => open("login"));

            const signupBtn = box.querySelector("#navSignupBtn");
            if(signupBtn) signupBtn.addEventListener("click", () => open("signup"));
        }

        function renderLoggedIn(){

            const name = window.GameAuth.getDisplayName();
            const safe = escapeHtml(name);

            box.innerHTML = `
                <div class="auth-chip" title="Logged in as ${safe}">
                    <span class="avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
                    <span class="who">${safe}</span>
                </div>
                <button class="auth-btn" id="navLogoutBtn">LOG OUT</button>`;

            box.querySelector("#navLogoutBtn").addEventListener("click", function(){
                this.disabled = true;
                this.textContent = "SAVING...";
                window.GameAuth.signOut();
            });
        }

        window.GameAuth.onChange(user => {
            if(user) renderLoggedIn();
            else renderLoggedOut();
        });
    }


    /* ---------- boot ---------- */

    function run(){
        buildModal();
        mountNav();
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", run);
    }else{
        run();
    }

    window.AuthUI = { open, close };
})();

