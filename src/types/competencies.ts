export type CompetencyName =
  | 'Product Sense'
  | 'Execution'
  | 'Analytics'
  | 'Strategy'
  | 'Leadership & Behavioral'
  | 'Communication';

export interface CompetencyTaxonomyItem {
  name: CompetencyName;
  displayName: string;
  description: string;
  isCrossCutting: boolean;
  subSkills: string[];
}

export const PM_COMPETENCY_TAXONOMY: Record<CompetencyName, CompetencyTaxonomyItem> = {
  'Product Sense': {
    name: 'Product Sense',
    displayName: 'Product Sense',
    description: 'Empathy for user pain points, creative solutioning, and sound product judgment.',
    isCrossCutting: false,
    subSkills: [
      'User understanding',
      'Problem identification',
      'Problem prioritization',
      'Solution thinking',
      'Trade-offs',
      'Product judgment',
    ],
  },
  'Execution': {
    name: 'Execution',
    displayName: 'Execution',
    description: 'Day-to-day delivery roadmapping, engineering triage, experimentation, and removing blockers.',
    isCrossCutting: false,
    subSkills: [
      'Goal setting',
      'Metrics',
      'Diagnosis',
      'Experimentation',
      'Prioritization',
      'Delivery',
      'Trade-offs',
    ],
  },
  'Analytics': {
    name: 'Analytics',
    displayName: 'Analytics',
    description: 'Quantitative metric trees, root-cause decomposition, experiment design, and telemetry hygiene.',
    isCrossCutting: false,
    subSkills: [
      'Metric selection',
      'Metric decomposition',
      'Quantitative reasoning',
      'Root-cause analysis',
      'Experiment design',
      'Interpretation',
    ],
  },
  'Strategy': {
    name: 'Strategy',
    displayName: 'Strategy',
    description: 'Competitive moats, unit economics, market dynamics, and sustainable long-term thinking.',
    isCrossCutting: false,
    subSkills: [
      'Market understanding',
      'Competitive thinking',
      'Business model',
      'Long-term thinking',
      'Strategic trade-offs',
    ],
  },
  'Leadership & Behavioral': {
    name: 'Leadership & Behavioral',
    displayName: 'Leadership & Behavioral',
    description: 'Cross-functional influence without authority, decision making, conflict resolution, and retrospectives.',
    isCrossCutting: false,
    subSkills: [
      'Ownership',
      'Stakeholder management',
      'Conflict resolution',
      'Influence',
      'Decision making',
      'Failure/learning',
      'Leadership',
    ],
  },
  'Communication': {
    name: 'Communication',
    displayName: 'Communication (Cross-cutting)',
    description: 'Structure, clarity, conciseness, and logical reasoning evaluated across every interview section.',
    isCrossCutting: true,
    subSkills: [
      'Structure',
      'Clarity',
      'Conciseness',
      'Logical reasoning',
      'Ability to communicate trade-offs',
    ],
  },
};
