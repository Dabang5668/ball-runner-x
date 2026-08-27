"use strict";

/* ============================================================
   CUSTOMIZE PAGE
   Lightweight preview - does not load the full game engine.
   ============================================================ */

const BALL_PALETTES = {
    cyan:   {label:"Cyan",   core:"#00d9ff", edge:"#0060a0", glow:"#00ffff"},
    red:    {label:"Red",    core:"#ff4d6d", edge:"#7a0020", glow:"#ff3355"},
    green:  {label:"Green",  core:"#4dff88", edge:"#00701f", glow:"#39ff6a"},
    purple: {label:"Purple", core:"#b565ff", edge:"#3d0080", glow:"#c084ff"},
    gold:   {label:"Gold",   core:"#ffd24d", edge:"#805400", glow:"#ffe066"},
    white:  {label:"White",  core:"#f4f9ff", edge:"#7c93b0", glow:"#ffffff"}
};

const BG_THEMES = {
    night:     {name:"Night City",   sky:["#05051b","#12134a","#050510"], star:"#ffffff", moon:"#dce8ff", moonGlow:"#a7c7ff"},
    sunset:    {name:"Sunset Drive", sky:["#1a0933","#7a1e4d","#2b0a1f"], star:"#ffe9c7", moon:"#ffd6a5", moonGlow:"#ff9d6c"},
    cyberpunk: {name:"Cyber Purple", sky:["#050014","#2a0245","#0a001a"], star:"#ff7bfa", moon:"#ff6bd6", moonGlow:"#c400ff"},
    forest:    {name:"Deep Forest",  sky:["#03130d","#0c3a26","#03130d"], star:"#d8ffe9", moon:"#e8fff2", moonGlow:"#7dffb0"},
    blood:     {name:"Blood Moon",   sky:["#150404","#3a0a0a","#0d0202"], star:"#ffd0d0", moon:"#ffbcbc", moonGlow:"#ff4040"},
    moon:      {name:"Lunar Base",   sky:["#05050f","#171b30","#04040a"], star:"#eaf2ff", moon:"#6ea8ff", moonGlow:"#4a8bff"},
    volcano:   {name:"Molten Core",  sky:["#1a0500","#4a1200","#0d0300"], star:"#ffb08a", moon:"#ff6a2e", moonGlow:"#ff3300"},
    candy:     {name:"Sugar Rush",   sky:["#2a0a30","#6a1e5a","#3d0f38"], star:"#fff0fa", moon:"#fff1f8", moonGlow:"#ff9fe0"}
};

const OBSTACLE_SKINS = {
    classic: {label:"Classic",       wallColors:["#ffb347","#ff7a00","#a63d00"], accent:"#ffbe5a"},
    scifi:   {label:"Sci-Fi Nebula", wallColors:["#0adfff","#0a4a8a","#021b33"], accent:"#7dfcff"},
    lunar:   {label:"Lunar Base",    wallColors:["#e3e6ee","#9aa0b4","#4c5164"], accent:"#dfe4f2"},
    volcano: {label:"Molten Core",   wallColors:["#3a1408","#7a2408","#1a0602"], accent:"#ff6a00"},
    candy:   {label:"Sugar Rush",    wallColors:["#ffd9ec","#ff8fc7","#c2528e"], accent:"#fff1f8"},
    toxic:   {label:"Toxic Jungle",  wallColors:["#123a1a","#1f6e2e","#0a2010"], accent:"#9dff6a"}
};

const WORLD_PRESETS = [
    {id:"night",   label:"Night City",    icon:"🌃", ballColor:"cyan",   bgTheme:"night",     obstacleSkin:"classic"},
    {id:"scifi",   label:"Sci-Fi Nebula", icon:"🚀", ballColor:"purple", bgTheme:"cyberpunk", obstacleSkin:"scifi"},
    {id:"lunar",   label:"Lunar Base",    icon:"🌙", ballColor:"white",  bgTheme:"moon",      obstacleSkin:"lunar"},
    {id:"volcano", label:"Molten Core",   icon:"🌋", ballColor:"red",    bgTheme:"volcano",   obstacleSkin:"volcano"},
    {id:"candy",   label:"Sugar Rush",    icon:"🍭", ballColor:"gold",   bgTheme:"candy",     obstacleSkin:"candy"},
    {id:"toxic",   label:"Toxic Jungle",  icon:"☠️", ballColor:"green",  bgTheme:"forest",    obstacleSkin:"toxic"}
];

function loadSettings(){
    try{
        return Object.assign(
            {ballColor:"cyan", bgTheme:"night", obstacleSkin:"classic"},
            JSON.parse(localStorage.getItem("ballRunnerSettings") || "{}")
        );
    }catch(e){
        return {ballColor:"cyan", bgTheme:"night", obstacleSkin:"classic"};
    }
}

function saveSettings(settings){
    localStorage.setItem("ballRunnerSettings", JSON.stringify(settings));
    if(window.updateNavPlayLinks) window.updateNavPlayLinks(settings);

    /* mirror the look to the player's cloud profile when logged in */
    if(window.GameAuth && window.GameAuth.getUser()) window.GameAuth.pushProgress();
}

let settings = loadSettings();
if(window.updateNavPlayLinks) window.updateNavPlayLinks(settings);

/* ---------- Build world presets ---------- */

const presetGrid = document.getElementById("presetGrid");

function matchesPreset(preset){
    return settings.ballColor === preset.ballColor &&
           settings.bgTheme === preset.bgTheme &&
           settings.obstacleSkin === preset.obstacleSkin;
}

function refreshAllSelections(){
    document.querySelectorAll(".swatch").forEach(el =>
        el.classList.toggle("selected", el.dataset.color === settings.ballColor));

    document.querySelectorAll("#themeGrid .theme-card").forEach(el =>
        el.classList.toggle("selected", el.dataset.theme === settings.bgTheme));

    document.querySelectorAll("#skinGrid .theme-card").forEach(el =>
        el.classList.toggle("selected", el.dataset.skin === settings.obstacleSkin));

    document.querySelectorAll("#presetGrid .theme-card").forEach(el =>
        el.classList.toggle("selected", el.dataset.matches === "true"));
}

for(const preset of WORLD_PRESETS){
    const bg = BG_THEMES[preset.bgTheme];

    const card = document.createElement("div");
    card.className = "theme-card";
    card.style.background = `linear-gradient(160deg, ${bg.sky[0]}, ${bg.sky[1]} 55%, ${bg.sky[2]})`;
    card.style.height = "78px";
    card.dataset.preset = preset.id;
    card.innerHTML = `<span>${preset.icon} ${preset.label}</span>`;

    card.addEventListener("click", () => {
        settings.ballColor = preset.ballColor;
        settings.bgTheme = preset.bgTheme;
        settings.obstacleSkin = preset.obstacleSkin;
        saveSettings(settings);
        refreshAllSelections();
    });

    presetGrid.appendChild(card);
}

/* ---------- Build ball swatches ---------- */

const swatchRow = document.getElementById("swatchRow");

for(const key in BALL_PALETTES){
    const p = BALL_PALETTES[key];

    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.style.background = `radial-gradient(circle at 32% 30%, #fff, ${p.core} 45%, ${p.edge} 100%)`;
    btn.style.color = p.glow;
    btn.title = p.label;
    btn.dataset.color = key;

    btn.addEventListener("click", () => {
        settings.ballColor = key;
        saveSettings(settings);
        refreshAllSelections();
    });

    swatchRow.appendChild(btn);
}

/* ---------- Build background theme cards ---------- */

const themeGrid = document.getElementById("themeGrid");

for(const key in BG_THEMES){
    const t = BG_THEMES[key];

    const card = document.createElement("div");
    card.className = "theme-card";
    card.style.background = `linear-gradient(160deg, ${t.sky[0]}, ${t.sky[1]} 55%, ${t.sky[2]})`;
    card.dataset.theme = key;
    card.innerHTML = `<span>${t.name}</span>`;

    card.addEventListener("click", () => {
        settings.bgTheme = key;
        saveSettings(settings);
        refreshAllSelections();
    });

    themeGrid.appendChild(card);
}

/* ---------- Build obstacle skin cards ---------- */

const skinGrid = document.getElementById("skinGrid");

for(const key in OBSTACLE_SKINS){
    const s = OBSTACLE_SKINS[key];

    const card = document.createElement("div");
    card.className = "theme-card";
    card.style.background = `linear-gradient(160deg, ${s.wallColors[0]}, ${s.wallColors[1]} 55%, ${s.wallColors[2]})`;
    card.dataset.skin = key;
    card.innerHTML = `<span>${s.label}</span>`;

    card.addEventListener("click", () => {
        settings.obstacleSkin = key;
        saveSettings(settings);
        refreshAllSelections();
    });

    skinGrid.appendChild(card);
}

/* ---------- Reset button ---------- */

document.getElementById("resetBtn").addEventListener("click", () => {
    settings = {ballColor:"cyan", bgTheme:"night", obstacleSkin:"classic"};
    saveSettings(settings);
    refreshAllSelections();
});

/* mark which preset (if any) currently matches, then paint selections */

function updatePresetMatches(){
    document.querySelectorAll("#presetGrid .theme-card").forEach(el => {
        const preset = WORLD_PRESETS.find(p => p.id === el.dataset.preset);
        el.dataset.matches = matchesPreset(preset) ? "true" : "false";
    });
}

const originalRefresh = refreshAllSelections;
refreshAllSelections = function(){
    updatePresetMatches();
    originalRefresh();
};

refreshAllSelections();

/* ---------- Live preview ---------- */

const preview = document.getElementById("previewCanvas");
const pctx = preview.getContext("2d");

const PW = preview.width;
const PH = preview.height;

let stars = Array.from({length: 40}, () => ({
    x: Math.random() * PW,
    y: Math.random() * PH * .55,
    r: Math.random() * 1.4 + .3,
    phase: Math.random() * Math.PI * 2
}));

let frame = 0;

function drawPreview(){
    frame++;

    const bg = BG_THEMES[settings.bgTheme] || BG_THEMES.night;
    const ball = BALL_PALETTES[settings.ballColor] || BALL_PALETTES.cyan;
    const skin = OBSTACLE_SKINS[settings.obstacleSkin] || OBSTACLE_SKINS.classic;

    const gradient = pctx.createLinearGradient(0, 0, 0, PH);
    gradient.addColorStop(0, bg.sky[0]);
    gradient.addColorStop(.55, bg.sky[1]);
    gradient.addColorStop(1, bg.sky[2]);

    pctx.fillStyle = gradient;
    pctx.fillRect(0, 0, PW, PH);

    for(const s of stars){
        const alpha = .35 + .35 * Math.sin(frame * .03 + s.phase);
        pctx.globalAlpha = Math.max(0, alpha);
        pctx.fillStyle = bg.star;
        pctx.beginPath();
        pctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        pctx.fill();
    }
    pctx.globalAlpha = 1;

    pctx.save();
    pctx.shadowColor = bg.moonGlow;
    pctx.shadowBlur = 24;
    pctx.fillStyle = bg.moon;
    pctx.beginPath();
    pctx.arc(PW - 46, 36, 20, 0, Math.PI * 2);
    pctx.fill();
    pctx.restore();

    const groundY = PH - 34;

    pctx.fillStyle = "rgba(0,0,0,.35)";
    pctx.fillRect(0, groundY, PW, PH - groundY);

    pctx.strokeStyle = `${ball.glow}88`;
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.moveTo(0, groundY);
    pctx.lineTo(PW, groundY);
    pctx.stroke();

    /* sample obstacle wall, reskinned per obstacle style */

    const wx = PW * .68;
    const ww = 34;
    const wh = 62;
    const wy = groundY - wh;

    const wg = pctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    wg.addColorStop(0, skin.wallColors[0]);
    wg.addColorStop(.5, skin.wallColors[1]);
    wg.addColorStop(1, skin.wallColors[2]);

    pctx.save();
    pctx.shadowColor = skin.accent;
    pctx.shadowBlur = 14;
    pctx.fillStyle = wg;
    pctx.fillRect(wx, wy, ww, wh);
    pctx.restore();

    const cornerGlow = .5 + .35 * Math.sin(frame * .12);
    pctx.fillStyle = skin.accent;
    pctx.globalAlpha = cornerGlow;
    pctx.beginPath();
    pctx.arc(wx + 5, wy + 5, 3, 0, Math.PI * 2);
    pctx.arc(wx + ww - 5, wy + 5, 3, 0, Math.PI * 2);
    pctx.fill();
    pctx.globalAlpha = 1;

    /* bouncing ball */

    const bounce = Math.sin(frame * .08) * 8;
    const bx = PW * .28;
    const by = groundY - 22 + bounce * -1 + 8;

    const grad = pctx.createRadialGradient(bx - 7, by - 8, 2, bx, by, 22);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(.2, ball.glow);
    grad.addColorStop(.55, ball.core);
    grad.addColorStop(1, ball.edge);

    pctx.save();
    pctx.shadowColor = ball.glow;
    pctx.shadowBlur = 22;
    pctx.fillStyle = grad;
    pctx.beginPath();
    pctx.arc(bx, by, 22, 0, Math.PI * 2);
    pctx.fill();
    pctx.restore();

    requestAnimationFrame(drawPreview);
}

drawPreview();
