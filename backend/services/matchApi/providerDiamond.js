import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Normalize Diamond nested casino payloads to exchange shape:
 *   odds:   { success, data: { mid, sub, card, ... } }
 *   result: { success, data: { res, res1 } }
 *   detail: { success, data: { t1, t2 } }
 */
function normalizeCasinoPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  // Diamond: { data: { data: payload, success, msg, status }, ... }
  const inner = raw.data;
  if (
    inner &&
    typeof inner === 'object' &&
    inner.data &&
    typeof inner.data === 'object' &&
    (inner.success === true ||
      inner.data.sub != null ||
      inner.data.mid != null ||
      inner.data.card != null ||
      inner.data.res != null ||
      inner.data.t1 != null)
  ) {
    return {
      success: inner.success ?? true,
      msg: inner.msg || 'Success',
      status: inner.status ?? 200,
      data: inner.data,
    };
  }

  if (
    raw.data &&
    (raw.data.sub != null ||
      raw.data.mid != null ||
      raw.data.res != null ||
      raw.data.t1 != null)
  ) {
    return raw;
  }

  if (raw.sub != null || raw.mid != null || raw.res != null || raw.t1 != null) {
    return { success: true, data: raw };
  }

  return raw;
}

/**
 * Diamond casino demo API — uses `gtype` (not `type`) and nested responses.
 * Select via CASINO_API_PROVIDER=providerDiamond.
 * Credentials: DIAMOND_CASINO_API_URL, DIAMOND_CASINO_API_KEY.
 */
export function createProviderDiamond() {
  const API_URL = process.env.DIAMOND_CASINO_API_URL;
  const API_KEY = process.env.DIAMOND_CASINO_API_KEY;

  const casinoParams = (gameId) => ({ key: API_KEY, gtype: gameId });

  return {
    name: 'providerDiamond',

    async fetchMatchList() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async fetchMatchData() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async getResult() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async sendBetIncoming() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async fetchCasinoTables() {
      const response = await axios.get(`${API_URL}/casino/tableid`, {
        params: { key: API_KEY },
        timeout: 10000,
      });
      return normalizeCasinoPayload(response.data);
    },

    async fetchCasinoData(gameId) {
      const response = await axios.get(`${API_URL}/casino/data`, {
        params: casinoParams(gameId),
      });
      return normalizeCasinoPayload(response.data);
    },

    async fetchCasinoResult(gameId) {
      // Diamond: /casino/lastresultsnew?key=&gType=
      const response = await axios.get(`${API_URL}/casino/lastresultsnew`, {
        params: { key: API_KEY, gType: gameId },
        timeout: 10000,
      });
      return normalizeCasinoPayload(response.data);
    },

    async fetchCasinoDetailResult(gameId, mid) {
      // Diamond: /detail_casino_results?key=&mid=&gtype=
      const response = await axios.get(`${API_URL}/detail_casino_results`, {
        params: { key: API_KEY, mid, gtype: gameId },
        timeout: 10000,
      });
      return normalizeCasinoPayload(response.data);
    },

    async fetchCasinoStream(gameId) {
      // Diamond: /casino_stream?key=&id=&key1=
      // → { stream_url, id }
      const response = await axios.get(`${API_URL}/casino_stream`, {
        params: {
          key: API_KEY,
          id: gameId,
          key1: process.env.DIAMOND_CASINO_STREAM_KEY1 || '',
        },
        timeout: 10000,
      });
      const raw = response.data || {};
      const stream_url = raw.stream_url || raw.data?.stream_url || '';
      return {
        success: Boolean(stream_url),
        data: {
          stream_url,
          id: raw.id || raw.data?.id || gameId,
        },
      };
    },

    async fetchCricketFancyResult() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async fetchCricketFancyByEvent() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async fetchStFancyByEvent() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async fetchScore() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },

    async fetchAllIframes() {
      return { success: false, message: 'Not supported by Provider Diamond' };
    },
  };
}
