export const AUTH_IDLE_KEY = 'scalescope_auth_last_seen';
export const AUTH_IDLE_LIMIT_MS = 24 * 60 * 60 * 1000;

export const markAuthActivity = () => {
  try {
    localStorage.setItem(AUTH_IDLE_KEY, String(Date.now()));
  } catch (error) {
    console.warn('Auth activity marker failed:', error);
  }
};

export const clearAuthActivity = () => {
  try {
    localStorage.removeItem(AUTH_IDLE_KEY);
  } catch (error) {
    console.warn('Auth activity clear failed:', error);
  }
};

export const isAuthIdleExpired = () => {
  try {
    const raw = localStorage.getItem(AUTH_IDLE_KEY);
    if (!raw) return false;

    const lastSeen = Number(raw);
    return Number.isFinite(lastSeen) && Date.now() - lastSeen > AUTH_IDLE_LIMIT_MS;
  } catch {
    return false;
  }
};
