import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCodeLib from "qrcode";
import {
  Mic, Send, QrCode as QrIcon, Download,
  UploadCloud, FileText, BarChart3,
  ChevronLeft, X, Sparkles, LogOut, Trash2, RefreshCw, Zap, Shield, Mail, Lock, Play,
  Users, MessageSquare, Clock, Activity
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
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 400);
      g1.addColorStop(0, 'rgba(139, 92, 246, 0.25)'); g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, 400, 400);
      const g2 = ctx.createRadialGradient(canvas.width, 0, 0, canvas.width, 0, 400);
      g2.addColorStop(0, 'rgba(139, 92, 246, 0.25)'); g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(canvas.width - 400, 0, 400, 400);
      if (particles.length < 40) {
        const isLeft = Math.random() > 0.5;
        particles.push({
          x: isLeft ? Math.random() * 150 : canvas.width - Math.random() * 150,
          y: -10, v: Math.random() * 1.5 + 0.5, s: Math.random() * 2, o: Math.random()
        });
      }
      particles.forEach((p, i) => {
        p.y += p.v; p.o -= 0.005;
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
        if (p.o <= 0) particles.splice(i, 1);
      });
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(id); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

const WaterFlow = () => {
  return (
    <div className="water-flow-bg">
      <div className="water-blob"></div>
      <div className="water-blob"></div>
      <div className="water-blob"></div>
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 shadow-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed z-10";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-violet-500/25 border border-white/10",
    secondary: "bg-slate-800/80 backdrop-blur text-slate-200 hover:bg-slate-700/80 border border-slate-700",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white shadow-none"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className} btn-primary`}>
      <span className="relative z-20 flex items-center gap-2">{Icon && <Icon className="w-5 h-5" />}{children}</span>
    </button>
  );
};

/* ==========================================================================
   ANIMATED QR CODE COMPONENT
   ========================================================================== */
const AnimatedQR = ({ value, size = 280 }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const matrixRef = useRef(null);
  const startTimeRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Generate QR matrix on mount
  useEffect(() => {
    if (!value) return;
    setReady(false);
    particlesRef.current = [];
    startTimeRef.current = null;

    QRCodeLib.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: size,
      color: { dark: '#a78bfa', light: '#00000000' }
    }).then(() => {
      // Get the raw module data
      const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
      const modules = qr.modules;
      matrixRef.current = modules;
      initParticles(modules);
      setReady(true);
    }).catch(console.error);
  }, [value, size]);

  const initParticles = useCallback((modules) => {
    const moduleCount = modules.size;
    const margin = 2;
    const totalModules = moduleCount + margin * 2;
    const cellSize = size / totalModules;
    const particles = [];

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const targetX = (col + margin) * cellSize + cellSize / 2;
          const targetY = (row + margin) * cellSize + cellSize / 2;
          // Random spawn position
          const angle = Math.random() * Math.PI * 2;
          const dist = size * 0.6 + Math.random() * size * 0.5;
          particles.push({
            x: size / 2 + Math.cos(angle) * dist,
            y: size / 2 + Math.sin(angle) * dist,
            targetX,
            targetY,
            cellSize,
            // Stagger by row for wave effect
            delay: (row / moduleCount) * 0.4 + Math.random() * 0.15,
            arrived: false,
            alpha: 0,
            glowAlpha: 1,
          });
        }
      }
    }
    particlesRef.current = particles;
  }, [size]);

  // Animation loop
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = size * 2; // 2x for retina
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(2, 2);

    const ANIM_DURATION = 2.0; // seconds

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, size, size);

      const particles = particlesRef.current;
      let allArrived = true;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const t = Math.max(0, Math.min(1, (elapsed - p.delay) / (ANIM_DURATION - p.delay)));
        const eased = easeOutCubic(t);

        const cx = p.x + (p.targetX - p.x) * eased;
        const cy = p.y + (p.targetY - p.y) * eased;
        p.alpha = Math.min(1, t * 3); // fade in quickly

        if (t < 1) allArrived = false;

        const half = p.cellSize / 2;

        // Trail / glow during flight
        if (t < 0.95) {
          ctx.save();
          ctx.shadowColor = '#a78bfa';
          ctx.shadowBlur = 8 + (1 - t) * 12;
          ctx.globalAlpha = p.alpha * 0.6;
          ctx.fillStyle = '#c4b5fd';
          ctx.beginPath();
          ctx.arc(cx, cy, half * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Main module
        ctx.save();
        ctx.globalAlpha = p.alpha;
        const moduleScale = t < 1 ? 0.4 + eased * 0.6 : 1;
        const drawSize = p.cellSize * moduleScale;
        const r = drawSize * 0.15; // rounded corners

        // Gradient fill per module
        const grad = ctx.createLinearGradient(cx - half, cy - half, cx + half, cy + half);
        grad.addColorStop(0, '#a78bfa');
        grad.addColorStop(1, '#818cf8');
        ctx.fillStyle = grad;

        // Rounded rect
        const rx = cx - drawSize / 2;
        const ry = cy - drawSize / 2;
        ctx.beginPath();
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + drawSize - r, ry);
        ctx.quadraticCurveTo(rx + drawSize, ry, rx + drawSize, ry + r);
        ctx.lineTo(rx + drawSize, ry + drawSize - r);
        ctx.quadraticCurveTo(rx + drawSize, ry + drawSize, rx + drawSize - r, ry + drawSize);
        ctx.lineTo(rx + r, ry + drawSize);
        ctx.quadraticCurveTo(rx, ry + drawSize, rx, ry + drawSize - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Idle glow pulse after arrival
      if (allArrived && elapsed > ANIM_DURATION + 0.5) {
        const pulse = 0.03 * Math.sin((elapsed - ANIM_DURATION) * 2);
        ctx.save();
        ctx.globalAlpha = 0.15 + pulse;
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 20;
        for (const p of particles) {
          ctx.fillStyle = '#c4b5fd';
          ctx.fillRect(p.targetX - p.cellSize / 2, p.targetY - p.cellSize / 2, p.cellSize, p.cellSize);
        }
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [ready, size]);

  // Export function: renders a clean full QR to an offscreen canvas
  const handleExport = useCallback(() => {
    if (!matrixRef.current) return;
    const modules = matrixRef.current;
    const exportSize = 1024;
    const moduleCount = modules.size;
    const margin = 2;
    const totalModules = moduleCount + margin * 2;
    const cellSize = exportSize / totalModules;

    const offscreen = document.createElement('canvas');
    offscreen.width = exportSize;
    offscreen.height = exportSize;
    const ctx = offscreen.getContext('2d');

    // Dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, exportSize, exportSize);

    // Draw modules
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = (col + margin) * cellSize;
          const y = (row + margin) * cellSize;
          const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
          grad.addColorStop(0, '#a78bfa');
          grad.addColorStop(1, '#818cf8');
          ctx.fillStyle = grad;
          const r = cellSize * 0.15;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + cellSize - r, y);
          ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + r);
          ctx.lineTo(x + cellSize, y + cellSize - r);
          ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
          ctx.lineTo(x + r, y + cellSize);
          ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    const link = document.createElement('a');
    link.download = `Lumira-QR.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{
        padding: '16px',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: '20px',
        boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      <button
        onClick={handleExport}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 24px', borderRadius: '9999px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(139,92,246,0.3)',
          color: '#c4b5fd', fontSize: '0.85rem', fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.25s ease',
          boxShadow: '0 4px 16px rgba(139,92,246,0.15)'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(99,102,241,0.25))'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,92,246,0.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))'; e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,92,246,0.15)'; }}
      >
        <Download size={16} />
        Download QR
      </button>
    </div>
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
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('lumira_voice') || 'ava');

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

  // --- ANALYTICS STATE ---
  const [analyticsData, setAnalyticsData] = useState(null);
  const sessionIdRef = useRef(null);
  const heartbeatRef = useRef(null);

  // --- REFS & AUDIO STATE ---
  const chatEndRef = useRef(null);
  const audioQueue = useRef([]);
  const isPlayingAudio = useRef(false);
  const currentAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // --- AUDIO RECORDING REFS ---
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isHoldRef = useRef(false);
  const streamRef = useRef(null);

  useEffect(() => { fetchUploadedFiles(); fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analytics`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) { console.error('Analytics fetch error:', e); }
  };

  // Session tracking: start on QR-scan entry, heartbeat every 30s
  const startAnalyticsSession = (project) => {
    const sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionIdRef.current = sid;
    fetch(`${API_BASE_URL}/api/analytics/session/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid, project })
    }).catch(() => { });
    // Heartbeat
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (!sessionIdRef.current) return;
      fetch(`${API_BASE_URL}/api/analytics/session/heartbeat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current })
      }).catch(() => { });
    }, 30000);
  };

  // Cleanup heartbeat on unmount
  useEffect(() => () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); }, []);

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
      startAnalyticsSession(projectParam);
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
    audioQueue.current = [];
    isPlayingAudio.current = false;
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

  // --- OPTIMIZED AUDIO ENGINE ---
  const processAudioQueue = async () => {
    if (isPlayingAudio.current || audioQueue.current.length === 0) return;
    isPlayingAudio.current = true;
    const nextAudioUrl = audioQueue.current.shift();
    const audio = new Audio(nextAudioUrl);
    currentAudioRef.current = audio;

    audio.onended = () => {
      isPlayingAudio.current = false;
      currentAudioRef.current = null;
      URL.revokeObjectURL(nextAudioUrl);
      processAudioQueue();
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      isPlayingAudio.current = false;
      currentAudioRef.current = null;
      URL.revokeObjectURL(nextAudioUrl);
      // Don't auto-retry to avoid infinite loop
    };

    try {
      await audio.play();
    } catch (e) {
      console.error("Audio play() failed:", e);
      isPlayingAudio.current = false;
      currentAudioRef.current = null;
      URL.revokeObjectURL(nextAudioUrl);
    }
  };

  const speakText = async (text) => {
    if (!text?.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/speak?text=${encodeURIComponent(text)}&voice=${selectedVoice}`);
      if (!response.ok) return;
      const blob = await response.blob();
      audioQueue.current.push(URL.createObjectURL(blob));
      processAudioQueue();
    } catch (error) { }
  };

  const changeVoice = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem('lumira_voice', voice);
  };

  // Warm up mic on load for instant recording
  useEffect(() => {
    const warmupMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (err) { console.warn("Mic warmup failed", err); }
    };
    warmupMic();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);


  const startRecording = async (e) => {
    if (e?.cancelable) e.preventDefault();
    if (isListening || isHoldRef.current) return;
    isHoldRef.current = true;
    setTextInput("🎤 Listening...");
    try {
      let stream = streamRef.current;
      if (!stream?.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      if (!isHoldRef.current) return;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceUpload(audioBlob);
      };
      mediaRecorderRef.current.start(100);
      setIsListening(true);
    } catch (err) {
      console.error("Mic Error", err);
      isHoldRef.current = false;
    }
  };

  const stopRecording = (e) => {
    if (e?.cancelable) e.preventDefault();
    isHoldRef.current = false;
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceUpload = async (audioBlob) => {
    setIsLoading(true);
    setTextInput("Processing Voice...");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout (increased from 30s)
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
        setTextInput("");
        setIsLoading(false);
      }
    } catch (e) {
      console.error("STT Error:", e);
      setTextInput("");
      setIsLoading(false);
      if (e.name === 'AbortError') {
        alert("Voice processing timed out (60s). Please try again with a shorter message.");
      } else {
        alert("Could not process audio. Check your connection and try again.");
      }
    }
  };

  // --- CHAT LOGIC ---
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
    <div className="flex flex-col h-full items-center justify-center p-6 relative overflow-hidden z-10">
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
            <img src="/lumira-logo.png" alt="Lumira" style={{ width: '72px', height: '72px', objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(139,92,246,0.5))' }} />
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
            onClick={() => setView('exhibitor-login')}
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
      </div>
    </div>
  );

  const renderExhibitorLogin = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 relative z-10">
      <WaterFlow />

      {/* Glass Morphism Login Card */}
      <div className="w-full max-w-md relative group">
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition duration-500"></div>

        {/* Main Card */}
        <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-2xl">

          {/* Icon Header with Clay Effect */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-600/30 rounded-2xl blur-xl"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 border border-white/10">
                <Shield className="text-white w-8 h-8" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white text-center mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-violet-200">
            Exhibitor Login
          </h2>
          <p className="text-slate-400 text-center text-sm mb-10">
            {authStep === 'email' ? 'Enter your email for verification' : `Enter code sent to ${email}`}
          </p>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="space-y-6">
            {authStep === 'email' ? (
              <div className="space-y-6">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 z-10" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-950/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                  {isSendingOtp ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 z-10" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-950/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl pl-12 pr-4 py-4 text-white text-center tracking-[0.5em] font-mono text-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={isSendingOtp}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                  Verify & Login
                </Button>
                <button
                  onClick={() => { setAuthStep('email'); setOtp(''); }}
                  className="w-full text-sm text-slate-400 hover:text-violet-400 transition-colors py-2"
                >
                  Change Email
                </button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => setView('landing')}
              className="w-full mt-4 text-sm text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 py-3 rounded-2xl transition-all border border-transparent hover:border-white/10"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDash = () => (
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
          onClick={() => { setView('landing'); setIsAdmin(false); }}
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
            onClick={fetchAnalytics}
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

        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="application/pdf" />

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
                    onClick={() => {
                      setActiveFile(f.name);
                      setIsAdmin(true);
                      setIsLocked(true);
                      setHasInteracted(true);
                      setMessages([{ id: Date.now(), type: 'ai', text: `${getGreeting()}. Connected to ${f.name}.` }]);
                      setView('chat');
                    }}
                    className="p-3 text-violet-400 hover:text-white hover:bg-violet-600/20 rounded-xl transition-all border border-transparent hover:border-violet-500/50"
                  >
                    <Play size={20} />
                  </button>
                  <button
                    onClick={() => setShowQrFor(f.name)}
                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all border border-transparent hover:border-white/10"
                  >
                    <QrIcon size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(f.name)}
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
                  onClick={() => setShowQrFor(null)}
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

  const renderChat = () => (
    <div className="flex flex-col h-full z-10 relative" style={{ animation: 'land-fadeUp 0.5s ease-out both' }}>
      {/* Chat-specific styles */}
      <style>{`
        @keyframes chat-gradient-border { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes chat-msg-in { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes chat-pulse-ring { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.2);opacity:0} }
        @keyframes chat-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes chat-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes chat-wave { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
        .chat-msg-enter { animation: chat-msg-in 0.4s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* ── Tap-to-connect overlay (QR scanned sessions) ── */}
      {!hasInteracted && isLocked && (
        <div onClick={handleInitialInteraction} style={{
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
            <button onClick={() => isAdmin ? setView('exhibitor-dash') : setView('landing')}
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
              <select style={{ background: 'rgba(15,23,42,0.6)', fontSize: '0.7rem', color: '#a78bfa', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '8px', padding: '2px 8px', marginTop: '2px', outline: 'none' }} value={activeFile || ""} onChange={(e) => setActiveFile(e.target.value)}>
                <option value="" disabled>Select a Project</option>
                {files.map((f, i) => (<option key={i} value={f.name}>{f.name}</option>))}
              </select>
            )}
          </div>
        </div>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Input container with glow */}
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-1px', borderRadius: '9999px', background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.1),rgba(139,92,246,0.15))', backgroundSize: '200% 100%', animation: 'chat-shimmer 4s linear infinite', pointerEvents: 'none', opacity: 0.6 }} />
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isLoading ? "Processing..." : "Ask Lumira anything..."}
              style={{
                width: '100%', position: 'relative',
                background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
                color: '#fff', borderRadius: '9999px', padding: '14px 52px 14px 20px', fontSize: '0.9rem',
                border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 20px rgba(139,92,246,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessageToBackend(textInput); }}
            />
            <button
              onClick={() => sendMessageToBackend(textInput)}
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

          {/* Clay mic button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            onTouchCancel={stopRecording}
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

      {/* ── Immersive Listening Overlay ── */}
      {isListening && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, rgba(2,6,23,0.85) 60%)',
          backdropFilter: 'blur(24px)', pointerEvents: 'none',
          animation: 'land-fadeUp 0.3s ease-out both'
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
            {/* Center mic */}
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,rgba(239,68,68,0.3),rgba(220,38,38,0.2))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 50px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              animation: 'chat-float 2s ease-in-out infinite'
            }}>
              <Mic size={40} style={{ color: '#fca5a5', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }} />
            </div>
          </div>
          {/* Audio wave bars */}
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
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Listening...</h3>
          <p style={{ marginTop: '8px', color: 'rgba(252,165,165,0.7)', fontSize: '0.8rem' }}>Release to send</p>
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