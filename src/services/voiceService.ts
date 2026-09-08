/**
 * Voice Service: Centralized Speech-to-Text (STT) and Text-to-Speech (TTS)
 * using browser-native Web Speech API.
 * Engineered for clean non-blocking execution, zero infinite loops,
 * and seamless cross-platform performance.
 */

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface VoiceServiceOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
}

export interface RecognitionCallbacks {
  onInterim?: (interimText: string) => void;
  onFinal?: (finalText: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

class VoiceService {
  private recognition: any = null;
  private isListeningState: boolean = false;
  private isSpeakingState: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoiceSelection();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoiceSelection();
      };
    }
  }

  // -------------------------------------------------------------
  // Text-To-Speech (Interviewer Speaking)
  // -------------------------------------------------------------

  private initVoiceSelection() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const naturalEnglishVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Neural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Jenny') ||
              v.name.includes('Guy'))
        ) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en'));

      this.selectedVoice = naturalEnglishVoice || voices[0];
    } catch {
      // ignore
    }
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  /**
   * Speaks the provided text out loud using natural TTS.
   * Strips markdown/meta formatting for natural conversational delivery.
   */
  public speak(
    text: string,
    options?: VoiceServiceOptions,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (!this.isSpeechSynthesisSupported()) {
      onEnd?.();
      return;
    }

    // Stop any current utterance first
    this.stopSpeaking();

    // Clean text: remove markdown symbols, bullets, code blocks, URLs
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^[#*-]\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/CIRCLES/g, 'Circles')
      .replace(/RICE/g, 'Rice')
      .replace(/STAR/g, 'Star')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.lang = options?.lang || this.selectedVoice?.lang || 'en-US';
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;

      utterance.onstart = () => {
        this.isSpeakingState = true;
      };

      utterance.onend = () => {
        this.isSpeakingState = false;
        this.currentUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isSpeakingState = false;
        this.currentUtterance = null;
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          onError?.(e);
        }
        onEnd?.();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeakingState = false;
      this.currentUtterance = null;
      onEnd?.();
    }
  }

  public stopSpeaking(): void {
    if (!this.isSpeechSynthesisSupported()) return;
    this.isSpeakingState = false;
    this.currentUtterance = null;
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }

  public pauseSpeaking(): void {
    if (this.isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // ignore
      }
    }
  }

  public resumeSpeaking(): void {
    if (this.isSpeechSynthesisSupported() && window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    }
  }

  // -------------------------------------------------------------
  // Speech-To-Text (Candidate Speaking)
  // -------------------------------------------------------------

  public isSpeechRecognitionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  public isListening(): boolean {
    return this.isListeningState;
  }

  /**
   * Starts live microphone listening and transcription.
   * Completely asynchronous, avoids audio hardware contention, and prevents page freezing.
   */
  public startListening(callbacks: RecognitionCallbacks): boolean {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError?.(
        'Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Brave for voice input.'
      );
      return false;
    }

    // Stop any active recognition session cleanly first
    this.stopListening();

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognitionClass();
      this.recognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        this.isListeningState = true;
        callbacks.onStart?.();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcriptPiece = res[0]?.transcript || '';
          if (res.isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (finalTranscript) {
          callbacks.onFinal?.(finalTranscript);
        }
        if (interimTranscript) {
          callbacks.onInterim?.(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event.error;
        console.warn('[VoiceService] Speech recognition event error:', errType);

        this.isListeningState = false;

        if (errType === 'no-speech') {
          // Normal pause in speaking, cleanly conclude
          callbacks.onEnd?.();
          return;
        }

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          callbacks.onError?.(
            'Microphone access was denied. Please click the lock or camera icon in your browser address bar to allow microphone permissions.'
          );
        } else if (errType === 'audio-capture') {
          callbacks.onError?.(
            'No microphone detected. Please connect an audio input device and try again.'
          );
        } else if (errType === 'network') {
          callbacks.onError?.(
            'Speech recognition network communication error. Please check your internet connection.'
          );
        } else {
          callbacks.onError?.(`Speech recognition error: ${errType}`);
        }
      };

      recognition.onend = () => {
        this.isListeningState = false;
        this.recognition = null;
        callbacks.onEnd?.();
      };

      recognition.start();
      return true;
    } catch (err: any) {
      this.isListeningState = false;
      this.recognition = null;
      callbacks.onError?.(err.message || 'Failed to start microphone.');
      return false;
    }
  }

  public stopListening(): void {
    this.isListeningState = false;
    if (this.recognition) {
      const rec = this.recognition;
      this.recognition = null;
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        // ignore
      }
    }
  }
}

export const voiceService = new VoiceService();
