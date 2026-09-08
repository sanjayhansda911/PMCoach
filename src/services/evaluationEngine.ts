import { Evaluation, EvaluationInput } from '../types';
import { interviewStorage } from '../storage/interviewStorage';
import { interviewService } from './interviewService';
import { aiProvider } from './aiProvider';

export const evaluationEngine = {
  /**
   * Independently evaluates a completed interview transcript against the PM rubric.
   * Assembles only public interview artifacts and transcript — strictly excluding
   * the interviewer's hidden internal thoughts or probe decisions.
   */
  async evaluateInterview(interviewId: string): Promise<Evaluation> {
    const composite = await interviewService.getInterview(interviewId);
    if (!composite || !composite.interview) {
      throw new Error(`Interview with ID "${interviewId}" was not found.`);
    }

    const { interview, candidateProfile, jobProfile } = composite;
    const plan = interviewStorage.getInterviewPlanByInterviewId(interviewId);
    const transcript = interviewStorage.getExchangesForInterview(interviewId);
    const questions = interviewStorage.getQuestionsForInterview(interviewId);
    const answers = interviewStorage.getAnswersForInterview(interviewId);

    // Assemble EvaluationInput strictly without interviewer runtime thoughts or probe policies
    const input: EvaluationInput = {
      interview,
      candidateProfile,
      jobProfile,
      interviewPlan: plan,
      transcript,
      questions,
      answers,
      metadata: {
        model: 'factual-rubric-evaluator-v1',
        promptVersion: '1.0.0',
        rubricVersion: '2026.1',
      },
    };

    const evaluation = await aiProvider.evaluateInterview(input);

    // Save evaluation in storage
    interviewStorage.saveEvaluation(evaluation);

    // Update interview status to 'evaluated'
    await interviewService.updateInterview(interviewId, { status: 'evaluated' });

    return evaluation;
  },

  /**
   * Retrieves an existing evaluation or generates a new one if not yet evaluated.
   */
  async getOrGenerateEvaluation(interviewId: string): Promise<Evaluation> {
    const existing = interviewStorage.getEvaluationByInterviewId(interviewId);
    if (existing) {
      return existing;
    }
    return this.evaluateInterview(interviewId);
  },

  /**
   * Retrieves an existing evaluation if present in storage.
   */
  getEvaluation(interviewId: string): Evaluation | null {
    return interviewStorage.getEvaluationByInterviewId(interviewId);
  },
};
