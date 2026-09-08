import {
  InterviewPlan,
  AnswerAnalysis,
  AnswerSignal,
  InterviewState,
  InterviewActionType,
  TargetRole,
  InterviewDifficulty,
  InterviewDuration,
  CandidateProfile,
  JobProfile,
  InterviewBrief,
  Evaluation,
  EvaluationInput,
} from '../types';
import {
  factualPlanGenerator,
  factualAnswerAnalyzer,
  factualFollowUpGenerator,
  factualEvaluationEngine,
} from './factualEngine';

export interface FollowUpResponse {
  followUpQuestion: string;
  actionType: InterviewActionType;
  probeReason: string;
  targetSignal?: string;
}

export const aiProvider = {
  /**
   * Generates a structured InterviewPlan from the InterviewBrief and profiles.
   */
  async createPlan(params: {
    brief: InterviewBrief;
    candidateProfile: CandidateProfile | null;
    jobProfile: JobProfile | null;
    duration: InterviewDuration;
    difficulty: InterviewDifficulty;
    targetRole: TargetRole;
    interviewId: string;
  }): Promise<InterviewPlan> {
    return factualPlanGenerator({
      brief: params.brief,
      candidateProfile: params.candidateProfile,
      jobProfile: params.jobProfile,
      duration: Number(params.duration) || 30,
      difficulty: params.difficulty || 'Standard',
      targetRole: params.targetRole,
      interviewId: params.interviewId,
    }) as InterviewPlan;
  },

  /**
   * Analyzes the candidate's answer for control signals, missing elements, and potential issues.
   */
  async analyzeCandidateAnswer(params: {
    question: string;
    answerText: string;
    expectedSignals: AnswerSignal[];
    candidateProfile: CandidateProfile | null;
    jobProfile: JobProfile | null;
    role: TargetRole;
    difficulty: InterviewDifficulty;
  }): Promise<AnswerAnalysis> {
    return factualAnswerAnalyzer({
      question: params.question,
      answerText: params.answerText,
      expectedSignals: params.expectedSignals,
      candidateProfile: params.candidateProfile,
      jobProfile: params.jobProfile,
      role: params.role,
      difficulty: params.difficulty,
    }) as AnswerAnalysis;
  },

  /**
   * Generates a targeted, answer-specific follow-up probe.
   */
  async generateFollowUp(params: {
    question: string;
    answerText: string;
    analysis: AnswerAnalysis;
    plan: InterviewPlan;
    state: InterviewState;
    candidateProfile: CandidateProfile | null;
    jobProfile: JobProfile | null;
  }): Promise<FollowUpResponse> {
    return factualFollowUpGenerator({
      question: params.question,
      answerText: params.answerText,
      analysis: params.analysis,
      plan: params.plan,
      state: params.state,
      candidateProfile: params.candidateProfile,
      jobProfile: params.jobProfile,
    }) as FollowUpResponse;
  },

  /**
   * Evaluates a completed interview transcript against the PM competency taxonomy.
   */
  async evaluateInterview(params: EvaluationInput): Promise<Evaluation> {
    return factualEvaluationEngine({
      interview: params.interview,
      candidateProfile: params.candidateProfile,
      jobProfile: params.jobProfile,
      interviewPlan: params.interviewPlan,
      transcript: params.transcript,
      questions: params.questions,
      answers: params.answers,
      metadata: params.metadata,
    }) as Evaluation;
  },
};
