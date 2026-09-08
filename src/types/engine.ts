import { TargetRole, InterviewType, InterviewDifficulty, InterviewDuration } from './index';
import { CompetencyName } from './competencies';

export type InterviewStateMachineState =
  | 'SETUP'
  | 'INTRODUCTION'
  | 'ASKING'
  | 'LISTENING'
  | 'ANALYZING'
  | 'FOLLOW_UP'
  | 'SECTION_COMPLETE'
  | 'NEXT_SECTION'
  | 'INTERVIEW_COMPLETE';

export type AnswerSignal =
  | 'clear_problem_definition'
  | 'user_identification'
  | 'segmentation'
  | 'prioritization'
  | 'metric_definition'
  | 'metric_decomposition'
  | 'root_cause_reasoning'
  | 'hypothesis_generation'
  | 'hypothesis_prioritization'
  | 'tradeoff_reasoning'
  | 'business_reasoning'
  | 'technical_awareness'
  | 'experimentation'
  | 'stakeholder_reasoning'
  | 'structured_communication'
  | 'concise_communication'
  | 'ownership'
  | 'quantified_impact';

export type AnswerIssue =
  | 'premature_solution'
  | 'unsupported_assumption'
  | 'shallow_reasoning'
  | 'missing_metric'
  | 'weak_prioritization'
  | 'excessive_breadth'
  | 'unclear_structure'
  | 'contradictory_reasoning'
  | 'no_tradeoff'
  | 'no_user_focus'
  | 'solution_without_problem';

export interface AnswerAnalysis {
  id: string;
  interviewId: string;
  questionId: string;
  answerId: string;
  detectedSignals: AnswerSignal[];
  missingSignals: AnswerSignal[];
  potentialIssues: AnswerIssue[];
  probeRecommended: boolean;
  probeReason: string | null;
  suggestedProbeType:
    | 'challenge_assumption'
    | 'request_clarification'
    | 'ask_follow_up'
    | 'increase_constraint'
    | 'redirect_problem'
    | null;
  confidence: number; // 0.0 to 1.0
  createdAt: string;
}

export interface ProbePolicy {
  maxFollowUpsPerQuestion: number;
  issueTriggers: AnswerIssue[];
  strongAnswerBehavior: 'add_constraint' | 'competing_priority' | 'counterargument';
  depthLevel: 'standard' | 'deep' | 'strategic';
}

export interface InterviewSectionPlan {
  id: string;
  sectionNumber: number;
  competency: CompetencyName;
  theme: string;
  primaryQuestion: string;
  expectedSignals: AnswerSignal[];
  targetClaimsToProbe: string[];
  probePolicy: ProbePolicy;
}

export interface InterviewPlan {
  id: string;
  interviewId: string;
  targetRole: TargetRole;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  allocatedMinutes: InterviewDuration;
  sections: InterviewSectionPlan[];
  createdAt: string;
}

export interface InterviewState {
  interviewId: string;
  currentStage: InterviewStateMachineState;
  currentSectionIndex: number;
  currentQuestionId: string | null;
  followUpCountForCurrentQuestion: number;
  totalQuestionsAsked: number;
  totalFollowUpsAsked: number;
  coveredCompetencies: CompetencyName[];
  detectedSignalsAcrossInterview: AnswerSignal[];
  observedIssuesAcrossInterview: AnswerIssue[];
  claimsDiscussed: string[];
  startedAt: string;
  elapsedSeconds: number;
  lastUpdated: string;
}

export type InterviewActionType =
  | 'ask_question'
  | 'ask_follow_up'
  | 'challenge_assumption'
  | 'request_clarification'
  | 'move_to_next_section'
  | 'end_interview';

export interface InterviewAction {
  type: InterviewActionType;
  message: string;
  questionId: string;
  questionType: 'primary' | 'follow_up' | 'probe' | 'transition' | 'closing';
  competency: CompetencyName;
  sectionIndex: number;
  probeReason?: string;
  targetSignal?: string;
}

/**
 * Canonical TranscriptSegment entity (Backend Schema Section 18 & 26)
 * First-class entity for both text and future voice interviews.
 */
export interface TranscriptSegment {
  id: string;
  interviewId: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  sequenceNumber: number;
  timestampStart?: number;
  timestampEnd?: number;
  questionId?: string;
  answerId?: string;
  actionType?: InterviewActionType;
  createdAt?: string;
}

export interface ConversationExchange {
  id: string;
  interviewId: string;
  role: 'interviewer' | 'candidate';
  speaker?: 'interviewer' | 'candidate';
  text: string;
  sequenceNumber?: number;
  timestamp: string;
  timestampStart?: number;
  timestampEnd?: number;
  actionType?: InterviewActionType;
  questionId?: string;
  answerId?: string;
}
