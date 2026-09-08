import {
  Interview,
  CandidateProfile,
  JobProfile,
  CandidateJobMatch,
  InterviewBrief,
  TargetRole,
  InterviewType,
  InterviewDifficulty,
  InterviewDuration,
  InterviewMode,
  InterviewPlan,
} from '../types';
import { interviewStorage } from '../storage/interviewStorage';
import { aiService } from './aiService';
import { aiProvider } from './aiProvider';

export interface CreateInterviewInput {
  userId: string;
  resume: {
    fileName: string;
    fileSize: number;
    fileType: string;
    dataUrl?: string;
    extractedText: string;
  };
  jobDescription: string;
  targetRole: TargetRole;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  duration: InterviewDuration;
  mode?: InterviewMode;
  onProgress?: (step: 1 | 2 | 3, status: 'running' | 'completed', label: string) => void;
}

export interface InterviewComposite {
  interview: Interview;
  candidateProfile: CandidateProfile | null;
  jobProfile: JobProfile | null;
  match?: CandidateJobMatch | null;
  brief?: InterviewBrief | null;
  plan?: InterviewPlan | null;
}

export const interviewService = {
  /**
   * Creates a new Interview session along with CandidateProfile, JobProfile, CandidateJobMatch, and InterviewBrief.
   * Extracts factual attributes with zero hallucinated information.
   */
  async createInterview(input: CreateInterviewInput): Promise<InterviewComposite> {
    const timestamp = new Date().toISOString();
    const candidateProfileId = `candidate-${Date.now()}`;
    const jobProfileId = `job-${Date.now()}`;
    const interviewId = `interview-${Date.now()}`;

    // Step 1: Analyzing your resume
    input.onProgress?.(1, 'running', 'Analyzing your resume');
    const parsedResume = await aiService.parseResume(input.resume.extractedText);
    input.onProgress?.(1, 'completed', 'Resume parsed');

    // Create and persist CandidateProfile
    const candidateProfile: CandidateProfile = {
      id: candidateProfileId,
      userId: input.userId,
      resumeFileName: input.resume.fileName,
      resumeFileSize: input.resume.fileSize,
      resumeText: input.resume.extractedText,
      candidateName: parsedResume.candidateName,
      currentRole: parsedResume.currentRole,
      yearsOfExperience: parsedResume.yearsOfExperience,
      previousRoles: parsedResume.previousRoles,
      companies: parsedResume.companies,
      products: parsedResume.products,
      industries: parsedResume.industries,
      skills: parsedResume.skills,
      achievements: parsedResume.achievements,
      metricsAndImpact: parsedResume.metricsAndImpact,
      leadershipExamples: parsedResume.leadershipExamples,
      productExamples: parsedResume.productExamples,
      notableProjects: parsedResume.notableProjects,
      experiences: parsedResume.experiences,
      createdAt: timestamp,
    };
    interviewStorage.saveCandidateProfile(candidateProfile);

    // Step 2: Understanding the role
    input.onProgress?.(2, 'running', 'Understanding the role');
    const parsedJd = await aiService.parseJobDescription(
      input.jobDescription,
      input.targetRole
    );
    input.onProgress?.(2, 'completed', 'Job description analyzed');

    // Create and persist JobProfile
    const jobProfile: JobProfile = {
      id: jobProfileId,
      rawText: input.jobDescription,
      company: parsedJd.company,
      role: parsedJd.role || input.targetRole,
      seniority: parsedJd.seniority || input.targetRole,
      responsibilities: parsedJd.responsibilities,
      requiredSkills: parsedJd.requiredSkills,
      preferredSkills: parsedJd.preferredSkills,
      productArea: parsedJd.productArea,
      domain: parsedJd.domain,
      likelyInterviewCompetencies: parsedJd.likelyInterviewCompetencies,
      experienceRequirements: parsedJd.experienceRequirements,
      importantKeywords: parsedJd.importantKeywords,
      successSignals: parsedJd.successSignals,
      createdAt: timestamp,
    };
    interviewStorage.saveJobProfile(jobProfile);

    // Step 3: Personalizing your interview
    input.onProgress?.(3, 'running', 'Personalizing your interview');
    const match = await aiService.matchCandidateAndJob(candidateProfile, jobProfile);
    interviewStorage.saveCandidateJobMatch(match);

    const brief = await aiService.createInterviewBrief({
      candidateProfile,
      jobProfile,
      match,
      targetRole: input.targetRole,
      interviewType: input.interviewType,
      difficulty: input.difficulty,
      interviewId,
    });
    interviewStorage.saveInterviewBrief(brief);

    // Create and persist calibrated InterviewPlan
    const plan = await aiProvider.createPlan({
      brief,
      candidateProfile,
      jobProfile,
      duration: input.duration,
      difficulty: input.difficulty,
      targetRole: input.targetRole,
      interviewId,
    });
    interviewStorage.saveInterviewPlan(plan);

    input.onProgress?.(3, 'completed', 'Interview focus created');

    // Create and persist Interview
    const interview: Interview = {
      id: interviewId,
      userId: input.userId,
      candidateProfileId,
      jobProfileId,
      targetRole: input.targetRole,
      interviewType: input.interviewType,
      difficulty: input.difficulty,
      duration: input.duration,
      mode: input.mode || 'Text',
      status: 'ready',
      createdAt: timestamp,
    };
    interviewStorage.saveInterview(interview);

    return {
      interview,
      candidateProfile,
      jobProfile,
      match,
      brief,
      plan,
    };
  },

  /**
   * Retrieves an interview by ID with linked profiles, match, brief, and plan.
   */
  async getInterview(id: string): Promise<InterviewComposite | null> {
    const interview = interviewStorage.getInterviewById(id);
    if (!interview) return null;

    const candidateProfile = interviewStorage.getCandidateProfileById(
      interview.candidateProfileId
    );
    const jobProfile = interviewStorage.getJobProfileById(interview.jobProfileId);
    const match =
      candidateProfile && jobProfile
        ? interviewStorage.getCandidateJobMatch(candidateProfile.id, jobProfile.id)
        : null;
    const brief = interviewStorage.getInterviewBriefByInterviewId(interview.id);
    const plan = interviewStorage.getInterviewPlanByInterviewId(interview.id);

    return {
      interview,
      candidateProfile,
      jobProfile,
      match,
      brief,
      plan,
    };
  },

  /**
   * Updates fields on an existing interview.
   */
  async updateInterview(id: string, updates: Partial<Interview>): Promise<Interview> {
    const existing = interviewStorage.getInterviewById(id);
    if (!existing) {
      throw new Error(`Interview with ID ${id} not found.`);
    }

    const updated: Interview = {
      ...existing,
      ...updates,
    };
    interviewStorage.saveInterview(updated);
    return updated;
  },

  /**
   * Transitions an interview to 'in_progress'.
   */
  async startInterview(id: string): Promise<Interview> {
    return this.updateInterview(id, { status: 'in_progress' });
  },

  /**
   * Transitions an interview to 'completed' with timestamp.
   */
  async completeInterview(id: string): Promise<Interview> {
    return this.updateInterview(id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  },

  /**
   * Returns all stored interviews.
   */
  async listInterviews(): Promise<Interview[]> {
    return interviewStorage.getAllInterviews();
  },

  /**
   * Deletes an interview by ID.
   */
  async deleteInterview(id: string): Promise<void> {
    interviewStorage.deleteInterview(id);
  },
};
