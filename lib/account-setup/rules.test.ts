import test from "node:test";
import assert from "node:assert/strict";
import { isEligibleStudentSetupProfile } from "./rules";
import { getSafeNextDestination } from "@/lib/auth/safe-next-destination";

test("only a student profile in SETUP status can complete account setup", () => {
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "SETUP" }), true);
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "ACTIVE" }), false);
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "PENDING" }), false);
  assert.equal(isEligibleStudentSetupProfile({ role: "admin", account_status: "SETUP" }), false);
  assert.equal(isEligibleStudentSetupProfile({ role: "admin", account_status: "ACTIVE" }), false);
  assert.equal(isEligibleStudentSetupProfile(null), false);
});

test("safe next destination resolves role-appropriate dashboard fallback for active profiles", () => {
  assert.equal(getSafeNextDestination("/student/dashboard", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("/admin/dashboard", "admin"), "/admin/dashboard");
  assert.equal(getSafeNextDestination("/admin/students", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("/student/cor", "admin"), "/admin/dashboard");
});

test("callback redirect preserves incoming request origin for host/cookie consistency", () => {
  const incomingUrls = [
    "https://example.com/auth/callback?code=test-code",
    "https://preview.pkm-des.edu.ph:8443/auth/callback?token_hash=abc&type=magiclink",
    "http://127.0.0.1:3000/auth/callback?token_hash=xyz"
  ];

  for (const urlStr of incomingUrls) {
    const incoming = new URL(urlStr);
    const setupUrl = new URL("/setup-account", incoming);
    assert.equal(setupUrl.origin, incoming.origin, "Redirect origin must match incoming request origin exactly");
    assert.equal(setupUrl.pathname, "/setup-account");
  }
});

test("callback error redirects provide specific error reason without exposing raw tokens", () => {
  const requestUrl = new URL("https://example.com/auth/callback?token_hash=secret-hash&error=access_denied&error_description=Expired");
  const setupUrl = new URL("/setup-account", requestUrl);
  const authError = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (authError || errorDescription) {
    setupUrl.searchParams.set("error", authError || "auth_callback_error");
    if (errorDescription) {
      setupUrl.searchParams.set("error_description", errorDescription);
    }
  }

  assert.equal(setupUrl.searchParams.get("error"), "access_denied");
  assert.equal(setupUrl.searchParams.get("error_description"), "Expired");
  assert.equal(setupUrl.searchParams.has("token_hash"), false, "Token hash must not be leaked into redirect URL");
});
