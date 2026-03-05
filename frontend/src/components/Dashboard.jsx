import React, { useRef } from 'react';
import {
    UploadCloud, FileText, BarChart3,
    QrCode as QrIcon, Sparkles, LogOut, Trash2, RefreshCw, Play,
    Users, MessageSquare, Clock, Activity, X
} from 'lucide-react';
import { CLIENT_URL } from '../config';
import AnimatedQR from './AnimatedQR';

const Dashboard = ({
    files, analyticsData,
    onNavigate, onDeleteFile, onFileSelect,
    onOpenChat, onShowQr, showQrFor, onCloseQr,
    onRefreshAnalytics, onLogout
}) => {
    const fileInputRef = useRef(null);

    return (
        <div className="flex h-full z-10 relative">
            {/* Sidebar with Glass Effect */}
            <div className="w-72 border-r border-white/5 bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-xl hidden md:flex flex-col p-8 shadow-2xl">

                {/* Logo Section */}
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <Sparkles className="text-white" size={20} />
                    </div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-violet-200">LUMIRA</span>
                </div>

                {/* Navigation */}
                <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-300 rounded-2xl border border-violet-500/30 backdrop-blur-sm shadow-lg">
                        <BarChart3 size={22} />
                        <span className="font-semibold">Dashboard</span>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="flex items-center gap-4 text-slate-400 hover:text-white px-5 py-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                >
                    <LogOut size={22} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-10 overflow-y-auto">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <h2 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-violet-200">
                        Knowledge Base
                    </h2>
                    <button
                        onClick={onRefreshAnalytics}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem',
                            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                            color: '#a78bfa', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
                    >
                        <RefreshCw size={14} /> Refresh Stats
                    </button>
                </div>

                {/* ── Analytics Cards ── */}
                {analyticsData && (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            {[
                                { icon: Users, label: 'Total Visitors', value: analyticsData.total_visitors, color: '139,92,246' },
                                { icon: MessageSquare, label: 'Total Messages', value: analyticsData.total_messages, color: '99,102,241' },
                                { icon: Clock, label: 'Avg Session', value: analyticsData.avg_session_duration_sec > 0 ? `${Math.round(analyticsData.avg_session_duration_sec / 60)}m ${analyticsData.avg_session_duration_sec % 60}s` : '—', color: '168,85,247' },
                                { icon: Activity, label: 'Msgs / Session', value: analyticsData.avg_messages_per_session || '—', color: '129,140,248' },
                            ].map(({ icon: StatIcon, label, value, color }, i) => (
                                <div key={i} style={{
                                    position: 'relative', padding: '20px 24px', borderRadius: '20px',
                                    background: 'linear-gradient(145deg, rgba(30,27,75,0.7), rgba(15,23,42,0.6))',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: `8px 8px 20px rgba(0,0,0,0.3), -4px -4px 12px rgba(${color},0.04), inset 0 1px 0 rgba(255,255,255,0.05)`,
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `10px 14px 28px rgba(0,0,0,0.35), -4px -4px 16px rgba(${color},0.08)`; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: `rgba(${color},0.12)`, border: `1px solid rgba(${color},0.2)`
                                        }}>
                                            <StatIcon size={20} style={{ color: `rgba(${color},1)` }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: 'rgba(148,163,184,0.8)', fontWeight: 500 }}>{label}</span>
                                    </div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                                        {value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Peak Hours Chart */}
                        {analyticsData.peak_hours && analyticsData.peak_hours.some(v => v > 0) && (
                            <div style={{
                                padding: '24px', borderRadius: '20px',
                                background: 'linear-gradient(145deg, rgba(30,27,75,0.7), rgba(15,23,42,0.6))',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                boxShadow: '8px 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                                marginBottom: '24px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <BarChart3 size={18} style={{ color: '#a78bfa' }} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>Peak Hours</span>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.6)', marginLeft: '8px' }}>UTC</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
                                    {analyticsData.peak_hours.map((count, hour) => {
                                        const max = Math.max(...analyticsData.peak_hours, 1);
                                        const pct = (count / max) * 100;
                                        return (
                                            <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <div
                                                    style={{
                                                        width: '100%', minHeight: '4px',
                                                        height: `${Math.max(pct, 4)}%`,
                                                        borderRadius: '4px 4px 2px 2px',
                                                        background: count > 0
                                                            ? `linear-gradient(180deg, rgba(139,92,246,${0.4 + pct / 200}), rgba(99,102,241,${0.3 + pct / 200}))`
                                                            : 'rgba(255,255,255,0.04)',
                                                        transition: 'height 0.5s ease',
                                                        boxShadow: count > 0 ? `0 0 8px rgba(139,92,246,${pct / 400})` : 'none'
                                                    }}
                                                    title={`${hour}:00 — ${count} messages`}
                                                />
                                                {hour % 6 === 0 && (
                                                    <span style={{ fontSize: '0.55rem', color: 'rgba(148,163,184,0.5)', fontFamily: 'monospace' }}>{hour}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" accept="application/pdf" />

                {/* Upload Zone - Clay Morphism */}
                <div
                    onClick={() => fileInputRef.current.click()}
                    className="relative group cursor-pointer mb-10"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative border-2 border-dashed border-slate-700/50 group-hover:border-violet-500/50 rounded-3xl p-16 text-center bg-gradient-to-br from-slate-900/60 to-slate-800/60 backdrop-blur-xl transition-all duration-300 shadow-xl">
                        <UploadCloud size={56} className="mx-auto text-violet-400 mb-6 group-hover:scale-110 transition-transform" />
                        <p className="text-white font-semibold text-lg mb-2">Click to upload Datasheet</p>
                        <p className="text-slate-400 text-sm">PDF files only</p>
                    </div>
                </div>

                {/* Files List */}
                <div className="space-y-4">
                    {files.map((f, i) => (
                        <div
                            key={i}
                            className="relative group"
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <div className="relative flex items-center justify-between p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/5 group-hover:border-violet-500/30 transition-all shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${f.status === 'Active' ? 'bg-violet-500/10' : 'bg-green-500/10'}`}>
                                        <FileText className={`${f.status === 'Active' ? 'text-violet-400' : 'text-green-400'}`} size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">{f.name}</p>
                                        <p className="text-slate-500 text-sm">{f.size}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Per-file analytics badges */}
                                    {analyticsData?.projects?.[f.name] && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <span style={{
                                                fontSize: '0.65rem', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '8px',
                                                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa'
                                            }}>
                                                {analyticsData.projects[f.name].visitors} visits
                                            </span>
                                            <span style={{
                                                fontSize: '0.65rem', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '8px',
                                                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8'
                                            }}>
                                                {analyticsData.projects[f.name].messages} msgs
                                            </span>
                                        </div>
                                    )}
                                    <div className={`text-xs font-bold px-4 py-2 rounded-full font-mono ${f.status === 'Active' ? 'text-violet-400 bg-violet-400/10 border border-violet-500/30' : 'text-green-400 bg-green-400/10 border border-green-500/30'}`}>
                                        {f.status === 'Active' ? "● ACTIVE" : "ANALYZING..."}
                                    </div>
                                    <button
                                        onClick={() => onOpenChat(f.name)}
                                        className="p-3 text-violet-400 hover:text-white hover:bg-violet-600/20 rounded-xl transition-all border border-transparent hover:border-violet-500/50"
                                    >
                                        <Play size={20} />
                                    </button>
                                    <button
                                        onClick={() => onShowQr(f.name)}
                                        className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all border border-transparent hover:border-white/10"
                                    >
                                        <QrIcon size={20} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteFile(f.name)}
                                        className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-500/50"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* QR Code Modal */}
                {showQrFor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                            <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-2xl border-2 border-violet-500/50 p-10 rounded-3xl max-w-md w-full text-center shadow-2xl">
                                <button
                                    onClick={onCloseQr}
                                    className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                                >
                                    <X size={24} />
                                </button>

                                <div className="mb-6">
                                    <span className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase bg-violet-500/10 px-4 py-2 rounded-full border border-violet-500/30">
                                        QR GENERATED
                                    </span>
                                    <h3 className="text-2xl font-bold text-white mt-6 break-words font-mono">
                                        {showQrFor}
                                    </h3>
                                </div>

                                <AnimatedQR
                                    value={`${CLIENT_URL}/?project=${showQrFor}`}
                                    size={280}
                                    productName={showQrFor}
                                />

                                <p className="text-xs text-violet-400/70 font-mono tracking-wider mt-6">
                                    SCAN TO CONNECT
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
