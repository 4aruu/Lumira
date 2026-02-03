import React, { useState, useEffect, useRef } from 'react';
import QRCode from "react-qr-code";
import {
  Mic, Send, QrCode as QrIcon,
  UploadCloud, FileText, BarChart3,
  ChevronLeft, X, Sparkles, LogOut, Trash2, RefreshCw, Zap, Shield, Mail, Lock, Play
} from 'lucide-react';

/* ==========================================================================
   CONFIG
   ========================================================================== */
const API_BASE_URL = "";
const CLIENT_URL = window.location.origin;

/* ==========================================================================
   VISUAL COMPONENTS
   ========================================================================== */
const MouseGlow = () => {
  const [mounted, setMounted] = useState(false);
  const glowRef = useRef(null);
  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e) => {
      if (!glowRef.current) return;
      const { clientX: x, clientY: y } = e;
      glowRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(34, 197, 94, 0.15), transparent 40%)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  if (!mounted) return null;
  return <div ref={glowRef} className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300" style={{ background: "transparent", mixBlendMode: "screen" }} />;
};

const CornerLights = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const g1 = ctx.createRadialGradient(0,0,0,0,0,400);
      g1.addColorStop(0,'rgba(139, 92, 246, 0.25)'); g1.addColorStop(1,'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0,0,400,400);
      const g2 = ctx.createRadialGradient(canvas.width,0,0,canvas.width,0,400);
      g2.addColorStop(0,'rgba(139, 92, 246, 0.25)'); g2.addColorStop(1,'transparent');
      ctx.fillStyle = g2; ctx.fillRect(canvas.width-400,0,400,400);
      if(particles.length < 40) {
        const isLeft = Math.random() > 0.5;
        particles.push({
          x: isLeft ? Math.random()*150 : canvas.width - Math.random()*150,
          y: -10, v: Math.random()*1.5 + 0.5, s: Math.random()*2, o: Math.random()
        });
      }
      particles.forEach((p,i) => {
        p.y += p.v; p.o -= 0.005;
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill();
        if(p.o <= 0) particles.splice(i,1);
      });
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(id); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 shadow-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed z-10";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-violet-500/25 border border-white/10",
    secondary: "bg-slate-800/80 backdrop-blur text-slate-200 hover:bg-slate-700/80 border border-slate-700",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white shadow-none"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      <span className="relative z-20 flex items-center gap-2">{Icon && <Icon className="w-5 h-5" />}{children}</span>
    </button>
  );
};

/* ==========================================================================
   MAIN APPLICATION
   ========================================================================== */
export default function App() {
  const [view, setView] = useState('landing');
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [micConfidence, setMicConfidence] = useState(0);

  // --- OTP AUTH STATE ---
  const [authStep, setAuthStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [showQrFor, setShowQrFor] = useState(null);

  // --- REFS & AUDIO STATE ---
  const chatEndRef = useRef(null);
  const audioQueue = useRef([]);
  const isPlayingAudio = useRef(false);
  const currentAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMsgRef = useRef({ text: '', time: 0 });
  const abortControllerRef = useRef(null);
  const isSendPendingRef = useRef(false);

  // --- ROBUST AUDIO RECORDING REFS ---
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isHoldRef = useRef(false);

  useEffect(() => { fetchUploadedFiles(); }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('project');

    if (projectParam) {
      setIsLocked(true);
      setActiveFile(projectParam);
      setMessages([{ id: 1, type: 'ai', text: `${getGreeting()}! I am linked to "${projectParam}". Tap to start.` }]);
      setView('chat');
    } else {
      setMessages([{ id: 1, type: 'ai', text: `${getGreeting()}! I am Lumira. Upload a PDF or scan a QR to begin.` }]);
      setHasInteracted(true);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleInitialInteraction = () => {
    setHasInteracted(true);
    speakText(isLocked ? `Connected to ${activeFile}. Ask me anything.` : "System Online.");
  };

  const stopEverything = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    audioQueue.current = [];
    setIsLoading(false);
  };

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
    if (!confirm(`Delete "${filename}"?`)) return;
    setFiles(prev => prev.filter(f => f.name !== filename));
    try { await fetch(`${API_BASE_URL}/api/files/${filename}`, { method: 'DELETE' }); }
    catch (error) { fetchUploadedFiles(); }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') return alert("PDF only.");
    const formData = new FormData();
    formData.append("file", file);

    const newFileEntry = { name: file.name, size: "Uploading...", status: "INIT_HANDSHAKE..." };
    setFiles(prev => [newFileEntry, ...prev]);

    try {
      setTimeout(() => setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: "ENCRYPTING..." } : f)), 800);
      const response = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Upload failed");
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: "Active" } : f));
      fetchUploadedFiles();
      alert(`Success! Lumira is learning from "${file.name}".`);
    } catch (error) {
      alert("Upload failed.");
      setFiles(prev => prev.filter(f => f.name !== file.name));
    }
  };

  const handleResetChat = () => {
    if (confirm("Start a new conversation?")) {
      stopEverything();
      setMessages([{ id: Date.now(), type: 'ai', text: `${getGreeting()}. Conversation reset.` }]);
    }
  };

  // --- AUDIO OUTPUT ENGINE ---
  const processAudioQueue = async () => {
    if (isPlayingAudio.current) return;
    if (audioQueue.current.length === 0) return;

    isPlayingAudio.current = true;
    const nextAudioUrl = audioQueue.current.shift();
    const audio = new Audio(nextAudioUrl);
    currentAudioRef.current = audio;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {});
      navigator.mediaSession.setActionHandler('pause', () => {});
    }

    try { await audio.play(); } catch (e) { isPlayingAudio.current = false; processAudioQueue(); return; }
    audio.onended = () => {
      isPlayingAudio.current = false;
      currentAudioRef.current = null;
      URL.revokeObjectURL(nextAudioUrl);
      processAudioQueue();
    };
  };

  const speakText = async (text) => {
    if (!text || !text.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/speak?text=${encodeURIComponent(text)}`);
      if (!response.ok) return;
      const blob = await response.blob();
      audioQueue.current.push(URL.createObjectURL(blob));
      processAudioQueue();
    } catch (error) {}
  };

  // --- ADD THIS NEW STATE & EFFECT AT THE TOP OF App() ---
  const streamRef = useRef(null); // Keep mic "warm"

  // Wake up mic immediately when app loads (Ask permission once)
  useEffect(() => {
    const warmupMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream; // Store it for later
      } catch (err) {
        console.warn("Mic warmup failed (User must tap first)", err);
      }
    };
    warmupMic();

    return () => {
      // Cleanup: Turn off mic when user leaves the page
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);


  // --- UPDATED START RECORDING (INSTANT START) ---
  const startRecording = async (e) => {
    if (e && e.cancelable) e.preventDefault();
    if (isListening || isHoldRef.current) return;

    isHoldRef.current = true;
    setTextInput("🎤 Listening..."); // Visual feedback immediately

    try {
      // 1. Reuse existing stream if available, otherwise request it
      let stream = streamRef.current;
      if (!stream || !stream.active) {
         stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         streamRef.current = stream;
      }

      // Safety: User released while we were checking stream
      if (!isHoldRef.current) return;

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceUpload(audioBlob);
        // NOTE: We DO NOT stop the tracks here anymore. We keep them open.
      };

      mediaRecorderRef.current.start(100); // Faster slicing (100ms) for quicker capture
      setIsListening(true);

    } catch (err) {
      console.error("Mic Error", err);
      isHoldRef.current = false;
    }
  };

  // --- UPDATED STOP RECORDING ---
  const stopRecording = (e) => {
    if (e && e.cancelable) e.preventDefault();
    isHoldRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
    // We intentionally do NOT stop the stream tracks here, keeping the mic warm.
  };

  const handleVoiceUpload = async (audioBlob) => {
    setIsLoading(true);
    setTextInput("Processing Voice...");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob);
      const res = await fetch(`${API_BASE_URL}/api/stt`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) sendMessageToBackend(data.text);
      else setTextInput("");
    } catch (e) {
      console.error(e);
      setTextInput("Error hearing audio.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- CHAT LOGIC ---
  const sendMessageToBackend = async (textToSend) => {
    if (!textToSend || !textToSend.trim()) return;

    stopEverything();
    isSendPendingRef.current = false;

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

  // --- OTP HANDLERS ---
  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setErrorMessage(data.detail); return; }
      setSessionId(data.session_id);
      setAuthStep("otp");
      alert(data.message);
    } catch (err) { setErrorMessage("Network error."); }
    finally { setIsSendingOtp(false); }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, otp: otp })
      });
      if (!res.ok) { setErrorMessage("Invalid Code"); return; }
      setIsAdmin(true);
      setView('exhibitor-dash');
      setSessionId(''); setOtp(''); setAuthStep('email'); setEmail('');
    } catch (err) { setErrorMessage("Network error."); }
  };

  // --- RENDERERS ---

  const renderLanding = () => (
    <div className="flex flex-col h-full items-center justify-center p-6 relative overflow-hidden animate-in fade-in z-10">
      <CornerLights />
      <div className="z-10 text-center flex flex-col items-center w-full max-w-4xl">
        <div className="mb-8 animate-pulse duration-[4000ms]">
          <img src="/lumira-logo.png" alt="Lumira Logo" className="w-40 h-40 object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]" />
        </div>
        <div className="space-y-4 mb-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white drop-shadow-2xl animate-pulse duration-[4000ms] delay-500">LUMIRA</h1>
          <p className="text-violet-200 text-xl font-medium tracking-wide opacity-80">AI Exhibition Assistant</p>
        </div>
        <Button onClick={() => setView('exhibitor-login')} className="w-64 py-5 text-lg bg-slate-900/40 border border-white/10 hover:bg-slate-800 hover:border-violet-500/50 text-white rounded-full backdrop-blur-md transition-all shadow-xl hover:shadow-violet-500/20">Exhibitor Portal</Button>
      </div>
    </div>
  );

  const renderExhibitorLogin = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 relative z-10 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl">
        <div className="flex justify-center mb-6"><div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20"><Shield className="text-white" /></div></div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Exhibitor Login</h2>
        <p className="text-slate-400 text-center text-sm mb-8">{authStep === 'email' ? 'Enter email for verification.' : `Enter code sent to ${email}`}</p>
        {errorMessage && (<div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{errorMessage}</div>)}
        <div className="space-y-4">
          {authStep === 'email' ? (
            <div>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 p-3 text-white focus:border-violet-500 outline-none" /></div>
              <Button onClick={handleSendOtp} disabled={isSendingOtp} className="w-full mt-6">{isSendingOtp ? 'Sending...' : 'Send Verification Code'}</Button>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right">
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" /><input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 p-3 text-white text-center tracking-[0.5em] font-mono text-lg focus:border-violet-500 outline-none" /></div>
              <Button onClick={handleVerifyOtp} disabled={isSendingOtp} className="w-full mt-6">Verify & Login</Button>
              <button onClick={() => { setAuthStep('email'); setOtp(''); }} className="w-full mt-4 text-sm text-slate-500 hover:text-violet-400">Change Email</button>
            </div>
          )}
          <Button variant="ghost" onClick={() => setView('landing')} className="w-full text-sm mt-2">Back to Home</Button>
        </div>
      </div>
    </div>
  );

  const renderDash = () => (
    <div className="flex h-full z-10 relative">
      <div className="w-64 border-r border-slate-800/50 bg-slate-900/60 backdrop-blur-md hidden md:flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8"><div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center"><Sparkles className="text-white" size={16} /></div><span className="text-xl font-bold text-white">LUMIRA</span></div>
        <div className="space-y-2 flex-1"><div className="flex items-center gap-3 px-4 py-3 bg-violet-600/10 text-violet-400 rounded-xl border border-violet-600/20"><BarChart3 size={20} /><span className="font-medium">Dashboard</span></div></div>
        <button onClick={() => { setView('landing'); setIsAdmin(false); }} className="flex items-center gap-3 text-slate-400 hover:text-white"><LogOut size={20} /> Logout</button>
      </div>
      <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Base</h2>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="application/pdf" />
        <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-slate-700/50 rounded-xl p-12 text-center bg-slate-900/40 cursor-pointer hover:border-violet-500/50 transition-colors backdrop-blur-sm group">
          <UploadCloud size={48} className="mx-auto text-violet-400 mb-4 group-hover:scale-110 transition-transform" />
          <p className="text-white font-medium">Click to upload Datasheet (PDF)</p>
        </div>
        <div className="mt-8 space-y-3">
          {files.map((f, i) => (
            <div key={i} className="flex item-center justify-between p-4 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-violet-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className={`text-${f.status === 'Active' ? 'violet' : 'green'}-400`} size={20} />
                <div><p className="text-white text-sm font-medium">{f.name}</p><p className="text-slate-500 text-xs">{f.size}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-xs font-bold px-3 py-1 rounded-full font-mono ${f.status === 'Active' ? 'text-violet-400 bg-violet-400/10' : 'text-green-400 bg-green-400/10'}`}>{f.status === 'Active' ? "● ACTIVE" : "ANALYZING..."}</div>
                <button onClick={() => { setActiveFile(f.name); setIsAdmin(true); setIsLocked(true); setHasInteracted(true); setMessages([{ id: Date.now(), type: 'ai', text: `${getGreeting()}. Connected to ${f.name}.` }]); setView('chat'); }} className="p-2 text-violet-400 hover:text-white hover:bg-violet-600 rounded-lg transition-colors"><Play size={18} /></button>
                <button onClick={() => setShowQrFor(f.name)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><QrIcon size={18} /></button>
                <button onClick={() => handleDeleteFile(f.name)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
        {showQrFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border border-green-500/50 p-8 rounded-2xl max-w-sm w-full text-center relative shadow-[0_0_50px_rgba(34,197,94,0.3)]">
              <button onClick={() => setShowQrFor(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X /></button>
              <div className="mb-6"><span className="text-[10px] font-bold tracking-[0.2em] text-green-500 uppercase bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">TARGET LOCKED</span><h3 className="text-xl font-bold text-white mt-4 break-words font-mono">{showQrFor}</h3></div>
              <div className="flex justify-center p-4 bg-black border border-green-500/30 rounded-xl mb-6"><QRCode value={`${CLIENT_URL}/?project=${showQrFor}`} size={220} fgColor="#22c55e" bgColor="#000000" style={{ height: "auto", maxWidth: "100%", width: "100%" }} /></div>
              <p className="text-xs text-green-500/60 font-mono">SCAN_TO_INITIATE_UPLINK</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 z-10 relative">
      {!hasInteracted && isLocked && (
        <div onClick={handleInitialInteraction} className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-violet-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(124,58,237,0.5)] animate-pulse mb-8"><Zap size={48} className="text-white" /></div>
          <h2 className="text-3xl font-bold text-white mb-2">Secure Link Established</h2>
          <p className="text-violet-300 mb-8">Tap anywhere to initialize audio uplink</p>
          <div className="px-6 py-3 border border-violet-500/50 rounded-full text-sm font-mono text-violet-400 animate-pulse">{">"} CLICK_TO_CONNECT_</div>
        </div>
      )}

      <div className="h-16 border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          {(!isLocked || isAdmin) && <button onClick={() => isAdmin ? setView('exhibitor-dash') : setView('landing')} className="text-slate-400 hover:text-white"><ChevronLeft size={20} /></button>}
          <div className="flex flex-col">
            <span className="text-white font-medium text-sm">Lumira Assistant</span>
            {(isLocked || isAdmin) ? (
              <div className="flex items-center gap-2 mt-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span><span className="text-xs text-green-400 font-mono">{activeFile}</span></div>
            ) : (
              <select className="bg-slate-800 text-xs text-violet-400 border border-slate-700 rounded px-2 py-1 mt-1 outline-none" value={activeFile || ""} onChange={(e) => setActiveFile(e.target.value)}><option value="" disabled>Select a Project</option>{files.map((f, i) => (<option key={i} value={f.name}>{f.name}</option>))}</select>
            )}
          </div>
        </div>
        <button onClick={handleResetChat} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-red-500/20 rounded-full transition-colors border border-transparent hover:border-red-500/50"><RefreshCw size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 backdrop-blur-sm ${msg.type === 'user' ? 'bg-violet-600/90 text-white shadow-lg' : 'bg-slate-800/80 text-slate-200 border border-slate-700/50'}`}><p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p></div>
          </div>
        ))}
        {isLoading && (<div className="flex justify-center my-4"><div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700"><div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div><div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div><div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div></div></div>)}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-800/50 bg-slate-900/60 backdrop-blur-md relative">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={isLoading ? "Processing (Tap Mic to Interrupt)..." : "Hold mic to speak..."} className="w-full bg-slate-800/80 text-white rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border border-slate-700/50" onKeyDown={(e) => { if (e.key === 'Enter') { sendMessageToBackend(textInput); } }} />
            <button onClick={() => sendMessageToBackend(textInput)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-violet-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><Send size={18} /></button>
          </div>

          {/* --- CRASH PROOF MIC BUTTON (CSS FIXED) --- */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            onTouchCancel={stopRecording}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none' }}
            className={`p-3 rounded-full border transition-all select-none ${isListening ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50 text-white' : 'bg-slate-800/80 text-violet-400'}`}
          >
            <Mic size={24} />
          </button>
        </div>
      </div>

      {isListening && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-xl animate-in fade-in pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30 animate-ping"></div>
            <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 animate-pulse"><Mic size={48} className="text-white" /></div>
          </div>
          <h3 className="mt-8 text-2xl font-bold text-white tracking-tight">Listening...</h3>
          <p className="mt-4 text-violet-200/80 text-sm">Release to Send</p>
          {micConfidence > 0 && <div className="mt-2 text-xs text-green-400 font-mono">Confidence: {micConfidence}%</div>}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-screen text-white font-sans selection:bg-violet-500/30 overflow-hidden relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <MouseGlow />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] animate-blob" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-blob animation-delay-2000" />
      </div>
      {view === 'landing' && renderLanding()}
      {view === 'exhibitor-login' && renderExhibitorLogin()}
      {view === 'exhibitor-dash' && renderDash()}
      {view === 'chat' && renderChat()}
    </div>
  );
}