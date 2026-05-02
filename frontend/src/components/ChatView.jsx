import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Mic, Send, Sparkles, ChevronLeft, Zap, X, LogOut } from 'lucide-react';

const CANCEL_THRESHOLD = 100; // px slide-left to cancel

const ChatView = ({
    messages, textInput, setTextInput,
    isLoading, isListening, isLocked, hasInteracted, isAdmin,
    activeFile, files,
    onSendMessage, onStartRecording, onStopRecording, onCancelRecording,
    onInitialInteraction, onNavigateBack, onExitChat, onSetActiveFile
}) => {
    // ── Slide-to-cancel state ──
    const touchStartXRef = useRef(0);
    const [slideOffset, setSlideOffset] = useState(0);   // px slid left (positive = left)
    const [isCancelling, setIsCancelling] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const timerRef = useRef(null);

    // Start/stop recording timer
    useEffect(() => {
        if (isListening) {
            setRecordSeconds(0);
            timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
        } else {
            clearInterval(timerRef.current);
            setSlideOffset(0);
            setIsCancelling(false);
        }
        return () => clearInterval(timerRef.current);
    }, [isListening]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // Touch handlers for the mic button area
    const handleTouchStart = useCallback((e) => {
        touchStartXRef.current = e.touches[0].clientX;
        setSlideOffset(0);
        setIsCancelling(false);
        onStartRecording(e);
    }, [onStartRecording]);

    const handleTouchMove = useCallback((e) => {
        if (!isListening) return;
        const dx = touchStartXRef.current - e.touches[0].clientX; // positive = slid left
        const clamped = Math.max(0, Math.min(dx, 200));
        setSlideOffset(clamped);
        setIsCancelling(clamped >= CANCEL_THRESHOLD);
    }, [isListening]);

    const handleTouchEnd = useCallback((e) => {
        if (!isListening) return;
        if (isCancelling) {
            onCancelRecording(e);
        } else {
            onStopRecording(e);
        }
        setSlideOffset(0);
        setIsCancelling(false);
    }, [isListening, isCancelling, onCancelRecording, onStopRecording]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="flex flex-col h-full z-10 relative" style={{ animation: 'land-fadeUp 0.5s ease-out both' }}>
            {/* Chat-specific styles */}
            <style>{`
        @keyframes chat-gradient-border { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes chat-msg-in { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes chat-pulse-ring { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.2);opacity:0} }
        @keyframes chat-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes chat-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes chat-wave { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
        @keyframes land-fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slide-hint { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-8px)} }
        .chat-msg-enter { animation: chat-msg-in 0.4s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

            {/* ── Tap-to-connect overlay (QR scanned sessions) ── */}
            {!hasInteracted && isLocked && (
                <div onClick={onInitialInteraction} style={{
                    position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '24px', textAlign: 'center', cursor: 'pointer',
                    background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, rgba(2,6,23,0.95) 70%)',
                    backdropFilter: 'blur(24px)', animation: 'land-fadeUp 0.6s ease-out both'
                }}>
                    {/* Pulsing rings */}
                    <div style={{ position: 'relative', marginBottom: '40px' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ position: 'absolute', inset: `${-20 - i * 20}px`, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.2)', animation: `chat-pulse-ring ${2 + i * 0.5}s ease-out infinite`, animationDelay: `${i * 0.4}s` }} />
                        ))}
                        <div style={{
                            width: '96px', height: '96px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg,rgba(139,92,246,0.3),rgba(99,102,241,0.2))',
                            backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 0 60px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                            animation: 'chat-float 3s ease-in-out infinite'
                        }}>
                            <Zap size={44} style={{ color: '#c4b5fd', filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.6))' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>Link Established</h2>
                    <p style={{ color: 'rgba(196,181,253,0.8)', marginBottom: '32px', fontSize: '0.95rem' }}>Tap anywhere to begin</p>
                    <div style={{
                        padding: '12px 28px', borderRadius: '9999px', fontSize: '0.8rem', fontFamily: 'monospace',
                        color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)',
                        background: 'rgba(139,92,246,0.06)', backdropFilter: 'blur(8px)',
                        animation: 'chat-float 2s ease-in-out infinite'
                    }}>▸ TAP_TO_CONNECT</div>
                </div>
            )}

            {/* ── Glassmorphic Header ── */}
            <div style={{
                height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
                position: 'relative', zIndex: 20,
                background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,27,75,0.4))',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.03)'
            }}>
                {/* Animated gradient line at bottom */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.5),rgba(99,102,241,0.5),transparent)', backgroundSize: '200% 100%', animation: 'chat-gradient-border 4s linear infinite' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {(!isLocked || isAdmin) && (
                        <button onClick={onNavigateBack}
                            style={{ padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s', display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        ><ChevronLeft size={20} /></button>
                    )}
                    {/* Clay avatar */}
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(145deg,rgba(139,92,246,0.25),rgba(99,102,241,0.15))',
                        boxShadow: '4px 4px 12px rgba(0,0,0,0.3), -2px -2px 8px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <Sparkles size={18} style={{ color: '#c4b5fd' }} />
                    </div>
                    <div>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', letterSpacing: '-0.01em' }}>Lumira</span>
                        {(isLocked || isAdmin) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)', display: 'inline-block' }} />
                                <span style={{ fontSize: '0.7rem', color: '#4ade80', fontFamily: 'monospace', letterSpacing: '0.03em' }}>{activeFile}</span>
                            </div>
                        ) : (
                            <select style={{ background: 'rgba(15,23,42,0.6)', fontSize: '0.7rem', color: '#a78bfa', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '8px', padding: '2px 8px', marginTop: '2px', outline: 'none' }} value={activeFile || ""} onChange={(e) => onSetActiveFile(e.target.value)}>
                                <option value="" disabled>Select a Project</option>
                                {files.map((f, i) => (<option key={i} value={f.name}>{f.name}</option>))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Exit button — visible for QR visitors (locked, non-admin) */}
                {isLocked && !isAdmin && (
                    <button onClick={onExitChat}
                        title="Exit chat"
                        style={{
                            padding: '8px', borderRadius: '12px',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171', cursor: 'pointer', transition: 'all 0.2s', display: 'flex'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    ><LogOut size={18} /></button>
                )}
            </div>

            {/* ── Message Area ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, idx) => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start', animationDelay: `${idx * 0.05}s` }} className="chat-msg-enter">
                        {msg.type === 'ai' && (
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '10px', marginRight: '10px', marginTop: '4px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(145deg,rgba(139,92,246,0.2),rgba(99,102,241,0.12))',
                                border: '1px solid rgba(255,255,255,0.06)',
                                boxShadow: '3px 3px 8px rgba(0,0,0,0.25), -1px -1px 4px rgba(139,92,246,0.04)'
                            }}>
                                <Sparkles size={13} style={{ color: '#a78bfa' }} />
                            </div>
                        )}
                        <div style={{
                            maxWidth: '78%', borderRadius: msg.type === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                            padding: '14px 18px',
                            background: msg.type === 'user'
                                ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.18))'
                                : 'linear-gradient(135deg, rgba(30,27,75,0.6), rgba(15,23,42,0.5))',
                            backdropFilter: 'blur(12px)',
                            border: msg.type === 'user'
                                ? '1px solid rgba(139,92,246,0.2)'
                                : '1px solid rgba(255,255,255,0.05)',
                            boxShadow: msg.type === 'user'
                                ? '0 4px 20px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                                : '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            cursor: 'default'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = msg.type === 'user' ? '0 8px 28px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 8px 28px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        >
                            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: msg.type === 'user' ? '#e2e8f0' : 'rgba(203,213,225,0.95)', whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>
                        </div>
                    </div>
                ))}
                {/* Shimmer loading indicator */}
                {isLoading && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', animationDelay: '0s' }} className="chat-msg-enter">
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '10px', flexShrink: 0, marginTop: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(145deg,rgba(139,92,246,0.2),rgba(99,102,241,0.12))',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '3px 3px 8px rgba(0,0,0,0.25)'
                        }}>
                            <Sparkles size={13} style={{ color: '#a78bfa' }} />
                        </div>
                        <div style={{
                            padding: '16px 22px', borderRadius: '20px 20px 20px 6px',
                            background: 'linear-gradient(135deg, rgba(30,27,75,0.6), rgba(15,23,42,0.5))',
                            backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} style={{
                                    width: '3px', height: '18px', borderRadius: '2px',
                                    background: 'linear-gradient(180deg,#a78bfa,#818cf8)',
                                    animation: `chat-wave 1.2s ease-in-out infinite`,
                                    animationDelay: `${i * 0.12}s`, opacity: 0.7
                                }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* ── Glassmorphic Input Bar ── */}
            <div style={{
                padding: '16px 16px 20px', position: 'relative',
                background: 'linear-gradient(180deg, rgba(15,23,42,0.4), rgba(15,23,42,0.8))',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.04)'
            }}>
                {/* Subtle top glow */}
                <div style={{ position: 'absolute', top: '-1px', left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Input container with glow */}
                    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: '-1px', borderRadius: '9999px', background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.1),rgba(139,92,246,0.15))', backgroundSize: '200% 100%', animation: 'chat-shimmer 4s linear infinite', pointerEvents: 'none', opacity: 0.6 }} />
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={isLoading ? "Processing..." : "Ask Lumira anything..."}
                            style={{
                                width: '100%', boxSizing: 'border-box', position: 'relative',
                                background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
                                color: '#fff', borderRadius: '9999px', padding: '14px 48px 14px 16px', fontSize: '0.9rem',
                                border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                                transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 20px rgba(139,92,246,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                            onKeyDown={(e) => { if (e.key === 'Enter') onSendMessage(textInput); }}
                        />
                        <button
                            onClick={() => onSendMessage(textInput)}
                            style={{
                                position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                                padding: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.15))',
                                color: '#a78bfa', display: 'flex', transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(139,92,246,0.4),rgba(99,102,241,0.3))'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.15))'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.transform = 'translateY(-50%)'; }}
                        ><Send size={18} /></button>
                    </div>

                    {/* Clay mic button — touch events handle slide-to-cancel */}
                    <button
                        onMouseDown={onStartRecording}
                        onMouseUp={onStopRecording}
                        onMouseLeave={onStopRecording}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={(e) => { onCancelRecording(e); setSlideOffset(0); setIsCancelling(false); }}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                            WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none',
                            width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            background: isListening
                                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                                : 'linear-gradient(145deg,rgba(30,27,75,0.8),rgba(15,23,42,0.7))',
                            boxShadow: isListening
                                ? '0 0 30px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                                : '6px 6px 16px rgba(0,0,0,0.35), -3px -3px 10px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
                            color: isListening ? '#fff' : '#a78bfa',
                            transform: isListening ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)'
                        }}
                    >
                        <Mic size={22} />
                    </button>
                </div>
            </div>

            {/* ── Immersive Listening Overlay with Slide-to-Cancel ── */}
            {isListening && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: isCancelling
                        ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.12) 0%, rgba(2,6,23,0.92) 60%)'
                        : 'radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, rgba(2,6,23,0.85) 60%)',
                    backdropFilter: 'blur(24px)', pointerEvents: 'none',
                    animation: 'land-fadeUp 0.3s ease-out both',
                    transition: 'background 0.3s ease'
                }}>
                    {/* Concentric rings */}
                    <div style={{ position: 'relative', marginBottom: '32px' }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{
                                position: 'absolute',
                                inset: `${-24 - i * 24}px`, borderRadius: '50%',
                                border: `1.5px solid rgba(239,68,68,${0.25 - i * 0.05})`,
                                animation: `chat-pulse-ring ${2 + i * 0.6}s ease-out infinite`,
                                animationDelay: `${i * 0.3}s`
                            }} />
                        ))}
                        {/* Center mic / cancel icon */}
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isCancelling
                                ? 'linear-gradient(135deg,rgba(239,68,68,0.5),rgba(220,38,38,0.4))'
                                : 'linear-gradient(135deg,rgba(239,68,68,0.3),rgba(220,38,38,0.2))',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: isCancelling
                                ? '0 0 60px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                                : '0 0 50px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                            animation: isCancelling ? 'none' : 'chat-float 2s ease-in-out infinite',
                            transform: isCancelling ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.25s ease'
                        }}>
                            {isCancelling
                                ? <X size={44} style={{ color: '#fca5a5', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.7))' }} />
                                : <Mic size={40} style={{ color: '#fca5a5', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }} />
                            }
                        </div>
                    </div>

                    {/* Recording timer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'chat-pulse-ring 1.5s ease-out infinite' }} />
                        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fca5a5', fontFamily: 'monospace' }}>{formatTime(recordSeconds)}</span>
                    </div>

                    {/* Audio wave bars */}
                    {!isCancelling && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '20px' }}>
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} style={{
                                    width: '3px', height: '24px', borderRadius: '2px',
                                    background: 'linear-gradient(180deg,#fca5a5,#ef4444)',
                                    animation: `chat-wave 0.8s ease-in-out infinite`,
                                    animationDelay: `${i * 0.1}s`
                                }} />
                            ))}
                        </div>
                    )}

                    {isCancelling ? (
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.01em' }}>Release to cancel</h3>
                    ) : (
                        <>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Listening...</h3>
                            <p style={{
                                marginTop: '10px', color: 'rgba(252,165,165,0.6)', fontSize: '0.8rem',
                                animation: 'slide-hint 2s ease-in-out infinite',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <span>‹</span> slide to cancel
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatView;
