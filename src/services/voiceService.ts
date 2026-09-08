/**
 * Voice Service: Centralized Speech-to-Text (STT) and Text-to-Speech (TTS)
 * using the browser's native Web Speech API.
 */

// Global type augmentation for Web Speech API recognition in Chromium & Safari
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
  private recognitionCallbacks: RecognitionCallbacks | null = null;

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

    // Prefer high quality English voices (US or UK)
    const naturalEnglishVoice = voices.find(
      (v) =>
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Jenny') || v.name.includes('Guy')))
    ) || voices.find((v) => v.lang.startsWith('en-US')) || voices.find((v) => v.lang.startsWith('en'));

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

    // Stop any in-progress speech first
    this.stopSpeaking();

    // Clean text: remove markdown symbols, bullets, URLs, and code blocks
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
      .replace(/\*([^*]+)\*/g, '$1') // italic
      .replace(/^[#*-]\s+/gm, '') // headings / bullets
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/CIRCLES/g, 'Circles')
      .replace(/RICE/g, 'Rice')
      .replace(/STAR/g, 'Star')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

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
      // 'interrupted' or 'canceled' are expected when user stops or navigates
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        onError?.(e);
      }
      onEnd?.();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    if (!this.isSpeechSynthesisSupported()) return;
    this.isSpeakingState = false;
    this.currentUtterance = null;
    window.speechSynthesis.cancel();
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
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  public isListening(): boolean {
    return this.isListeningState;
  }

  /**
   * Starts live microphone listening and streaming transcription.
   */
  public startListening(callbacks: RecognitionCallbacks): boolean {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError?.('Speech Recognition is not supported in this browser. Please use Chrome, Edge, or a Chromium-based browser.');
      return false;
    }

    if (this.isListeningState) {
      this.stopListening();
    }

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognitionCallbacks = callbacks;

      this.recognition.onstart = () => {
        this.isListeningState = true;
        callbacks.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
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

      this.recognition.onerror = (event: any) => {
        let message = event.error || 'Speech recognition error';
        if (event.error === 'not-allowed') {
          message = 'Microphone permission was denied. Please allow microphone access in your browser.';
        } else if (event.error === 'no-speech') {
          // Normal silence, no error alert needed
          return;
        }
        callbacks.onError?.(message);
      };

      this.recognition.onend = () => {
        // If still supposed to be listening, restart (Chromium stops after brief silence)
        if (this.isListeningState && this.recognition) {
          try {
            this.recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        this.isListeningState = false;
        callbacks.onEnd?.();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      this.isListeningState = false;
      callbacks.onError?.(err.message || 'Failed to start microphone.');
      return false;
    }
  }

  public stopListening(): void {
    this.isListeningState = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.recognitionCallbacks?.onEnd?.();
    this.recognitionCallbacks = null;
  }
}

export const voiceService = new VoiceService();
