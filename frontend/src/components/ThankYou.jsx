import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

const ThankYou = () => {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', width: '100%', position: 'relative', zIndex: 10,
            padding: '32px', textAlign: 'center', overflow: 'hidden',
        }}>
            <style>{`
                @keyframes ty-fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes ty-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes ty-pulse-ring { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.4); opacity: 0; } }
                @keyframes ty-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                @keyframes ty-heart { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
            `}</style>

            {/* Pulsing rings behind icon */}
            <div style={{ position: 'relative', marginBottom: '40px', animation: 'ty-fadeUp 0.8s ease-out both' }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        position: 'absolute',
                        inset: `${-20 - i * 22}px`,
                        borderRadius: '50%',
                        border: `1.5px solid rgba(139,92,246,${0.2 - i * 0.05})`,
                        animation: `ty-pulse-ring ${2.5 + i * 0.5}s ease-out infinite`,
                        animationDelay: `${i * 0.4}s`
                    }} />
                ))}
                <div style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 0 60px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                    animation: 'ty-float 3s ease-in-out infinite'
                }}>
                    <Heart size={40} style={{
                        color: '#c4b5fd',
                        filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.6))',
                        animation: 'ty-heart 2s ease-in-out infinite'
                    }} />
                </div>
            </div>

            {/* Thank you text */}
            <h1 style={{
                fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: '12px',
                animation: 'ty-fadeUp 0.8s ease-out 0.15s both'
            }}>
                Thank You!
            </h1>

            <p style={{
                color: 'rgba(196,181,253,0.8)', fontSize: '1rem', lineHeight: 1.6,
                maxWidth: '320px', marginBottom: '32px',
                animation: 'ty-fadeUp 0.8s ease-out 0.3s both'
            }}>
                Thanks for exploring with Lumira. We hope you enjoyed the experience!
            </p>

            {/* Divider */}
            <div style={{
                width: '80px', height: '2px', marginBottom: '32px',
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)',
                animation: 'ty-fadeUp 0.8s ease-out 0.45s both'
            }} />

            {/* Branding footer */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                animation: 'ty-fadeUp 0.8s ease-out 0.6s both'
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(145deg, rgba(139,92,246,0.25), rgba(99,102,241,0.15))',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.3), -1px -1px 4px rgba(139,92,246,0.04)'
                }}>
                    <Sparkles size={14} style={{ color: '#a78bfa' }} />
                </div>
                <span style={{
                    fontSize: '0.8rem', fontFamily: 'monospace', letterSpacing: '0.15em',
                    color: 'rgba(167,139,250,0.5)'
                }}>POWERED BY LUMIRA</span>
            </div>

            {/* Shimmer tag */}
            <div style={{
                marginTop: '40px', padding: '10px 24px', borderRadius: '9999px',
                fontSize: '0.75rem', fontFamily: 'monospace', letterSpacing: '0.1em',
                color: 'rgba(139,92,246,0.6)',
                border: '1px solid rgba(139,92,246,0.15)',
                background: 'linear-gradient(90deg, rgba(139,92,246,0.04), rgba(99,102,241,0.08), rgba(139,92,246,0.04))',
                backgroundSize: '200% 100%',
                animation: 'ty-shimmer 4s linear infinite, ty-fadeUp 0.8s ease-out 0.75s both'
            }}>
                SESSION_COMPLETE
            </div>
        </div>
    );
};

export default ThankYou;
