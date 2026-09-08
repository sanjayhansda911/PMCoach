import React from 'react';
import { Compass, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Compass className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight">PM Interview Coach</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Targeted simulation, diagnostic frameworks, and instant rubric evaluations for product leaders.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Interview Pillars
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link to="/setup" className="hover:text-indigo-600">Product Sense & Design</Link></li>
              <li><Link to="/setup" className="hover:text-indigo-600">Execution & Metrics Triage</Link></li>
              <li><Link to="/setup" className="hover:text-indigo-600">Product Strategy & Moats</Link></li>
              <li><Link to="/setup" className="hover:text-indigo-600">Behavioral & Leadership</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Frameworks Covered
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>CIRCLES Method</li>
              <li>HEART & AARM Metrics</li>
              <li>3Cs, SWOT & Porter’s Five</li>
              <li>STAR Behavioral Matrix</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link to="/dashboard" className="hover:text-indigo-600">Dashboard</Link></li>
              <li><Link to="/setup" className="hover:text-indigo-600">Start Interview</Link></li>
              <li><Link to="/history" className="hover:text-indigo-600">Past Transcripts</Link></li>
              <li><Link to="/login" className="hover:text-indigo-600">Account Access</Link></li>
              <li><Link to="/internal/evals" className="text-amber-700 font-semibold hover:underline">Internal Evals (Dev)</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© 2026 PM Interview Coach. Built with React, Vite & Tailwind CSS.</p>
          <p className="flex items-center gap-1">
            Empowering product managers to land dream offers with confidence <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
