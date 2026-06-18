import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, Briefcase } from 'lucide-react';
// import ScalScopeLogo from '../assets/Anus Tech logo.png';

export default function RegisterPage() {
  const location = useLocation();
  const [form, setForm] = useState({
    email: location.state?.email || sessionStorage.getItem('oauth_register_email') || '',
    password: '',
    confirmPassword: '',
    full_name: '',
    user_type: ''
  });
  const [msg, setMsg] = useState(location.state?.error || '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    if (form.password !== form.confirmPassword) {
      setMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (!form.user_type) {
      setMsg('Please select how you are joining us.');
      setLoading(false);
      return;
    }

    if (form.password.length < 10) {
      setMsg('Password must be at least 10 characters.');
      setLoading(false);
      return;
    }

    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password) || !/[^a-zA-Z0-9]/.test(form.password)) {
      setMsg('Password must include uppercase, lowercase, number, and special character.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          full_name: form.full_name.trim(),
          user_type: form.user_type
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setMsg('Email already registered.');
      setLoading(false);
      return;
    }

    setMsg('Success! Check your email to confirm your account.');
    setLoading(false);
  }

  const userTypes = [
    { value: 'student', label: 'Student', description: 'Learning and building ideas' },
    { value: 'early-stage-founder', label: 'Early-Stage Founder', description: 'Building a startup' },
    { value: 'mentor', label: 'Mentor', description: 'Sharing expertise' },
    { value: 'investor', label: 'Investor', description: 'Finding opportunities' },
    { value: 'other', label: 'Other', description: 'Exploring the platform' }
  ];

  return (
    <div className="bg-gray-50 flex items-center justify-center">
      {/* Background Decoration */}
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
        {/* Logo Header */}
        {/* <div className="text-center"> */}
          {/* <div to="/" className="inline-flex items-center gap-2"> */}
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
          {/* </div> */}
          {/* <h1 className="text-3xl font-black text-slate-900 mb-2">Create Your Account</h1> */}
          {/* <p className="text-slate-600">Join thousands building the future</p> */}
        {/* </div> */}

        {/* Back to Home */}
        <div className="text-left py-1">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
            ← Back to Home
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="mb-6 rounded-xl border border-[#98DE38]/30 bg-[#98DE38]/10 p-3">
            <p className="text-xs font-medium text-slate-600">
              Create your account with email and select your role first. Google sign-in is available later from the login page for registered users.
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-semibold text-slate-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="full_name"
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#98DE38] focus:border-transparent transition-all"
                  placeholder="John Doe"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Email */}
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
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#98DE38] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            {/* User Type */}
            <div>
              <label htmlFor="user_type" className="block text-sm font-semibold text-slate-700 mb-2">
                I am joining as
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  id="user_type"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#98DE38] focus:border-transparent transition-all appearance-none bg-white"
                  value={form.user_type}
                  onChange={e => setForm(f => ({ ...f, user_type: e.target.value }))}
                >
                  <option value="">Select your role</option>
                  {userTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
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
                  type="password"
                  required
                  minLength="8"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#98DE38] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength="8"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#98DE38] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
            </div>

            {/* Error/Success Message */}
            {msg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl ${msg.includes('Check your email') || msg.includes('Success')
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
                }`}>
                {msg.includes('Check your email') || msg.includes('Success') ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <p className={`text-sm ${msg.includes('Check your email') || msg.includes('Success')
                  ? 'text-green-700'
                  : 'text-red-700'
                  }`}>
                  {msg}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1B2D7F] text-white rounded-xl font-bold hover:bg-[#2A3F8F] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="mt-4 text-xs text-center text-slate-500">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-[#1B2D7F] hover:underline font-semibold">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-[#1B2D7F] hover:underline font-semibold">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Sign In Link */}
        <p className="mt-6 text-center text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#1B2D7F] hover:underline">
            Sign In
          </Link>
        </p>

        
      </div>
    </div>
  );
}
