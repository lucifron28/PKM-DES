import assert from "node:assert/strict";
import test from "node:test";
import {
  extractClientOrigin,
  isTrustedOrigin,
  normalizeOrigin
} from "./trusted-origins";

test("normalizeOrigin extracts clean protocol and host, rejecting invalid inputs", () => {
  assert.equal(normalizeOrigin("https://pkm-des.edu.ph"), "https://pkm-des.edu.ph");
  assert.equal(normalizeOrigin("https://pkm-des.edu.ph/some/path?query=1"), "https://pkm-des.edu.ph");
  assert.equal(normalizeOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(normalizeOrigin("http://127.0.0.1:8080"), "http://127.0.0.1:8080");

  // Rejections
  assert.equal(normalizeOrigin(""), null);
  assert.equal(normalizeOrigin(null), null);
  assert.equal(normalizeOrigin(undefined), null);
  assert.equal(normalizeOrigin("not-a-url"), null);
  assert.equal(normalizeOrigin("javascript:alert(1)"), null);
  assert.equal(normalizeOrigin("file:///etc/passwd"), null);
  assert.equal(normalizeOrigin("https://user:pass@pkm-des.edu.ph"), null);
});

test("extractClientOrigin extracts from Origin header and falls back to Referer", () => {
  const reqWithOrigin = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: { origin: "https://pkm-des.edu.ph" }
  });
  assert.equal(extractClientOrigin(reqWithOrigin), "https://pkm-des.edu.ph");

  const reqWithReferer = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: { referer: "https://pkm-des.edu.ph/auth/confirm-setup" }
  });
  assert.equal(extractClientOrigin(reqWithReferer), "https://pkm-des.edu.ph");

  // Origin header takes precedence over Referer
  const reqBoth = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: {
      origin: "https://pkm-des.edu.ph",
      referer: "https://other.edu.ph/path"
    }
  });
  assert.equal(extractClientOrigin(reqBoth), "https://pkm-des.edu.ph");

  // Missing or empty
  const reqEmpty = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST"
  });
  assert.equal(extractClientOrigin(reqEmpty), null);
});

test("isTrustedOrigin accepts explicitly configured APP_BASE_URL", () => {
  const options = {
    appBaseUrl: "https://pkm-des.edu.ph",
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("https://pkm-des.edu.ph", options), true);
  assert.equal(isTrustedOrigin("https://evil.attacker.com", options), false);
  assert.equal(isTrustedOrigin("https://pkm-des.edu.ph.attacker.com", options), false);
});

test("isTrustedOrigin accepts verified Vercel production and branch URLs", () => {
  const options = {
    appBaseUrl: "https://pkm-des.edu.ph",
    vercelProjectProductionUrl: "pkm-des.vercel.app",
    vercelUrl: "pkm-des-git-fix-client-production-issues-ron-cada-projects.vercel.app",
    vercelBranchUrl: "pkm-des-git-fix-client-production-issues.vercel.app",
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("https://pkm-des.edu.ph", options), true);
  assert.equal(isTrustedOrigin("https://pkm-des.vercel.app", options), true);
  assert.equal(isTrustedOrigin("https://pkm-des-git-fix-client-production-issues-ron-cada-projects.vercel.app", options), true);
  assert.equal(isTrustedOrigin("https://pkm-des-git-fix-client-production-issues.vercel.app", options), true);
  assert.equal(isTrustedOrigin("https://unrelated-project.vercel.app", options), false);
});

test("isTrustedOrigin allows project-scoped Vercel preview URLs", () => {
  const options = {
    appBaseUrl: "https://pkm-des.edu.ph",
    isVercel: true,
    projectSlug: "pkm-des",
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("https://pkm-des-preview-123.vercel.app", options), true);
  assert.equal(isTrustedOrigin("https://pkm-des-git-feature.vercel.app", options), true);
  assert.equal(isTrustedOrigin("https://pkm-des.vercel.app", options), true);

  // Rejects different projects on vercel.app
  assert.equal(isTrustedOrigin("https://malicious-app.vercel.app", options), false);
  assert.equal(isTrustedOrigin("https://other-pkm-des.vercel.app", options), false);
});

test("isTrustedOrigin supports localhost and 127.0.0.1 in non-production", () => {
  const devOptions = {
    appBaseUrl: "http://localhost:3000",
    nodeEnv: "development"
  };

  assert.equal(isTrustedOrigin("http://localhost:3000", devOptions), true);
  assert.equal(isTrustedOrigin("http://localhost:3001", devOptions), true);
  assert.equal(isTrustedOrigin("http://127.0.0.1:3000", devOptions), true);
  assert.equal(isTrustedOrigin("http://127.0.0.1:8080", devOptions), true);
  assert.equal(isTrustedOrigin("https://attacker.com", devOptions), false);
});

test("isTrustedOrigin rejects localhost in production unless APP_BASE_URL is explicitly local", () => {
  const prodOptions = {
    appBaseUrl: "https://pkm-des.edu.ph",
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("http://localhost:3000", prodOptions), false);
  assert.equal(isTrustedOrigin("http://127.0.0.1:3000", prodOptions), false);
});

test("isTrustedOrigin fails closed when configuration is missing or invalid", () => {
  const emptyOptions = {
    appBaseUrl: null,
    vercelUrl: null,
    vercelProjectProductionUrl: null,
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("https://pkm-des.edu.ph", emptyOptions), false);
  assert.equal(isTrustedOrigin("http://localhost:3000", emptyOptions), false);
  assert.equal(isTrustedOrigin("https://attacker.com", emptyOptions), false);
  assert.equal(isTrustedOrigin("", emptyOptions), false);
  assert.equal(isTrustedOrigin(null, emptyOptions), false);
});

test("isTrustedOrigin rejects forged forwarded headers and arbitrary cross-origin requests", () => {
  const options = {
    appBaseUrl: "https://pkm-des.edu.ph",
    nodeEnv: "production"
  };

  // An attacker attempting to claim their own origin
  assert.equal(isTrustedOrigin("https://attacker.com", options), false);
  assert.equal(isTrustedOrigin("http://attacker.com", options), false);
  assert.equal(isTrustedOrigin("https://subdomain.attacker.com", options), false);
});
