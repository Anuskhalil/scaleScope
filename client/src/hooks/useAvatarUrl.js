// 1. Create a reusable hook: src/hooks/useAvatarUrl.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAvatarUrl(avatarPath, expiresIn = 3600) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!avatarPath || avatarPath.startsWith('http')) {
      setSignedUrl(avatarPath);
      return;
    }

    let cancelled = false;
    const fetchUrl = async () => {
      setLoading(true);
      try {
        const cleanPath = avatarPath.replace(/^avatars\//, '');
        const { data, error } = await supabase.storage
          .from('avatars')
          .createSignedUrl(cleanPath, expiresIn);
        
        if (error) throw error;
        if (!cancelled) setSignedUrl(data?.signedUrl || null);
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