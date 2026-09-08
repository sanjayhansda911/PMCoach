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
    try {
      const response = await fetch('/api/ai/interview/create-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[aiProvider] /api/ai/interview/create-plan returned ${response.status}, using client-side plan generator.`);
    } catch (networkErr) {
      console.warn('[aiProvider] /api/ai/interview/create-plan unreachable, using client-side plan generator:', networkErr);
    }

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
    try {
      const response = await fetch('/api/ai/interview/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[aiProvider] /api/ai/interview/analyze-answer returned ${response.status}, using client-side answer analyzer.`);
    } catch (networkErr) {
      console.warn('[aiProvider] /api/ai/interview/analyze-answer unreachable, using client-side answer analyzer:', networkErr);
    }

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
    try {
      const response = await fetch('/api/ai/interview/generate-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[aiProvider] /api/ai/interview/generate-follow-up returned ${response.status}, using client-side follow-up generator.`);
    } catch (networkErr) {
      console.warn('[aiProvider] /api/ai/interview/generate-follow-up unreachable, using client-side follow-up generator:', networkErr);
    }

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
    try {
      const response = await fetch('/api/ai/evaluation/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.overallScore === 'number' && Array.isArray(data.competencyEvaluations)) {
          return data as Evaluation;
        }
      }
      console.warn(`[aiProvider] /api/ai/evaluation/evaluate returned ${response.status}, using client-side evaluator.`);
    } catch (networkErr) {
      console.warn('[aiProvider] /api/ai/evaluation/evaluate unreachable, using client-side evaluator:', networkErr);
    }

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
