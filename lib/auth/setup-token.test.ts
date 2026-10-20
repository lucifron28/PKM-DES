import assert from "node:assert/strict";
import test from "node:test";
import {
  SETUP_CLAIM_COOKIE_NAME,
  SETUP_CLAIM_COOKIE_MAX_AGE,
  getSetupCookieOptions,
  isSupportedOtpType,
  parseSetupClaim,
  serializeSetupClaim
} from "./setup-token";

process.env.ACCOUNT_CLAIM_SECRET = "test-secret-at-least-32-characters-long-for-auth";
test("supported OTP types include magiclink, email, invite, signup, recovery", () => {
  assert.equal(isSupportedOtpType("magiclink"), true);
  assert.equal(isSupportedOtpType("email"), true);
  assert.equal(isSupportedOtpType("invite"), true);
  assert.equal(isSupportedOtpType("signup"), true);
  assert.equal(isSupportedOtpType("recovery"), true);
  assert.equal(isSupportedOtpType("invalid_type"), false);
  assert.equal(isSupportedOtpType(""), false);
});

test("serializes and parses a valid setup claim cookie", () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");

  assert.ok(cookieValue.includes("."));
  const parsed = parseSetupClaim(cookieValue);

  assert.ok(parsed);
  assert.equal(parsed.token_hash, tokenHash);
  assert.equal(parsed.type, "magiclink");
  assert.ok(typeof parsed.issuedAt === "number");
});

test("rejects tampered cookie payload", () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");
  const [, signature] = cookieValue.split(".");

  // Tamper with payload
  const tamperedPayload = Buffer.from(
    JSON.stringify({ token_hash: "attacker-hash", type: "magiclink", issuedAt: Date.now() })
  ).toString("base64url");
  const tamperedCookie = `${tamperedPayload}.${signature}`;

  assert.equal(parseSetupClaim(tamperedCookie), null);
});

test("rejects tampered signature", () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");
  const [encodedPayload] = cookieValue.split(".");

  const badSignature = "invalidsignature0123456789";
  const tamperedCookie = `${encodedPayload}.${badSignature}`;

  assert.equal(parseSetupClaim(tamperedCookie), null);
});

test("rejects expired setup claim cookie", () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");

  // Parse with max age -1 to simulate expiration
  const parsed = parseSetupClaim(cookieValue, -1);
  assert.equal(parsed, null);
});

test("rejects malformed and empty cookies", () => {
  assert.equal(parseSetupClaim(null), null);
  assert.equal(parseSetupClaim(undefined), null);
  assert.equal(parseSetupClaim(""), null);
  assert.equal(parseSetupClaim("not-a-valid-token"), null);
  assert.equal(parseSetupClaim("nodotshere"), null);
  assert.equal(parseSetupClaim("a.b.c"), null);
});

test("getSigningSecret requires configured secret and fails closed without fallback", () => {
  const originalClaimSecret = process.env.ACCOUNT_CLAIM_SECRET;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.ACCOUNT_CLAIM_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    assert.throws(
      () => serializeSetupClaim("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "magiclink"),
      /Missing required server secret/
    );

    // parseSetupClaim fails closed and returns null instead of throwing or using a fallback
    assert.equal(parseSetupClaim("somepayload.somesig"), null);
  } finally {
    process.env.ACCOUNT_CLAIM_SECRET = originalClaimSecret || "test-secret-at-least-32-characters-long-for-auth";
    if (originalServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  }
});

test("getSetupCookieOptions returns secure, Lax, HttpOnly attributes", () => {
  assert.equal(SETUP_CLAIM_COOKIE_NAME, "pkm_setup_claim");
  const options = getSetupCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, SETUP_CLAIM_COOKIE_MAX_AGE);
  assert.equal(typeof options.secure, "boolean");
});
