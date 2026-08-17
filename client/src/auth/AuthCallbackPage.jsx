import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { markAuthActivity } from './authActivity';

const OAUTH_PROVIDERS = new Set(['google', 'github']);
const OAUTH_INTENT_KEY = 'scalescope_oauth_login_intent';
const OAUTH_INTENT_TTL_MS = 10 * 60 * 1000;

function readOAuthIntent() {
  try {
    const raw = localStorage.getItem(OAUTH_INTENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.email || Date.now() - Number(parsed.createdAt || 0) > OAUTH_INTENT_TTL_MS) {
      localStorage.removeItem(OAUTH_INTENT_KEY);
      return null;
    }

    return {
      provider: parsed.provider || '',
      email: String(parsed.email).toLowerCase(),
    };
  } catch {
    localStorage.removeItem(OAUTH_INTENT_KEY);
    return null;
  }
}

function clearOAuthIntent() {
  localStorage.removeItem(OAUTH_INTENT_KEY);
  sessionStorage.removeItem('oauth_registered_login');
  sessionStorage.removeItem('oauth_registered_email');
}

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
        const oauthIntent = readOAuthIntent();
        const legacyOAuthWasPrechecked = sessionStorage.getItem('oauth_registered_login') === '1';
        const legacyOAuthEmail = sessionStorage.getItem('oauth_registered_email') || '';
        const oauthWasPrechecked = Boolean(oauthIntent?.email) || legacyOAuthWasPrechecked;
        const oauthRegisteredEmail = oauthIntent?.email || legacyOAuthEmail;

        if (OAUTH_PROVIDERS.has(provider) && !oauthWasPrechecked) {
          await supabase.auth.signOut();
          clearOAuthIntent();

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
          clearOAuthIntent();

          navigate('/login', {
            replace: true,
            state: {
              error: 'The OAuth email did not match the registered email you entered.',
            },
          });

          return;
        }

        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, user_type')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile && OAUTH_PROVIDERS.has(provider) && user.email) {
          const { data: emailProfile, error: emailProfileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, user_type')
            .eq('email', user.email.toLowerCase())
            .maybeSingle();

          if (emailProfileError) throw emailProfileError;

          if (emailProfile?.id && emailProfile.id !== user.id) {
            await supabase.auth.signOut();
            clearOAuthIntent();

            navigate('/login', {
              replace: true,
              state: {
                error:
                  'This Google/GitHub account is registered with the same email but is not linked to your ScaleScope login yet. Sign in with email/password once, then link Google/GitHub from account settings.',
              },
            });

            return;
          }

          profile = emailProfile || null;
        }

        if ((!profile || !profile.user_type) && metadataRole && provider === 'email') {
          const fallbackProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || profile?.full_name || '',
            email: user.email,
            user_type: metadataRole,
            updated_at: new Date().toISOString(),
          };

          const { error: createProfileError } = await supabase
            .from('profiles')
            .upsert(fallbackProfile, { onConflict: 'id' });

          if (createProfileError) throw createProfileError;

          profile = fallbackProfile;
        }

        if (
          OAUTH_PROVIDERS.has(provider) &&
          profile?.email &&
          user.email &&
          profile.email.toLowerCase() !== user.email.toLowerCase()
        ) {
          await supabase.auth.signOut();
          clearOAuthIntent();

          navigate('/login', {
            replace: true,
            state: {
              error: 'The OAuth account does not match your registered ScaleScope email.',
            },
          });

          return;
        }

        if (!profile?.user_type && OAUTH_PROVIDERS.has(provider)) {
          await supabase.auth.signOut();
          clearOAuthIntent();

          navigate('/login', {
            replace: true,
            state: {
              error:
                'Your registered role was not found. Please sign in with email or contact support.',
            },
          });

          return;
        }

        if (!profile?.user_type) {
          await supabase.auth.signOut();
          clearOAuthIntent();

          navigate('/register', {
            replace: true,
            state: {
              email: user.email || '',
              error:
                'Your ScaleScope role profile was not found. Please create/select your role again, or contact support if this email already exists.',
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
          markAuthActivity();
          navigate('/mfa', { replace: true });
          return;
        }

        clearOAuthIntent();
        markAuthActivity();
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
