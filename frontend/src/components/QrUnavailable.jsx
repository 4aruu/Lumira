import React from 'react';
import { ShieldOff, QrCode, Sparkles } from 'lucide-react';

const QrUnavailable = ({ projectName, reason }) => {
    const displayName = projectName
        ? projectName.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Unknown';

    const isDestroyed = reason === 'destroyed';

    return (
        <div className="flex items-center justify-center h-full z-10 relative px-6"
             style={{ animation: 'qru-fadeUp 0.6s ease-out both' }}>
            <style>{`
                @keyframes qru-fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
                @keyframes qru-pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
                @keyframes qru-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
            `}</style>

            <div className="relative group max-w-md w-full">
                {/* Glow */}
                <div className="absolute -inset-2 bg-gradient-to-r from-amber-600/15 to-orange-600/15 rounded-3xl blur-2xl opacity-60" />

                {/* Card */}
                <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl border border-amber-500/20 p-10 rounded-3xl text-center shadow-2xl">
                    {/* Icon */}
                    <div style={{
                        width: '80px', height: '80px', margin: '0 auto 24px',
                        borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDestroyed ? 'rgba(148,163,184,0.08)' : 'rgba(251,191,36,0.08)',
                        border: `2px solid ${isDestroyed ? 'rgba(148,163,184,0.2)' : 'rgba(251,191,36,0.2)'}`,
                        animation: 'qru-float 3s ease-in-out infinite'
                    }}>
                        <ShieldOff size={38} style={{
                            color: isDestroyed ? '#94a3b8' : '#fbbf24',
                            filter: `drop-shadow(0 0 10px ${isDestroyed ? 'rgba(148,163,184,0.3)' : 'rgba(251,191,36,0.3)'})`
                        }} />
                    </div>

                    {/* Title */}
                    <h2 style={{
                        fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px',
                        background: isDestroyed
                            ? 'linear-gradient(to right, #fff, #94a3b8)'
                            : 'linear-gradient(to right, #fff, #fbbf24)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        {isDestroyed ? 'QR Code Expired' : 'Project Unavailable'}
                    </h2>

                    {/* Project name badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: '12px', marginBottom: '20px',
                        background: isDestroyed ? 'rgba(148,163,184,0.06)' : 'rgba(251,191,36,0.06)',
                        border: `1px solid ${isDestroyed ? 'rgba(148,163,184,0.15)' : 'rgba(251,191,36,0.15)'}`,
                        fontFamily: 'monospace', fontSize: '0.85rem',
                        color: isDestroyed ? '#94a3b8' : '#fbbf24'
                    }}>
                        <QrCode size={14} />
                        {displayName}
                    </div>

                    {/* Message */}
                    <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '8px' }}>
                        {isDestroyed ? (
                            <>This QR code has been <strong style={{ color: '#94a3b8' }}>permanently retired</strong> by the exhibitor. It is no longer valid.</>
                        ) : (
                            <>This project is currently <strong style={{ color: '#fbbf24' }}>not active</strong>. The exhibitor has not yet enabled access.</>
                        )}
                    </p>
                    <p style={{ color: 'rgba(148,163,184,0.45)', fontSize: '0.8rem', marginBottom: '32px' }}>
                        {isDestroyed
                            ? 'This event has ended. Thank you for visiting.'
                            : 'Please check back later or contact the exhibitor.'
                        }
                    </p>

                    {/* Branding */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        animation: 'qru-pulse 3s ease-in-out infinite'
                    }}>
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(145deg, rgba(139,92,246,0.2), rgba(99,102,241,0.12))',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <Sparkles size={11} style={{ color: '#a78bfa' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'rgba(167,139,250,0.4)', letterSpacing: '0.12em' }}>
                            LUMIRA
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QrUnavailable;
