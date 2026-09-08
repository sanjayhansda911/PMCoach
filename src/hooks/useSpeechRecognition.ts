import { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null;
}

interface UseSpeechRecognitionOptions {
  onTranscriptChange?: (transcript: string) => void;
  onFinalChunk?: (chunk: string) => void;
  lang?: string;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { onTranscriptChange, onFinalChunk, lang = 'en-US' } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  // Duration timer
  useEffect(() => {
    if (isListening) {
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isListening]);

  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Web Speech API is not supported in this browser.');
      return null;
    }

    const recognition: SpeechRecognitionInstance = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          currentFinal += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }

      setInterimTranscript(currentInterim);

      if (currentFinal) {
        const trimmedFinal = currentFinal.trim();
        if (trimmedFinal) {
          onFinalChunk?.(trimmedFinal);
        }
        setTranscript((prev) => {
          const updated = prev ? `${prev} ${trimmedFinal}` : trimmedFinal;
          onTranscriptChange?.(updated);
          return updated;
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[SpeechRecognition Error]:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'no-speech') {
        // No speech detected is common during pauses; keep listening if user intended
      } else {
        setError(`Speech recognition notice: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If recognition stopped unexpectedly while user still intended to listen, restart it
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    return recognition;
  }, [lang, onTranscriptChange]);

  const startListening = useCallback(() => {
    setError(null);
    setInterimTranscript('');

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (!recognitionRef.current) return;

    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
    } catch (err: any) {
      // Recognition may already be running
      console.warn('SpeechRecognition start error:', err);
      setIsListening(true);
    }
  }, [initRecognition]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('SpeechRecognition stop error:', err);
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setRecordingDuration(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    recordingDuration,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
