import {
  InterviewPlan,
  InterviewState,
  ConversationExchange,
  AnswerAnalysis,
  InterviewSectionPlan,
} from '../types';
import { interviewStorage } from '../storage/interviewStorage';
import { interviewService } from './interviewService';
import { aiProvider } from './aiProvider';

export interface InterviewEngineResult {
  state: InterviewState;
  plan: InterviewPlan;
  analysis?: AnswerAnalysis;
  interviewerResponse?: ConversationExchange;
}

export const interviewEngine = {
  /**
   * Retrieves an existing InterviewPlan or generates one on demand from the interview's profiles.
   */
  async initOrGetPlan(interviewId: string): Promise<InterviewPlan> {
    const existing = interviewStorage.getInterviewPlanByInterviewId(interviewId);
    if (existing) {
      return existing;
    }

    const composite = await interviewService.getInterview(interviewId);
    if (!composite || !composite.interview) {
      throw new Error(`Interview with ID "${interviewId}" was not found.`);
    }

    const { interview, candidateProfile, jobProfile, brief } = composite;

    if (!brief) {
      throw new Error(`InterviewBrief is missing for interview "${interviewId}".`);
    }

    const plan = await aiProvider.createPlan({
      brief,
      candidateProfile,
      jobProfile,
      duration: interview.duration,
      difficulty: interview.difficulty,
      targetRole: interview.targetRole,
      interviewId,
    });

    interviewStorage.saveInterviewPlan(plan);
    return plan;
  },

  /**
   * Retrieves or initializes the InterviewState for the session.
   */
  initOrGetState(interviewId: string, plan: InterviewPlan): InterviewState {
    const existing = interviewStorage.getInterviewStateByInterviewId(interviewId);
    if (existing) {
      return existing;
    }

    const firstSection: InterviewSectionPlan | undefined = plan.sections[0];
    const timestamp = new Date().toISOString();

    const initialState: InterviewState = {
      interviewId,
      currentStage: 'SETUP',
      currentSectionIndex: 0,
      currentQuestionId: firstSection?.id || null,
      followUpCountForCurrentQuestion: 0,
      totalQuestionsAsked: 0,
      totalFollowUpsAsked: 0,
      coveredCompetencies: [],
      detectedSignalsAcrossInterview: [],
      observedIssuesAcrossInterview: [],
      claimsDiscussed: [],
      startedAt: timestamp,
      elapsedSeconds: 0,
      lastUpdated: timestamp,
    };

    interviewStorage.saveInterviewState(initialState);
    return initialState;
  },

  /**
   * Starts or resumes an interview session.
   * If an interview is already in progress, returns the existing state and conversation history.
   * If fresh, introduces the interviewer and poses the first question from Section 0.
   */
  async startInterview(interviewId: string): Promise<{
    state: InterviewState;
    plan: InterviewPlan;
    exchanges: ConversationExchange[];
  }> {
    const plan = await this.initOrGetPlan(interviewId);
    let state = this.initOrGetState(interviewId, plan);
    const existingExchanges = interviewStorage.getExchangesForInterview(interviewId);

    // If already started and has exchanges, return existing conversation (supports browser refresh)
    if (existingExchanges.length > 0) {
      return { state, plan, exchanges: existingExchanges };
    }

    // Initialize fresh interview
    const firstSection = plan.sections[0];
    if (!firstSection) {
      throw new Error('Interview plan has no sections configured.');
    }

    const openingMessage =
      `Hello! Welcome to your Product Management interview. Today we'll explore key competency areas calibrated for the **${plan.targetRole}** role over our **${plan.allocatedMinutes}-minute** session.\n\n` +
      `Let's begin with our first section on **${firstSection.competency}**:\n\n` +
      firstSection.primaryQuestion;

    const openingExchange: ConversationExchange = {
      id: `exch-${Date.now()}-intro`,
      interviewId,
      role: 'interviewer',
      text: openingMessage,
      timestamp: new Date().toISOString(),
      actionType: 'ask_question',
      questionId: firstSection.id,
    };

    interviewStorage.saveExchange(openingExchange);

    state = {
      ...state,
      currentStage: 'ASKING',
      currentQuestionId: firstSection.id,
      totalQuestionsAsked: 1,
      coveredCompetencies: [firstSection.competency],
      lastUpdated: new Date().toISOString(),
    };
    interviewStorage.saveInterviewState(state);

    await interviewService.startInterview(interviewId);

    return {
      state,
      plan,
      exchanges: [openingExchange],
    };
  },

  /**
   * Submits a candidate answer, triggers answer analysis, updates running signals/issues,
   * and decides whether to follow up, move to next section, or conclude the interview.
   */
  async submitAnswer(
    interviewId: string,
    answerText: string
  ): Promise<{
    state: InterviewState;
    plan: InterviewPlan;
    analysis: AnswerAnalysis;
    interviewerResponse: ConversationExchange;
  }> {
    const trimmed = answerText.trim();
    if (!trimmed) {
      throw new Error('Answer cannot be empty.');
    }

    const plan = await this.initOrGetPlan(interviewId);
    let state = this.initOrGetState(interviewId, plan);

    if (state.currentStage === 'INTERVIEW_COMPLETE') {
      throw new Error('Interview has already concluded.');
    }

    // 1. Record candidate answer exchange
    const candidateExchange: ConversationExchange = {
      id: `exch-${Date.now()}-cand`,
      interviewId,
      role: 'candidate',
      text: trimmed,
      timestamp: new Date().toISOString(),
      questionId: state.currentQuestionId || undefined,
    };
    interviewStorage.saveExchange(candidateExchange);

    // Save backwards-compatible Answer record
    interviewStorage.saveAnswer({
      id: `ans-${Date.now()}`,
      interviewId,
      questionId: state.currentQuestionId || 'q-active',
      answerText: trimmed,
      durationSeconds: 0,
      createdAt: new Date().toISOString(),
    });

    // 2. Transition state to ANALYZING
    state = {
      ...state,
      currentStage: 'ANALYZING',
      lastUpdated: new Date().toISOString(),
    };
    interviewStorage.saveInterviewState(state);

    // 3. Fetch context for analysis
    const composite = await interviewService.getInterview(interviewId);
    const candidateProfile = composite?.candidateProfile || null;
    const jobProfile = composite?.jobProfile || null;

    const currentSection = plan.sections[state.currentSectionIndex] || plan.sections[0];

    // Find the latest interviewer question prompt
    const allExchanges = interviewStorage.getExchangesForInterview(interviewId);
    const interviewerExchanges = allExchanges.filter((e) => e.role === 'interviewer');
    const lastInterviewerPrompt =
      interviewerExchanges[interviewerExchanges.length - 1]?.text || currentSection.primaryQuestion;

    // 4. Run answer analysis
    const analysis = await aiProvider.analyzeCandidateAnswer({
      question: lastInterviewerPrompt,
      answerText: trimmed,
      expectedSignals: currentSection.expectedSignals,
      candidateProfile,
      jobProfile,
      role: plan.targetRole,
      difficulty: plan.difficulty,
    });
    interviewStorage.saveAnswerAnalysis(analysis);

    // 5. Accumulate detected signals & issues without duplicates
    const combinedSignals = Array.from(
      new Set([...state.detectedSignalsAcrossInterview, ...analysis.detectedSignals])
    );
    const combinedIssues = Array.from(
      new Set([...state.observedIssuesAcrossInterview, ...analysis.potentialIssues])
    );

    state = {
      ...state,
      detectedSignalsAcrossInterview: combinedSignals,
      observedIssuesAcrossInterview: combinedIssues,
    };

    // 6. Branching Logic
    const maxProbes = currentSection.probePolicy?.maxFollowUpsPerQuestion ?? 2;
    const hasProbesRemaining = state.followUpCountForCurrentQuestion < maxProbes;

    const totalAllocatedSec = plan.allocatedMinutes * 60;
    const timeRemaining = totalAllocatedSec - state.elapsedSeconds;
    const isTimeRunningLow = timeRemaining <= 90; // Less than 90 seconds left

    // Branch A: Should we probe?
    if (analysis.probeRecommended && hasProbesRemaining && !isTimeRunningLow) {
      const followUp = await aiProvider.generateFollowUp({
        question: lastInterviewerPrompt,
        answerText: trimmed,
        analysis,
        plan,
        state,
        candidateProfile,
        jobProfile,
      });

      const interviewerExchange: ConversationExchange = {
        id: `exch-${Date.now()}-followup`,
        interviewId,
        role: 'interviewer',
        text: followUp.followUpQuestion,
        timestamp: new Date().toISOString(),
        actionType: followUp.actionType,
        questionId: state.currentQuestionId || undefined,
      };
      interviewStorage.saveExchange(interviewerExchange);

      state = {
        ...state,
        currentStage: 'FOLLOW_UP',
        followUpCountForCurrentQuestion: state.followUpCountForCurrentQuestion + 1,
        totalFollowUpsAsked: state.totalFollowUpsAsked + 1,
        lastUpdated: new Date().toISOString(),
      };
      interviewStorage.saveInterviewState(state);

      return { state, plan, analysis, interviewerResponse: interviewerExchange };
    }

    // Branch B: Section complete -> Next section or wrap up
    const nextSectionIndex = state.currentSectionIndex + 1;

    if (nextSectionIndex < plan.sections.length && !isTimeRunningLow) {
      const nextSection = plan.sections[nextSectionIndex];

      const transitionTemplates = [
        `Thank you. Let's move to our next section focusing on **${nextSection.competency}**:\n\n${nextSection.primaryQuestion}`,
        `Understood. Shifting gears to **${nextSection.competency}**:\n\n${nextSection.primaryQuestion}`,
        `Got it. Let's transition to the next topic—**${nextSection.competency}**:\n\n${nextSection.primaryQuestion}`,
      ];
      const transitionText = transitionTemplates[nextSectionIndex % transitionTemplates.length];

      const interviewerExchange: ConversationExchange = {
        id: `exch-${Date.now()}-nextsec`,
        interviewId,
        role: 'interviewer',
        text: transitionText,
        timestamp: new Date().toISOString(),
        actionType: 'move_to_next_section',
        questionId: nextSection.id,
      };
      interviewStorage.saveExchange(interviewerExchange);

      const updatedCompetencies = Array.from(
        new Set([...state.coveredCompetencies, nextSection.competency])
      );

      state = {
        ...state,
        currentSectionIndex: nextSectionIndex,
        currentStage: 'ASKING',
        currentQuestionId: nextSection.id,
        followUpCountForCurrentQuestion: 0,
        totalQuestionsAsked: state.totalQuestionsAsked + 1,
        coveredCompetencies: updatedCompetencies,
        lastUpdated: new Date().toISOString(),
      };
      interviewStorage.saveInterviewState(state);

      return { state, plan, analysis, interviewerResponse: interviewerExchange };
    }

    // Branch C: All sections finished or time limit reached
    const closingMessage =
      `Thank you for walking through those scenarios and questions with me. That concludes our interview session today. ` +
      `You have completed all planned competency evaluations.\n\n` +
      `You can now review your interview session summary and exchange history.`;

    const closingExchange: ConversationExchange = {
      id: `exch-${Date.now()}-complete`,
      interviewId,
      role: 'interviewer',
      text: closingMessage,
      timestamp: new Date().toISOString(),
      actionType: 'end_interview',
    };
    interviewStorage.saveExchange(closingExchange);

    state = {
      ...state,
      currentStage: 'INTERVIEW_COMPLETE',
      lastUpdated: new Date().toISOString(),
    };
    interviewStorage.saveInterviewState(state);
    await interviewService.completeInterview(interviewId);

    return { state, plan, analysis, interviewerResponse: closingExchange };
  },

  /**
   * Concludes the interview early upon candidate request.
   */
  async endInterview(
    interviewId: string,
    reason?: string
  ): Promise<{ state: InterviewState; closingExchange: ConversationExchange }> {
    const plan = await this.initOrGetPlan(interviewId);
    let state = this.initOrGetState(interviewId, plan);

    state = {
      ...state,
      currentStage: 'INTERVIEW_COMPLETE',
      lastUpdated: new Date().toISOString(),
    };
    interviewStorage.saveInterviewState(state);
    await interviewService.completeInterview(interviewId);

    const message = reason
      ? `Interview concluded early: ${reason}. Thank you for your time today.`
      : `Thank you for taking the time to participate. That concludes our interview session today.`;

    const closingExchange: ConversationExchange = {
      id: `exch-${Date.now()}-concluded`,
      interviewId,
      role: 'interviewer',
      text: message,
      timestamp: new Date().toISOString(),
      actionType: 'end_interview',
    };
    interviewStorage.saveExchange(closingExchange);

    return { state, closingExchange };
  },

  /**
   * Updates the elapsed time counter in storage so timer persists across page refreshes.
   */
  updateElapsedTime(interviewId: string, elapsedSeconds: number): void {
    const existing = interviewStorage.getInterviewStateByInterviewId(interviewId);
    if (existing && existing.currentStage !== 'INTERVIEW_COMPLETE') {
      existing.elapsedSeconds = elapsedSeconds;
      existing.lastUpdated = new Date().toISOString();
      interviewStorage.saveInterviewState(existing);
    }
  },

  /**
   * Retrieves conversation exchanges for the interview.
   */
  getConversationHistory(interviewId: string): ConversationExchange[] {
    return interviewStorage.getExchangesForInterview(interviewId);
  },

  /**
   * Retrieves current interview state.
   */
  getInterviewState(interviewId: string): InterviewState | null {
    return interviewStorage.getInterviewStateByInterviewId(interviewId);
  },
};
