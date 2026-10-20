import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailOtpType } from "@supabase/supabase-js";

export const SETUP_CLAIM_COOKIE_NAME = "pkm_setup_claim";
export const SETUP_CLAIM_COOKIE_MAX_AGE = 15 * 60; // 15 minutes

export type SetupClaimPayload = {
  token_hash: string;
  type: EmailOtpType;
  issuedAt: number;
};

const VALID_EMAIL_OTP_TYPES: readonly EmailOtpType[] = Object.freeze([
  "magiclink",
  "email",
  "invite",
  "signup",
  "recovery",
  "email_change"
]);

export function isSupportedOtpType(type: string): type is EmailOtpType {
  return VALID_EMAIL_OTP_TYPES.includes(type as EmailOtpType);
}

function getSigningSecret(): string {
  const secret =
    process.env.ACCOUNT_CLAIM_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "pkm-des-setup-cookie-signing-key";
  return secret;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function serializeSetupClaim(
  tokenHash: string,
  type: EmailOtpType = "magiclink"
): string {
  const payload: SetupClaimPayload = {
    token_hash: tokenHash,
    type,
    issuedAt: Date.now()
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload, getSigningSecret());
  return `${encodedPayload}.${signature}`;
}

export function parseSetupClaim(
  cookieValue: string | null | undefined,
  maxAgeSeconds: number = SETUP_CLAIM_COOKIE_MAX_AGE
): SetupClaimPayload | null {
  if (!cookieValue || typeof cookieValue !== "string") {
    return null;
  }

  const parts = cookieValue.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, receivedSignature] = parts;
  if (!encodedPayload || !receivedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, getSigningSecret());
  const receivedBuf = Buffer.from(receivedSignature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (
    receivedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const raw = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as unknown;

    if (
      !raw ||
      typeof raw !== "object" ||
      typeof (raw as SetupClaimPayload).token_hash !== "string" ||
      !(raw as SetupClaimPayload).token_hash.trim() ||
      typeof (raw as SetupClaimPayload).type !== "string" ||
      !isSupportedOtpType((raw as SetupClaimPayload).type) ||
      typeof (raw as SetupClaimPayload).issuedAt !== "number"
    ) {
      return null;
    }

    const payload = raw as SetupClaimPayload;
    const now = Date.now();
    const ageSeconds = (now - payload.issuedAt) / 1000;

    // Allow 30 seconds clock tolerance
    if (ageSeconds < -30 || ageSeconds > maxAgeSeconds) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSetupCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SETUP_CLAIM_COOKIE_MAX_AGE
  };
}
