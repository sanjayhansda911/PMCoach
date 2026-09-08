import {
  CandidateProfile,
  JobProfile,
  CandidateJobMatch,
  InterviewBrief,
  TargetRole,
  InterviewType,
  InterviewDifficulty,
} from '../types';

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
   */
  async parseResume(resumeText: string): Promise<ParsedResumeData> {
    const response = await fetch('/api/ai/parse-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Resume parsing failed with status ${response.status}`);
    }

    return response.json();
  },

  /**
   * Parse Job Description text into structured JobProfile data.
   */
  async parseJobDescription(jdText: string, targetRole?: TargetRole): Promise<ParsedJobData> {
    const response = await fetch('/api/ai/parse-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdText, targetRole }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Job description parsing failed with status ${response.status}`);
    }

    return response.json();
  },

  /**
   * Run explainable matching between candidate profile and target job profile.
   */
  async matchCandidateAndJob(
    candidateProfile: CandidateProfile,
    jobProfile: JobProfile
  ): Promise<CandidateJobMatch> {
    const response = await fetch('/api/ai/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateProfile, jobProfile }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Candidate matching failed with status ${response.status}`);
    }

    const match: CandidateJobMatch = await response.json();
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
    const response = await fetch('/api/ai/create-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateProfile: params.candidateProfile,
        jobProfile: params.jobProfile,
        match: params.match,
        targetRole: params.targetRole,
        interviewType: params.interviewType,
        difficulty: params.difficulty,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Brief generation failed with status ${response.status}`);
    }

    const brief: InterviewBrief = await response.json();
    brief.interviewId = params.interviewId;
    return brief;
  },
};
