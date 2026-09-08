import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardFooter } from '../components/ui/Card';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { login, isSupabaseEnabled } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result.error || 'Invalid email or password. Please try again.');
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
            Welcome back to PM Coach
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Log in to access your mock interview transcripts and tailored questions
          </p>

          {/* Backend Status Indicator */}
          <div className="mt-2.5 flex justify-center">
            {isSupabaseEnabled ? (
              <Badge variant="blue" className="text-[11px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Supabase Auth Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] gap-1 bg-slate-50 text-slate-600 border-slate-200">
                Local Authentication
              </Badge>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-start gap-2 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Sign In Failed: </span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Form Card */}
        <Card className="border-slate-200 shadow-md">
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                icon={<Mail className="h-4 w-4" />}
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                icon={<Lock className="h-4 w-4" />}
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Remember this device</span>
                </label>
                <span className="text-slate-400 text-[11px]">
                  {isSupabaseEnabled ? 'Protected by Supabase' : 'Local Auth'}
                </span>
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={loading}>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </CardContent>
          </form>

          <CardFooter className="flex justify-center border-t border-slate-100 py-4 bg-slate-50/50 rounded-b-2xl">
            <p className="text-xs text-slate-500">
              Don't have an account yet?{' '}
              <Link to="/signup" className="font-semibold text-indigo-600 hover:underline">
                Create free account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
