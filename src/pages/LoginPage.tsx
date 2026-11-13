import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { INITIAL_PROFILES } from '../services/mockData';
import { isSupabaseConfigured } from '../services/supabase';
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';

export const LoginPage: React.FC<{ initialMode?: 'login' | 'register' }> = ({ initialMode = 'login' }) => {
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn, signUp, switchDemoUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    try {
      setSubmitting(true);
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Please provide your full name.');
          setSubmitting(false);
          return;
        }
        await signUp(email.trim(), password, fullName.trim());
        // After successful signup, Supabase will have sent an OTP.
        // Navigate to verification screen, passing email via location state.
        navigate('/verify-otp', { replace: true, state: { email: email.trim(), isLoginFlow: false } });
        return; // stop further navigation

        await signIn(email.trim(), password);
        showToast('Signed in successfully!', 'success');
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Authentication error:', err);
      // Duplicate registration handling
      if (err.message === 'ALREADY_REGISTERED' || err.message?.toLowerCase().includes('already_registered')) {
        setError('An account with this email already exists. Please log in instead.');
      } else if (err.message?.toLowerCase().includes('user not confirmed')) {
        // Unverified login – navigate to OTP verification flow
        navigate('/verify-otp', { replace: true, state: { email: email.trim(), isLoginFlow: true } });
      } else {
        setError(err.message || 'Authentication failed. Please check credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (profile: typeof INITIAL_PROFILES[0]) => {
    if (isSupabaseConfigured || import.meta.env.PROD) {
      setError('Demo authentication is disabled in production / live Supabase mode.');
      return;
    }
    try {
      setSubmitting(true);
      await switchDemoUser(profile.id);
      showToast(`Logged in as ${profile.full_name}`, 'success');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-fintech-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-royal to-royal-light flex items-center justify-center shadow-lg shadow-royal/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-navy">
            Split<span className="text-royal">Mate</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-navy">
          {isRegister ? 'Create your SplitMate account' : 'Welcome back to SplitMate'}
        </h2>
        <p className="mt-2 text-xs text-text-secondary">
          "Split Expenses. Not Friendships."
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-fintech shadow-fintech-lg">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                !isRegister
                  ? 'border-royal text-royal'
                  : 'border-transparent text-text-secondary hover:text-navy'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                isRegister
                  ? 'border-royal text-royal'
                  : 'border-transparent text-text-secondary hover:text-navy'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sagar Pratap Singh"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="input-fintech text-sm"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary uppercase">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-fintech text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary uppercase">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-fintech text-sm"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3 mt-2 text-sm font-semibold"
              disabled={submitting}
            >
              {submitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Instant Sandbox Testing Persona Selector (Local Development Sandbox Only) */}
          {!isSupabaseConfigured && !import.meta.env.PROD && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  1-Click Demo Profiles (Local Dev Only)
                </span>
                <span className="text-[10px] text-royal font-medium">Sandbox</span>
              </div>

              <div className="space-y-2">
                {INITIAL_PROFILES.map(p => {
                  const isAdmin = p.email.includes('singhsagar');
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQuickLogin(p)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 hover:border-royal/40 hover:bg-royal/5 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.full_name} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-navy">{p.full_name}</span>
                            {isAdmin && (
                              <span className="text-[9px] bg-royal/10 text-royal px-1.5 py-0.2 rounded font-semibold">
                                Primary Admin
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-text-secondary">{p.email}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

