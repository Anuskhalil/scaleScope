import { supabase } from '../lib/supabaseClient';

const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

export function getAvatarStoragePath(value) {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const decodedPath = decodeURIComponent(url.pathname);
      const marker = '/avatars/';
      const markerIndex = decodedPath.indexOf(marker);

      if (markerIndex >= 0) {
        return decodedPath.slice(markerIndex + marker.length).replace(/^\/+/, '');
      }

      return raw;
    } catch {
      return raw;
    }
  }

  return raw.replace(/^\/+/, '');
}

function getAvatarPathAttempts(value) {
  const path = getAvatarStoragePath(value);
  if (!path || /^https?:\/\//i.test(path)) return [];

  const attempts = [path];

  if (path.startsWith('avatars/')) {
    attempts.push(path.replace(/^avatars\//, ''));
  } else {
    attempts.push(`avatars/${path}`);
  }

  return [...new Set(attempts.filter(Boolean))];
}

export async function getSignedAvatarUrl(value, expiresIn = 3600) {
  if (!value) return '';

  const raw = String(value).trim();
  const attempts = getAvatarPathAttempts(raw);

  if (!attempts.length) {
    return /^https?:\/\//i.test(raw) ? raw : '';
  }

  const cacheKey = `avatar:${attempts.join('|')}`;
  const cached = AVATAR_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;

  for (const path of attempts) {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, expiresIn);

    if (!error && data?.signedUrl) {
      AVATAR_CACHE.set(cacheKey, { url: data.signedUrl, ts: Date.now() });
      return data.signedUrl;
    }
  }

  return /^https?:\/\//i.test(raw) ? raw : '';
}

export async function uploadRoleAvatar({ roleFolder, userId, file }) {
  if (!roleFolder) throw new Error('roleFolder is required');
  if (!userId) throw new Error('userId is required');
  if (!file) throw new Error('file is required');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${roleFolder}/${userId}/avatar.${safeExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  AVATAR_CACHE.delete(`avatar:${path}|avatars/${path}`);
  const signedUrl = await getSignedAvatarUrl(path, 60 * 60 * 24);

  return { path, signedUrl };
}
