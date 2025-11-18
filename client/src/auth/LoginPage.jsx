// src/pages/LoginPage.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { GoogleIcon, GithubIcon } from '../components/Icons';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function updateLoginTracking(userId) {
    try {
      const { error } = await supabase
        .from('user_auth')
        .update({
          last_login: new Date().toISOString(),
          login_count: supabase.sql('login_count + 1')
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating login tracking:', error);
      }
    } catch (err) {
      console.error('Failed to update login tracking:', err);
    }
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setError(error.message);
    } else {
      await updateLoginTracking(data.user.id);
      navigate('/dashboard');
    }
    setLoading(false);
  }

  async function handleOAuthSignIn(provider) {
    setError('');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Update login tracking for OAuth logins
          await updateLoginTracking(session.user.id);
          subscription.unsubscribe()
        }
      }
    );

    // Initiate OAuth flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
    });

    if (error) {
      setError(error.message);
      subscription.unsubscribe();
    }
  }


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <AuthLayout title="Log In to Your Account">
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuthSignIn('google')}
          className="w-full flex items-center justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
        >
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </button>
        <button
          onClick={() => handleOAuthSignIn('github')}
          className="w-full flex items-center justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
        >
          <GithubIcon className="w-5 h-5 mr-2" />
          Continue with GitHub
        </button>
      </div>

      {/* --- Divider --- */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-slate-500">Or continue with email</span>
        </div>
      </div>

      {/* --- Email/Password Form --- */}
      <form onSubmit={handlePasswordLogin} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"
              value={form.email}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"
              value={form.password}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Logging In...' : 'Log In with Email'}
          </button>
        </div>
        {error && <p className="text-sm text-center text-red-500">{error}</p>}
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Not a member yet? {' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign Up
        </Link>
      </p>
    </AuthLayout>
  );
}