import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from './config';

// --- Components ---
import MouseGlow from './components/MouseGlow';
import LandingPage from './components/LandingPage';
import ExhibitorLogin from './components/ExhibitorLogin';
import Dashboard from './components/Dashboard';
import ChatView from './components/ChatView';
import DatasetNotFound from './components/DatasetNotFound';

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

  // --- Analytics State ---
  const [analyticsData, setAnalyticsData] = useState(null);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);

  // --- Abort Controller ---
  const abortControllerRef = useRef(null);

  // --- Custom Hooks ---
  const { speakText, stopAudio, unlockAudio } = useAudio();
  const { isListening, startRecording, stopRecording, setOnRecordComplete } = useRecorder();

  // --- Init ---
  useEffect(() => { fetchUploadedFiles(); fetchAnalytics(); }, []);

  // --- Analytics ---
  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) { console.error('Analytics fetch error:', e); }
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
      // Validate dataset exists before opening chat
      fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(projectParam)}/exists`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            setIsLocked(true);
            setActiveFile(projectParam);
            setMessages([{ id: 1, type: 'ai', text: `${getGreeting()}! I'm your AI assistant for ${cleanProductName(projectParam)}. Tap to start.` }]);
            setView('chat');
            startAnalyticsSession(projectParam);
          } else {
            // Dataset was deleted — show error
            setErrorProject(projectParam);
            setView('error');
          }
        })
        .catch(() => {
          // Server unreachable — show error
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
        alert("Voice processing timed out (60s). Please try again with a shorter message.");
      } else {
        alert("Could not process audio. Check your connection and try again.");
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
        body: JSON.stringify({ message: textToSend, active_file: activeFile }),
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

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Server error' }));
        setMessages(prev => prev.map(msg => msg.id === aiMsgId
          ? { ...msg, text: `⚠️ ${err.detail || 'Something went wrong.'}` }
          : msg
        ));
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
        setMessages(prev => [...prev, { id: Date.now() + 2, type: 'ai', text: "⚠️ Connection Lost." }]);
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
    setView('landing');
    setIsAdmin(false);
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setView('exhibitor-dash');
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
    isAdmin ? setView('exhibitor-dash') : setView('landing');
  };

  return (
    <div className={`w-full h-screen text-white font-sans selection:bg-violet-500/30 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${view === 'landing' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}>
      <MouseGlow />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] animate-blob" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-blob animation-delay-2000" />
      </div>
      {view === 'landing' && <LandingPage onNavigate={setView} />}
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
          onInitialInteraction={handleInitialInteraction}
          onNavigateBack={handleNavigateBack}
          onSetActiveFile={setActiveFile}
        />
      )}
    </div>
  );
}