import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Trash2,
  Calendar,
  Clock,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Award,
} from 'lucide-react';
import { useInterview } from '../context/InterviewContext';
import { interviewStorage } from '../storage/interviewStorage';
import { Interview, TargetRole, InterviewType, CompetencyName } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';

const ALL_ROLES: TargetRole[] = [
  'Associate Product Manager',
  'Product Manager',
  'Senior Product Manager',
  'Group Product Manager',
];

const ALL_TYPES: InterviewType[] = [
  'Product Sense',
  'Execution',
  'Analytics',
  'Strategy',
  'Leadership & Behavioral',
  'Mixed PM Interview',
];

const CORE_COMPETENCIES: CompetencyName[] = [
  'Product Sense',
  'Execution',
  'Analytics',
  'Strategy',
  'Leadership & Behavioral',
  'Communication',
];

export const HistoryPage: React.FC = () => {
  const { interviews, deleteInterview, setCurrentInterview } = useInterview();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'sessions' | 'progress'>('sessions');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Load evaluations
  const evaluationsMap = useMemo(() => {
    const evals = interviewStorage.getAllEvaluations();
    return new Map(evals.map((e) => [e.interviewId, e]));
  }, [interviews]);

  // Filter interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      const matchesSearch =
        interview.jobProfileId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.targetRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFocus =
        selectedFocus === 'all' || interview.interviewType === selectedFocus;
      const matchesRole = selectedRole === 'all' || interview.targetRole === selectedRole;
      return matchesSearch && matchesFocus && matchesRole;
    });
  }, [interviews, searchTerm, selectedFocus, selectedRole]);

  // Competency progression analysis across completed interviews
  const progressAnalytics = useMemo(() => {
    const completed = interviews
      .filter((i) => i.status === 'completed')
      .map((i) => ({
        interview: i,
        evaluation: evaluationsMap.get(i.id),
      }))
      .filter((item): item is { interview: Interview; evaluation: NonNullable<typeof item.evaluation> } => !!item.evaluation)
      .sort((a, b) => new Date(a.interview.createdAt).getTime() - new Date(b.interview.createdAt).getTime());

    // 1. Chronological scores per competency
    const competencyTrends: Record<string, number[]> = {};
    for (const comp of CORE_COMPETENCIES) {
      competencyTrends[comp] = [];
    }

    for (const session of completed) {
      for (const cEval of session.evaluation.competencyEvaluations || []) {
        for (const targetComp of CORE_COMPETENCIES) {
          if (
            cEval.competency.toLowerCase().includes(targetComp.toLowerCase()) ||
            targetComp.toLowerCase().includes(cEval.competency.toLowerCase())
          ) {
            competencyTrends[targetComp].push(cEval.score);
            break;
          }
        }
      }
    }

    // 2. Identify recurring weakness / improvement themes
    const weaknessCounts: Record<string, number> = {};
    for (const session of completed) {
      for (const imp of session.evaluation.priorityImprovements || []) {
        // Group by common PM themes
        let theme = 'Structure & Prioritization';
        if (/metric|telemetry|kpi|analytics/i.test(imp)) theme = 'Metrics & Telemetry Diagnostics';
        else if (/user|persona|empathy|segment/i.test(imp)) theme = 'User Segmentation & Empathy';
        else if (/tradeoff|trade-off|priorit/i.test(imp)) theme = 'Explicit Trade-off Prioritization';
        else if (/stakeholder|lead|team|conflict/i.test(imp)) theme = 'Cross-Functional Stakeholder Alignment';
        else if (/technical|engineer|arch/i.test(imp)) theme = 'Technical Empathy & Feasibility';

        weaknessCounts[theme] = (weaknessCounts[theme] || 0) + 1;
      }
    }

    const recurringObservations = Object.entries(weaknessCounts)
      .filter(([_, count]) => count >= 2)
      .map(([theme, count]) => ({
        theme,
        count,
        total: completed.length,
        message: `You encountered ${theme.toLowerCase()} across ${count} of your ${completed.length} completed interviews.`,
      }));

    return {
      completedSessionsCount: completed.length,
      competencyTrends,
      recurringObservations,
    };
  }, [interviews, evaluationsMap]);

  const handleOpenRoom = (interview: Interview) => {
    setCurrentInterview(interview);
    navigate(`/interview/${interview.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" className="text-xs">
              Interview History
            </Badge>
            <span className="text-xs text-slate-400">{interviews.length} Sessions Logged</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Mock Interview Sessions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse and manage all configured mock interviews, track performance trends, and review coaching reports.
          </p>
        </div>

        <Link to="/setup">
          <Button className="gap-2 shadow-sm">
            <PlusCircle className="h-4 w-4" />
            <span>New Mock Session</span>
          </Button>
        </Link>
      </div>

      {/* Tab Selector: Sessions vs Progress */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'sessions'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Interview Sessions ({interviews.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'progress'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Progress & Growth ({progressAnalytics.completedSessionsCount} Evaluated)</span>
        </button>
      </div>

      {activeTab === 'sessions' ? (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Search */}
                <div className="md:col-span-6">
                  <Input
                    placeholder="Search by session ID or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<Search className="h-4 w-4" />}
                    className="h-10 text-xs"
                  />
                </div>

                {/* Focus filter */}
                <div className="md:col-span-3">
                  <select
                    value={selectedFocus}
                    onChange={(e) => setSelectedFocus(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">All Interview Types</option>
                    {ALL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role filter */}
                <div className="md:col-span-3">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">All Seniority Levels</option>
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview List or Empty State */}
          {interviews.length === 0 ? (
            /* Canonical Empty State (UI/UX Spec) */
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white">
              <History className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-900">Your interview history starts here</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5 max-w-md mx-auto leading-relaxed">
                Complete your first mock interview to start tracking your progress, competency trends, and coaching reports.
              </p>
              <Link to="/setup">
                <Button size="sm">Start Interview</Button>
              </Link>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white">
              <Search className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No mock interviews match your filter</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Try resetting search parameters to see all sessions.
              </p>
              <Button size="sm" variant="outline" onClick={() => { setSearchTerm(''); setSelectedFocus('all'); setSelectedRole('all'); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInterviews.map((interview) => {
                const evaluation = evaluationsMap.get(interview.id);
                const isCompleted = interview.status === 'completed';

                return (
                  <div
                    key={interview.id}
                    className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md/50 flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="space-y-2.5 flex-1">
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
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(interview.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {isCompleted && (
                          <Badge variant="success" className="text-xs flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        )}
                        {evaluation && (
                          <Badge variant="blue" className="text-xs font-bold">
                            Score: {evaluation.overallScore}/100
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Session ID: <span className="font-mono text-slate-500 font-normal">{interview.id}</span>
                        </p>
                        {evaluation?.priorityImprovements && evaluation.priorityImprovements.length > 0 && (
                          <p className="text-xs text-amber-800 bg-amber-50/80 p-2 rounded-xl border border-amber-200/70 line-clamp-1">
                            <span className="font-bold">Key Weakness / Focus: </span>
                            {evaluation.priorityImprovements[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-2.5 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                      {isCompleted && evaluation ? (
                        <Link to={`/evaluation/${interview.id}`}>
                          <Button size="sm" variant="outline" className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                            <FileText className="h-3.5 w-3.5" />
                            <span>View Report</span>
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenRoom(interview)}
                          className="text-xs gap-1"
                        >
                          <span>Open Room</span>
                          <ArrowRight className="h-3.5 w-3.5" />
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
      ) : (
        /* Progress View: Competency Trends & Recurring Patterns (PRD & UI/UX Spec) */
        <div className="space-y-6">
          {progressAnalytics.completedSessionsCount === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white">
              <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-900">No competency trends yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5 max-w-md mx-auto">
                Complete at least one mock interview to start seeing longitudinal competency progression and recurring performance patterns.
              </p>
              <Link to="/setup">
                <Button size="sm">Start First Mock Session</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Competency Trajectory Progression Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        <span>Competency Progression Over Time</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chronological score evolution across your completed mock interview sessions (1.0–5.0 scale).
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {progressAnalytics.completedSessionsCount} Sessions Evaluated
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {CORE_COMPETENCIES.map((comp) => {
                      const scores = progressAnalytics.competencyTrends[comp] || [];
                      const hasData = scores.length > 0;
                      const latestScore = hasData ? scores[scores.length - 1] : null;
                      const firstScore = hasData ? scores[0] : null;
                      const diff = hasData && scores.length >= 2 ? Number((latestScore! - firstScore!).toFixed(1)) : 0;

                      return (
                        <div key={comp} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{comp}</span>
                            <div className="flex items-center gap-2">
                              {scores.length >= 2 && (
                                <Badge
                                  variant={diff > 0 ? 'success' : diff < 0 ? 'warning' : 'outline'}
                                  className="text-[10px]"
                                >
                                  {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'Steady'}
                                </Badge>
                              )}
                              <span className="text-xs font-mono text-slate-500">
                                {hasData ? `Latest: ${latestScore} / 5.0` : 'No data'}
                              </span>
                            </div>
                          </div>

                          {/* Progression sequence */}
                          {hasData ? (
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-slate-400 text-[11px] font-sans">Trajectory:</span>
                              {scores.map((score, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && <span className="text-slate-300">➔</span>}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      score >= 4.0
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : score >= 3.0
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {score.toFixed(1)}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No evaluated sessions in this competency yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Cross-Interview Recurring Patterns */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Award className="h-4 w-4 text-indigo-600" />
                      <span>Cross-Interview Recurring Patterns</span>
                    </h2>
                    <span className="text-xs text-slate-400">Behavioral consistency across rounds</span>
                  </div>

                  {progressAnalytics.recurringObservations.length > 0 ? (
                    <div className="space-y-3">
                      {progressAnalytics.recurringObservations.map((obs, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900">{obs.theme}</span>
                            <Badge variant="warning" className="text-[10px]">
                              Frequency: {obs.count}/{obs.total} Sessions
                            </Badge>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{obs.message}</p>
                          <p className="text-[11px] text-indigo-700 font-medium pt-1">
                            Coaching Recommendation: Prioritize this explicitly in your next mock practice session.
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      <p className="leading-relaxed">
                        No recurring weakness patterns identified yet across multiple sessions. As you complete more interviews, systemic tendencies (e.g. prioritization habits, telemetry edge cases) will appear here.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
