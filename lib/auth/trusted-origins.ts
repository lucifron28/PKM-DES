export interface TrustedOriginOptions {
  appBaseUrl?: string | null;
  vercelUrl?: string | null;
  vercelProjectProductionUrl?: string | null;
  vercelBranchUrl?: string | null;
  nextPublicVercelUrl?: string | null;
  nodeEnv?: string;
  isVercel?: boolean;
  projectSlug?: string;
}

/**
 * Normalizes an origin string by parsing as a URL and extracting .origin.
 * Rejects invalid URLs, credentials, and non-http(s) schemes.
 */
export function normalizeOrigin(rawOrigin: string | null | undefined): string | null {
  if (!rawOrigin || typeof rawOrigin !== "string") {
    return null;
  }

  const trimmed = rawOrigin.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    // Reject userinfo/credentials in origin
    if (url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Extracts and normalizes the client origin from a request's Origin or Referer header.
 * Rejects missing, malformed, or invalid headers by returning null.
 */
export function extractClientOrigin(request: Request): string | null {
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    return normalizeOrigin(originHeader);
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    return normalizeOrigin(refererHeader);
  }

  return null;
}

/**
 * Evaluates whether a client origin is explicitly trusted.
 *
 * Rules:
 * 1. Matches configured APP_BASE_URL origin.
 * 2. Matches configured Vercel deployment variables (VERCEL_URL, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_BRANCH_URL).
 * 3. In non-production environments (or if APP_BASE_URL points to localhost), permits http://localhost:* and http://127.0.0.1:*.
 * 4. In Vercel environments, permits project-specific preview subdomains matching https://<project>-*.vercel.app.
 * 5. NEVER trusts arbitrary client-supplied forwarded headers (x-forwarded-host, x-forwarded-proto).
 * 6. Fails closed if configuration is missing, malformed, or untrusted.
 */
export function isTrustedOrigin(
  clientOrigin: string | null | undefined,
  options: TrustedOriginOptions = {}
): boolean {
  const normalizedClient = normalizeOrigin(clientOrigin);
  if (!normalizedClient) {
    return false;
  }

  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const isProd = nodeEnv === "production";

  // Build the set of explicitly trusted origins
  const trustedSet = new Set<string>();

  // 1. Configured APP_BASE_URL
  const appBaseUrl =
    options.appBaseUrl !== undefined ? options.appBaseUrl : process.env.APP_BASE_URL;
  if (appBaseUrl) {
    const normalizedAppBase = normalizeOrigin(appBaseUrl);
    if (normalizedAppBase) {
      trustedSet.add(normalizedAppBase);
    }
  }

  // 2. Verified Vercel environment variables
  const vercelProjectProductionUrl =
    options.vercelProjectProductionUrl !== undefined
      ? options.vercelProjectProductionUrl
      : process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProjectProductionUrl) {
    const norm = normalizeOrigin(`https://${vercelProjectProductionUrl.trim()}`);
    if (norm) trustedSet.add(norm);
  }

  const vercelUrl =
    options.vercelUrl !== undefined ? options.vercelUrl : process.env.VERCEL_URL;
  if (vercelUrl) {
    const norm = normalizeOrigin(`https://${vercelUrl.trim()}`);
    if (norm) trustedSet.add(norm);
  }

  const vercelBranchUrl =
    options.vercelBranchUrl !== undefined
      ? options.vercelBranchUrl
      : process.env.VERCEL_BRANCH_URL;
  if (vercelBranchUrl) {
    const norm = normalizeOrigin(`https://${vercelBranchUrl.trim()}`);
    if (norm) trustedSet.add(norm);
  }

  const nextPublicVercelUrl =
    options.nextPublicVercelUrl !== undefined
      ? options.nextPublicVercelUrl
      : process.env.NEXT_PUBLIC_VERCEL_URL;
  if (nextPublicVercelUrl) {
    const norm = normalizeOrigin(`https://${nextPublicVercelUrl.trim()}`);
    if (norm) trustedSet.add(norm);
  }

  // Check exact match against explicit trusted set
  if (trustedSet.has(normalizedClient)) {
    return true;
  }

  // 3. Localhost / 127.0.0.1 development
  // Allowed in non-production, OR if APP_BASE_URL itself was explicitly configured to localhost/127.0.0.1
  const appBaseIsLocal = Boolean(
    appBaseUrl && (appBaseUrl.includes("localhost") || appBaseUrl.includes("127.0.0.1"))
  );
  if (!isProd || appBaseIsLocal) {
    try {
      const parsed = new URL(normalizedClient);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return true;
      }
    } catch {
      // ignore
    }
  }

  // 4. Authorized Vercel preview deployments (matching project subdomain prefix on vercel.app)
  const isVercel =
    options.isVercel !== undefined
      ? options.isVercel
      : Boolean(process.env.VERCEL === "1" || process.env.VERCEL_ENV);
  const vercelEnv = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV;

  if (isVercel || vercelEnv === "preview") {
    try {
      const parsed = new URL(normalizedClient);
      if (parsed.protocol === "https:" && parsed.hostname.endsWith(".vercel.app")) {
        const projectSlug = (options.projectSlug || "pkm-des").toLowerCase();
        const hostPrefix = parsed.hostname.slice(0, -".vercel.app".length).toLowerCase();
        if (hostPrefix === projectSlug || hostPrefix.startsWith(`${projectSlug}-`)) {
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
}
