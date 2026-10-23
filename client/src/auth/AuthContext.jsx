/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { clearAuthActivity, isAuthIdleExpired, markAuthActivity } from './authActivity';

const AuthCtx = createContext(null);
const SUPABASE_SESSION_KEY = 'scalescope-auth-session';

const hasPersistedSession = () => {
  try {
    return Boolean(localStorage.getItem(SUPABASE_SESSION_KEY));
  } catch {
    return false;
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureFreshSession = async (currentSession) => {
  if (!currentSession) return null;

  const expiresAtMs = Number(currentSession.expires_at || 0) * 1000;
  const shouldRefresh = expiresAtMs && expiresAtMs - Date.now() < 5 * 60 * 1000;

  if (!shouldRefresh) return currentSession;

  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('Session refresh skipped, keeping existing session:', error.message);
    return currentSession;
  }

  return data.session || currentSession;
};

export function AuthProvider({ children }) {
  const initCompleteRef = useRef(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [mfaLevel, setMfaLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setProfileMissing(false);
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
      setProfileMissing(false);
      return null;
    }

    setProfile(data || null);
    setProfileMissing(!data);
    return data || null;
  }, []);

  const refreshMfaLevel = useCallback(async () => {
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
  }, []);

  const hydrateAuth = useCallback(async () => {
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      const currentSession = await ensureFreshSession(data.session || null);
      const currentUser = currentSession?.user || null;

      if (currentSession && isAuthIdleExpired()) {
        await supabase.auth.signOut();
        clearAuthActivity();
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileMissing(false);
        setMfaLevel(null);
        return;
      }

      if (currentSession) {
        markAuthActivity();
      }

      setSession(currentSession);
      setUser(currentUser);

      if (currentUser?.id) {
        await Promise.all([
          loadProfile(currentUser.id),
          refreshMfaLevel(),
        ]);
      } else {
        setProfile(null);
        setProfileMissing(false);
        setMfaLevel(null);
      }
    } catch (err) {
      console.error('Auth hydrate failed:', err);
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileMissing(false);
      setMfaLevel(null);
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [loadProfile, refreshMfaLevel]);

  useEffect(() => {
    let mounted = true;
    initCompleteRef.current = false;

    async function initAuth() {
      try {
        let { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data?.session && hasPersistedSession()) {
          await wait(300);
          const retry = await supabase.auth.getSession();
          data = retry.data;
          error = retry.error;
          if (error) throw error;
        }

        if (!mounted) return;

        const nextSession = await ensureFreshSession(data?.session || null);
        const nextUser = nextSession?.user || null;

        if (nextSession && isAuthIdleExpired()) {
          await supabase.auth.signOut();
          clearAuthActivity();

          if (!mounted) return;

          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileMissing(false);
          setMfaLevel(null);
          return;
        }

        if (nextSession) {
          markAuthActivity();
        }

        setSession(nextSession);
        setUser(nextUser);

        if (nextUser?.id) {
          await Promise.all([loadProfile(nextUser.id), refreshMfaLevel()]);
        } else {
          setProfile(null);
          setProfileMissing(false);
          setMfaLevel(null);
        }
      } catch (err) {
        console.error('Auth init failed:', err);

        if (!mounted) return;

        setAuthError(err.message || 'Authentication failed');
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileMissing(false);
      } finally {
        if (mounted) {
          initCompleteRef.current = true;
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (!initCompleteRef.current && event === 'INITIAL_SESSION') {
        return;
      }

      if (!nextSession && event !== 'SIGNED_OUT' && hasPersistedSession()) {
        return;
      }

      const nextUser = nextSession?.user || null;

      if (event === 'SIGNED_OUT') {
        clearAuthActivity();
      } else if (nextSession) {
        setAuthError(null);
        markAuthActivity();
      }

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
        setProfileMissing(false);
        setMfaLevel(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile, refreshMfaLevel]);

  useEffect(() => {
    if (!session) return undefined;

    const markActive = () => markAuthActivity();
    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'visibilitychange'];

    events.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true });
    });

    const interval = window.setInterval(markActive, 60 * 1000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
      window.clearInterval(interval);
    };
  }, [session]);

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
    profileMissing,
    loading,
    authError,
    emailVerified,
    mfaLevel,
    needsMfa,
    isAuthenticated,
    refreshAuth: hydrateAuth,
    refreshMfaLevel,
    signOut: () => supabase.auth.signOut(),
  }), [session, user, profile, profileMissing, loading, authError, emailVerified, mfaLevel, needsMfa, isAuthenticated, hydrateAuth, refreshMfaLevel]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
