import React, { useRef, useEffect, useState } from 'react';
import { Eye, Brain, MessageSquareText, Wifi } from 'lucide-react';

const IntroSection = () => {
    const sectionRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (sectionRef.current) {
                const rect = sectionRef.current.getBoundingClientRect();
                const offset = -rect.top;
                setScrollY(offset);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const parallaxOffset = scrollY * 0.35;

    const features = [
        {
            icon: Eye,
            title: 'Exhibition Guide',
            desc: 'Lumira transforms any exhibit into an interactive experience — visitors scan a QR code and instantly connect with an AI that knows everything about the display.',
            color: '168,85,247',
        },
        {
            icon: Brain,
            title: 'AI-Powered Knowledge',
            desc: 'Upload product documents, and Lumira learns them instantly. It answers visitor questions with depth, context, and accuracy — no training required.',
            color: '139,92,246',
        },
        {
            icon: MessageSquareText,
            title: 'Voice & Text Chat',
            desc: 'Visitors can type or speak naturally. Lumira responds in real-time with streaming text and lifelike voice synthesis — like having a personal guide.',
            color: '99,102,241',
        },
        {
            icon: Wifi,
            title: 'Zero Setup for Visitors',
            desc: 'No app downloads, no sign-ups. Visitors simply scan a QR code from their phone and start asking questions immediately.',
            color: '124,58,237',
        },
    ];

    return (
        <section
            ref={sectionRef}
            style={{
                position: 'relative',
                minHeight: '100vh',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Inline keyframes */}
            <style>{`
                @keyframes intro-fadeUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes intro-line-grow {
                    from { transform: scaleX(0); }
                    to { transform: scaleX(1); }
                }
            `}</style>

            {/* Parallax background image */}
            <div style={{
                position: 'absolute',
                inset: '-20%',
                backgroundImage: 'url(/museum-bg.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `translateY(${parallaxOffset}px)`,
                willChange: 'transform',
                zIndex: 0,
            }} />

            {/* Purple overlay gradient */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(
                    180deg,
                    rgba(15,12,41,0.92) 0%,
                    rgba(30,20,70,0.85) 25%,
                    rgba(20,15,50,0.80) 50%,
                    rgba(30,20,70,0.85) 75%,
                    rgba(15,12,41,0.95) 100%
                )`,
                zIndex: 1,
            }} />

            {/* Decorative ambient orbs */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)',
                    filter: 'blur(60px)', transform: `translateY(${parallaxOffset * 0.2}px)`,
                }} />
                <div style={{
                    position: 'absolute', bottom: '15%', right: '10%', width: '350px', height: '350px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
                    filter: 'blur(70px)', transform: `translateY(${parallaxOffset * -0.15}px)`,
                }} />
            </div>

            {/* Content */}
            <div style={{
                position: 'relative', zIndex: 2,
                maxWidth: '1100px', width: '100%',
                padding: '100px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
                {/* Section badge */}
                <div style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                    transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
                    marginBottom: '20px',
                }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 20px', borderRadius: '9999px',
                        background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                    }}>
                        <Brain style={{ width: '14px', height: '14px', color: '#a78bfa' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            What is Lumira
                        </span>
                    </div>
                </div>

                {/* Main heading */}
                <h2 style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #fff 0%, #e0d4fc 40%, #a78bfa 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: '0 0 16px 0',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                    transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
                }}>
                    Your AI Exhibition<br />Assistant
                </h2>

                {/* Subtitle */}
                <p style={{
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    color: 'rgba(203,213,225,0.75)',
                    textAlign: 'center',
                    maxWidth: '600px',
                    lineHeight: 1.7,
                    margin: '0 0 60px 0',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                    transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s',
                }}>
                    Lumira brings exhibits to life with AI. Scan, ask, and discover — turning every museum visit, expo booth, and gallery into a conversation.
                </p>

                {/* Divider line */}
                <div style={{
                    width: '80px', height: '2px', marginBottom: '60px',
                    background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.3s',
                }} />

                {/* Feature grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px',
                    width: '100%',
                }}>
                    {features.map((feat, i) => (
                        <FeatureCard key={i} {...feat} index={i} visible={isVisible} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const FeatureCard = ({ icon: Icon, title, desc, color, index, visible }) => (
    <div style={{
        padding: '32px 28px',
        borderRadius: '20px',
        background: 'linear-gradient(145deg, rgba(30,27,75,0.6), rgba(15,12,41,0.5))',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.35 + index * 0.12}s`,
        cursor: 'default',
    }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.borderColor = `rgba(${color},0.2)`;
            e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 0 30px rgba(${color},0.08), inset 0 1px 0 rgba(255,255,255,0.06)`;
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.boxShadow = '';
        }}
    >
        <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(145deg, rgba(${color},0.18), rgba(${color},0.08))`,
            border: `1px solid rgba(${color},0.25)`,
            marginBottom: '20px',
        }}>
            <Icon style={{ width: '22px', height: '22px', color: `rgba(${color},1)` }} />
        </div>
        <h3 style={{
            fontSize: '1.05rem', fontWeight: 700,
            color: 'rgba(226,232,240,0.95)',
            marginBottom: '10px', letterSpacing: '-0.01em',
        }}>
            {title}
        </h3>
        <p style={{
            fontSize: '0.85rem', color: 'rgba(148,163,184,0.7)',
            lineHeight: 1.6, margin: 0,
        }}>
            {desc}
        </p>
    </div>
);

export default IntroSection;
