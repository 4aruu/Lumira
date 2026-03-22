import React from 'react';
import { AlertTriangle, QrCode, ArrowLeft } from 'lucide-react';

const DatasetNotFound = ({ projectName, onGoHome }) => {
    const displayName = projectName
        ? projectName.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Unknown';

    return (
        <div className="flex items-center justify-center h-full z-10 relative px-6">
            <div className="relative group max-w-md w-full">
                {/* Glow */}
                <div className="absolute -inset-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-3xl blur-2xl opacity-60" />

                {/* Card */}
                <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl border border-red-500/30 p-10 rounded-3xl text-center shadow-2xl">
                    {/* Icon */}
                    <div style={{
                        width: '80px', height: '80px', margin: '0 auto 24px',
                        borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(239, 68, 68, 0.1)', border: '2px solid rgba(239, 68, 68, 0.25)'
                    }}>
                        <AlertTriangle size={40} style={{ color: '#f87171' }} />
                    </div>

                    {/* Title */}
                    <h2 style={{
                        fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px',
                        background: 'linear-gradient(to right, #fff, #fca5a5)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Dataset Not Found
                    </h2>

                    {/* Project name badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: '12px', marginBottom: '20px',
                        background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontFamily: 'monospace', fontSize: '0.85rem', color: '#fca5a5'
                    }}>
                        <QrCode size={14} />
                        {displayName}
                    </div>

                    {/* Message */}
                    <p style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '8px' }}>
                        The dataset this QR code points to has been <strong style={{ color: '#f87171' }}>deleted</strong> or
                        no longer exists on the server.
                    </p>
                    <p style={{ color: 'rgba(148, 163, 184, 0.5)', fontSize: '0.8rem', marginBottom: '32px' }}>
                        Please contact the exhibitor for an updated QR code.
                    </p>

                    {/* Action */}
                    {onGoHome && (
                        <button
                            onClick={onGoHome}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '12px 28px', borderRadius: '9999px',
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(139,92,246,0.3)',
                                color: '#c4b5fd', fontSize: '0.9rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.25s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(99,102,241,0.25))';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))';
                                e.currentTarget.style.color = '#c4b5fd';
                                e.currentTarget.style.transform = '';
                            }}
                        >
                            <ArrowLeft size={16} />
                            Go to Home Page
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatasetNotFound;
