import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCodeLib from "qrcode";
import { Download } from 'lucide-react';

const AnimatedQR = ({ value, size = 280, productName = '' }) => {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const particlesRef = useRef([]);
    const matrixRef = useRef(null);
    const startTimeRef = useRef(null);
    const [ready, setReady] = useState(false);

    // Derive clean display name from productName or fallback from value
    const displayName = productName
        ? productName.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Lumira AI';

    // Generate QR matrix on mount
    useEffect(() => {
        if (!value) return;
        setReady(false);
        particlesRef.current = [];
        startTimeRef.current = null;

        QRCodeLib.toDataURL(value, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: size,
            color: { dark: '#a78bfa', light: '#00000000' }
        }).then(() => {
            const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
            const modules = qr.modules;
            matrixRef.current = modules;
            initParticles(modules);
            setReady(true);
        }).catch(console.error);
    }, [value, size]);

    const initParticles = useCallback((modules) => {
        const moduleCount = modules.size;
        const margin = 2;
        const totalModules = moduleCount + margin * 2;
        const cellSize = size / totalModules;
        const particles = [];

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (modules.get(row, col)) {
                    const targetX = (col + margin) * cellSize + cellSize / 2;
                    const targetY = (row + margin) * cellSize + cellSize / 2;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = size * 0.6 + Math.random() * size * 0.5;
                    particles.push({
                        x: size / 2 + Math.cos(angle) * dist,
                        y: size / 2 + Math.sin(angle) * dist,
                        targetX,
                        targetY,
                        cellSize,
                        delay: (row / moduleCount) * 0.4 + Math.random() * 0.15,
                        arrived: false,
                        alpha: 0,
                        glowAlpha: 1,
                    });
                }
            }
        }
        particlesRef.current = particles;
    }, [size]);

    // Animation loop
    useEffect(() => {
        if (!ready) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = size * 2;
        canvas.height = size * 2;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.scale(2, 2);

        const ANIM_DURATION = 2.0;
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const animate = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = (timestamp - startTimeRef.current) / 1000;

            ctx.clearRect(0, 0, size, size);

            const particles = particlesRef.current;
            let allArrived = true;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const t = Math.max(0, Math.min(1, (elapsed - p.delay) / (ANIM_DURATION - p.delay)));
                const eased = easeOutCubic(t);

                const cx = p.x + (p.targetX - p.x) * eased;
                const cy = p.y + (p.targetY - p.y) * eased;
                p.alpha = Math.min(1, t * 3);

                if (t < 1) allArrived = false;

                const half = p.cellSize / 2;

                if (t < 0.95) {
                    ctx.save();
                    ctx.shadowColor = '#a78bfa';
                    ctx.shadowBlur = 8 + (1 - t) * 12;
                    ctx.globalAlpha = p.alpha * 0.6;
                    ctx.fillStyle = '#c4b5fd';
                    ctx.beginPath();
                    ctx.arc(cx, cy, half * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                ctx.save();
                ctx.globalAlpha = p.alpha;
                const moduleScale = t < 1 ? 0.4 + eased * 0.6 : 1;
                const drawSize = p.cellSize * moduleScale;
                const r = drawSize * 0.15;

                const grad = ctx.createLinearGradient(cx - half, cy - half, cx + half, cy + half);
                grad.addColorStop(0, '#a78bfa');
                grad.addColorStop(1, '#818cf8');
                ctx.fillStyle = grad;

                const rx = cx - drawSize / 2;
                const ry = cy - drawSize / 2;
                ctx.beginPath();
                ctx.moveTo(rx + r, ry);
                ctx.lineTo(rx + drawSize - r, ry);
                ctx.quadraticCurveTo(rx + drawSize, ry, rx + drawSize, ry + r);
                ctx.lineTo(rx + drawSize, ry + drawSize - r);
                ctx.quadraticCurveTo(rx + drawSize, ry + drawSize, rx + drawSize - r, ry + drawSize);
                ctx.lineTo(rx + r, ry + drawSize);
                ctx.quadraticCurveTo(rx, ry + drawSize, rx, ry + drawSize - r);
                ctx.lineTo(rx, ry + r);
                ctx.quadraticCurveTo(rx, ry, rx + r, ry);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            if (allArrived && elapsed > ANIM_DURATION + 0.5) {
                const pulse = 0.03 * Math.sin((elapsed - ANIM_DURATION) * 2);
                ctx.save();
                ctx.globalAlpha = 0.15 + pulse;
                ctx.shadowColor = '#a78bfa';
                ctx.shadowBlur = 20;
                for (const p of particles) {
                    ctx.fillStyle = '#c4b5fd';
                    ctx.fillRect(p.targetX - p.cellSize / 2, p.targetY - p.cellSize / 2, p.cellSize, p.cellSize);
                }
                ctx.restore();
            }

            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [ready, size]);

    /**
     * Helper: draw rounded rectangle
     */
    const drawRoundedRect = (ctx, x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    /**
     * Export: Renders a branded, presentable QR card suitable for sharing
     */
    const handleExport = useCallback(() => {
        if (!matrixRef.current) return;
        const modules = matrixRef.current;

        // Card dimensions (portrait, like a business card / poster)
        const cardW = 1080;
        const cardH = 1440;
        const qrSize = 560;
        const qrMargin = 2;
        const moduleCount = modules.size;
        const totalModules = moduleCount + qrMargin * 2;
        const cellSize = qrSize / totalModules;

        const offscreen = document.createElement('canvas');
        offscreen.width = cardW;
        offscreen.height = cardH;
        const ctx = offscreen.getContext('2d');

        // ─── Background gradient ───
        const bgGrad = ctx.createLinearGradient(0, 0, cardW, cardH);
        bgGrad.addColorStop(0, '#0c0a1a');
        bgGrad.addColorStop(0.5, '#110f2e');
        bgGrad.addColorStop(1, '#0a0918');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cardW, cardH);

        // ─── Ambient glow effects ───
        ctx.save();
        const glow1 = ctx.createRadialGradient(cardW * 0.3, cardH * 0.2, 0, cardW * 0.3, cardH * 0.2, 400);
        glow1.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
        glow1.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = glow1;
        ctx.fillRect(0, 0, cardW, cardH);

        const glow2 = ctx.createRadialGradient(cardW * 0.7, cardH * 0.8, 0, cardW * 0.7, cardH * 0.8, 400);
        glow2.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
        glow2.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = glow2;
        ctx.fillRect(0, 0, cardW, cardH);
        ctx.restore();

        // ─── Top: "Powered by LUMIRA" badge ───
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '600 16px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.letterSpacing = '6px';
        ctx.fillText('POWERED BY', cardW / 2, 80);
        ctx.font = '700 42px -apple-system, "Segoe UI", sans-serif';
        const lumiraGrad = ctx.createLinearGradient(cardW / 2 - 100, 100, cardW / 2 + 100, 140);
        lumiraGrad.addColorStop(0, '#e0d4fc');
        lumiraGrad.addColorStop(1, '#a78bfa');
        ctx.fillStyle = lumiraGrad;
        ctx.fillText('LUMIRA', cardW / 2, 130);

        // Sparkle icon (simple diamond)
        const sparkleX = cardW / 2 - 82;
        const sparkleY = 108;
        ctx.fillStyle = '#c4b5fd';
        ctx.beginPath();
        ctx.moveTo(sparkleX, sparkleY - 8);
        ctx.lineTo(sparkleX + 5, sparkleY);
        ctx.lineTo(sparkleX, sparkleY + 8);
        ctx.lineTo(sparkleX - 5, sparkleY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ─── Decorative line separator ───
        ctx.save();
        const lineGrad = ctx.createLinearGradient(cardW * 0.2, 0, cardW * 0.8, 0);
        lineGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
        lineGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
        lineGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardW * 0.15, 165);
        ctx.lineTo(cardW * 0.85, 165);
        ctx.stroke();
        ctx.restore();

        // ─── Product Name (large, centered) ───
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '800 52px -apple-system, "Segoe UI", sans-serif';
        const nameGrad = ctx.createLinearGradient(cardW / 2 - 200, 220, cardW / 2 + 200, 260);
        nameGrad.addColorStop(0, '#ffffff');
        nameGrad.addColorStop(1, '#e0d4fc');
        ctx.fillStyle = nameGrad;
        // Wrap long names
        const maxNameWidth = cardW - 120;
        if (ctx.measureText(displayName).width > maxNameWidth) {
            ctx.font = '800 38px -apple-system, "Segoe UI", sans-serif';
        }
        ctx.fillText(displayName, cardW / 2, 240, maxNameWidth);
        ctx.restore();

        // ─── Subtitle ───
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '400 22px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.fillText('Interactive AI Assistant', cardW / 2, 285);
        ctx.restore();

        // ─── QR Code Container (glassmorphic frame) ───
        const qrContainerPad = 40;
        const qrContainerSize = qrSize + qrContainerPad * 2;
        const qrContainerX = (cardW - qrContainerSize) / 2;
        const qrContainerY = 340;

        // Container background
        ctx.save();
        drawRoundedRect(ctx, qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, 28);
        const containerGrad = ctx.createLinearGradient(qrContainerX, qrContainerY, qrContainerX + qrContainerSize, qrContainerY + qrContainerSize);
        containerGrad.addColorStop(0, 'rgba(30, 27, 75, 0.6)');
        containerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.5)');
        ctx.fillStyle = containerGrad;
        ctx.fill();

        // Container border
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner subtle glow
        const innerGlow = ctx.createRadialGradient(cardW / 2, qrContainerY + qrContainerSize / 2, 0, cardW / 2, qrContainerY + qrContainerSize / 2, qrContainerSize / 2);
        innerGlow.addColorStop(0, 'rgba(139, 92, 246, 0.06)');
        innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = innerGlow;
        ctx.fill();
        ctx.restore();

        // ─── Draw QR modules ───
        const qrOriginX = (cardW - qrSize) / 2;
        const qrOriginY = qrContainerY + qrContainerPad;

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (modules.get(row, col)) {
                    const x = qrOriginX + (col + qrMargin) * cellSize;
                    const y = qrOriginY + (row + qrMargin) * cellSize;
                    const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
                    grad.addColorStop(0, '#a78bfa');
                    grad.addColorStop(1, '#818cf8');
                    ctx.fillStyle = grad;
                    const r = cellSize * 0.15;
                    drawRoundedRect(ctx, x, y, cellSize, cellSize, r);
                    ctx.fill();
                }
            }
        }

        // ─── "SCAN TO CONNECT" CTA ───
        const ctaY = qrContainerY + qrContainerSize + 50;
        ctx.save();
        ctx.textAlign = 'center';

        // CTA pill background
        const pillW = 340;
        const pillH = 56;
        const pillX = (cardW - pillW) / 2;
        const pillY = ctaY;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 28);
        const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
        pillGrad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        pillGrad.addColorStop(1, 'rgba(99, 102, 241, 0.15)');
        ctx.fillStyle = pillGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // CTA text
        ctx.font = '700 18px -apple-system, "Segoe UI", monospace';
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText('📱  SCAN TO CONNECT', cardW / 2, ctaY + 35);
        ctx.restore();

        // ─── Instructions ───
        const instrY = ctaY + pillH + 50;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '400 20px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('Point your phone camera at the QR code', cardW / 2, instrY);
        ctx.fillText('to start an interactive conversation', cardW / 2, instrY + 30);
        ctx.restore();

        // ─── Bottom branding bar ───
        ctx.save();
        const barY = cardH - 80;
        const barGrad = ctx.createLinearGradient(cardW * 0.15, 0, cardW * 0.85, 0);
        barGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
        barGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
        barGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.strokeStyle = barGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardW * 0.15, barY);
        ctx.lineTo(cardW * 0.85, barY);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '500 14px -apple-system, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.fillText('lumira.ai  •  AI-Powered Knowledge Assistant', cardW / 2, barY + 35);
        ctx.restore();

        // ─── Download ───
        const link = document.createElement('a');
        const safeName = displayName.replace(/\s+/g, '-');
        link.download = `Lumira-QR-${safeName}.png`;
        link.href = offscreen.toDataURL('image/png');
        link.click();
    }, [displayName]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
                padding: '16px',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: '20px',
                boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <canvas ref={canvasRef} style={{ display: 'block' }} />
            </div>
            <button
                onClick={handleExport}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 24px', borderRadius: '9999px',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#c4b5fd', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    boxShadow: '0 4px 16px rgba(139,92,246,0.15)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(99,102,241,0.25))'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,92,246,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,92,246,0.15)'; }}
            >
                <Download size={16} />
                Download QR Card
            </button>
        </div>
    );
};

export default AnimatedQR;
