export async function safeFetch(promise, fallback = [], onError = null) {
    try {
      const result = await promise;
      return result?.data || fallback;
    } catch (error) {
      console.error('SafeFetch error:', error);
      if (onError) onError(error);
      return fallback;
    }
  }