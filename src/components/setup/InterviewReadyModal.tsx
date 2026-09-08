import React from 'react';
import { CheckCircle2, ArrowRight, Target, Flame, Layers, Clock, Sparkles } from 'lucide-react';
import { TargetRole, InterviewType, InterviewDifficulty, InterviewDuration } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface InterviewReadyModalProps {
  isOpen: boolean;
  targetRole: TargetRole;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  duration: InterviewDuration;
  questionThemes: string[];
  candidateName?: string | null;
  onEnterRoom: () => void;
}

export const InterviewReadyModal: React.FC<InterviewReadyModalProps> = ({
  isOpen,
  targetRole,
  interviewType,
  difficulty,
  duration,
  questionThemes,
  candidateName,
  onEnterRoom,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Your Interview is Ready
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {candidateName ? `Welcome ${candidateName}. ` : ''}Your personalized PM interview session has been generated and tailored.
          </p>
        </div>

        {/* Configuration Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Target Role
            </span>
            <p className="text-xs font-bold text-slate-800 truncate" title={targetRole}>
              {targetRole}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Focus
            </span>
            <p className="text-xs font-bold text-indigo-600 truncate" title={interviewType}>
              {interviewType}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Difficulty
            </span>
            <p className="text-xs font-bold text-amber-600 truncate" title={difficulty}>
              {difficulty}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Duration
            </span>
            <p className="text-xs font-bold text-slate-800 truncate">
              {duration} mins
            </p>
          </div>
        </div>

        {/* Personalized Themes Preview */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
              Personalized Areas & Themes
            </h3>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            {questionThemes.length > 0 ? (
              questionThemes.slice(0, 3).map((theme, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span className="font-medium text-slate-800">{theme}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span className="font-medium text-slate-800">Problem formulation & user empathy</span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span className="font-medium text-slate-800">Prioritization & tradeoff rationale</span>
                </li>
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span className="font-medium text-slate-800">Cross-functional execution & metrics</span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <Button
            type="button"
            size="lg"
            onClick={onEnterRoom}
            className="w-full gap-2 shadow-lg hover:shadow-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <span>Enter Interview Room</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
