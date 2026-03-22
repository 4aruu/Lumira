import { useRef, useCallback, useState } from 'react';
import { API_BASE_URL } from '../config';

/**
 * Cross-platform audio playback hook.
 * Uses HTMLAudioElement + Blob URLs so that audio plays through the
 * device's MEDIA channel (loudspeaker) instead of the COMMUNICATION
 * channel (earpiece) that AudioContext defaults to on mobile.
 *
 * Queue-based: sentences are enqueued and played back-to-back.
 */
export default function useAudio() {
    const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('lumira_voice') || 'ava');
    const audioQueue = useRef([]);
    const isPlayingAudio = useRef(false);
    const currentAudioRef = useRef(null);

    /** Process the next item in the audio queue. */
    const processAudioQueue = useCallback(() => {
        if (isPlayingAudio.current || audioQueue.current.length === 0) return;
        isPlayingAudio.current = true;

        const blobUrl = audioQueue.current.shift();

        try {
            const audio = new Audio(blobUrl);
            currentAudioRef.current = audio;

            audio.onended = () => {
                URL.revokeObjectURL(blobUrl);
                isPlayingAudio.current = false;
                currentAudioRef.current = null;
                processAudioQueue();
            };

            audio.onerror = () => {
                console.error("Audio playback error");
                URL.revokeObjectURL(blobUrl);
                isPlayingAudio.current = false;
                currentAudioRef.current = null;
                processAudioQueue();
            };

            audio.play().catch(() => {
                URL.revokeObjectURL(blobUrl);
                isPlayingAudio.current = false;
                currentAudioRef.current = null;
                processAudioQueue();
            });
        } catch (e) {
            console.error("Audio create/play error:", e);
            URL.revokeObjectURL(blobUrl);
            isPlayingAudio.current = false;
            currentAudioRef.current = null;
            processAudioQueue();
        }
    }, []);

    const speakText = useCallback(async (text) => {
        if (!text?.trim()) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/speak?text=${encodeURIComponent(text)}&voice=${selectedVoice}`);
            if (!response.ok) return;
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            audioQueue.current.push(blobUrl);
            processAudioQueue();
        } catch (error) { }
    }, [selectedVoice, processAudioQueue]);

    const changeVoice = useCallback((voice) => {
        setSelectedVoice(voice);
        localStorage.setItem('lumira_voice', voice);
    }, []);

    const stopAudio = useCallback(() => {
        if (currentAudioRef.current) {
            try {
                currentAudioRef.current.pause();
                currentAudioRef.current.src = '';
            } catch (_) { }
        }
        // Revoke any queued blob URLs to free memory
        audioQueue.current.forEach(url => URL.revokeObjectURL(url));
        audioQueue.current = [];
        isPlayingAudio.current = false;
        currentAudioRef.current = null;
    }, []);

    /**
     * Unlock audio on user gesture.
     * Plays a silent Audio element to satisfy iOS autoplay restrictions.
     * Call from any user-initiated event (tap, click, touchstart).
     */
    const unlockAudio = useCallback(() => {
        const silence = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqmAAAAAAD/+1DEAAAGAAGn9AAAIgAANP8AAABMAAI0BgYGBh4eHDhw4eJiYuXl5+vr7fDw8vj4+v39/v////////////8HBwcPDw8fHx8vLy8/Pz9fX19/f3+fn5/v7+////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQxAAAAAADSAAAAAAAAANIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        silence.play().catch(() => { });
    }, []);

    return { speakText, changeVoice, stopAudio, selectedVoice, unlockAudio };
}
