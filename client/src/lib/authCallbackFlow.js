export function authCallbackFlow(location) {
  if (location?.pathname !== '/admin') return 'pkce';
  const params = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  // Reviewer links originate on the server, without a browser PKCE verifier.
  return params.has('access_token') && params.has('refresh_token') ? 'implicit' : 'pkce';
}
