import React, { useState, useEffect, useRef } from 'react';

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

export default MouseGlow;
