/**
 * Voice Service: Centralized Speech-to-Text (STT) and Text-to-Speech (TTS)
 * using browser-native Web Speech API.
 * Engineered for zero infinite recursion, clean microphone permission handling,
 * and reliable cross-platform execution without UI freezes.
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
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prefer high quality natural English voices
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
    } catch (e) {
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
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  public pauseSpeaking(): void {
    if (this.isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  public resumeSpeaking(): void {
    if (this.isSpeechSynthesisSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
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
   * Prompts for microphone access cleanly and avoids event-loop locking.
   */
  public async startListening(callbacks: RecognitionCallbacks): Promise<boolean> {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError?.(
        'Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Brave for voice input.'
      );
      return false;
    }

    // Always stop any previous recognition instance cleanly
    this.stopListening();

    // Explicitly verify microphone permission first to show standard browser dialog
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks after permission verification
        stream.getTracks().forEach((track) => track.stop());
      } catch (permErr: any) {
        this.isListeningState = false;
        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          callbacks.onError?.(
            'Microphone access was denied. Please click the lock or camera icon in your browser address bar to allow microphone permissions.'
          );
        } else {
          callbacks.onError?.('Could not access microphone. Please check your audio input device.');
        }
        return false;
      }
    }

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

        // Crucial: Set listening state to false to terminate any recursion
        this.isListeningState = false;

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          callbacks.onError?.(
            'Microphone permission was denied. Please allow microphone access in your browser.'
          );
        } else if (errType === 'audio-capture') {
          callbacks.onError?.(
            'No microphone detected. Please connect an audio input device and try again.'
          );
        } else if (errType === 'no-speech') {
          // Normal pause in speaking - cleanly end listening without alerting an error
          callbacks.onEnd?.();
        } else if (errType === 'network') {
          callbacks.onError?.(
            'Network communication error with speech recognition service.'
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
      callbacks.onError?.(err.message || 'Failed to initialize microphone.');
      return false;
    }
  }

  public stopListening(): void {
    this.isListeningState = false;
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
  }
}

export const voiceService = new VoiceService();
