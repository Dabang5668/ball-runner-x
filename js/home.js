"use strict";

/* ============================================================
   HOME PAGE
   ------------------------------------------------------------
   Renders the device stat cards and the global leaderboard.
   Stats refresh whenever the auth state changes, because
   logging in merges cloud progress into localStorage.
   ============================================================ */

(function(){

    const statBest         = document.getElementById("statBest");
    const statCoins        = document.getElementById("statCoins");
    const statAchievements = document.getElementById("statAchievements");

    const boardBody = document.getElementById("leaderboardBody");
    const boardSub  = document.getElementById("leaderboardSub");

    const TOTAL_ACHIEVEMENTS = 6;

    function escapeHtml(value){
        return String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({
            "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
        })[ch]);
    }

    function renderStats(){

        statBest.textContent =
            Number(localStorage.getItem("ballRunnerHighScore") || 0);

        statCoins.textContent =
            Number(localStorage.getItem("ballRunnerTotalCoins") || 0);

        let unlocked = 0;

        try{
            const parsed = JSON.parse(localStorage.getItem("ballRunnerAchievements") || "[]");
            unlocked = Array.isArray(parsed) ? parsed.length : 0;
        }catch(e){}

        statAchievements.textContent = unlocked + " / " + TOTAL_ACHIEVEMENTS;
    }

    function renderBoardMessage(text){
        boardBody.innerHTML = `<div class="leaderboard-empty">${escapeHtml(text)}</div>`;
    }

    function renderLeaderboard(){

        if(!window.GameAuth || !window.GameAuth.isConfigured()){
            boardSub.textContent = "Connect Supabase to compete with players worldwide.";
            renderBoardMessage(
                "Cloud saves are off. Add your Supabase URL and anon key in js/supabase-config.js to switch this on."
            );
            return;
        }

        boardSub.textContent = "Top runners across every device.";

        window.GameAuth.getLeaderboard(10).then(({rows, error}) => {

            if(error){
                renderBoardMessage("Couldn't load the leaderboard: " + error);
                return;
            }

            if(!rows.length){
                renderBoardMessage("No scores yet — be the first to set one.");
                return;
            }

            const myName = window.GameAuth.getUser()
                ? window.GameAuth.getDisplayName()
                : null;

            const body = rows.map((row, i) => {

                const mine = myName && row.username === myName;
                const medal = ["🥇","🥈","🥉"][i] || (i + 1);

                const name = String(row.username || "");
                const face = row.avatar
                    ? escapeHtml(row.avatar)
                    : escapeHtml(name.charAt(0).toUpperCase() || "?");

                return `<tr class="${mine ? "me" : ""}">
                    <td class="rank">${medal}</td>
                    <td><span class="lb-face" aria-hidden="true">${face}</span>${escapeHtml(name)}${mine ? " (you)" : ""}</td>
                    <td class="score">${Number(row.best_score || 0)}</td>
                    <td class="score">${Number(row.total_coins || 0)}</td>
                </tr>`;
            }).join("");

            boardBody.innerHTML = `
                <table class="leaderboard">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Player</th>
                            <th class="score">Best</th>
                            <th class="score">Coins</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>`;
        });
    }

    renderStats();

    if(window.GameAuth){
        /* fires immediately, then again after login / logout */
        window.GameAuth.onChange(() => {
            renderStats();
            renderLeaderboard();
        });
    }else{
        renderBoardMessage("Auth module failed to load.");
    }
})();
