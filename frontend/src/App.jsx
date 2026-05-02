import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from './config';

// --- Components ---
import MouseGlow from './components/MouseGlow';
import LandingPage from './components/LandingPage';
import ExhibitorLogin from './components/ExhibitorLogin';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import DatasetNotFound from './components/DatasetNotFound';
import ThankYou from './components/ThankYou';
import QrUnavailable from './components/QrUnavailable';

// --- Hooks ---
import useAudio from './hooks/useAudio';
import useRecorder from './hooks/useRecorder';

export default function App() {
  const [view, setView] = useState('landing');
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [showQrFor, setShowQrFor] = useState(null);
  const [errorProject, setErrorProject] = useState(null);
  const [errorReason, setErrorReason] = useState(null);  // 'inactive' | 'destroyed' | null

  // --- Toast Notifications ---
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message, type = 'error') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  // --- Analytics State ---
  const [analyticsData, setAnalyticsData] = useState(null);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);

  // --- Abort Controller ---
  const abortControllerRef = useRef(null);

  // --- Custom Hooks ---
  const { speakText, stopAudio, unlockAudio } = useAudio();
  const { isListening, startRecording, stopRecording, cancelRecording, setOnRecordComplete } = useRecorder();

  // --- Init ---
  useEffect(() => { fetchUploadedFiles(); fetchAnalytics(); }, []);

  // --- Analytics ---
  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) { console.error('Analytics fetch error:', e); }
    // Also refresh files so per-file stats stay synced
    fetchUploadedFiles();
  };

  const startAnalyticsSession = (project) => {
    const sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionIdRef.current = sid;
    fetch(`${API_BASE_URL}/api/analytics/session/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid, project })
    }).catch(() => { });
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (!sessionIdRef.current) return;
      fetch(`${API_BASE_URL}/api/analytics/session/heartbeat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current })
      }).catch(() => { });
    }, 30000);
  };

  useEffect(() => () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); }, []);

  // --- Helpers ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  };

  /** Strip .pdf extension and format as readable product name */
  const cleanProductName = (filename) => {
    if (!filename) return 'this project';
    return filename
      .replace(/\.pdf$/i, '')
      .replace(/[_\-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // --- QR Scan Detection (with validation) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('project');

    if (projectParam) {
      // Validate dataset exists AND QR is active before opening chat
      fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(projectParam)}/exists`)
        .then(res => res.json())
        .then(data => {
          if (data.exists && data.qr_state === 'active') {
            setIsLocked(true);
            setActiveFile(projectParam);
            setMessages([{ id: 1, type: 'ai', text: `${getGreeting()}! I'm your AI assistant for ${cleanProductName(projectParam)}. Tap to start.` }]);
            setView('chat');
            startAnalyticsSession(projectParam);
          } else if (data.exists && (data.qr_state === 'inactive' || data.qr_state === 'destroyed')) {
            // QR exists but is inactive or destroyed — show "unavailable" page
            setErrorProject(projectParam);
            setErrorReason(data.qr_state);
            setView('qr-unavailable');
          } else {
            // Dataset file doesn't exist — show "not found" page
            setErrorProject(projectParam);
            setView('error');
          }
        })
        .catch(() => {
          // Server unreachable
          setErrorProject(projectParam);
          setView('error');
        });
    } else {
      setMessages([{ id: 1, type: 'ai', text: `${getGreeting()}! I am Lumira. Upload a PDF or scan a QR to begin.` }]);
      setHasInteracted(true);
    }
  }, []);

  // --- Stop All ---
  const stopEverything = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    stopAudio();
    setIsLoading(false);
  };

  // --- Initial Interaction ---
  const handleInitialInteraction = () => {
    setHasInteracted(true);
    // Unlock AudioContext on user gesture — critical for iOS TTS playback
    unlockAudio();
    speakText(isLocked ? `Connected to ${cleanProductName(activeFile)}. Ask me anything.` : "System Online.");
  };

  // --- File Management ---
  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) { console.error("Network Error:", error); }
  };

  const handleDeleteFile = async (filename) => {
    if (!confirm(`Delete "${filename}"? This will invalidate any QR codes for this dataset.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        alert(`Failed to delete: ${err.detail || res.statusText}`);
        return;
      }
      // Only remove from UI after backend confirms
      setFiles(prev => prev.filter(f => f.name !== filename));
    } catch (error) {
      alert('Network error. Could not delete file.');
      fetchUploadedFiles();
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') return alert("Only PDF files are allowed.");

    // Check for duplicates on the client side first
    if (files.some(f => f.name === file.name)) {
      if (!confirm(`"${file.name}" already exists. Do you want to delete the old one and re-upload?`)) return;
      // Delete old file first
      try {
        await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(file.name)}`, { method: 'DELETE' });
      } catch { /* proceed anyway, server will reject if still exists */ }
    }

    // Check file size client-side (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return alert(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum is 50 MB.`);
    }

    const formData = new FormData();
    formData.append("file", file);

    const newFileEntry = { name: file.name, size: "Uploading...", status: "INIT_HANDSHAKE..." };
    setFiles(prev => [newFileEntry, ...prev]);

    try {
      setTimeout(() => setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: "ENCRYPTING..." } : f)), 800);
      const response = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || `Upload failed (${response.status})`);
      }
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: "Active" } : f));
      fetchUploadedFiles();
      alert(`Success! Lumira is learning from "${file.name}".`);
    } catch (error) {
      alert(error.message || "Upload failed.");
      setFiles(prev => prev.filter(f => f.name !== file.name));
    }
  };

  // --- Voice Upload ---
  const handleVoiceUpload = async (audioBlob, ext = 'webm') => {
    // --- Accidental tap: blob is null when recording was too short ---
    if (!audioBlob) {
      // Show a brief hint in the chat instead of transcribing noise
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'ai',
        text: '💡 Hold the mic button while speaking, then release to send.'
      }]);
      return;
    }

    setIsLoading(true);
    // Unlock AudioContext so the TTS response can play back
    unlockAudio();
    try {
      const formData = new FormData();
      // Use correct file extension so backend/Whisper can decode the audio format
      formData.append("file", audioBlob, `recording.${ext}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${API_BASE_URL}/api/stt`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`STT failed (${res.status}):`, errorText);
        throw new Error(`STT failed: ${res.status}`);
      }
      const data = await res.json();
      if (data.text?.trim()) {
        sendMessageToBackend(data.text);
      } else {
        console.warn("STT returned empty text");
        setIsLoading(false);
      }
    } catch (e) {
      console.error("STT Error:", e);
      setIsLoading(false);
      if (e.name === 'AbortError') {
        showToast('Voice processing timed out. Please try a shorter message.');
      } else {
        showToast('Could not process audio. Check your connection and try again.');
      }
    }
  };

  // Wire up recorder callback — runs every render to keep ref fresh
  useEffect(() => {
    setOnRecordComplete(handleVoiceUpload);
  });

  // --- Chat Logic ---
  const sendMessageToBackend = async (textToSend) => {
    if (!textToSend || !textToSend.trim()) return;
    stopEverything();

    const userMsgId = Date.now();
    const aiMsgId = userMsgId + 10;

    setMessages(prev => [...prev, { id: userMsgId, type: 'user', text: textToSend }]);
    setIsLoading(true);
    setTextInput('');

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setMessages(prev => [...prev, { id: aiMsgId, type: 'ai', text: '' }]);

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          active_file: activeFile,
          session_id: sessionIdRef.current || null,
        }),
        signal: signal
      });

      // --- Handle dataset-deleted-mid-conversation ---
      if (response.status === 404) {
        setMessages(prev => prev.map(msg => msg.id === aiMsgId
          ? { ...msg, text: '⚠️ This dataset has been deleted. Please scan a new QR code or go back.' }
          : msg
        ));
        return;
      }

      // --- Handle QR deactivated ---
      if (response.status === 403) {
        setMessages(prev => prev.map(msg => msg.id === aiMsgId
          ? { ...msg, text: '🔒 This project has been deactivated by the exhibitor. The bot is currently offline.' }
          : msg
        ));
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Server error' }));
        // Remove blank AI placeholder, show toast instead
        setMessages(prev => prev.filter(msg => msg.id !== aiMsgId));
        showToast(err.detail || 'Something went wrong. Please try again.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';
      let sentenceBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // --- Intercept ERROR_NOTIFICATION tokens from backend ---
        if (chunk.includes('ERROR_NOTIFICATION:')) {
          const errorMsg = chunk.replace('ERROR_NOTIFICATION:', '').trim();
          // Remove the blank AI placeholder bubble
          setMessages(prev => prev.filter(msg => msg.id !== aiMsgId));
          showToast(errorMsg);
          return;
        }

        aiText += chunk;
        sentenceBuffer += chunk;
        if (sentenceBuffer.match(/[.!?]\s*$/)) {
          speakText(sentenceBuffer);
          sentenceBuffer = '';
        }
        const display = aiText.split("SOURCES_METADATA:")[0];
        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: display } : msg));
      }
      if (sentenceBuffer.trim()) speakText(sentenceBuffer);

    } catch (error) {
      if (error.name !== 'AbortError') {
        // Remove blank AI placeholder, show toast
        setMessages(prev => prev.filter(msg => msg.id !== aiMsgId));
        showToast('Connection lost. Check your network and try again.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // --- Dashboard Handlers ---
  const handleOpenChat = (filename) => {
    setActiveFile(filename);
    setIsAdmin(true);
    setIsLocked(true);
    setHasInteracted(true);
    setMessages([{ id: Date.now(), type: 'ai', text: `${getGreeting()}. Connected to ${cleanProductName(filename)}.` }]);
    setView('chat');
  };

  const handleLogout = () => {
    stopEverything();  // Stop audio + abort requests
    setView('landing');
    setIsAdmin(false);
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setView('exhibitor-dash');
  };

  const handleClearAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics/clear`, { method: 'DELETE' });
      if (res.ok) {
        const fresh = await res.json();
        setAnalyticsData(fresh);
        showToast('Analytics cleared — slate is clean.', 'success');
      } else {
        showToast('Could not clear analytics. Try again.');
      }
    } catch {
      showToast('Network error while clearing analytics.');
    }
  };

  const handleToggleQr = async (filename) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(filename)}/toggle-qr`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFiles(prev => prev.map(f =>
          f.name === filename ? { ...f, qr_active: data.qr_active, qr_state: data.qr_state } : f
        ));
        showToast(`QR for "${filename}" is now ${data.qr_state.toUpperCase()}.`, 'success');
      } else {
        const err = await res.json().catch(() => ({ detail: 'Error' }));
        showToast(err.detail || 'Could not toggle QR status.');
      }
    } catch {
      showToast('Network error while toggling QR.');
    }
  };

  const handleDestroyQr = async (filename) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(filename)}/destroy-qr`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFiles(prev => prev.map(f =>
          f.name === filename ? { ...f, qr_active: false, qr_state: 'destroyed' } : f
        ));
        showToast(`QR for "${filename}" has been permanently destroyed.`, 'success');
      } else {
        showToast('Could not destroy QR.');
      }
    } catch {
      showToast('Network error while destroying QR.');
    }
  };

  const handleRegenerateQr = async (filename) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(filename)}/regenerate-qr`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFiles(prev => prev.map(f =>
          f.name === filename ? { ...f, qr_active: false, qr_state: 'inactive' } : f
        ));
        showToast(`QR for "${filename}" regenerated! It is now INACTIVE — activate it when ready.`, 'success');
      } else {
        showToast('Could not regenerate QR.');
      }
    } catch {
      showToast('Network error while regenerating QR.');
    }
  };

  const handleStartRecording = (e) => {
    unlockAudio(); // Mic press is a user gesture — unlock AudioContext for iOS TTS
    startRecording(e);
  };

  // --- QR Tab Cleanup: clear URL params when visitor leaves ---
  useEffect(() => {
    if (!isLocked || isAdmin) return; // Only for QR-scanned visitor sessions
    const onBeforeUnload = () => {
      // Stop analytics heartbeat
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isLocked, isAdmin]);

  const handleNavigateBack = () => {
    stopEverything();  // Stop audio + abort requests when leaving chat
    isAdmin ? setView('exhibitor-dash') : setView('landing');
  };

  /** Exit for QR-scanned visitors — clears session and shows a goodbye page */
  const handleExitChat = () => {
    stopEverything();
    setIsLocked(false);
    setActiveFile(null);
    setMessages([]);
    setHasInteracted(false);
    // Clear the ?project= URL param so refreshing doesn't re-enter chat
    window.history.replaceState({}, '', '/');
    setView('goodbye');
  };

  return (
    <div className={`w-full h-screen text-white font-sans selection:bg-violet-500/30 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${view === 'landing' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}>
      <MouseGlow />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] animate-blob" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-blob animation-delay-2000" />
      </div>
      {view === 'landing' && <LandingPage onNavigate={setView} />}
      {view === 'goodbye' && <ThankYou />}
      {view === 'qr-unavailable' && (
        <QrUnavailable
          projectName={errorProject}
          reason={errorReason}
        />
      )}
      {view === 'error' && (
        <DatasetNotFound
          projectName={errorProject}
          onGoHome={() => { setErrorProject(null); setView('landing'); window.history.replaceState({}, '', '/'); }}
        />
      )}
      {view === 'exhibitor-login' && (
        <ExhibitorLogin
          onNavigate={setView}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {view === 'exhibitor-dash' && (
        <Dashboard
          files={files}
          analyticsData={analyticsData}
          onNavigate={setView}
          onDeleteFile={handleDeleteFile}
          onFileSelect={handleFileSelect}
          onOpenChat={handleOpenChat}
          onShowQr={setShowQrFor}
          showQrFor={showQrFor}
          onCloseQr={() => setShowQrFor(null)}
          onRefreshAnalytics={fetchAnalytics}
          onClearAnalytics={handleClearAnalytics}
          onConvertFile={fetchUploadedFiles}
          onToggleQr={handleToggleQr}
          onDestroyQr={handleDestroyQr}
          onRegenerateQr={handleRegenerateQr}
          onLogout={handleLogout}
        />
      )}
      {view === 'chat' && (
        <ChatView
          messages={messages}
          textInput={textInput}
          setTextInput={setTextInput}
          isLoading={isLoading}
          isListening={isListening}
          isLocked={isLocked}
          hasInteracted={hasInteracted}
          isAdmin={isAdmin}
          activeFile={activeFile}
          files={files}
          onSendMessage={sendMessageToBackend}
          onStartRecording={handleStartRecording}
          onStopRecording={stopRecording}
          onCancelRecording={cancelRecording}
          onInitialInteraction={handleInitialInteraction}
          onNavigateBack={handleNavigateBack}
          onExitChat={handleExitChat}
          onSetActiveFile={setActiveFile}
        />
      )}

      {/* ── Toast Notifications ── */}
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(100%) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
        @keyframes toast-slide-out {
          from { opacity: 1; transform: translateX(0)   scale(1); }
          to   { opacity: 0; transform: translateX(100%) scale(0.95); }
        }
        .lumira-toast {
          animation: toast-slide-in 0.35s cubic-bezier(.22,1,.36,1) both;
          pointer-events: auto;
        }
      `}</style>
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '10px',
        maxWidth: '340px', pointerEvents: 'none'
      }}>
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const accentColor = isSuccess ? '16,185,129' : '239,68,68';
          const titleColor = isSuccess ? '#6ee7b7' : '#fca5a5';
          const titleLabel = isSuccess ? 'Done' : 'Error';
          const iconEmoji = isSuccess ? '✓' : '⚡';
          return (
          <div
            key={toast.id}
            className="lumira-toast"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '14px 16px',
              background: 'linear-gradient(135deg, rgba(30,10,40,0.92), rgba(20,10,35,0.96))',
              backdropFilter: 'blur(20px)',
              borderRadius: '14px',
              border: `1px solid rgba(${accentColor},0.35)`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(${accentColor},0.1), inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
          >
            {/* Icon */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `rgba(${accentColor},0.15)`,
              border: `1px solid rgba(${accentColor},0.3)`,
              fontSize: '16px', fontWeight: 700, color: titleColor
            }}>
              {iconEmoji}
            </div>
            {/* Message */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: '0.78rem', fontWeight: 600,
                color: titleColor, letterSpacing: '0.02em', marginBottom: '2px'
              }}>
                {titleLabel}
              </p>
              <p style={{
                margin: 0, fontSize: '0.82rem', lineHeight: 1.5,
                color: 'rgba(203,213,225,0.85)'
              }}>
                {toast.message}
              </p>
            </div>
            {/* Dismiss */}
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(148,163,184,0.6)', fontSize: '18px',
                lineHeight: 1, padding: '2px', flexShrink: 0,
                pointerEvents: 'auto',
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(148,163,184,0.6)'}
            >
              ×
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}