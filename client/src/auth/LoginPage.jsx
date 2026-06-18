import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
// import ScalScopeLogo from '../assets/Anus Tech logo.png';


const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GithubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export default function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterLogin = location.state?.from || '/dashboard';

  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location.state]);

  async function updateLoginTracking(userId) {
    try {
      await supabase.rpc('increment_login_tracking', {
        p_user_id: userId,
      });
    } catch (err) {
      console.warn('Login tracking skipped:', err?.message || err);
    }
  }

  async function goNextAfterFirstFactor(userId) {
    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      console.warn('MFA AAL check failed:', aalError.message);
    }

    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      navigate('/mfa', {
        replace: true,
        state: {
          from: redirectAfterLogin,
        },
      });
      return;
    }

    await updateLoginTracking(userId);
    navigate(redirectAfterLogin, { replace: true });
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (error) throw error;

      await goNextAfterFirstFactor(data.user.id);
    } catch (err) {
      setError(err.message || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthSignIn(provider) {
    try {
      setError('');
      setOauthLoading(provider);

      const email = form.email.trim().toLowerCase();

      if (!email) {
        setError('Enter your registered email first. New users must register and select a role before Google or GitHub login.');
        setOauthLoading('');
        return;
      }

      const { data: registeredProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!registeredProfile?.user_type) {
        sessionStorage.setItem('oauth_register_email', email);
        setError('Please register first and select your role. Google/GitHub login is only available after registration.');
        setOauthLoading('');
        navigate('/register', {
          state: {
            email,
            error: 'Please create your account, select your role, and set a password first.',
          },
        });
        return;
      }

      sessionStorage.setItem('oauth_registered_login', '1');
      sessionStorage.setItem('oauth_registered_email', email);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            login_hint: email,
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message || 'OAuth sign-in failed');
      setOauthLoading('');
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(152,222,56,.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div to="/" className="inline-flex items-center gap-2">
            {/* <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div> */}
            {/* Logo */}
            {/* <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <img
                  src={ScalScopeLogo}
                  alt="Scale Scope Logo"
                  className="h-auto w-60 md:h-14 lg:h-16 object-cover"
                />
              </Link>
            </div> */}
          </div>

        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={Boolean(oauthLoading) || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              <GoogleIcon />
              {oauthLoading === 'google' ? 'Redirecting...' : 'Sign in with Google'}
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('github')}
              disabled={Boolean(oauthLoading) || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              <GithubIcon />
              {oauthLoading === 'github' ? 'Redirecting...' : 'Sign in with GitHub'}
            </button>
          </div>

          <div className="mb-6 flex items-start gap-2 rounded-xl border border-[#98DE38]/30 bg-[#98DE38]/10 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1B2D7F]" />
            <p className="text-xs font-medium text-slate-600">
              Google Authenticator is used after your first sign-in step when MFA is enabled.
            </p>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>

            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#98DE38] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#98DE38] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#1B2D7F] border-slate-300 rounded focus:ring-[#98DE38]"
                />
                <span className="ml-2 text-sm text-slate-600">
                  Remember me
                </span>
              </label>

              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-[#1B2D7F] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || Boolean(oauthLoading)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1B2D7F] text-white rounded-xl font-bold hover:bg-[#2A3F8F] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-slate-600">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-bold text-[#1B2D7F] hover:underline">
            Create Account
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
