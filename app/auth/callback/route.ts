"use server";

import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const tokenType = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const authError = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Keep redirect on the exact incoming origin to guarantee host/cookie consistency,
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

  // Handle PKCE code exchange
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

  // Handle OTP / magiclink token hash verification
  if (tokenHash) {
    const validOtpTypes: EmailOtpType[] = ["magiclink", "email", "invite", "signup", "recovery", "email_change"];
    const type: EmailOtpType = tokenType && validOtpTypes.includes(tokenType) ? tokenType : "magiclink";

    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type
      });
      if (error) {
        setupUrl.searchParams.set("error", "verification_failed");
        return NextResponse.redirect(setupUrl);
      }
      return NextResponse.redirect(setupUrl);
    } catch {
      setupUrl.searchParams.set("error", "verification_failed");
      return NextResponse.redirect(setupUrl);
    }
  }

  // If arrived without code, token_hash, or session credentials, fail explicitly
  setupUrl.searchParams.set("error", "missing_credentials");
  return NextResponse.redirect(setupUrl);
}
