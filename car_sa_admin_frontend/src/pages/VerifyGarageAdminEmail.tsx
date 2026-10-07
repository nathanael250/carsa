import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const VerifyGarageAdminEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canLogin, setCanLogin] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
      .split('');

    if (!pasted.length) return;

    const next = Array(6).fill('');
    pasted.forEach((digit, i) => {
      next[i] = digit;
    });
    setDigits(next);

    const lastIndex = Math.min(pasted.length, 6) - 1;
    inputRefs.current[lastIndex]?.focus();
  };

  const isAlreadyVerifiedMessage = (message?: string) =>
    !!message && /already\s+verified|verified\s+already/i.test(message);

  const markAsVerifiedAndRedirect = (message: string) => {
    setError(null);
    setCanLogin(true);
    setSuccess(message);
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.verifyEmail(trimmedEmail, trimmedCode);
      if (response.error) {
        if (isAlreadyVerifiedMessage(response.error)) {
          markAsVerifiedAndRedirect('Email is already verified. Redirecting to login...');
          return;
        }
        setError(response.error);
        return;
      }
      markAsVerifiedAndRedirect(response.data?.message || 'Email verified successfully. Redirecting to login...');
    } catch (err) {
      setError('Failed to verify email. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required to resend the code.');
      return;
    }

    setResending(true);
    try {
      const response = await api.resendVerificationCode(trimmedEmail);
      if (response.error) {
        if (isAlreadyVerifiedMessage(response.error)) {
          markAsVerifiedAndRedirect('Email is already verified. Redirecting to login...');
          return;
        }
        setError(response.error);
        return;
      }
      setSuccess(response.data?.message || 'Verification code sent successfully.');
    } catch (err) {
      setError('Failed to resend verification code.');
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#edf3f7] to-[#e6eef4] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#dde7ee] shadow-lg shadow-[#2F4858]/10 p-6 sm:p-7">
        <div className="flex justify-end">
          <Link
            to="/login"
            className="text-xs text-[#2F4858]/70 hover:text-[#2F4858] font-medium"
          >
            Back to Login
          </Link>
        </div>

        <div className="text-center mt-2 mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] flex items-center justify-center shadow-md shadow-[#FEA14C]/40">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l8.89 5.93a2 2 0 002.22 0L23 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-[#2F4858] mt-4">Verify Your Email</h1>
          <p className="text-sm text-[#2F4858]/70 mt-2">
            We sent a 6-digit verification code to
          </p>
          <p className="text-sm font-semibold text-[#2F4858] break-all">{email || 'your email address'}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#2F4858]">Enter Verification Code</p>
            <div className="flex items-center justify-between gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 rounded-lg border border-[#c9d7e2] text-center text-lg font-semibold text-[#2F4858] focus:outline-none focus:ring-2 focus:ring-[#FEA14C]/40 focus:border-[#FEA14C]"
                />
              ))}
            </div>
          </div>

          {!searchParams.get('email') && (
            <div>
              <label className="block text-sm font-medium text-[#2F4858]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-[#c9d7e2] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FEA14C] focus:border-transparent"
                placeholder="admin@example.com"
                required
              />
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>

          {canLogin && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 border border-[#2F4858]/25 text-[#2F4858] rounded-lg hover:bg-[#f5f8fb]"
            >
              Go to Login
            </button>
          )}

          <div className="pt-1 text-center">
            <p className="text-sm text-[#2F4858]/70 mb-2">Did not receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full px-4 py-2 border border-[#c9d7e2] text-[#2F4858] rounded-lg hover:bg-[#f5f8fb] disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <div className="border-t border-[#e4edf3] pt-4">
            <button
              type="button"
              onClick={() => navigate('/register-garage-admin')}
              className="w-full text-sm text-[#2F4858] hover:text-[#FE8A21] font-medium"
            >
              Back to Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyGarageAdminEmail;
