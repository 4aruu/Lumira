import React, { useState, useEffect, useRef } from 'react';
import QRCode from "react-qr-code";
import {
  Mic, Send, QrCode as QrIcon,
  UploadCloud, FileText, BarChart3,
  ChevronLeft, X, Sparkles, LogOut, Trash2, RefreshCw, Zap, Shield, Mail, Lock
} from 'lucide-react';

/* ==========================================================================
   CONFIG: NETWORK SETTINGS
   ========================================================================== */
const API_BASE_URL = "";
const CLIENT_URL = "https://placatory-robt-personifiable.ngrok-free.dev";

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [micConfidence, setMicConfidence] = useState(0);

  // --- NEW: OTP AUTH STATE ---
  const [authStep, setAuthStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [showQrFor, setShowQrFor] = useState(null);

  const chatEndRef = useRef(null);
  const audioQueue = useRef([]);
  const isPlayingAudio = useRef(false);
  const currentAudioRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMsgRef = useRef({ text: '', time: 0 });
  const abortControllerRef = useRef(null);

  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const isProcessingRef = useRef(false);

  useEffect(() => { fetchUploadedFiles(); }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('project');
    const greeting = getGreeting();

    if (projectParam) {
      setIsLocked(true);
      setActiveFile(projectParam);
      const welcomeMsg = `${greeting}! I am linked to "${projectParam}". Tap to start.`;
      setMessages([{ id: 1, type: 'ai', text: welcomeMsg }]);
      setView('chat');
    } else {
      const welcomeMsg = `${greeting}! I am Lumira. Upload a PDF or scan a QR to begin.`;
      setMessages([{ id: 1, type: 'ai', text: welcomeMsg }]);
      setHasInteracted(true);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleInitialInteraction = () => {
    setHasInteracted(true);
    const greeting = getGreeting();
    const textToSay = isLocked
      ? `${greeting}. Connected to ${activeFile}. Ask me anything.`
      : `${greeting}. System Online.`;
    speakText(textToSay);
  };

  const stopEverything = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    audioQueue.current = [];
    setIsSpeaking(false);
    setIsLoading(false);
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files);
      }
    } catch (error) {
      console.error("Network Error:", error);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    setFiles(prev => prev.filter(f => f.name !== filename));
    try {
      await fetch(`${API_BASE_URL}/api/files/${filename}`, { method: 'DELETE' });
    } catch (error) {
      fetchUploadedFiles();
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') return alert("PDF only.");
    const formData = new FormData();
    formData.append("file", file);
    const newFileEntry = { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, status: "INIT_HANDSHAKE..." };
    setFiles(prev => [newFileEntry, ...prev]);
    try {
      setTimeout(() => setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: "ENCRYPTING_DATA..." } : f)), 800);
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
      setMessages([{ id: Date.now(), type: 'ai', text: "Conversation reset. How can I help you now?" }]);
    }
  };

  const processAudioQueue = async () => {
    if (isPlayingAudio.current) return;
    if (audioQueue.current.length === 0) {
      setIsSpeaking(false);
      return;
    }
    isPlayingAudio.current = true;
    setIsSpeaking(true);
    const nextAudioUrl = audioQueue.current.shift();
    const audio = new Audio(nextAudioUrl);
    currentAudioRef.current = audio;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    try {
      await audio.play();
    } catch (e) {
      isPlayingAudio.current = false;
      processAudioQueue();
      return;
    }
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
      if (!response.ok) throw new Error("Voice failed");
      const blob = await response.blob();
      audioQueue.current.push(URL.createObjectURL(blob));
      processAudioQueue();
    } catch (error) {
      if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  };

  const sendMessageToBackend = async (textToSend) => {
    if (!textToSend || !textToSend.trim()) return;

    stopEverything();
    isProcessingRef.current = false;
    finalTranscriptRef.current = '';

    const now = Date.now();
    if (textToSend === lastMsgRef.current.text && (now - lastMsgRef.current.time) < 2000) return;
    lastMsgRef.current = { text: textToSend, time: now };

    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: textToSend }]);
    setIsLoading(true);
    setTextInput('');

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let messageToBackend = textToSend;
    const vagueKeywords = ["more", "continue", "next", "details"];
    if (vagueKeywords.some(w => textToSend.toLowerCase().includes(w)) || textToSend.length < 15) {
      const lastUserMsg = [...messages].reverse().find(m => m.type === 'user');
      if (lastUserMsg) messageToBackend = `${lastUserMsg.text}. ${textToSend}`;
    }

    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const fillers = ["Processing...", "Accessing database...", "One moment..."];
      const utter = new SpeechSynthesisUtterance(fillers[Math.floor(Math.random() * fillers.length)]);
      utter.rate = 1.4;
      utter.volume = 0.2;
      utter.onend = () => {
        if (!isPlayingAudio.current) setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utter);
    }

    try {
      const aiMsgId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiMsgId, type: 'ai', text: '' }]);

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToBackend, active_file: activeFile }),
        signal: signal
      });

      if (!response.body) throw new Error("No stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '', sentenceBuffer = '';

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
        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: aiText } : msg));
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

  const toggleListening = (e) => {
    if (e) e.preventDefault();

    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
      return;
    }

    if (isSpeaking || isLoading) stopEverything();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Use Chrome/Safari/Edge for voice.");

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    finalTranscriptRef.current = '';
    isProcessingRef.current = false;
    setMicConfidence(0);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTextInput('🎤 Listening...');
    };

    recognition.onresult = (event) => {
      if (isProcessingRef.current) return;

      let interim = '';
      let final = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        const conf = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          final += transcript + ' ';
          confidence = Math.max(confidence, conf);
        } else {
          interim += transcript;
        }
      }

      finalTranscriptRef.current = final.trim();
      setMicConfidence(Math.round(confidence * 100));

      const fullText = (final + interim).trim();
      setTextInput(fullText || '🎤 Listening...');

      if (final.trim().length > 0) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (!isProcessingRef.current && finalTranscriptRef.current.length > 0) {
            isProcessingRef.current = true;
            recognitionRef.current?.stop();
            setIsListening(false);
          }
        }, 3000);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      if (event.error !== 'no-speech') {
        setTextInput(`❌ ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const finalText = finalTranscriptRef.current.trim();

      if (finalText && !isProcessingRef.current) {
        isProcessingRef.current = true;
        setTimeout(() => sendMessageToBackend(finalText), 100);
      } else if (!finalText) {
        setTextInput('');
      }
    };

    recognition.start();
  };

  // --- NEW: OTP HANDLERS ---
  const handleSendOtp = async () => {
    if (!email || !email.trim()) {
      setErrorMessage("Please enter a valid email");
      return;
    }

    try {
      setIsSendingOtp(true);
      setErrorMessage('');

      const res = await fetch(`${API_BASE_URL}/api/auth/otp/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.detail || "Failed to send OTP. Please try again.");
        return;
      }

      setSessionId(data.session_id);
      setAuthStep("otp");
      alert(`✅ Verification code sent to ${email}!\nCheck your inbox (and spam folder).`);

    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Is the backend running?");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setErrorMessage("Enter a valid 6-digit OTP");
      return;
    }

    if (!sessionId) {
      setErrorMessage("Missing session. Please request a new OTP.");
      return;
    }

    try {
      setIsSendingOtp(true);
      setErrorMessage('');

      const res = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          otp: otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.detail || "Failed to verify OTP. Try again.");
        return;
      }

      // Success! Navigate to dashboard
      setView("exhibitor-dash");
      setSessionId('');
      setOtp('');
      setAuthStep("email");
      setErrorMessage('');
      setEmail('');

    } catch (err) {
      console.error(err);
      setErrorMessage("Network error verifying OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // --- RENDERERS ---
  const renderLanding = () => (
    <div className="flex flex-col h-full items-center justify-center p-6 relative overflow-hidden animate-in fade-in z-10">
      <div className="z-10 text-center space-y-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-400 via-white to-slate-400 bg-[length:200%_auto] animate-shine">LUMIRA</h1>
          <p className="text-violet-200/60 text-lg">AI Exhibition Assistant</p>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full">
          <Button onClick={() => {
            setView('scanner');
            setTimeout(() => {
              const scannedFilename = files.length > 0 ? files[0].name : "InfoBotDataset.pdf";
              setActiveFile(scannedFilename);
              setHasInteracted(true);
              const greeting = getGreeting();
              const msg = `${greeting}. Connected to ${scannedFilename}.`;
              setMessages([{ id: 1, type: 'ai', text: msg }]);
              speakText(msg);
              setView('chat');
            }, 3000);
          }} icon={QrIcon} className="w-full py-4 text-lg">Scan Product QR</Button>
          <Button variant="secondary" onClick={() => setView('exhibitor-login')} className="w-full">Exhibitor Portal</Button>
        </div>
      </div>
    </div>
  );

  const renderScanner = () => (
    <div className="flex flex-col h-full bg-black relative animate-in fade-in z-20">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 opacity-50" />
      <div className="absolute top-6 left-6 z-20 cursor-pointer" onClick={() => setView('landing')}><X className="text-green-500 hover:text-white" /></div>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden z-10">
        <div className="relative w-72 h-72 border-2 border-green-500/50 rounded-3xl z-10 overflow-hidden bg-black/30 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,1)] animate-[scan_2s_linear_infinite]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <QrIcon size={128} className="text-green-500/20 animate-pulse" />
          </div>
        </div>
        <div className="absolute bottom-20 text-green-400 bg-black/80 border border-green-500/30 px-6 py-3 rounded-full backdrop-blur-md font-mono text-sm">Align QR Code...</div>
      </div>
    </div>
  );

  const renderExhibitorLogin = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 relative z-10 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />

        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Shield className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">Exhibitor Login</h2>
        <p className="text-slate-400 text-center text-sm mb-8">
          {authStep === 'email' ? 'Enter your email to receive a verification code.' : `Enter the code sent to ${email}`}
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          {authStep === 'email' ? (
            <div>
              <label className="block text-slate-400 text-xs uppercase font-bold mb-2 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 p-3 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-600"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                />
              </div>
              <Button onClick={handleSendOtp} disabled={isSendingOtp} className="w-full mt-6">
                {isSendingOtp ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right">
              <label className="block text-slate-400 text-xs uppercase font-bold mb-2 ml-1">Verification Code</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setErrorMessage('');
                  }}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 p-3 text-white text-center tracking-[0.5em] font-mono text-lg focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-600 placeholder:tracking-normal"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                />
              </div>
              <Button onClick={handleVerifyOtp} disabled={isSendingOtp} className="w-full mt-6">
                {isSendingOtp ? 'Verifying...' : 'Verify & Login'}
              </Button>
              <button
                onClick={() => {
                  setAuthStep('email');
                  setOtp('');
                  setErrorMessage('');
                }}
                className="w-full mt-4 text-sm text-slate-500 hover:text-violet-400 transition-colors"
              >
                Change Email
              </button>
            </div>
          )}

          <Button variant="ghost" onClick={() => {
            setView('landing');
            setAuthStep('email');
            setEmail('');
            setOtp('');
            setErrorMessage('');
            setSessionId('');
          }} className="w-full text-sm mt-2">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );

  const renderExhibitorDash = () => (
    <div className="flex h-full z-10 relative">
      <div className="w-64 border-r border-slate-800/50 bg-slate-900/60 backdrop-blur-md hidden md:flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8"><div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center"><Sparkles className="text-white" size={16} /></div><span className="text-xl font-bold text-white">LUMIRA</span></div>
        <div className="space-y-2 flex-1"><div className="flex items-center gap-3 px-4 py-3 bg-violet-600/10 text-violet-400 rounded-xl border border-violet-600/20"><BarChart3 size={20} /><span className="font-medium">Dashboard</span></div></div>
        <button onClick={() => setView('landing')} className="flex items-center gap-3 text-slate-400 hover:text-white"><LogOut size={20} /> Logout</button>
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
                <div>
                  <p className="text-white text-sm font-medium">{f.name}</p>
                  <p className="text-slate-500 text-xs">{f.size}</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-xs font-bold px-3 py-1 rounded-full font-mono ${f.status === 'Active' ? 'text-violet-400 bg-violet-400/10' : 'text-green-400 bg-green-400/10'}`}>
                    {f.status === 'Active' ? "● ACTIVE" : "ANALYZING..."}
                </div>
                <button onClick={() => setShowQrFor(f.name)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><QrIcon size={18} /></button>
                <button onClick={() => handleDeleteFile(f.name)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* QR MODAL */}
        {showQrFor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
                <div className="bg-slate-900 border border-green-500/50 p-8 rounded-2xl max-w-sm w-full text-center relative shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                    <button onClick={() => setShowQrFor(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X/></button>
                    <div className="mb-6">
                        <span className="text-[10px] font-bold tracking-[0.2em] text-green-500 uppercase bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">TARGET LOCKED</span>
                        <h3 className="text-xl font-bold text-white mt-4 break-words font-mono">{showQrFor}</h3>
                    </div>
                    <div className="flex justify-center p-4 bg-black border border-green-500/30 rounded-xl mb-6">
                        <QRCode value={`${CLIENT_URL}/?project=${showQrFor}`} size={220} fgColor="#22c55e" bgColor="#000000" style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                    </div>
                    <p className="text-xs text-green-500/60 font-mono">SCAN_TO_INITIATE_UPLINK</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 z-10 relative">

      {/* 🔒 TAP TO CONNECT OVERLAY (Fixes Audio Auto-Play Block) */}
      {!hasInteracted && isLocked && (
          <div
            onClick={handleInitialInteraction}
            className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-in fade-in duration-500"
          >
              <div className="w-24 h-24 bg-violet-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(124,58,237,0.5)] animate-pulse mb-8">
                  <Zap size={48} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Secure Link Established</h2>
              <p className="text-violet-300 mb-8">Tap anywhere to initialize audio uplink</p>
              <div className="px-6 py-3 border border-violet-500/50 rounded-full text-sm font-mono text-violet-400 animate-pulse">
                  {">"} CLICK_TO_CONNECT_
              </div>
          </div>
      )}

      <div className="h-16 border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
            {!isLocked && (<button onClick={() => setView('landing')} className="text-slate-400 hover:text-white"><ChevronLeft /></button>)}
            <div className="flex flex-col">
                <span className="text-white font-medium text-sm">Lumira Assistant</span>
                {isLocked ? (
                   <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs text-green-400 font-mono">{activeFile}</span>
                   </div>
                ) : (
                    <select className="bg-slate-800 text-xs text-violet-400 border border-slate-700 rounded px-2 py-1 mt-1 outline-none" value={activeFile || ""} onChange={(e) => setActiveFile(e.target.value)}>
                        <option value="" disabled>Select a Project</option>
                        {files.map((f, i) => ( <option key={i} value={f.name}>{f.name}</option> ))}
                    </select>
                )}
            </div>
        </div>

        <button onClick={handleResetChat} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-red-500/20 rounded-full transition-colors border border-transparent hover:border-red-500/50" title="Restart Conversation">
            <RefreshCw size={18} />
        </button>

      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 backdrop-blur-sm ${msg.type === 'user' ? 'bg-violet-600/90 text-white shadow-lg' : 'bg-slate-800/80 text-slate-200 border border-slate-700/50'}`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-center my-4">
                <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-800/50 bg-slate-900/60 backdrop-blur-md relative">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={isLoading ? "Processing (Tap Mic to Interrupt)..." : "Hold mic to speak..."}
                className="w-full bg-slate-800/80 text-white rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border border-slate-700/50"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        sendMessageToBackend(textInput);
                    }
                }}
            />
            <button
                onClick={() => sendMessageToBackend(textInput)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-violet-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
                <Send size={18} />
            </button>
          </div>

          <button
            onMouseDown={toggleListening}
            onMouseUp={toggleListening}
            onMouseLeave={() => isListening && toggleListening()} // Safety valve
            onTouchStart={toggleListening}
            onTouchEnd={toggleListening}
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
                  <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 animate-pulse">
                      <Mic size={48} className="text-white" />
                  </div>
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
      {view === 'scanner' && renderScanner()}
      {view === 'chat' && renderChat()}
      {view === 'exhibitor-login' && renderExhibitorLogin()}
      {view === 'exhibitor-dash' && renderExhibitorDash()}
    </div>
  );
}