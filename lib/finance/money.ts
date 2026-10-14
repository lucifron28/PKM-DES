const MAX_MONEY_VALUE = 9_999_999_999.99;

export function parseMoneyInput(value: string, allowZero: boolean) {
  const normalized = value.trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount > MAX_MONEY_VALUE || (!allowZero && amount === 0)) return null;
  return amount;
}
