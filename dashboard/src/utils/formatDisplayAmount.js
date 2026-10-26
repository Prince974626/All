/** Show amounts without a leading minus; use color for sign. */
export const formatAbsDisplayValue = (value, decimals = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? '';
  if (decimals == null) return String(Math.abs(n));
  return Math.abs(n).toFixed(decimals);
};
