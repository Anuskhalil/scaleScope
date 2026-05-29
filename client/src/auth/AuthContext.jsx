import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mfaLevel, setMfaLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, user_type, avatar_url, location')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile load error:', error);
      setProfile(null);
      return null;
    }

    setProfile(data || null);
    return data || null;
  };

  const refreshMfaLevel = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (error) {
        console.warn('MFA assurance error:', error.message);
        setMfaLevel(null);
        return null;
      }

      setMfaLevel(data);
      return data;
    } catch (err) {
      console.warn('MFA assurance failed:', err);
      setMfaLevel(null);
      return null;
    }
  };

  const hydrateAuth = async () => {
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      const currentSession = data.session || null;
      const currentUser = currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      if (currentUser?.id) {
        await Promise.all([
          loadProfile(currentUser.id),
          refreshMfaLevel(),
        ]);
      } else {
        setProfile(null);
        setMfaLevel(null);
      }
    } catch (err) {
      console.error('Auth hydrate failed:', err);
      setSession(null);
      setUser(null);
      setProfile(null);
      setMfaLevel(null);
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!mounted) return;

        const nextSession = data?.session || null;
        const nextUser = nextSession?.user || null;

        setSession(nextSession);
        setUser(nextUser);

        if (nextUser?.id) {
          await Promise.all([loadProfile(nextUser.id), refreshMfaLevel()]);
        } else {
          setProfile(null);
          setMfaLevel(null);
        }
      } catch (err) {
        console.error('Auth init failed:', err);

        if (!mounted) return;

        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      const nextUser = nextSession?.user || null;

      setSession(nextSession || null);
      setUser(nextUser);
      setLoading(false);

      if (nextUser?.id) {
        setTimeout(() => {
          if (!mounted) return;
          loadProfile(nextUser.id);
          refreshMfaLevel();
        }, 0);
      } else {
        setProfile(null);
        setMfaLevel(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const emailVerified = Boolean(
    user?.email_confirmed_at ||
    user?.confirmed_at ||
    user?.app_metadata?.provider === 'google' ||
    user?.app_metadata?.provider === 'github'
  );

  const needsMfa =
    Boolean(session) &&
    emailVerified &&
    mfaLevel?.nextLevel === 'aal2' &&
    mfaLevel?.currentLevel !== 'aal2';

  const isAuthenticated = Boolean(session && user && emailVerified && !needsMfa);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    authError,
    emailVerified,
    mfaLevel,
    needsMfa,
    isAuthenticated,
    refreshAuth: hydrateAuth,
    refreshMfaLevel,
    signOut: () => supabase.auth.signOut(),
  }), [session, user, profile, loading, authError, emailVerified, mfaLevel, needsMfa, isAuthenticated]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
