import {
  InterviewQuestion,
  TargetRole,
  InterviewType,
  CompetencyType,
  CompetencyEvaluation,
  User,
} from '../types';

export const ALL_TARGET_ROLES: TargetRole[] = [
  'Associate Product Manager',
  'Product Manager',
  'Senior Product Manager',
  'Group Product Manager',
];

export const ALL_INTERVIEW_TYPES: { type: InterviewType; title: string; description: string }[] = [
  {
    type: 'Product Sense',
    title: 'Product Sense',
    description: 'Tests user empathy, problem formulation, creative solutioning, and ergonomics for user personas.',
  },
  {
    type: 'Execution',
    title: 'Execution',
    description: 'Tests day-to-day triage, delivery roadmapping, engineering tradeoff decisions, and resolving roadblocks.',
  },
  {
    type: 'Analytics',
    title: 'Analytics',
    description: 'Tests metric tree definitions, root-cause diagnosis for metric drops, and telemetry integrity.',
  },
  {
    type: 'Strategy',
    title: 'Strategy',
    description: 'Tests competitive moats, market sizing, 0-to-1 business expansion, and sustainable unit economics.',
  },
  {
    type: 'Leadership & Behavioral',
    title: 'Leadership & Behavioral',
    description: 'Tests cross-functional influence without authority, stakeholder conflict, and retrospective leadership.',
  },
  {
    type: 'Mixed PM Interview',
    title: 'Mixed PM Interview',
    description: 'Comprehensive simulation testing Product Sense, Analytics, Execution, and Strategic depth in one session.',
  },
];

export const ALL_COMPETENCIES: CompetencyType[] = [
  'Product Sense',
  'Execution',
  'Analytics',
  'Strategy',
  'Leadership & Behavioral',
  'Communication',
];

export const CURRENT_USER: User = {
  id: 'user-default',
  name: 'Alex Chen',
  email: 'alex.chen@example.com',
  targetRole: 'Product Manager',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  joinedDate: 'September 2026',
};

/**
 * Creates empty/unrated competency evaluations for an interview.
 * Communication is evaluated across each competency as well as standalone.
 */
export function createInitialCompetencyMap(): Record<CompetencyType, CompetencyEvaluation> {
  return {
    'Product Sense': {
      competency: 'Product Sense',
      score: null,
      evidence: [],
      strengths: [],
      weaknesses: [],
      recommendation: '',
      communicationNotes: '',
    },
    'Execution': {
      competency: 'Execution',
      score: null,
      evidence: [],
      strengths: [],
      weaknesses: [],
      recommendation: '',
      communicationNotes: '',
    },
    'Analytics': {
      competency: 'Analytics',
      score: null,
      evidence: [],
      strengths: [],
      weaknesses: [],
      recommendation: '',
      communicationNotes: '',
    },
    'Strategy': {
      competency: 'Strategy',
      score: null,
      evidence: [],
      strengths: [],
      weaknesses: [],
      recommendation: '',
      communicationNotes: '',
    },
    'Leadership & Behavioral': {
      competency: 'Leadership & Behavioral',
      score: null,
      evidence: [],
      strengths: [],
      weaknesses: [],
      recommendation: '',
      communicationNotes: '',
    },
    'Communication': {
      competency: 'Communication',
      score: null,
      evidence: [],
      strengths: [],
      weaknesses: [],
      recommendation: '',
      communicationNotes: 'Communication is evaluated across structure, clarity, and conciseness in every answer.',
    },
  };
}
