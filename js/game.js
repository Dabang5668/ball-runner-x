"use strict";

/* ============================================================
   BALL RUNNER X
   Single-file HTML5 Canvas Endless Runner
   ============================================================ */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hintBox = document.getElementById("hint");
const hintMain = document.getElementById("hintMain");
const hintSub = document.getElementById("hintSub");
const gameWrap = document.getElementById("gameWrap");
const toastContainer = document.getElementById("toastContainer");

let W = 960;
let H = 540;
let dpr = Math.min(window.devicePixelRatio || 1,2);


/* ============================================================
   CUSTOMIZATION / THEME
   ============================================================ */

const BALL_PALETTES = {
    cyan:   {core:"#00d9ff", edge:"#0060a0", glow:"#00ffff"},
    red:    {core:"#ff4d6d", edge:"#7a0020", glow:"#ff3355"},
    green:  {core:"#4dff88", edge:"#00701f", glow:"#39ff6a"},
    purple: {core:"#b565ff", edge:"#3d0080", glow:"#c084ff"},
    gold:   {core:"#ffd24d", edge:"#805400", glow:"#ffe066"},
    white:  {core:"#f4f9ff", edge:"#7c93b0", glow:"#ffffff"}
};

const BG_THEMES = {
    night: {
        name:"Night City",
        sky:["#05051b","#12134a","#050510"],
        star:"#ffffff",
        moon:"#dce8ff",
        moonGlow:"#a7c7ff",
        building:"#0b0c27",
        window:"0,220,255",
        horizon:"0,255,255",
        cloud:"130,150,220"
    },
    sunset: {
        name:"Sunset Drive",
        sky:["#1a0933","#7a1e4d","#2b0a1f"],
        star:"#ffe9c7",
        moon:"#ffd6a5",
        moonGlow:"#ff9d6c",
        building:"#2a0f2e",
        window:"255,170,90",
        horizon:"255,140,70",
        cloud:"255,150,150"
    },
    cyberpunk: {
        name:"Cyber Purple",
        sky:["#050014","#2a0245","#0a001a"],
        star:"#ff7bfa",
        moon:"#ff6bd6",
        moonGlow:"#c400ff",
        building:"#160726",
        window:"255,0,200",
        horizon:"255,0,200",
        cloud:"180,0,255"
    },
    forest: {
        name:"Deep Forest",
        sky:["#03130d","#0c3a26","#03130d"],
        star:"#d8ffe9",
        moon:"#e8fff2",
        moonGlow:"#7dffb0",
        building:"#062018",
        window:"80,255,170",
        horizon:"0,255,150",
        cloud:"90,200,140"
    },
    blood: {
        name:"Blood Moon",
        sky:["#150404","#3a0a0a","#0d0202"],
        star:"#ffd0d0",
        moon:"#ffbcbc",
        moonGlow:"#ff4040",
        building:"#200606",
        window:"255,60,60",
        horizon:"255,40,40",
        cloud:"180,60,60"
    },
    moon: {
        name:"Lunar Base",
        sky:["#05050f","#171b30","#04040a"],
        star:"#eaf2ff",
        moon:"#6ea8ff",
        moonGlow:"#4a8bff",
        building:"#1c1f2e",
        window:"200,210,235",
        horizon:"170,190,255",
        cloud:"140,150,180"
    },
    volcano: {
        name:"Molten Core",
        sky:["#1a0500","#4a1200","#0d0300"],
        star:"#ffb08a",
        moon:"#ff6a2e",
        moonGlow:"#ff3300",
        building:"#1a0805",
        window:"255,120,30",
        horizon:"255,90,20",
        cloud:"140,50,20"
    },
    candy: {
        name:"Sugar Rush",
        sky:["#2a0a30","#6a1e5a","#3d0f38"],
        star:"#fff0fa",
        moon:"#fff1f8",
        moonGlow:"#ff9fe0",
        building:"#4a1a3a",
        window:"255,190,230",
        horizon:"255,150,220",
        cloud:"255,200,230"
    }
};


const OBSTACLE_SKINS = {

    classic: {
        label:"Classic",
        spike:  {name:"Spikes",        color:"#ff315d"},
        wall:   {name:"Brick Wall",    colors:["#ffb347","#ff7a00","#a63d00"], texture:"brick",   accent:"#ffbe5a"},
        cave:   {name:"Cave Ceiling",  colors:["#241a12","#5c4630"],            texture:"rock",    accent:"#5aa15a"},
        flyer:  {name:"Drone",         colors:["#4a3568","#241a38","#0e0a1a"], core:"#b95cff", shape:"saucer"},
        laser:  {color:"#00eaff"},
        fire:   {colors:["#fff7a0","#ffb000","#ff3500"]},
        saw:    {name:"Buzzsaw",       color:"#c9ced8", accent:"#ff3355"},
        orb:    {name:"Warning Orb",   color:"#ffe066", ring:"#ff8a00"},
        swarm:  {name:"Bat Swarm",     color:"#6a4a8a", accent:"#c084ff"}
    },

    scifi: {
        label:"Sci-Fi Nebula",
        spike:  {name:"Energy Shards",   color:"#37e2ff"},
        wall:   {name:"Force Wall",      colors:["#0adfff","#0a4a8a","#021b33"], texture:"circuit", accent:"#7dfcff"},
        cave:   {name:"Reactor Tunnel",  colors:["#0d1626","#1e3a5a"],            texture:"pipes",   accent:"#37e2ff"},
        flyer:  {name:"Interceptor Drone", colors:["#294a70","#132238","#050a12"], core:"#37e2ff", shape:"saucer"},
        laser:  {color:"#ff2ee0"},
        fire:   {colors:["#e2ffff","#37e2ff","#0033ff"]},
        saw:    {name:"Energy Saw",      color:"#37e2ff", accent:"#ff2ee0"},
        orb:    {name:"Plasma Orb",      color:"#37e2ff", ring:"#ff2ee0"},
        swarm:  {name:"Drone Swarm",     color:"#294a70", accent:"#37e2ff"}
    },

    lunar: {
        label:"Lunar Base",
        spike:  {name:"Moon Rocks",      color:"#c7cbd6"},
        wall:   {name:"Stone Obelisk",   colors:["#e3e6ee","#9aa0b4","#4c5164"], texture:"crystal", accent:"#dfe4f2"},
        cave:   {name:"Crystal Cavern",  colors:["#151829","#3d4566"],           texture:"crystal", accent:"#8fe8ff"},
        flyer:  {name:"UFO Scout",       colors:["#c7cbd6","#8a90a6","#43485c"], core:"#8fe8ff", shape:"dome"},
        laser:  {color:"#8fe8ff"},
        fire:   {colors:["#ffffff","#c7cbd6","#5865a3"]},
        saw:    {name:"Crystal Saw",     color:"#c7cbd6", accent:"#8fe8ff"},
        orb:    {name:"Comet Orb",       color:"#8fe8ff", ring:"#ffffff"},
        swarm:  {name:"Meteor Swarm",    color:"#8a90a6", accent:"#c7cbd6"}
    },

    volcano: {
        label:"Molten Core",
        spike:  {name:"Obsidian Shards", color:"#ff5b1f"},
        wall:   {name:"Lava Rock Wall",  colors:["#3a1408","#7a2408","#1a0602"], texture:"lava",    accent:"#ff6a00"},
        cave:   {name:"Lava Tube",       colors:["#2a0e04","#5c1e08"],           texture:"lava",    accent:"#ff8a00"},
        flyer:  {name:"Ember Wisp",      colors:["#7a1e00","#3a0d00","#150400"], core:"#ffb000", shape:"flame"},
        laser:  {color:"#ff8a00"},
        fire:   {colors:["#fff7a0","#ffb000","#ff2200"]},
        saw:    {name:"Molten Saw",      color:"#ff5b1f", accent:"#ffb000"},
        orb:    {name:"Fire Orb",        color:"#ffb000", ring:"#ff3300"},
        swarm:  {name:"Ember Swarm",     color:"#7a1e00", accent:"#ffb000"}
    },

    candy: {
        label:"Sugar Rush",
        spike:  {name:"Lollipop Spikes",  color:"#ff6fb0"},
        wall:   {name:"Wafer Wall",       colors:["#ffd9ec","#ff8fc7","#c2528e"], texture:"stripe", accent:"#fff1f8"},
        cave:   {name:"Gummy Tunnel",     colors:["#3a1030","#8a2f70"],           texture:"gummy",  accent:"#ff9fe0"},
        flyer:  {name:"Sprinkle Drone",   colors:["#ff9fe0","#c860a8","#6b2456"], core:"#fff1f8", shape:"donut"},
        laser:  {color:"#ff6fb0"},
        fire:   {colors:["#fff1f8","#ff9fe0","#ff2e9e"]},
        saw:    {name:"Candy Saw",        color:"#ff6fb0", accent:"#fff1f8"},
        orb:    {name:"Gumball Orb",      color:"#ff9fe0", ring:"#fff1f8"},
        swarm:  {name:"Sprinkle Swarm",   color:"#c860a8", accent:"#fff1f8"}
    },

    toxic: {
        label:"Toxic Jungle",
        spike:  {name:"Thorn Spikes",     color:"#7dff4a"},
        wall:   {name:"Vine Wall",        colors:["#123a1a","#1f6e2e","#0a2010"], texture:"vine",   accent:"#9dff6a"},
        cave:   {name:"Swamp Cave",       colors:["#0c1f14","#2a4a2a"],           texture:"rock",   accent:"#9dff6a"},
        flyer:  {name:"Spore Drone",      colors:["#2a5a2a","#153015","#081208"], core:"#9dff6a", shape:"pod"},
        laser:  {color:"#c6ff3a"},
        fire:   {colors:["#e8ff9a","#9dff4a","#2a8a1a"]},
        saw:    {name:"Thorn Saw",        color:"#7dff4a", accent:"#c6ff3a"},
        orb:    {name:"Toxic Orb",        color:"#9dff6a", ring:"#c6ff3a"},
        swarm:  {name:"Spore Swarm",      color:"#2a5a2a", accent:"#9dff6a"}
    }
};


const WORLD_PRESETS = [
    {id:"night",   label:"Night City",    icon:"\ud83c\udf03", ballColor:"cyan",   bgTheme:"night",     obstacleSkin:"classic"},
    {id:"scifi",   label:"Sci-Fi Nebula", icon:"\ud83d\ude80", ballColor:"purple", bgTheme:"cyberpunk", obstacleSkin:"scifi"},
    {id:"lunar",   label:"Lunar Base",    icon:"\ud83c\udf19", ballColor:"white",  bgTheme:"moon",      obstacleSkin:"lunar"},
    {id:"volcano", label:"Molten Core",   icon:"\ud83c\udf0b", ballColor:"red",    bgTheme:"volcano",   obstacleSkin:"volcano"},
    {id:"candy",   label:"Sugar Rush",    icon:"\ud83c\udf6d", ballColor:"gold",   bgTheme:"candy",     obstacleSkin:"candy"},
    {id:"toxic",   label:"Toxic Jungle",  icon:"\u2620\ufe0f", ballColor:"green",  bgTheme:"forest",    obstacleSkin:"toxic"}
];


function loadSettings(){

    const defaults = {ballColor:"cyan", bgTheme:"night", obstacleSkin:"classic"};

    let stored = {};
    try{
        stored = JSON.parse(localStorage.getItem("ballRunnerSettings") || "{}");
    }catch(e){}

    /* URL query params (?ball=red&bg=sunset&skin=scifi) always win. This
       makes customization reliable even when localStorage isn't shared
       between local file:// pages in some browsers. */

    const params = new URLSearchParams(window.location.search);
    const fromUrl = {};

    if(params.has("ball")) fromUrl.ballColor = params.get("ball");
    if(params.has("bg")) fromUrl.bgTheme = params.get("bg");
    if(params.has("skin")) fromUrl.obstacleSkin = params.get("skin");

    const merged = Object.assign({}, defaults, stored, fromUrl);

    try{
        localStorage.setItem("ballRunnerSettings", JSON.stringify(merged));
    }catch(e){}

    return merged;
}

const settings = loadSettings();

const ballPalette = BALL_PALETTES[settings.ballColor] || BALL_PALETTES.cyan;
const bgTheme = BG_THEMES[settings.bgTheme] || BG_THEMES.night;
const obstacleSkin = OBSTACLE_SKINS[settings.obstacleSkin] || OBSTACLE_SKINS.classic;

function hexToRgb(hex){
    const m = hex.replace("#","").match(/.{1,2}/g);
    return m.map(x=>parseInt(x,16)).join(",");
}

function applyAccentTheme(){
    document.documentElement.style.setProperty("--accent", ballPalette.glow);
    document.documentElement.style.setProperty("--accent-rgb", hexToRgb(ballPalette.glow));
}

applyAccentTheme();

function resize(){

    /* Logical drawing space never changes - every constant in the game
       (GROUND, PLAYER_X, HUD positions) is written against 960x540. */

    W = 960;
    H = 540;

    /* Fully JS-driven sizing so the game box can never be clipped
       or squashed by conflicting CSS constraints, regardless of
       window shape. The box now grows to fill the window instead of
       being capped at 1100px, which left big empty margins on
       desktop monitors. */

    const header = document.getElementById("playHeader");
    const headerH = header ? header.getBoundingClientRect().height : 0;

    /* body padding (10px top + bottom) + the flex gap between header
       and game box + a little breathing room */
    const chrome = headerH + 42;

    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - chrome;

    let w = maxW;
    let h = w * 9 / 16;

    if(h > maxH){
        h = maxH;
        w = h * 16 / 9;
    }

    w = Math.max(320, Math.round(w));
    h = Math.max(180, Math.round(h));

    gameWrap.style.width = w + "px";
    gameWrap.style.height = h + "px";

    /* Backing store follows the on-screen size so a stretched box stays
       crisp instead of being an upscaled 960x540 bitmap. Capped at 2.5x
       to keep the fill rate sane on big screens. */

    const density = Math.min(window.devicePixelRatio || 1, 2);

    dpr = Math.min((w / W) * density, 2.5);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    ctx.setTransform(dpr,0,0,dpr,0,0);
}

resize();
window.addEventListener("resize",resize);


/* ============================================================
   CONSTANTS
   ============================================================ */

const GROUND = 430;
const PLAYER_X = 165;

const GRAVITY = 0.78;
const JUMP_POWER = -15.5;
const DOUBLE_JUMP_POWER = -13;

const WARNING_DISTANCE = 390;


/* ============================================================
   GAME STATE
   ============================================================ */

const game = {
    state:"menu",

    score:0,
    highScore:Number(localStorage.getItem("ballRunnerHighScore") || 0),

    level:1,
    lives:3,

    speed:6,
    baseSpeed:6,

    combo:0,
    comboTimer:0,

    distance:0,
    levelDistance:0,

    shake:0,
    flash:0,

    frame:0,
    levelBanner:0,
    boostTimer:0,
    slowmoTimer:0,
    magnetTimer:0,

    milestone:0,
    milestoneBanner:0,
    milestoneValue:0,

    punch:0,

    coinsCollected:0,
    obstaclesDodged:0,
    maxCombo:0,
    nearMisses:0,

    countdownFrames:0,

    /* mirrors GameAudio's persisted SFX-mute state so the rest of
       the code can cheaply check game.muted like before.
       (AUDIO_AVAILABLE is declared further down, so we read the
       module directly here to avoid a temporal-dead-zone error.) */
    muted: !!(window.GameAudio && window.GameAudio.isMuted())
};




/* ============================================================
   ACHIEVEMENTS
   ============================================================ */

const ACHIEVEMENTS = [
    {id:"first_jump", label:"First Flight", desc:"Take your first jump"},
    {id:"combo10", label:"Combo King", desc:"Reach a x10 combo streak"},
    {id:"score1000", label:"Survivor", desc:"Score 1000+ in one run"},
    {id:"score5000", label:"High Roller", desc:"Score 5000+ in one run"},
    {id:"near5", label:"Danger Zone", desc:"5 close calls in one run"},
    {id:"coins50", label:"Coin Collector", desc:"Collect 50 coins total"}
];

let unlockedAchievements = new Set(
    JSON.parse(localStorage.getItem("ballRunnerAchievements") || "[]")
);

let totalCoinsCollected =
    Number(localStorage.getItem("ballRunnerTotalCoins") || 0);

/* When the player logs in mid-session, GameAuth merges their cloud
   save into localStorage - so re-read it here to pick up a better
   high score, extra coins and already-unlocked achievements.

   On log OUT, GameAuth wipes the device progress instead, so the
   in-memory copies have to be able to go DOWN as well as up. That is
   what window.GameProgressReset is for: it makes the running game
   adopt whatever localStorage currently says, in either direction. */

window.GameProgressReset = function(){

    game.highScore = Number(localStorage.getItem("ballRunnerHighScore") || 0);
    totalCoinsCollected = Number(localStorage.getItem("ballRunnerTotalCoins") || 0);

    try{
        const stored = JSON.parse(localStorage.getItem("ballRunnerAchievements") || "[]");
        unlockedAchievements = new Set(Array.isArray(stored) ? stored : []);
    }catch(e){
        unlockedAchievements = new Set();
    }
};

if(window.GameAuth){

    window.GameAuth.onChange(user => {

        if(!user) return;

        game.highScore = Math.max(
            game.highScore,
            Number(localStorage.getItem("ballRunnerHighScore") || 0)
        );

        totalCoinsCollected = Math.max(
            totalCoinsCollected,
            Number(localStorage.getItem("ballRunnerTotalCoins") || 0)
        );

        try{
            const cloud = JSON.parse(localStorage.getItem("ballRunnerAchievements") || "[]");
            if(Array.isArray(cloud))
                unlockedAchievements = new Set([...unlockedAchievements, ...cloud]);
        }catch(e){}
    });
}

function showToast(title,desc){

    const toast=document.createElement("div");
    toast.className="toast";
    toast.innerHTML=`<strong>${title}</strong><span>${desc}</span>`;

    toastContainer.appendChild(toast);

    requestAnimationFrame(()=>toast.classList.add("show"));

    setTimeout(()=>{
        toast.classList.remove("show");
        setTimeout(()=>toast.remove(),400);
    },3200);
}

function unlockAchievement(id){

    if(unlockedAchievements.has(id)) return;

    unlockedAchievements.add(id);

    localStorage.setItem(
        "ballRunnerAchievements",
        JSON.stringify([...unlockedAchievements])
    );

    const def=ACHIEVEMENTS.find(a=>a.id===id);
    if(!def) return;

    sound("achievement");
    showToast("🏅 "+def.label, def.desc);


}


function getRank(score){

    if(score>=8000) return {label:"S",color:"#ffe600"};
    if(score>=5000) return {label:"A",color:"#00eaff"};
    if(score>=2500) return {label:"B",color:"#55ffcc"};
    if(score>=1000) return {label:"C",color:"#ff8a00"};

    return {label:"D",color:"#ff4770"};
}


/* ============================================================
   PLAYER
   ============================================================ */

const player = {
    x:PLAYER_X,
    y:GROUND-28,

    radius:28,

    vy:0,

    grounded:true,
    ducking:false,

    jumps:0,
    maxJumps:2,

    rotation:0,

    invincible:0,
    shield:0,

    trail:[],

    squash:1,
    squashVel:0,
    visualRadius:28,

    alive:true
};


/* ============================================================
   ARRAYS
   ============================================================ */

let obstacles = [];
let particles = [];
let coins = [];
let powerups = [];
let popups = [];
let stars = [];
let buildings = [];
let clouds = [];

let obstacleTimer = 0;
let coinTimer = 0;
let powerTimer = 0;


/* ============================================================
   AUDIO
   ------------------------------------------------------------
   All real synthesis now lives in js/audio.js (the GameAudio
   module). This thin wrapper keeps the rest of the game code
   unchanged: every existing `sound("type", intensity)` call is
   forwarded to the new engine, which produces far richer,
   layered effects and drives the adaptive soundtrack.
   ============================================================ */

/* game.js loads after audio.js, so window.GameAudio is available. */
const AUDIO_AVAILABLE = typeof window !== "undefined" && !!window.GameAudio;


function initAudio(){
    if(AUDIO_AVAILABLE) GameAudio.init();
}

/* Map the game's legacy sound names to the new SFX library and
   pass through the intensity value (used for combo-pitched coins
   and dodges). A few names are enriched with context. */
function sound(type,intensity=0){
    if(!AUDIO_AVAILABLE) return;
    if(game.muted) return;

    switch(type){
        case "coin":
            GameAudio.sfx("coin",{combo:intensity});
            break;
        case "pass":
            GameAudio.sfx("pass",{combo:intensity});
            break;
        case "power":
            /* specific powerup sounds are triggered directly via
               soundPower(); this generic case covers shield-block
               and mega-coin fanfares. */
            GameAudio.sfx(intensity==="mega" ? "mega" : "power");
            break;
        default:
            GameAudio.sfx(type);
    }
}

/* Convenience helpers used by the gameplay code below. */
function soundPower(type){
    if(!AUDIO_AVAILABLE || game.muted) return;
    const name = "power_"+type;
    GameAudio.sfx(name);
}

function comboFanfare(tier){
    if(!AUDIO_AVAILABLE || game.muted) return;
    GameAudio.sfx("combo",{tier});
}


/* ============================================================
   AUDIO UI + MUSIC LIFECYCLE
   ------------------------------------------------------------
   On-screen 🔊 / 🎵 buttons plus the M / N keyboard shortcuts
   all funnel through these helpers so the button visuals, the
   persisted preferences and the live audio engine stay in sync.
   ============================================================ */

const sfxBtn = document.getElementById("sfxBtn");
const musicBtn = document.getElementById("musicBtn");

function syncAudioButtons(){
    if(sfxBtn){
        const on = !game.muted;
        sfxBtn.classList.toggle("off", !on);
        sfxBtn.textContent = on ? "🔊" : "🔈";
    }
    if(musicBtn){
        const on = AUDIO_AVAILABLE ? GameAudio.isMusicOn() : true;
        musicBtn.classList.toggle("off", !on);
        musicBtn.textContent = on ? "🎵" : "🎵";
    }
}

function toggleSfxMute(){
    if(!AUDIO_AVAILABLE){ game.muted=!game.muted; syncAudioButtons(); return; }
    game.muted = GameAudio.toggleMuteAll();
    if(!game.muted) GameAudio.sfx("ui");
    syncAudioButtons();
}

function toggleMusic(){
    if(!AUDIO_AVAILABLE){ syncAudioButtons(); return; }
    GameAudio.toggleMusic();
    GameAudio.sfx("ui");
    syncAudioButtons();
}

/* Music state driver — decides which track (if any) should be
   playing for the current game state. Called on every state
   transition. */
function updateMusicForState(){
    if(!AUDIO_AVAILABLE) return;

    switch(game.state){
        case "menu":
            GameAudio.setPaused(false);
            GameAudio.startMusic("menu");
            break;
        case "ready":
        case "playing":
            GameAudio.setPaused(false);
            GameAudio.setIntensity(game.level);
            GameAudio.startMusic("game");
            break;
        case "paused":
            GameAudio.setPaused(true);
            break;
        case "gameover":
            GameAudio.setPaused(false);
            GameAudio.stopMusic();
            break;
    }
}

/* Central pause helper so keyboard + blur + (future) buttons all
   behave identically and keep the music ducked correctly. */
function setPaused(paused){
    if(paused){
        if(game.state!=="playing") return;
        game.state="paused";
    }else{
        if(game.state!=="paused") return;
        game.state="playing";
    }
    updateMusicForState();
}

if(sfxBtn) sfxBtn.addEventListener("click",()=>{ startMenuMusicOnce(); toggleSfxMute(); });
if(musicBtn) musicBtn.addEventListener("click",()=>{ startMenuMusicOnce(); toggleMusic(); });

syncAudioButtons();

/* Browsers block audio until a user gesture. We lazily kick off
   the menu soundtrack on the very first interaction, once. */
let menuMusicStarted = false;
function startMenuMusicOnce(){
    if(menuMusicStarted || !AUDIO_AVAILABLE) return;
    menuMusicStarted = true;
    initAudio();
    GameAudio.resume();
    if(game.state==="menu") GameAudio.startMusic("menu");
}





/* ============================================================
   BACKGROUND
   ============================================================ */

function createBackground(){

    stars=[];
    buildings=[];
    clouds=[];

    for(let i=0;i<120;i++){
        stars.push({
            x:Math.random()*W,
            y:Math.random()*340,
            r:Math.random()*1.6+.3,
            speed:Math.random()*.5+.1,
            phase:Math.random()*Math.PI*2
        });
    }

    for(let i=0;i<22;i++){
        const width=35+Math.random()*35;
        const height=50+Math.random()*130;
        const windows=[];

        for(let y=12;y<height-8;y+=17){
            for(let x=7;x<width-5;x+=13){
                if(Math.random()>.32) windows.push({x,y,alpha:.08+Math.random()*.2});
            }
        }

        buildings.push({
            x:i*55+Math.random()*20,
            width,
            height,
            windows
        });
    }

    for(let i=0;i<7;i++){
        clouds.push({
            x:Math.random()*W,
            y:70+Math.random()*130,
            size:40+Math.random()*55,
            speed:.2+Math.random()*.4
        });
    }
}

createBackground();


function updateBackground(){

    for(const s of stars){
        s.x-=s.speed*game.speed*.12;
        if(s.x<0) s.x=W;
    }

    for(const c of clouds){
        c.x-=c.speed;
        if(c.x<-120) c.x=W+100;
    }

    for(const b of buildings){
        b.x-=game.speed*.18;
        if(b.x+b.width<0) b.x=W+Math.random()*100;
    }
}


function drawBackground(){

    const gradient=ctx.createLinearGradient(0,0,0,H);

    gradient.addColorStop(0,bgTheme.sky[0]);
    gradient.addColorStop(.55,bgTheme.sky[1]);
    gradient.addColorStop(1,bgTheme.sky[2]);

    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,W,H);


    /* stars */

    for(const s of stars){

        const alpha=.35+.3*Math.sin(game.frame*.03+s.phase);

        ctx.globalAlpha=alpha;

        ctx.fillStyle=bgTheme.star;

        ctx.beginPath();
        ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fill();
    }

    ctx.globalAlpha=1;


    /* moon */

    ctx.save();

    ctx.shadowColor=bgTheme.moonGlow;
    ctx.shadowBlur=40;

    ctx.fillStyle=bgTheme.moon;

    ctx.beginPath();
    ctx.arc(780,105,43,0,Math.PI*2);
    ctx.fill();

    ctx.restore();


    /* clouds */

    for(const c of clouds){

        ctx.fillStyle=`rgba(${bgTheme.cloud},.08)`;

        ctx.beginPath();

        ctx.arc(c.x,c.y,c.size*.45,0,Math.PI*2);
        ctx.arc(c.x+c.size*.4,c.y-10,c.size*.35,0,Math.PI*2);
        ctx.arc(c.x+c.size*.7,c.y,c.size*.42,0,Math.PI*2);

        ctx.fill();
    }


    /* buildings */

    for(const b of buildings){

        ctx.fillStyle=bgTheme.building;

        ctx.fillRect(
            b.x,
            GROUND-b.height,
            b.width,
            b.height
        );

        for(const win of b.windows){
            ctx.fillStyle=`rgba(${bgTheme.window},${win.alpha})`;
            ctx.fillRect(b.x+win.x,GROUND-b.height+win.y,5,6);
        }
    }


    /* horizon glow */

    const horizon=ctx.createLinearGradient(
        0,GROUND-50,
        0,GROUND+20
    );

    horizon.addColorStop(0,`rgba(${bgTheme.horizon},0)`);
    horizon.addColorStop(.5,`rgba(${bgTheme.horizon},.13)`);
    horizon.addColorStop(1,`rgba(${bgTheme.horizon},0)`);

    ctx.fillStyle=horizon;
    ctx.fillRect(0,GROUND-60,W,80);


    /* ground */

    ctx.fillStyle="#070713";
    ctx.fillRect(0,GROUND,W,H-GROUND);

    ctx.strokeStyle=`rgba(${bgTheme.horizon},.5)`;
    ctx.lineWidth=2;

    ctx.beginPath();
    ctx.moveTo(0,GROUND);
    ctx.lineTo(W,GROUND);
    ctx.stroke();


    /* moving ground lines */

    const offset=(game.distance*2)%60;

    ctx.strokeStyle=`rgba(${bgTheme.horizon},.14)`;
    ctx.lineWidth=1;

    for(let x=-60+offset;x<W;x+=60){

        ctx.beginPath();
        ctx.moveTo(x,GROUND);
        ctx.lineTo(x-100,H);
        ctx.stroke();
    }

    for(let y=GROUND+25;y<H;y+=25){

        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(W,y);
        ctx.stroke();
    }
}


/* ============================================================
   PLAYER
   ============================================================ */

function jump(){

    if(game.state!=="playing") return;

    if(player.jumps<player.maxJumps){

        if(player.jumps===0){

            player.vy=JUMP_POWER;
            sound("jump");
            unlockAchievement("first_jump");

        }else{

            player.vy=DOUBLE_JUMP_POWER;
            sound("double");

        }

        player.jumps++;
        player.grounded=false;
        player.squashVel+=.4;

        createParticles(
            player.x,
            player.y+player.radius,
            8,
            ballPalette.glow
        );
    }
}


function setDuck(value){

    if(game.state!=="playing") return;

    player.ducking=value;

    if(value && !player.grounded)
        player.vy=Math.max(player.vy,7);
}


function updatePlayer(){

    const r=player.ducking ? 18 : player.radius;
    player.visualRadius+=(r-player.visualRadius)*.24;

    /* spring-based squash/stretch: always eases toward a target shape
       driven by vertical speed, with impulses added on jump/land for
       a lively, natural bounce instead of a flat linear blend. */

    const speedFactor=Math.min(Math.abs(player.vy)*.018,.32);
    const targetSquash=player.grounded ? 1 : 1+speedFactor;

    player.squashVel+=(targetSquash-player.squash)*.3;
    player.squashVel*=.7;
    player.squash+=player.squashVel;

    if(!player.grounded){

        player.vy+=GRAVITY;
        player.y+=player.vy;
    }

    const floor=GROUND-r;

    if(player.grounded){
        player.y=floor;
    }else if(player.y>=floor){

        player.y=floor;

        if(!player.grounded){
            sound("land");
            player.squashVel-=.6;
            createParticles(player.x,GROUND-2,7,ballPalette.glow);
        }

        player.vy=0;
        player.grounded=true;
        player.jumps=0;
    }


    if(player.y-r<0){

        player.y=r;
        player.vy=2;
    }


    player.rotation+=game.speed*.045;


    player.trail.unshift({
        x:player.x,
        y:player.y,
        r:r
    });

    if(player.trail.length>15)
        player.trail.pop();


    if(player.invincible>0)
        player.invincible--;

    if(player.shield>0)
        player.shield--;


    if(player.invincible>0 &&
       Math.floor(player.invincible/5)%2===0){
        return;
    }
}


function drawPlayer(){

    const r=player.visualRadius;
    const drawW=r*(2-player.squash);
    const drawH=r*player.squash;

    if(player.invincible>0 && Math.floor(player.invincible/5)%2===0) return;

    /* trail */

    for(let i=player.trail.length-1;i>=0;i--){

        const p=player.trail[i];

        ctx.globalAlpha=(1-i/player.trail.length)*.2;

        ctx.fillStyle=ballPalette.glow;

        ctx.beginPath();
        ctx.arc(
            p.x-i*3,
            p.y,
            p.r*(1-i/player.trail.length*.5),
            0,
            Math.PI*2
        );
        ctx.fill();
    }

    ctx.globalAlpha=1;


    /* shadow (shrinks and fades the higher the ball gets, for depth) */

    const heightAbove=Math.max(0,(GROUND-r)-player.y);
    const heightRatio=Math.min(1,heightAbove/220);
    const shadowScale=1-heightRatio*.55;
    const shadowAlpha=.45*(1-heightRatio*.65);

    ctx.fillStyle=`rgba(0,0,0,${shadowAlpha})`;

    ctx.beginPath();

    ctx.ellipse(
        player.x,
        GROUND+3,
        r*1.15*shadowScale,
        7*shadowScale,
        0,
        0,
        Math.PI*2
    );

    ctx.fill();


    /* shield */

    if(player.shield>0){

        ctx.save();

        ctx.strokeStyle="rgba(0,255,255,.8)";
        ctx.lineWidth=4;
        ctx.shadowColor="#00ffff";
        ctx.shadowBlur=20;

        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            r+11+Math.sin(game.frame*.15)*2,
            0,
            Math.PI*2
        );

        ctx.stroke();

        ctx.restore();
    }


    /* ball */

    const grad=ctx.createRadialGradient(
        player.x-r*.35,
        player.y-r*.4,
        2,
        player.x,
        player.y,
        r
    );

    grad.addColorStop(0,"#ffffff");
    grad.addColorStop(.2,ballPalette.glow);
    grad.addColorStop(.55,ballPalette.core);
    grad.addColorStop(1,ballPalette.edge);

    ctx.save();

    ctx.shadowColor=ballPalette.glow;
    ctx.shadowBlur=25;

    ctx.fillStyle=grad;

    ctx.beginPath();
    ctx.ellipse(player.x,player.y,drawW,drawH,0,0,Math.PI*2);
    ctx.fill();

    ctx.restore();


    /* ball shine */

    ctx.fillStyle="rgba(255,255,255,.75)";

    ctx.beginPath();

    ctx.ellipse(
        player.x-r*.32,
        player.y-r*.38,
        r*.18,
        r*.14,
        0,
        0,
        Math.PI*2
    );

    ctx.fill();


    /* rotation stripe */

    ctx.save();

    ctx.translate(player.x,player.y);
    ctx.rotate(player.rotation);

    ctx.strokeStyle="rgba(255,255,255,.65)";
    ctx.lineWidth=3;

    ctx.beginPath();
    ctx.arc(0,0,r*.72,-.7,.7);
    ctx.stroke();

    ctx.restore();


    /* face (drawn upright, independent of the ball's spin) */

    drawFace(r);
}


function drawFace(r){

    let mouthMode="smile";
    let eyeSquint=0;

    if(!player.grounded && player.vy<-4){
        mouthMode="excited";
    }else if(!player.grounded && player.vy>7){
        mouthMode="o";
        eyeSquint=.35;
    }else if(player.ducking){
        mouthMode="flat";
        eyeSquint=.55;
    }

    const cx=player.x+r*.16;
    const cy=player.y-r*.08;
    const eyeGap=r*.36;
    const eyeRX=r*.13;
    const eyeRY=eyeRX*(1-eyeSquint);

    ctx.fillStyle="#08202e";

    ctx.beginPath();
    ctx.ellipse(cx-eyeGap*.5,cy,eyeRX,eyeRY,0,0,Math.PI*2);
    ctx.ellipse(cx+eyeGap*.5,cy,eyeRX,eyeRY,0,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="#08202e";
    ctx.lineWidth=Math.max(1.4,r*.06);
    ctx.lineCap="round";

    const my=player.y+r*.32;

    ctx.beginPath();

    if(mouthMode==="smile"){
        ctx.arc(cx,my-r*.12,r*.2,.15*Math.PI,.85*Math.PI);
    }else if(mouthMode==="excited"){
        ctx.arc(cx,my,r*.12,0,Math.PI*2);
    }else if(mouthMode==="o"){
        ctx.arc(cx,my,r*.08,0,Math.PI*2);
    }else{
        ctx.moveTo(cx-r*.14,my);
        ctx.lineTo(cx+r*.14,my);
    }

    ctx.stroke();
}


/* ============================================================
   OBSTACLES
   ============================================================ */

const TYPES={

    spike:{
        action:"⬆ JUMP!",
        sub:"Jump over the spikes",
        color:"#ff315d"
    },

    wall:{
        action:"⬆ JUMP HIGH!",
        sub:"Solid wall - jump, don't duck",
        color:"#ff8a00"
    },

    cave:{
        action:"⬇ DUCK!",
        sub:"Low cave ceiling - slide under it",
        color:"#c9a06a"
    },

    flyer:{
        action:"⬇ DUCK!",
        sub:"Duck under the drone",
        color:"#b95cff"
    },

    laser:{
        action:"⬆ JUMP!",
        sub:"Jump over the laser",
        color:"#00eaff"
    },

    fire:{
        action:"⬆ JUMP!",
        sub:"Jump over the fire",
        color:"#ff5b00"
    },

    saw:{
        action:"⬆ JUMP!",
        sub:"Jump over the spinning blade",
        color:"#d0d6de"
    },

    orb:{
        action:"⚡ WATCH IT!",
        sub:"Read its height - jump or duck",
        color:"#ffe066"
    },

    swarm:{
        action:"⬇ DUCK!",
        sub:"Duck under the swarm",
        color:"#c084ff"
    }
};


function randomType(){

    if(game.level===1)
        return Math.random()<.75 ? "spike":"wall";

    if(game.level===2)
        return Math.random()<.5 ? "spike": (Math.random()<.5 ? "flyer":"cave");

    if(game.level===3){

        const arr=["spike","wall","flyer","laser","cave","saw"];
        return arr[Math.floor(Math.random()*arr.length)];
    }

    if(game.level<=5){

        const arr=["spike","wall","flyer","laser","cave","saw","orb","swarm"];
        return arr[Math.floor(Math.random()*arr.length)];
    }

    const arr=["spike","wall","flyer","laser","fire","cave","saw","orb","swarm"];

    return arr[Math.floor(Math.random()*arr.length)];
}


function spawnObstacle(){

    const type=randomType();

    let o={
        type,
        x:W+70,
        warned:false,
        passed:false,
        width:40,
        height:40,
        phase:Math.random()*Math.PI*2,
        minGap:Infinity
    };


    if(type==="spike"){

        o.width=45;
        o.height=45;
        o.y=GROUND-45;
    }

    if(type==="wall"){

        o.width=38;
        o.height=82;
        o.y=GROUND-82;
    }

    if(type==="flyer"){

        o.width=65;
        o.height=25;
        o.y=GROUND-105;
        o.baseY=o.y;
    }

    if(type==="laser"){

        o.width=80;
        o.height=12;
        o.y=GROUND-38;
    }

    if(type==="fire"){

        o.width=48;
        o.height=80;
        o.y=GROUND-80;
    }

    if(type==="cave"){

        o.width=54;
        o.height=392;
        o.y=0;
        o.hitboxScale=1;
    }

    if(type==="saw"){

        o.width=50;
        o.height=46;
        o.y=GROUND-46;
    }

    if(type==="orb"){

        o.width=32;
        o.height=32;
        o.y=GROUND-100;
        o.baseY=GROUND-100;
        o.amplitude=75;
    }

    if(type==="swarm"){

        o.width=72;
        o.height=24;
        o.y=GROUND-92;
        o.baseY=o.y;
    }

    obstacles.push(o);
}


function drawWallTexture(o,textureKey){

    ctx.save();

    ctx.beginPath();
    ctx.rect(o.x,o.y,o.width,o.height);
    ctx.clip();

    if(textureKey==="circuit"){

        ctx.strokeStyle="rgba(255,255,255,.3)";
        ctx.lineWidth=1;

        const step=12;

        for(let y=o.y+step/2;y<o.y+o.height;y+=step){
            ctx.beginPath();
            ctx.moveTo(o.x,y);
            ctx.lineTo(o.x+o.width,y);
            ctx.stroke();
        }

        ctx.fillStyle=`rgba(255,255,255,${.4+.3*Math.sin(game.frame*.15+o.phase)})`;

        for(let y=o.y+step;y<o.y+o.height;y+=step*2){
            ctx.beginPath();
            ctx.arc(o.x+o.width*.3,y,1.6,0,Math.PI*2);
            ctx.arc(o.x+o.width*.7,y,1.6,0,Math.PI*2);
            ctx.fill();
        }

    }else if(textureKey==="crystal"){

        ctx.strokeStyle="rgba(255,255,255,.4)";
        ctx.lineWidth=1.2;

        for(let i=0;i<4;i++){
            ctx.beginPath();
            ctx.moveTo(o.x+i*o.width/4,o.y);
            ctx.lineTo(o.x+i*o.width/4+o.width/8,o.y+o.height);
            ctx.stroke();
        }

    }else if(textureKey==="lava"){

        const glow=.45+.3*Math.sin(game.frame*.12+o.phase);

        ctx.strokeStyle=`rgba(255,150,40,${glow})`;
        ctx.lineWidth=2;

        ctx.beginPath();
        ctx.moveTo(o.x+4,o.y+8);
        ctx.quadraticCurveTo(o.x+o.width*.5,o.y+o.height*.4,o.x+8,o.y+o.height-6);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(o.x+o.width-6,o.y+4);
        ctx.quadraticCurveTo(o.x+o.width*.4,o.y+o.height*.6,o.x+o.width-4,o.y+o.height-4);
        ctx.stroke();

    }else if(textureKey==="stripe"){

        ctx.strokeStyle="rgba(255,255,255,.55)";
        ctx.lineWidth=6;

        for(let x=-o.height;x<o.width;x+=16){
            ctx.beginPath();
            ctx.moveTo(o.x+x,o.y+o.height);
            ctx.lineTo(o.x+x+o.height,o.y);
            ctx.stroke();
        }

    }else if(textureKey==="vine"){

        ctx.strokeStyle="rgba(15,50,15,.65)";
        ctx.lineWidth=2;

        ctx.beginPath();
        ctx.moveTo(o.x+6,o.y);

        for(let y=o.y;y<o.y+o.height;y+=10){
            ctx.lineTo(o.x+6+Math.sin(y*.2)*6,y);
        }

        ctx.stroke();

        ctx.fillStyle="rgba(120,220,90,.6)";

        for(let y=o.y+6;y<o.y+o.height;y+=20){
            ctx.beginPath();
            ctx.arc(o.x+6+Math.sin(y*.2)*6,y,3,0,Math.PI*2);
            ctx.fill();
        }

    }else{

        /* brick (default) */

        ctx.strokeStyle="rgba(0,0,0,.35)";
        ctx.lineWidth=1.4;

        const brickH=14;
        let row=0;

        for(let y=o.y;y<o.y+o.height;y+=brickH){

            ctx.beginPath();
            ctx.moveTo(o.x,y);
            ctx.lineTo(o.x+o.width,y);
            ctx.stroke();

            const offset=(row%2===0)?0:o.width/2;

            for(let x=o.x+offset;x<o.x+o.width;x+=o.width/2){
                ctx.beginPath();
                ctx.moveTo(x,y);
                ctx.lineTo(x,Math.min(o.y+o.height,y+brickH));
                ctx.stroke();
            }

            row++;
        }
    }

    ctx.restore();
}


function drawObstacle(o){

    const info=TYPES[o.type];
    const skinInfo=obstacleSkin[o.type];
    const mainColor=(skinInfo && (skinInfo.color||skinInfo.core)) || info.color;

    ctx.save();

    ctx.shadowColor=mainColor;
    ctx.shadowBlur=15;


    if(o.type==="spike"){

        ctx.fillStyle=skinInfo.color;

        const count=3;

        for(let i=0;i<count;i++){

            const x=o.x+i*15;

            ctx.beginPath();

            ctx.moveTo(x,o.y+o.height);
            ctx.lineTo(x+8,o.y);
            ctx.lineTo(x+16,o.y+o.height);

            ctx.closePath();
            ctx.fill();

            /* faceted highlight down the centre */

            ctx.strokeStyle="rgba(255,255,255,.45)";
            ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(x+8,o.y);
            ctx.lineTo(x+8,o.y+o.height);
            ctx.stroke();
        }
    }


    if(o.type==="wall"){

        const g=ctx.createLinearGradient(
            o.x,o.y,
            o.x+o.width,o.y+o.height
        );

        g.addColorStop(0,skinInfo.colors[0]);
        g.addColorStop(.5,skinInfo.colors[1]);
        g.addColorStop(1,skinInfo.colors[2]);

        ctx.fillStyle=g;

        ctx.fillRect(
            o.x,
            o.y,
            o.width,
            o.height
        );

        drawWallTexture(o,skinInfo.texture);

        /* crack detail */

        ctx.strokeStyle="rgba(0,0,0,.4)";
        ctx.lineWidth=1.2;

        ctx.beginPath();
        ctx.moveTo(o.x+o.width*.3,o.y+6);
        ctx.lineTo(o.x+o.width*.5,o.y+o.height*.4);
        ctx.lineTo(o.x+o.width*.28,o.y+o.height*.72);
        ctx.stroke();

        /* accent glow at the top corners */

        const glow=.5+.35*Math.sin(game.frame*.18+o.phase);

        ctx.fillStyle=skinInfo.accent;
        ctx.globalAlpha=glow;
        ctx.beginPath();
        ctx.arc(o.x+6,o.y+6,4,0,Math.PI*2);
        ctx.arc(o.x+o.width-6,o.y+6,4,0,Math.PI*2);
        ctx.fill();
        ctx.globalAlpha=1;
    }


    if(o.type==="cave"){

        /* hanging ceiling formation - must duck under it */

        const g=ctx.createLinearGradient(o.x,0,o.x,o.height);
        g.addColorStop(0,skinInfo.colors[0]);
        g.addColorStop(1,skinInfo.colors[1]);

        ctx.fillStyle=g;
        ctx.fillRect(o.x,0,o.width,o.height);

        /* jagged edge along the bottom */

        const spikes=4;
        const spikeW=o.width/spikes;

        ctx.fillStyle=skinInfo.colors[0];
        ctx.beginPath();
        ctx.moveTo(o.x,o.height-18);

        for(let i=0;i<=spikes;i++){

            const sx=o.x+i*spikeW;
            const sy=(i%2===0) ? o.height+16 : o.height-8;

            ctx.lineTo(sx,sy);
        }

        ctx.lineTo(o.x+o.width,o.height-18);
        ctx.closePath();
        ctx.fill();

        /* accent detail (moss / crystal / lava / gummy dots depending on skin) */

        ctx.fillStyle=skinInfo.accent+"99";

        for(let i=0;i<3;i++){
            ctx.beginPath();
            ctx.arc(o.x+10+i*(o.width/3),o.height-14,5,0,Math.PI*2);
            ctx.fill();
        }

        /* danger strip marking the safe duck gap */

        const warn=.35+.25*Math.sin(game.frame*.2+o.phase);

        ctx.fillStyle=skinInfo.accent;
        ctx.globalAlpha=warn;
        ctx.fillRect(o.x,o.height,o.width,3);
        ctx.globalAlpha=1;
    }


    if(o.type==="flyer"){

        /* the "egg" - now a full creature/craft whose silhouette
           changes completely per world skin, not just its colors */

        const cx=o.x+o.width/2;
        const cy=o.y+o.height/2;
        const pulse=.6+.4*Math.sin(game.frame*.2+o.phase);
        const blink=Math.floor(game.frame/8+o.phase*3)%2===0;
        const shape=skinInfo.shape||"saucer";

        if(shape==="saucer"){

            const bodyGrad=ctx.createLinearGradient(o.x,o.y,o.x,o.y+o.height);
            bodyGrad.addColorStop(0,skinInfo.colors[0]);
            bodyGrad.addColorStop(.55,skinInfo.colors[1]);
            bodyGrad.addColorStop(1,skinInfo.colors[2]);

            ctx.fillStyle=bodyGrad;
            ctx.beginPath();
            ctx.ellipse(cx,cy,o.width/2,o.height/2,0,0,Math.PI*2);
            ctx.fill();

            ctx.strokeStyle=skinInfo.core+"88";
            ctx.lineWidth=1.4;
            ctx.stroke();

            const coreGrad=ctx.createRadialGradient(cx,cy-2,1,cx,cy,11);
            coreGrad.addColorStop(0,"#ffffff");
            coreGrad.addColorStop(.45,skinInfo.core);
            coreGrad.addColorStop(1,"rgba(0,0,0,0)");

            ctx.globalAlpha=pulse;
            ctx.fillStyle=coreGrad;
            ctx.beginPath();
            ctx.arc(cx,cy-2,11,0,Math.PI*2);
            ctx.fill();
            ctx.globalAlpha=1;

            ctx.fillStyle=blink ? "#ff3355" : "rgba(255,51,85,.25)";
            ctx.beginPath();
            ctx.arc(o.x+9,cy,3,0,Math.PI*2);
            ctx.arc(o.x+o.width-9,cy,3,0,Math.PI*2);
            ctx.fill();

            /* sweeping scanner eye */

            const sweep=Math.sin(game.frame*.08+o.phase)*(o.width/2-8);

            ctx.save();
            ctx.shadowColor="#ff3355";
            ctx.shadowBlur=8;
            ctx.fillStyle="#ff3355";
            ctx.beginPath();
            ctx.arc(cx+sweep,cy+o.height*.18,2.4,0,Math.PI*2);
            ctx.fill();
            ctx.restore();

            const wing=Math.sin(game.frame*.3+o.phase)*4;

            ctx.strokeStyle=skinInfo.core+"80";
            ctx.lineWidth=2;
            ctx.beginPath();
            ctx.moveTo(o.x+6,cy+wing*.3);
            ctx.lineTo(o.x-8,cy+wing);
            ctx.moveTo(o.x+o.width-6,cy+wing*.3);
            ctx.lineTo(o.x+o.width+8,cy+wing);
            ctx.stroke();

            const thrusterAlpha=Math.floor(30+20*Math.sin(game.frame*.4)).toString(16).padStart(2,"0");

            ctx.fillStyle=skinInfo.core+thrusterAlpha;
            ctx.beginPath();
            ctx.ellipse(cx,o.y+o.height+2,9,4,0,0,Math.PI*2);
            ctx.fill();

        }else if(shape==="dome"){

            /* retro UFO - wide saucer base + glass dome on top */

            ctx.fillStyle=skinInfo.colors[1];
            ctx.beginPath();
            ctx.ellipse(cx,cy+o.height*.15,o.width/2,o.height*.32,0,0,Math.PI*2);
            ctx.fill();

            const domeGrad=ctx.createRadialGradient(cx,cy-o.height*.3,1,cx,cy-o.height*.1,o.width*.32);
            domeGrad.addColorStop(0,"#ffffff");
            domeGrad.addColorStop(.55,skinInfo.core);
            domeGrad.addColorStop(1,skinInfo.colors[0]);

            ctx.fillStyle=domeGrad;
            ctx.beginPath();
            ctx.ellipse(cx,cy-o.height*.05,o.width*.32,o.height*.42,Math.PI,0,Math.PI);
            ctx.fill();

            for(let i=-1;i<=1;i++){
                const lit=Math.floor(game.frame/6+i)%3===0;
                ctx.fillStyle=lit ? skinInfo.core : "rgba(255,255,255,.25)";
                ctx.beginPath();
                ctx.arc(cx+i*o.width*.22,cy+o.height*.22,2.6,0,Math.PI*2);
                ctx.fill();
            }

        }else if(shape==="flame"){

            /* living flame spirit - flickering translucent layers, no rigid body */

            const flicker=Math.sin(game.frame*.3+o.phase)*3;

            for(let i=0;i<3;i++){

                const layerGrad=ctx.createRadialGradient(cx,cy,1,cx,cy,Math.max(2,o.width/2-i*4));
                layerGrad.addColorStop(0,skinInfo.core);
                layerGrad.addColorStop(1,skinInfo.colors[i%skinInfo.colors.length]);

                ctx.globalAlpha=.75-i*.18;
                ctx.fillStyle=layerGrad;
                ctx.beginPath();
                ctx.ellipse(
                    cx+Math.sin(game.frame*.2+i)*3,
                    cy+flicker*(i+1)*.3,
                    Math.max(2,o.width/2-i*5),
                    Math.max(2,o.height/2-i*3),
                    0,0,Math.PI*2
                );
                ctx.fill();
            }

            ctx.globalAlpha=1;

            for(let i=0;i<3;i++){
                const t=(game.frame*.02+i/3)%1;
                ctx.fillStyle=`rgba(255,200,80,${1-t})`;
                ctx.beginPath();
                ctx.arc(cx+Math.sin(game.frame*.1+i*2)*6,cy+o.height/2-t*30,1.6,0,Math.PI*2);
                ctx.fill();
            }

        }else if(shape==="donut"){

            /* candy ring drone with sprinkles */

            ctx.strokeStyle=skinInfo.colors[1];
            ctx.lineWidth=o.height*.5;
            ctx.beginPath();
            ctx.arc(cx,cy,o.width/2-o.height*.25,0,Math.PI*2);
            ctx.stroke();

            ctx.strokeStyle=skinInfo.core+"cc";
            ctx.lineWidth=o.height*.18;
            ctx.beginPath();
            ctx.arc(cx,cy,o.width/2-o.height*.25,0,Math.PI*2);
            ctx.stroke();

            for(let i=0;i<6;i++){
                const ang=(i/6)*Math.PI*2+game.frame*.02;
                const sx=cx+Math.cos(ang)*(o.width/2-o.height*.25);
                const sy=cy+Math.sin(ang)*(o.width/2-o.height*.25);

                ctx.fillStyle=i%2===0 ? "#ffffff" : skinInfo.colors[0];
                ctx.beginPath();
                ctx.arc(sx,sy,1.8,0,Math.PI*2);
                ctx.fill();
            }

            ctx.strokeStyle="rgba(255,255,255,.6)";
            ctx.lineWidth=1.4;
            ctx.beginPath();
            ctx.moveTo(cx-8,cy-o.height*.5-4);
            ctx.lineTo(cx+8,cy-o.height*.5-4);
            ctx.stroke();

        }else if(shape==="pod"){

            /* organic spore pod with dangling tendrils */

            const bob=Math.sin(game.frame*.15+o.phase)*2;

            const podGrad=ctx.createRadialGradient(cx-4,cy-4+bob,1,cx,cy+bob,o.width/2);
            podGrad.addColorStop(0,skinInfo.core);
            podGrad.addColorStop(.6,skinInfo.colors[0]);
            podGrad.addColorStop(1,skinInfo.colors[2]);

            ctx.fillStyle=podGrad;
            ctx.beginPath();
            ctx.ellipse(cx,cy+bob,o.width/2,o.height/2,0,0,Math.PI*2);
            ctx.fill();

            ctx.strokeStyle=skinInfo.colors[1];
            ctx.lineWidth=1.6;

            for(let i=-1;i<=1;i+=2){
                ctx.beginPath();
                ctx.moveTo(cx+i*o.width*.25,cy+o.height*.4+bob);
                ctx.quadraticCurveTo(
                    cx+i*o.width*.3,cy+o.height*.4+bob+10+Math.sin(game.frame*.1+i)*3,
                    cx+i*o.width*.15,cy+o.height*.4+bob+16
                );
                ctx.stroke();
            }

            ctx.globalAlpha=pulse*.7;
            ctx.fillStyle=skinInfo.core;
            ctx.beginPath();
            ctx.arc(cx,cy+bob,3,0,Math.PI*2);
            ctx.fill();
            ctx.globalAlpha=1;
        }
    }


    if(o.type==="saw"){

        /* spinning buzzsaw blade */

        const cx=o.x+o.width/2;
        const cy=o.y+o.height/2;
        const radius=o.width/2;
        const teeth=10;

        ctx.save();
        ctx.translate(cx,cy);
        ctx.rotate(game.frame*.35+o.phase);

        ctx.fillStyle=skinInfo.color;
        ctx.beginPath();

        for(let i=0;i<teeth;i++){
            const a1=(i/teeth)*Math.PI*2;
            const a2=((i+.5)/teeth)*Math.PI*2;
            ctx.lineTo(Math.cos(a1)*radius,Math.sin(a1)*radius);
            ctx.lineTo(Math.cos(a2)*radius*.7,Math.sin(a2)*radius*.7);
        }

        ctx.closePath();
        ctx.fill();

        ctx.fillStyle=skinInfo.accent;
        ctx.beginPath();
        ctx.arc(0,0,radius*.35,0,Math.PI*2);
        ctx.fill();

        ctx.restore();

        if(Math.random()<.4){
            const ang=Math.random()*Math.PI*2;
            ctx.fillStyle=skinInfo.accent;
            ctx.beginPath();
            ctx.arc(cx+Math.cos(ang)*radius,cy+Math.sin(ang)*radius,1.4,0,Math.PI*2);
            ctx.fill();
        }
    }


    if(o.type==="orb"){

        /* floating warning orb - a moving read-and-react hazard */

        const cx=o.x+o.width/2;
        const cy=o.y+o.height/2;
        const pulse=.6+.4*Math.sin(game.frame*.15+o.phase);

        ctx.save();
        ctx.translate(cx,cy);
        ctx.rotate(game.frame*.04+o.phase);

        ctx.strokeStyle=skinInfo.ring;
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.ellipse(0,0,o.width/2+4,o.height/4,0,0,Math.PI*2);
        ctx.stroke();

        ctx.restore();

        const coreGrad=ctx.createRadialGradient(cx,cy,1,cx,cy,o.width/2);
        coreGrad.addColorStop(0,"#ffffff");
        coreGrad.addColorStop(.5,skinInfo.color);
        coreGrad.addColorStop(1,"rgba(0,0,0,0)");

        ctx.globalAlpha=pulse;
        ctx.fillStyle=coreGrad;
        ctx.beginPath();
        ctx.arc(cx,cy,o.width/2,0,Math.PI*2);
        ctx.fill();
        ctx.globalAlpha=1;

        const orbitAngle=game.frame*.1+o.phase;

        ctx.fillStyle=skinInfo.ring;
        ctx.beginPath();
        ctx.arc(
            cx+Math.cos(orbitAngle)*(o.width/2+8),
            cy+Math.sin(orbitAngle)*(o.width/2+8)*.4,
            2.4,0,Math.PI*2
        );
        ctx.fill();
    }


    if(o.type==="swarm"){

        /* a small cluster of creatures moving together */

        const count=3;

        for(let i=0;i<count;i++){

            const localX=o.x+(i+.5)*(o.width/count);
            const localY=o.y+o.height/2+Math.sin(game.frame*.25+o.phase+i*2)*6;
            const size=8-i*.5;

            ctx.fillStyle=skinInfo.color;
            ctx.beginPath();
            ctx.ellipse(localX,localY,size,size*.7,0,0,Math.PI*2);
            ctx.fill();

            const wing=Math.sin(game.frame*.5+o.phase+i)*5;

            ctx.strokeStyle=skinInfo.accent+"aa";
            ctx.lineWidth=1.4;
            ctx.beginPath();
            ctx.moveTo(localX-size*.6,localY);
            ctx.lineTo(localX-size*.6-6,localY+wing);
            ctx.moveTo(localX+size*.6,localY);
            ctx.lineTo(localX+size*.6+6,localY+wing);
            ctx.stroke();

            ctx.fillStyle=skinInfo.accent;
            ctx.beginPath();
            ctx.arc(localX,localY-1,1.2,0,Math.PI*2);
            ctx.fill();
        }
    }


    if(o.type==="laser"){

        ctx.strokeStyle=skinInfo.color;
        ctx.lineWidth=o.height*(.82+Math.sin(game.frame*.28+o.phase)*.18);
        ctx.shadowBlur=20+Math.sin(game.frame*.22+o.phase)*8;

        ctx.beginPath();

        ctx.moveTo(o.x,o.y+o.height/2);
        ctx.lineTo(o.x+o.width,o.y+o.height/2);

        ctx.stroke();

        ctx.strokeStyle="#ffffff";
        ctx.lineWidth=2;

        ctx.beginPath();

        ctx.moveTo(o.x,o.y+o.height/2);
        ctx.lineTo(o.x+o.width,o.y+o.height/2);

        ctx.stroke();
    }


    if(o.type==="fire"){

        const flicker=Math.sin(game.frame*.25)*6;

        const g=ctx.createLinearGradient(
            o.x,
            o.y,
            o.x,
            o.y+o.height
        );

        g.addColorStop(0,skinInfo.colors[0]);
        g.addColorStop(.3,skinInfo.colors[1]);
        g.addColorStop(.7,skinInfo.colors[2]);
        g.addColorStop(1,"rgba(0,0,0,0)");

        ctx.fillStyle=g;

        ctx.beginPath();

        ctx.ellipse(
            o.x+o.width/2+flicker,
            o.y+o.height/2,
            o.width/2,
            o.height/2,
            0,
            0,
            Math.PI*2
        );

        ctx.fill();
    }

    ctx.restore();
}


function obstacleHit(o){

    const r=player.ducking?18:player.radius;

    const px=player.x;
    const py=player.y;

    const ox=o.x;
    const oy=o.y;

    const scale=o.hitboxScale||.9;
    const hitboxW=o.width*scale;
    const hitboxH=o.height*scale;

    return (
        px+r>ox &&
        px-r<ox+hitboxW &&
        py+r>oy &&
        py-r<oy+hitboxH
    );
}


/* ============================================================
   WARNING SYSTEM
   ============================================================ */

function updateWarnings(){

    let active=null;

    for(const o of obstacles){

        const distance=o.x-player.x;

        if(
            distance<WARNING_DISTANCE &&
            distance>0 &&
            !o.warned
        ){

            o.warned=true;
            sound("warning");
        }

        if(
            distance<WARNING_DISTANCE &&
            distance>0
        ){

            active=o;
            break;
        }
    }

    if(active){

        const info=TYPES[active.type];
        const skinInfo=obstacleSkin[active.type];
        const color=(skinInfo && (skinInfo.color||skinInfo.core)) || info.color;
        const name=skinInfo && skinInfo.name;

        hintMain.textContent=info.action;

        if(name){
            if(active.type==="orb") hintSub.textContent=`Read the ${name}'s height - jump, duck, or hold`;
            else hintSub.textContent=info.action.indexOf("JUMP")!==-1 ? `Jump over the ${name}` : `Duck under the ${name}`;
        }else{
            hintSub.textContent=info.sub;
        }

        hintBox.style.borderColor=color;
        hintBox.style.boxShadow=`0 0 25px ${color}`;

        hintBox.classList.add("show");

    }else{

        hintBox.classList.remove("show");
    }
}


/* ============================================================
   COINS
   ============================================================ */

function spawnCoin(){

    const mega=Math.random()<.1;

    coins.push({
        x:W+30,
        y:GROUND-80-Math.random()*120,
        baseY:0,
        r:mega?16:10,
        rotation:0,
        phase:Math.random()*Math.PI*2,
        mega
    });
    coins[coins.length-1].baseY=coins[coins.length-1].y;
}


function updateCoins(){

    for(let i=coins.length-1;i>=0;i--){

        const c=coins[i];

        c.rotation+=.12;

        let pulled=false;

        if(game.magnetTimer>0){

            const mdx=player.x-c.x;
            const mdy=player.y-c.y;
            const mdist=Math.hypot(mdx,mdy);

            if(mdist<260){

                pulled=true;

                /* accelerating pull - gentle at first, snappy up close,
                   so it reliably reaches and gets collected instead of
                   just hovering near the player forever */

                const pull=Math.min(mdist,4+ (260-mdist)*.16);

                if(mdist>1){
                    c.x+=(mdx/mdist)*pull;
                    c.y+=(mdy/mdist)*pull;
                }else{
                    c.x=player.x;
                    c.y=player.y;
                }
            }
        }

        if(!pulled){
            c.x-=game.speed;
            c.y=c.baseY+Math.sin(game.frame*.09+c.phase)*6;
        }

        const dx=player.x-c.x;
        const dy=player.y-c.y;

        if(Math.sqrt(dx*dx+dy*dy)<player.radius+c.r){

            const base=c.mega?125:25;
            const gained=base*(1+game.combo);

            game.score+=gained;
            game.coinsCollected++;

            totalCoinsCollected++;
            localStorage.setItem("ballRunnerTotalCoins",totalCoinsCollected);
            if(totalCoinsCollected>=50) unlockAchievement("coins50");

            game.combo++;
            game.comboTimer=120;
            if(game.combo>game.maxCombo) game.maxCombo=game.combo;
            if(game.combo>=10) unlockAchievement("combo10");

            if(c.mega) sound("power","mega");
            else sound("coin",game.combo);

            /* combo-tier whoosh at milestone streaks */
            if(game.combo===5 || game.combo===10 || game.combo===20)
                comboFanfare(game.combo/5);

            createParticles(c.x,c.y,c.mega?26:12,c.mega?"#ff8a00":"#ffd84a");

            addPopup(c.x,c.y-14,(c.mega?"MEGA +":"+")+Math.floor(gained),c.mega?"#ff8a00":"#ffd84a");

            if(navigator.vibrate){
                try{ navigator.vibrate(c.mega?40:15); }catch(e){}
            }

            coins.splice(i,1);

            continue;
        }

        if(c.x<-30)
            coins.splice(i,1);
    }
}


function drawCoins(){

    for(const c of coins){

        ctx.save();

        ctx.translate(c.x,c.y);
        ctx.rotate(c.rotation);

        const color=c.mega?"#ffb347":"#ffd84a";

        ctx.shadowColor=color;
        ctx.shadowBlur=c.mega?26:15;

        ctx.fillStyle=color;

        ctx.beginPath();

        ctx.ellipse(
            0,0,
            c.r*.7,
            c.r,
            0,
            0,
            Math.PI*2
        );

        ctx.fill();

        ctx.fillStyle="#fff4a0";

        ctx.beginPath();
        ctx.arc(-3,-3,c.mega?4:3,0,Math.PI*2);
        ctx.fill();

        if(c.mega){

            ctx.strokeStyle="rgba(255,255,255,.8)";
            ctx.lineWidth=2;

            ctx.beginPath();
            ctx.arc(0,0,c.r+6+Math.sin(game.frame*.2)*2,0,Math.PI*2);
            ctx.stroke();
        }

        ctx.restore();
    }
}


/* ============================================================
   POWER UPS
   ============================================================ */

function recalcSpeed(){

    if(game.slowmoTimer>0){
        game.speed=game.baseSpeed*.55;
    }else if(game.boostTimer>0){
        game.speed=game.baseSpeed+2;
    }else{
        game.speed=game.baseSpeed;
    }
}


const POWERUP_TYPES=["shield","boost","magnet","slowmo"];


function spawnPower(){

    const type=POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];

    powerups.push({
        x:W+50,
        y:GROUND-100-Math.random()*100,
        type,
        r:15,
        rotation:0
    });
}


const POWERUP_COLORS={
    shield:"#00ffff",
    boost:"#ffe600",
    magnet:"#ff66c4",
    slowmo:"#7dfcff"
};


function updatePowerups(){

    for(let i=powerups.length-1;i>=0;i--){

        const p=powerups[i];

        p.x-=game.speed;
        p.rotation+=.08;

        const d=Math.hypot(
            player.x-p.x,
            player.y-p.y
        );

        if(d<player.radius+p.r){

            if(p.type==="shield"){

                player.shield=600;

            }else if(p.type==="boost"){

                game.boostTimer=240;
                recalcSpeed();

            }else if(p.type==="magnet"){

                game.magnetTimer=480;

            }else if(p.type==="slowmo"){

                game.slowmoTimer=220;
                recalcSpeed();
                if(AUDIO_AVAILABLE) GameAudio.setSlowmo(true);
            }

            soundPower(p.type);


            createParticles(
                p.x,
                p.y,
                20,
                POWERUP_COLORS[p.type]
            );

            powerups.splice(i,1);
        }
    }
}


function drawPowerups(){

    for(const p of powerups){

        const color=POWERUP_COLORS[p.type];

        ctx.save();

        ctx.translate(p.x,p.y);
        ctx.rotate(p.rotation);

        ctx.shadowColor=color;
        ctx.shadowBlur=20;

        ctx.strokeStyle=color;
        ctx.lineWidth=4;

        ctx.beginPath();

        if(p.type==="shield"){

            ctx.arc(0,0,p.r,0,Math.PI*2);

        }else if(p.type==="boost"){

            ctx.moveTo(-5,-15);
            ctx.lineTo(4,-3);
            ctx.lineTo(-2,-3);
            ctx.lineTo(7,15);
            ctx.lineTo(-5,2);
            ctx.lineTo(1,2);
            ctx.closePath();

        }else if(p.type==="magnet"){

            /* horseshoe magnet */

            ctx.arc(0,2,10,Math.PI,0,false);
            ctx.moveTo(-10,2);
            ctx.lineTo(-10,13);
            ctx.moveTo(10,2);
            ctx.lineTo(10,13);

        }else if(p.type==="slowmo"){

            /* clock face */

            ctx.arc(0,0,10,0,Math.PI*2);
            ctx.moveTo(0,0);
            ctx.lineTo(0,-6);
            ctx.moveTo(0,0);
            ctx.lineTo(5,3);
        }

        ctx.stroke();

        if(p.type==="magnet"){
            ctx.fillStyle=color;
            ctx.beginPath();
            ctx.arc(-10,13,2,0,Math.PI*2);
            ctx.arc(10,13,2,0,Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }
}


/* ============================================================
   PARTICLES
   ============================================================ */

function createParticles(x,y,count,color){

    for(let i=0;i<count;i++){

        particles.push({

            x,
            y,

            vx:(Math.random()-.5)*7,
            vy:(Math.random()-.5)*7,

            size:Math.random()*4+2,

            life:1,

            decay:.025+Math.random()*.035,

            color
        });
    }
}


function updateParticles(){

    for(let i=particles.length-1;i>=0;i--){

        const p=particles[i];

        p.x+=p.vx;
        p.y+=p.vy;

        p.vy+=.12;

        p.life-=p.decay;

        if(p.life<=0)
            particles.splice(i,1);
    }
}


/* ============================================================
   SCORE POPUPS
   ============================================================ */

function addPopup(x,y,text,color){

    popups.push({
        x,
        y,
        text,
        color,
        life:1,
        vy:-1.3
    });
}


function updatePopups(){

    for(let i=popups.length-1;i>=0;i--){

        const p=popups[i];

        p.y+=p.vy;
        p.vy*=.96;

        p.life-=.017;

        if(p.life<=0)
            popups.splice(i,1);
    }
}


function drawPopups(){

    ctx.textAlign="center";

    for(const p of popups){

        ctx.globalAlpha=Math.max(0,p.life);
        ctx.fillStyle=p.color;
        ctx.font="bold 19px Arial";
        ctx.shadowColor=p.color;
        ctx.shadowBlur=10;

        ctx.fillText(p.text,p.x,p.y);
    }

    ctx.globalAlpha=1;
    ctx.shadowBlur=0;
}


function drawParticles(){

    for(const p of particles){

        ctx.globalAlpha=p.life;

        ctx.fillStyle=p.color;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size*p.life,
            0,
            Math.PI*2
        );

        ctx.fill();
    }

    ctx.globalAlpha=1;
}


/* ============================================================
   COLLISION / DAMAGE
   ============================================================ */

function damage(){

    if(player.invincible>0)
        return;

    if(player.shield>0){

        player.shield=0;
        player.invincible=60;

        createParticles(
            player.x,
            player.y,
            25,
            "#00ffff"
        );

        sound("power");
        addPopup(player.x,player.y-40,"SHIELD!","#00ffff");

        return;

    }

    game.lives--;

    game.combo=0;
    game.comboTimer=0;

    player.invincible=100;

    game.shake=18;
    game.flash=12;

    sound("hit");

    if(navigator.vibrate){
        try{ navigator.vibrate([40,30,60]); }catch(e){}
    }

    createParticles(
        player.x,
        player.y,
        35,
        "#ff3355"
    );

    if(game.lives<=0){

        endGame();
    }
}


/* ============================================================
   LEVEL SYSTEM
   ============================================================ */

function updateLevel(){

    game.levelDistance+=game.speed;

    const required=1200+game.level*450;

    if(game.levelDistance>=required){

        game.level++;

        game.levelDistance=0;

        game.baseSpeed+=.55;
        recalcSpeed();
        game.levelBanner=150;

        sound("level");

        /* drive the soundtrack harder each level */
        if(AUDIO_AVAILABLE) GameAudio.setIntensity(game.level);


        createParticles(
            W/2,
            H/2,
            45,
            "#00ffff"
        );
    }
}


/* ============================================================
   SCORE
   ============================================================ */

function updateScore(){

    game.distance+=game.speed;

    game.score+=.03*game.speed;

    if(game.comboTimer>0){

        game.comboTimer--;

    }else{

        game.combo=Math.max(0,game.combo-1);
    }

    if(game.score>game.highScore){

        game.highScore=Math.floor(game.score);

        localStorage.setItem(
            "ballRunnerHighScore",
            game.highScore
        );
    }

    if(game.score>=1000) unlockAchievement("score1000");
    if(game.score>=5000) unlockAchievement("score5000");

    const milestoneStep=500;
    const currentMilestone=Math.floor(game.score/milestoneStep);

    if(currentMilestone>game.milestone && currentMilestone>0){

        game.milestone=currentMilestone;
        game.milestoneBanner=150;
        game.milestoneValue=currentMilestone*milestoneStep;
        game.punch=14;

        sound("milestone");

        createParticles(W/2,H*.4,60,"#ffd84a");
    }
}


/* ============================================================
   OBSTACLE UPDATE
   ============================================================ */

function updateObstacles(){

    obstacleTimer--;

    if(obstacleTimer<=0){

        spawnObstacle();

        const min=Math.max(
            55,
            115-game.level*5
        );

        const max=Math.max(
            90,
            165-game.level*6
        );

        obstacleTimer=
            Math.floor(
                min+
                Math.random()*(max-min)
            );
    }


    for(let i=obstacles.length-1;i>=0;i--){

        const o=obstacles[i];

        o.x-=game.speed;
        if(o.type==="flyer") o.y=o.baseY+Math.sin(game.frame*.08+o.phase)*9;
        if(o.type==="swarm") o.y=o.baseY+Math.sin(game.frame*.1+o.phase)*10;
        if(o.type==="orb") o.y=o.baseY+Math.sin(game.frame*.045+o.phase*3)*o.amplitude;


        if(
            o.x-player.x<160 &&
            o.x+o.width-player.x>-40
        ){
            const r=player.ducking?18:player.radius;
            const closestX=Math.max(o.x,Math.min(player.x,o.x+o.width));
            const closestY=Math.max(o.y,Math.min(player.y,o.y+o.height));
            const gap=Math.hypot(player.x-closestX,player.y-closestY)-r;

            if(gap<o.minGap) o.minGap=gap;
        }


        if(
            !o.passed &&
            o.x+o.width<player.x
        ){

            o.passed=true;

            game.obstaclesDodged++;
            game.score+=20;

            game.combo++;
            game.comboTimer=120;
            if(game.combo>game.maxCombo) game.maxCombo=game.combo;
            if(game.combo>=10) unlockAchievement("combo10");

            sound("pass",game.combo);

            createParticles(
                player.x,
                player.y,
                5,
                "#55ffcc"
            );

            if(!o.hit && o.minGap<14){

                game.nearMisses++;
                game.score+=40;
                game.punch=10;

                sound("near");

                addPopup(player.x,player.y-60,"CLOSE CALL! +40","#ffe600");
                createParticles(player.x,player.y,16,"#ffe600");

                if(game.nearMisses>=5) unlockAchievement("near5");

            }else{

                addPopup(player.x,player.y-40,"+20","#55ffcc");
            }
        }


        if(
            !o.hit &&
            obstacleHit(o)
        ){

            o.hit=true;
            damage();
        }


        if(o.x+o.width<-50)
            obstacles.splice(i,1);
    }
}


/* ============================================================
   INPUT
   ============================================================ */

/* While the login / signup modal is open the game must ignore
   keyboard and canvas input, otherwise typing a password would
   make the ball jump and Escape would fight the modal. */

function authModalOpen(){
    /* covers both the login modal and the profile dashboard */
    return !!document.querySelector(".auth-overlay.open");
}

window.addEventListener("keydown",e=>{

    if(authModalOpen()) return;

    if(
        e.code==="Space" ||
        e.code==="ArrowUp" ||
        e.code==="KeyW"
    ){

        e.preventDefault();

        startMenuMusicOnce();

        if(game.state==="playing")
            jump();

        else if(
            game.state==="menu" ||
            game.state==="gameover"
        )
            startGame();
    }



    if(
        e.code==="ArrowDown" ||
        e.code==="KeyS"
    ){

        e.preventDefault();

        setDuck(true);
    }


    if(e.code==="KeyP" || e.code==="Escape"){

        if(game.state==="playing")
            setPaused(true);

        else if(game.state==="paused")
            setPaused(false);
    }


    if(e.code==="KeyM"){
        toggleSfxMute();
    }

    if(e.code==="KeyN"){
        toggleMusic();
    }
});



window.addEventListener("blur",()=>{
    setDuck(false);
    if(game.state==="playing") setPaused(true);
});



window.addEventListener("keyup",e=>{

    if(
        e.code==="ArrowDown" ||
        e.code==="KeyS"
    )
        setDuck(false);
});


canvas.addEventListener("pointerdown",()=>{

    if(authModalOpen()) return;

    /* first user gesture also unlocks the menu soundtrack, since
       browsers block audio until the player interacts */
    startMenuMusicOnce();

    if(game.state==="playing")
        jump();

    else if(
        game.state==="menu" ||
        game.state==="gameover"
    )
        startGame();
});



const jumpBtn=document.getElementById("jumpBtn");
const duckBtn=document.getElementById("duckBtn");

jumpBtn.addEventListener("pointerdown",e=>{
    e.preventDefault();
    jump();
});

duckBtn.addEventListener("pointerdown",e=>{
    e.preventDefault();
    setDuck(true);
});

duckBtn.addEventListener("pointerup",e=>{
    e.preventDefault();
    setDuck(false);
});

duckBtn.addEventListener("pointercancel",()=>{
    setDuck(false);
});


/* ============================================================
   GAME START / END
   ============================================================ */

function reset(){

    game.score=0;
    game.level=1;
    game.lives=3;

    game.baseSpeed=6;
    game.speed=6;

    game.combo=0;
    game.comboTimer=0;

    game.distance=0;
    game.levelDistance=0;

    game.shake=0;
    game.flash=0;
    game.frame=0;
    game.levelBanner=0;
    game.boostTimer=0;
    game.slowmoTimer=0;
    game.magnetTimer=0;

    game.milestone=0;
    game.milestoneBanner=0;
    game.milestoneValue=0;

    game.punch=0;

    game.coinsCollected=0;
    game.obstaclesDodged=0;
    game.maxCombo=0;
    game.nearMisses=0;

    hintBox.classList.remove("show");

    player.x=PLAYER_X;
    player.y=GROUND-player.radius;
    player.vy=0;
    player.grounded=true;
    player.ducking=false;
    player.jumps=0;
    player.invincible=0;
    player.shield=0;
    player.rotation=0;
    player.squash=1;
    player.squashVel=0;
    player.visualRadius=player.radius;
    player.trail=[];

    obstacles=[];
    particles=[];
    coins=[];
    powerups=[];
    popups=[];

    obstacleTimer=80;
    coinTimer=100;
    powerTimer=300;

    createBackground();
}


function startGame(){

    initAudio();
    if(AUDIO_AVAILABLE) GameAudio.resume();

    reset();

    game.state="ready";
    game.countdownFrames=180;

    /* kick off the adaptive gameplay soundtrack */
    updateMusicForState();
}


function endGame(){

    game.state="gameover";

    /* dramatic descending game-over sting (also stops the music) */
    if(AUDIO_AVAILABLE && !game.muted) GameAudio.sfx("gameover");
    updateMusicForState();

    if(game.score>game.highScore){

        game.highScore=Math.floor(game.score);

        localStorage.setItem(
            "ballRunnerHighScore",
            game.highScore
        );
    }

    /* cloud save: fire-and-forget, never blocks the game over screen */
    if(window.GameAuth && window.GameAuth.getUser())
        window.GameAuth.pushProgress();
}



/* ============================================================
   HUD
   ============================================================ */

function drawHUD(){

    if(
        game.state==="menu" ||
        game.state==="gameover" ||
        game.state==="paused" ||
        game.state==="ready"
    )
        return;


    ctx.save();

    /* Canvas text state is global, and drawPopups() leaves textAlign on
       "center" - which used to push the SCORE / BEST readouts halfway off
       the left edge. Reset both text properties explicitly. */

    ctx.textAlign="left";
    ctx.textBaseline="alphabetic";
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;

    /* score */

    ctx.fillStyle="#ffffff";
    ctx.font="bold 22px Arial";

    ctx.fillText(
        "SCORE  "+Math.floor(game.score),
        25,
        38
    );


    /* high score */

    ctx.font="13px Arial";
    ctx.fillStyle="#8ca6c9";

    ctx.fillText(
        "BEST  "+game.highScore,
        27,
        58
    );


    /* level */

    ctx.font="bold 18px Arial";
    ctx.fillStyle="#00ffff";

    ctx.textAlign="center";

    ctx.fillText(
        "LEVEL "+game.level,
        W/2,
        34
    );


    /* combo */

    if(game.combo>1){

        const heat=
            game.combo>=15 ? "#ff3d6a" :
            game.combo>=8  ? "#ff8a00" :
            "#ffd84a";

        ctx.fillStyle=heat;
        ctx.font="bold 18px Arial";

        ctx.fillText(
            "COMBO x"+game.combo+(game.combo>=8?" \ud83d\udd25":""),
            W/2,
            59
        );
    }


    /* lives */

    ctx.textAlign="right";

    ctx.font="22px Arial";

    let hearts="";

    for(let i=0;i<3;i++)
        hearts+=i<game.lives?"♥ ":"♡ ";

    ctx.fillStyle="#ff4770";

    ctx.fillText(
        hearts,
        W-25,
        38
    );


    /* level progress */

    const progress=
        Math.min(
            1,
            game.levelDistance/
            (1200+game.level*450)
        );

    ctx.fillStyle="rgba(255,255,255,.12)";
    ctx.fillRect(
        W/2-130,
        70,
        260,
        5
    );

    ctx.fillStyle="#00ffff";

    ctx.fillRect(
        W/2-130,
        70,
        260*progress,
        5
    );

    ctx.textAlign="left";
    ctx.font="bold 14px Arial";

    let statusY=86;

    if(game.boostTimer>0){
        ctx.fillStyle="#ffe600";
        ctx.fillText(`⚡ BOOST ${Math.ceil(game.boostTimer/60)}s`,25,statusY);
        statusY+=20;
    }

    if(game.slowmoTimer>0){
        ctx.fillStyle="#7dfcff";
        ctx.fillText(`🕒 SLOW-MO ${Math.ceil(game.slowmoTimer/60)}s`,25,statusY);
        statusY+=20;
    }

    if(game.magnetTimer>0){
        ctx.fillStyle="#ff66c4";
        ctx.fillText(`🧲 MAGNET ${Math.ceil(game.magnetTimer/60)}s`,25,statusY);
        statusY+=20;
    }

    if(game.levelBanner>0){
        const life=game.levelBanner/150;
        const scale=1+(1-life)*.25;
        ctx.save();
        ctx.translate(W/2,H*.34);
        ctx.scale(scale,scale);
        ctx.globalAlpha=Math.min(1,life*3);
        ctx.textAlign="center";
        ctx.shadowColor="#00ffff";
        ctx.shadowBlur=28;
        ctx.fillStyle="#ffffff";
        ctx.font="900 42px Arial";
        ctx.fillText(`LEVEL ${game.level}`,0,0);
        ctx.fillStyle="#55ffff";
        ctx.font="bold 16px Arial";
        ctx.fillText("SPEED UP!",0,29);
        ctx.restore();
    }

    if(game.milestoneBanner>0){
        const life=game.milestoneBanner/150;
        const scale=1+(1-life)*.3;
        ctx.save();
        ctx.translate(W/2,H*.55);
        ctx.scale(scale,scale);
        ctx.globalAlpha=Math.min(1,life*3);
        ctx.textAlign="center";
        ctx.shadowColor="#ffd84a";
        ctx.shadowBlur=30;
        ctx.fillStyle="#ffd84a";
        ctx.font="900 38px Arial";
        ctx.fillText(`\ud83c\udfc6 ${game.milestoneValue} POINTS!`,0,0);
        ctx.restore();
    }


    ctx.restore();
}


/* ============================================================
   COUNTDOWN
   ============================================================ */

function drawCountdown(){

    ctx.fillStyle="rgba(0,0,15,.45)";
    ctx.fillRect(0,0,W,H);

    const cf=game.countdownFrames;
    const stage=cf>0 ? Math.ceil(cf/60) : 0;
    const label=stage>0 ? String(stage) : "GO!";

    const within=cf>0 ? (cf%60||60) : Math.max(0,cf+40);
    const t=1-(within/60);
    const scale=1.5-t*.5;
    const alpha=Math.max(0,Math.min(1,(t+.15)*3));

    ctx.save();
    ctx.translate(W/2,H/2-20);
    ctx.scale(scale,scale);
    ctx.globalAlpha=alpha;
    ctx.textAlign="center";
    ctx.shadowColor=stage>0 ? "#00ffff" : "#7dff9d";
    ctx.shadowBlur=35;
    ctx.fillStyle="#ffffff";
    ctx.font="900 110px Arial";
    ctx.fillText(label,0,0);
    ctx.restore();

    ctx.globalAlpha=1;
    ctx.fillStyle="#aeefff";
    ctx.font="bold 20px Arial";
    ctx.textAlign="center";
    ctx.fillText(stage>0?"GET READY...":"GO GO GO!",W/2,H/2+75);
}


/* ============================================================
   MENU
   ============================================================ */

function drawMenu(){

    ctx.fillStyle="rgba(0,0,15,.72)";
    ctx.fillRect(0,0,W,H);


    ctx.textAlign="center";

    ctx.shadowColor="#00ffff";
    ctx.shadowBlur=25;

    ctx.fillStyle="#00ffff";

    ctx.font="900 62px Arial";

    ctx.fillText(
        "BALL RUNNER X",
        W/2,
        175
    );

    ctx.shadowBlur=0;

    ctx.fillStyle="#ffffff";
    ctx.font="20px Arial";

    ctx.fillText(
        "SURVIVE • DODGE • RUN • BEAT YOUR HIGH SCORE",
        W/2,
        215
    );


    /* ball preview */

    ctx.shadowColor="#00ffff";
    ctx.shadowBlur=25;

    const g=ctx.createRadialGradient(
        W/2-12,
        285-12,
        3,
        W/2,
        285,
        35
    );

    g.addColorStop(0,"#ffffff");
    g.addColorStop(.4,"#00ffff");
    g.addColorStop(1,"#0060aa");

    ctx.fillStyle=g;

    ctx.beginPath();
    ctx.arc(W/2,285,35,0,Math.PI*2);
    ctx.fill();

    ctx.shadowBlur=0;


    ctx.fillStyle="#00ffff";
    ctx.font="bold 23px Arial";

    ctx.fillText(
        "PRESS SPACE / CLICK TO START",
        W/2,
        365
    );


    ctx.fillStyle="#aab8d8";
    ctx.font="15px Arial";

    ctx.fillText(
        "SPACE / ↑ = JUMP    ↓ = DUCK    P = PAUSE    M = SFX    N = MUSIC",

        W/2,
        400
    );


    ctx.fillStyle="#ffd84a";
    ctx.font="bold 16px Arial";

    ctx.fillText(
        "BEST SCORE: "+game.highScore,
        W/2,
        440
    );
}


/* ============================================================
   GAME OVER
   ============================================================ */

function drawGameOver(){

    ctx.fillStyle="rgba(0,0,12,.82)";
    ctx.fillRect(0,0,W,H);

    ctx.textAlign="center";

    const rank=getRank(Math.floor(game.score));

    ctx.fillStyle="#ff4770";
    ctx.font="900 44px Arial";

    ctx.shadowColor="#ff3355";
    ctx.shadowBlur=20;

    ctx.fillText(
        "GAME OVER",
        W/2,
        78
    );

    ctx.shadowBlur=0;

    /* rank badge */

    ctx.save();

    ctx.shadowColor=rank.color;
    ctx.shadowBlur=28;
    ctx.strokeStyle=rank.color;
    ctx.lineWidth=4;

    ctx.beginPath();
    ctx.arc(W/2,140,34,0,Math.PI*2);
    ctx.stroke();

    ctx.fillStyle=rank.color;
    ctx.font="900 34px Arial";
    ctx.fillText(rank.label,W/2,152);

    ctx.restore();

    ctx.fillStyle="#ffffff";
    ctx.font="bold 27px Arial";

    ctx.fillText(
        "SCORE  "+Math.floor(game.score),
        W/2,
        205
    );

    ctx.fillStyle="#ffd84a";
    ctx.font="bold 15px Arial";

    ctx.fillText(
        "BEST  "+game.highScore,
        W/2,
        228
    );

    /* run stats */

    ctx.font="15px Arial";
    ctx.fillStyle="#aeefff";

    ctx.fillText("\ud83e\ude99 Coins  "+game.coinsCollected, W/2-140, 268);
    ctx.fillText("\ud83d\udd25 Best Combo  x"+game.maxCombo, W/2+140, 268);
    ctx.fillText("\ud83d\udee1 Dodged  "+game.obstaclesDodged, W/2-140, 296);
    ctx.fillText("\u26a1 Close Calls  "+game.nearMisses, W/2+140, 296);

    ctx.fillStyle="#00ffff";
    ctx.font="bold 21px Arial";

    ctx.fillText(
        "PRESS SPACE OR CLICK TO PLAY AGAIN",
        W/2,
        355
    );

    ctx.fillStyle="#7d8bb0";
    ctx.font="13px Arial";

    ctx.fillText(
        "Beat your combo. Chase the next rank.",
        W/2,
        380
    );
}


/* ============================================================
   PAUSE
   ============================================================ */

function drawPause(){

    ctx.fillStyle="rgba(0,0,15,.6)";
    ctx.fillRect(0,0,W,H);

    ctx.textAlign="center";

    ctx.fillStyle="#00ffff";
    ctx.font="900 55px Arial";

    ctx.fillText(
        "PAUSED",
        W/2,
        230
    );

    ctx.fillStyle="#ffffff";
    ctx.font="18px Arial";

    ctx.fillText(
        "Press P or ESC to continue",
        W/2,
        270
    );
}


/* ============================================================
   MAIN UPDATE
   ============================================================ */

function update(){

    if(game.state==="ready"){

        updateBackground();

        const prevStage=game.countdownFrames>0
            ? Math.ceil(game.countdownFrames/60) : 0;

        game.countdownFrames--;

        const newStage=game.countdownFrames>0
            ? Math.ceil(game.countdownFrames/60) : 0;

        if(newStage!==prevStage){

            if(newStage>0) sound("tick");
            else sound("go");
        }

        if(game.countdownFrames<=-40)
            game.state="playing";

        return;
    }


    if(game.state!=="playing")
        return;


    game.frame++;
    updateBackground();

    if(game.levelBanner>0) game.levelBanner--;
    if(game.milestoneBanner>0) game.milestoneBanner--;

    if(game.punch>0){
        game.punch*=.85;
        if(game.punch<.3) game.punch=0;
    }

    if(game.boostTimer>0){
        game.boostTimer--;
        if(game.boostTimer===0) recalcSpeed();
    }

    if(game.slowmoTimer>0){
        game.slowmoTimer--;
        if(game.slowmoTimer===0){
            recalcSpeed();
            if(AUDIO_AVAILABLE) GameAudio.setSlowmo(false);
        }
    }


    if(game.magnetTimer>0)
        game.magnetTimer--;


    /* increasing difficulty */

    updateScore();
    updateLevel();


    /* player */

    updatePlayer();


    /* obstacles */

    updateObstacles();


    /* coins */

    coinTimer--;

    if(coinTimer<=0){

        spawnCoin();

        coinTimer=
            90+
            Math.random()*130;
    }

    updateCoins();


    /* power ups */

    powerTimer--;

    if(powerTimer<=0){

        spawnPower();

        powerTimer=420+Math.random()*260;
    }

    updatePowerups();


    /* particles */

    updateParticles();
    updatePopups();


    /* warnings */

    updateWarnings();


    /* shake */

    if(game.shake>0)
        game.shake*=.88;

    if(game.shake<.2)
        game.shake=0;


    if(game.flash>0)
        game.flash--;
}


/* ============================================================
   DRAW
   ============================================================ */

function draw(){

    ctx.setTransform(dpr,0,0,dpr,0,0);

    ctx.clearRect(0,0,W,H);


    ctx.save();


    /* screen shake */

    if(game.shake){

        ctx.translate(
            (Math.random()-.5)*game.shake,
            (Math.random()-.5)*game.shake
        );
    }


    /* punch zoom (near misses / milestones) */

    if(game.punch>0){

        const s=1+game.punch*.004;

        ctx.translate(W/2,H/2);
        ctx.scale(s,s);
        ctx.translate(-W/2,-H/2);
    }


    drawBackground();


    drawCoins();


    drawPowerups();


    for(const o of obstacles)
        drawObstacle(o);


    drawParticles();


    drawPlayer();


    drawPopups();


    ctx.restore();


    drawHUD();


    if(game.state==="menu")
        drawMenu();

    if(game.state==="ready")
        drawCountdown();

    if(game.state==="gameover")
        drawGameOver();

    if(game.state==="paused")
        drawPause();


    /* damage flash */

    if(game.flash){

        ctx.fillStyle=
            `rgba(255,40,60,${game.flash/35})`;

        ctx.fillRect(0,0,W,H);
    }
}


/* ============================================================
   GAME LOOP
   ============================================================ */

const FIXED_STEP=1000/60;
let last=performance.now();
let accumulator=0;

function loop(now){
    const elapsed=Math.min(100,now-last);
    last=now;
    accumulator+=elapsed;

    while(accumulator>=FIXED_STEP){
        update();
        accumulator-=FIXED_STEP;
    }

    draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);


/* ============================================================
   INITIAL STATE
   ============================================================ */

game.state="menu";
