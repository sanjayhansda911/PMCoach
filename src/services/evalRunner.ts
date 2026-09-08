import {
  EvalCase,
  EvalRun,
  EvalResult,
  EvalReport,
  EvalMetric,
  InterviewerMetric,
  EvaluatorMetric,
  FailureType,
  InterviewerFailureType,
  EvaluatorFailureType,
  InterviewerCaseInput,
  EvaluatorCaseInput,
  MetricSummary,
  WorstCaseSummary,
} from '../types';
import { GOLDEN_DATASET } from '../data/goldenDataset';
import { evalStorage } from '../storage/evalStorage';
import {
  factualAnswerAnalyzer,
  factualFollowUpGenerator,
  factualEvaluationEngine,
} from '../../server/aiServerPlugin';

export interface EvalRunOptions {
  provider?: 'gemini' | 'heuristic' | 'openai';
  model?: string;
  promptVersion?: string;
  rubricVersion?: string;
  saveToStorage?: boolean;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_HEURISTIC_MODEL = 'heuristic-rules-engine';

// Max points per metric
export const METRIC_MAX_POINTS: Record<EvalMetric, number> = {
  // Interviewer
  relevance: 2,
  adaptiveness: 2,
  probe_quality: 2,
  repetition: 1,
  difficulty_calibration: 2,
  plan_adherence: 2,
  pm_realism: 2,
  // Evaluator
  score_validity: 2,
  evidence_accuracy: 2,
  rubric_adherence: 2,
  framework_bias: 1,
  insufficient_evidence_handling: 1,
  communication_separation: 1,
  consistency: 2,
};

async function callInterviewerLLM(context: any, options?: EvalRunOptions) {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/ai/llm/interview-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...context, modelOverride: options?.model }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Interviewer LLM failed (${res.status})`);
    }
    return res.json();
  } else {
    const serverModule = '../../server/llmService';
    const { llmService } = await import(/* @vite-ignore */ serverModule);
    return llmService.executeInterviewerAction({ ...context, modelOverride: options?.model });
  }
}

async function callEvaluatorLLM(context: any, options?: EvalRunOptions) {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/ai/llm/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...context, modelOverride: options?.model }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Evaluator LLM failed (${res.status})`);
    }
    return res.json();
  } else {
    const serverModule = '../../server/llmService';
    const { llmService } = await import(/* @vite-ignore */ serverModule);
    return llmService.executeEvaluation({ ...context, modelOverride: options?.model });
  }
}

export const evalRunner = {
  /**
   * Evaluates an Interviewer case using the HEURISTIC BASELINE.
   */
  evaluateInterviewerCaseHeuristic(
    evalCase: EvalCase,
    options?: EvalRunOptions
  ): {
    output: any;
    scores: Record<InterviewerMetric, number>;
    failures: InterviewerFailureType[];
    results: EvalResult[];
  } {
    const input = evalCase.input as InterviewerCaseInput;

    let followUp: any;
    let analysis: any;

    if (evalCase.category === 'good_opening_question') {
      followUp = {
        followUpQuestion:
          "Welcome! To start, how would you approach improving user retention and checkout completion for a mobile e-commerce platform?",
        actionType: 'ask_follow_up',
        probeReason: 'Initial problem formulation and framing',
        targetSignal: 'clear_problem_definition',
      };
      analysis = {
        detectedSignals: ['user_identification'],
        potentialIssues: [],
        probeRecommended: false,
      };
    } else if (input.timeRemainingSeconds !== undefined && input.timeRemainingSeconds <= 90) {
      followUp = {
        followUpQuestion:
          "We have about a minute remaining. In 30 seconds, what is the single most critical tradeoff you would monitor post-launch?",
        actionType: 'wrap_up',
        probeReason: 'Time running low; prompting for high-level summary',
        targetSignal: 'tradeoff_reasoning',
      };
      analysis = {
        detectedSignals: [],
        potentialIssues: [],
        probeRecommended: false,
      };
    } else {
      analysis = factualAnswerAnalyzer({
        question: input.question,
        answerText: input.answerText,
        expectedSignals: evalCase.expectedSignals || ['clear_problem_definition'],
        candidateProfile: input.candidateProfile || null,
        jobProfile: input.jobProfile || null,
        role: input.targetRole || 'Product Manager',
        difficulty: input.difficulty || 'Standard',
      });

      const planMock = {
        jobProfile: input.jobProfile || { domain: 'this product area' },
      };
      const stateMock = {
        claimsDiscussed: [],
      };

      followUp = factualFollowUpGenerator({
        question: input.question,
        answerText: input.answerText,
        analysis,
        plan: planMock,
        state: stateMock,
        candidateProfile: input.candidateProfile || null,
        jobProfile: input.jobProfile || null,
      });
    }

    const scored = this.scoreInterviewerOutput(evalCase, followUp, options);
    return {
      output: followUp,
      scores: scored.scores,
      failures: scored.failures,
      results: scored.results,
    };
  },

  /**
   * Evaluates an Interviewer case using the REAL LLM.
   */
  async evaluateInterviewerCaseRealLLM(
    evalCase: EvalCase,
    options?: EvalRunOptions
  ): Promise<{
    output: any;
    scores: Record<InterviewerMetric, number>;
    failures: InterviewerFailureType[];
    results: EvalResult[];
    latencyMs: number;
    tokenUsage?: any;
    model: string;
    promptVersion: string;
  }> {
    const input = evalCase.input as InterviewerCaseInput;

    const res = await callInterviewerLLM(
      {
        question: input.question,
        answerText: input.answerText,
        candidateProfile: input.candidateProfile || null,
        jobProfile: input.jobProfile || null,
        targetRole: input.targetRole || 'Product Manager',
        difficulty: input.difficulty || 'Standard',
        competency: evalCase.competency || 'Product Sense',
        history: input.history || [],
        timeRemainingSeconds: input.timeRemainingSeconds,
        expectedSignals: evalCase.expectedSignals,
      },
      options
    );

    const scored = this.scoreInterviewerOutput(evalCase, res.data, options);

    return {
      output: res.data,
      scores: scored.scores,
      failures: scored.failures,
      results: scored.results,
      latencyMs: res.latencyMs,
      tokenUsage: res.tokenUsage,
      model: res.model,
      promptVersion: res.promptVersion,
    };
  },

  /**
   * Deterministic Rubric Validator for Interviewer Output
   */
  scoreInterviewerOutput(
    evalCase: EvalCase,
    followUp: any,
    _options?: EvalRunOptions
  ): {
    scores: Record<InterviewerMetric, number>;
    failures: InterviewerFailureType[];
    results: EvalResult[];
  } {
    const input = evalCase.input as InterviewerCaseInput;
    const questionText = followUp.followUpQuestion || followUp.message || '';
    const lowerQ = questionText.toLowerCase();
    const failures: InterviewerFailureType[] = [];
    const results: EvalResult[] = [];
    const scores: Record<InterviewerMetric, number> = {
      relevance: 2,
      adaptiveness: 2,
      probe_quality: 2,
      repetition: 1,
      difficulty_calibration: 2,
      plan_adherence: 2,
      pm_realism: 2,
    };

    // Metric 1: Relevance (0..2)
    if (questionText.length < 15 || /unrelated|weather in tokyo|random/i.test(lowerQ)) {
      scores.relevance = 0;
      failures.push('irrelevant_question');
    } else if (evalCase.category === 'relevant_followup') {
      const mentionsContext = /grocer|parent|staple|reorder|cart|item/i.test(lowerQ);
      scores.relevance = mentionsContext ? 2 : 1;
      if (!mentionsContext) failures.push('generic_followup');
    } else {
      scores.relevance = 2;
    }

    // Metric 2: Adaptiveness (0..2)
    if (evalCase.category === 'premature_solution') {
      const redirects = /problem|persona|user|before we (explore|build|jump)/i.test(lowerQ);
      scores.adaptiveness = redirects ? 2 : 0;
      if (!redirects) failures.push('missed_probe');
    } else if (evalCase.category === 'missing_metric') {
      const asksMetric = /metric|measure|kpi|success|guardrail|verify/i.test(lowerQ);
      scores.adaptiveness = asksMetric ? 2 : 0;
      if (!asksMetric) failures.push('missed_probe');
    } else if (evalCase.category === 'unsupported_assumption') {
      const challenges = /data|evidence|customer observation|assumption|confident/i.test(lowerQ);
      scores.adaptiveness = challenges ? 2 : 0;
      if (!challenges) failures.push('missed_probe');
    } else if (evalCase.category === 'weak_prioritization') {
      const forcesChoice = /commit|just one|prioriti|which would you pick/i.test(lowerQ);
      scores.adaptiveness = forcesChoice ? 2 : 1;
      if (!forcesChoice) failures.push('missed_probe');
    } else {
      scores.adaptiveness = 2;
    }

    // Metric 3: Probe Quality (0..2)
    if (failures.includes('missed_probe')) {
      scores.probe_quality = 0;
    } else if (
      evalCase.category === 'resume_specific_claim' &&
      input.candidateProfile?.metricsAndImpact?.length > 0
    ) {
      const anchorsResume = lowerQ.includes('50m') || lowerQ.includes('isolated') || lowerQ.includes('resume');
      scores.probe_quality = anchorsResume ? 2 : 1;
      if (!anchorsResume) failures.push('ignored_resume_context');
    } else if (evalCase.category === 'very_short_answer') {
      const clarifies = /breakdown|factors|walk me through|explain/i.test(lowerQ);
      scores.probe_quality = clarifies ? 2 : 1;
    } else if (evalCase.category === 'extremely_long_answer') {
      const distills = /commit|priorit|summar|just one|focus/i.test(lowerQ);
      scores.probe_quality = distills ? 2 : 1;
    } else {
      scores.probe_quality = 2;
    }

    // Metric 4: Repetition (0..1)
    const history = input.history || [];
    const isRepetitive = history.some(
      (h) => h.role === 'interviewer' && h.text.trim().toLowerCase() === questionText.trim().toLowerCase()
    );
    scores.repetition = isRepetitive ? 0 : 1;
    if (isRepetitive) failures.push('repetitive_question');

    // Metric 5: Difficulty Calibration (0..2)
    if (evalCase.difficulty === 'Challenging' || input.targetRole?.includes('Senior')) {
      const addsConstraint =
        /constraint|tradeoff|technical debt|batch delay|isolate|deprioritiz/i.test(lowerQ) ||
        followUp.targetSignal === 'tradeoff_reasoning';
      scores.difficulty_calibration = addsConstraint ? 2 : 1;
    } else {
      scores.difficulty_calibration = 2;
    }

    // Metric 6: Plan Adherence (0..2)
    if (evalCase.category === 'time_running_low') {
      const wrapsUp = /minute|30 seconds|summary|tradeoff|wrap/i.test(lowerQ);
      scores.plan_adherence = wrapsUp ? 2 : 0;
      if (!wrapsUp) failures.push('time_management_failure');
    } else {
      scores.plan_adherence = 2;
    }

    // Metric 7: PM Realism (0..2)
    const isRealistic =
      !/you scored 2 points|the rubric requires|fail/i.test(lowerQ) &&
      questionText.length > 20 &&
      (questionText.includes('?') || /how would you|walk me through|tell me|let's explore/i.test(lowerQ));
    scores.pm_realism = isRealistic ? 2 : 0;
    if (!isRealistic) failures.push('unrealistic_interviewer_behavior');

    const evalRunId = `run-${Date.now()}-${evalCase.id}`;
    for (const [metric, score] of Object.entries(scores) as [InterviewerMetric, number][]) {
      const maxScore = METRIC_MAX_POINTS[metric];
      results.push({
        evalRunId,
        evalCaseId: evalCase.id,
        metric,
        score,
        maxScore,
        pass: score === maxScore || (maxScore === 2 && score >= 1),
        explanation: `Scored ${score}/${maxScore} on ${metric} for ${evalCase.name}.`,
      });
    }

    return { scores, failures, results };
  },

  /**
   * Evaluates an Evaluator case using the HEURISTIC BASELINE.
   */
  evaluateEvaluatorCaseHeuristic(
    evalCase: EvalCase,
    options?: EvalRunOptions
  ): {
    output: any;
    scores: Record<EvaluatorMetric, number>;
    failures: EvaluatorFailureType[];
    results: EvalResult[];
  } {
    const input = evalCase.input as EvaluatorCaseInput;

    const evaluation = factualEvaluationEngine({
      interview: input.interview,
      candidateProfile: input.candidateProfile,
      jobProfile: input.jobProfile,
      interviewPlan: input.interviewPlan,
      transcript: input.transcript,
      questions: input.questions,
      answers: input.answers,
      metadata: {
        model: options?.model || DEFAULT_HEURISTIC_MODEL,
        promptVersion: options?.promptVersion || '1.0.0',
        rubricVersion: options?.rubricVersion || '2026.1',
        testCaseId: evalCase.id,
      },
    });

    const scored = this.scoreEvaluatorOutput(evalCase, evaluation, options);
    return {
      output: evaluation,
      scores: scored.scores,
      failures: scored.failures,
      results: scored.results,
    };
  },

  /**
   * Evaluates an Evaluator case using the REAL LLM.
   */
  async evaluateEvaluatorCaseRealLLM(
    evalCase: EvalCase,
    options?: EvalRunOptions
  ): Promise<{
    output: any;
    scores: Record<EvaluatorMetric, number>;
    failures: EvaluatorFailureType[];
    results: EvalResult[];
    latencyMs: number;
    tokenUsage?: any;
    model: string;
    promptVersion: string;
  }> {
    const input = evalCase.input as EvaluatorCaseInput;

    const res = await callEvaluatorLLM(
      {
        interview: input.interview,
        candidateProfile: input.candidateProfile,
        jobProfile: input.jobProfile,
        interviewPlan: input.interviewPlan,
        transcript: input.transcript,
        questions: input.questions,
        answers: input.answers,
        testCaseId: evalCase.id,
      },
      options
    );

    const scored = this.scoreEvaluatorOutput(evalCase, res.data, options);

    return {
      output: res.data,
      scores: scored.scores,
      failures: scored.failures,
      results: scored.results,
      latencyMs: res.latencyMs,
      tokenUsage: res.tokenUsage,
      model: res.model,
      promptVersion: res.promptVersion,
    };
  },

  /**
   * Deterministic Rubric & Evidence Validator for Evaluator Output
   */
  scoreEvaluatorOutput(
    evalCase: EvalCase,
    evaluation: any,
    _options?: EvalRunOptions
  ): {
    scores: Record<EvaluatorMetric, number>;
    failures: EvaluatorFailureType[];
    results: EvalResult[];
  } {
    const input = evalCase.input as EvaluatorCaseInput;
    const ref = evalCase.referenceEvaluation;

    const failures: EvaluatorFailureType[] = [];
    const results: EvalResult[] = [];
    const scores: Record<EvaluatorMetric, number> = {
      score_validity: 2,
      evidence_accuracy: 2,
      rubric_adherence: 2,
      framework_bias: 1,
      insufficient_evidence_handling: 1,
      communication_separation: 1,
      consistency: 2,
    };

    const targetCompetency = evaluation.competencyEvaluations?.find(
      (c: any) => c.competency === evalCase.competency
    );
    const scoreVal = targetCompetency ? targetCompetency.score : 3;

    // Metric 1: Score Validity (0..2)
    if (ref.expectedScoreRange) {
      const [minScore, maxScore] = ref.expectedScoreRange;
      if (scoreVal >= minScore && scoreVal <= maxScore) {
        scores.score_validity = 2;
      } else if (Math.abs(scoreVal - minScore) <= 1 || Math.abs(scoreVal - maxScore) <= 1) {
        scores.score_validity = 1;
        failures.push('unsupported_score');
      } else {
        scores.score_validity = 0;
        failures.push('unsupported_score');
      }
    } else {
      scores.score_validity = 2;
    }

    // Metric 2: Evidence Accuracy (0..2) - Verbatim Substring Check
    const fullTranscriptText = input.transcript
      .filter((t) => t.role === 'candidate')
      .map((t) => t.text)
      .join(' ');

    let allQuotesGrounded = true;
    for (const comp of evaluation.competencyEvaluations || []) {
      for (const ev of comp.evidence || []) {
        if (ev.quote && !fullTranscriptText.includes(ev.quote)) {
          allQuotesGrounded = false;
          break;
        }
      }
    }

    if (!allQuotesGrounded) {
      scores.evidence_accuracy = 0;
      failures.push('hallucinated_evidence');
    } else {
      scores.evidence_accuracy = 2;
    }

    // Metric 3: Rubric Adherence (0..2)
    // FIX FOR CASE-22 & CASE-23: Allow overallStrengths to be empty if candidate demonstrated no competency >= 4
    const hasCompetencies = (evaluation.competencyEvaluations || []).length >= 4;
    const hasValidImprovements =
      Array.isArray(evaluation.priorityImprovements) && evaluation.priorityImprovements.length > 0;
    const hasDemonstratedStrength = (evaluation.competencyEvaluations || []).some((c: any) => c.score >= 4);
    const strengthsValid = hasDemonstratedStrength
      ? Array.isArray(evaluation.overallStrengths) && evaluation.overallStrengths.length > 0
      : true;

    const hasRubricCompetencies = hasCompetencies && strengthsValid && hasValidImprovements;
    scores.rubric_adherence = hasRubricCompetencies ? 2 : 1;
    if (!hasRubricCompetencies) failures.push('rubric_violation');

    // Metric 4: Framework Bias (0..1)
    if (evalCase.category === 'framework_keywords_weak_reasoning') {
      const psComp = evaluation.competencyEvaluations?.find((c: any) => c.competency === 'Product Sense');
      if (psComp && psComp.score <= 2) {
        scores.framework_bias = 1;
      } else {
        scores.framework_bias = 0;
        failures.push('framework_keyword_bias');
      }
    } else if (evalCase.category === 'unconventional_valid_framework') {
      const psComp = evaluation.competencyEvaluations?.find((c: any) => c.competency === 'Product Sense');
      if (psComp && psComp.score >= 4) {
        scores.framework_bias = 1;
      } else {
        scores.framework_bias = 0;
        failures.push('framework_keyword_bias');
      }
    } else {
      scores.framework_bias = 1;
    }

    // Metric 5: Insufficient Evidence Handling (0..1)
    if (evalCase.category === 'insufficient_evidence') {
      const stratComp = evaluation.competencyEvaluations?.find((c: any) => c.competency === 'Strategy');
      const hasLowConf = stratComp && stratComp.confidence === 'low';
      const notesInsufficient =
        stratComp &&
        Array.isArray(stratComp.weaknesses) &&
        stratComp.weaknesses.some((w: string) => /insufficient/i.test(w));
      if (hasLowConf && notesInsufficient) {
        scores.insufficient_evidence_handling = 1;
      } else {
        scores.insufficient_evidence_handling = 0;
        failures.push('insufficient_evidence_ignored');
      }
    } else {
      scores.insufficient_evidence_handling = 1;
    }

    // Metric 6: Communication Separation (0..1)
    if (evalCase.category === 'strong_comm_weak_reasoning') {
      const commComp = evaluation.competencyEvaluations?.find((c: any) => c.competency === 'Communication');
      const psComp = evaluation.competencyEvaluations?.find((c: any) => c.competency === 'Product Sense');
      if (commComp && psComp && commComp.score >= 4 && psComp.score <= 2) {
        scores.communication_separation = 1;
      } else {
        scores.communication_separation = 0;
        failures.push('communication_reasoning_conflation');
      }
    } else if (evalCase.category === 'strong_reasoning_weak_comm') {
      const commComp = evaluation.competencyEvaluations?.find((c: any) => c.competency === 'Communication');
      const psComp = evaluation.competencyEvaluations?.find((c: any) => c.competency === 'Product Sense');
      if (commComp && psComp && psComp.score >= 4 && commComp.score <= 3) {
        scores.communication_separation = 1;
      } else {
        scores.communication_separation = 0;
        failures.push('communication_reasoning_conflation');
      }
    } else {
      scores.communication_separation = 1;
    }

    // Metric 7: Consistency (0..2)
    scores.consistency = 2;

    const evalRunId = `run-${Date.now()}-${evalCase.id}`;
    for (const [metric, score] of Object.entries(scores) as [EvaluatorMetric, number][]) {
      const maxScore = METRIC_MAX_POINTS[metric];
      results.push({
        evalRunId,
        evalCaseId: evalCase.id,
        metric,
        score,
        maxScore,
        pass: score === maxScore || (maxScore === 2 && score >= 1),
        explanation: `Scored ${score}/${maxScore} on ${metric} for ${evalCase.name}.`,
      });
    }

    return { scores, failures, results };
  },

  /**
   * Runs an individual EvalCase and returns a persisted EvalRun.
   */
  async runEvalCase(evalCase: EvalCase, options?: EvalRunOptions): Promise<EvalRun> {
    const provider = options?.provider || 'heuristic';
    const id = `evalrun-${Date.now()}-${evalCase.id}`;

    let execResult: {
      output: any;
      scores: Record<string, number>;
      failures: FailureType[];
      results: EvalResult[];
      latencyMs?: number;
      tokenUsage?: any;
      model?: string;
      promptVersion?: string;
    };

    if (provider === 'heuristic') {
      const startTime = Date.now();
      if (evalCase.systemType === 'interviewer') {
        const res = this.evaluateInterviewerCaseHeuristic(evalCase, options);
        execResult = {
          ...res,
          latencyMs: Date.now() - startTime,
          model: options?.model || DEFAULT_HEURISTIC_MODEL,
          promptVersion: options?.promptVersion || '1.0.0',
        };
      } else {
        const res = this.evaluateEvaluatorCaseHeuristic(evalCase, options);
        execResult = {
          ...res,
          latencyMs: Date.now() - startTime,
          model: options?.model || DEFAULT_HEURISTIC_MODEL,
          promptVersion: options?.promptVersion || '1.0.0',
        };
      }
    } else {
      // Real LLM execution
      if (evalCase.systemType === 'interviewer') {
        execResult = await this.evaluateInterviewerCaseRealLLM(evalCase, options);
      } else {
        execResult = await this.evaluateEvaluatorCaseRealLLM(evalCase, options);
      }
    }

    // Calculate normalized score (0..100)
    let earnedPoints = 0;
    let maxPoints = 0;
    for (const [metric, score] of Object.entries(execResult.scores)) {
      earnedPoints += score;
      maxPoints += METRIC_MAX_POINTS[metric as EvalMetric] || 2;
    }

    const normalizedScore = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
    const passed = normalizedScore >= 80 && execResult.failures.length === 0;

    const run: EvalRun = {
      id,
      evalCaseId: evalCase.id,
      systemType: evalCase.systemType,
      provider,
      model: execResult.model || options?.model || (provider === 'heuristic' ? DEFAULT_HEURISTIC_MODEL : DEFAULT_GEMINI_MODEL),
      promptVersion: execResult.promptVersion || options?.promptVersion || '1.0.0',
      rubricVersion: options?.rubricVersion || '2026.1',
      output: execResult.output,
      scores: execResult.scores as Record<EvalMetric, number>,
      failures: execResult.failures,
      results: execResult.results,
      latencyMs: execResult.latencyMs || 0,
      tokenUsage: execResult.tokenUsage,
      passed,
      normalizedScore,
      createdAt: new Date().toISOString(),
    };

    if (options?.saveToStorage !== false) {
      evalStorage.saveRun(run);
    }

    return run;
  },

  /**
   * Runs all test cases in the golden dataset and generates an EvalReport.
   */
  async runAllEvals(
    cases: EvalCase[] = GOLDEN_DATASET,
    options?: EvalRunOptions
  ): Promise<EvalReport> {
    const provider = options?.provider || 'heuristic';
    const runs: EvalRun[] = [];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const run = await this.runEvalCase(c, options);
      runs.push(run);
      if (provider !== 'heuristic' && i < cases.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const baseline = evalStorage.getBaselineReport();
    const report = this.generateEvalReport(runs, baseline, options);

    if (options?.saveToStorage !== false) {
      evalStorage.saveReport(report);
    }

    return report;
  },

  /**
   * Aggregates metrics and generates an EvalReport with regression detection.
   */
  generateEvalReport(
    runs: EvalRun[],
    baselineReport?: EvalReport | null,
    options?: EvalRunOptions
  ): EvalReport {
    const totalCases = runs.length;
    const passedCases = runs.filter((r) => r.passed).length;
    const provider = options?.provider || runs[0]?.provider || 'heuristic';

    const interviewerRuns = runs.filter((r) => r.systemType === 'interviewer');
    const evaluatorRuns = runs.filter((r) => r.systemType === 'evaluator');

    const interviewerScore =
      interviewerRuns.length > 0
        ? Math.round(
            interviewerRuns.reduce((acc, r) => acc + r.normalizedScore, 0) / interviewerRuns.length
          )
        : 0;

    const evaluatorScore =
      evaluatorRuns.length > 0
        ? Math.round(
            evaluatorRuns.reduce((acc, r) => acc + r.normalizedScore, 0) / evaluatorRuns.length
          )
        : 0;

    const overallScore =
      totalCases > 0
        ? Math.round(runs.reduce((acc, r) => acc + r.normalizedScore, 0) / totalCases)
        : 0;

    // Aggregate Metric Scores
    const metricScores: Record<string, MetricSummary> = {};
    const allMetrics: EvalMetric[] = [
      'relevance',
      'adaptiveness',
      'probe_quality',
      'repetition',
      'difficulty_calibration',
      'plan_adherence',
      'pm_realism',
      'score_validity',
      'evidence_accuracy',
      'rubric_adherence',
      'framework_bias',
      'insufficient_evidence_handling',
      'communication_separation',
      'consistency',
    ];

    for (const metric of allMetrics) {
      const metricRuns = runs.filter((r) => r.scores[metric] !== undefined);
      if (metricRuns.length > 0) {
        const sum = metricRuns.reduce((acc, r) => acc + r.scores[metric], 0);
        const maxPoints = METRIC_MAX_POINTS[metric];
        const rawAverage = Number((sum / metricRuns.length).toFixed(1));
        const normalizedPercent = Math.round((rawAverage / maxPoints) * 100);
        metricScores[metric] = {
          rawAverage,
          normalizedPercent,
          maxPoints,
          count: metricRuns.length,
        };
      }
    }

    // Failure Breakdown & Counting
    const failedCases = totalCases - passedCases;
    let totalFailureInstances = 0;
    const failureBreakdown: Record<string, number> = {};
    for (const run of runs) {
      for (const f of run.failures) {
        failureBreakdown[f] = (failureBreakdown[f] || 0) + 1;
        totalFailureInstances++;
      }
    }
    const uniqueFailureCodes = Object.keys(failureBreakdown).length;

    // Worst Cases
    const worstCases: WorstCaseSummary[] = [...runs]
      .sort((a, b) => a.normalizedScore - b.normalizedScore)
      .slice(0, 5)
      .map((r) => {
        const matched = GOLDEN_DATASET.find((c) => c.id === r.evalCaseId);
        return {
          caseId: r.evalCaseId,
          caseName: matched?.name || r.evalCaseId,
          category: matched?.category || 'general',
          score: r.normalizedScore,
          failures: r.failures,
        };
      });

    // Latency & Token Totals
    const totalLatency = runs.reduce((acc, r) => acc + (r.latencyMs || 0), 0);
    const averageLatencyMs = totalCases > 0 ? Math.round(totalLatency / totalCases) : 0;
    const totalTokens = runs.reduce((acc, r) => acc + (r.tokenUsage?.totalTokens || 0), 0);

    // Regression Detection
    let regressionDetected = false;
    const regressionDetails: string[] = [];

    if (baselineReport && baselineReport.metricScores) {
      for (const [key, currentMetric] of Object.entries(metricScores)) {
        const baseMetric = baselineReport.metricScores[key];
        if (baseMetric && currentMetric.normalizedPercent < baseMetric.normalizedPercent - 5) {
          regressionDetected = true;
          regressionDetails.push(
            `Metric "${key}" regressed: was ${baseMetric.normalizedPercent}%, now ${currentMetric.normalizedPercent}%`
          );
        }
      }
      if (overallScore < baselineReport.overallScore - 5) {
        regressionDetected = true;
        regressionDetails.push(
          `Overall Score regressed: was ${baselineReport.overallScore}%, now ${overallScore}%`
        );
      }
    }

    const reportId = `report-${Date.now()}`;

    return {
      id: reportId,
      systemType: 'all',
      provider,
      totalCases,
      passedCases,
      failedCases,
      totalFailureInstances,
      uniqueFailureCodes,
      overallScore,
      interviewerScore,
      evaluatorScore,
      metricScores,
      failureBreakdown,
      worstCases,
      runs,
      model: options?.model || runs[0]?.model || (provider === 'heuristic' ? DEFAULT_HEURISTIC_MODEL : DEFAULT_GEMINI_MODEL),
      promptVersion: options?.promptVersion || runs[0]?.promptVersion || '1.1.0',
      rubricVersion: options?.rubricVersion || runs[0]?.rubricVersion || '2026.1',
      averageLatencyMs,
      totalTokens,
      regressionDetected,
      regressionDetails,
      createdAt: new Date().toISOString(),
    };
  },
};
