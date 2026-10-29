import assert from "node:assert/strict";
import test from "node:test";
import {
  extractClientOrigin,
  isTrustedOrigin,
  isTrustedRequestOrigin,
  normalizeOrigin
} from "./trusted-origins";

const noVercelOrigins = {
  vercelUrl: null,
  vercelBranchUrl: null,
  vercelProjectProductionUrl: null
};

test("normalizeOrigin accepts HTTP(S) URLs and rejects malformed or unsafe values", () => {
  assert.equal(normalizeOrigin("https://pkm-des.edu.ph"), "https://pkm-des.edu.ph");
  assert.equal(normalizeOrigin("https://pkm-des.edu.ph/path?query=1"), "https://pkm-des.edu.ph");
  assert.equal(normalizeOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(normalizeOrigin(""), null);
  assert.equal(normalizeOrigin(null), null);
  assert.equal(normalizeOrigin(undefined), null);
  assert.equal(normalizeOrigin("not-a-url"), null);
  assert.equal(normalizeOrigin("javascript:alert(1)"), null);
  assert.equal(normalizeOrigin("file:///etc/passwd"), null);
  assert.equal(normalizeOrigin("https://user:pass@pkm-des.edu.ph"), null);
});

test("extractClientOrigin uses a valid Origin first and Referer only when Origin is absent", () => {
  const requestWithOrigin = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: { origin: "https://pkm-des.edu.ph" }
  });
  assert.equal(extractClientOrigin(requestWithOrigin), "https://pkm-des.edu.ph");

  const requestWithReferer = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: { referer: "https://pkm-des.edu.ph/auth/confirm-setup" }
  });
  assert.equal(extractClientOrigin(requestWithReferer), "https://pkm-des.edu.ph");

  const requestWithBoth = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: {
      origin: "https://pkm-des.edu.ph",
      referer: "https://other.edu.ph/path"
    }
  });
  assert.equal(extractClientOrigin(requestWithBoth), "https://pkm-des.edu.ph");

  const malformedOriginWithTrustedReferer = new Request("https://pkm-des.edu.ph/verify", {
    method: "POST",
    headers: {
      origin: "https://pkm-des.edu.ph/verify",
      referer: "https://pkm-des.edu.ph/auth/confirm-setup"
    }
  });
  assert.equal(extractClientOrigin(malformedOriginWithTrustedReferer), null);

  const emptyOriginWithTrustedReferer = new Request("https://pkm-des.edu.ph/verify", {
    method: "POST",
    headers: { origin: "", referer: "https://pkm-des.edu.ph/auth/confirm-setup" }
  });
  assert.equal(extractClientOrigin(emptyOriginWithTrustedReferer), null);

  const noOriginInformation = new Request("https://pkm-des.edu.ph/verify", { method: "POST" });
  assert.equal(extractClientOrigin(noOriginInformation), null);

  const unsupportedReferer = new Request("https://pkm-des.edu.ph/verify", {
    method: "POST",
    headers: { referer: "ftp://pkm-des.edu.ph/auth/confirm-setup" }
  });
  assert.equal(extractClientOrigin(unsupportedReferer), null);
});

test("isTrustedOrigin accepts only the configured application origin", () => {
  const options = {
    appBaseUrl: "https://pkm-des.edu.ph/forms",
    ...noVercelOrigins,
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("https://pkm-des.edu.ph", options), true);
  assert.equal(isTrustedOrigin("https://evil.attacker.com", options), false);
  assert.equal(isTrustedOrigin("https://pkm-des.edu.ph.attacker.com", options), false);
});

test("isTrustedOrigin accepts exact configured production, preview, and branch domains", () => {
  const productionHost = "pkm-des.vercel.app";
  const deploymentHost = "pkm-des-git-fix-client-production-issues-ron-cada-projects.vercel.app";
  const branchHost = "pkm-des-git-fix-client-production-issues.vercel.app";
  const options = {
    appBaseUrl: "https://pkm-des.edu.ph",
    vercelProjectProductionUrl: productionHost,
    vercelUrl: deploymentHost,
    vercelBranchUrl: branchHost,
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("https://pkm-des.edu.ph", options), true);
  assert.equal(isTrustedOrigin(`https://${productionHost}`, options), true);
  assert.equal(isTrustedOrigin(`https://${deploymentHost}`, options), true);
  assert.equal(isTrustedOrigin(`https://${branchHost}`, options), true);
  assert.equal(isTrustedOrigin("https://pkm-des-preview-123.vercel.app", options), false);
  assert.equal(isTrustedOrigin("https://pkm-des-git-other-branch.vercel.app", options), false);
  assert.equal(isTrustedOrigin("https://other-pkm-des.vercel.app", options), false);
  assert.equal(isTrustedOrigin("https://pkm-des.vercel.app.attacker.com", options), false);
});

test("malformed Vercel host configuration cannot create a trusted origin", () => {
  const options = {
    appBaseUrl: null,
    vercelUrl: "pkm-des.vercel.app/path",
    vercelBranchUrl: "https://pkm-des-branch.vercel.app",
    vercelProjectProductionUrl: "pkm-des-production.vercel.app",
    nodeEnv: "production"
  };

  assert.equal(isTrustedOrigin("https://pkm-des.vercel.app", options), false);
  assert.equal(isTrustedOrigin("https://pkm-des-branch.vercel.app", options), false);
  assert.equal(isTrustedOrigin("https://pkm-des-production.vercel.app", options), true);
});

test("localhost is enabled only by a local non-production APP_BASE_URL", () => {
  const localOptions = {
    appBaseUrl: "http://localhost:3000",
    ...noVercelOrigins,
    nodeEnv: "development"
  };
  assert.equal(isTrustedOrigin("http://localhost:3000", localOptions), true);
  assert.equal(isTrustedOrigin("http://localhost:3001", localOptions), true);
  assert.equal(isTrustedOrigin("http://127.0.0.1:54321", localOptions), true);

  assert.equal(
    isTrustedOrigin("http://localhost:3000", {
      appBaseUrl: "http://localhost:3000",
      ...noVercelOrigins,
      nodeEnv: "production"
    }),
    false
  );
  assert.equal(
    isTrustedOrigin("http://localhost:3000", {
      appBaseUrl: "https://pkm-des.edu.ph",
      ...noVercelOrigins,
      nodeEnv: "development"
    }),
    false
  );
  assert.equal(
    isTrustedOrigin("https://attacker.com", localOptions),
    false
  );
});

test("isTrustedRequestOrigin requires an exact same-origin request and trusted configuration", () => {
  const options = {
    appBaseUrl: "https://pkm-des.edu.ph",
    ...noVercelOrigins,
    nodeEnv: "production"
  };
  const sameOrigin = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: { origin: "https://pkm-des.edu.ph" }
  });
  assert.equal(isTrustedRequestOrigin(sameOrigin, options), true);

  const crossOrigin = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: { origin: "https://attacker.com" }
  });
  assert.equal(isTrustedRequestOrigin(crossOrigin, options), false);

  const forgedForwardedHeaders = new Request("https://attacker.com/auth/confirm-setup/verify", {
    method: "POST",
    headers: {
      origin: "https://attacker.com",
      "x-forwarded-host": "pkm-des.edu.ph",
      "x-forwarded-proto": "https"
    }
  });
  assert.equal(isTrustedRequestOrigin(forgedForwardedHeaders, options), false);

  const missingOrigin = new Request("https://pkm-des.edu.ph/auth/confirm-setup/verify", {
    method: "POST",
    headers: { "x-forwarded-host": "pkm-des.edu.ph", "x-forwarded-proto": "https" }
  });
  assert.equal(isTrustedRequestOrigin(missingOrigin, options), false);
});
