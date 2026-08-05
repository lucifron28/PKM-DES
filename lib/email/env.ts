import "server-only";

export type EmailEnvironment = {
  fromAddress: string | undefined;
  gmailUser: string | undefined;
  gmailAppPassword: string | undefined;
  enabled: boolean;
  deliveryRequested: boolean;
  configurationError: boolean;
};

export function getEmailEnv() {
  const fromAddress = process.env.EMAIL_FROM;
  const gmailUser = process.env.GMAIL_SMTP_USER;
  const gmailAppPassword = process.env.GMAIL_SMTP_APP_PASSWORD;
  const deliveryRequested = process.env.EMAIL_DELIVERY_ENABLED === "true";
  const configurationError = deliveryRequested && (
    !fromAddress ||
    !gmailUser ||
    !gmailAppPassword ||
    !process.env.APP_BASE_URL
  );

  return {
    fromAddress,
    gmailUser,
    gmailAppPassword,
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
