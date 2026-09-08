import { TargetRole, InterviewDifficulty } from './index';
import { CompetencyName } from './competencies';

export interface CandidateExperienceEvidence {
  company: string;
  role: string;
  experience: string;
  evidence: string;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  resumeFileName: string;
  resumeFileSize: number; // in bytes
  resumeText: string;
  candidateName: string | null;
  currentRole: string | null;
  yearsOfExperience: number | null;
  previousRoles: string[];
  companies: string[];
  products: string[];
  industries: string[];
  skills: string[];
  achievements: string[];
  metricsAndImpact: string[];
  leadershipExamples: string[];
  productExamples: string[];
  notableProjects: string[];
  experiences: CandidateExperienceEvidence[];
  createdAt: string;
}

export interface JobProfile {
  id: string;
  rawText: string;
  company: string | null; // null if cannot be reliably identified
  role: string | null;
  seniority: TargetRole | null;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  productArea: string | null;
  domain: string | null;
  likelyInterviewCompetencies: CompetencyName[];
  experienceRequirements: string[];
  importantKeywords: string[];
  successSignals: string[];
  createdAt: string;
}

export interface EvidenceMatchItem {
  area: string;
  candidateEvidence: string;
  jobRequirement: string;
  match: 'strong' | 'moderate' | 'gap';
}

export interface PotentialGapItem {
  area: string;
  jobRequirement: string;
  candidateObservation: string;
}

export interface ResumeClaimToProbe {
  claim: string;
  context: string;
  probeReason: string;
}

export interface CandidateJobMatch {
  id: string;
  candidateProfileId: string;
  jobProfileId: string;
  strongestRelevantExperiences: EvidenceMatchItem[];
  relevantSkills: string[];
  relevantAchievements: string[];
  potentialGaps: PotentialGapItem[];
  likelyFollowUpAreas: string[];
  competenciesToProbe: CompetencyName[];
  resumeClaimsWorthInvestigating: ResumeClaimToProbe[];
  createdAt: string;
}

export interface InterviewBrief {
  id: string;
  interviewId: string;
  candidateContext: string;
  jobContext: string;
  relevantExperiences: string[];
  competenciesToTest: CompetencyName[];
  areasToProbe: string[];
  potentialWeaknesses: string[];
  recommendedQuestionThemes: string[];
  recommendedDifficulty: InterviewDifficulty;
  interviewObjectives: string[];
  createdAt: string;
}
