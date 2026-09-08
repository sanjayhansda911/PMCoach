import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Layers,
  FileText,
  Clock,
  Gauge,
  Mic,
  AlignLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  TargetRole,
  InterviewType,
  InterviewDifficulty,
  InterviewDuration,
  InterviewMode,
} from '../types';
import { interviewService } from '../services/interviewService';
import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { FileUpload, UploadedResumeMeta } from '../components/shared/FileUpload';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';

const TARGET_ROLES: TargetRole[] = [
  'Associate Product Manager',
  'Product Manager',
  'Senior Product Manager',
  'Group Product Manager',
];

interface InterviewTypeOption {
  type: InterviewType;
  title: string;
  description: string;
}

const INTERVIEW_TYPE_OPTIONS: InterviewTypeOption[] = [
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

import { PreparationModal } from '../components/setup/PreparationModal';
import { InterviewReadyModal } from '../components/setup/InterviewReadyModal';
import { InterviewComposite } from '../services/interviewService';
import { extractTextFromPdf } from '../services/pdfExtractor';

export const SetupPage: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentInterview, refreshInterviews } = useInterview();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 1. Resume (PDF only, required)
  const [resume, setResume] = useState<UploadedResumeMeta | null>(null);

  // 2. Job Description (Text area, required)
  const [jobDescription, setJobDescription] = useState('');

  // 3. Target Role (Dropdown)
  const [targetRole, setTargetRole] = useState<TargetRole>('Product Manager');

  // 4. Interview Type (Options with descriptions, pre-selected if param provided)
  const initialTypeParam = searchParams.get('type') as InterviewType | null;
  const [interviewType, setInterviewType] = useState<InterviewType>(
    initialTypeParam && INTERVIEW_TYPE_OPTIONS.some((o) => o.type === initialTypeParam)
      ? initialTypeParam
      : 'Product Sense'
  );

  // 5. Difficulty (Options)
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Standard');

  // 6. Interview Length (Options)
  const [duration, setDuration] = useState<InterviewDuration>(30);

  // 7. Interview Mode (Text vs Voice)
  const [mode, setMode] = useState<InterviewMode>('Text');

  // Form submission / loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Preparation & Ready modal state
  const [isPreparing, setIsPreparing] = useState(false);
  const [stepStates, setStepStates] = useState<Record<1 | 2 | 3, 'waiting' | 'running' | 'completed'>>({
    1: 'waiting',
    2: 'waiting',
    3: 'waiting',
  });
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [createdComposite, setCreatedComposite] = useState<InterviewComposite | null>(null);

  // Validation rules
  const isResumeValid = Boolean(resume);
  const isJdNonEmpty = jobDescription.trim().length > 0;
  const isJdWithinLimit = jobDescription.length <= 30000;
  const isJdValid = isJdNonEmpty && isJdWithinLimit;
  const isRoleValid = Boolean(targetRole);
  const isTypeValid = Boolean(interviewType);
  const isDifficultyValid = Boolean(difficulty);
  const isDurationValid = Boolean(duration);

  const isFormValid =
    isResumeValid &&
    isJdValid &&
    isRoleValid &&
    isTypeValid &&
    isDifficultyValid &&
    isDurationValid;

  // Compute missing field list for clear validation messages
  const missingFields: string[] = [];
  if (!isResumeValid) missingFields.push('Resume (PDF upload)');
  if (!isJdNonEmpty) missingFields.push('Job Description (Required)');
  if (!isJdWithinLimit) missingFields.push('Job Description exceeds 30,000 character limit');
  if (!isRoleValid) missingFields.push('Target Role');
  if (!isTypeValid) missingFields.push('Interview Type');
  if (!isDifficultyValid) missingFields.push('Difficulty');
  if (!isDurationValid) missingFields.push('Duration');

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setSubmitError(null);

    if (!isFormValid || !resume) {
      return;
    }

    setIsSubmitting(true);
    setIsPreparing(true);
    setStepStates({
      1: 'running',
      2: 'waiting',
      3: 'waiting',
    });

    try {
      // Ensure extracted text is present
      let extractedText = resume.extractedText;
      if (!extractedText && resume.file) {
        const res = await extractTextFromPdf(resume.file);
        extractedText = res.text;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Unable to extract readable text from the uploaded PDF resume.');
      }

      // Execute intelligence pipeline with step tracking
      const composite = await interviewService.createInterview({
        userId: user?.id || 'user-default',
        resume: {
          fileName: resume.fileName,
          fileSize: resume.fileSize,
          fileType: resume.fileType,
          dataUrl: resume.dataUrl,
          extractedText,
        },
        jobDescription: jobDescription.trim(),
        targetRole,
        interviewType,
        difficulty,
        duration,
        mode,
        onProgress: (step, status) => {
          setStepStates((prev) => ({
            ...prev,
            [step]: status,
          }));
        },
      });

      // Brief animation pause for smooth UX
      await sleep(600);
      setStepStates({ 1: 'completed', 2: 'completed', 3: 'completed' });
      await sleep(400);

      // Close preparation modal and show Interview Ready preview
      setIsPreparing(false);
      setIsSubmitting(false);
      setCreatedComposite(composite);
      setCurrentInterview(composite.interview);
      await refreshInterviews();
      setIsReadyModalOpen(true);
    } catch (err: any) {
      console.error('Failed to prepare interview:', err);
      setIsPreparing(false);
      setIsSubmitting(false);
      setSubmitError(err.message || 'Failed to process resume and job description.');
    }
  };

  const handleEnterInterviewRoom = () => {
    if (createdComposite?.interview.id) {
      navigate(`/interview/${createdComposite.interview.id}`);
    }
  };

  const charCount = jobDescription.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Title & Intro */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="blue" className="text-xs">
            Interview Setup
          </Badge>
          <span className="text-xs text-slate-400">Step 1 of 2</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Configure Your Mock Interview
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Provide your resume, target job description, and preferences to set up your mock interview session.
        </p>
      </div>

      <form onSubmit={handleStartInterview} className="space-y-6">
        {/* 1. RESUME UPLOAD */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <FileUpload
              resume={resume}
              onFileSelect={(meta) => setResume(meta)}
              onRemove={() => setResume(null)}
              error={attemptedSubmit && !isResumeValid ? 'Resume is required to start the interview.' : null}
            />
          </CardContent>
        </Card>

        {/* 2. JOB DESCRIPTION */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <label htmlFor="jd-textarea" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Target Job Description <span className="text-rose-500">*</span>
                </label>
              </div>
              <span
                className={`text-xs font-mono ${
                  charCount > 30000 ? 'text-rose-600 font-bold' : 'text-slate-400'
                }`}
              >
                {charCount.toLocaleString()} / 30,000 characters
              </span>
            </div>

            <textarea
              id="jd-textarea"
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here (responsibilities, requirements, qualifications, and company product domain)..."
              className={`flex w-full rounded-xl border bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                attemptedSubmit && !isJdValid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200'
              }`}
            />

            {attemptedSubmit && !isJdNonEmpty && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Job Description is required to tailor the mock interview.</span>
              </p>
            )}

            {charCount > 30000 && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>
                  Job Description exceeds the 30,000 character limit ({charCount.toLocaleString()}/30,000). Please trim auxiliary legal notices.
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* 3. TARGET ROLE */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <label htmlFor="target-role" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Target Role <span className="text-rose-500">*</span>
              </label>
            </div>

            <Select
              id="target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as TargetRole)}
            >
              {TARGET_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {/* 4. INTERVIEW TYPE */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Interview Type <span className="text-rose-500">*</span>
                </span>
              </div>
              <span className="text-xs text-slate-400">Select focus</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INTERVIEW_TYPE_OPTIONS.map((item) => {
                const isSelected = interviewType === item.type;
                return (
                  <div
                    key={item.type}
                    onClick={() => setInterviewType(item.type)}
                    className={`flex items-start justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1.5 pr-2">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 5. DIFFICULTY & 6. INTERVIEW LENGTH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Difficulty */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Difficulty <span className="text-rose-500">*</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['Standard', 'Challenging'] as InterviewDifficulty[]).map((level) => {
                  const isSelected = difficulty === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Length */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Interview Length <span className="text-rose-500">*</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([15, 30, 45] as InterviewDuration[]).map((mins) => {
                  const isSelected = duration === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {mins} min
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 7. INTERVIEW MODE */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Interview Mode
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Text Mode */}
              <div
                onClick={() => setMode('Text')}
                className={`flex items-center justify-between rounded-xl border p-3.5 shadow-xs cursor-pointer transition-all ${
                  mode === 'Text'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      mode === 'Text' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${mode === 'Text' ? 'text-indigo-950' : 'text-slate-800'}`}>
                      Text Response
                    </p>
                    <p className="text-xs text-slate-500">Structured written PM response</p>
                  </div>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    mode === 'Text' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {mode === 'Text' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>

              {/* Voice Mode */}
              <div
                onClick={() => setMode('Voice')}
                className={`flex items-center justify-between rounded-xl border p-3.5 shadow-xs cursor-pointer transition-all ${
                  mode === 'Voice'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      mode === 'Voice' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${mode === 'Voice' ? 'text-indigo-950' : 'text-slate-800'}`}>
                        Voice Response
                      </p>
                      <Badge variant="blue" className="text-[10px] py-0 px-1.5 font-bold">
                        Live Audio
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">Interviewer speaks & candidate speaks via microphone</p>
                  </div>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    mode === 'Voice' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                  }`}
                >
                  {mode === 'Voice' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Status Message */}
        {!isFormValid && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Complete the following required fields to start:</span>
            </div>
            <p className="text-amber-700 pl-5">
              Missing: {missingFields.join(', ')}
            </p>
          </div>
        )}

        {isFormValid && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>All required fields are set. Ready to initialize your mock session.</span>
          </div>
        )}

        {/* Submission Error Message */}
        {submitError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Start Interview Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={!isFormValid || isSubmitting}
            isLoading={isSubmitting}
            className="w-full sm:w-auto px-8 gap-2 shadow-md disabled:cursor-not-allowed"
          >
            <span>Start Interview</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Multi-step "Preparing your interview" overlay */}
      <PreparationModal
        isOpen={isPreparing}
        stepStates={stepStates}
      />

      {/* "Your interview is ready" preview modal */}
      {createdComposite && (
        <InterviewReadyModal
          isOpen={isReadyModalOpen}
          targetRole={createdComposite.interview.targetRole}
          interviewType={createdComposite.interview.interviewType}
          difficulty={createdComposite.interview.difficulty}
          duration={createdComposite.interview.duration}
          questionThemes={createdComposite.brief?.recommendedQuestionThemes || []}
          candidateName={createdComposite.candidateProfile?.candidateName}
          onEnterRoom={handleEnterInterviewRoom}
        />
      )}
    </div>
  );
};
