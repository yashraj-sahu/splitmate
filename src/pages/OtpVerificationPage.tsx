import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Helper to mask email like a***@domain.com
function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Expect email passed via location state
  const email = (location.state as any)?.email as string | undefined;
  const isLoginFlow = (location.state as any)?.isLoginFlow as boolean | undefined;

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Guard: if email missing, go back to login
  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true });
    }
  }, [email, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return; // only digits
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto‑move focus to next input
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      next?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(text)) {
      setOtp(text.split(''));
      const last = document.getElementById('otp-5') as HTMLInputElement;
      last?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = otp.join('');
    if (token.length !== 6) {
      setError('Please enter the 6‑digit code.');
      return;
    }
    try {
      setSubmitting(true);
      await authService.verifySignupOtp(email!, token);
      showToast('Email verified successfully!', 'success');
      // After verification, load session (Supabase auto signs in) and go to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const code = err.message;
      let msg = '';
      if (code === 'INVALID_OTP') msg = 'Incorrect verification code. Please try again.';
      else if (code === 'EXPIRED_OTP') msg = 'This code has expired. Request a new one.';
      else if (code === 'RATE_LIMIT') msg = 'Too many requests. Please wait before trying again.';
      else msg = err.message || 'Verification failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authService.resendSignupOtp(email!);
      showToast('A new verification code has been sent.', 'success');
      setResendCooldown(60);
    } catch (err: any) {
      const code = err.message;
      let msg = '';
      if (code === 'RATE_LIMIT') msg = 'Too many requests. Please wait before trying again.';
      else msg = err.message || 'Failed to resend code.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-fintech-bg flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-navy text-center">
          Verify your email
        </h2>
        <p className="text-sm text-text-secondary text-center">
          We've sent a verification code to {email && maskEmail(email)}. Please check your inbox.
        </p>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
          <div className="flex gap-2" onPaste={handlePaste}>
            {otp.map((d, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                className="w-12 h-12 text-center text-xl border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal"
                disabled={submitting}
                required
              />
            ))}
          </div>
          <button
            type="submit"
            className="btn-primary w-full py-2 text-sm font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={handleResend}
            className="text-royal hover:underline disabled:text-slate-400"
            disabled={submitting || resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : <span>Resend code <RefreshCw className="inline w-4 h-4" /></span>}
          </button>
          <p className="text-sm text-text-secondary">
            Already have an account? <a href="/login" className="text-royal hover:underline">Log in</a>
          </p>
        </form>
      </div>
    </div>
  );
};

