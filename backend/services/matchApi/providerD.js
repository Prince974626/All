import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Provider D
 * - PROVIDER_D_API_URL / PROVIDER_D_API_KEY — markets, odds, score, stream
 * - PROVIDER_D_RESULT_API_URL / PROVIDER_D_RESULT_API_KEY — bet-incoming + fancy results
 * Sport IDs: 1=football, 2=tennis, 4=cricket
 * Odds responses are often wrapped as { fetchedAt, etid, data: <payload> }.
 */

const normalizeMarketToken = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Unwrap { fetchedAt, data: ... } envelopes from this provider. */
function unwrapProviderPayload(payload) {
  let cur = payload;
  for (let i = 0; i < 3; i++) {
    if (
      cur &&
      typeof cur === 'object' &&
      !Array.isArray(cur) &&
      cur.data != null &&
      (cur.fetchedAt != null || cur.etid != null || cur.gmid != null)
    ) {
      cur = cur.data;
      continue;
    }
    break;
  }
  return cur;
}

function normalizeEsidResponse(raw) {
  const data = unwrapProviderPayload(raw);

  if (data?.success && data?.data?.t1) {
    return {
      success: true,
      msg: data.msg || 'Success',
      status: data.status ?? 200,
      data: {
        t1: data.data.t1 || [],
        t2: data.data.t2 || [],
      },
    };
  }

  if (Array.isArray(data?.body)) {
    return {
      success: true,
      msg: 'Success',
      status: 200,
      data: { t1: data.body, t2: [] },
    };
  }

  if (Array.isArray(data)) {
    return {
      success: true,
      msg: 'Success',
      status: 200,
      data: { t1: data, t2: [] },
    };
  }

  if (data?.t1 || data?.t2) {
    return {
      success: true,
      data: { t1: data.t1 || [], t2: data.t2 || [] },
    };
  }

  return {
    success: false,
    msg: 'Unexpected esid response from Provider D',
  };
}

function normalizeMatchOddsResponse(raw, gameId) {
  const data = unwrapProviderPayload(raw);

  if (data?.success && Array.isArray(data.data)) {
    return { success: true, msg: data.msg || 'Success', data: data.data };
  }

  if (Array.isArray(data)) {
    return { success: true, data };
  }

  if (data?.[String(gameId)] && Array.isArray(data[String(gameId)])) {
    return { success: true, data: data[String(gameId)] };
  }

  if (data?.data && Array.isArray(data.data)) {
    return { success: true, data: data.data };
  }

  return {
    success: false,
    msg: 'Unexpected getPriveteData response from Provider D',
    data: [],
  };
}

function etidForSport(sportId) {
  const sid = Number(sportId);
  if (sid === 1 || sid === 2 || sid === 4) return sid;
  return 4;
}

function normalizeFancyResultList(raw) {
  const data = unwrapProviderPayload(raw);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.body)) return data.body;
  if (data?.success && Array.isArray(data?.data)) return data.data;
  return [];
}

export function createProviderD() {
  const API_URL =
    process.env.PROVIDER_D_API_URL || 'https://1.81habibi.shop/api/v1';
  const API_KEY = process.env.PROVIDER_D_API_KEY || process.env.API_KEY;

  /** Bet place + fancy results (same pattern as other providers) */
  const RESULT_API_URL =
    process.env.PROVIDER_D_RESULT_API_URL ||
    process.env.RESULT_API_URL ||
    'https://ag.81habibi.shop/api/v1';
  const RESULT_API_KEY =
    process.env.PROVIDER_D_RESULT_API_KEY ||
    process.env.PROVIDER_D_API_KEY ||
    API_KEY;

  return {
    name: 'providerD',

    async fetchMatchList(sportId) {
      const sid = Number(sportId);
      const response = await axios.get(`${API_URL}/esid`, {
        params: { sid, key: API_KEY },
        timeout: 20000,
      });
      return normalizeEsidResponse(response.data);
    },

    async fetchMatchData(gameId, sportId) {
      const sid = Number(sportId);
      const response = await axios.get(`${API_URL}/getPriveteData`, {
        params: { key: API_KEY, gmid: gameId, sid },
        timeout: 20000,
      });
      return normalizeMatchOddsResponse(response.data, gameId);
    },

    async getResult(payload) {
      const { event_id, market_name } = payload;

      try {
        const response = await axios.get(
          `${RESULT_API_URL}/fancyresultbyeventid`,
          {
            params: { key: RESULT_API_KEY, eventId: String(event_id) },
            timeout: 15000,
          }
        );
        const list = normalizeFancyResultList(response.data);

        if (list.length > 0) {
          const needle = normalizeMarketToken(market_name);
          const match =
            list.find(
              (r) =>
                r.isResult &&
                r.fancyType &&
                normalizeMarketToken(r.fancyType) === needle
            ) ||
            list.find(
              (r) =>
                r.isResult &&
                r.fancyName &&
                normalizeMarketToken(r.fancyName) === needle
            );

          if (match && match.result != null) {
            return { final_result: match.result };
          }
        }
      } catch (err) {
        console.warn(
          `[ProviderD] fancyresultbyeventid failed for event ${event_id}:`,
          err.message
        );
      }

      return { final_result: null };
    },

    async sendBetIncoming(payload) {
      // Same body shape as Provider C — only host/key differ (RESULT_*).
      // AG requires market_id on fancy; it must equal fancyId (not a random id).
      let fullPayload;
      const apiSportId = String(Number(payload.sport_id) || payload.sport_id);

      if (payload.fancyId) {
        // Same fields as Provider C fancy, plus AG-required aliases:
        // - market_id must equal fancyId
        // - market_type must equal fancyType (else AG stores "Other")
        const fancyId = String(payload.fancyId);
        const fancyType = payload.fancyType || 'Normal';
        fullPayload = {
          api_key: RESULT_API_KEY,
          sport_id: apiSportId,
          sportName: payload.sportName || '',
          event_id: payload.event_id,
          beventId: payload.beventId ?? null,
          event_name: payload.event_name || '',
          fancyId,
          market_id: fancyId,
          market_name: payload.market_name || '',
          fancyType,
          market_type: fancyType,
        };
      } else {
        // Match Odds / Bookmaker / etc.: AG market_id must be provider mid
        // (passed from betController as fancymid), not the local random id.
        const beventId = payload.bevent_id ?? null;
        const mid = payload.fancymid ? String(payload.fancymid) : null;
        fullPayload = {
          api_key: RESULT_API_KEY,
          event_id: payload.event_id,
          event_name: payload.event_name,
          market_id: mid || payload.market_id,
          market_name: payload.market_name,
          market_type: payload.market_type,
          client_ref: payload.client_ref || null,
          sport_id: apiSportId,
          fancyId: null,
          fancymid: mid,
          bevent_id: beventId || null,
          runners: payload.runners || [],
        };
      }

      const response = await axios.post(
        `${RESULT_API_URL}/bet-incoming?key=${RESULT_API_KEY}`,
        fullPayload,
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      return unwrapProviderPayload(response.data) ?? response.data;
    },

    async fetchCasinoTables() {
      return { success: false, message: 'Casino not supported by Provider D' };
    },

    async fetchCasinoData() {
      return { success: false, message: 'Casino not supported by Provider D' };
    },

    async fetchCasinoResult() {
      return { success: false, message: 'Casino not supported by Provider D' };
    },

    async fetchCasinoDetailResult() {
      return { success: false, message: 'Casino not supported by Provider D' };
    },

    async fetchCasinoStream() {
      return { success: false, message: 'Casino not supported by Provider D' };
    },

    /** GET /api/v1/fancyresult — single fancy by eventId + fancyId */
    async fetchCricketFancyResult(eventId, fancyId) {
      const response = await axios.get(`${RESULT_API_URL}/fancyresult`, {
        params: {
          key: RESULT_API_KEY,
          eventId: String(eventId),
          fancyId: String(fancyId),
        },
        timeout: 15000,
      });
      return unwrapProviderPayload(response.data) ?? response.data;
    },

    /** GET /api/v1/fancyresultbyeventid — all fancies for event */
    async fetchCricketFancyByEvent(eventId) {
      const response = await axios.get(`${RESULT_API_URL}/fancyresultbyeventid`, {
        params: { key: RESULT_API_KEY, eventId: String(eventId) },
        timeout: 15000,
      });
      return unwrapProviderPayload(response.data) ?? response.data;
    },

    async fetchStFancyByEvent(eventId) {
      return this.fetchCricketFancyByEvent(eventId);
    },

    /**
     * Cricket → /scorecard/{etid}_{gmid}
     * Football/Tennis → /score-iframe/{etid}_{gmid}
     */
    async fetchScore(gmid, sid) {
      const etid = etidForSport(sid);
      const path =
        etid === 4
          ? `${API_URL}/scorecard/${etid}_${gmid}?key=${API_KEY}`
          : `${API_URL}/score-iframe/${etid}_${gmid}?key=${API_KEY}`;

      return {
        success: true,
        data: {
          score_url: path,
          iframe_url: path,
          gmid,
          etid,
        },
      };
    },

    /** Live TV stream iframe for all sports */
    async fetchAllIframes(gmid, sid = 4) {
      const etid = etidForSport(sid);
      const streamUrl = `${API_URL}/stream/${etid}_${gmid}?key=${API_KEY}`;
      const scorePath =
        etid === 4
          ? `${API_URL}/scorecard/${etid}_${gmid}?key=${API_KEY}`
          : `${API_URL}/score-iframe/${etid}_${gmid}?key=${API_KEY}`;

      return {
        success: true,
        data: {
          stream_url: streamUrl,
          score_url: scorePath,
          gmid,
          etid,
        },
      };
    },
  };
}
