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
   * Gracefully falls back to factual client-side parsing if backend API is not available (e.g. static hosting on Vercel).
   */
  async parseResume(resumeText: string): Promise<ParsedResumeData> {
    try {
      const response = await fetch('/api/ai/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[aiService] /api/ai/parse-resume returned ${response.status}, using client-side factual parser.`);
    } catch (networkErr) {
      console.warn('[aiService] /api/ai/parse-resume unreachable, using client-side factual parser:', networkErr);
    }

    // Client-side execution fallback ensures zero 405/404 failures on Vercel
    return factualResumeParser(resumeText) as ParsedResumeData;
  },

  /**
   * Parse Job Description text into structured JobProfile data.
   */
  async parseJobDescription(jdText: string, targetRole?: TargetRole): Promise<ParsedJobData> {
    try {
      const response = await fetch('/api/ai/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText, targetRole }),
      });

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[aiService] /api/ai/parse-jd returned ${response.status}, using client-side factual parser.`);
    } catch (networkErr) {
      console.warn('[aiService] /api/ai/parse-jd unreachable, using client-side factual parser:', networkErr);
    }

    return factualJdParser(jdText, targetRole) as ParsedJobData;
  },

  /**
   * Run explainable matching between candidate profile and target job profile.
   */
  async matchCandidateAndJob(
    candidateProfile: CandidateProfile,
    jobProfile: JobProfile
  ): Promise<CandidateJobMatch> {
    try {
      const response = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateProfile, jobProfile }),
      });

      if (response.ok) {
        const match: CandidateJobMatch = await response.json();
        match.candidateProfileId = candidateProfile.id;
        match.jobProfileId = jobProfile.id;
        return match;
      }
      console.warn(`[aiService] /api/ai/match returned ${response.status}, using client-side factual matcher.`);
    } catch (networkErr) {
      console.warn('[aiService] /api/ai/match unreachable, using client-side factual matcher:', networkErr);
    }

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
    try {
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

      if (response.ok) {
        const brief: InterviewBrief = await response.json();
        brief.interviewId = params.interviewId;
        return brief;
      }
      console.warn(`[aiService] /api/ai/create-brief returned ${response.status}, using client-side brief generator.`);
    } catch (networkErr) {
      console.warn('[aiService] /api/ai/create-brief unreachable, using client-side brief generator:', networkErr);
    }

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
