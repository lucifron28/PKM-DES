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

process.env.APP_BASE_URL = "https://pkm-des.example.test";
process.env.ACCOUNT_CLAIM_SECRET = "test-secret-at-least-32-characters-long-for-auth";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://pkm-des.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
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

test("Stage A: GET /auth/callback with unsupported or missing OTP type is rejected", async () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  // 1. type=email is rejected
  const reqEmail = new Request(
    `https://pkm-des.example.test/auth/callback?token_hash=${tokenHash}&type=email`,
    { method: "GET" }
  );
  const resEmail = await callbackGet(reqEmail);
  const destEmail = new URL(resEmail.headers.get("location")!, "https://pkm-des.example.test");
  assert.equal(destEmail.pathname, "/setup-account");
  assert.equal(destEmail.searchParams.get("error"), "unsupported_token_type");

  // 2. missing type is rejected
  const reqNoType = new Request(
    `https://pkm-des.example.test/auth/callback?token_hash=${tokenHash}`,
    { method: "GET" }
  );
  const resNoType = await callbackGet(reqNoType);
  const destNoType = new URL(resNoType.headers.get("location")!, "https://pkm-des.example.test");
  assert.equal(destNoType.pathname, "/setup-account");
  assert.equal(destNoType.searchParams.get("error"), "unsupported_token_type");
});

test("Stage B: POST /auth/confirm-setup/verify successfully verifies OTP, establishes session cookies, clears temp cookie, and redirects to /setup-account", async () => {
  const originalFetch = globalThis.fetch;
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");

  // Mock Supabase Auth /auth/v1/verify endpoint
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (urlStr.includes("/auth/v1/verify")) {
      return new Response(
        JSON.stringify({
          access_token: "mock-valid-access-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-valid-refresh-token",
          user: {
            id: "student-uuid-1234",
            aud: "authenticated",
            role: "authenticated",
            email: "student.test@example.com",
            app_metadata: { provider: "email" },
            user_metadata: {},
            created_at: "2026-10-20T00:00:00.000Z",
            updated_at: "2026-10-20T00:00:00.000Z"
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    return originalFetch(input, init);
  };

  try {
    const request = new NextRequest("https://pkm-des.example.test/auth/confirm-setup/verify", {
      method: "POST",
      headers: {
        origin: "https://pkm-des.example.test",
        host: "pkm-des.example.test",
        cookie: `${SETUP_CLAIM_COOKIE_NAME}=${cookieValue}`
      }
    });

    const response = await verifyPost(request);

    // 1. Must redirect with HTTP 303 See Other
    assert.equal(response.status, 303);

    // 2. Redirect destination must be /setup-account with NO error query parameters
    const location = response.headers.get("location");
    assert.ok(location);
    const destUrl = new URL(location, "https://pkm-des.example.test");
    assert.equal(destUrl.origin, "https://pkm-des.example.test");
    assert.equal(destUrl.pathname, "/setup-account");
    assert.equal(destUrl.searchParams.has("error"), false, "Successful verification must not have error param");

    // 3. Supabase session cookies must be written to response
    const allCookies = response.cookies.getAll();
    const hasSessionCookie = allCookies.some((c) => c.name.includes("auth-token") || c.name.includes("sb-"));
    assert.ok(hasSessionCookie, "Supabase auth session cookie must be established on response");

    // 4. Temporary setup claim cookie MUST be deleted on the response
    const deletedClaimCookie = response.cookies.get(SETUP_CLAIM_COOKIE_NAME);
    assert.ok(
      deletedClaimCookie === undefined ||
      deletedClaimCookie.maxAge === 0 ||
      deletedClaimCookie.value === "" ||
      new Date(deletedClaimCookie.expires || 0).getTime() <= Date.now(),
      "Temporary setup claim cookie must be deleted"
    );

    // 5. Cache-Control must prevent caching
    const cacheControl = response.headers.get("cache-control");
    assert.ok(cacheControl?.includes("no-store"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Stage B: POST /auth/confirm-setup/verify deletes temp claim cookie even when OTP verification fails", async () => {
  const originalFetch = globalThis.fetch;
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");

  // Mock Supabase Auth rejecting the token
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (urlStr.includes("/auth/v1/verify")) {
      return new Response(
        JSON.stringify({
          error: "otp_expired",
          error_description: "Token has expired or is invalid"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    return originalFetch(input, init);
  };

  try {
    const request = new NextRequest("https://pkm-des.example.test/auth/confirm-setup/verify", {
      method: "POST",
      headers: {
        origin: "https://pkm-des.example.test",
        host: "pkm-des.example.test",
        cookie: `${SETUP_CLAIM_COOKIE_NAME}=${cookieValue}`
      }
    });

    const response = await verifyPost(request);

    // 1. Must redirect to setup-account with verification_failed error
    assert.equal(response.status, 303);
    const location = response.headers.get("location");
    assert.ok(location);
    const destUrl = new URL(location, "https://pkm-des.example.test");
    assert.equal(destUrl.pathname, "/setup-account");
    assert.equal(destUrl.searchParams.get("error"), "verification_failed");

    // 2. CRITICAL AUDIT FIX: The returned error response MUST delete the temporary setup claim cookie
    const deletedCookie = response.cookies.get(SETUP_CLAIM_COOKIE_NAME);
    const rawSetCookie = response.headers.get("set-cookie") || "";
    assert.ok(
      deletedCookie === undefined ||
      deletedCookie.maxAge === 0 ||
      deletedCookie.value === "" ||
      rawSetCookie.includes(`${SETUP_CLAIM_COOKIE_NAME}=;`) ||
      rawSetCookie.includes("Max-Age=0"),
      "Error response must clear the temporary setup claim cookie so browser does not retain failed claim"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
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

  // Cookie must also be deleted on CSRF rejection
  const rawSetCookie = response.headers.get("set-cookie") || "";
  assert.ok(rawSetCookie.includes(SETUP_CLAIM_COOKIE_NAME) || response.cookies.get(SETUP_CLAIM_COOKIE_NAME)?.maxAge === 0);
});

test("Stage B: POST /auth/confirm-setup/verify rejects missing origin when referer is also missing", async () => {
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");

  const request = new NextRequest("https://pkm-des.example.test/auth/confirm-setup/verify", {
    method: "POST",
    headers: {
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

test("Stage B: POST /auth/confirm-setup/verify accepts trusted referer when origin header is omitted", async () => {
  const originalFetch = globalThis.fetch;
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const cookieValue = serializeSetupClaim(tokenHash, "magiclink");

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (urlStr.includes("/auth/v1/verify")) {
      return new Response(
        JSON.stringify({
          access_token: "mock-access-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh-token",
          user: { id: "student-1234", aud: "authenticated", role: "authenticated", email: "student@example.test" }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(input, init);
  };

  try {
    const request = new NextRequest("https://pkm-des.example.test/auth/confirm-setup/verify", {
      method: "POST",
      headers: {
        referer: "https://pkm-des.example.test/auth/confirm-setup",
        host: "pkm-des.example.test",
        cookie: `${SETUP_CLAIM_COOKIE_NAME}=${cookieValue}`
      }
    });

    const response = await verifyPost(request);
    assert.equal(response.status, 303);
    const location = response.headers.get("location");
    assert.ok(location);
    const destUrl = new URL(location, "https://pkm-des.example.test");
    assert.equal(destUrl.pathname, "/setup-account");
    assert.equal(destUrl.searchParams.has("error"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("End-to-End Round-Trip: Emailed link GET -> Stage A cookie -> Stage B POST verification -> session persistence", async () => {
  const originalFetch = globalThis.fetch;
  const tokenHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const emailedLink = `https://pkm-des.example.test/auth/callback?token_hash=${tokenHash}&type=magiclink`;

  // Mock Supabase Auth /auth/v1/verify
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (urlStr.includes("/auth/v1/verify")) {
      return new Response(
        JSON.stringify({
          access_token: "mock-student-session-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-student-refresh-token",
          user: {
            id: "student-account-uuid",
            aud: "authenticated",
            role: "authenticated",
            email: "student@example.test"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(input, init);
  };

  try {
    // STEP 1: Student opens setup email link (GET)
    const stageARequest = new Request(emailedLink, {
      method: "GET",
      headers: { host: "pkm-des.example.test" }
    });
    const stageAResponse = await callbackGet(stageARequest);

    assert.equal(stageAResponse.status, 303);
    const stageALocation = new URL(stageAResponse.headers.get("location")!, emailedLink);
    assert.equal(stageALocation.pathname, "/auth/confirm-setup");
    assert.equal(stageALocation.searchParams.has("token_hash"), false);

    const stageACookie = stageAResponse.cookies.get(SETUP_CLAIM_COOKIE_NAME);
    assert.ok(stageACookie);

    // STEP 2: Student arrives at /auth/confirm-setup and clicks "Continue Account Setup" (POST)
    const stageBRequest = new NextRequest("https://pkm-des.example.test/auth/confirm-setup/verify", {
      method: "POST",
      headers: {
        origin: "https://pkm-des.example.test",
        host: "pkm-des.example.test",
        cookie: `${SETUP_CLAIM_COOKIE_NAME}=${stageACookie.value}`
      }
    });
    const stageBResponse = await verifyPost(stageBRequest);

    assert.equal(stageBResponse.status, 303);
    const stageBLocation = new URL(stageBResponse.headers.get("location")!, "https://pkm-des.example.test");
    assert.equal(stageBLocation.pathname, "/setup-account");
    assert.equal(stageBLocation.searchParams.has("error"), false);

    // STEP 3: Verify session cookies were established on the response
    const stageBCookies = stageBResponse.cookies.getAll();
    const hasAuthCookie = stageBCookies.some((c) => c.name.includes("auth-token") || c.name.includes("sb-"));
    assert.ok(hasAuthCookie, "Authenticated session cookies must be present on redirect to /setup-account");

    // STEP 4: Verify temporary setup claim cookie was deleted
    const remainingClaimCookie = stageBResponse.cookies.get(SETUP_CLAIM_COOKIE_NAME);
    assert.ok(
      remainingClaimCookie === undefined ||
      remainingClaimCookie.maxAge === 0 ||
      remainingClaimCookie.value === "",
      "Temporary claim cookie must be cleared on successful verification"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
