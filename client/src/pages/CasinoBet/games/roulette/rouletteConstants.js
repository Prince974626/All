export const ROULETTE_CHIPS = [
  { value: 25, color: '#138cf5', label: '25' },
  { value: 50, color: '#138cf5', label: '50' },
  { value: 100, color: '#138cf5', label: '100' },
  { value: 200, color: '#00d700', label: '200' },
  { value: 500, color: '#00d700', label: '500' },
  { value: 1000, color: '#9541f9', label: '1K' },
];

export const getChipColorForAmount = (amount) => {
  const n = Number(amount) || 0;
  if (n <= 0) return ROULETTE_CHIPS[0].color;

  const exact = ROULETTE_CHIPS.find((chip) => chip.value === n);
  if (exact) return exact.color;

  const tier = [...ROULETTE_CHIPS].reverse().find((chip) => chip.value <= n);
  return tier?.color ?? ROULETTE_CHIPS[0].color;
};

/** European roulette number rows (top to bottom) */
export const ROULETTE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

/** Mobile portrait: 12 rows × 3 columns (1–36) */
export const MOBILE_ROWS = Array.from({ length: 12 }, (_, rowIdx) => [
  ROULETTE_ROWS[2][rowIdx],
  ROULETTE_ROWS[1][rowIdx],
  ROULETTE_ROWS[0][rowIdx],
]);

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const COLUMN_BETS = ['3rd Column', '2nd Column', '1st Column'];
export const MOBILE_COLUMN_BETS = [...COLUMN_BETS].reverse();
export const DOZEN_BETS = ['1st 12', '2nd 12', '3rd 12'];
export const OUTSIDE_BETS = [
  { label: '1 - 18', api: '1 to 18' },
  { label: 'Even', api: 'Even' },
  { label: 'Red', api: 'Red' },
  { label: 'Black', api: 'Black' },
  { label: 'Odd', api: 'Odd' },
  { label: '19 - 36', api: '19 to 36' },
];

export const getNumberColor = (num) => {
  if (num === 0) return 'bg-[#2e7d32]';
  if (RED_NUMBERS.has(num)) return 'bg-[#b2121f]';
  return 'bg-[#121212]';
};

export const getNumberHighlightClass = (num) => {
  if (num === 0) return 'bg-[#2e7d32]';
  if (RED_NUMBERS.has(num)) return 'bg-[#e40303]';
  return 'bg-[#404040]';
};

export const getNumberHoverClass = (num) => {
  if (num === 0) return 'hover:bg-[#2e7d32]';
  if (RED_NUMBERS.has(num)) return 'hover:bg-[#e40303]';
  return 'hover:bg-[#404040]';
};
