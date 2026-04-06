import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Zap, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';

// Password strength checker
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score; // 0-5
}

function getStrengthLabel(score) {
  if (score === 0) return { label: '', color: '', width: '0%' };
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
  if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
  if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
  if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
  return { label: 'Very Strong', color: 'bg-emerald-600', width: '100%' };
}

function getStrengthTextColor(score) {
  if (score <= 1) return 'text-red-600';
  if (score <= 2) return 'text-orange-600';
  if (score <= 3) return 'text-yellow-600';
  return 'text-emerald-600';
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // pageState: 'request' | 'sent' | 'reset' | 'success'
  const [pageState, setPageState] = useState('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // On mount, check if Supabase redirected here with an access_token
  // (happens after user clicks the password reset link from email)
  useEffect(() => {
    async function checkForResetToken() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        // Also check query params in case Supabase is configured that way
        const searchParams = new URLSearchParams(window.location.search);
        const queryToken = searchParams.get('access_token');

        const token = accessToken || queryToken;

        if (token) {
          // Verify the session is valid
          const { data, error } = await supabase.auth.getSession();
          if (!error && data.session) {
            setPageState('reset');
          } else {
            // Try to recover the session from the hash
            const { data: recoverData, error: recoverError } = await supabase.auth.recoverSession(token);
            if (!recoverError && recoverData.session) {
              setPageState('reset');
            } else {
              setError('This reset link is invalid or has expired. Please request a new one.');
              setPageState('request');
            }
          }
        }
      } catch (err) {
        console.error('Error checking reset token:', err);
      }
    }

    checkForResetToken();
  }, []);

  // Handle sending the password reset email
  async function handleSendResetLink(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/forgot-password`,
    });

    if (error) {
      // Handle specific error messages for better UX
      if (error.message.includes('Email not confirmed')) {
        setError('Please confirm your email address first before resetting your password.');
      } else if (error.message.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(error.message);
      }
    } else {
      setPageState('sent');
    }
    setLoading(false);
  }

  // Handle setting the new password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const strength = getPasswordStrength(newPassword);
    if (strength < 2) {
      setError('Password is too weak. Please use a mix of uppercase, lowercase, numbers, and symbols.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (error.message.includes('Same as old password')) {
        setError('New password must be different from your current password.');
      } else {
        setError(error.message);
      }
    } else {
      setPageState('success');
    }
    setLoading(false);
  }

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthInfo = getStrengthLabel(passwordStrength);

  // ─── STATE 1: Request Reset Link ────────────────────────────
  if (pageState === 'request') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Scale Scope
              </span>
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Forgot Password?</h1>
            <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
              No worries! Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSendResetLink} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  <>
                    Send Reset Link <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 2: Email Sent Confirmation ───────────────────────
  if (pageState === 'sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Scale Scope
              </span>
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            {/* Success Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Mail className="w-7 h-7 text-emerald-600" />
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Check Your Email</h1>
            <p className="text-slate-500 text-center text-sm mb-6 leading-relaxed">
              We've sent a password reset link to
            </p>

            {/* Highlighted Email */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6 text-center">
              <span className="text-sm font-bold text-indigo-700 break-all">{email}</span>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-semibold mb-1">Didn't receive the email?</p>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setPageState('request'); setError(''); }}
                className="w-full py-3 px-4 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Try a Different Email
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/forgot-password`,
                  });
                  if (!error) {
                    // Brief visual feedback — keep same state
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resending...
                  </>
                ) : (
                  'Resend Reset Link'
                )}
              </button>
            </div>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 3: Reset Password Form ───────────────────────────
  if (pageState === 'reset') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Scale Scope
              </span>
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Set New Password</h1>
            <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
              Create a strong password that you haven't used before. Make it memorable but hard to guess.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-slate-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="new-password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    className="w-full pl-10 pr-12 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold ${getStrengthTextColor(passwordStrength)}`}>
                        {strengthInfo.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {newPassword.length}/8+ chars
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthInfo.color} rounded-full transition-all duration-500 ease-out`}
                        style={{ width: strengthInfo.width }}
                      />
                    </div>
                    {/* Requirements Checklist */}
                    <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
                      <RequirementCheck label="8+ characters" met={newPassword.length >= 8} />
                      <RequirementCheck label="Uppercase" met={/[A-Z]/.test(newPassword)} />
                      <RequirementCheck label="Lowercase" met={/[a-z]/.test(newPassword)} />
                      <RequirementCheck label="Number" met={/\d/.test(newPassword)} />
                      <RequirementCheck label="Special char" met={/[^a-zA-Z0-9]/.test(newPassword)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                      confirmPassword.length > 0 && newPassword !== confirmPassword
                        ? 'border-red-300 bg-red-50'
                        : confirmPassword.length > 0 && newPassword === confirmPassword
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200'
                    }`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">Passwords do not match</p>
                )}
                {confirmPassword.length > 0 && newPassword === confirmPassword && (
                  <p className="mt-1.5 text-xs text-emerald-600 font-medium">Passwords match</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 4: Success ──────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Scale Scope
              </span>
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            {/* Success Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                {/* Pulse ring */}
                <div className="absolute inset-0 w-20 h-20 bg-emerald-100 rounded-full animate-ping opacity-30"></div>
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Password Updated!</h1>
            <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>

            {/* Security Tip */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-indigo-800 font-semibold mb-0.5">Security Tip</p>
                  <p className="text-xs text-indigo-600 leading-relaxed">
                    Use a password manager to store your new password securely. Never reuse passwords across different platforms.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-[1.02]"
            >
              Continue to Sign In <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Sub-component: Password Requirement Check ────────────────
function RequirementCheck({ label, met }) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />
      )}
      <span className={`text-xs ${met ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}