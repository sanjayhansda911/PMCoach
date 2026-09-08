import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Award,
  Layers,
  FileCheck,
  ChevronRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background radial gradient blobs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-indigo-200/40 via-purple-100/30 to-slate-50 blur-3xl opacity-70" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Structured Mock Interviews & Calibrated Rubrics</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Ace Your Product Management Interviews with{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 bg-clip-text text-transparent">
              Realistic AI Simulations
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Practice realistic PM interviews tailored to your resume and the role you're targeting. Get evidence-based feedback on how you actually performed.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/setup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 shadow-lg shadow-indigo-500/25">
                    <span>Start Mock Interview</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full">
                    <span>Candidate Dashboard</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 shadow-lg shadow-indigo-500/25 bg-indigo-600 hover:bg-indigo-700">
                    <UserPlus className="h-4 w-4" />
                    <span>Get Started Free</span>
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full gap-2 border-slate-300 hover:bg-slate-50">
                    <LogIn className="h-4 w-4 text-indigo-600" />
                    <span>Log In</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {!isAuthenticated && (
            <div className="mt-4">
              <Link
                to="/setup"
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
              >
                <span>Or start an instant guest interview without an account</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Mock Preview Card */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-8 shadow-xl shadow-slate-200/40">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-mono text-slate-400">pm-coach-simulation://setup-and-practice</span>
            </div>
            <Badge variant="blue" className="text-xs">
              Configurable Session
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Question side */}
            <div className="lg:col-span-6 rounded-2xl bg-slate-50 p-6 border border-slate-200/70 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="blue">Product Sense</Badge>
                <span className="text-xs text-slate-500 font-medium">Standard • 30 Min</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                "Design an alarm clock specifically tailored for individuals who are visually impaired."
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates user empathy, physical accessibility, tactile alternatives, and safety considerations.
              </p>
              <div className="rounded-xl bg-white p-3.5 border border-slate-200/80 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">Evaluation Focus:</p>
                <p>Problem Framing ➔ User Segmentation & Pain Points ➔ Explicit Trade-offs ➔ Success Metrics</p>
              </div>
            </div>

            {/* Core Competencies overview */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Competencies Evaluated:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Product Sense</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Execution & Triage</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Analytics & Metrics</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Strategy & Moats</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Leadership & Behavioral</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Cross-cutting Communication</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  Select your target seniority from APM to Group PM.
                </span>
                <Link to={isAuthenticated ? '/setup' : '/signup'}>
                  <Button size="sm" className="gap-1.5">
                    {isAuthenticated ? 'Start Mock Interview' : 'Get Started'} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Props */}
      <section id="how-it-works" className="bg-slate-100/70 py-20 border-y border-slate-200/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
              Mock Interview System
            </h2>
            <p className="text-3xl font-extrabold text-slate-900">
              Structured preparation tailored to real product job descriptions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Resume & Job Description</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Provide your PDF resume and target job requirements. The setup flow calibrates interview focus, difficulty, and duration to your goals.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Core PM Focus Areas</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Practice focused sessions in Product Sense, Execution, Analytics, Strategy, Leadership & Behavioral, or a Mixed PM comprehensive round.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Holistic Competency Model</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Built to evaluate Product Sense, Execution, Analytics, Strategy, Leadership, and Communication across every answer structure.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-8 sm:p-12 text-center text-white shadow-xl shadow-indigo-500/20">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            {isAuthenticated ? 'Set up your next mock interview' : 'Create your free account today'}
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-indigo-100">
            {isAuthenticated
              ? `Welcome back, ${user?.name || 'Product Leader'}. Configure your target role, difficulty, and job description to begin.`
              : 'Join to practice with real AI simulations, track your competency growth across sessions, and receive calibrated coaching feedback.'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {isAuthenticated ? (
              <Link to="/setup">
                <Button size="lg" className="bg-white text-indigo-700 hover:bg-slate-50 font-bold px-8 shadow-lg">
                  Start Mock Interview
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="lg" className="bg-white text-indigo-700 hover:bg-slate-50 font-bold px-8 shadow-lg">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-bold px-8">
                    Log In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
