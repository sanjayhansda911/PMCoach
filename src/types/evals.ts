import { CompetencyName } from './competencies';

export type CompetencyType = CompetencyName;
export type TargetRole =
  | 'Associate Product Manager'
  | 'Product Manager'
  | 'Senior Product Manager'
  | 'Group Product Manager';
export type InterviewDifficulty = 'Standard' | 'Challenging';

// ----------------------------------------------------
// System Type & Failure Taxonomies
// ----------------------------------------------------

export type EvalSystemType = 'interviewer' | 'evaluator';

export type InterviewerFailureType =
  | 'irrelevant_question'
  | 'generic_followup'
  | 'missed_probe'
  | 'repetitive_question'
  | 'premature_topic_change'
  | 'excessive_probing'
  | 'insufficient_probing'
  | 'poor_difficulty_calibration'
  | 'ignored_resume_context'
  | 'ignored_jd_context'
  | 'time_management_failure'
  | 'unrealistic_interviewer_behavior';

export type EvaluatorFailureType =
  | 'hallucinated_evidence'
  | 'incorrect_quote'
  | 'unsupported_score'
  | 'rubric_violation'
  | 'framework_keyword_bias'
  | 'communication_reasoning_conflation'
  | 'insufficient_evidence_ignored'
  | 'inconsistent_scoring'
  | 'generic_feedback'
  | 'unsupported_recommendation';

export type FailureType = InterviewerFailureType | EvaluatorFailureType;

// ----------------------------------------------------
// Eval Metrics
// ----------------------------------------------------

export type InterviewerMetric =
  | 'relevance' // 0 = unrelated, 1 = partially relevant, 2 = highly relevant
  | 'adaptiveness' // 0 = ignores answer, 1 = somewhat adapts, 2 = clearly adapts
  | 'probe_quality' // 0 = no useful probe, 1 = generic/partially useful, 2 = targeted and useful
  | 'repetition' // 0 = repetitive, 1 = acceptable
  | 'difficulty_calibration' // 0 = inappropriate, 1 = acceptable, 2 = appropriate
  | 'plan_adherence' // 0 = poor, 1 = partial, 2 = strong
  | 'pm_realism'; // 0 = unrealistic, 1 = somewhat realistic, 2 = realistic

export type EvaluatorMetric =
  | 'score_validity' // 0 = clearly wrong, 1 = partially correct, 2 = correct
  | 'evidence_accuracy' // 0 = fabricated/incorrect, 1 = partially accurate, 2 = completely grounded
  | 'rubric_adherence' // 0 = poor, 1 = partial, 2 = strong
  | 'framework_bias' // 0 = framework-biased, 1 = framework-independent
  | 'insufficient_evidence_handling' // 0 = fails, 1 = succeeds
  | 'communication_separation' // 0 = conflates them, 1 = distinguishes them
  | 'consistency'; // 0 = inconsistent, 1 = reasonably consistent, 2 = highly consistent

export type EvalMetric = InterviewerMetric | EvaluatorMetric;

// ----------------------------------------------------
// EvalCase Definition
// ----------------------------------------------------

export interface ReferenceEvaluation {
  expectedScoreRange?: [number, number];
  expectedMetrics?: Partial<Record<EvalMetric, number>>;
  keyReasoningPoints: string[];
  rationale: string;
}

export interface InterviewerCaseInput {
  question: string;
  answerText: string;
  targetRole?: TargetRole;
  difficulty?: InterviewDifficulty;
  competency?: CompetencyType;
  history?: Array<{ role: 'interviewer' | 'candidate'; text: string }>;
  timeRemainingSeconds?: number;
  candidateProfile?: any;
  jobProfile?: any;
  currentSectionIndex?: number;
}

export interface EvaluatorCaseInput {
  interview?: any;
  interviewPlan?: any;
  transcript: Array<{
    id?: string;
    role: 'interviewer' | 'candidate';
    text: string;
    timestamp?: string;
  }>;
  candidateProfile?: any;
  jobProfile?: any;
  questions?: any[];
  answers?: any[];
  metadata?: any;
}

export interface EvalCase {
  id: string; // e.g. 'CASE-01'
  name: string;
  category: string;
  systemType: EvalSystemType;
  description: string;
  competency: CompetencyType;
  difficulty: InterviewDifficulty;
  input: InterviewerCaseInput | EvaluatorCaseInput;
  expectedBehavior: string;
  expectedSignals?: string[];
  unacceptableBehavior?: string[];
  referenceEvaluation: ReferenceEvaluation;
  tags: string[];
}

// ----------------------------------------------------
// EvalRun & EvalResult
// ----------------------------------------------------

export interface EvalResult {
  evalRunId: string;
  evalCaseId: string;
  metric: EvalMetric;
  score: number;
  maxScore: number;
  pass: boolean;
  explanation: string;
}

export interface EvalTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface EvalRun {
  id: string;
  evalCaseId: string;
  systemType: EvalSystemType;
  provider: 'gemini' | 'heuristic' | 'openai';
  model: string;
  promptVersion: string;
  rubricVersion: string;
  output: any;
  scores: Record<string, number>;
  failures: FailureType[];
  results: EvalResult[];
  latencyMs: number;
  tokenUsage?: EvalTokenUsage;
  cost?: number;
  passed: boolean;
  normalizedScore: number; // 0 to 100
  createdAt: string;
}

// ----------------------------------------------------
// Human Rating Model
// ----------------------------------------------------

export interface HumanRating {
  id: string;
  evalCaseId: string;
  evaluatorId: string;
  rating: number; // 1 to 5 scale
  notes: string;
  createdAt: string;
}

// ----------------------------------------------------
// Eval Report & Regression
// ----------------------------------------------------

export interface MetricSummary {
  rawAverage: number;
  normalizedPercent: number;
  maxPoints: number;
  count: number;
}

export interface WorstCaseSummary {
  caseId: string;
  caseName: string;
  category: string;
  score: number;
  failures: FailureType[];
}

export interface EvalReport {
  id: string;
  systemType: 'all' | EvalSystemType;
  provider: 'gemini' | 'heuristic' | 'openai';
  totalCases: number;
  passedCases: number;
  failedCases?: number;
  totalFailureInstances?: number;
  uniqueFailureCodes?: number;
  overallScore: number; // 0 to 100
  interviewerScore: number;
  evaluatorScore: number;
  metricScores: Record<string, MetricSummary>;
  failureBreakdown: Record<string, number>;
  worstCases: WorstCaseSummary[];
  runs: EvalRun[];
  model: string;
  promptVersion: string;
  rubricVersion: string;
  totalTokens?: number;
  averageLatencyMs?: number;
  regressionDetected: boolean;
  regressionDetails?: string[];
  createdAt: string;
}
