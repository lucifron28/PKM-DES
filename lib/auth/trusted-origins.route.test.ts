import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST as verifySetupPost } from "../../app/auth/confirm-setup/verify/route";
import { SETUP_CLAIM_COOKIE_NAME, serializeSetupClaim } from "./setup-token";

const envKeys = [
  "ACCOUNT_CLAIM_SECRET",
  "APP_BASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL"
] as const;

function saveEnvironment() {
  return new Map(envKeys.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(previous: Map<string, string | undefined>) {
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function configureRouteEnvironment() {
  process.env.ACCOUNT_CLAIM_SECRET = "route-origin-test-secret-at-least-32-characters";
  process.env.APP_BASE_URL = "https://pkm-des.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unused-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  Reflect.set(process.env, "NODE_ENV", "production");
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_URL;
  delete process.env.VERCEL_BRANCH_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
}

function request(url: string, cookieValue: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      cookie: `${SETUP_CLAIM_COOKIE_NAME}=${cookieValue}`,
      ...headers
    }
  });
}

test("confirmation POST rejects cross-origin requests and forged forwarded headers", async () => {
  const previous = saveEnvironment();
  const originalFetch = globalThis.fetch;
  const tokenCookie = serializeSetupClaim(
    "unredeemed-test-hash",
    "magiclink",
    "route-origin-test-secret-at-least-32-characters"
  );
  let authRequests = 0;
  globalThis.fetch = async () => {
    authRequests += 1;
    return Response.json({ code: "unexpected" }, { status: 400 });
  };

  try {
    configureRouteEnvironment();

    const cases = [
      request(
        "https://pkm-des.example.test/auth/confirm-setup/verify",
        tokenCookie,
        {
          origin: "https://attacker.example",
          "x-forwarded-host": "pkm-des.example.test",
          "x-forwarded-proto": "https"
        }
      ),
      request(
        "https://attacker.example/auth/confirm-setup/verify",
        tokenCookie,
        {
          origin: "https://attacker.example",
          "x-forwarded-host": "pkm-des.example.test",
          "x-forwarded-proto": "https"
        }
      ),
      request(
        "https://pkm-des-preview-123.vercel.app/auth/confirm-setup/verify",
        tokenCookie,
        {
          origin: "https://pkm-des-preview-123.vercel.app",
          "x-forwarded-host": "pkm-des.example.test",
          "x-forwarded-proto": "https"
        }
      ),
      request(
        "https://pkm-des.example.test/auth/confirm-setup/verify",
        tokenCookie,
        {
          origin: "https://pkm-des.example.test/auth/confirm-setup/verify",
          referer: "https://pkm-des.example.test/auth/confirm-setup"
        }
      ),
      request(
        "https://pkm-des.example.test/auth/confirm-setup/verify",
        tokenCookie,
        { "x-forwarded-host": "pkm-des.example.test", "x-forwarded-proto": "https" }
      )
    ];

    for (const candidate of cases) {
      const response = await verifySetupPost(candidate);
      const location = new URL(response.headers.get("location")!);
      assert.equal(response.status, 303);
      assert.equal(location.pathname, "/setup-account");
      assert.equal(location.searchParams.get("error"), "invalid_origin");
    }
    assert.equal(authRequests, 0, "untrusted requests must not reach Supabase Auth");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(previous);
  }
});

test("confirmation POST reaches Supabase only for its exact configured same origin", async () => {
  const previous = saveEnvironment();
  const originalFetch = globalThis.fetch;
  const tokenCookie = serializeSetupClaim(
    "unredeemed-test-hash",
    "magiclink",
    "route-origin-test-secret-at-least-32-characters"
  );
  const authRequests: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    authRequests.push(url);
    return Response.json({ code: "otp_expired", msg: "test rejection" }, { status: 400 });
  };

  try {
    configureRouteEnvironment();
    const requests = [
      request("https://pkm-des.example.test/auth/confirm-setup/verify", tokenCookie, {
        origin: "https://pkm-des.example.test"
      }),
      request("https://pkm-des.example.test/auth/confirm-setup/verify", tokenCookie, {
        referer: "https://pkm-des.example.test/auth/confirm-setup"
      })
    ];

    for (const candidate of requests) {
      const response = await verifySetupPost(candidate);
      const location = new URL(response.headers.get("location")!);

      assert.equal(response.status, 303);
      assert.equal(location.pathname, "/setup-account");
      assert.equal(location.searchParams.get("error"), "verification_failed");
    }
    assert.equal(authRequests.length, 2);
    assert.ok(authRequests.every((url) => /\/auth\/v1\/verify$/.test(url)));
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(previous);
  }
});

test("confirmation POST accepts the exact configured Vercel preview origin", async () => {
  const previous = saveEnvironment();
  const originalFetch = globalThis.fetch;
  const tokenCookie = serializeSetupClaim(
    "unredeemed-preview-test-hash",
    "magiclink",
    "route-origin-test-secret-at-least-32-characters"
  );
  const previewHost = "pkm-des-git-fix-client-production-issues-preview.vercel.app";
  let authRequests = 0;
  globalThis.fetch = async () => {
    authRequests += 1;
    return Response.json({ code: "otp_expired", msg: "test rejection" }, { status: 400 });
  };

  try {
    configureRouteEnvironment();
    process.env.VERCEL_URL = previewHost;

    const response = await verifySetupPost(
      request(`https://${previewHost}/auth/confirm-setup/verify`, tokenCookie, {
        origin: `https://${previewHost}`
      })
    );
    const location = new URL(response.headers.get("location")!);

    assert.equal(response.status, 303);
    assert.equal(location.searchParams.get("error"), "verification_failed");
    assert.equal(authRequests, 1, "the exact configured Vercel preview must reach Supabase Auth");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(previous);
  }
});
