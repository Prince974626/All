/**
 * Map provider `mname` values to the lock labels used on the user frontend
 * (same markets shown on CricketBet / FootballBet / TennisBet).
 */

const CRICKET_MARKET_ORDER = [
  'Match Odds',
  'Bookmaker',
  'Tied Match',
  'Bookmaker IPL CUP',
  'fancy1',
  'Normal',
  'Over By Over',
  'khado',
  'oddeven',
  'meter',
  'line',
  'ball',
];

const SOCCER_MARKET_ORDER = [
  'Match Odds',
  'Bookmaker',
  'OVER_UNDER_05',
  'OVER_UNDER_15',
  'OVER_UNDER_25',
  'OVER_UNDER_35',
];

const TENNIS_MARKET_ORDER = ['Match Odds', 'Bookmaker'];

const DISPLAY_LABELS = {
  MATCH_ODDS: 'Match Odds',
  TOURNAMENT_WINNER: 'Match Odds',
  Bookmaker: 'Bookmaker',
  'Tied Match': 'Tied Match',
  TIED_MATCH: 'Tied Match',
  'Bookmaker IPL CUP': 'Bookmaker IPL CUP',
  fancy1: 'fancy1',
  Normal: 'Normal',
  'Over By Over': 'Over By Over',
  khado: 'khado',
  oddeven: 'oddeven',
  meter: 'meter',
  line: 'line',
  ball: 'ball',
  OVER_UNDER_05: 'Over/Under 0.5',
  OVER_UNDER_15: 'Over/Under 1.5',
  OVER_UNDER_25: 'Over/Under 2.5',
  OVER_UNDER_35: 'Over/Under 3.5',
};

/** Lock name stored in DB (must match bet gameType / marketName checks) */
const LOCK_NAME_BY_MNAME = {
  MATCH_ODDS: 'Match Odds',
  TOURNAMENT_WINNER: 'Match Odds',
  Bookmaker: 'Bookmaker',
  'Tied Match': 'Tied Match',
  TIED_MATCH: 'Tied Match',
  'Bookmaker IPL CUP': 'Bookmaker IPL CUP',
  fancy1: 'fancy1',
  Normal: 'Normal',
  'Over By Over': 'Over By Over',
  khado: 'khado',
  oddeven: 'oddeven',
  meter: 'meter',
  line: 'line',
  ball: 'ball',
  OVER_UNDER_05: 'OVER_UNDER_05',
  OVER_UNDER_15: 'OVER_UNDER_15',
  OVER_UNDER_25: 'OVER_UNDER_25',
  OVER_UNDER_35: 'OVER_UNDER_35',
};

function bettingUrl(sport, gameId) {
  if (sport === 'soccer') return `/soccer/betting?gameid=${gameId}`;
  // Note: existing route is misspelled `/tannis/betting` (used by frontend)
  if (sport === 'tennis') return `/tannis/betting?gameid=${gameId}`;
  return `/cricket/betting?gameid=${gameId}`;
}

function orderList(sport) {
  if (sport === 'soccer') return SOCCER_MARKET_ORDER;
  if (sport === 'tennis') return TENNIS_MARKET_ORDER;
  return CRICKET_MARKET_ORDER;
}

/**
 * Extract available markets from raw betting API payload (same filters as frontend).
 * @returns {{ lockName: string, label: string }[]}
 */
function unwrapBettingRows(bettingPayload) {
  if (Array.isArray(bettingPayload)) return bettingPayload;
  if (Array.isArray(bettingPayload?.data)) return bettingPayload.data;
  if (Array.isArray(bettingPayload?.data?.data)) return bettingPayload.data.data;
  if (Array.isArray(bettingPayload?.data?.data?.data)) {
    return bettingPayload.data.data.data;
  }
  return [];
}

export function extractAvailableMarkets(sport, bettingPayload) {
  const rows = unwrapBettingRows(bettingPayload);

  const found = new Map(); // lockName → label

  for (const item of rows) {
    const mname = String(item?.mname || '').trim();
    if (!mname) continue;
    // Only markets our frontend knows how to show
    const lockName = LOCK_NAME_BY_MNAME[mname];
    if (!lockName) continue;
    // Require at least one section/runner when present
    if (Array.isArray(item.section) && item.section.length === 0) continue;
    const label = DISPLAY_LABELS[mname] || lockName;
    if (!found.has(lockName)) found.set(lockName, label);
  }

  const order = orderList(sport);
  const ordered = [];
  for (const key of order) {
    // order list uses lock names OR mnames that map to lock names
    const lockName = LOCK_NAME_BY_MNAME[key] || key;
    if (found.has(lockName)) {
      ordered.push({ lockName, label: found.get(lockName) });
      found.delete(lockName);
    }
  }
  // Any remaining known markets not in preferred order
  for (const [lockName, label] of found) {
    ordered.push({ lockName, label });
  }
  return ordered;
}

export function getBettingUrl(sport, gameId) {
  return bettingUrl(sport, gameId);
}

export function fallbackMarkets(sport) {
  if (sport === 'soccer') {
    return [{ lockName: 'Match Odds', label: 'Match Odds' }];
  }
  if (sport === 'tennis') {
    return [{ lockName: 'Match Odds', label: 'Match Odds' }];
  }
  return [
    { lockName: 'Match Odds', label: 'Match Odds' },
    { lockName: 'Bookmaker', label: 'Bookmaker' },
    { lockName: 'Normal', label: 'Normal' },
  ];
}
