import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Quote,
  Lightbulb,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  Clock,
  ArrowLeft,
  ArrowRight,
  Award,
  Layers,
  BarChart3,
  Compass,
  Users,
  RotateCcw,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Evaluation, CompetencyEvaluation, Interview, CompetencyName } from '../types';
import { useInterview } from '../context/InterviewContext';
import { interviewService } from '../services/interviewService';
import { evaluationEngine } from '../services/evaluationEngine';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const COMPETENCY_ICONS: Record<CompetencyName, React.ElementType> = {
  'Product Sense': Sparkles,
  'Execution': Layers,
  'Analytics': BarChart3,
  'Strategy': Compass,
  'Leadership & Behavioral': Users,
  'Communication': MessageSquare,
};

export const EvaluationPage: React.FC = () => {
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('interviewId');
  const { currentInterview } = useInterview();
  const navigate = useNavigate();

  const targetInterviewId = routeId || queryId || currentInterview?.id;

  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load interview and evaluation data
  useEffect(() => {
    if (!targetInterviewId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadData() {
      try {
        const composite = await interviewService.getInterview(targetInterviewId!);
        if (isMounted && composite) {
          setInterview(composite.interview);
        }

        // Fetch existing evaluation or auto-evaluate
        const existingEval = evaluationEngine.getEvaluation(targetInterviewId!);
        if (existingEval) {
          if (isMounted) {
            setEvaluation(existingEval);
            setLoading(false);
          }
        } else {
          // Trigger evaluation
          if (isMounted) setEvaluating(true);
          const generated = await evaluationEngine.evaluateInterview(targetInterviewId!);
          if (isMounted) {
            setEvaluation(generated);
            setEvaluating(false);
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Failed to load evaluation:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to generate evaluation.');
          setLoading(false);
          setEvaluating(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [targetInterviewId]);

  // Handle manual re-evaluation
  const handleReevaluate = async () => {
    if (!targetInterviewId) return;
    setEvaluating(true);
    setErrorMsg(null);
    try {
      const regenerated = await evaluationEngine.evaluateInterview(targetInterviewId);
      setEvaluation(regenerated);
    } catch (err: any) {
      console.error('Re-evaluation failed:', err);
      setErrorMsg(err.message || 'Re-evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const suggestedCompetency = useMemo(() => {
    if (!evaluation) return 'Product Sense';
    const valid = (evaluation.competencyEvaluations || []).filter(
      (c) => c.competency !== 'Communication'
    );
    if (valid.length === 0) return 'Product Sense';
    const sorted = [...valid].sort((a, b) => a.score - b.score);
    return sorted[0].competency;
  }, [evaluation]);

  const topStrengths = useMemo(() => {
    return (evaluation?.overallStrengths || []).slice(0, 3);
  }, [evaluation]);

  const topImprovements = useMemo(() => {
    return (evaluation?.priorityImprovements || []).slice(0, 3);
  }, [evaluation]);

  const getRecommendationBadge = (rec?: string) => {
    switch (rec) {
      case 'strong':
        return <Badge variant="success" className="text-xs px-3 py-1 font-bold">Strong Performance</Badge>;
      case 'meets_expectations':
        return <Badge variant="blue" className="text-xs px-3 py-1 font-bold">Meets Expectations</Badge>;
      case 'developing':
        return <Badge variant="warning" className="text-xs px-3 py-1 font-bold">Developing</Badge>;
      default:
        return <Badge variant="destructive" className="text-xs px-3 py-1 font-bold">Needs Improvement</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="success" className="text-[10px]">High Confidence</Badge>;
      case 'medium':
        return <Badge variant="warning" className="text-[10px]">Medium Confidence</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] text-slate-500">Insufficient Evidence</Badge>;
    }
  };

  if (loading || evaluating) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-28 text-center space-y-4 animate-fade-in">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        <h2 className="text-lg font-bold text-slate-900">
          {evaluating ? 'Evaluating Interview Transcript' : 'Loading Evaluation Report'}
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          The independent Evaluation Engine is scoring your responses against the 6 PM competencies, verifying evidence quotes, and synthesizing actionable coaching advice...
        </p>
      </div>
    );
  }

  if (!interview && !evaluation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">No Evaluation Found</h2>
        <p className="text-xs text-slate-500">
          Please select a completed interview from your dashboard or history to view its evaluation.
        </p>
        <Link to="/dashboard">
          <Button size="sm">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Top Header Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">•</span>
            <Badge variant="purple" className="text-xs">
              {interview?.targetRole || 'Product Manager'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {interview?.interviewType || 'PM Interview'}
            </Badge>
            {targetInterviewId && (
              <span className="text-xs font-mono text-slate-400">
                Session: {targetInterviewId}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Interview Performance & Coaching Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Independent assessment evaluated against the structured Product Management competency rubric.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReevaluate}
            disabled={evaluating}
            className="text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Re-evaluate</span>
          </Button>
          <Link to="/setup">
            <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Start New Interview
            </Button>
          </Link>
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

      {/* OVERALL PERFORMANCE HERO CARD */}
      {evaluation && (
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-400" />
                <span>Overall Assessment</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Interview Score: {evaluation.overallScore} / 100
              </h2>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {getRecommendationBadge(evaluation.recommendation)}
                <span className="text-xs text-slate-400 font-mono">
                  Calibrated via Plan Section Weights
                </span>
              </div>
            </div>

            <div className="flex md:flex-col items-start md:items-end gap-1.5 text-xs text-slate-400 font-mono">
              <span>Rubric Version: {evaluation.metadata?.rubricVersion || '2026.1'}</span>
              <span>Model: {evaluation.metadata?.model || 'factual-rubric-evaluator-v1'}</span>
              <span>
                Generated: {new Date(evaluation.generatedAt).toLocaleDateString()}{' '}
                {new Date(evaluation.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Transparency Disclaimer */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Scores are generated against a structured PM interview rubric and are intended as coaching feedback, not a prediction of hiring outcomes.
            </p>
          </div>
        </div>
      )}

      {/* TOP 3 STRENGTHS & TOP 3 FOCUS AREAS */}
      {evaluation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 3 Strengths */}
          <Card className="border-emerald-200/80 bg-emerald-50/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-emerald-100">
              <CardTitle className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Top 3 Demonstrated Strengths</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {topStrengths.length > 0 ? (
                <ul className="space-y-2.5">
                  {topStrengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-snug">
                      <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{str}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No recurring strengths identified.</p>
              )}
            </CardContent>
          </Card>

          {/* Top 3 Priority Focus Areas */}
          <Card className="border-indigo-200/80 bg-indigo-50/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-indigo-100">
              <CardTitle className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-indigo-600" />
                <span>Top 3 Focus Areas for Next Session</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {topImprovements.length > 0 ? (
                <ul className="space-y-3">
                  {topImprovements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-1 flex-1">
                        <p className="font-medium text-slate-800 leading-relaxed">{imp}</p>
                        <p className="text-[11px] text-indigo-800 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100/80">
                          <span className="font-bold">Try next time: </span>
                          State your decision criteria explicitly upfront, define user segmentation, and articulate clear trade-offs.
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No priority improvements recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* COMPETENCY EVALUATION CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <span>Competency Evaluations & Evidence</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Evaluated on 1–5 Rubric
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {evaluation?.competencyEvaluations.map((compEval) => {
            const Icon = COMPETENCY_ICONS[compEval.competency] || Sparkles;
            const isCommunication = compEval.competency === 'Communication';

            return (
              <Card key={compEval.competency} className="border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-indigo-600" />
                      <span>{compEval.competency}</span>
                    </CardTitle>
                    {getConfidenceBadge(compEval.confidence)}
                  </div>
                  {isCommunication && (
                    <p className="text-[11px] text-indigo-700 font-medium pt-0.5">
                      * Evaluated holistically across all responses
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-5 space-y-4 flex-1">
                  {/* Score Row */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Competency Score</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div
                            key={s}
                            className={`h-2.5 w-2.5 rounded-full ${
                              s <= compEval.score ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{compEval.score}.0 / 5</span>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="space-y-2 text-xs">
                    {compEval.strengths.length > 0 && (
                      <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                        <span className="font-bold text-emerald-900 text-[11px] block">Strengths:</span>
                        <ul className="space-y-1 text-slate-700">
                          {compEval.strengths.map((str, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {compEval.weaknesses.length > 0 && (
                      <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1">
                        <span className="font-bold text-amber-900 text-[11px] block">Areas to Improve:</span>
                        <ul className="space-y-1 text-slate-700">
                          {compEval.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Note */}
                  {compEval.recommendation && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                      <span className="font-bold text-indigo-900 text-[11px] block">Coaching Tip:</span>
                      <p className="text-slate-600 leading-relaxed">{compEval.recommendation}</p>
                    </div>
                  )}

                  {/* Verified Evidence 3-Tier Layout (PRD & UI/UX Section 7) */}
                  <div className="space-y-3 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Quote className="h-3 w-3 text-indigo-600" />
                      <span>Transcript Evidence & Reasoning Analysis</span>
                    </span>

                    {compEval.evidence && compEval.evidence.length > 0 ? (
                      <div className="space-y-3">
                        {compEval.evidence.map((ev) => (
                          <div
                            key={ev.id}
                            className="rounded-xl bg-slate-50/80 border border-slate-200 p-3.5 text-xs space-y-2.5"
                          >
                            {/* 1. What You Said */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                                WHAT YOU SAID (Verbatim Excerpt):
                              </span>
                              <p className="italic text-slate-900 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                                "{ev.quote}"
                              </p>
                            </div>

                            {/* 2. What This Showed */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                                WHAT THIS SHOWED:
                              </span>
                              <p className="text-slate-700 text-[11px] leading-relaxed">
                                {ev.observation}
                              </p>
                            </div>

                            {/* 3. What Was Missing / How to Elevate */}
                            {ev.implication && (
                              <div className="space-y-0.5 pt-1 border-t border-slate-200/60">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                                  WHAT WAS MISSING / TO ELEVATE:
                                </span>
                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                  {ev.implication}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {compEval.confidence === 'low'
                          ? 'Insufficient evidence in transcript to evaluate this competency. This area was not a primary focus of this interview session.'
                          : 'No direct excerpt captured for this competency.'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* WHAT TO PRACTICE NEXT BANNER (UI/UX Requirement) */}
      {evaluation && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                What should you practice next?
              </span>
            </div>
            <p className="text-base font-extrabold text-slate-900">
              Suggested Focus: <span className="text-indigo-600">{suggestedCompetency}</span>
            </p>
            <p className="text-xs text-slate-600">
              Directly target your lowest-scoring competency with focused questions and adaptive probing.
            </p>
          </div>
          <Link
            to={`/setup?type=${encodeURIComponent(
              suggestedCompetency === 'Leadership & Behavioral'
                ? 'Leadership & Behavioral'
                : suggestedCompetency
            )}`}
          >
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-2 shadow-sm whitespace-nowrap">
              <span>Practice This Skill</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* NEXT PRACTICE DRILLS SECTION */}
      {evaluation?.nextPracticeRecommendations && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Recommended Next Practice Drills</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Based on your performance in this session, focus your upcoming practice on these targeted exercises:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {evaluation.nextPracticeRecommendations.map((drill, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1.5 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Drill #{i + 1}
                  </span>
                  <p className="leading-snug text-slate-700">{drill}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <Link to="/history">
          <Button variant="outline" size="sm" className="text-xs">
            View All Interview History
          </Button>
        </Link>
        <div className="flex items-center gap-2.5">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs">
              Return to Dashboard
            </Button>
          </Link>
          <Link to="/setup">
            <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Configure Next Interview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
