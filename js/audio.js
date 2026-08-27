"use strict";

/* ============================================================
   BALL RUNNER X — AUDIO ENGINE
   ------------------------------------------------------------
   A self-contained, file-free audio system built entirely on
   the Web Audio API. Provides:

     • A rich library of procedural sound effects
     • An adaptive, layered background-music sequencer that
       reacts to game level, slow-mo and pause
     • Independent mute controls for SFX and Music, persisted
       to localStorage

   The game (game.js) talks to this module through a small,
   stable API:

       GameAudio.init()                  – unlock/create context
       GameAudio.sfx(name, opts)         – play a one-shot effect
       GameAudio.startMusic(mode)        – "menu" | "game"
       GameAudio.stopMusic()
       GameAudio.setIntensity(level)     – adapt music to level
       GameAudio.setSlowmo(bool)         – dreamy filter sweep
       GameAudio.setPaused(bool)         – duck music while paused
       GameAudio.toggleMuteAll()         – returns new muted state
       GameAudio.toggleMusic()           – returns new music state
       GameAudio.isMuted() / isMusicOn()


   Designed to be dropped in before game.js.
   ============================================================ */

const GameAudio = (function(){


    /* ---------- persisted preferences ---------- */

    const LS_MUTED = "ballRunnerMuted";
    const LS_MUSIC = "ballRunnerMusicOn";

    function loadBool(key, def){
        const v = localStorage.getItem(key);
        if(v === null) return def;
        return v === "1";
    }

    let mutedAll = loadBool(LS_MUTED, false);
    let musicOn  = loadBool(LS_MUSIC, true);

    function saveBool(key, val){
        try{ localStorage.setItem(key, val ? "1" : "0"); }catch(e){}
    }


    /* ---------- core nodes ---------- */

    let ctx = null;

    let masterGain = null;    // everything hangs off this
    let sfxGain = null;       // sound-effects bus
    let musicGain = null;     // music bus (pre-filter)
    let musicFilter = null;   // global low-pass for slow-mo/pause
    let musicComp = null;

    let noiseBuffer = null;

    const MASTER_VOL = 0.85;
    const SFX_VOL = 0.9;
    const MUSIC_VOL = 0.55;

    let initialised = false;


    function init(){
        if(initialised) return;

        try{
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }catch(e){
            return; // Web Audio unsupported — fail silently
        }

        masterGain = ctx.createGain();
        masterGain.gain.value = mutedAll ? 0 : MASTER_VOL;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 18;
        comp.ratio.value = 4;
        comp.attack.value = .003;
        comp.release.value = .25;

        masterGain.connect(comp);
        comp.connect(ctx.destination);

        /* SFX bus */
        sfxGain = ctx.createGain();
        sfxGain.gain.value = SFX_VOL;
        sfxGain.connect(masterGain);

        /* Music bus → filter → master.
           The filter lets us muffle music during pause / slow-mo. */
        musicGain = ctx.createGain();
        musicGain.gain.value = musicOn ? MUSIC_VOL : 0;

        musicFilter = ctx.createBiquadFilter();
        musicFilter.type = "lowpass";
        musicFilter.frequency.value = 20000;
        musicFilter.Q.value = 0.6;

        musicComp = ctx.createDynamicsCompressor();
        musicComp.threshold.value = -20;
        musicComp.ratio.value = 3;

        musicGain.connect(musicFilter);
        musicFilter.connect(musicComp);
        musicComp.connect(masterGain);

        /* shared white-noise buffer for percussive / airy effects */
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.0, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for(let i=0;i<data.length;i++) data[i] = Math.random()*2-1;

        initialised = true;
    }

    function resume(){
        if(ctx && ctx.state === "suspended") ctx.resume();
    }

    function now(){ return ctx ? ctx.currentTime : 0; }


    /* ============================================================
       LOW-LEVEL SYNTH HELPERS
       ============================================================ */

    /* A single enveloped oscillator "blip".
       freq can be a number or [startFreq, endFreq] for a sweep. */
    function blip(opts){
        if(!ctx) return;

        const {
            freq = 440,
            to = null,
            type = "sine",
            t = now(),
            dur = 0.2,
            vol = 0.15,
            attack = 0.01,
            release = null,
            bus = sfxGain,
            detune = 0,
            glideType = "exp"
        } = opts;

        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = type;
        osc.detune.value = detune;

        const startF = Array.isArray(freq) ? freq[0] : freq;
        const endF = to !== null ? to : (Array.isArray(freq) ? freq[1] : startF);

        osc.frequency.setValueAtTime(startF, t);
        if(endF !== startF){
            if(glideType === "linear")
                osc.frequency.linearRampToValueAtTime(Math.max(1,endF), t+dur);
            else
                osc.frequency.exponentialRampToValueAtTime(Math.max(1,endF), t+dur);
        }

        const rel = release !== null ? release : dur;

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002,vol), t+attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t+attack+rel);

        osc.connect(g);
        g.connect(bus);

        osc.start(t);
        osc.stop(t + attack + rel + 0.05);

        return {osc, g};
    }

    /* Filtered noise burst — great for hits, whooshes, hats. */
    function noiseBurst(opts){
        if(!ctx || !noiseBuffer) return;

        const {
            t = now(),
            dur = 0.2,
            vol = 0.15,
            type = "lowpass",
            freq = 1200,
            to = 200,
            Q = 0.8,
            bus = sfxGain
        } = opts;

        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.setValueAtTime(freq, t);
        if(to !== freq)
            filter.frequency.exponentialRampToValueAtTime(Math.max(40,to), t+dur);
        filter.Q.value = Q;

        const g = ctx.createGain();
        g.gain.setValueAtTime(Math.max(0.0002,vol), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

        src.connect(filter);
        filter.connect(g);
        g.connect(bus);

        src.start(t);
        src.stop(t+dur+0.05);
    }

    /* Quick FM-ish metallic tone for coins/powerups sparkle. */
    function spark(t, base, bus){
        blip({freq:base, to:base*2.2, type:"triangle", t, dur:0.14, vol:0.10, bus});
        blip({freq:base*2, to:base*3, type:"sine", t:t+0.03, dur:0.12, vol:0.06, bus});
    }


    /* ============================================================
       SOUND EFFECT LIBRARY
       ============================================================ */

    const FX = {

        jump(){
            const t = now();
            blip({freq:240, to:640, type:"sine", t, dur:0.18, vol:0.16});
            blip({freq:480, to:960, type:"triangle", t:t+0.02, dur:0.14, vol:0.05});
            noiseBurst({t, dur:0.10, vol:0.04, freq:1800, to:400});
        },

        double(){
            const t = now();
            blip({freq:420, to:1100, type:"triangle", t, dur:0.22, vol:0.16});
            blip({freq:760, to:1500, type:"sine", t:t+0.04, dur:0.16, vol:0.07});
            spark(t+0.02, 900);
            noiseBurst({t, dur:0.12, vol:0.05, freq:2600, to:600});
        },

        land(){
            const t = now();
            blip({freq:150, to:60, type:"sine", t, dur:0.12, vol:0.10});
            noiseBurst({t, dur:0.10, vol:0.06, freq:700, to:120});
        },

        warning(){
            const t = now();
            blip({freq:780, to:960, type:"square", t, dur:0.08, vol:0.06});
            blip({freq:960, to:760, type:"square", t:t+0.10, dur:0.08, vol:0.05});
        },

        coin(opts){
            const t = now();
            const combo = (opts && opts.combo) || 0;
            const shift = Math.min(combo,20) * 24;   // rising pitch w/ combo
            blip({freq:880+shift, to:1320+shift, type:"sine", t, dur:0.10, vol:0.12});
            blip({freq:1320+shift, to:1760+shift, type:"sine", t:t+0.06, dur:0.12, vol:0.09});
        },

        mega(){
            const t = now();
            [660,880,1100,1320,1760].forEach((f,i)=>
                blip({freq:f, to:f*1.5, type:"triangle", t:t+i*0.05, dur:0.22, vol:0.11}));
            spark(t, 1400);
            noiseBurst({t, dur:0.3, vol:0.05, freq:5000, to:800, type:"bandpass", Q:1.4});
        },

        /* powerups — each has a distinct identity */
        power_shield(){
            const t = now();
            blip({freq:200, to:520, type:"sine", t, dur:0.4, vol:0.13});
            blip({freq:400, to:900, type:"triangle", t:t+0.05, dur:0.35, vol:0.07});
            noiseBurst({t, dur:0.4, vol:0.04, freq:400, to:2400, type:"bandpass", Q:2});
        },
        power_boost(){
            const t = now();
            blip({freq:300, to:1400, type:"sawtooth", t, dur:0.35, vol:0.12});
            noiseBurst({t, dur:0.3, vol:0.08, freq:600, to:5000});
        },
        power_magnet(){
            const t = now();
            blip({freq:500, to:820, type:"sine", t, dur:0.2, vol:0.11});
            blip({freq:820, to:500, type:"sine", t:t+0.18, dur:0.2, vol:0.09});
        },
        power_slowmo(){
            const t = now();
            blip({freq:900, to:300, type:"triangle", t, dur:0.5, vol:0.12});
            blip({freq:600, to:200, type:"sine", t:t+0.05, dur:0.5, vol:0.07});
        },
        /* generic fallback used when a shield blocks a hit */
        power(){
            const t = now();
            blip({freq:330, to:1200, type:"sine", t, dur:0.4, vol:0.12});
            blip({freq:500, to:1800, type:"triangle", t:t+0.08, dur:0.3, vol:0.06});
        },

        hit(){
            const t = now();
            blip({freq:180, to:42, type:"sawtooth", t, dur:0.34, vol:0.2});
            blip({freq:90, to:35, type:"square", t, dur:0.28, vol:0.16});
            noiseBurst({t, dur:0.34, vol:0.16, freq:1400, to:120});
        },

        gameover(){
            const t = now();
            /* descending minor sting */
            [523,415,349,262].forEach((f,i)=>
                blip({freq:f, to:f*0.98, type:"sawtooth", t:t+i*0.16, dur:0.4, vol:0.12}));
            blip({freq:130, to:60, type:"sine", t:t+0.1, dur:1.0, vol:0.1});
            noiseBurst({t, dur:0.5, vol:0.06, freq:800, to:80});
        },

        pass(opts){
            const combo = (opts && opts.combo) || 0;
            const t = now();
            const pitch = 520 + Math.min(combo,20)*22;
            blip({freq:pitch, to:pitch*1.35, type:"sine", t, dur:0.09, vol:0.05});
        },

        near(){
            const t = now();
            blip({freq:700, to:1500, type:"sine", t, dur:0.2, vol:0.13});
            noiseBurst({t, dur:0.24, vol:0.06, freq:3000, to:400, type:"bandpass", Q:1.2});
        },

        combo(opts){
            /* rising whoosh when a combo tier is reached */
            const tier = (opts && opts.tier) || 1;
            const t = now();
            blip({freq:400*tier*0.5+300, to:1600, type:"triangle", t, dur:0.25, vol:0.08});
            noiseBurst({t, dur:0.25, vol:0.05, freq:800, to:6000, type:"bandpass", Q:0.8});
        },

        tick(){
            const t = now();
            blip({freq:880, to:880, type:"sine", t, dur:0.08, vol:0.10});
            blip({freq:1760, to:1760, type:"sine", t, dur:0.05, vol:0.04});
        },

        go(){
            const t = now();
            blip({freq:500, to:1500, type:"triangle", t, dur:0.28, vol:0.18});
            blip({freq:750, to:2250, type:"sine", t:t+0.02, dur:0.24, vol:0.08});
            noiseBurst({t, dur:0.24, vol:0.07, freq:1200, to:6000});
        },

        level(){
            const t = now();
            [440,554,659,880].forEach((f,i)=>
                blip({freq:f, to:f*1.05, type:"triangle", t:t+i*0.09, dur:0.24, vol:0.12}));
            spark(t+0.36, 1200);
        },

        milestone(){
            const t = now();
            [523,659,784,1047,1319].forEach((f,i)=>
                blip({freq:f, to:f*1.02, type:"triangle", t:t+i*0.07, dur:0.22, vol:0.11}));
            spark(t+0.4, 1600);
            noiseBurst({t, dur:0.4, vol:0.04, freq:4000, to:1000, type:"bandpass", Q:1.5});
        },

        achievement(){
            const t = now();
            blip({freq:600, to:900, type:"sine", t, dur:0.13, vol:0.12});
            blip({freq:900, to:1350, type:"sine", t:t+0.1, dur:0.18, vol:0.12});
            spark(t+0.05, 1500);
        },

        ui(){
            const t = now();
            blip({freq:520, to:720, type:"sine", t, dur:0.09, vol:0.08});
        }
    };

    function sfx(name, opts){
        if(mutedAll) return;
        init();
        if(!ctx) return;
        resume();
        const fn = FX[name];
        if(fn) fn(opts);
    }


    /* ============================================================
       ADAPTIVE BACKGROUND MUSIC SEQUENCER
       ------------------------------------------------------------
       A look-ahead scheduler plays a looping chord progression.
       Layers (bass, arp, pad, lead, drums) fade in as intensity
       grows, and tempo rises with the level, so the track feels
       like it's driving faster the deeper you get.
       ============================================================ */

    /* Musical material — an uplifting minor-ish progression that
       loops. Frequencies are in Hz. Two "moods": menu (calm) and
       game (energetic). */

    const NOTE = {
        C2:65.41, D2:73.42, E2:82.41, F2:87.31, G2:98.00, A2:110.00, B2:123.47,
        C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, Bb3:233.08, B3:246.94,
        C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, Bb4:466.16, B4:493.88,
        C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00
    };

    /* Each progression step = one bar: root for bass + a chord for
       arpeggiation. 4 bars that loop. */
    const GAME_PROG = [
        {bass:"A2", chord:["A3","C4","E4","A4"]},
        {bass:"F2", chord:["F3","A3","C4","F4"]},
        {bass:"C3", chord:["C4","E4","G4","C5"]},
        {bass:"G2", chord:["G3","B3","D4","G4"]}
    ];

    const MENU_PROG = [
        {bass:"C3", chord:["C4","E4","G4","B4"]},
        {bass:"A2", chord:["A3","C4","E4","G4"]},
        {bass:"F2", chord:["F3","A3","C4","E4"]},
        {bass:"G2", chord:["G3","B3","D4","F4"]}
    ];

    let musicMode = null;        // "menu" | "game" | null
    let musicPlaying = false;

    let tempo = 112;             // BPM (adapts with level)
    let stepIndex = 0;           // 16th-note counter
    let barIndex = 0;
    let nextNoteTime = 0;
    let schedulerTimer = null;

    let intensity = 0;           // 0..1 derived from level
    let targetIntensity = 0;

    const LOOKAHEAD = 0.1;       // seconds of audio scheduled ahead
    const TIMER_MS = 25;

    function secondsPerStep(){
        // 16th notes → 4 steps per beat
        return (60 / tempo) / 4;
    }

    /* ---- individual voice renderers scheduled at absolute times ---- */

    function playBass(freq, t, dur){
        const g = ctx.createGain();
        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();

        osc.type = "sawtooth";
        sub.type = "sine";
        osc.frequency.value = freq;
        sub.frequency.value = freq/2;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 300 + intensity*500;

        const peak = 0.16;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(g);
        g.connect(musicGain);

        osc.start(t); osc.stop(t+dur+0.05);
        sub.start(t); sub.stop(t+dur+0.05);
    }

    function playArp(freq, t, dur){
        const g = ctx.createGain();
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;

        const vol = 0.06 + intensity*0.05;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t+0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

        osc.connect(g);
        g.connect(musicGain);
        osc.start(t); osc.stop(t+dur+0.03);
    }

    function playLead(freq, t, dur){
        const g = ctx.createGain();
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc.type = "sawtooth";
        osc2.type = "square";
        osc.frequency.value = freq;
        osc2.frequency.value = freq;
        osc2.detune.value = 8;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(2600, t+dur*0.5);
        filter.frequency.linearRampToValueAtTime(900, t+dur);

        const vol = 0.05 + intensity*0.06;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t+0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

        osc.connect(filter); osc2.connect(filter);
        filter.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t+dur+0.03);
        osc2.start(t); osc2.stop(t+dur+0.03);
    }

    function playPad(freqs, t, dur){
        const g = ctx.createGain();
        const vol = 0.02 + intensity*0.03;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t+0.3);
        g.gain.setValueAtTime(vol, t+dur-0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1600;
        filter.connect(g);
        g.connect(musicGain);

        freqs.forEach(f=>{
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = f;
            osc.detune.value = (Math.random()-0.5)*10;
            osc.connect(filter);
            osc.start(t); osc.stop(t+dur+0.05);
        });
    }

    function playKick(t){
        const g = ctx.createGain();
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(45, t+0.12);

        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+0.18);

        osc.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t+0.2);
    }

    function playHat(t, open){
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 7000;

        const g = ctx.createGain();
        const dur = open ? 0.12 : 0.04;
        const vol = (0.03 + intensity*0.04) * (open?1.2:1);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+dur);

        src.connect(filter); filter.connect(g); g.connect(musicGain);
        src.start(t); src.stop(t+dur+0.02);
    }

    function playSnare(t){
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1800;
        filter.Q.value = 0.7;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12 + intensity*0.05, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+0.16);

        src.connect(filter); filter.connect(g); g.connect(musicGain);
        src.start(t); src.stop(t+0.18);
    }

    /* Schedule everything that falls on one 16th-note step. */
    function scheduleStep(step, t){
        const prog = musicMode === "menu" ? MENU_PROG : GAME_PROG;
        const bar = prog[barIndex % prog.length];
        const spb = secondsPerStep();
        const beat = step % 16;   // 16 steps per bar

        const isGame = musicMode === "game";

        /* --- Bass: on beats (every 4 steps) --- */
        if(beat % 4 === 0){
            playBass(NOTE[bar.bass], t, spb*3.6);
        }

        /* --- Pad: sustained, once per bar --- */
        if(beat === 0){
            const chordFreqs = bar.chord.map(n=>NOTE[n]).filter(Boolean);
            playPad(chordFreqs, t, spb*16);
        }

        /* --- Arpeggio: every other 16th once intensity picks up --- */
        if(intensity > 0.12 && beat % 2 === 0){
            const arpNote = bar.chord[(beat/2) % bar.chord.length];
            playArp(NOTE[arpNote], t, spb*1.6);
        }

        /* --- Lead melody: sparse, higher intensity, game mode --- */
        if(isGame && intensity > 0.45 && (beat === 4 || beat === 10 || beat === 14)){
            const idx = (barIndex*3 + beat) % bar.chord.length;
            const leadNote = bar.chord[idx];
            const f = NOTE[leadNote] * 2; // octave up
            playLead(f, t, spb*2.2);
        }

        /* --- Drums --- */
        if(isGame && intensity > 0.05){
            // kick on 1 and 3 (steps 0 and 8), plus extra on high intensity
            if(beat === 0 || beat === 8) playKick(t);
            if(intensity > 0.6 && beat === 14) playKick(t);

            // snare on 2 and 4 (steps 4 and 12)
            if(beat === 4 || beat === 12) playSnare(t);

            // hats — density grows with intensity
            if(intensity > 0.25 && beat % 2 === 0) playHat(t, false);
            if(intensity > 0.7 && beat % 2 === 1) playHat(t, beat===15);
        } else if(musicMode === "menu"){
            // gentle heartbeat kick in the menu
            if(beat === 0) playKick(t);
        }
    }

    function scheduler(){
        if(!musicPlaying || !ctx) return;

        // ease intensity toward target for smooth build-ups
        intensity += (targetIntensity - intensity) * 0.05;

        while(nextNoteTime < ctx.currentTime + LOOKAHEAD){
            scheduleStep(stepIndex, nextNoteTime);

            nextNoteTime += secondsPerStep();
            stepIndex++;

            if(stepIndex % 16 === 0){
                barIndex++;
            }
        }

        schedulerTimer = setTimeout(scheduler, TIMER_MS);
    }

    function startMusic(mode){
        init();
        if(!ctx) return;
        resume();

        if(musicPlaying && musicMode === mode) return;

        stopMusic(); // clean any existing loop

        musicMode = mode;
        musicPlaying = true;

        stepIndex = 0;
        barIndex = 0;
        nextNoteTime = ctx.currentTime + 0.08;

        if(mode === "menu"){
            tempo = 96;
            targetIntensity = 0.28;
            intensity = 0.28;
        }else{
            tempo = 116;
            targetIntensity = 0.35;
            intensity = 0.15;   // start mellow, build up
        }

        scheduler();
    }

    function stopMusic(){
        musicPlaying = false;
        musicMode = null;
        if(schedulerTimer){
            clearTimeout(schedulerTimer);
            schedulerTimer = null;
        }
    }

    /* Map the game level (1..∞) to musical intensity + tempo. */
    function setIntensity(level){
        if(!ctx) return;
        const lvl = Math.max(1, level||1);

        // intensity ramps from ~0.35 up to ~1.0 by level ~9
        targetIntensity = Math.min(1, 0.32 + (lvl-1)*0.09);

        // tempo climbs a little each level, capped so it stays musical
        tempo = Math.min(150, 112 + (lvl-1)*4);
    }

    /* Slow-mo → dreamy muffled, detuned feel. */
    let slowmoOn = false;
    function setSlowmo(on){
        slowmoOn = on;
        if(!ctx || !musicFilter) return;
        const t = ctx.currentTime;
        musicFilter.frequency.cancelScheduledValues(t);
        if(on){
            musicFilter.frequency.setTargetAtTime(700, t, 0.15);
        }else if(!pausedOn){
            musicFilter.frequency.setTargetAtTime(20000, t, 0.2);
        }
    }

    /* Pause → duck + heavily muffle so it reads as "backgrounded". */
    let pausedOn = false;
    function setPaused(on){
        pausedOn = on;
        if(!ctx || !musicGain || !musicFilter) return;
        const t = ctx.currentTime;

        const target = on ? MUSIC_VOL*0.35 : (musicOn ? MUSIC_VOL : 0);
        musicGain.gain.cancelScheduledValues(t);
        musicGain.gain.setTargetAtTime(musicOn ? target : 0, t, 0.1);

        musicFilter.frequency.cancelScheduledValues(t);
        if(on){
            musicFilter.frequency.setTargetAtTime(500, t, 0.1);
        }else{
            musicFilter.frequency.setTargetAtTime(slowmoOn?700:20000, t, 0.2);
        }
    }


    /* ============================================================
       MUTE / MUSIC TOGGLES
       ============================================================ */

    function applyMuteAll(){
        if(!ctx || !masterGain) return;
        const t = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(t);
        masterGain.gain.setTargetAtTime(mutedAll ? 0 : MASTER_VOL, t, 0.02);
    }

    function applyMusicOn(){
        if(!ctx || !musicGain) return;
        const t = ctx.currentTime;
        const base = pausedOn ? MUSIC_VOL*0.35 : MUSIC_VOL;
        musicGain.gain.cancelScheduledValues(t);
        musicGain.gain.setTargetAtTime(musicOn ? base : 0, t, 0.05);
    }

    function toggleMuteAll(){
        mutedAll = !mutedAll;
        saveBool(LS_MUTED, mutedAll);
        init();
        applyMuteAll();
        return mutedAll;
    }

    function setMuteAll(val){
        mutedAll = !!val;
        saveBool(LS_MUTED, mutedAll);
        init();
        applyMuteAll();
        return mutedAll;
    }

    function toggleMusic(){
        musicOn = !musicOn;
        saveBool(LS_MUSIC, musicOn);
        init();
        applyMusicOn();
        return musicOn;
    }

    function setMusic(val){
        musicOn = !!val;
        saveBool(LS_MUSIC, musicOn);
        init();
        applyMusicOn();
        return musicOn;
    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    return {
        init,
        resume,
        sfx,

        startMusic,
        stopMusic,
        setIntensity,
        setSlowmo,
        setPaused,

        toggleMuteAll,
        setMuteAll,
        toggleMusic,
        setMusic,

        isMuted(){ return mutedAll; },
        isMusicOn(){ return musicOn; },
        isReady(){ return initialised; }
    };

})();

/* expose globally for game.js */
window.GameAudio = GameAudio;


