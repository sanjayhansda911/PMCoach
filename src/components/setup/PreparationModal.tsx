import React from 'react';
import { Loader2, CheckCircle2, Sparkles, FileText, Briefcase, Compass } from 'lucide-react';

export interface PreparationStepState {
  stepNumber: 1 | 2 | 3;
  status: 'waiting' | 'running' | 'completed';
}

interface PreparationModalProps {
  isOpen: boolean;
  stepStates: Record<1 | 2 | 3, 'waiting' | 'running' | 'completed'>;
}

export const PreparationModal: React.FC<PreparationModalProps> = ({
  isOpen,
  stepStates,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1 as const,
      icon: FileText,
      pendingTitle: 'Analyzing your resume',
      completedTitle: 'Resume parsed',
      description: 'Extracting candidate background, experience evidence, and documented skills',
    },
    {
      num: 2 as const,
      icon: Briefcase,
      pendingTitle: 'Understanding the role',
      completedTitle: 'Job description analyzed',
      description: 'Identifying key responsibilities, competencies, and domain requirements',
    },
    {
      num: 3 as const,
      icon: Compass,
      pendingTitle: 'Personalizing your interview',
      completedTitle: 'Interview focus created',
      description: 'Synthesizing evidence matching, probing areas, and tailored question themes',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs ring-1 ring-indigo-100">
            <Sparkles className="h-6 w-6 animate-pulse text-indigo-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Preparing Your Mock Interview
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Processing candidate context and tailoring interview objectives against role requirements.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {steps.map((step) => {
            const status = stepStates[step.num];
            const isDone = status === 'completed';
            const isRunning = status === 'running';
            const isWaiting = status === 'waiting';

            const Icon = step.icon;

            return (
              <div
                key={step.num}
                className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : isRunning
                    ? 'border-indigo-200 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-100 bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : isRunning ? (
                    <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                      {step.num}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        isDone
                          ? 'text-emerald-900'
                          : isRunning
                          ? 'text-indigo-950'
                          : 'text-slate-600'
                      }`}
                    >
                      {isDone ? `✓ ${step.completedTitle}` : step.pendingTitle}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center text-[11px] text-slate-400">
          Strict zero-hallucination factual extraction engine active
        </div>
      </div>
    </div>
  );
};
