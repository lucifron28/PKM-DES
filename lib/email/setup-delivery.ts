export const SETUP_EMAIL_DELIVERY_COOLDOWN_MS = 5 * 60 * 1000;

export function isSetupEmailDeliveryAllowed(lastSentAt: string | null, now = new Date()) {
  if (!lastSentAt) return true;

  const lastSentTime = Date.parse(lastSentAt);
  if (Number.isNaN(lastSentTime)) return false;

  return now.getTime() - lastSentTime >= SETUP_EMAIL_DELIVERY_COOLDOWN_MS;
}
