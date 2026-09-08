import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  PlusCircle,
  TrendingUp,
  BarChart3,
  Award,
  CheckCircle2,
  Trash2,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { interviewStorage } from '../storage/interviewStorage';
import { Interview } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';

const CORE_COMPETENCIES = [
  { key: 'Product Sense', label: 'Product Sense' },
  { key: 'Execution', label: 'Execution & Triage' },
  { key: 'Analytics', label: 'Analytics & Metrics' },
  { key: 'Strategy', label: 'Strategy & Moats' },
  { key: 'Leadership & Behavioral', label: 'Leadership & Behavioral' },
] as const;

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { interviews, deleteInterview, setCurrentInterview } = useInterview();
  const navigate = useNavigate();

  const handleResumeInterview = (interview: Interview) => {
    setCurrentInterview(interview);
    navigate(`/interview/${interview.id}`);
  };

  const activeRole = user?.targetRole || 'Product Manager';

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Candidate';

  // Performance calculations from stored evaluations
  const {
    completedInterviews,
    avgScoreDisplay,
    practiceHoursDisplay,
    improvementDisplay,
    competencyAverages,
    evaluationsMap,
  } = useMemo(() => {
    const completed = interviews.filter((i) => i.status === 'completed');
    const allEvals = interviewStorage.getAllEvaluations();
    const evalMap = new Map(allEvals.map((e) => [e.interviewId, e]));

    // Completed with evals
    const completedWithEvals = completed
      .map((i) => ({ interview: i, eval: evalMap.get(i.id) }))
      .filter((item): item is { interview: Interview; eval: NonNullable<typeof item.eval> } => !!item.eval);

    // 1. Average score
    const avgScore =
      completedWithEvals.length > 0
        ? Math.round(
            completedWithEvals.reduce((sum, item) => sum + item.eval.overallScore, 0) /
              completedWithEvals.length
          )
        : null;

    // 2. Practice hours
    const totalMinutes = completed.reduce((sum, i) => sum + (Number(i.duration) || 30), 0);
    const hours = (totalMinutes / 60).toFixed(1);

    // 3. Improvement: first completed vs most recent completed
    let improvementText = '—';
    if (completedWithEvals.length >= 2) {
      // Sort oldest to newest
      const sorted = [...completedWithEvals].sort(
        (a, b) => new Date(a.interview.createdAt).getTime() - new Date(b.interview.createdAt).getTime()
      );
      const firstScore = sorted[0].eval.overallScore;
      const latestScore = sorted[sorted.length - 1].eval.overallScore;
      const diff = latestScore - firstScore;
      improvementText = diff > 0 ? `+${diff} pts` : diff < 0 ? `${diff} pts` : '0 pts';
    } else if (completedWithEvals.length === 1) {
      improvementText = 'Baseline set';
    }

    // 4. Competency scores out of 5.0
    const compTotals: Record<string, { sum: number; count: number }> = {};
    for (const comp of CORE_COMPETENCIES) {
      compTotals[comp.key] = { sum: 0, count: 0 };
    }

    for (const item of completedWithEvals) {
      for (const compEval of item.eval.competencyEvaluations || []) {
        for (const targetComp of CORE_COMPETENCIES) {
          if (
            compEval.competency.toLowerCase().includes(targetComp.key.toLowerCase()) ||
            targetComp.key.toLowerCase().includes(compEval.competency.toLowerCase())
          ) {
            compTotals[targetComp.key].sum += compEval.score;
            compTotals[targetComp.key].count += 1;
            break;
          }
        }
      }
    }

    const compAverages = CORE_COMPETENCIES.map((comp) => {
      const data = compTotals[comp.key];
      const avg = data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0;
      return {
        key: comp.key,
        label: comp.label,
        score: avg,
        count: data.count,
      };
    });

    return {
      completedInterviews: completed,
      avgScoreDisplay: avgScore !== null ? `${avgScore}/100` : '—',
      practiceHoursDisplay: `${hours} hrs`,
      improvementDisplay: improvementText,
      competencyAverages: compAverages,
      evaluationsMap: evalMap,
    };
  }, [interviews]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {greeting}, {firstName}
            </h1>
            <Badge variant="purple" className="text-xs">
              {activeRole}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Ready for your next practice? Track your competency growth and prepare for real product interviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/setup">
            <Button className="gap-2 shadow-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Start New Interview</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Performance Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Interviews Completed
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {completedInterviews.length}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {interviews.length} total configured
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Average Score
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {avgScoreDisplay}
              </h3>
              <p className="text-[11px] text-indigo-600 font-medium mt-1">
                Calibrated against rubric
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Practice Hours
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {practiceHoursDisplay}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Live interview time
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Improvement
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {improvementDisplay}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Score trajectory
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competency Progress (5 Horizontal Bars) */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                Competency Progress Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated on a 5.0 scale across your completed mock interview answers.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Scale: 1.0 (Needs Dev) – 5.0 (Strong)</span>
          </div>

          <div className="space-y-4">
            {competencyAverages.map((comp) => {
              const percentage = Math.min(100, Math.max(0, (comp.score / 5.0) * 100));
              const labelState =
                comp.count === 0
                  ? 'No data yet'
                  : comp.score >= 4.0
                  ? 'Strong'
                  : comp.score >= 3.0
                  ? 'Proficient'
                  : 'Developing';

              return (
                <div key={comp.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{comp.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono">
                        {comp.count > 0 ? `${comp.score} / 5.0` : '— / 5.0'}
                      </span>
                      <Badge
                        variant={
                          labelState === 'Strong'
                            ? 'success'
                            : labelState === 'Proficient'
                            ? 'blue'
                            : labelState === 'Developing'
                            ? 'warning'
                            : 'outline'
                        }
                        className="text-[10px] py-0 px-1.5"
                      >
                        {labelState}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        comp.count === 0
                          ? 'bg-slate-200'
                          : comp.score >= 4.0
                          ? 'bg-emerald-500'
                          : comp.score >= 3.0
                          ? 'bg-indigo-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${comp.count === 0 ? 0 : percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configured Interviews List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Mock Interviews</h2>
            <p className="text-xs text-slate-500">
              Sessions tailored to your target job profile, resume, and focus competencies.
            </p>
          </div>
          <Link to="/setup">
            <Button size="sm" variant="outline" className="text-xs">
              + New Interview
            </Button>
          </Link>
        </div>

        {interviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
            <Target className="mx-auto h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No mock interviews set up yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Configure your first interview session with your target role and job description.
            </p>
            <Link to="/setup">
              <Button size="sm">Configure First Interview</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {interviews.map((interview) => {
              const evaluation = evaluationsMap.get(interview.id);
              const isCompleted = interview.status === 'completed';

              return (
                <div
                  key={interview.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2 flex-1">
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
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {interview.duration} min
                      </span>
                      {isCompleted ? (
                        <Badge variant="success" className="text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">
                          • Status: <span className="font-medium text-slate-600">{interview.status}</span>
                        </span>
                      )}
                      {evaluation && (
                        <Badge variant="blue" className="text-xs font-semibold">
                          Score: {evaluation.overallScore}/100
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Session: <span className="font-mono text-slate-500 font-normal">{interview.id}</span>
                        <span className="text-slate-400 font-normal ml-3">
                          {new Date(interview.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                      {evaluation?.priorityImprovements && evaluation.priorityImprovements.length > 0 && (
                        <p className="text-xs text-slate-600 bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 line-clamp-1">
                          <span className="font-semibold text-amber-800">Focus: </span>
                          {evaluation.priorityImprovements[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    {isCompleted ? (
                      <Link to={`/evaluation/${interview.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          <FileText className="h-3.5 w-3.5" />
                          <span>View Report</span>
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleResumeInterview(interview)}
                        className="text-xs"
                      >
                        <span>Open Room</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteInterview(interview.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete interview"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Core PM Interview Principles Reference Card (PRD Principle 2: Reasoning over frameworks) */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          PM Interview Core Principles (Reasoning Over Frameworks)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-white p-3.5 border border-slate-200/70 shadow-xs">
            <p className="font-bold text-slate-900 mb-1">Problem Framing</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Define target users, core pain points, and business constraints before proposing solutions.
            </p>
          </div>
          <div className="rounded-xl bg-white p-3.5 border border-slate-200/70 shadow-xs">
            <p className="font-bold text-slate-900 mb-1">Explicit Trade-offs</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              State decision criteria clearly and justify what you chose NOT to build alongside your recommendations.
            </p>
          </div>
          <div className="rounded-xl bg-white p-3.5 border border-slate-200/70 shadow-xs">
            <p className="font-bold text-slate-900 mb-1">Metrics Diagnostics</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Segment metrics into North Star, input drivers, and counter-metrics to safeguard the ecosystem.
            </p>
          </div>
          <div className="rounded-xl bg-white p-3.5 border border-slate-200/70 shadow-xs">
            <p className="font-bold text-slate-900 mb-1">Cross-Functional Action</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Demonstrate genuine engineering empathy, stakeholder navigation, and quantified retrospective impact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
