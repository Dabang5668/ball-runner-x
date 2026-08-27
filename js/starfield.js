(function(){
    "use strict";

    const canvas = document.createElement("canvas");
    canvas.id = "starfield";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");

    let stars = [];

    function resize(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        stars = Array.from({length: 150}, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.6 + .3,
            phase: Math.random() * Math.PI * 2
        }));
    }

    window.addEventListener("resize", resize);
    resize();

    let frame = 0;

    function loop(){
        frame++;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for(const s of stars){
            const alpha = .25 + .45 * Math.sin(frame * .02 + s.phase);

            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = "#bfe9ff";

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        requestAnimationFrame(loop);
    }

    loop();
})();
