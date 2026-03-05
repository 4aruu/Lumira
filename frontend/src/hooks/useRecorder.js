import { useRef, useState, useCallback } from 'react';

/**
 * Detect the best supported audio MIME type for MediaRecorder.
 * iOS Safari: only supports audio/mp4
 * Chrome/Firefox: supports audio/webm;codecs=opus
 * Fallback: let the browser choose its default
 */
function getSupportedMimeType() {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
    ];
    for (const type of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return ''; // empty string = let browser choose default
}

/**
 * Get file extension from MIME type for correct backend handling.
 */
function getExtensionForMime(mimeType) {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'wav'; // safe fallback
}

export default function useRecorder() {
    const [isListening, setIsListening] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const isHoldRef = useRef(false);
    const streamRef = useRef(null);
    const onRecordCompleteRef = useRef(null);
    const mimeTypeRef = useRef('');

    // No eager mic warmup — iOS blocks getUserMedia before user gesture.
    // Mic is acquired lazily on first startRecording call.

    const startRecording = useCallback(async (e) => {
        if (e?.cancelable) e.preventDefault();
        if (isListening || isHoldRef.current) return;
        isHoldRef.current = true;
        try {
            let stream = streamRef.current;
            if (!stream?.active) {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
            }
            if (!isHoldRef.current) return;

            // Detect best MIME type for THIS device
            const mimeType = getSupportedMimeType();
            mimeTypeRef.current = mimeType;

            const recorderOptions = mimeType ? { mimeType } : undefined;
            mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                // Use the actual MIME type that was recorded, not a hardcoded one
                const actualMime = mimeTypeRef.current || 'audio/webm';
                const ext = getExtensionForMime(actualMime);
                const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });

                if (onRecordCompleteRef.current) {
                    // Pass both blob and extension so the caller can set the correct filename
                    onRecordCompleteRef.current(audioBlob, ext);
                }
            };

            mediaRecorderRef.current.start(100);
            setIsListening(true);
        } catch (err) {
            console.error("Mic Error", err);
            isHoldRef.current = false;
        }
    }, [isListening]);

    const stopRecording = useCallback((e) => {
        if (e?.cancelable) e.preventDefault();
        isHoldRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const setOnRecordComplete = useCallback((callback) => {
        onRecordCompleteRef.current = callback;
    }, []);

    return { isListening, startRecording, stopRecording, setOnRecordComplete };
}
