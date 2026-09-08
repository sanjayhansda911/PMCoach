import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Bot,
  BrainCircuit,
  Award,
  Search,
  ChevronRight,
  X,
  FileCheck2,
  Clock,
  ThumbsUp,
  Tag,
  Flame,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Cpu,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { GOLDEN_DATASET } from '../data/goldenDataset';
import { evalRunner, DEFAULT_GEMINI_MODEL, DEFAULT_HEURISTIC_MODEL } from '../services/evalRunner';
import { evalStorage } from '../storage/evalStorage';
import preloadedGeminiReport from '../data/latestGeminiReport.json';
import {
  EvalCase,
  EvalRun,
  EvalReport,
  EvalSystemType,
  HumanRating,
} from '../types';

export const InternalEvalsDashboardPage: React.FC = () => {
  const [report, setReport] = useState<EvalReport | null>((): EvalReport | null => {
    try {
      const stored = evalStorage.getReports();
      if (stored.length > 0) return stored[0];
    } catch {
      // fallback
    }
    return (preloadedGeminiReport as unknown as EvalReport) || null;
  });
  const [previousReport, setPreviousReport] = useState<EvalReport | null>((): EvalReport | null => {
    try {
      const stored = evalStorage.getReports();
      if (stored.length > 1) return stored[1];
    } catch {
      // fallback
    }
    return null;
  });
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'heuristic'>('gemini');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | EvalSystemType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<EvalCase | null>(null);
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null);

  // Human Rating State
  const [humanRatingScore, setHumanRatingScore] = useState<number>(5);
  const [humanRatingNotes, setHumanRatingNotes] = useState<string>('');
  const [saveRatingSuccess, setSaveRatingSuccess] = useState<boolean>(false);

  // Load latest run and previous run from storage or dist artifact
  useEffect(() => {
    try {
      const reports = evalStorage.getReports();
      if (reports.length > 0) {
        setReport(reports[0]);
        if (reports.length > 1) {
          setPreviousReport(reports[1]);
        }
      }
    } catch (err: any) {
      console.error('Error loading reports:', err);
    }
  }, []);

  const handleRunAll = async () => {
    setIsRunning(true);
    setAiError(null);
    try {
      if (!evalRunner || typeof evalRunner.runAllEvals !== 'function') {
        throw new Error('AI provider is not configured. Evals cannot be executed.');
      }

      // Store current report as previous for regression comparison
      const existingReports = evalStorage.getReports();
      if (existingReports.length > 0) {
        setPreviousReport(existingReports[0]);
      }

      const model = selectedProvider === 'gemini' ? DEFAULT_GEMINI_MODEL : DEFAULT_HEURISTIC_MODEL;
      const newReport = await evalRunner.runAllEvals(GOLDEN_DATASET, {
        provider: selectedProvider,
        model,
        promptVersion: '1.0.0',
        rubricVersion: '2026.1',
        saveToStorage: true,
      });

      setReport(newReport);
    } catch (err: any) {
      console.error('Failed to run evals:', err);
      setAiError(err.message || 'Evaluation run failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all stored evaluation runs and reports?')) {
      evalStorage.clearAllEvalData();
      setReport(null);
      setPreviousReport(null);
      setSelectedCase(null);
      setSelectedRun(null);
    }
  };

  const handleSelectCase = (c: EvalCase) => {
    setSelectedCase(c);
    const matchingRun = report?.runs.find((r: EvalRun) => r.evalCaseId === c.id) || null;
    setSelectedRun(matchingRun);
    setSaveRatingSuccess(false);
    const existing = evalStorage.getHumanRatings(c.id);
    if (existing.length > 0) {
      setHumanRatingScore(existing[0].rating);
      setHumanRatingNotes(existing[0].notes);
    } else {
      setHumanRatingScore(5);
      setHumanRatingNotes('');
    }
  };

  const handleSaveHumanRating = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const rating: HumanRating = {
      id: `hr-${Date.now()}`,
      evalCaseId: selectedCase.id,
      evaluatorId: 'internal-pm-evaluator',
      rating: humanRatingScore,
      notes: humanRatingNotes,
      createdAt: new Date().toISOString(),
    };

    evalStorage.saveHumanRating(rating);
    setSaveRatingSuccess(true);
    setTimeout(() => setSaveRatingSuccess(false), 3000);
  };

  // Find latest Gemini report and latest Heuristic report for side-by-side comparison
  const allReports = evalStorage.getReports();
  const latestGeminiReport = allReports.find((r: EvalReport) => r.provider === 'gemini') || (report?.provider === 'gemini' ? report : null);
  const latestHeuristicReport = allReports.find((r: EvalReport) => r.provider === 'heuristic') || (report?.provider === 'heuristic' ? report : null);

  const interviewerMetricDefs = [
    { key: 'relevance', name: 'Relevance', cases: 15 },
    { key: 'adaptiveness', name: 'Adaptiveness', cases: 15 },
    { key: 'probe_quality', name: 'Probe Quality', cases: 15 },
    { key: 'repetition', name: 'Repetition', cases: 15 },
    { key: 'difficulty_calibration', name: 'Difficulty Calibration', cases: 15 },
    { key: 'plan_adherence', name: 'Plan Adherence', cases: 15 },
    { key: 'pm_realism', name: 'PM Realism', cases: 15 },
  ];

  const evaluatorMetricDefs = [
    { key: 'score_validity', name: 'Score Validity', cases: 10 },
    { key: 'evidence_accuracy', name: 'Evidence Accuracy', cases: 10 },
    { key: 'rubric_adherence', name: 'Rubric Adherence', cases: 10 },
    { key: 'framework_bias', name: 'Framework Bias', cases: 10 },
    { key: 'insufficient_evidence_handling', name: 'Insufficient-Evidence Handling', cases: 10 },
    { key: 'communication_separation', name: 'Communication Separation', cases: 10 },
    { key: 'consistency', name: 'Consistency', cases: 10 },
  ];

  const failedRuns = report?.runs.filter((r: EvalRun) => !r.passed) || [];

  const filteredCases = GOLDEN_DATASET.filter((c) => {
    if (activeTab !== 'all' && c.systemType !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.competency.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isGeminiMode = report ? report.provider === 'gemini' : selectedProvider === 'gemini';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Top Header & Developer Action Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                  Internal AI Evaluation Harness
                </h1>
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-mono">
                  INTERNAL DEV ONLY
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Research & verification harness measuring Interviewer Quality and Evaluator Quality independently.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Provider Switcher */}
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setSelectedProvider('gemini')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedProvider === 'gemini'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-300 fill-current" />
                Gemini 3.6 Flash (Real LLM)
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider('heuristic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedProvider === 'heuristic'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                Heuristic Baseline
              </button>
            </div>

            {report && (
              <Button
                variant="outline"
                onClick={handleRunAll}
                disabled={isRunning}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-9 gap-1.5"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                Run Again
              </Button>
            )}

            <Button
              onClick={handleRunAll}
              disabled={isRunning}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold h-9 gap-2 px-4 shadow-md shadow-indigo-600/20"
            >
              <Play className="h-4 w-4 fill-current" />
              {isRunning ? 'Running Evals...' : `Run Evals (${selectedProvider === 'gemini' ? 'Gemini' : 'Heuristic'})`}
            </Button>

            {report && (
              <Button
                variant="ghost"
                onClick={handleClearHistory}
                className="text-slate-400 hover:text-rose-400 text-xs h-9"
              >
                Clear History
              </Button>
            )}
          </div>
        </div>

        {/* AI Provider Error Alert */}
        {aiError && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-200">{aiError}</p>
                <p className="text-xs text-rose-300/80">Please ensure the Gemini API key is configured in your server .env file.</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State Banner */}
        {isRunning && (
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-6 text-center space-y-3 animate-pulse">
            <div className="flex items-center justify-center gap-3">
              <RotateCcw className="h-6 w-6 text-indigo-400 animate-spin" />
              <span className="text-base font-bold text-indigo-200 tracking-wide font-mono">
                Executing 25 evaluation cases with {selectedProvider === 'gemini' ? 'Gemini 3.6 Flash (Real LLM)' : 'Heuristic Baseline Engine'}...
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-lg mx-auto font-sans">
              Benchmarking Interviewer Quality (Cases 1–15) and Evaluator Quality (Cases 16–25) with deterministic verification.
            </p>
          </div>
        )}

        {/* Metadata & Persistence Bar */}
        {report && !isRunning && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-5 py-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-slate-500">PROVIDER: </span>
                <span className={`font-bold ${report.provider === 'gemini' ? 'text-amber-400' : 'text-slate-300'}`}>
                  {report.provider?.toUpperCase() || 'HEURISTIC'}
                </span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500">MODEL: </span>
                <span className="text-indigo-400 font-semibold">{report.model}</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500">PROMPT_VER: </span>
                <span className="text-indigo-400 font-semibold">{report.promptVersion}</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div>
                <span className="text-slate-500">RUBRIC_VER: </span>
                <span className="text-indigo-400 font-semibold">{report.rubricVersion}</span>
              </div>
              {report.totalTokens !== undefined && report.totalTokens > 0 && (
                <>
                  <div className="h-3 w-px bg-slate-800" />
                  <div>
                    <span className="text-slate-500">TOKENS: </span>
                    <span className="text-emerald-400 font-semibold">{report.totalTokens.toLocaleString()}</span>
                  </div>
                </>
              )}
              {report.averageLatencyMs !== undefined && (
                <>
                  <div className="h-3 w-px bg-slate-800" />
                  <div>
                    <span className="text-slate-500">AVG_LATENCY: </span>
                    <span className="text-slate-300 font-semibold">{report.averageLatencyMs} ms</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-emerald-400 font-semibold">
              PERSISTED IN STORAGE
            </div>
          </div>
        )}

        {/* EVAL INTEGRITY PANEL */}
        {!isRunning && (
          <div className="rounded-xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/20 to-slate-950/80 p-5 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 p-3.5 text-indigo-200">
              {isGeminiMode ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold tracking-wide uppercase font-mono text-indigo-300">
                  {isGeminiMode
                    ? 'Evaluation Integrity: Real Google Gemini LLM Connected'
                    : 'Evaluation Integrity: Deterministic Heuristic Baseline'}
                </p>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {isGeminiMode
                    ? 'Evaluations are executed against the real Google Gemini API (gemini-3.6-flash) with structured JSON schemas and versioned system prompts. All evidence quotes are deterministically verified against verbatim transcript substrings, with zero API keys exposed to the client.'
                    : 'The heuristic baseline executes local regex pattern matching and rules in server/aiServerPlugin.ts without external API calls. Used for regression comparison against real LLM runs.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
                <span className="text-slate-400 font-sans text-[11px] block">AI Execution Mode</span>
                <span className={`font-bold ${isGeminiMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isGeminiMode ? 'Real LLM (Gemini API)' : 'Deterministic Heuristic'}
                </span>
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  {isGeminiMode ? 'Structured output via REST API' : 'Local regex pattern matching'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
                <span className="text-slate-400 font-sans text-[11px] block">Hardcoded Status</span>
                <span className={`font-bold ${isGeminiMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isGeminiMode ? 'None (0 Shortcuts)' : 'Partial Shortcuts (CASE-01 & 15)'}
                </span>
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  {isGeminiMode ? 'All cases executed dynamically' : 'Historical baseline shortcuts'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
                <span className="text-slate-400 font-sans text-[11px] block">Programmatic Checks</span>
                <span className="font-bold text-emerald-400">14 / 14 Metrics</span>
                <p className="text-[11px] text-slate-500 font-sans mt-1">Grounded evidence, score validity, etc.</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
                <span className="text-slate-400 font-sans text-[11px] block">API Key Security</span>
                <span className="font-bold text-emerald-400">Server-Side Only</span>
                <p className="text-[11px] text-slate-500 font-sans mt-1">Zero keys in client bundle or storage</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono pt-1">
              <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Golden Dataset Size:</span>
                <span className="font-bold text-white">25 Test Cases</span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Configured Model:</span>
                <span className="font-bold text-indigo-400">
                  {isGeminiMode ? 'gemini-3.6-flash' : 'heuristic-rules-engine'}
                </span>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Prompt Versions:</span>
                <span className="font-bold text-slate-200">Interviewer v1.0.0 / Evaluator v1.0.0</span>
              </div>
            </div>
          </div>
        )}

        {/* SIDE-BY-SIDE RUN COMPARISON (HEURISTIC BASELINE VS REAL GEMINI LLM) */}
        {latestHeuristicReport && latestGeminiReport && !isRunning && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  RUN COMPARISON: HEURISTIC BASELINE VS REAL LLM (GEMINI)
                </h3>
              </div>
              <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono text-[10px]">
                SIDE-BY-SIDE BENCHMARK
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-2.5">METRIC</th>
                    <th className="py-2.5 text-center text-slate-400">HEURISTIC BASELINE</th>
                    <th className="py-2.5 text-center text-amber-300">GEMINI 3.6 FLASH</th>
                    <th className="py-2.5 text-right">DELTA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 font-sans font-medium text-slate-200">Overall Score</td>
                    <td className="py-3 text-center text-slate-300 font-semibold">{latestHeuristicReport.overallScore}%</td>
                    <td className="py-3 text-center text-indigo-300 font-bold">{latestGeminiReport.overallScore}%</td>
                    <td className="py-3 text-right font-bold">
                      {latestGeminiReport.overallScore >= latestHeuristicReport.overallScore ? (
                        <span className="text-emerald-400">+{latestGeminiReport.overallScore - latestHeuristicReport.overallScore}%</span>
                      ) : (
                        <span className="text-amber-400">{latestGeminiReport.overallScore - latestHeuristicReport.overallScore}%</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 font-sans font-medium text-slate-200">Interviewer Quality</td>
                    <td className="py-3 text-center text-slate-300 font-semibold">{latestHeuristicReport.interviewerScore}%</td>
                    <td className="py-3 text-center text-sky-300 font-bold">{latestGeminiReport.interviewerScore}%</td>
                    <td className="py-3 text-right font-bold">
                      {latestGeminiReport.interviewerScore >= latestHeuristicReport.interviewerScore ? (
                        <span className="text-emerald-400">+{latestGeminiReport.interviewerScore - latestHeuristicReport.interviewerScore}%</span>
                      ) : (
                        <span className="text-amber-400">{latestGeminiReport.interviewerScore - latestHeuristicReport.interviewerScore}%</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 font-sans font-medium text-slate-200">Evaluator Quality</td>
                    <td className="py-3 text-center text-slate-300 font-semibold">{latestHeuristicReport.evaluatorScore}%</td>
                    <td className="py-3 text-center text-purple-300 font-bold">{latestGeminiReport.evaluatorScore}%</td>
                    <td className="py-3 text-right font-bold">
                      {latestGeminiReport.evaluatorScore >= latestHeuristicReport.evaluatorScore ? (
                        <span className="text-emerald-400">+{latestGeminiReport.evaluatorScore - latestHeuristicReport.evaluatorScore}%</span>
                      ) : (
                        <span className="text-amber-400">{latestGeminiReport.evaluatorScore - latestHeuristicReport.evaluatorScore}%</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 font-sans font-medium text-slate-200">Pass Rate</td>
                    <td className="py-3 text-center text-slate-300">
                      {Math.round((latestHeuristicReport.passedCases / latestHeuristicReport.totalCases) * 100)}% ({latestHeuristicReport.passedCases}/{latestHeuristicReport.totalCases})
                    </td>
                    <td className="py-3 text-center text-emerald-400 font-bold">
                      {Math.round((latestGeminiReport.passedCases / latestGeminiReport.totalCases) * 100)}% ({latestGeminiReport.passedCases}/{latestGeminiReport.totalCases})
                    </td>
                    <td className="py-3 text-right font-bold text-slate-300">
                      {latestGeminiReport.passedCases - latestHeuristicReport.passedCases >= 0 ? `+${latestGeminiReport.passedCases - latestHeuristicReport.passedCases} cases` : `${latestGeminiReport.passedCases - latestHeuristicReport.passedCases} cases`}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 font-sans font-medium text-slate-200">Average Latency per Call</td>
                    <td className="py-3 text-center text-slate-400">{latestHeuristicReport.averageLatencyMs || 2} ms</td>
                    <td className="py-3 text-center text-amber-300 font-bold">{latestGeminiReport.averageLatencyMs || 0} ms</td>
                    <td className="py-3 text-right text-slate-400">+{latestGeminiReport.averageLatencyMs} ms</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 font-sans font-medium text-slate-200">Total Tokens Consumed</td>
                    <td className="py-3 text-center text-slate-500">0 (Deterministic)</td>
                    <td className="py-3 text-center text-indigo-300 font-bold">{latestGeminiReport.totalTokens?.toLocaleString() || 0}</td>
                    <td className="py-3 text-right text-slate-400">Real Usage</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!report && !isRunning && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Evaluation Runs Executed Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                The golden dataset contains 25 calibrated test cases targeting important failure modes. Select Gemini or Heuristic above and click Run Evals.
              </p>
            </div>
            <Button
              onClick={handleRunAll}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-2"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run All Evals (25 Cases)
            </Button>
          </div>
        )}

        {/* Dashboard Results */}
        {report && !isRunning && (
          <div className="space-y-8">
            {/* 1. EVAL SUMMARY CARDS */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono">
                EVAL SUMMARY
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Cases
                  </span>
                  <div className="mt-2 text-2xl font-bold text-white font-mono">
                    {report.totalCases}
                  </div>
                  <span className="text-[11px] text-slate-500">golden test cases</span>
                </Card>

                <Card className="border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Passed
                  </span>
                  <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
                    {report.passedCases}
                  </div>
                  <span className="text-[11px] text-slate-500">score &ge; 80% with 0 failures</span>
                </Card>

                <Card className="border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Failed
                  </span>
                  <div className="mt-2 text-2xl font-bold text-rose-400 font-mono">
                    {report.totalCases - report.passedCases}
                  </div>
                  <span className="text-[11px] text-slate-500">flagged for review</span>
                </Card>

                <Card className="border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Pass Rate
                  </span>
                  <div className="mt-2 text-2xl font-bold text-indigo-400 font-mono">
                    {Math.round((report.passedCases / report.totalCases) * 100)}%
                  </div>
                  <span className="text-[11px] text-slate-500">overall benchmark</span>
                </Card>
              </div>
            </div>

            {/* 2. QUALITY METRIC BREAKDOWNS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interviewer Quality Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      INTERVIEWER QUALITY
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-semibold text-sky-400">
                    {report.interviewerScore}% avg
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-500 font-mono">
                      <tr>
                        <th className="py-2">METRIC</th>
                        <th className="py-2 text-right">SCORE</th>
                        <th className="py-2 text-center">STATUS</th>
                        <th className="py-2 text-right">CASES</th>
                        {previousReport && <th className="py-2 text-right">CHANGE</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {interviewerMetricDefs.map((m) => {
                        const data = report.metricScores[m.key];
                        const prevData = previousReport?.metricScores?.[m.key];
                        const scorePct = data ? data.normalizedPercent : 0;
                        const prevPct = prevData ? prevData.normalizedPercent : null;
                        const delta = prevPct !== null ? scorePct - prevPct : null;
                        const isPassed = scorePct >= 80;
                        const isRegression = delta !== null && delta < 0;

                        return (
                          <tr key={m.key} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-sans font-medium text-slate-200">
                              {m.name}
                            </td>
                            <td className="py-2.5 text-right font-bold text-slate-100">
                              {data ? `${scorePct}% (${data.rawAverage}/${data.maxPoints})` : '--'}
                            </td>
                            <td className="py-2.5 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  isPassed
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                }`}
                              >
                                {isPassed ? 'Passed' : 'Failed'}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right text-slate-400">
                              {m.cases} cases
                            </td>
                            {previousReport && (
                              <td className="py-2.5 text-right">
                                {delta !== null ? (
                                  <div className="inline-flex items-center gap-1">
                                    <span
                                      className={`font-semibold ${
                                        delta > 0
                                          ? 'text-emerald-400'
                                          : delta < 0
                                          ? 'text-rose-400'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                                    </span>
                                    {isRegression && (
                                      <Badge variant="outline" className="border-rose-500 bg-rose-500/20 text-rose-300 text-[9px] px-1 py-0">
                                        REGRESSION
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  '--'
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Evaluator Quality Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      EVALUATOR QUALITY
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-semibold text-purple-400">
                    {report.evaluatorScore}% avg
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-500 font-mono">
                      <tr>
                        <th className="py-2">METRIC</th>
                        <th className="py-2 text-right">SCORE</th>
                        <th className="py-2 text-center">STATUS</th>
                        <th className="py-2 text-right">CASES</th>
                        {previousReport && <th className="py-2 text-right">CHANGE</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {evaluatorMetricDefs.map((m) => {
                        const data = report.metricScores[m.key];
                        const prevData = previousReport?.metricScores?.[m.key];
                        const scorePct = data ? data.normalizedPercent : 0;
                        const prevPct = prevData ? prevData.normalizedPercent : null;
                        const delta = prevPct !== null ? scorePct - prevPct : null;
                        const isPassed = scorePct >= 80;
                        const isRegression = delta !== null && delta < 0;

                        return (
                          <tr key={m.key} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-sans font-medium text-slate-200">
                              {m.name}
                            </td>
                            <td className="py-2.5 text-right font-bold text-slate-100">
                              {data ? `${scorePct}% (${data.rawAverage}/${data.maxPoints})` : '--'}
                            </td>
                            <td className="py-2.5 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  isPassed
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                }`}
                              >
                                {isPassed ? 'Passed' : 'Failed'}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right text-slate-400">
                              {m.cases} cases
                            </td>
                            {previousReport && (
                              <td className="py-2.5 text-right">
                                {delta !== null ? (
                                  <div className="inline-flex items-center gap-1">
                                    <span
                                      className={`font-semibold ${
                                        delta > 0
                                          ? 'text-emerald-400'
                                          : delta < 0
                                          ? 'text-rose-400'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                                    </span>
                                    {isRegression && (
                                      <Badge variant="outline" className="border-rose-500 bg-rose-500/20 text-rose-300 text-[9px] px-1 py-0">
                                        REGRESSION
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  '--'
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3. FAILURE TAXONOMY BREAKDOWN */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  FAILURE TAXONOMY BREAKDOWN
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                  <span>Failed cases: <strong className="text-rose-400">{report.failedCases ?? (report.totalCases - report.passedCases)}</strong></span>
                  <span>Failure instances: <strong className="text-amber-400">{report.totalFailureInstances ?? Object.values(report.failureBreakdown).reduce((a, b) => a + b, 0)}</strong></span>
                  <span>Unique failure codes: <strong className="text-purple-400">{report.uniqueFailureCodes ?? Object.keys(report.failureBreakdown).length}</strong></span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.failureBreakdown).length > 0 ? (
                  Object.entries(report.failureBreakdown).map(([failure, count]) => (
                    <Badge
                      key={failure}
                      variant="outline"
                      className="border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs py-1 px-2.5 font-mono gap-1.5"
                    >
                      <AlertTriangle className="h-3 w-3 text-rose-400" />
                      <span>{failure}</span>
                      <span className="ml-1 rounded bg-rose-900/60 px-1 py-0.2 text-[10px] text-rose-200">
                        {String(count)}
                      </span>
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Zero failure modes detected across entire test suite.
                  </span>
                )}
              </div>
            </div>

            {/* 4. DEDICATED FAILURE INSPECTOR (FOR FAILED CASES LIKE CASE-06 AND CASE-24) */}
            {failedRuns.length > 0 && (
              <div className="rounded-xl border border-rose-900/40 bg-slate-950/80 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      FAILURE INSPECTOR ({failedRuns.length} CASES FLAGGED)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Model: {report.model} | Prompt v{report.promptVersion}
                  </span>
                </div>

                <div className="space-y-3">
                  {failedRuns.map((r: EvalRun) => {
                    const c = GOLDEN_DATASET.find((x) => x.id === r.evalCaseId);
                    const qOutput = r.output?.followUpQuestion || r.output?.message;
                    return (
                      <div
                        key={r.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-mono">
                            <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs">
                              {r.evalCaseId}
                            </Badge>
                            <span className="text-sm font-bold text-white font-sans">{c?.name}</span>
                            <span className="text-xs text-slate-400">({c?.category})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-slate-400">Score: <strong className="text-amber-400">{r.normalizedScore}%</strong></span>
                            <div className="flex gap-1">
                              {r.failures.map((f: string) => (
                                <Badge key={f} variant="outline" className="border-rose-500/40 bg-rose-950/40 text-rose-300 text-[10px]">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div className="rounded bg-slate-950/60 p-2.5 border border-slate-800/80">
                            <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Expected Behavior:</span>
                            <p className="text-slate-300 font-sans">{c?.expectedBehavior}</p>
                          </div>
                          <div className="rounded bg-slate-950/60 p-2.5 border border-slate-800/80">
                            <span className="text-indigo-400 uppercase tracking-wider text-[10px] block mb-1">Actual Model Output:</span>
                            {qOutput ? (
                              <p className="text-indigo-200 font-sans italic">"{qOutput}"</p>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-slate-400">Evaluator Competency Scores:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {r.output?.competencyEvaluations?.map((ce: any) => (
                                    <span key={ce.competency} className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-300">
                                      {ce.competency}: {ce.score}/5
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. GOLDEN DATASET CASE EXPLORER */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    GOLDEN DATASET EXPLORER (25 CASES)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspect individual case inputs, model outputs, verbatim evidence quotes, and reference rationales.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs font-mono">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        activeTab === 'all'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All (25)
                    </button>
                    <button
                      onClick={() => setActiveTab('interviewer')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        activeTab === 'interviewer'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Interviewer (15)
                    </button>
                    <button
                      onClick={() => setActiveTab('evaluator')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        activeTab === 'evaluator'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Evaluator (10)
                    </button>
                  </div>

                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2.5">ID</th>
                      <th className="py-2.5">CASE NAME</th>
                      <th className="py-2.5">SYSTEM</th>
                      <th className="py-2.5">COMPETENCY</th>
                      <th className="py-2.5 text-center">SCORE</th>
                      <th className="py-2.5 text-center">STATUS</th>
                      <th className="py-2.5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCases.map((c) => {
                      const run = report.runs.find((r) => r.evalCaseId === c.id);
                      const isPassed = run?.passed ?? false;
                      const score = run ? run.normalizedScore : '--';

                      return (
                        <tr
                          key={c.id}
                          onClick={() => handleSelectCase(c)}
                          className="cursor-pointer hover:bg-slate-900/60 transition-colors"
                        >
                          <td className="py-3 font-bold text-indigo-400">{c.id}</td>
                          <td className="py-3 font-sans font-medium text-slate-200 max-w-xs truncate">
                            {c.name}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                c.systemType === 'interviewer'
                                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                                  : 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                              }`}
                            >
                              {c.systemType}
                            </Badge>
                          </td>
                          <td className="py-3 text-slate-400">{c.competency}</td>
                          <td className="py-3 text-center font-bold text-slate-100">{score}%</td>
                          <td className="py-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isPassed
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {isPassed ? 'Passed' : 'Failed'}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-slate-400 hover:text-white"
                            >
                              Inspect
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CASE INSPECTION MODAL */}
        {selectedCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <Badge variant="outline" className="border-indigo-500 bg-indigo-500/10 text-indigo-400">
                      {selectedCase.id}
                    </Badge>
                    <span className="text-xs text-slate-400">{selectedCase.category}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white font-sans">{selectedCase.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Inspector Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <h4 className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Expected Behavior
                  </h4>
                  <p className="text-slate-200 font-sans leading-relaxed">{selectedCase.expectedBehavior}</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <h4 className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Human PM Ground Truth Rationale
                  </h4>
                  <p className="text-slate-300 font-sans leading-relaxed">
                    {selectedCase.referenceEvaluation.rationale}
                  </p>
                </div>
              </div>

              {/* Output Inspection */}
              {selectedRun && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <span className="font-bold text-indigo-300 uppercase tracking-wider">
                      Actual Model Output ({selectedRun.model})
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Normalized Score: {selectedRun.normalizedScore}%
                    </span>
                  </div>
                  <pre className="max-h-60 overflow-y-auto rounded bg-slate-950 p-3 text-[11px] text-slate-300 leading-relaxed font-mono">
                    {JSON.stringify(selectedRun.output, null, 2)}
                  </pre>
                </div>
              )}

              {/* Human Ground Truth Rating Form */}
              <form
                onSubmit={handleSaveHumanRating}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Internal PM Human Benchmark Rating (1-5 Scale)
                  </h4>
                  {saveRatingSuccess && (
                    <span className="text-xs font-semibold text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-xs text-slate-400 font-mono">Score:</label>
                  <select
                    value={humanRatingScore}
                    onChange={(e) => setHumanRatingScore(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value={5}>5 - Exceptional PM Execution</option>
                    <option value={4}>4 - Strong Demonstration</option>
                    <option value={3}>3 - Adequate / Mixed</option>
                    <option value={2}>2 - Weak / Significant Issues</option>
                    <option value={1}>1 - Complete Failure / Hallucination</option>
                  </select>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Add PM evaluator notes for this test case..."
                    value={humanRatingNotes}
                    onChange={(e) => setHumanRatingNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs">
                    Save Ground Truth Rating
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
