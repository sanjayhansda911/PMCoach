import {
  Interview,
  CandidateProfile,
  JobProfile,
  CandidateJobMatch,
  InterviewBrief,
  InterviewQuestion,
  InterviewAnswer,
  InterviewPlan,
  InterviewState,
  ConversationExchange,
  AnswerAnalysis,
  Evaluation,
} from '../types';

const STORAGE_KEYS = {
  INTERVIEWS: 'pm_coach_interviews_v2',
  CANDIDATE_PROFILES: 'pm_coach_candidate_profiles_v2',
  JOB_PROFILES: 'pm_coach_job_profiles_v2',
  MATCHES: 'pm_coach_matches_v2',
  BRIEFS: 'pm_coach_briefs_v2',
  QUESTIONS: 'pm_coach_questions_v2',
  ANSWERS: 'pm_coach_answers_v2',
  PLANS: 'pm_coach_plans_v2',
  STATES: 'pm_coach_states_v2',
  EXCHANGES: 'pm_coach_exchanges_v2',
  ANALYSES: 'pm_coach_analyses_v2',
  EVALUATIONS: 'pm_coach_evaluations_v2',
} as const;

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to load key "${key}" from localStorage:`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save key "${key}" to localStorage:`, error);
  }
}

export const interviewStorage = {
  // Interviews
  getAllInterviews(): Interview[] {
    return loadFromStorage<Interview[]>(STORAGE_KEYS.INTERVIEWS, []);
  },

  getInterviewById(id: string): Interview | null {
    const list = this.getAllInterviews();
    return list.find((item) => item.id === id) || null;
  },

  saveInterview(interview: Interview): void {
    const list = this.getAllInterviews();
    const updated = [interview, ...list.filter((item) => item.id !== interview.id)];
    saveToStorage(STORAGE_KEYS.INTERVIEWS, updated);
  },

  deleteInterview(id: string): void {
    const list = this.getAllInterviews();
    const updated = list.filter((item) => item.id !== id);
    saveToStorage(STORAGE_KEYS.INTERVIEWS, updated);
  },

  // Candidate Profiles
  getCandidateProfileById(id: string): CandidateProfile | null {
    const list = loadFromStorage<CandidateProfile[]>(STORAGE_KEYS.CANDIDATE_PROFILES, []);
    return list.find((item) => item.id === id) || null;
  },

  saveCandidateProfile(profile: CandidateProfile): void {
    const list = loadFromStorage<CandidateProfile[]>(STORAGE_KEYS.CANDIDATE_PROFILES, []);
    const updated = [profile, ...list.filter((item) => item.id !== profile.id)];
    saveToStorage(STORAGE_KEYS.CANDIDATE_PROFILES, updated);
  },

  // Job Profiles
  getJobProfileById(id: string): JobProfile | null {
    const list = loadFromStorage<JobProfile[]>(STORAGE_KEYS.JOB_PROFILES, []);
    return list.find((item) => item.id === id) || null;
  },

  saveJobProfile(profile: JobProfile): void {
    const list = loadFromStorage<JobProfile[]>(STORAGE_KEYS.JOB_PROFILES, []);
    const updated = [profile, ...list.filter((item) => item.id !== profile.id)];
    saveToStorage(STORAGE_KEYS.JOB_PROFILES, updated);
  },

  // Candidate-Job Matches
  getCandidateJobMatchById(id: string): CandidateJobMatch | null {
    const list = loadFromStorage<CandidateJobMatch[]>(STORAGE_KEYS.MATCHES, []);
    return list.find((item) => item.id === id) || null;
  },

  getCandidateJobMatch(candidateProfileId: string, jobProfileId: string): CandidateJobMatch | null {
    const list = loadFromStorage<CandidateJobMatch[]>(STORAGE_KEYS.MATCHES, []);
    return (
      list.find(
        (item) =>
          item.candidateProfileId === candidateProfileId && item.jobProfileId === jobProfileId
      ) || null
    );
  },

  saveCandidateJobMatch(match: CandidateJobMatch): void {
    const list = loadFromStorage<CandidateJobMatch[]>(STORAGE_KEYS.MATCHES, []);
    const updated = [match, ...list.filter((item) => item.id !== match.id)];
    saveToStorage(STORAGE_KEYS.MATCHES, updated);
  },

  // Interview Briefs
  getInterviewBriefById(id: string): InterviewBrief | null {
    const list = loadFromStorage<InterviewBrief[]>(STORAGE_KEYS.BRIEFS, []);
    return list.find((item) => item.id === id) || null;
  },

  getInterviewBriefByInterviewId(interviewId: string): InterviewBrief | null {
    const list = loadFromStorage<InterviewBrief[]>(STORAGE_KEYS.BRIEFS, []);
    return list.find((item) => item.interviewId === interviewId) || null;
  },

  saveInterviewBrief(brief: InterviewBrief): void {
    const list = loadFromStorage<InterviewBrief[]>(STORAGE_KEYS.BRIEFS, []);
    const updated = [brief, ...list.filter((item) => item.id !== brief.id)];
    saveToStorage(STORAGE_KEYS.BRIEFS, updated);
  },

  // Questions
  getQuestionsForInterview(interviewId: string): InterviewQuestion[] {
    const list = loadFromStorage<InterviewQuestion[]>(STORAGE_KEYS.QUESTIONS, []);
    return list.filter((item) => item.interviewId === interviewId);
  },

  saveQuestions(questions: InterviewQuestion[]): void {
    const list = loadFromStorage<InterviewQuestion[]>(STORAGE_KEYS.QUESTIONS, []);
    const ids = new Set(questions.map((q) => q.id));
    const updated = [...questions, ...list.filter((q) => !ids.has(q.id))];
    saveToStorage(STORAGE_KEYS.QUESTIONS, updated);
  },

  // Answers
  getAnswersForInterview(interviewId: string): InterviewAnswer[] {
    const list = loadFromStorage<InterviewAnswer[]>(STORAGE_KEYS.ANSWERS, []);
    return list.filter((item) => item.interviewId === interviewId);
  },

  saveAnswer(answer: InterviewAnswer): void {
    const list = loadFromStorage<InterviewAnswer[]>(STORAGE_KEYS.ANSWERS, []);
    const updated = [answer, ...list.filter((a) => a.id !== answer.id)];
    saveToStorage(STORAGE_KEYS.ANSWERS, updated);
  },

  // Interview Plans
  getInterviewPlanByInterviewId(interviewId: string): InterviewPlan | null {
    const list = loadFromStorage<InterviewPlan[]>(STORAGE_KEYS.PLANS, []);
    return list.find((p) => p.interviewId === interviewId) || null;
  },

  saveInterviewPlan(plan: InterviewPlan): void {
    const list = loadFromStorage<InterviewPlan[]>(STORAGE_KEYS.PLANS, []);
    const updated = [plan, ...list.filter((p) => p.interviewId !== plan.interviewId)];
    saveToStorage(STORAGE_KEYS.PLANS, updated);
  },

  // Interview States
  getInterviewStateByInterviewId(interviewId: string): InterviewState | null {
    const list = loadFromStorage<InterviewState[]>(STORAGE_KEYS.STATES, []);
    return list.find((s) => s.interviewId === interviewId) || null;
  },

  saveInterviewState(state: InterviewState): void {
    const list = loadFromStorage<InterviewState[]>(STORAGE_KEYS.STATES, []);
    const updated = [state, ...list.filter((s) => s.interviewId !== state.interviewId)];
    saveToStorage(STORAGE_KEYS.STATES, updated);
  },

  // Exchanges (Conversation History)
  getExchangesForInterview(interviewId: string): ConversationExchange[] {
    const list = loadFromStorage<ConversationExchange[]>(STORAGE_KEYS.EXCHANGES, []);
    return list.filter((e) => e.interviewId === interviewId);
  },

  saveExchange(exchange: ConversationExchange): void {
    const list = loadFromStorage<ConversationExchange[]>(STORAGE_KEYS.EXCHANGES, []);
    const updated = [...list.filter((e) => e.id !== exchange.id), exchange];
    saveToStorage(STORAGE_KEYS.EXCHANGES, updated);
  },

  saveExchanges(exchanges: ConversationExchange[]): void {
    const list = loadFromStorage<ConversationExchange[]>(STORAGE_KEYS.EXCHANGES, []);
    const ids = new Set(exchanges.map((e) => e.id));
    const updated = [...list.filter((e) => !ids.has(e.id)), ...exchanges];
    saveToStorage(STORAGE_KEYS.EXCHANGES, updated);
  },

  // Answer Analyses
  getAnswerAnalysesForInterview(interviewId: string): AnswerAnalysis[] {
    const list = loadFromStorage<AnswerAnalysis[]>(STORAGE_KEYS.ANALYSES, []);
    return list.filter((a) => a.interviewId === interviewId);
  },

  saveAnswerAnalysis(analysis: AnswerAnalysis): void {
    const list = loadFromStorage<AnswerAnalysis[]>(STORAGE_KEYS.ANALYSES, []);
    const updated = [analysis, ...list.filter((a) => a.id !== analysis.id)];
    saveToStorage(STORAGE_KEYS.ANALYSES, updated);
  },

  // Evaluations
  getAllEvaluations(): Evaluation[] {
    return loadFromStorage<Evaluation[]>(STORAGE_KEYS.EVALUATIONS, []);
  },

  getEvaluationByInterviewId(interviewId: string): Evaluation | null {
    const list = this.getAllEvaluations();
    return list.find((e) => e.interviewId === interviewId) || null;
  },

  saveEvaluation(evaluation: Evaluation): void {
    const list = this.getAllEvaluations();
    const updated = [evaluation, ...list.filter((e) => e.interviewId !== evaluation.interviewId)];
    saveToStorage(STORAGE_KEYS.EVALUATIONS, updated);
  },

  deleteEvaluation(id: string): void {
    const list = this.getAllEvaluations();
    const updated = list.filter((e) => e.id !== id && e.interviewId !== id);
    saveToStorage(STORAGE_KEYS.EVALUATIONS, updated);
  },
};
