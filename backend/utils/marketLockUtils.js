import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const casinoCategoryMap = require('./casinoCategoryMap.json');

const FANCY_TOKENS = new Set([
  'fancy',
  'normal',
  'meter',
  'line',
  'ball',
  'khado',
  'overbyover',
  'fancy1',
  'oddeven',
]);

export const LOCK_TYPES = {
  MARKET: 'market',
  SPORT: 'sport',
  CASINO: 'casino',
  CASINO_CATEGORY: 'casinoCategory',
  GGR: 'ggr',
  GGR_PROVIDER: 'ggrProvider',
};

export function normalizeMarketToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isFancyFamily(token) {
  return FANCY_TOKENS.has(token);
}

export function getCasinoCategoryForGameId(gameId) {
  const key = String(gameId || '').trim().toLowerCase();
  return casinoCategoryMap[key] || casinoCategoryMap[String(gameId || '').trim()] || '';
}

function normalizeSportName(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('cricket')) return 'cricket';
  if (raw.includes('tennis')) return 'tennis';
  if (raw.includes('soccer') || raw.includes('football')) return 'soccer';
  if (raw.includes('horse')) return 'horseracing';
  const t = normalizeMarketToken(value);
  if (t === 'football' || t === 'soccer') return 'soccer';
  if (t === 'cricket') return 'cricket';
  if (t === 'tennis') return 'tennis';
  return t;
}

/**
 * True if a stored market lock applies to this bet / launch context.
 * context may include: marketName, gameType, gameId, eventName, sport,
 * casinoCategory, ggrProvider
 */
export function marketLockApplies(
  lock,
  {
    marketName,
    gameType,
    gameId,
    eventName,
    sport,
    casinoCategory,
    ggrProvider,
  } = {}
) {
  if (!lock || lock.isLocked === false) return false;

  const lockType = String(lock.lockType || LOCK_TYPES.MARKET);

  // --- Scope locks (sports / casino / ggr) ---
  if (lockType === LOCK_TYPES.SPORT) {
    const lockedSport = normalizeSportName(lock.marketName);
    if (!lockedSport) return false;
    const betSport = normalizeSportName(
      sport || gameType || marketName || eventName
    );
    const isSportsBet = ['cricket', 'tennis', 'soccer', 'horseracing'].includes(
      betSport
    );
    if (!isSportsBet) return false;
    if (lockedSport === 'all' || lockedSport === 'allsports') return true;
    return lockedSport === betSport;
  }

  if (lockType === LOCK_TYPES.CASINO) {
    // Whole our-casino lock (not GGR) — requires casinoCategory in context
    return casinoCategory != null && casinoCategory !== '';
  }

  if (lockType === LOCK_TYPES.CASINO_CATEGORY) {
    if (casinoCategory == null || casinoCategory === '') return false;
    const lockedCat = normalizeMarketToken(lock.marketName);
    const betCat = normalizeMarketToken(
      casinoCategory || getCasinoCategoryForGameId(gameId)
    );
    if (!lockedCat || !betCat) return false;
    if (lockedCat === 'allcasino' || lockedCat === 'all') return true;
    return lockedCat === betCat;
  }

  if (lockType === LOCK_TYPES.GGR) {
    // Whole GGR casino — only when launch context includes a provider key
    return Boolean(ggrProvider);
  }

  if (lockType === LOCK_TYPES.GGR_PROVIDER) {
    if (!ggrProvider) return false;
    const lockedProv = normalizeMarketToken(lock.marketName);
    const betProv = normalizeMarketToken(ggrProvider);
    if (!lockedProv || !betProv) return false;
    if (lockedProv === 'all' || lockedProv === 'allggr') return true;
    return lockedProv === betProv;
  }

  // --- Per-match / per-market locks ---
  const lockGameId = String(lock.gameId || '').trim();
  const betGameId = String(gameId || '').trim();
  if (lockGameId && betGameId && lockGameId !== betGameId) return false;

  const lockMarket = normalizeMarketToken(lock.marketName);
  if (!lockMarket) return false;

  const betMarket = normalizeMarketToken(marketName);
  const betType = normalizeMarketToken(gameType);

  // Whole-match lock (Block Market "match" checkbox)
  if (
    lockMarket === 'all' ||
    lockMarket === 'allmarkets' ||
    lockMarket === 'match' ||
    lockMarket === 'entirematch'
  ) {
    return true;
  }

  if (lockMarket === 'fancy') {
    return isFancyFamily(betMarket) || isFancyFamily(betType);
  }
  if (isFancyFamily(lockMarket)) {
    return betType === lockMarket || betMarket === lockMarket;
  }

  if (lockMarket === 'matchodds' || lockMarket === 'tournamentwinner') {
    return (
      betMarket === 'matchodds' ||
      betType === 'matchodds' ||
      betMarket === 'tournamentwinner' ||
      betType === 'winner' ||
      betType === 'tournamentwinner'
    );
  }

  if (lockMarket.includes('bookmaker')) {
    return (
      betMarket.includes('bookmaker') || betType.includes('bookmaker')
    );
  }

  if (lockMarket === 'tiedmatch') {
    return (
      betMarket === 'tiedmatch' ||
      betType === 'tiedmatch' ||
      betMarket === 'bookmakeriplcup' ||
      betType === 'bookmakeriplcup'
    );
  }

  return (
    lockMarket === betMarket ||
    lockMarket === betType ||
    (betMarket && betMarket.includes(lockMarket)) ||
    (lockMarket && lockMarket.includes(betMarket))
  );
}

export function isUserLockedForMarket(user, context = {}) {
  if (!user) return false;
  if (user.betLock === true) return true;

  const locks = Array.isArray(user.marketLocks) ? user.marketLocks : [];
  return locks.some((lock) => marketLockApplies(lock, context));
}

/**
 * True if the user OR any upline is locked for this market/game/scope.
 * Superadmin Block Market locks are site-wide (covers demo users with no invite).
 */
export async function isUserOrUplineLockedForMarket(
  SubAdminModel,
  user,
  context = {}
) {
  if (!user || !SubAdminModel) return false;
  if (isUserLockedForMarket(user, context)) return true;

  const seenCodes = new Set();
  let walk = user;
  for (let i = 0; i < 20 && walk?.invite; i++) {
    const parent = await SubAdminModel.findOne(
      { code: walk.invite },
      { betLock: 1, marketLocks: 1, invite: 1, code: 1, role: 1 }
    ).lean();
    if (!parent) break;
    if (parent.code) seenCodes.add(String(parent.code));
    if (isUserLockedForMarket(parent, context)) return true;
    walk = parent;
  }

  const supers = await SubAdminModel.find(
    {
      role: { $in: ['supperadmin', 'superadmin'] },
      $or: [{ betLock: true }, { 'marketLocks.0': { $exists: true } }],
    },
    { betLock: 1, marketLocks: 1, code: 1 }
  ).lean();

  for (const admin of supers) {
    if (admin.code && seenCodes.has(String(admin.code))) continue;
    if (isUserLockedForMarket(admin, context)) return true;
  }

  return false;
}

export function buildMarketLockEntry({
  marketName,
  eventName = '',
  gameId = '',
  lockType = LOCK_TYPES.MARKET,
  lockedBy = null,
}) {
  return {
    marketName: String(marketName || 'Market').trim(),
    eventName: String(eventName || '').trim(),
    gameId: String(gameId || '').trim(),
    lockType: String(lockType || LOCK_TYPES.MARKET),
    isLocked: true,
    lockedAt: new Date(),
    lockedBy: lockedBy ? String(lockedBy) : null,
  };
}

/** Remove locks matching the same scope/market identity. */
export function stripMatchingMarketLocks(
  locks,
  { marketName, gameId = '', lockType = LOCK_TYPES.MARKET } = {}
) {
  const list = Array.isArray(locks) ? locks : [];
  const type = String(lockType || LOCK_TYPES.MARKET);
  const name = normalizeMarketToken(marketName);
  const gid = String(gameId || '').trim();

  return list.filter((lock) => {
    const lt = String(lock.lockType || LOCK_TYPES.MARKET);
    if (lt !== type) return true;
    if (normalizeMarketToken(lock.marketName) !== name) return true;
    if (type === LOCK_TYPES.MARKET) {
      if (String(lock.gameId || '').trim() !== gid) return true;
    }
    return false;
  });
}
