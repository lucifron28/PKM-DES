import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";
import {
  SETUP_CLAIM_COOKIE_NAME,
  parseSetupClaim
} from "@/lib/auth/setup-token";

function buildErrorResponse(errorUrl: URL): NextResponse {
  const res = NextResponse.redirect(errorUrl, 303);
  res.cookies.delete(SETUP_CLAIM_COOKIE_NAME);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  const requestReferer = request.headers.get("referer");

  // Determine trusted origins: request.nextUrl.origin, request.url origin, and forwarded headers
  const trustedOrigins = new Set<string>();
  try {
    trustedOrigins.add(new URL(request.url).origin);
  } catch {
    // ignore
  }
  if (request.nextUrl) {
    trustedOrigins.add(request.nextUrl.origin);
  }
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (forwardedProto && forwardedHost) {
    trustedOrigins.add(`${forwardedProto}://${forwardedHost}`);
  }

  // Determine actual client origin from Origin or Referer header
  let clientOrigin: string | null = null;
  if (requestOrigin) {
    try {
      clientOrigin = new URL(requestOrigin).origin;
    } catch {
      const errorUrl = new URL("/setup-account", request.url);
      errorUrl.searchParams.set("error", "invalid_origin");
      return buildErrorResponse(errorUrl);
    }
  } else if (requestReferer) {
    try {
      clientOrigin = new URL(requestReferer).origin;
    } catch {
      const errorUrl = new URL("/setup-account", request.url);
      errorUrl.searchParams.set("error", "invalid_origin");
      return buildErrorResponse(errorUrl);
    }
  }

  // CSRF protection: fail closed if origin/referer is missing or does not match trusted origins
  if (!clientOrigin || !trustedOrigins.has(clientOrigin)) {
    const errorUrl = new URL("/setup-account", request.url);
    errorUrl.searchParams.set("error", "invalid_origin");
    return buildErrorResponse(errorUrl);
  }

  // Retrieve and validate the temporary setup claim cookie
  const rawCookie = request.cookies.get(SETUP_CLAIM_COOKIE_NAME)?.value;
  const claim = parseSetupClaim(rawCookie);

  if (!claim) {
    const errorUrl = new URL("/setup-account", request.url);
    errorUrl.searchParams.set("error", "session_expired");
    return buildErrorResponse(errorUrl);
  }

  // Prepare destination redirect (HTTP 303 See Other ensures browser uses GET)
  const setupUrl = new URL("/setup-account", request.url);
  const response = NextResponse.redirect(setupUrl, 303);

  // Initialize Supabase SSR client to write session cookies directly to the redirect response
  const { url, anonKey } = getSupabaseBrowserEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  try {
    // Stage B: Explicit confirmation calls verifyOtp server-side only upon user POST
    const { error } = await supabase.auth.verifyOtp({
      token_hash: claim.token_hash,
      type: claim.type
    });

    // Always clear the temporary verification cookie
    response.cookies.delete(SETUP_CLAIM_COOKIE_NAME);

    if (error) {
      const errorUrl = new URL("/setup-account", request.url);
      errorUrl.searchParams.set("error", "verification_failed");
      return buildErrorResponse(errorUrl);
    }

    // Protect against caching
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");

    return response;
  } catch {
    const errorUrl = new URL("/setup-account", request.url);
    errorUrl.searchParams.set("error", "verification_failed");
    return buildErrorResponse(errorUrl);
  }
}
