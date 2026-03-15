export const MIN_WALLET_TOP_UP_THB = 500;

export function getRequiredTopUpAmount(shortfall) {
  const normalizedShortfall = Number(shortfall || 0);
  if (!Number.isFinite(normalizedShortfall) || normalizedShortfall <= 0) {
    return 0;
  }
  return Number(Math.max(MIN_WALLET_TOP_UP_THB, normalizedShortfall).toFixed(2));
}

export function isValidWalletTopUpAmount(amount) {
  const normalizedAmount = Number(amount || 0);
  return Number.isFinite(normalizedAmount) && normalizedAmount >= MIN_WALLET_TOP_UP_THB;
}
