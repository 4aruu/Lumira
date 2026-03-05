import { useRef, useCallback, useState } from 'react';
import { API_BASE_URL } from '../config';

/**
 * Cross-platform audio playback hook.
 * Uses Web Audio API (AudioContext) for iOS compatibility.
 * iOS Safari blocks HTMLAudioElement.play() when not directly triggered by user gesture,
 * but a resumed AudioContext can play any number of buffers once unlocked.
 */
export default function useAudio() {
    const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('lumira_voice') || 'ava');
    const audioQueue = useRef([]);
    const isPlayingAudio = useRef(false);
    const audioCtxRef = useRef(null);
    const currentSourceRef = useRef(null);

    /** Get or create AudioContext (lazy init). */
    const getAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioCtx();
        }
        // Resume if suspended (iOS suspends by default until user gesture)
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    }, []);

    /** Process the next item in the audio queue. */
    const processAudioQueue = useCallback(async () => {
        if (isPlayingAudio.current || audioQueue.current.length === 0) return;
        isPlayingAudio.current = true;

        const audioData = audioQueue.current.shift();
        const ctx = getAudioContext();

        try {
            const audioBuffer = await ctx.decodeAudioData(audioData);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            currentSourceRef.current = source;

            source.onended = () => {
                isPlayingAudio.current = false;
                currentSourceRef.current = null;
                processAudioQueue();
            };

            source.start(0);
        } catch (e) {
            console.error("Audio decode/play error:", e);
            isPlayingAudio.current = false;
            currentSourceRef.current = null;
            // Try the next item in queue even if this one failed
            processAudioQueue();
        }
    }, [getAudioContext]);

    const speakText = useCallback(async (text) => {
        if (!text?.trim()) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/speak?text=${encodeURIComponent(text)}&voice=${selectedVoice}`);
            if (!response.ok) return;
            // Get raw ArrayBuffer — needed for decodeAudioData
            const arrayBuffer = await response.arrayBuffer();
            audioQueue.current.push(arrayBuffer);
            processAudioQueue();
        } catch (error) { }
    }, [selectedVoice, processAudioQueue]);

    const changeVoice = useCallback((voice) => {
        setSelectedVoice(voice);
        localStorage.setItem('lumira_voice', voice);
    }, []);

    const stopAudio = useCallback(() => {
        if (currentSourceRef.current) {
            try { currentSourceRef.current.stop(); } catch (_) { }
        }
        audioQueue.current = [];
        isPlayingAudio.current = false;
        currentSourceRef.current = null;
    }, []);

    /**
     * Unlock AudioContext on user gesture.
     * Call this from any user-initiated event (tap, click, touchstart)
     * to ensure iOS allows audio playback later.
     */
    const unlockAudio = useCallback(() => {
        getAudioContext();
    }, [getAudioContext]);

    return { speakText, changeVoice, stopAudio, selectedVoice, unlockAudio };
}
