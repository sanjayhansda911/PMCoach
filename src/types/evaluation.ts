import { CompetencyName } from './competencies';
import { CandidateProfile, JobProfile } from './intelligence';
import { InterviewPlan, ConversationExchange } from './engine';
import type { Interview, InterviewQuestion, InterviewAnswer } from './index';

export type EvidenceSignalType = 'strength' | 'weakness' | 'missing_signal' | 'contradiction';

export interface Evidence {
  id: string;
  transcriptSegmentId: string;
  quote: string; // Exact short excerpt from candidate answer, NEVER fabricated or paraphrased
  observation: string;
  implication: string;
  competency: CompetencyName;
  signalType: EvidenceSignalType;
}

export type EvaluationConfidence = 'high' | 'medium' | 'low';

export interface CompetencyEvaluation {
  competency: CompetencyName;
  score: number; // Integer from 1 to 5
  confidence: EvaluationConfidence;
  strengths: string[];
  weaknesses: string[];
  evidence: Evidence[];
  recommendation: string;
}

export type ReasoningQuality = 'weak' | 'adequate' | 'strong' | 'exceptional';
export type AnswerQuality = 'weak' | 'adequate' | 'strong' | 'exceptional';

export interface AnswerEvaluation {
  questionId: string;
  competency: CompetencyName;
  observedSignals: string[];
  missingSignals: string[];
  strengths: string[];
  weaknesses: string[];
  evidence: Evidence[];
  reasoningQuality: ReasoningQuality;
  answerQuality: AnswerQuality;
}

export type CrossInterviewObservationType =
  | 'consistency'
  | 'improvement'
  | 'repeated_strength'
  | 'repeated_weakness'
  | 'contradiction';

export interface CrossInterviewObservation {
  id?: string;
  userId?: string;
  competency?: CompetencyName;
  observation?: string;
  supportingInterviewIds?: string[];
  frequency?: number;
  confidence?: EvaluationConfidence;
  createdAt?: string;
  type?: CrossInterviewObservationType;
  description?: string;
  evidence?: Evidence[];
  impact?: string;
}

export type EvaluationRecommendation =
  | 'strong'
  | 'meets_expectations'
  | 'developing'
  | 'needs_improvement';

export interface EvaluationMetadata {
  model?: string;
  promptVersion?: string;
  rubricVersion?: string;
  testCaseId?: string;
}

export interface Evaluation {
  id: string;
  interviewId: string;
  overallScore: number; // 0 to 100, weighted by competency weights from InterviewPlan
  competencyEvaluations: CompetencyEvaluation[];
  overallStrengths: string[];
  overallWeaknesses: string[];
  priorityImprovements: string[]; // Specific, actionable
  nextPracticeRecommendations?: string[]; // 2-3 concrete things candidate should practice next
  recommendation: EvaluationRecommendation;
  crossInterviewObservations?: CrossInterviewObservation[];
  answerEvaluations?: AnswerEvaluation[];
  metadata?: EvaluationMetadata;
  generatedAt: string;
}

export interface EvaluationInput {
  interview: Interview;
  candidateProfile: CandidateProfile | null;
  jobProfile: JobProfile | null;
  interviewPlan: InterviewPlan | null;
  transcript: ConversationExchange[];
  questions?: InterviewQuestion[];
  answers?: InterviewAnswer[];
  metadata?: EvaluationMetadata;
}
