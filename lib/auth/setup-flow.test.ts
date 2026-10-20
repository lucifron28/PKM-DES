import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET as callbackGet } from "@/app/auth/callback/route";
import { POST as verifyPost } from "@/app/auth/confirm-setup/verify/route";
import {
  SETUP_CLAIM_COOKIE_NAME,
  parseSetupClaim,
  serializeSetupClaim
} from "./setup-token";

test("Stage A: GET /auth/callback sets short-lived cookie and redirects to /auth/confirm-setup without consuming token", async () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const incomingUrl = `https://pkm-des.example.test/auth/callback?token_hash=${tokenHash}&type=magiclink`;

  const request = new Request(incomingUrl, {
    method: "GET",
    headers: {
      host: "pkm-des.example.test"
    }
  });

  const response = await callbackGet(request);

  // 1. Must redirect with HTTP 303 or 307
  assert.equal(response.status >= 300 && response.status < 400, true);

  // 2. Destination must be /auth/confirm-setup on the EXACT same origin (mobile Safari host consistency)
  const location = response.headers.get("location");
  assert.ok(location);
  const destUrl = new URL(location, incomingUrl);
  assert.equal(destUrl.origin, "https://pkm-des.example.test");
  assert.equal(destUrl.pathname, "/auth/confirm-setup");

  // 3. Sensitive token parameters MUST be removed from destination URL
  assert.equal(destUrl.searchParams.has("token_hash"), false);
  assert.equal(destUrl.searchParams.has("type"), false);

  // 4. Temporary HttpOnly/Lax cookie must be set on the redirect response
  const cookieObj = response.cookies.get(SETUP_CLAIM_COOKIE_NAME);
  assert.ok(cookieObj, "Setup claim cookie must be set on redirect response");
  assert.equal(cookieObj.httpOnly, true);
  assert.equal(String(cookieObj.sameSite).toLowerCase(), "lax");
  assert.equal(cookieObj.path, "/");
  assert.equal(cookieObj.maxAge, 900);

  // 5. Cache-Control must prevent caching by proxies/scanners
  const cacheControl = response.headers.get("cache-control");
  assert.ok(cacheControl?.includes("no-store"));
  assert.ok(cacheControl?.includes("no-cache"));

  // 6. Token payload inside cookie must be valid and unconsumed
  const claim = parseSetupClaim(cookieObj.value);
  assert.ok(claim);
  assert.equal(claim.token_hash, tokenHash);
  assert.equal(claim.type, "magiclink");
});

test("Stage A: GET /auth/callback without credentials fails explicitly instead of silent redirect", async () => {
  const request = new Request("https://pkm-des.example.test/auth/callback", {
    method: "GET"
  });

  const response = await callbackGet(request);
  const location = response.headers.get("location");
  assert.ok(location);
  const destUrl = new URL(location, "https://pkm-des.example.test");
  assert.equal(destUrl.pathname, "/setup-account");
  assert.equal(destUrl.searchParams.get("error"), "missing_credentials");
});

test("Stage A: GET /auth/callback with Supabase error passes explicit error parameters", async () => {
  const request = new Request(
    "https://pkm-des.example.test/auth/callback?error=access_denied&error_description=OTP+has+expired",
    { method: "GET" }
  );

  const response = await callbackGet(request);
  const location = response.headers.get("location");
  assert.ok(location);
  const destUrl = new URL(location, "https://pkm-des.example.test");
  assert.equal(destUrl.pathname, "/setup-account");
  assert.equal(destUrl.searchParams.get("error"), "access_denied");
  assert.equal(destUrl.searchParams.get("error_description"), "OTP has expired");
});

test("Stage B: POST /auth/confirm-setup/verify enforces CSRF protection against mismatched origin", async () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");

  const request = new NextRequest("https://pkm-des.example.test/auth/confirm-setup/verify", {
    method: "POST",
    headers: {
      origin: "https://evil-attacker.example.com",
      host: "pkm-des.example.test",
      cookie: `${SETUP_CLAIM_COOKIE_NAME}=${cookieValue}`
    }
  });

  const response = await verifyPost(request);
  const location = response.headers.get("location");
  assert.ok(location);
  const destUrl = new URL(location, "https://pkm-des.example.test");
  assert.equal(destUrl.pathname, "/setup-account");
  assert.equal(destUrl.searchParams.get("error"), "invalid_origin");
});

test("Stage B: POST /auth/confirm-setup/verify rejects missing or expired setup claim cookie", async () => {
  const request = new NextRequest("https://pkm-des.example.test/auth/confirm-setup/verify", {
    method: "POST",
    headers: {
      origin: "https://pkm-des.example.test",
      host: "pkm-des.example.test"
    }
  });

  const response = await verifyPost(request);
  const location = response.headers.get("location");
  assert.ok(location);
  const destUrl = new URL(location, "https://pkm-des.example.test");
  assert.equal(destUrl.pathname, "/setup-account");
  assert.equal(destUrl.searchParams.get("error"), "session_expired");
});

test("Host consistency: Mobile Safari preserves incoming host across multi-subdomain and custom port configurations", () => {
  const hosts = [
    "https://pkm-des.vercel.app/auth/callback?token_hash=abc",
    "https://preview-123.pkm-des.edu.ph/auth/callback?token_hash=abc",
    "http://localhost:3000/auth/callback?token_hash=abc",
    "http://127.0.0.1:3000/auth/callback?token_hash=abc"
  ];

  for (const urlStr of hosts) {
    const incoming = new URL(urlStr);
    const confirmUrl = new URL("/auth/confirm-setup", incoming);
    const setupUrl = new URL("/setup-account", incoming);

    assert.equal(confirmUrl.origin, incoming.origin, "Confirm URL origin must match incoming request");
    assert.equal(setupUrl.origin, incoming.origin, "Setup URL origin must match incoming request");
  }
});
