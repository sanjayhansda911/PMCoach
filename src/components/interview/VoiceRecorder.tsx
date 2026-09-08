import React, { useEffect } from 'react';
import { Mic, MicOff, Square, AlertCircle, Info, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Button } from '../ui/Button';

interface VoiceRecorderProps {
  onAppendTranscript: (text: string) => void;
  isVoiceMode?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAppendTranscript,
  isVoiceMode = false,
}) => {
  const {
    isSupported,
    isListening,
    interimTranscript,
    recordingDuration,
    error,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onFinalChunk: (chunk) => {
      onAppendTranscript(chunk);
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-3">
          {!isListening ? (
            <Button
              type="button"
              size="sm"
              variant={isVoiceMode ? 'default' : 'outline'}
              onClick={startListening}
              disabled={!isSupported}
              className={`text-xs gap-1.5 font-semibold ${
                isVoiceMode ? 'bg-indigo-600 text-white shadow-xs' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Start Voice Answer</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={stopListening}
              className="text-xs gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs animate-pulse"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop Recording ({formatTime(recordingDuration)})</span>
            </Button>
          )}

          {/* Active Audio Waveform & Status */}
          {isListening && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="font-semibold font-mono">{formatTime(recordingDuration)}</span>
              <div className="flex items-center gap-0.5 ml-1 h-3">
                <span className="w-0.5 h-2 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 h-3.5 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 h-1.5 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                <span className="w-0.5 h-3 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              </div>
              <span className="text-[11px] font-medium hidden sm:inline">Listening to microphone...</span>
            </div>
          )}

          {!isListening && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              Dictate your answer via speech-to-text
            </span>
          )}
        </div>

        {isListening && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={stopListening}
            className="text-xs text-slate-500 hover:text-slate-800 h-7"
          >
            Done Speaking
          </Button>
        )}
      </div>

      {/* Live Interim Transcript Bubble */}
      {isListening && interimTranscript && (
        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-2 animate-in fade-in duration-150">
          <Volume2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <span className="font-semibold text-indigo-700 mr-1.5">Hearing:</span>
            <span className="italic text-slate-700">{interimTranscript}</span>
          </div>
        </div>
      )}

      {/* Error / Permission Blocked Warning */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">{error}</p>
            <p className="text-[11px] text-rose-600">
              Check that your browser has permission to access your microphone, or type your response manually below.
            </p>
          </div>
        </div>
      )}

      {/* Unsupported Browser Info */}
      {!isSupported && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Info className="h-4 w-4 text-slate-400 shrink-0" />
          <span>
            Speech recognition is supported in Google Chrome, Microsoft Edge, and Safari. You can type your response in the editor.
          </span>
        </div>
      )}
    </div>
  );
};
