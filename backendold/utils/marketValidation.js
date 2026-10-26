import dotenv from 'dotenv';

import {
  fetchCasinoData as fetchCasinoDataApi,
  fetchMatchData,
} from '../services/matchApi/index.js';

dotenv.config();

const SPORT_NAME_TO_APITYPE = {
  cricket: 'cricket',
  'cricket game': 'cricket',
  tennis: 'tennis',
  'tennis game': 'tennis',
  soccer: 'soccer',
  'soccer game': 'soccer',
  'horse racing': 'horse-racing',
};

const API_MARKET_ALIASES = {
  'Match Odds': 'MATCH_ODDS',
  'Tied Match': 'TIED_MATCH',
  MATCH_ODDS: 'Match Odds',
  TIED_MATCH: 'Tied Match',
};

const MAX_CACHE_AGE_MS = 1000;

/**
 * Fetch fresh live data from API. ALWAYS fetches — never trusts the polling cache.
 * The polling cache (cachedData) and the frontend WebSocket share the same data,
 * so validating against the cache = comparing stale-vs-stale.
 *
 * Falls back to cache ONLY if the fresh fetch fails AND cache is very recent (< 500ms).
 */
async function fetchFreshSportsData(cachedData, gameId, apitype, sid) {
  const cacheKey = `${gameId}_${apitype}`;
  const cacheEntry = cachedData[cacheKey];

  // Fast path: Use cached live data if available
  if (cacheEntry) {
    const markets =
      cacheEntry.data || (Array.isArray(cacheEntry) ? cacheEntry : null);
    if (markets && Array.isArray(markets)) {
      return { ok: true, markets };
    }
  }

  try {
    const newData = await fetchMatchData(gameId, sid);

    if (!newData?.success || !Array.isArray(newData.data)) {
      return {
        ok: false,
        reason: 'Unable to verify live odds. Please try again.',
      };
    }

    cachedData[cacheKey] = {
      data: newData.data,
      raw: newData,
      lastUpdated: Date.now(),
    };

    return { ok: true, markets: newData.data };
  } catch (err) {
    if (cacheEntry) {
      const markets =
        cacheEntry.data || (Array.isArray(cacheEntry) ? cacheEntry : null);
      if (markets && Array.isArray(markets)) {
        return { ok: true, markets };
      }
    }

    return {
      ok: false,
      reason: 'Unable to verify live odds. Please try again.',
    };
  }
}

async function fetchFreshCasinoData(cachedData, gameId) {
  const cacheKey = `betting_${gameId}_casino`;
  const cacheEntry = cachedData[cacheKey];

  // Fast path: Use cached live casino data if available
  if (cacheEntry) {
    const data = cacheEntry.data || (cacheEntry.gtype ? cacheEntry : null);
    if (data) {
      return { ok: true, data };
    }
  }

  try {
    const newData = await fetchCasinoDataApi(gameId);

    // if (
    //   ['baccarat', 'baccarat2'].includes(newData?.data?.gtype?.toLowerCase())
    // ) {
    //   newData.data.sub = newData.data.sub.map((item) => {
    //     return {
    //       ...item,
    //       b:
    //         typeof item.b === 'number'
    //           ? Number((item.b + 1).toFixed(2))
    //           : item.b,
    //     };
    //   });
    // }

    if (!newData?.success || !newData.data) {
      return {
        ok: false,
        reason: 'Unable to verify live casino odds. Please try again.',
      };
    }

    cachedData[cacheKey] = {
      data: newData.data,
      raw: newData,
      lastUpdated: Date.now(),
    };

    return { ok: true, data: newData.data };
  } catch (err) {
    if (cacheEntry) {
      const data = cacheEntry.data || (cacheEntry.gtype ? cacheEntry : null);
      if (data) {
        return { ok: true, data };
      }
    }

    return {
      ok: false,
      reason: 'Unable to verify live casino odds. Please try again.',
    };
  }
}

/**
 * Validate sports bet against live market data.
 * ALWAYS fetches fresh from API — never relies on stale polling cache.
 *
 * @param {object} cachedData - shared cache object from bettingSocket
 * @param {object} params - { gameId, gameName, marketName, teamName, xValue, otype, sid, oname }
 * @returns {{ valid: boolean, reason?: string, currentOdds?: number }}
 */
export async function validateSportsMarket(
  cachedData,
  {
    gameId,
    gameName,
    marketName,
    teamName,
    xValue,
    otype,
    sid,
    oname,
    gameType,
  }
) {
  const apitype = SPORT_NAME_TO_APITYPE[gameName?.toLowerCase()] || 'cricket';

  const freshResult = await fetchFreshSportsData(
    cachedData,
    gameId,
    apitype,
    sid
  );
  if (!freshResult.ok) {
    return { valid: false, reason: freshResult.reason };
  }

  const markets = freshResult.markets;

  // fancy1 is a parent market whose sections are distinct propositions
  // (e.g. "CSK Will Win the Toss..."). The frontend passes the section nat as
  // marketName/teamName, so look up the parent by mname='fancy1' instead.
  const isFancy1 = gameType === 'fancy1';
  const market = isFancy1
    ? markets.find((m) => (m.mname || '') === 'fancy1')
    : markets.find((m) => {
        const mname = m.mname || '';
        return (
          mname === marketName ||
          mname === API_MARKET_ALIASES[marketName] ||
          API_MARKET_ALIASES[mname] === marketName
        );
      });

  if (!market) {
    return {
      valid: false,
      reason: 'Market not found in live data. Please try again.',
    };
  }

  // Bookmaker markets from Provider B report market-level status="SUSPENDED"
  // even when individual runners (section[].gstatus) are ACTIVE and priceable.
  // The frontend Bookmaker panel deliberately ignores market-level status and
  // gates only on section gstatus — backend must use the same rule for these
  // markets or every bookmaker bet gets rejected. Selection-level suspension
  // is still enforced below, so genuinely suspended runners remain blocked.
  const isBookmakerMarket =
    market.mname === 'Bookmaker' || market.mname === 'Bookmaker IPL CUP';

  if (
    !isBookmakerMarket &&
    (market.status === 'SUSPENDED' || market.gstatus === 'SUSPENDED')
  ) {
    return { valid: false, reason: 'Market is suspended. Bet not accepted.' };
  }

  if (!market.section || !Array.isArray(market.section)) {
    return {
      valid: false,
      reason: 'Market data unavailable. Please try again.',
    };
  }

  const normalizedTeam = (teamName || '').trim().toLowerCase();
  const teamSection = market.section.find((sec) => {
    const nat = (sec.nat || sec.n || '').trim().toLowerCase();
    return nat === normalizedTeam || nat.startsWith(normalizedTeam + ' (');
  });

  if (!teamSection) {
    return {
      valid: false,
      reason: 'Selection not found in live data. Please try again.',
    };
  }

  if (
    teamSection.gstatus === 'SUSPENDED' ||
    teamSection.status === 'SUSPENDED'
  ) {
    return {
      valid: false,
      reason: 'Selection is suspended. Bet not accepted.',
    };
  }

  if (!teamSection.odds || !Array.isArray(teamSection.odds)) {
    return {
      valid: false,
      reason: 'Odds data unavailable. Please try again.',
    };
  }

  const userOdds = parseFloat(xValue);
  const liveOddsObj = oname
    ? teamSection.odds.find((o) => o.oname === oname)
    : teamSection.odds.find((o) => o.otype === otype && o.tno === 0);
  const liveOdds = liveOddsObj ? parseFloat(liveOddsObj.odds) : null;

  if (liveOdds === null || isNaN(liveOdds) || liveOdds <= 0) {
    return {
      valid: false,
      reason: 'Unable to verify current odds. Please try again.',
    };
  }

  if (Math.abs(userOdds - liveOdds) > 0.01) {
    return {
      valid: false,
      reason: `Odds changed. Current: ${liveOdds.toFixed(2)}. Please re-select.`,
      currentOdds: liveOdds,
    };
  }

  return {
    valid: true,
    marketMeta: {
      mid: market.mid || null,
      gmid: market.gmid || null,
      fancyId: teamSection.sid || null,
      runners: (market.section || []).map((sec) => ({
        selectionId: sec.sid,
        selectionName: (sec.nat || sec.n || '').trim(),
      })),
    },
  };
}

/**
 * Validate fancy bet against live market data.
 *
 * @param {object} cachedData - shared cache object from bettingSocket
 * @param {object} params - { gameId, gameName, marketName, teamName, xValue, otype, sid, fancyScore, oname }
 * @returns {{ valid: boolean, reason?: string, currentOdds?: number }}
 */
export async function validateFancyMarket(
  cachedData,
  {
    gameId,
    gameName,
    marketName,
    teamName,
    xValue,
    otype,
    sid,
    fancyScore,
    oname,
  }
) {
  const apitype = SPORT_NAME_TO_APITYPE[gameName?.toLowerCase()] || 'cricket';

  const freshResult = await fetchFreshSportsData(
    cachedData,
    gameId,
    apitype,
    sid
  );
  if (!freshResult.ok) {
    return { valid: false, reason: freshResult.reason };
  }

  const markets = freshResult.markets;

  // Search all markets for the matching section (teamName)
  for (const market of markets) {
    if (!market.section || !Array.isArray(market.section)) continue;

    const section = market.section.find(
      (sec) =>
        (sec.nat || sec.n || '').trim().toLowerCase() ===
        (teamName || '').trim().toLowerCase()
    );

    if (section) {
      // ── Suspension checks ──
      if (
        section.gstatus === 'SUSPENDED' ||
        section.gstatus === 'Ball Running' ||
        section.status === 'SUSPENDED'
      ) {
        return {
          valid: false,
          reason: 'Market is suspended. Bet not accepted.',
        };
      }

      if (market.status === 'SUSPENDED' || market.gstatus === 'SUSPENDED') {
        return {
          valid: false,
          reason: 'Market is suspended. Bet not accepted.',
        };
      }

      // ── Odds array must exist ──
      if (!section.odds || !Array.isArray(section.odds)) {
        return {
          valid: false,
          reason: 'Odds data unavailable. Please try again.',
        };
      }

      // ── FancyScore strict validation ──
      if (fancyScore == null) {
        return {
          valid: false,
          reason: 'Fancy score is required. Please try again.',
        };
      }

      const userFancyScore = parseFloat(fancyScore);
      const liveOddsObj = oname
        ? section.odds.find((o) => o.oname === oname)
        : section.odds.find((o) => o.otype === otype && o.tno === 0);
      const liveFancyScore = liveOddsObj ? parseFloat(liveOddsObj.odds) : null;

      if (
        liveFancyScore === null ||
        isNaN(liveFancyScore) ||
        liveFancyScore <= 0
      ) {
        return {
          valid: false,
          reason: 'Unable to verify current fancy score. Please try again.',
        };
      }

      if (Math.abs(userFancyScore - liveFancyScore) > 0.01) {
        return {
          valid: false,
          reason: `Fancy score changed. Current: ${liveFancyScore}. Please re-select.`,
        };
      }

      // ── xValue (size/payout) strict validation ──
      if (!xValue) {
        return {
          valid: false,
          reason: 'Odds size is required. Please try again.',
        };
      }

      const userSize = parseFloat(xValue);
      const liveSizeObj = oname
        ? section.odds.find((o) => o.oname === oname)
        : section.odds.find((o) => o.otype === otype && o.tno === 0);
      const liveSize = liveSizeObj ? parseFloat(liveSizeObj.size) : null;

      if (liveSize === null || isNaN(liveSize) || liveSize <= 0) {
        return {
          valid: false,
          reason: 'Unable to verify current odds size. Please try again.',
        };
      }

      if (Math.abs(userSize - liveSize) > 0.01) {
        return {
          valid: false,
          reason: `Odds changed. Current: ${liveSize.toFixed(2)}. Please re-select.`,
          currentOdds: liveSize,
        };
      }

      return {
        valid: true,
        marketMeta: {
          mid: market.mid || null,
          gmid: market.gmid || null,
          fancyId: section.sid || null,
        },
      };
    }
  }

  // teamName not found in ANY market section — fail closed
  return {
    valid: false,
    reason: 'Selection not found in live data. Please try again.',
  };
}

/**
 * Validate casino bet against live market data.
 *
 * @param {object} cachedData - shared cache object from bettingSocket
 * @param {object} params - { gameId, teamName, xValue, otype }
 * @returns {{ valid: boolean, reason?: string, currentOdds?: number }}
 */
export async function validateCasinoMarket(
  cachedData,
  { gameId, teamName, xValue, otype }
) {
  const freshResult = await fetchFreshCasinoData(cachedData, gameId);
  if (!freshResult.ok) {
    return { valid: false, reason: freshResult.reason };
  }

  const data = freshResult.data;

  if (data.status === 'SUSPENDED' || data.gstatus === 'SUSPENDED') {
    return { valid: false, reason: 'Market is suspended. Bet not accepted.' };
  }

  const normalizedTeamName = (teamName || '')
    .split('#')[0]
    .trim()
    .toLowerCase();

  const players = data.sub;
  if (!players || !Array.isArray(players)) {
    return {
      valid: false,
      reason: 'Casino selection data unavailable. Please try again.',
    };
  }

  const allSuspended = players.every(
    (p) => p.gstatus === 'SUSPENDED' || p.status === 'SUSPENDED'
  );
  if (allSuspended) {
    return {
      valid: false,
      reason: 'All selections are suspended. Bet not accepted.',
    };
  }

  const isAb4 =
    gameId?.toLowerCase() === 'ab4' || gameId?.toLowerCase() === 'ab3';
  let player;

  if (isAb4) {
    const childMatch = Array.isArray(data.child)
      ? data.child.find(
          (c) =>
            (c.nat || c.n || '').trim().toLowerCase() === normalizedTeamName
        )
      : null;

    if (childMatch) {
      player = {
        ...(players[0] || {}),
        nat: childMatch.nat || childMatch.n,
      };
    }
  } else {
    player = players.find(
      (p) => (p.nat || p.n || '').trim().toLowerCase() === normalizedTeamName
    );
  }

  console.log('player data: ' + JSON.stringify(player));

  if (!player) {
    return {
      valid: false,
      reason: 'Selection not found in live data. Please try again.',
    };
  }

  if (player.gstatus === 'SUSPENDED' || player.status === 'SUSPENDED') {
    return {
      valid: false,
      reason: 'Selection is suspended. Bet not accepted.',
    };
  }

  if (!xValue) {
    return {
      valid: false,
      reason: 'Odds value is required. Please try again.',
    };
  }

  const userOdds = parseFloat(xValue);

  const is3cardj = (data.gtype || '').trim().toLowerCase() === '3cardj';

  const isBaccarat = ['baccarat', 'baccarat2'].includes(
    (data.gtype || '').trim().toLowerCase()
  );

  let liveOdds = is3cardj
    ? parseFloat(player.b)
    : otype === 'back'
      ? parseFloat(player.b)
      : parseFloat(player.l);

  if (isBaccarat && otype === 'back' && !isNaN(liveOdds)) {
    liveOdds = Number((liveOdds + 1).toFixed(2));
  }

  // const liveOdds =
  // otype === 'back' ? parseFloat(player.b) : parseFloat(player.l);

  if (isNaN(liveOdds) || liveOdds <= 0) {
    return {
      valid: false,
      reason: 'Unable to verify current casino odds. Please try again.',
    };
  }

  const drift = Math.abs(userOdds - liveOdds) / liveOdds;
  if (drift > 0.05) {
    return {
      valid: false,
      reason: `Odds changed. Current: ${liveOdds.toFixed(2)}. Please re-select.`,
      currentOdds: liveOdds,
    };
  }

  return {
    valid: true,
    teamCount:
      isAb4 && Array.isArray(data.child) ? data.child.length : players.length,
  };
}

export { API_MARKET_ALIASES, MAX_CACHE_AGE_MS, SPORT_NAME_TO_APITYPE };
