import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Briefcase,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Send,
  Bot,
  User,
  StopCircle,
  Pause,
  Play,
  Layers,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  Interview,
  CandidateProfile,
  JobProfile,
  CandidateJobMatch,
  InterviewBrief,
  InterviewPlan,
  InterviewState,
  ConversationExchange,
  AnswerAnalysis,
} from '../types';
import { interviewService } from '../services/interviewService';
import { interviewEngine } from '../services/interviewEngine';
import { voiceService } from '../services/voiceService';
import { useInterview } from '../context/InterviewContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export const InterviewRoomPage: React.FC = () => {
  const { id: routeId } = useParams<{ id?: string }>();
  const { currentInterview, setCurrentInterview } = useInterview();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [jobProfile, setJobProfile] = useState<JobProfile | null>(null);
  const [match, setMatch] = useState<CandidateJobMatch | null>(null);
  const [brief, setBrief] = useState<InterviewBrief | null>(null);

  // Engine state
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [engineState, setEngineState] = useState<InterviewState | null>(null);
  const [exchanges, setExchanges] = useState<ConversationExchange[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AnswerAnalysis | null>(null);

  // Voice & Audio state
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const lastSpokenIdRef = useRef<string | null>(null);

  // Input, Timer & Pause state
  const [candidateResponse, setCandidateResponse] = useState('');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const targetId = routeId || currentInterview?.id;

  // 1. Initial Load: Retrieve composite and start/resume interview engine
  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function initSession() {
      try {
        const composite = await interviewService.getInterview(targetId!);
        if (!composite || !composite.interview) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) {
          setInterview(composite.interview);
          setCandidateProfile(composite.candidateProfile);
          setJobProfile(composite.jobProfile);
          setMatch(composite.match || null);
          setBrief(composite.brief || null);
          setCurrentInterview(composite.interview);
        }

        // Start or resume interview engine
        const { state, plan: initialPlan, exchanges: initialExchanges } =
          await interviewEngine.startInterview(targetId!);

        if (isMounted) {
          setPlan(initialPlan);
          setEngineState(state);
          setExchanges(initialExchanges);
          setSecondsElapsed(state.elapsedSeconds || 0);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to initialize interview session:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to start interview.');
          setLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [targetId, setCurrentInterview]);

  // 2. Timer tick: update local clock and persist elapsed time
  useEffect(() => {
    if (!interview || isPaused || engineState?.currentStage === 'INTERVIEW_COMPLETE') return;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        // Persist every 5 seconds to storage
        if (next % 5 === 0 && interview.id) {
          interviewEngine.updateElapsedTime(interview.id, next);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [interview, isPaused, engineState?.currentStage]);

  // 3. Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges, isAnalyzing]);

  // 4. Voice Cleanup on Unmount
  useEffect(() => {
    return () => {
      voiceService.stopSpeaking();
      voiceService.stopListening();
    };
  }, []);

  // 5. Auto-Speak Interviewer Prompts
  useEffect(() => {
    if (!audioEnabled || !exchanges.length || isPaused) return;
    const lastExchange = exchanges[exchanges.length - 1];
    if (lastExchange.role === 'interviewer' && lastExchange.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = lastExchange.id;
      setSpeakingMessageId(lastExchange.id);
      setIsSpeaking(true);
      voiceService.speak(
        lastExchange.text,
        {},
        () => {
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        },
        () => {
          setIsSpeaking(false);
          setSpeakingMessageId(null);
        }
      );
    }
  }, [exchanges, audioEnabled, isPaused]);

  // Handle Manual Replay of Interviewer Speech
  const handleReplaySpeech = (exchangeId: string, text: string) => {
    if (isSpeaking && speakingMessageId === exchangeId) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setInterimSpeech('');
    }
    setSpeakingMessageId(exchangeId);
    setIsSpeaking(true);
    voiceService.speak(
      text,
      {},
      () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      },
      () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      }
    );
  };

  // Handle Candidate Microphone Dictation Toggle
  const handleToggleMic = async () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setInterimSpeech('');
      return;
    }

    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }

    setErrorMsg(null);
    const started = await voiceService.startListening({
      onStart: () => {
        setIsListening(true);
      },
      onFinal: (finalText) => {
        const cleaned = finalText.trim();
        if (cleaned) {
          setCandidateResponse((prev) =>
            prev.trim() ? `${prev.trim()} ${cleaned}` : cleaned
          );
        }
        setInterimSpeech('');
      },
      onInterim: (interim) => {
        setInterimSpeech(interim);
      },
      onError: (err) => {
        setErrorMsg(err);
        setIsListening(false);
        setInterimSpeech('');
      },
      onEnd: () => {
        setIsListening(false);
        setInterimSpeech('');
      },
    });

    if (!started) {
      setIsListening(false);
    }
  };

  // Handle Answer Submission
  const handleSubmitAnswer = async () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setInterimSpeech('');
    }
    if (isSpeaking) {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }

    const text = candidateResponse.trim();
    if (!text || !interview || isAnalyzing || isPaused) return;

    setErrorMsg(null);
    setIsAnalyzing(true);
    setCandidateResponse('');

    try {
      const result = await interviewEngine.submitAnswer(interview.id, text);
      setEngineState(result.state);
      setPlan(result.plan);
      setLastAnalysis(result.analysis);
      setExchanges(interviewEngine.getConversationHistory(interview.id));
    } catch (err: any) {
      console.error('Failed to submit answer:', err);
      setErrorMsg(err.message || 'Error analyzing response.');
      // Restore the text in case of error
      setCandidateResponse(text);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Handle Ending Interview
  const handleConfirmEnd = async () => {
    if (!interview) return;
    voiceService.stopSpeaking();
    voiceService.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
    setShowEndModal(false);
    setIsAnalyzing(true);
    try {
      const { state } = await interviewEngine.endInterview(interview.id, 'Candidate ended session early');
      setEngineState(state);
      setExchanges(interviewEngine.getConversationHistory(interview.id));
    } catch (err: any) {
      console.error('Failed to end interview:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const wordCount = candidateResponse.trim().split(/\s+/).filter(Boolean).length;
  const isComplete = engineState?.currentStage === 'INTERVIEW_COMPLETE';
  const currentSection =
    plan && engineState
      ? plan.sections[engineState.currentSectionIndex] || plan.sections[0]
      : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-4">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        <h3 className="text-base font-bold text-slate-800">Calibrating Adaptive Interview Engine</h3>
        <p className="text-xs text-slate-500">
          Tailoring section plans, probe policies, and context signals...
        </p>
      </div>
    );
  }

  if (!interview || !plan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">No Interview Found</h2>
        <p className="text-xs text-slate-500">
          We couldn't locate this interview session. Please configure a new mock interview.
        </p>
        <Link to="/setup">
          <Button size="sm">Go to Interview Setup</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="purple" className="text-xs">
              {interview.targetRole}
            </Badge>
            <Badge variant="blue" className="text-xs">
              {interview.interviewType}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {interview.difficulty}
            </Badge>
            {interview.mode === 'Voice' && (
              <Badge variant="purple" className="text-xs flex items-center gap-1 bg-purple-100 text-purple-800 border-purple-200">
                <Mic className="h-3 w-3 animate-pulse text-purple-600" />
                <span>Voice Mode</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Speaker Audio Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (audioEnabled) {
                voiceService.stopSpeaking();
                setIsSpeaking(false);
                setSpeakingMessageId(null);
                setAudioEnabled(false);
              } else {
                setAudioEnabled(true);
              }
            }}
            title={audioEnabled ? "Mute interviewer voice" : "Enable interviewer voice"}
            className={`text-xs gap-1.5 border-slate-200 ${
              audioEnabled ? 'text-indigo-600 hover:text-indigo-700 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Voice On</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Voice Muted</span>
              </>
            )}
          </Button>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-bold ${
              isPaused
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : secondsElapsed >= interview.duration * 60 - 90
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <Clock
              className={`h-3.5 w-3.5 ${
                isPaused
                  ? 'text-amber-600'
                  : secondsElapsed >= interview.duration * 60 - 90
                  ? 'text-rose-600 animate-bounce'
                  : 'text-indigo-600 animate-pulse'
              }`}
            />
            <span>
              {formatTimer(secondsElapsed)} / {interview.duration}:00 {isPaused && '(Paused)'}
            </span>
          </div>

          {!isComplete && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused((prev) => !prev)}
                className="text-xs gap-1 border-slate-200"
              >
                {isPaused ? (
                  <>
                    <Play className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5 text-slate-500" />
                    <span>Pause</span>
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEndModal(true)}
                className="text-xs text-slate-500 hover:text-rose-600"
              >
                <StopCircle className="h-3.5 w-3.5 mr-1 text-rose-500" />
                <span>End Early</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interview Progress & Session Guidance */}
        <div className="lg:col-span-4 space-y-5">
          {/* Subtle Progress Indicator */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Interview Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  {currentSection ? currentSection.competency : 'Product Management'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Part {(engineState?.currentSectionIndex || 0) + 1} of {plan.sections.length}
                </span>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center gap-2 pt-1">
                {plan.sections.map((sec, idx) => {
                  const isCurrent = engineState?.currentSectionIndex === idx && !isComplete;
                  const isDone = (engineState?.currentSectionIndex || 0) > idx || isComplete;
                  return (
                    <span
                      key={sec.id || idx}
                      className={`h-2.5 w-2.5 rounded-full transition-all ${
                        isDone
                          ? 'bg-emerald-500'
                          : isCurrent
                          ? 'bg-indigo-600 ring-4 ring-indigo-100'
                          : 'bg-slate-200'
                      }`}
                      title={`Part ${idx + 1}`}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                The interviewer will guide you through adaptive topics and follow-up probes.
              </p>
            </CardContent>
          </Card>

          {/* Session Context & Guidance */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                <span>Session Context</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs text-slate-600">
              {jobProfile && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">Target Role:</span>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 space-y-0.5">
                    <p className="font-bold text-slate-900">
                      {jobProfile.role || interview.targetRole}
                      {jobProfile.company ? ` at ${jobProfile.company}` : ''}
                    </p>
                    {jobProfile.domain && (
                      <p className="text-[11px] text-indigo-700">Domain: {jobProfile.domain}</p>
                    )}
                  </div>
                </div>
              )}

              {candidateProfile && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">Candidate Profile:</span>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                    <p className="font-bold text-slate-900">
                      {candidateProfile.candidateName || 'Documented Candidate'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {candidateProfile.currentRole}
                      {candidateProfile.yearsOfExperience
                        ? ` • ${candidateProfile.yearsOfExperience} yrs exp`
                        : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                  Interview Tips
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-500 list-disc list-inside">
                  <li>Structure your thoughts before responding.</li>
                  <li>Clarify user goals and state explicit trade-offs.</li>
                  <li>Ask clarifying questions as you would in real interviews.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Conversation Stream & Response Input */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200 shadow-sm flex flex-col h-[700px]">
            {/* Conversation Messages Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {exchanges.map((exchange) => {
                const isInterviewer = exchange.role === 'interviewer';

                return (
                  <div
                    key={exchange.id}
                    className={`flex gap-3 ${isInterviewer ? 'items-start' : 'items-start flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                        isInterviewer
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-100'
                      }`}
                    >
                      {isInterviewer ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-2 shadow-xs ${
                        isInterviewer
                          ? 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm'
                          : 'bg-indigo-600 text-white rounded-tr-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-mono">
                        <div className="flex items-center gap-2 font-bold">
                          <span>{isInterviewer ? 'PM Interviewer' : 'Candidate'}</span>
                          {isInterviewer && speakingMessageId === exchange.id && (
                            <span className="flex items-center gap-1 text-indigo-600 text-[10px] font-normal animate-pulse">
                              <Volume2 className="h-3 w-3" />
                              Speaking...
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isInterviewer && (
                            <button
                              type="button"
                              onClick={() => handleReplaySpeech(exchange.id, exchange.text)}
                              title={speakingMessageId === exchange.id ? "Stop reading" : "Replay voice"}
                              className={`p-1 rounded-md transition-colors ${
                                speakingMessageId === exchange.id
                                  ? 'text-indigo-600 bg-indigo-100'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                              }`}
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <span>
                            {new Date(exchange.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Message Text with paragraphs */}
                      <div className="whitespace-pre-wrap font-sans">
                        {exchange.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Realistic Typing Indicator (UI/UX Rule 12) */}
              {isAnalyzing && (
                <div className="flex gap-3 items-start animate-fade-in">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 border border-slate-200 px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                    <span className="font-medium text-slate-600">Interviewer is typing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom: Answer Input or Completion View */}
            <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
              {isComplete ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-3">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Interview complete. Your performance report is ready.
                    </h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Your complete interview transcript has been evaluated independently against calibrated PM rubrics.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/evaluation/${interview.id}`)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      View Performance
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/dashboard')}
                      className="text-xs"
                    >
                      Dashboard
                    </Button>
                  </div>
                </div>
              ) : isPaused ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2.5">
                  <p className="text-xs font-semibold text-amber-900">Interview is paused</p>
                  <p className="text-[11px] text-amber-700">The timer is stopped. Take your time to review your thoughts.</p>
                  <Button
                    size="sm"
                    onClick={() => setIsPaused(false)}
                    className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Resume Interview</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active Recording Banner */}
                  {isListening && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-pulse">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                        </span>
                        <span className="font-semibold">Microphone is listening... Speak clearly.</span>
                      </div>
                      <span className="text-[11px] text-rose-600">Click Stop Mic when done</span>
                    </div>
                  )}

                  {/* Interim Speech Preview */}
                  {interimSpeech && (
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-700 italic flex items-center gap-1.5">
                      <span className="font-semibold not-italic text-indigo-900">Transcribing:</span>
                      <span>"{interimSpeech}"</span>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    rows={4}
                    value={candidateResponse}
                    onChange={(e) => setCandidateResponse(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitAnswer();
                      }
                    }}
                    disabled={isAnalyzing}
                    placeholder={
                      interview.mode === 'Voice'
                        ? 'Speak using the microphone below, or type/edit your response here... (Cmd/Ctrl + Enter to send)'
                        : 'Type your response here... (Cmd/Ctrl + Enter to send)'
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{wordCount} words</span>
                      <span>•</span>
                      <span className="hidden sm:inline">Press Cmd/Ctrl + Enter to submit</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Microphone Toggle Button */}
                      <Button
                        type="button"
                        variant={isListening ? "destructive" : "outline"}
                        size="sm"
                        onClick={handleToggleMic}
                        disabled={isAnalyzing}
                        className={`text-xs flex items-center gap-1.5 transition-all ${
                          isListening
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-md shadow-rose-200'
                            : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                        title={isListening ? "Stop listening" : "Start speaking your answer"}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="h-3.5 w-3.5 text-white" />
                            <span>Stop Mic</span>
                          </>
                        ) : (
                          <>
                            <Mic className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Speak Answer</span>
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSubmitAnswer}
                        disabled={isAnalyzing || candidateResponse.trim().length === 0}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit Answer</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal for End Early */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-bold text-slate-900">End Interview Session Early?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to end this mock interview? The session will be marked as complete,
              and your exchange history up to this point will be saved.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEndModal(false)}
                className="text-xs"
              >
                Continue Interview
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmEnd}
                className="text-xs"
              >
                End Session Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
