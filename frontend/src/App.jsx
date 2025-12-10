import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Send, QrCode, UploadCloud, FileText, BarChart3,
  Users, Settings, ChevronLeft, X, MessageSquare,
  Sparkles, Zap, Shield, MoreVertical, LogOut, User, Mail, Lock
} from 'lucide-react';

// --- Components ---

const Waveform = ({ isActive }) => (
  <div className={`flex items-center gap-1 h-8 ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={`w-1 bg-violet-400 rounded-full animate-pulse`}
        style={{
          height: isActive ? `${Math.random() * 100}%` : '4px',
          animationDuration: `${0.5 + Math.random() * 0.5}s`
        }}
      />
    ))}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 shadow-lg relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-violet-500/25 border border-white/10",
    secondary: "bg-slate-800/80 backdrop-blur text-slate-200 hover:bg-slate-700/80 border border-slate-700",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white shadow-none"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />
      <span className="relative z-20 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        {children}
      </span>
    </button>
  );
};

export default function App() {
  const [view, setView] = useState('landing');

  // --- Visitor State ---
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', text: "Hello! I'm Lumira. Ask me anything about the products on display!" }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // --- Auth State (New) ---
  const [authStep, setAuthStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // --- VOICE LOGIC ---
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
      utterance.voice = preferredVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- API CONNECTION ---
  const handleSendMessage = async () => {
    if (!textInput.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', text: textInput };
    setMessages(prev => [...prev, userMsg]);
    const messageToSend = textInput;
    setTextInput('');
    setIsLoading(true);

    try {
      const aiMsgId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiMsgId, type: 'ai', text: '' }]);

      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!response.body) throw new Error("ReadableStream not supported.");

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

        setMessages(prev =>
          prev.map(msg => msg.id === aiMsgId ? { ...msg, text: aiText } : msg)
        );
      }

      if (sentenceBuffer.trim()) {
          speakText(sentenceBuffer);
      }

    } catch (error) {
      console.error("Stream Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        type: 'ai',
        text: "⚠️ Connection interrupted. Please check backend."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = () => {
    setView('scanner');
    setTimeout(() => setView('chat'), 2500);
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input requires Chrome/Edge/Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTextInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- Exhibitor Logic ---
  const [files, setFiles] = useState([]);
  const handleFileUpload = async () => {
    const dummyContent = "Manual content...";
    const blob = new Blob([dummyContent], { type: 'text/plain' });
    const file = new File([blob], "manual_upload.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", file);

    try {
        await fetch('http://127.0.0.1:8000/api/upload', { method: 'POST', body: formData });
        const newFile = { name: "manual_upload.txt", size: '12 KB', date: new Date().toLocaleDateString() };
        setFiles([newFile, ...files]);
        alert("File uploaded to backend 'Dataset' folder!");
    } catch (error) {
        alert("Upload failed. Is backend running?");
    }
  };

  // --- Auth Logic (Mock) ---
  const handleSendOtp = () => {
    if (!email) return alert("Please enter an email");
    setIsSendingOtp(true);
    // Simulate AWS SES/Cognito delay
    setTimeout(() => {
        setIsSendingOtp(false);
        setAuthStep('otp');
        alert(`OTP sent to ${email} (Check console/mock)`);
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) return alert("Enter valid 6-digit OTP");
    setIsSendingOtp(true);
    // Simulate Verification
    setTimeout(() => {
        setIsSendingOtp(false);
        setAuthStep('email'); // Reset for next time
        setOtp('');
        setView('exhibitor-dash');
    }, 1000);
  };

  // --- Views ---
  const renderLanding = () => (
    <div className="flex flex-col h-full items-center justify-center p-6 relative overflow-hidden animate-in fade-in z-10">
      <div className="z-10 text-center space-y-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-400 via-white to-slate-400 bg-[length:200%_auto] animate-shine drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            LUMIRA
          </h1>
          <p className="text-violet-200/60 text-lg">AI Exhibition Assistant</p>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full">
          <Button onClick={handleScan} icon={QrCode} className="w-full py-4 text-lg">Scan Product QR</Button>
          <Button variant="secondary" onClick={() => setView('exhibitor-login')} className="w-full">Exhibitor Portal</Button>
        </div>
      </div>
    </div>
  );

  const renderExhibitorLogin = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 relative z-10 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-2xl relative overflow-hidden">
        {/* Shine effect on card */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />

        <div className="flex justify-center mb-6">
           <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
             <Shield className="text-white" />
           </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">Exhibitor Login</h2>
        <p className="text-slate-400 text-center text-sm mb-8">
            {authStep === 'email' ? 'Enter your registered email to receive an OTP.' : `Enter the code sent to ${email}`}
        </p>

        <div className="space-y-4">
            {authStep === 'email' ? (
                <div>
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2 ml-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 p-3 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                    <Button onClick={handleSendOtp} disabled={isSendingOtp} className="w-full mt-6">
                        {isSendingOtp ? 'Sending...' : 'Send Access Code'}
                    </Button>
                </div>
            ) : (
                <div className="animate-in slide-in-from-right">
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2 ml-1">One-Time Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 p-3 text-white text-center tracking-[0.5em] font-mono text-lg focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all placeholder:text-slate-600 placeholder:tracking-normal"
                        />
                    </div>
                    <Button onClick={handleVerifyOtp} disabled={isSendingOtp} className="w-full mt-6">
                        {isSendingOtp ? 'Verifying...' : 'Verify & Login'}
                    </Button>
                    <button onClick={() => setAuthStep('email')} className="w-full mt-4 text-sm text-slate-500 hover:text-violet-400 transition-colors">
                        Change Email
                    </button>
                </div>
            )}

            <Button variant="ghost" onClick={() => setView('landing')} className="w-full text-sm mt-2">Back to Home</Button>
        </div>
      </div>
    </div>
  );

  const renderScanner = () => (
    <div className="flex flex-col h-full bg-black relative animate-in fade-in z-20">
      <div className="absolute top-6 left-6 z-20" onClick={() => setView('landing')}><X className="text-white" /></div>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 opacity-50" />
        <div className="relative w-72 h-72 border-2 border-violet-500/50 rounded-3xl z-10 overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan_2s_linear_infinite]"></div>
        </div>
        <div className="absolute bottom-20 text-white bg-black/60 px-6 py-3 rounded-full backdrop-blur-md">Align QR Code</div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300 z-10 relative">
      <div className="h-16 border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 z-20">
        <button onClick={() => setView('landing')} className="text-slate-400 hover:text-white"><ChevronLeft /></button>
        <span className="text-white font-medium">Lumira Assistant</span>
        <MoreVertical className="text-slate-400" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 backdrop-blur-sm ${
              msg.type === 'user'
                ? 'bg-violet-600/90 text-white shadow-lg shadow-violet-500/10 border border-violet-500/20'
                : 'bg-slate-800/80 text-slate-200 border border-slate-700/50'
            }`}>

              {msg.type === 'user' && (
                <div className="flex items-center justify-end gap-2 mb-2 text-violet-200 text-xs font-bold uppercase">
                  YOU <User size={12}/>
                </div>
              )}

              {msg.type === 'ai' && (
                <div className="flex items-center gap-2 mb-2 text-violet-400 text-xs font-bold uppercase">
                  <Sparkles size={12}/> Lumira AI
                </div>
              )}

              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && !messages[messages.length - 1]?.text && <div className="text-slate-500 text-xs text-center animate-pulse">Thinking...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-800/50 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
            <div className="flex-1 relative">
                <input
                    type="text" value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Ask about this product..."
                    className="w-full bg-slate-800/80 text-white rounded-full pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border border-slate-700/50 placeholder:text-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white"><Send size={16} /></button>
            </div>
            <button onClick={toggleListening} className={`p-3 rounded-full border transition-all duration-300 ${isListening ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-slate-800/80 border-slate-700/50 text-violet-400'}`}>
                <Mic size={24} />
            </button>
        </div>
      </div>
    </div>
  );

  const renderExhibitorDash = () => (
    <div className="flex h-full z-10 relative">
      <div className="w-64 border-r border-slate-800/50 bg-slate-900/60 backdrop-blur-md hidden md:flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8"><div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center"><Sparkles className="text-white" size={16}/></div><span className="text-xl font-bold text-white">LUMIRA</span></div>
        <div className="space-y-2 flex-1">
             <div className="flex items-center gap-3 px-4 py-3 bg-violet-600/10 text-violet-400 rounded-xl border border-violet-600/20"><BarChart3 size={20}/><span className="font-medium">Dashboard</span></div>
        </div>
        <button onClick={() => setView('landing')} className="flex items-center gap-3 text-slate-400 hover:text-white"><LogOut size={20}/> Logout</button>
      </div>
      <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Base</h2>
        <div className="border-2 border-dashed border-slate-700/50 rounded-xl p-12 text-center bg-slate-900/40 cursor-pointer hover:border-violet-500/50 transition-colors backdrop-blur-sm" onClick={handleFileUpload}>
            <UploadCloud size={48} className="mx-auto text-violet-400 mb-4"/>
            <p className="text-white font-medium">Click to upload Datasheet</p>
            <p className="text-slate-500 text-sm mt-1">Files will be saved to /Dataset folder</p>
        </div>
        <div className="mt-8 space-y-3">
             {files.map((f, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50"><div className="flex items-center gap-3"><FileText className="text-slate-400"/><span className="text-white text-sm">{f.name}</span></div><span className="text-green-400 text-xs">Uploaded</span></div>
             ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen text-white font-sans selection:bg-violet-500/30 overflow-hidden relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">

      {/* --- GLOBAL BREATHING GLOW EFFECT --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[120px] animate-blob" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-fuchsia-600/5 blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {view === 'landing' && renderLanding()}
      {view === 'scanner' && renderScanner()}
      {view === 'chat' && renderChat()}
      {view === 'exhibitor-login' && renderExhibitorLogin()}
      {view === 'exhibitor-dash' && renderExhibitorDash()}
    </div>
  );
}