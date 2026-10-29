export interface TrustedOriginOptions {
  appBaseUrl?: string | null;
  vercelUrl?: string | null;
  vercelProjectProductionUrl?: string | null;
  vercelBranchUrl?: string | null;
  nodeEnv?: string;
}

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Normalize a configured absolute URL or Referer value to its HTTP(S) origin. */
export function normalizeOrigin(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  try {
    const url = new URL(rawUrl.trim());
    if (!HTTP_PROTOCOLS.has(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeOriginHeader(rawOrigin: string | null): string | null {
  if (rawOrigin === null || !rawOrigin || rawOrigin !== rawOrigin.trim()) return null;

  try {
    const url = new URL(rawOrigin);
    if (
      !HTTP_PROTOCOLS.has(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeRefererHeader(rawReferer: string | null): string | null {
  if (rawReferer === null || !rawReferer || rawReferer !== rawReferer.trim()) return null;
  return normalizeOrigin(rawReferer);
}

function normalizeVercelHost(rawHost: string | null | undefined): string | null {
  if (!rawHost || typeof rawHost !== "string") return null;
  const host = rawHost.trim();
  if (!host || host.includes("://") || /[/?#@\\]/.test(host)) return null;

  try {
    const url = new URL(`https://${host}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function isLoopbackOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/** Extract Origin, using Referer only when Origin is absent. */
export function extractClientOrigin(request: Request): string | null {
  const originHeader = request.headers.get("origin");
  if (originHeader !== null) return normalizeOriginHeader(originHeader);

  const refererHeader = request.headers.get("referer");
  return normalizeRefererHeader(refererHeader);
}

/** Match a client origin against exact server-configured application origins. */
export function isTrustedOrigin(
  clientOrigin: string | null | undefined,
  options: TrustedOriginOptions = {}
): boolean {
  const normalizedClient = normalizeOrigin(clientOrigin);
  if (!normalizedClient) return false;

  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const isProduction = nodeEnv === "production";
  const appBaseUrl = options.appBaseUrl !== undefined ? options.appBaseUrl : process.env.APP_BASE_URL;
  const trustedOrigins = new Set<string>();

  function addConfiguredOrigin(origin: string | null) {
    if (!origin || (isProduction && isLoopbackOrigin(origin))) return;
    trustedOrigins.add(origin);
  }

  addConfiguredOrigin(normalizeOrigin(appBaseUrl));
  addConfiguredOrigin(
    normalizeVercelHost(
      options.vercelUrl !== undefined ? options.vercelUrl : process.env.VERCEL_URL
    )
  );
  addConfiguredOrigin(
    normalizeVercelHost(
      options.vercelBranchUrl !== undefined
        ? options.vercelBranchUrl
        : process.env.VERCEL_BRANCH_URL
    )
  );
  addConfiguredOrigin(
    normalizeVercelHost(
      options.vercelProjectProductionUrl !== undefined
        ? options.vercelProjectProductionUrl
        : process.env.VERCEL_PROJECT_PRODUCTION_URL
    )
  );

  if (trustedOrigins.has(normalizedClient)) return true;

  // A local APP_BASE_URL explicitly enables port-varying loopback origins in non-production.
  const localDevelopmentEnabled = !isProduction && isLoopbackOrigin(normalizeOrigin(appBaseUrl));
  return localDevelopmentEnabled && isLoopbackOrigin(normalizedClient);
}

/** Require same-origin POSTs and an exact match in the server-side allowlist. */
export function isTrustedRequestOrigin(
  request: Request,
  options: TrustedOriginOptions = {}
): boolean {
  const clientOrigin = extractClientOrigin(request);
  const destinationOrigin = normalizeOrigin(request.url);
  return Boolean(
    clientOrigin &&
      destinationOrigin &&
      clientOrigin === destinationOrigin &&
      isTrustedOrigin(clientOrigin, options)
  );
}
