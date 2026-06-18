import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const OAUTH_PROVIDERS = new Set(['google', 'github']);

function getPrimaryProvider(user) {
  return (
    user?.app_metadata?.provider ||
    user?.identities?.[0]?.provider ||
    'email'
  );
}

function getMetadataRole(user) {
  return (
    user?.user_metadata?.user_type ||
    user?.app_metadata?.user_type ||
    null
  );
}

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

        const user = data.session.user;
        const provider = getPrimaryProvider(user);
        const metadataRole = getMetadataRole(user);
        const oauthWasPrechecked = sessionStorage.getItem('oauth_registered_login') === '1';
        const oauthRegisteredEmail = sessionStorage.getItem('oauth_registered_email') || '';

        if (OAUTH_PROVIDERS.has(provider) && !oauthWasPrechecked) {
          await supabase.auth.signOut();

          navigate('/register', {
            replace: true,
            state: {
              email: user.email || oauthRegisteredEmail,
              error:
                'Please register first, select your role, and set a password. Google/GitHub login works after registration.',
            },
          });

          return;
        }

        if (
          OAUTH_PROVIDERS.has(provider) &&
          oauthRegisteredEmail &&
          user.email?.toLowerCase() !== oauthRegisteredEmail.toLowerCase()
        ) {
          await supabase.auth.signOut();

          navigate('/login', {
            replace: true,
            state: {
              error: 'The OAuth email did not match the registered email you entered.',
            },
          });

          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, user_type')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (OAUTH_PROVIDERS.has(provider) && !metadataRole) {
          await supabase.auth.signOut();

          navigate('/login', {
            replace: true,
            state: {
              error:
                'Please register with email and select your role first. Google sign-in is only for registered users.',
            },
          });

          return;
        }

        if (!profile?.user_type && OAUTH_PROVIDERS.has(provider)) {
          await supabase.auth.signOut();

          navigate('/login', {
            replace: true,
            state: {
              error:
                'Your registered role was not found. Please sign in with email or contact support.',
            },
          });

          return;
        }

        if ((!profile || !profile.user_type) && metadataRole && provider === 'email') {
          const { error: createProfileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: user.id,
                full_name: profile?.full_name || user.user_metadata?.full_name || '',
                email: user.email,
                user_type: metadataRole,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

          if (createProfileError) throw createProfileError;
        }

        if (!profile?.user_type && !metadataRole) {
          await supabase.auth.signOut();

          navigate('/login', {
            replace: true,
            state: {
              error:
                'Your account role is missing. Please register again or contact support.',
            },
          });

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

        sessionStorage.removeItem('oauth_registered_login');
        sessionStorage.removeItem('oauth_registered_email');
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
