import {
  COLUMN_BETS,
  DOZEN_BETS,
  RED_NUMBERS,
  ROULETTE_ROWS,
} from './rouletteConstants';

const range = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const normalizeRouletteItem = (item) => {
  if (!item) return null;
  const nat = String(item.nat ?? item.n ?? '').trim();
  const suspended = item.s === 0;
  return {
    sid: item.sid ?? item.i,
    nat,
    s: item.s,
    b: Number(item.b),
    l: Number(item.l),
    gstatus: suspended ? 'SUSPENDED' : 'ACTIVE',
    min: item.min,
    max: item.max,
  };
};

/** When API sends duplicate nats, keep the active (s === 1) straight/split entry. */
const preferRouletteItem = (existing, incoming) => {
  if (!existing) return incoming;
  if (existing.s === 1 && incoming.s === 0) return existing;
  if (existing.s === 0 && incoming.s === 1) return incoming;
  return (existing.sid ?? 0) <= (incoming.sid ?? 0) ? existing : incoming;
};

const setIndexItem = (map, key, item) => {
  map.set(key, preferRouletteItem(map.get(key), item));
};

export const buildRouletteBetIndex = (sub = []) => {
  const byNat = new Map();
  const byNumberSet = new Map();

  sub.forEach((raw) => {
    const item = normalizeRouletteItem(raw);
    if (!item?.nat) return;
    setIndexItem(byNat, item.nat, item);
    setIndexItem(byNat, item.nat.toLowerCase(), item);

    const nums = parseNumberList(item.nat);
    if (nums.length) {
      setIndexItem(byNumberSet, nums.join(','), item);
    }
  });

  return {
    byNat,
    byNumberSet,
    items: sub.map(normalizeRouletteItem).filter(Boolean),
  };
};

/** Only comma-separated integers (e.g. "1", "0,1,2") — not "1 to 18" or "2nd Column". */
export const parseNumberList = (value) => {
  const str = String(value ?? '').trim();
  if (!str) return [];

  const nums = [];
  for (const part of str.split(',')) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) return [];
    nums.push(parseInt(trimmed, 10));
  }

  return nums.sort((a, b) => a - b);
};

export const findBetByNumbers = (index, numbers) => {
  if (!index || !numbers?.length) return null;
  const key = [...numbers].sort((a, b) => a - b).join(',');
  return index.byNumberSet.get(key) || null;
};

export const findBetByNat = (index, nat) => {
  if (!index || !nat) return null;
  return (
    index.byNat.get(nat) || index.byNat.get(String(nat).toLowerCase()) || null
  );
};

export const isItemSuspended = (item) => item?.s === 0;

export const isNumberSuspended = (index, num) =>
  isItemSuspended(findBetByNumbers(index, [num]));

/** Drop individually suspended numbers from a multi-number zone. */
export const getActiveNumbers = (index, numbers) => {
  if (!numbers?.length) return [];
  return numbers.filter((n) => !isNumberSuspended(index, n));
};

/**
 * For corner/street/split zones: place on the active subset when 2+ numbers remain.
 * Returns null when fewer than 2 active numbers or no matching open market exists.
 */
export const resolveMultiNumberBet = (index, numbers) => {
  const active = getActiveNumbers(index, numbers);
  if (active.length < 2) return null;
  const item = findBetByNumbers(index, active);
  if (!item || isItemSuspended(item)) return null;
  return { numbers: active, item };
};

export const isMultiBetZoneDisabled = (index, numbers) =>
  !resolveMultiNumberBet(index, numbers);

export const isGameSuspended = (bettingData) => {
  const sub = bettingData?.sub;
  if (!sub?.length) return true;
  return sub.every((p) => p.s === 0);
};

export const parseRouletteResultNumber = (card) => {
  const trimmed = String(card ?? '').trim();
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  return Number.isInteger(num) && num >= 0 && num <= 36 ? num : null;
};

/** Build corner bet keys for each internal grid intersection */
export const getCornerNumbers = (row, col) => {
  if (row < 1 || col < 1 || row > 2 || col > 11) return null;
  return [
    ROULETTE_ROWS[row][col],
    ROULETTE_ROWS[row][col - 1],
    ROULETTE_ROWS[row - 1][col],
    ROULETTE_ROWS[row - 1][col - 1],
  ];
};

export const getHorizontalSplitNumbers = (row, col) => {
  if (col < 1 || col > 11) return null;
  return [ROULETTE_ROWS[row][col - 1], ROULETTE_ROWS[row][col]];
};

export const getVerticalSplitNumbers = (row, col) => {
  if (row > 1) return null;
  return [ROULETTE_ROWS[row][col], ROULETTE_ROWS[row + 1][col]];
};

export const getStreetNumbers = (col) => {
  if (col < 0 || col > 11) return null;
  return [ROULETTE_ROWS[2][col], ROULETTE_ROWS[1][col], ROULETTE_ROWS[0][col]];
};

const getMobileCellNumber = (mobileRow, mobileCol) =>
  ROULETTE_ROWS[2 - mobileCol][mobileRow];

export const getMobileCornerNumbers = (mobileRow, mobileCol) => {
  if (mobileRow < 1 || mobileCol < 1) return null;
  return [
    getMobileCellNumber(mobileRow, mobileCol),
    getMobileCellNumber(mobileRow, mobileCol - 1),
    getMobileCellNumber(mobileRow - 1, mobileCol),
    getMobileCellNumber(mobileRow - 1, mobileCol - 1),
  ];
};

export const getMobileHorizontalSplitNumbers = (mobileRow, mobileCol) => {
  if (mobileCol < 1) return null;
  return [
    getMobileCellNumber(mobileRow, mobileCol - 1),
    getMobileCellNumber(mobileRow, mobileCol),
  ];
};

export const getMobileVerticalSplitNumbers = (mobileRow, mobileCol) => {
  if (mobileRow < 1) return null;
  return [
    getMobileCellNumber(mobileRow - 1, mobileCol),
    getMobileCellNumber(mobileRow, mobileCol),
  ];
};

export const getMobileStreetNumbers = (mobileRow) => {
  if (mobileRow < 0 || mobileRow > 11) return null;
  return [
    getMobileCellNumber(mobileRow, 0),
    getMobileCellNumber(mobileRow, 1),
    getMobileCellNumber(mobileRow, 2),
  ];
};

/** Numbers covered by an outside/column/dozen bet nat string */
export const getNumbersForNat = (nat) => {
  const key = String(nat ?? '')
    .trim()
    .toLowerCase();
  if (!key) return new Set();

  const colIdx = COLUMN_BETS.findIndex((b) => b.toLowerCase() === key);
  if (colIdx >= 0) return new Set(ROULETTE_ROWS[colIdx]);

  const dozenIdx = DOZEN_BETS.findIndex((b) => b.toLowerCase() === key);
  if (dozenIdx === 0) return new Set(range(1, 12));
  if (dozenIdx === 1) return new Set(range(13, 24));
  if (dozenIdx === 2) return new Set(range(25, 36));

  if (key === '1 to 18') return new Set(range(1, 18));
  if (key === '19 to 36') return new Set(range(19, 36));
  if (key === 'even') return new Set(range(1, 36).filter((n) => n % 2 === 0));
  if (key === 'odd') return new Set(range(1, 36).filter((n) => n % 2 === 1));
  if (key === 'red') return new Set(RED_NUMBERS);
  if (key === 'black')
    return new Set(range(1, 36).filter((n) => !RED_NUMBERS.has(n)));

  return new Set();
};

/** Number of positions covered by a roulette bet nat (for teamCount payload). */
export const getTeamCountForNat = (nat) => {
  const numbers = parseNumberList(nat);
  if (numbers.length) return numbers.length;

  const covered = getNumbersForNat(nat);
  if (covered.size) return covered.size;

  return 1;
};

export const getChipTotalForNat = (pendingBetAmounts, nat) => {
  if (!Array.isArray(pendingBetAmounts) || !nat) return 0;
  const normalized = String(nat).toLowerCase();
  let total = 0;

  for (const bet of pendingBetAmounts) {
    const details = Array.isArray(bet.details) ? bet.details : [];
    const detailTotal = details.reduce((sum, detail) => {
      if (String(detail.teamName || '').toLowerCase() !== normalized)
        return sum;
      return sum + Math.abs(Number(detail.price || 0));
    }, 0);

    if (detailTotal > 0) {
      total += detailTotal;
      continue;
    }

    if (String(bet.teamName || '').toLowerCase() === normalized) {
      total += Math.abs(Number(bet.totalPrice || bet.price || bet.netBet || 0));
    }
  }

  return total;
};

export const formatChipAmount = (amount) => {
  const n = Number(amount) || 0;
  if (n >= 1000) return `${n / 1000}K`;
  return String(n);
};
