"use strict";

/* ============================================================
   PROFILE DASHBOARD
   ------------------------------------------------------------
   Opens when the player clicks their name chip in the nav.
   Lets them:
     - change their username
     - pick an emoji avatar
     - change their password
     - see their best score / coins / achievements
     - log out

   Requires: js/auth.js (window.GameAuth)
   Exposes:  window.ProfileUI.open() / .close()
   ============================================================ */

(function(){

    if(!window.GameAuth){
        console.warn("[ProfileUI] GameAuth missing - profile dashboard disabled.");
        return;
    }

    /* A fixed palette instead of file uploads: no storage bucket, no
       moderation problem, and it renders identically everywhere. */

    const AVATARS = [
        "\u26a1","\ud83d\udd25","\ud83d\ude80","\ud83d\udc7d","\ud83e\udd16",
        "\ud83c\udfae","\ud83c\udf19","\u2b50","\ud83c\udfaf","\ud83d\udc09",
        "\ud83e\udd8a","\ud83d\udc31","\ud83d\udc38","\ud83e\udd84","\ud83c\udf55",
        "\ud83c\udf6d","\ud83d\udc80","\ud83c\udf08"
    ];

    const TOTAL_ACHIEVEMENTS = 6;

    let overlay, msgBox, nameInput, passInput, saveBtn, passBtn, grid;
    let chosenAvatar = "";

    function escapeHtml(value){
        return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
            "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
        })[ch]);
    }

    function localNumber(key){
        return Number(localStorage.getItem(key) || 0) || 0;
    }

    function achievementCount(){
        try{
            const parsed = JSON.parse(localStorage.getItem("ballRunnerAchievements") || "[]");
            return Array.isArray(parsed) ? parsed.length : 0;
        }catch(e){
            return 0;
        }
    }


    /* ---------- build ---------- */

    function build(){

        overlay = document.createElement("div");
        overlay.className = "auth-overlay";
        overlay.id = "profileOverlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "profileTitle");

        overlay.innerHTML = `
            <div class="auth-modal profile-modal">
                <h3 id="profileTitle">Your profile</h3>
                <div class="sub">Change how you appear on the leaderboard.</div>

                <div class="profile-head">
                    <div class="profile-avatar" id="profileAvatar" aria-hidden="true">?</div>
                    <div class="profile-id">
                        <div class="profile-name" id="profileName">Guest</div>
                        <div class="profile-email" id="profileEmail"></div>
                    </div>
                </div>

                <div class="profile-stats">
                    <div class="profile-stat">
                        <div class="v" id="profileBest">0</div>
                        <div class="k">Best score</div>
                    </div>
                    <div class="profile-stat">
                        <div class="v" id="profileCoins">0</div>
                        <div class="k">Coins</div>
                    </div>
                    <div class="profile-stat">
                        <div class="v" id="profileAchv">0 / ${TOTAL_ACHIEVEMENTS}</div>
                        <div class="k">Achievements</div>
                    </div>
                </div>

                <div class="auth-msg" id="profileMsg" role="alert"></div>

                <div class="auth-field">
                    <label for="profileUsername">Display name</label>
                    <input type="text" id="profileUsername" autocomplete="nickname"
                           placeholder="RunnerX" minlength="3" maxlength="20">
                </div>

                <div class="auth-field">
                    <label id="profileAvatarLabel">Avatar</label>
                    <div class="avatar-grid" id="avatarGrid" role="radiogroup"
                         aria-labelledby="profileAvatarLabel"></div>
                </div>

                <div class="auth-actions">
                    <button type="button" class="auth-btn" id="profileClose">CLOSE</button>
                    <button type="button" class="auth-btn primary" id="profileSave">SAVE CHANGES</button>
                </div>

                <div class="auth-divider"><span>security</span></div>

                <div class="auth-field">
                    <label for="profilePassword">New password</label>
                    <input type="password" id="profilePassword" autocomplete="new-password"
                           placeholder="At least 6 characters" minlength="6">
                </div>

                <div class="auth-actions">
                    <button type="button" class="auth-btn" id="profilePassBtn">UPDATE PASSWORD</button>
                    <button type="button" class="auth-btn danger" id="profileLogout">LOG OUT</button>
                </div>

                <div class="auth-note">
                    Logging out clears this device's progress - your scores stay safe in your account.
                </div>
            </div>`;

        document.body.appendChild(overlay);

        msgBox    = overlay.querySelector("#profileMsg");
        nameInput = overlay.querySelector("#profileUsername");
        passInput = overlay.querySelector("#profilePassword");
        saveBtn   = overlay.querySelector("#profileSave");
        passBtn   = overlay.querySelector("#profilePassBtn");
        grid      = overlay.querySelector("#avatarGrid");

        buildAvatarGrid();

        overlay.querySelector("#profileClose").addEventListener("click", close);
        saveBtn.addEventListener("click", onSave);
        passBtn.addEventListener("click", onPassword);

        overlay.querySelector("#profileLogout").addEventListener("click", function(){
            this.disabled = true;
            this.textContent = "SAVING...";
            window.GameAuth.signOut().then(close);
        });

        overlay.addEventListener("mousedown", e => {
            if(e.target === overlay) close();
        });

        document.addEventListener("keydown", e => {
            if(e.key === "Escape" && overlay.classList.contains("open")) close();
        });
    }

    function buildAvatarGrid(){

        grid.innerHTML = AVATARS.map(a => `
            <button type="button" class="avatar-option" role="radio"
                    aria-checked="false" data-avatar="${escapeHtml(a)}"
                    aria-label="Avatar ${escapeHtml(a)}">${escapeHtml(a)}</button>`
        ).join("");

        grid.querySelectorAll(".avatar-option").forEach(btn => {
            btn.addEventListener("click", () => selectAvatar(btn.dataset.avatar));
        });
    }

    /* clicking the active avatar again clears it, back to the initial */
    function selectAvatar(value){

        chosenAvatar = (value && value !== chosenAvatar) ? value : "";

        grid.querySelectorAll(".avatar-option").forEach(btn => {
            const on = btn.dataset.avatar === chosenAvatar && chosenAvatar !== "";
            btn.classList.toggle("active", on);
            btn.setAttribute("aria-checked", String(on));
        });

        renderHead();
    }


    /* ---------- render ---------- */

    function renderHead(){

        const name = window.GameAuth.getDisplayName();
        const user = window.GameAuth.getUser();

        overlay.querySelector("#profileName").textContent = name;
        overlay.querySelector("#profileEmail").textContent =
            (user && user.email) ? user.email : "";

        overlay.querySelector("#profileAvatar").textContent =
            chosenAvatar || name.charAt(0).toUpperCase() || "?";
    }

    function renderStats(){
        overlay.querySelector("#profileBest").textContent  = localNumber("ballRunnerHighScore");
        overlay.querySelector("#profileCoins").textContent = localNumber("ballRunnerTotalCoins");
        overlay.querySelector("#profileAchv").textContent  =
            achievementCount() + " / " + TOTAL_ACHIEVEMENTS;
    }

    function showMessage(text, kind){
        msgBox.textContent = text;
        msgBox.className = "auth-msg show " + (kind || "info");
    }

    function hideMessage(){
        msgBox.textContent = "";
        msgBox.className = "auth-msg";
    }


    /* ---------- actions ---------- */

    function onSave(){

        const name = nameInput.value.trim();

        if(!/^[A-Za-z0-9_]{3,20}$/.test(name)){
            showMessage(
                "Display name must be 3-20 characters: letters, numbers or underscore.",
                "error"
            );
            return;
        }

        hideMessage();
        saveBtn.disabled = true;
        saveBtn.textContent = "SAVING...";

        window.GameAuth.updateProfile({username:name, avatar:chosenAvatar}).then(result => {

            saveBtn.disabled = false;
            saveBtn.textContent = "SAVE CHANGES";

            if(result.error){
                showMessage(result.error, "error");
                return;
            }

            renderHead();
            showMessage("Profile updated.", "success");
        });
    }

    function onPassword(){

        const pass = passInput.value;

        if(pass.length < 6){
            showMessage("Password must be at least 6 characters.", "error");
            return;
        }

        hideMessage();
        passBtn.disabled = true;
        passBtn.textContent = "UPDATING...";

        window.GameAuth.changePassword(pass).then(result => {

            passBtn.disabled = false;
            passBtn.textContent = "UPDATE PASSWORD";

            if(result.error){
                showMessage(result.error, "error");
                return;
            }

            passInput.value = "";
            showMessage("Password changed.", "success");
        });
    }


    /* ---------- open / close ---------- */

    function open(){

        if(!overlay) build();

        /* Guests get the login modal instead - there is no profile yet. */
        if(!window.GameAuth.getUser()){
            if(window.AuthUI) window.AuthUI.open("login");
            return;
        }

        hideMessage();
        passInput.value = "";

        nameInput.value = window.GameAuth.getDisplayName();

        chosenAvatar = "";
        selectAvatar(window.GameAuth.getAvatar());

        renderStats();

        overlay.classList.add("open");
        setTimeout(() => nameInput.focus(), 40);
    }

    function close(){
        if(overlay) overlay.classList.remove("open");
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", build);
    }else{
        build();
    }

    window.ProfileUI = { open, close };
})();
