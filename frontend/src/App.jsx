import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Send, QrCode, UploadCloud, FileText, BarChart3,
  Users, Settings, ChevronLeft, X, MessageSquare,
  Sparkles, Zap, Shield, MoreVertical, LogOut
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

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 shadow-lg";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-violet-500/25 border border-white/10",
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white shadow-none"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-5 h-5" />}
      {children}
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

  // --- API CONNECTION LOGIC (UPDATED) ---
  const handleSendMessage = async () => {
    if (!textInput.trim()) return;

    // 1. Update UI immediately with user message
    const userMsg = { id: Date.now(), type: 'user', text: textInput };
    setMessages(prev => [...prev, userMsg]);
    const messageToSend = textInput;
    setTextInput('');
    setIsLoading(true);

    try {
      // 2. Send to Backend (Real Connection)
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend }),
      });

      const data = await response.json();

      // 3. Display AI Response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: data.response
      }]);

    } catch (error) {
      console.error("Connection Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: "⚠️ Error: Could not reach Lumira Backend. Is main.py running on port 8000?"
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
    // Basic Simulation for now
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setTextInput("What connects this device?");
      }, 2000);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- Exhibitor State ---
  const [files, setFiles] = useState([]);

  // --- API UPLOAD LOGIC (UPDATED) ---
  const handleFileUpload = async () => {
    // Simulating file pick for prototype
    const dummyContent = "Manual content...";
    const blob = new Blob([dummyContent], { type: 'text/plain' });
    const file = new File([blob], "manual_upload.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", file);

    try {
        await fetch('http://127.0.0.1:8000/api/upload', {
            method: 'POST',
            body: formData,
        });
        const newFile = {
            name: "manual_upload.txt",
            size: '12 KB',
            date: new Date().toLocaleDateString()
        };
        setFiles([newFile, ...files]);
        alert("File uploaded to backend 'Dataset' folder!");
    } catch (error) {
        alert("Upload failed. Is backend running?");
    }
  };

  // --- Render Views ---
  const renderLanding = () => (
    <div className="flex flex-col h-full items-center justify-center p-6 relative overflow-hidden animate-in fade-in">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.2),transparent_50%)]" />
      <div className="z-10 text-center space-y-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">LUMIRA</h1>
          <p className="text-violet-200/60 text-lg">AI Exhibition Assistant</p>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full">
          <Button onClick={handleScan} icon={QrCode} className="w-full py-4 text-lg">Scan Product QR</Button>
          <Button variant="secondary" onClick={() => setView('exhibitor-dash')} className="w-full">Exhibitor Portal</Button>
        </div>
      </div>
    </div>
  );

  const renderScanner = () => (
    <div className="flex flex-col h-full bg-black relative animate-in fade-in">
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
    <div className="flex flex-col h-full bg-slate-950 animate-in slide-in-from-right duration-300">
      <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-20">
        <button onClick={() => setView('landing')} className="text-slate-400 hover:text-white"><ChevronLeft /></button>
        <span className="text-white font-medium">Headphones X1</span>
        <MoreVertical className="text-slate-400" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${msg.type === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
              {msg.type === 'ai' && <div className="flex items-center gap-2 mb-2 text-violet-400 text-xs font-bold uppercase"><Sparkles size={12}/> Lumira AI</div>}
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && <div className="text-slate-500 text-xs text-center animate-pulse">Thinking...</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-3">
            <div className="flex-1 relative">
                <input
                    type="text" value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Ask about this product..."
                    className="w-full bg-slate-800 text-white rounded-full pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 border border-slate-700"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white"><Send size={16} /></button>
            </div>
            <button onClick={toggleListening} className={`p-3 rounded-full border ${isListening ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-violet-400'}`}><Mic size={24} /></button>
        </div>
      </div>
    </div>
  );

  const renderExhibitorDash = () => (
    <div className="flex h-full bg-slate-950">
      <div className="w-64 border-r border-slate-800 bg-slate-900 hidden md:flex flex-col p-6">
        <div className="flex items-center gap-3 mb-8"><div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center"><Sparkles className="text-white" size={16}/></div><span className="text-xl font-bold text-white">LUMIRA</span></div>
        <div className="space-y-2 flex-1">
             <div className="flex items-center gap-3 px-4 py-3 bg-violet-600/10 text-violet-400 rounded-xl border border-violet-600/20"><BarChart3 size={20}/><span className="font-medium">Dashboard</span></div>
        </div>
        <button onClick={() => setView('landing')} className="flex items-center gap-3 text-slate-400 hover:text-white"><LogOut size={20}/> Logout</button>
      </div>
      <div className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Base</h2>
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center bg-slate-900/50 cursor-pointer hover:border-violet-500 transition-colors" onClick={handleFileUpload}>
            <UploadCloud size={48} className="mx-auto text-violet-400 mb-4"/>
            <p className="text-white font-medium">Click to upload Datasheet</p>
            <p className="text-slate-500 text-sm mt-1">Files will be saved to /Dataset folder</p>
        </div>
        <div className="mt-8 space-y-3">
             {files.map((f, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700"><div className="flex items-center gap-3"><FileText className="text-slate-400"/><span className="text-white text-sm">{f.name}</span></div><span className="text-green-400 text-xs">Uploaded</span></div>
             ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-slate-950 text-white font-sans selection:bg-violet-500/30 overflow-hidden">
      {view === 'landing' && renderLanding()}
      {view === 'scanner' && renderScanner()}
      {view === 'chat' && renderChat()}
      {view === 'exhibitor-dash' && renderExhibitorDash()}
    </div>
  );
}