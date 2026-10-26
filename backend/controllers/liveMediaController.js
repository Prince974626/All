import {
  fetchAllIframes,
  getProviderName,
} from '../services/matchApi/index.js';

/**
 * GET /api/live-media?gmid=&sid=
 * Returns score + stream iframe URLs for the active sports provider.
 */
export const getLiveMedia = async (req, res) => {
  try {
    const gmid = req.query.gmid || req.query.gameid;
    const sid = Number(req.query.sid || req.query.sportid || 4);

    if (!gmid) {
      return res.status(400).json({
        success: false,
        message: 'gmid is required',
      });
    }

    const result = await fetchAllIframes(gmid, sid);
    const data = result?.data || result || {};

    const score_url = data.score_url || data.iframe_url || null;
    const stream_url = data.stream_url || data.url || null;

    return res.json({
      success: Boolean(score_url || stream_url),
      provider: getProviderName(),
      data: {
        score_url,
        stream_url,
        gmid: String(gmid),
        sid,
      },
    });
  } catch (error) {
    console.error('[live-media]', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch live media URLs',
    });
  }
};
