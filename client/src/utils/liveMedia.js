import api from '../redux/api';

/**
 * Fetch score + stream iframe URLs from backend (follows API_PROVIDER).
 * @param {string|number} gmid
 * @param {number} sid — 1=football, 2=tennis, 4=cricket
 */
export async function fetchLiveMedia(gmid, sid = 4) {
  if (!gmid) return { score_url: '', stream_url: '' };
  const { data } = await api.get('/live-media', {
    params: { gmid, sid },
  });
  return {
    score_url: data?.data?.score_url || '',
    stream_url: data?.data?.stream_url || '',
    provider: data?.provider || '',
  };
}
