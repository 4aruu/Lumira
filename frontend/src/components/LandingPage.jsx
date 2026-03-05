import React from 'react';
import { Zap, Shield, Mic, Sparkles, ChevronDown } from 'lucide-react';
import CornerLights from './CornerLights';
import PhoneDemo from './PhoneDemo';
import IntroSection from './IntroSection';

const LandingPage = ({ onNavigate }) => (
    <div className="flex flex-col relative z-10">
        {/* ── Hero Section ── */}
        <div className="flex flex-col min-h-screen items-center justify-center p-6 relative overflow-hidden">
            {/* Inline keyframes for landing animations */}
            <style>{`
    @keyframes land-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
    @keyframes land-orb1 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.15)} 66%{transform:translate(-30px,30px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
    @keyframes land-orb2 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,50px) scale(1.1)} 66%{transform:translate(40px,-20px) scale(0.85)} 100%{transform:translate(0,0) scale(1)} }
    @keyframes land-orb3 { 0%{transform:translate(0,0) scale(0.9)} 50%{transform:translate(30px,30px) scale(1.1)} 100%{transform:translate(0,0) scale(0.9)} }
    @keyframes land-fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
    @keyframes land-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes land-glow-pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
    @keyframes land-ring { 0%{transform:scale(0.8);opacity:0.6} 100%{transform:scale(1.6);opacity:0} }
    .land-float { animation: land-float 6s ease-in-out infinite; }
    .land-fadeUp { animation: land-fadeUp 0.8s ease-out both; }
  `}</style>

            {/* Ambient gradient orbs — slow-moving, layered depth */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div style={{ position: 'absolute', top: '-8%', left: '-5%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.3),transparent 70%)', filter: 'blur(80px)', animation: 'land-orb1 18s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '-10%', right: '-8%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.25),transparent 70%)', filter: 'blur(90px)', animation: 'land-orb2 22s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: '40%', left: '50%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,0.15),transparent 70%)', filter: 'blur(70px)', animation: 'land-orb3 15s ease-in-out infinite', transform: 'translateX(-50%)' }} />
            </div>

            <CornerLights />

            {/* ── Hero content ── */}
            <div className="z-10 text-center flex flex-col items-center w-full max-w-3xl">

                {/* Claymorphism logo card */}
                <div className="land-fadeUp land-float relative group mb-10" style={{ animationDelay: '0.1s' }}>
                    {/* Soft clay shadow */}
                    <div style={{ position: 'absolute', inset: '-12px', borderRadius: '2.5rem', background: 'linear-gradient(145deg,rgba(139,92,246,0.2),rgba(99,102,241,0.15))', filter: 'blur(30px)', animation: 'land-glow-pulse 4s ease-in-out infinite' }} />
                    {/* Ping ring */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '2rem', border: '2px solid rgba(139,92,246,0.25)', animation: 'land-ring 3s ease-out infinite' }} />
                    {/* Clay card */}
                    <div style={{
                        position: 'relative', width: '120px', height: '120px', borderRadius: '2rem',
                        background: 'linear-gradient(145deg,rgba(30,27,75,0.9),rgba(15,23,42,0.85))',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '12px 12px 28px rgba(0,0,0,0.5), -6px -6px 20px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.4s cubic-bezier(.34,1.56,.64,1), box-shadow 0.4s ease'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08) rotate(-2deg)'; e.currentTarget.style.boxShadow = '16px 16px 36px rgba(0,0,0,0.5), -8px -8px 24px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.6))' }}>
                            <defs>
                                <linearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#a78bfa" />
                                    <stop offset="50%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                                <linearGradient id="logoGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#c4b5fd" />
                                    <stop offset="100%" stopColor="#7c3aed" />
                                </linearGradient>
                                <filter id="logoGlow">
                                    <feGaussianBlur stdDeviation="2" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>
                            {/* Main L shape */}
                            <path d="M16 8 L16 52 L56 52 L56 44 L24 44 L24 8 Z" fill="url(#logoGrad1)" filter="url(#logoGlow)" />
                            {/* Accent shard top-right */}
                            <path d="M32 8 L56 8 L56 16 L40 16 L40 32 L32 32 Z" fill="url(#logoGrad2)" opacity="0.85" />
                            {/* Small diamond accent */}
                            <rect x="48" y="20" width="10" height="10" rx="2" transform="rotate(45 53 25)" fill="#a78bfa" opacity="0.6" />
                            {/* Subtle inner highlight */}
                            <path d="M18 10 L18 50 L54 50 L54 46 L22 46 L22 10 Z" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                        </svg>
                    </div>
                </div>

                {/* Title with shimmer gradient */}
                <div className="land-fadeUp" style={{ animationDelay: '0.3s' }}>
                    <h1 style={{
                        fontSize: 'clamp(3rem,8vw,5.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
                        background: 'linear-gradient(90deg,#fff 0%,#c4b5fd 25%,#818cf8 50%,#c4b5fd 75%,#fff 100%)',
                        backgroundSize: '400% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        animation: 'land-shimmer 6s linear infinite', marginBottom: '0'
                    }}>
                        LUMIRA
                    </h1>
                    {/* Subtle glow */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 blur-xl -z-10"></div>
                </div>

                {/* Tagline — glassmorphic pill */}
                <div className="land-fadeUp" style={{ animationDelay: '0.5s', marginTop: '1.25rem', marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 28px', borderRadius: '9999px',
                        background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                    }}>
                        <Sparkles style={{ width: '16px', height: '16px', color: '#a78bfa' }} />
                        <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'rgba(203,213,225,0.9)', letterSpacing: '0.06em' }}>
                            AI Exhibition Assistant
                        </span>
                    </div>
                </div>

                {/* Feature chips — claymorphism cards */}
                <div className="land-fadeUp" style={{ animationDelay: '0.65s', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '3rem' }}>
                    {[
                        { icon: Zap, label: 'Instant Answers', color: '168,85,247' },
                        { icon: Shield, label: 'Secure Access', color: '99,102,241' },
                        { icon: Mic, label: 'Voice Enabled', color: '139,92,246' },
                    ].map(({ icon: FIcon, label, color }, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '14px 22px', borderRadius: '1.25rem',
                            background: 'linear-gradient(145deg, rgba(30,27,75,0.7), rgba(15,23,42,0.6))',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: `8px 8px 20px rgba(0,0,0,0.35), -4px -4px 12px rgba(${color},0.06), inset 0 1px 0 rgba(255,255,255,0.05)`,
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'default'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `10px 14px 28px rgba(0,0,0,0.4), -4px -4px 16px rgba(${color},0.1), inset 0 1px 0 rgba(255,255,255,0.08)`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        >
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `rgba(${color},0.12)`, border: `1px solid rgba(${color},0.2)`
                            }}>
                                <FIcon style={{ width: '18px', height: '18px', color: `rgba(${color},1)` }} />
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(226,232,240,0.9)' }}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* CTA — glassmorphic button with glow */}
                <div className="land-fadeUp" style={{ animationDelay: '0.85s', position: 'relative' }}>
                    {/* Glow behind button */}
                    <div style={{ position: 'absolute', inset: '-4px', borderRadius: '9999px', background: 'linear-gradient(135deg,rgba(139,92,246,0.35),rgba(99,102,241,0.35))', filter: 'blur(20px)', animation: 'land-glow-pulse 3s ease-in-out infinite', pointerEvents: 'none' }} />
                    <button
                        onClick={() => onNavigate('exhibitor-login')}
                        style={{
                            position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '12px',
                            padding: '18px 48px', borderRadius: '9999px', fontSize: '1rem', fontWeight: 600,
                            color: '#fff', cursor: 'pointer',
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                            transition: 'all 0.35s cubic-bezier(.34,1.56,.64,1)',
                            letterSpacing: '0.02em'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                    >
                        <Shield style={{ width: '20px', height: '20px' }} />
                        Exhibitor Portal
                    </button>
                </div>

                {/* Decorative dots */}
                <div className="land-fadeUp" style={{ animationDelay: '1s', display: 'flex', gap: '10px', marginTop: '3rem', opacity: 0.4 }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: 'linear-gradient(135deg,#a78bfa,#818cf8)',
                            animation: `land-glow-pulse ${2.5 + i * 0.5}s ease-in-out infinite`,
                            animationDelay: `${i * 0.4}s`
                        }} />
                    ))}
                </div>

                {/* Scroll-down indicator */}
                <div className="land-fadeUp" style={{ animationDelay: '1.2s', marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={() => {
                        const demo = document.getElementById('phone-demo-section');
                        if (demo) demo.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(167,139,250,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        See Demo
                    </span>
                    <ChevronDown style={{
                        width: '22px', height: '22px', color: 'rgba(167,139,250,0.5)',
                        animation: 'land-float 2s ease-in-out infinite',
                    }} />
                </div>
            </div>
        </div>

        {/* ── Phone Demo Section ── */}
        <div id="phone-demo-section">
            <PhoneDemo />
        </div>

        {/* ── Lumira Intro Section ── */}
        <IntroSection />
    </div>
);

export default LandingPage;
