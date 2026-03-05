import React from 'react';

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

export default Button;
