// Retry only explicit authentication rejection, never mutation/network failures.
export async function reviewRequest(auth, fetcher, url, body) {
  const session = await auth.getSession();
  if (session.error || !session.data.session?.access_token) throw new Error('Please sign in again to check your review status.');
  const send = token => fetcher(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  let response;
  try {
    response = await send(session.data.session.access_token);
    if (response.status === 401) {
      const refreshed = await auth.refreshSession();
      if (refreshed.error || !refreshed.data.session?.access_token) throw new Error('Please sign in again to check your review status.');
      response = await send(refreshed.data.session.access_token);
    }
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Cannot reach the review service. Check your connection and backend server.');
    throw error;
  }
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('Please sign in again to check your review status.');
    if (response.status === 429) throw new Error('Too many requests. Please wait a minute before checking again.');
    throw new Error(value.error || `Review service unavailable (HTTP ${response.status}).`);
  }
  return value.data;
}
