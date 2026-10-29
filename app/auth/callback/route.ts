"use server";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SETUP_CLAIM_COOKIE_NAME,
  getSetupCookieOptions,
  isSupportedSetupOtpType,
  serializeSetupClaim
} from "@/lib/auth/setup-token";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const tokenTypeParam = requestUrl.searchParams.get("type");
  const authError = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Keep all redirects on the incoming request origin to guarantee host/cookie consistency,
  // preventing cross-origin cookie loss in mobile Safari and preview environments.
  const setupUrl = new URL("/setup-account", request.url);

  // If Supabase returned an explicit error (e.g. otp_expired, access_denied)
  if (authError || errorDescription) {
    setupUrl.searchParams.set("error", authError || "auth_callback_error");
    if (errorDescription) {
      setupUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(setupUrl);
  }

  // Handle PKCE code exchange (keep compatible with OAuth/PKCE flows)
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setupUrl.searchParams.set("error", "code_exchange_failed");
        return NextResponse.redirect(setupUrl);
      }
      return NextResponse.redirect(setupUrl);
    } catch {
      setupUrl.searchParams.set("error", "code_exchange_failed");
      return NextResponse.redirect(setupUrl);
    }
  }

  // Stage A: Two-Stage Confirmation Process for emailed setup links
  // DO NOT call verifyOtp() during GET to prevent email scanners / link preview bots
  // from consuming single-use magic link tokens.
  if (tokenHash && tokenHash.trim()) {
    // Student account setup strictly requires type=magiclink
    if (!tokenTypeParam || !isSupportedSetupOtpType(tokenTypeParam)) {
      setupUrl.searchParams.set("error", "unsupported_token_type");
      return NextResponse.redirect(setupUrl, 303);
    }
    let cookieValue: string;
    try {
      cookieValue = serializeSetupClaim(tokenHash.trim(), "magiclink");
    } catch {
      // Fail closed if server-side signing secret is missing
      setupUrl.searchParams.set("error", "configuration_error");
      return NextResponse.redirect(setupUrl, 303);
    }

    // Redirect to confirmation page on the same origin with sensitive parameters removed
    const confirmUrl = new URL("/auth/confirm-setup", request.url);
    const response = NextResponse.redirect(confirmUrl, 303);

    response.cookies.set(
      SETUP_CLAIM_COOKIE_NAME,
      cookieValue,
      getSetupCookieOptions()
    );

    // Prevent caching and protect referrer
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return response;
  }

  // If arrived without code or token_hash, fail explicitly
  setupUrl.searchParams.set("error", "missing_credentials");
  return NextResponse.redirect(setupUrl);
}
