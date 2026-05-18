import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const finishAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {
          navigate('/login', { replace: true });
          return;
        }

        const { data: aalData, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalError) {
          console.warn('MFA AAL check failed:', aalError.message);
        }

        if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
          navigate('/mfa', { replace: true });
          return;
        }

        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Authentication failed');
        }
      }
    };

    finishAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#1B2D7F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">
          Completing sign in...
        </p>
      </div>
    </div>
  );
}