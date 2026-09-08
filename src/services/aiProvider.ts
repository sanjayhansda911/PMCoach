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
    const response = await fetch('/api/ai/interview/create-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Plan creation failed with status ${response.status}`);
    }

    return response.json();
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
    const response = await fetch('/api/ai/interview/analyze-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Answer analysis failed with status ${response.status}`);
    }

    return response.json();
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
    const response = await fetch('/api/ai/interview/generate-follow-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Follow-up generation failed with status ${response.status}`);
    }

    return response.json();
  },

  /**
   * Evaluates a completed interview transcript against the PM competency taxonomy.
   */
  async evaluateInterview(params: EvaluationInput): Promise<Evaluation> {
    const doFetch = async () => {
      const response = await fetch('/api/ai/evaluation/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Evaluation failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data || typeof data.overallScore !== 'number' || !Array.isArray(data.competencyEvaluations)) {
        throw new Error('Malformed evaluation response from AI provider.');
      }
      return data as Evaluation;
    };

    try {
      return await doFetch();
    } catch (firstError) {
      console.warn('[AIProvider] First evaluation attempt failed, retrying once:', firstError);
      return await doFetch();
    }
  },
};
