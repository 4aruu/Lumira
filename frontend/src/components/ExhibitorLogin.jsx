import React, { useState } from 'react';
import { Shield, Mail, Lock } from 'lucide-react';
import { API_BASE_URL } from '../config';
import Button from './Button';
import WaterFlow from './WaterFlow';

const ExhibitorLogin = ({ onNavigate, onLoginSuccess }) => {
    const [authStep, setAuthStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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
            onLoginSuccess();
        } catch (err) { setErrorMessage("Network error."); }
    };

    return (
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
                            onClick={() => onNavigate('landing')}
                            className="w-full mt-4 text-sm text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 py-3 rounded-2xl transition-all border border-transparent hover:border-white/10"
                        >
                            Back to Home
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExhibitorLogin;
