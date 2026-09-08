import {
  CandidateProfile,
  JobProfile,
  CandidateJobMatch,
  InterviewBrief,
  TargetRole,
  InterviewType,
  InterviewDifficulty,
} from '../types';
import {
  factualResumeParser,
  factualJdParser,
  factualMatcher,
  factualBriefGenerator,
} from './factualEngine';

export interface ParsedResumeData {
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
  experiences: Array<{
    company: string;
    role: string;
    experience: string;
    evidence: string;
  }>;
}

export interface ParsedJobData {
  company: string | null;
  role: string | null;
  seniority: TargetRole | null;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  productArea: string | null;
  domain: string | null;
  likelyInterviewCompetencies: any[];
  experienceRequirements: string[];
  importantKeywords: string[];
  successSignals: string[];
}

export const aiService = {
  /**
   * Parse extracted resume text into structured CandidateProfile data.
   * Direct in-memory execution guarantees instantaneous performance, zero latency,
   * and complete immunity from network failures or static hosting 405 errors.
   */
  async parseResume(resumeText: string): Promise<ParsedResumeData> {
    return factualResumeParser(resumeText) as ParsedResumeData;
  },

  /**
   * Parse Job Description text into structured JobProfile data.
   */
  async parseJobDescription(jdText: string, targetRole?: TargetRole): Promise<ParsedJobData> {
    return factualJdParser(jdText, targetRole) as ParsedJobData;
  },

  /**
   * Run explainable matching between candidate profile and target job profile.
   */
  async matchCandidateAndJob(
    candidateProfile: CandidateProfile,
    jobProfile: JobProfile
  ): Promise<CandidateJobMatch> {
    const match = factualMatcher(candidateProfile, jobProfile) as CandidateJobMatch;
    match.candidateProfileId = candidateProfile.id;
    match.jobProfileId = jobProfile.id;
    return match;
  },

  /**
   * Synthesize candidate, job, and match into an InterviewBrief with question themes.
   */
  async createInterviewBrief(params: {
    candidateProfile: CandidateProfile;
    jobProfile: JobProfile;
    match: CandidateJobMatch;
    targetRole: TargetRole;
    interviewType: InterviewType;
    difficulty: InterviewDifficulty;
    interviewId: string;
  }): Promise<InterviewBrief> {
    const brief = factualBriefGenerator(
      params.candidateProfile,
      params.jobProfile,
      params.match,
      params.targetRole,
      params.interviewType,
      params.difficulty
    ) as InterviewBrief;
    brief.interviewId = params.interviewId;
    return brief;
  },
};
