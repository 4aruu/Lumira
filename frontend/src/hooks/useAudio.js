import { useRef, useCallback, useState } from 'react';
import { API_BASE_URL } from '../config';

/**
 * useAudio — cross-platform TTS playback hook.
 *
 * Architecture: pipelined fetch + sequential playback.
 *
 *   When speakText(sentence) is called, TWO things happen simultaneously:
 *
 *   1. FETCH starts IMMEDIATELY — the audio is fetched and decoded in parallel
 *      with the previous sentence still playing.
 *
 *   2. PLAYBACK is CHAINED — the playback chain waits for the previous sentence
 *      to finish, then plays this one as soon as its buffer is ready.
 *
 *   This eliminates the network round-trip gap between sentences.
 *   Instead of:   play1 → fetch2 → decode2 → play2 → fetch3 → ...
 *   We get:       play1        → play2        → play3
 *                 fetch2+dec2 ↗  fetch3+dec3 ↗
 *
 * Mobile compatibility:
 *   Uses AudioContext (not HTMLAudioElement). Once resume() is called inside
 *   a user gesture it stays permanently unlocked, so async playback works on
 *   iOS Safari and Android Chrome without restriction.
 *
 * Generation counter:
 *   stopAudio() bumps generationRef. Any in-flight fetch or queued playback
 *   that sees a generation mismatch exits silently — no phantom restarts.
 */
export default function useAudio() {
    const [selectedVoice, setSelectedVoice] = useState(
        () => localStorage.getItem('lumira_voice') || 'ava'
    );

    // Shared AudioContext — created lazily, resumed once inside a user gesture.
    const ctxRef = useRef(null);

    // Playback chain: each sentence appends to this so they play in order.
    const playTailRef = useRef(Promise.resolve());

    // Currently playing source node — kept so stopAudio() can stop it instantly.
    const currentSourceRef = useRef(null);

    // Generation counter — bumped on stopAudio() to discard stale work.
    const generationRef = useRef(0);

    /** Return the shared AudioContext, creating + resuming it if needed. */
    const _getCtx = useCallback(() => {
        if (!ctxRef.current) {
            ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ctxRef.current.state === 'suspended') {
            ctxRef.current.resume().catch(() => { });
        }
        return ctxRef.current;
    }, []);

    /**
     * unlockAudio — call synchronously inside the first user gesture.
     * Resumes the AudioContext and plays one silent frame so that Safari
     * permits all future async audio output.
     */
    const unlockAudio = useCallback(() => {
        const ctx = _getCtx();
        try {
            const buf = ctx.createBuffer(1, 1, 22050);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
        } catch (_) { }
    }, [_getCtx]);

    /**
     * speakText — enqueue a sentence for TTS playback.
     *
     * The fetch + decode starts IMMEDIATELY (parallel with previous playback).
     * The playback waits in the chain for its turn, but by then the buffer is
     * usually already ready — so sentences flow without gaps.
     */
    const speakText = useCallback((text) => {
        if (!text?.trim()) return;

        const myGeneration = generationRef.current;

        // ── Step 1: Start fetching NOW, in parallel with whatever is playing ──
        const bufferPromise = (async () => {
            try {
                const ctx = _getCtx();
                const res = await fetch(
                    `${API_BASE_URL}/api/speak?text=${encodeURIComponent(text)}&voice=${selectedVoice}`
                );
                if (!res.ok || generationRef.current !== myGeneration) return null;

                const arrayBuffer = await res.arrayBuffer();
                if (generationRef.current !== myGeneration) return null;

                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                if (generationRef.current !== myGeneration) return null;

                return audioBuffer;
            } catch (_) {
                return null;
            }
        })();

        // ── Step 2: Chain the PLAYBACK — wait for previous to finish, then play ──
        playTailRef.current = playTailRef.current.then(async () => {
            if (generationRef.current !== myGeneration) return;

            const audioBuffer = await bufferPromise;
            if (!audioBuffer || generationRef.current !== myGeneration) return;

            await new Promise((resolve) => {
                if (generationRef.current !== myGeneration) { resolve(); return; }

                const ctx = _getCtx();
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                currentSourceRef.current = source;

                source.onended = () => {
                    currentSourceRef.current = null;
                    resolve();
                };

                source.start(0);
            });
        });
    }, [selectedVoice, _getCtx]);

    /** Stop playback immediately and discard all queued sentences. */
    const stopAudio = useCallback(() => {
        generationRef.current += 1;

        if (currentSourceRef.current) {
            try { currentSourceRef.current.stop(); } catch (_) { }
            currentSourceRef.current = null;
        }

        // Reset the playback chain — future sentences start fresh.
        playTailRef.current = Promise.resolve();
    }, []);

    const changeVoice = useCallback((voice) => {
        setSelectedVoice(voice);
        localStorage.setItem('lumira_voice', voice);
    }, []);

    return { speakText, changeVoice, stopAudio, selectedVoice, unlockAudio };
}
