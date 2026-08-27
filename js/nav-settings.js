(function(){
    "use strict";

    /* Keeps "Play" links in sync with the player's saved customization
       by embedding it directly in the URL. This guarantees the look
       carries over even if localStorage isn't shared between local
       file:// pages (a known quirk in some browsers). */

    function readSettings(){
        let settings = {ballColor:"cyan", bgTheme:"night", obstacleSkin:"classic"};
        try{
            settings = Object.assign(settings, JSON.parse(localStorage.getItem("ballRunnerSettings") || "{}"));
        }catch(e){}
        return settings;
    }

    function apply(settings){
        const params = "?ball=" + encodeURIComponent(settings.ballColor) +
                       "&bg=" + encodeURIComponent(settings.bgTheme) +
                       "&skin=" + encodeURIComponent(settings.obstacleSkin || "classic");

        document.querySelectorAll('a[href^="play.html"]').forEach(a => {
            a.setAttribute("href", "play.html" + params);
        });
    }

    function run(){
        apply(readSettings());
    }

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", run);
    }else{
        run();
    }

    window.updateNavPlayLinks = function(settings){
        apply(settings);
    };
})();
