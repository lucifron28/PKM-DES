import "server-only";

export type EmailEnvironment = {
  apiKey: string | undefined;
  fromAddress: string | undefined;
  enabled: boolean;
  deliveryRequested: boolean;
  configurationError: boolean;
};

export function getEmailEnv() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  const deliveryRequested = process.env.EMAIL_DELIVERY_ENABLED === "true";
  const configurationError = deliveryRequested && (!apiKey || !fromAddress || !process.env.APP_BASE_URL);

  return {
    apiKey,
    fromAddress,
    enabled: deliveryRequested && !configurationError,
    deliveryRequested,
    configurationError
  } satisfies EmailEnvironment;
}

export function getAppBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  if (!configuredUrl) {
    throw new Error("app_base_url_missing");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("app_base_url_invalid");
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    throw new Error("app_base_url_invalid");
  }

  return parsedUrl.origin;
}
