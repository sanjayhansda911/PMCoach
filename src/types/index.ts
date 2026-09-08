export * from './competencies';
export * from './intelligence';
export * from './engine';
export * from './evaluation';
export * from './evals';

export type TargetRole =
  | 'Associate Product Manager'
  | 'Product Manager'
  | 'Senior Product Manager'
  | 'Group Product Manager';

export type InterviewType =
  | 'Product Sense'
  | 'Execution'
  | 'Analytics'
  | 'Strategy'
  | 'Leadership & Behavioral'
  | 'Mixed PM Interview';

export type InterviewDifficulty = 'Standard' | 'Challenging';

export type InterviewDuration = 15 | 30 | 45; // in minutes

export type InterviewMode = 'Text' | 'Voice';

export type InterviewStatus =
  | 'setup'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'evaluated';

export type CompetencyType =
  | 'Product Sense'
  | 'Execution'
  | 'Analytics'
  | 'Strategy'
  | 'Leadership & Behavioral'
  | 'Communication';

export interface User {
  id: string;
  name: string;
  email: string;
  targetRole: TargetRole;
  avatarUrl: string;
  joinedDate: string;
}

export interface Interview {
  id: string;
  userId: string;
  candidateProfileId: string;
  jobProfileId: string;
  targetRole: TargetRole;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  duration: InterviewDuration;
  mode: InterviewMode;
  status: InterviewStatus;
  createdAt: string;
  completedAt?: string;
}

export interface CompetencyEvaluation {
  competency: CompetencyType;
  score?: number | null;
  evidence?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  // Communication is cross-cutting and evaluated across every interview
  communicationNotes?: string;
}

export interface InterviewQuestion {
  id: string;
  interviewId: string;
  competency: CompetencyType;
  question: string;
  questionType: 'primary' | 'follow_up';
  difficulty: InterviewDifficulty;
  expectedSignals: string[];
  followUpQuestions?: string[];
}

export interface InterviewAnswer {
  id: string;
  interviewId: string;
  questionId: string;
  answerText: string;
  durationSeconds: number;
  createdAt: string;
}
