import React, { useEffect, useRef } from 'react';

const CornerLights = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 400);
            g1.addColorStop(0, 'rgba(139, 92, 246, 0.25)'); g1.addColorStop(1, 'transparent');
            ctx.fillStyle = g1; ctx.fillRect(0, 0, 400, 400);
            const g2 = ctx.createRadialGradient(canvas.width, 0, 0, canvas.width, 0, 400);
            g2.addColorStop(0, 'rgba(139, 92, 246, 0.25)'); g2.addColorStop(1, 'transparent');
            ctx.fillStyle = g2; ctx.fillRect(canvas.width - 400, 0, 400, 400);
            if (particles.length < 40) {
                const isLeft = Math.random() > 0.5;
                particles.push({
                    x: isLeft ? Math.random() * 150 : canvas.width - Math.random() * 150,
                    y: -10, v: Math.random() * 1.5 + 0.5, s: Math.random() * 2, o: Math.random()
                });
            }
            particles.forEach((p, i) => {
                p.y += p.v; p.o -= 0.005;
                ctx.fillStyle = `rgba(255,255,255,${p.o})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
                if (p.o <= 0) particles.splice(i, 1);
            });
            requestAnimationFrame(draw);
        };
        const id = requestAnimationFrame(draw);
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(id); };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

export default CornerLights;
