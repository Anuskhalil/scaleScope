// 1. Create a reusable hook: src/hooks/useAvatarUrl.js
import { useState, useEffect } from 'react';
import { getSignedAvatarUrl } from '../utils/avatarStorage';

export function useAvatarUrl(avatarPath, expiresIn = 3600) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!avatarPath) {
      setSignedUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchUrl = async () => {
      setLoading(true);
      try {
        const url = await getSignedAvatarUrl(avatarPath, expiresIn);
        if (!cancelled) setSignedUrl(url || null);
      } catch (err) {
        if (!cancelled) {
          console.error('Avatar URL error:', err);
          setError(err);
          setSignedUrl(null); // Fallback to initials
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUrl();
    return () => { cancelled = true; };
  }, [avatarPath, expiresIn]);

  return { signedUrl, loading, error };
}
