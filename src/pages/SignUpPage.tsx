import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MailCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TargetRole } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardFooter } from '../components/ui/Card';

export const SignUpPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState<TargetRole>('Senior Product Manager');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const { signup, isSupabaseEnabled } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const result = await signup(
      name || 'Product Leader',
      email || 'pm@coach.io',
      password,
      targetRole
    );
    setLoading(false);

    if (result.confirmationRequired) {
      setConfirmationSent(true);
      return;
    }

    if (result.success) {
      navigate('/setup');
    } else {
      setErrorMsg(result.error || 'Failed to create account. Please check your information.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Compass className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create your PM Coach Account
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Personalize your interview preparation with your target level and resume
          </p>

          <div className="mt-2.5 flex justify-center">
            {isSupabaseEnabled ? (
              <Badge variant="blue" className="text-[11px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Supabase Auth Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] gap-1 bg-slate-50 text-slate-600 border-slate-200">
                Local / Demo Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Benefits Banner */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-1.5 text-xs text-emerald-900">
          <div className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Includes real LLM evaluations & calibrated rubrics</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>AI question personalization based on your target role</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-start gap-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Sign Up Failed: </span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Confirmation Notice */}
        {confirmationSent ? (
          <Card className="border-indigo-200 bg-indigo-50/50 shadow-md p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <MailCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Verify your email address</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                We sent a confirmation link to <strong className="text-indigo-950">{email}</strong>. Please check your inbox and click the link to activate your account.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login">
                <Button size="sm" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          /* Form Card */
          <Card className="border-slate-200 shadow-md">
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  icon={<User className="h-4 w-4" />}
                />

                <Input
                  label="Work or Personal Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@example.com"
                  icon={<Mail className="h-4 w-4" />}
                />

                <Select
                  label="Primary Target PM Level"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as TargetRole)}
                >
                  <option value="Associate Product Manager">Associate Product Manager (APM)</option>
                  <option value="Product Manager">Product Manager (Mid-Level)</option>
                  <option value="Senior Product Manager">Senior Product Manager</option>
                  <option value="Staff / Principal PM">Staff / Principal PM</option>
                  <option value="Group Product Manager">Group Product Manager (GPM)</option>
                </Select>

                <Input
                  label="Create Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  icon={<Lock className="h-4 w-4" />}
                />

                <Button type="submit" className="w-full mt-2" isLoading={loading}>
                  <span>Get Started & Set Up Mock</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </CardContent>
            </form>

            <CardFooter className="flex justify-center border-t border-slate-100 py-4 bg-slate-50/50 rounded-b-2xl">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};
