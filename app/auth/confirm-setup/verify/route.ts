import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";
import {
  SETUP_CLAIM_COOKIE_NAME,
  parseSetupClaim
} from "@/lib/auth/setup-token";

export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  const requestHost = request.headers.get("host");

  // CSRF protection: validate that request origin matches the server host
  if (requestOrigin) {
    try {
      const originHost = new URL(requestOrigin).host;
      if (originHost !== requestHost) {
        const errorUrl = new URL("/setup-account", request.url);
        errorUrl.searchParams.set("error", "invalid_origin");
        return NextResponse.redirect(errorUrl, 303);
      }
    } catch {
      const errorUrl = new URL("/setup-account", request.url);
      errorUrl.searchParams.set("error", "invalid_origin");
      return NextResponse.redirect(errorUrl, 303);
    }
  }

  // Retrieve and validate the temporary setup claim cookie
  const rawCookie = request.cookies.get(SETUP_CLAIM_COOKIE_NAME)?.value;
  const claim = parseSetupClaim(rawCookie);

  if (!claim) {
    const errorUrl = new URL("/setup-account", request.url);
    errorUrl.searchParams.set("error", "session_expired");
    return NextResponse.redirect(errorUrl, 303);
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
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
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
      return NextResponse.redirect(errorUrl, 303);
    }

    // Protect against caching
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");

    return response;
  } catch {
    response.cookies.delete(SETUP_CLAIM_COOKIE_NAME);
    const errorUrl = new URL("/setup-account", request.url);
    errorUrl.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(errorUrl, 303);
  }
}
