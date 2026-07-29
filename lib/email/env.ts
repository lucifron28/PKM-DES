export function getEmailEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  const enabled = process.env.EMAIL_DELIVERY_ENABLED === "true";

  if (enabled && (!apiKey || !fromAddress)) {
    throw new Error("Email delivery is enabled but RESEND_API_KEY or EMAIL_FROM is missing.");
  }

  return {
    apiKey,
    fromAddress,
    enabled,
  };
}
