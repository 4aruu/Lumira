import React, { useRef, useEffect, useState } from 'react';
import { Mic, MessageSquare, QrCode, Zap, Sparkles } from 'lucide-react';

const PhoneDemo = () => {
    const sectionRef = useRef(null);
    const phoneRef = useRef(null);
    const videoRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
                if (videoRef.current) {
                    if (entry.isIntersecting) {
                        videoRef.current.play().catch(() => { });
                    } else {
                        videoRef.current.pause();
                    }
                }
            },
            { threshold: 0.25 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    const features = [
        { icon: Mic, label: 'Voice Powered', desc: 'Ask questions naturally with voice', side: 'left', color: '168,85,247' },
        { icon: MessageSquare, label: 'Real-time Chat', desc: 'Instant AI-powered answers', side: 'left', color: '139,92,246' },
        { icon: QrCode, label: 'QR Scan & Go', desc: 'Scan to connect instantly', side: 'right', color: '99,102,241' },
        { icon: Zap, label: 'Lightning Fast', desc: 'Sub-second response times', side: 'right', color: '124,58,237' },
    ];

    return (
        <section
            ref={sectionRef}
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                padding: '80px 24px',
                overflow: 'hidden',
            }}
        >
            {/* Inline keyframes */}
            <style>{`
                @keyframes phone-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
                @keyframes phone-glow-pulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.04); }
                }
                @keyframes notch-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes feature-line-grow {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
                @keyframes bounce-dot {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.4); opacity: 1; }
                }
            `}</style>

            {/* Section heading */}
            <div
                style={{
                    textAlign: 'center',
                    marginBottom: '60px',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '8px 20px', borderRadius: '9999px', marginBottom: '20px',
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                }}>
                    <Sparkles style={{ width: '14px', height: '14px', color: '#a78bfa' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Live Demo
                    </span>
                </div>
                <h2 style={{
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #818cf8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: '0 0 12px 0',
                }}>
                    See Lumira in Action
                </h2>
                <p style={{
                    fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
                    color: 'rgba(203, 213, 225, 0.7)',
                    maxWidth: '500px',
                    margin: '0 auto',
                    lineHeight: 1.6,
                }}>
                    Your AI exhibition assistant — right in your pocket
                </p>
            </div>

            {/* Phone + features layout */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '40px',
                width: '100%',
                maxWidth: '1000px',
                flexWrap: 'wrap',
            }}>
                {/* Left features */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '28px',
                    flex: '0 1 220px',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateX(0)' : 'translateX(-60px)',
                    transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
                }}>
                    {features.filter(f => f.side === 'left').map((feat, i) => (
                        <FeatureCallout key={i} {...feat} delay={i * 0.15} visible={isVisible} />
                    ))}
                </div>

                {/* Phone mockup */}
                <div
                    ref={phoneRef}
                    style={{
                        position: 'relative',
                        flex: '0 0 auto',
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.92)',
                        transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
                    }}
                >
                    {/* Glow behind phone */}
                    <div style={{
                        position: 'absolute',
                        inset: '-40px',
                        borderRadius: '60px',
                        background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)',
                        filter: 'blur(40px)',
                        animation: 'phone-glow-pulse 4s ease-in-out infinite',
                        pointerEvents: 'none',
                        zIndex: 0,
                    }} />

                    {/* Phone frame */}
                    <div style={{
                        position: 'relative',
                        width: '280px',
                        height: '580px',
                        borderRadius: '44px',
                        background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f1a 100%)',
                        padding: '12px',
                        boxShadow: `
                            0 0 0 1px rgba(255,255,255,0.08),
                            0 25px 60px rgba(0,0,0,0.6),
                            0 8px 24px rgba(0,0,0,0.4),
                            inset 0 1px 0 rgba(255,255,255,0.06),
                            0 0 80px rgba(139,92,246,0.1)
                        `,
                        animation: isVisible ? 'phone-float 6s ease-in-out infinite' : 'none',
                        zIndex: 1,
                    }}>
                        {/* Notch */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '120px',
                            height: '28px',
                            borderRadius: '0 0 18px 18px',
                            background: '#0a0a14',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}>
                            {/* Camera dot */}
                            <div style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, #0a0a14 70%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }} />
                        </div>

                        {/* Screen */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '34px',
                            overflow: 'hidden',
                            background: '#000',
                            position: 'relative',
                        }}>
                            <video
                                ref={videoRef}
                                src="/lumira final.mp4"
                                muted
                                loop
                                autoPlay
                                playsInline
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '34px',
                                }}
                            />
                            {/* Screen glare */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '34px',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)',
                                pointerEvents: 'none',
                            }} />
                        </div>

                        {/* Bottom bar */}
                        <div style={{
                            position: 'absolute',
                            bottom: '18px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '100px',
                            height: '4px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.2)',
                        }} />

                        {/* Side button (power) */}
                        <div style={{
                            position: 'absolute',
                            right: '-2px',
                            top: '120px',
                            width: '3px',
                            height: '50px',
                            borderRadius: '0 3px 3px 0',
                            background: 'linear-gradient(180deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))',
                        }} />
                        {/* Volume buttons */}
                        <div style={{
                            position: 'absolute',
                            left: '-2px',
                            top: '100px',
                            width: '3px',
                            height: '30px',
                            borderRadius: '3px 0 0 3px',
                            background: 'rgba(255,255,255,0.08)',
                        }} />
                        <div style={{
                            position: 'absolute',
                            left: '-2px',
                            top: '145px',
                            width: '3px',
                            height: '30px',
                            borderRadius: '3px 0 0 3px',
                            background: 'rgba(255,255,255,0.08)',
                        }} />
                    </div>
                </div>

                {/* Right features */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '28px',
                    flex: '0 1 220px',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateX(0)' : 'translateX(60px)',
                    transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
                }}>
                    {features.filter(f => f.side === 'right').map((feat, i) => (
                        <FeatureCallout key={i} {...feat} delay={i * 0.15} visible={isVisible} alignRight />
                    ))}
                </div>
            </div>
        </section>
    );
};

const FeatureCallout = ({ icon: Icon, label, desc, color, delay, visible, alignRight }) => (
    <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        flexDirection: alignRight ? 'row-reverse' : 'row',
        textAlign: alignRight ? 'right' : 'left',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.5 + delay}s`,
    }}>
        <div style={{
            flexShrink: 0,
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(145deg, rgba(${color},0.15), rgba(${color},0.08))`,
            border: `1px solid rgba(${color},0.25)`,
            boxShadow: `0 4px 16px rgba(${color},0.1)`,
        }}>
            <Icon style={{ width: '20px', height: '20px', color: `rgba(${color},1)` }} />
        </div>
        <div>
            <div style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'rgba(226,232,240,0.95)',
                marginBottom: '3px',
                letterSpacing: '-0.01em',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: '0.8rem',
                color: 'rgba(148,163,184,0.7)',
                lineHeight: 1.4,
            }}>
                {desc}
            </div>
        </div>
    </div>
);

export default PhoneDemo;
