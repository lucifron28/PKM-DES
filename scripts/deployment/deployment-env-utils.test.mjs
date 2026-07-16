import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCAL_OPERATOR_VARIABLES,
  formatDeploymentEnvironmentError,
  isVercelBuild,
  validateVercelRuntimeEnvironment
} from "./deployment-env-utils.mjs";

function validEnvironment(overrides = {}) {
  return {
    VERCEL: "1",
    DATABASE_PROVIDER: "supabase",
    NEXT_PUBLIC_SUPABASE_URL: "https://fictional-preview.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "fictional-service-role-key",
    ACCOUNT_CLAIM_SECRET: "fictional-account-claim-secret-longer-than-32-characters",
    ...overrides
  };
}

function expectStage(environment, stage, variableName) {
  assert.throws(
    () => validateVercelRuntimeEnvironment(environment),
    (error) => error.stage === stage && (variableName === undefined || error.variableName === variableName)
  );
}

test("accepts a valid fictional Vercel Supabase configuration", () => {
  assert.deepEqual(validateVercelRuntimeEnvironment(validEnvironment()), {
    skipped: false,
    provider: "supabase",
    url: "https://fictional-preview.supabase.co/"
  });
});

test("requires an explicit Supabase provider on Vercel", () => {
  expectStage(validEnvironment({ DATABASE_PROVIDER: "sqlite" }), "invalid_database_provider", "DATABASE_PROVIDER");
  const environment = validEnvironment();
  delete environment.DATABASE_PROVIDER;
  expectStage(environment, "invalid_database_provider", "DATABASE_PROVIDER");
});

test("requires every Vercel runtime variable", () => {
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ACCOUNT_CLAIM_SECRET"]) {
    const environment = validEnvironment();
    delete environment[key];
    expectStage(environment, "required_runtime_variable_missing", key);
  }
});

test("rejects unsafe or malformed Supabase URLs without echoing them", () => {
  for (const url of [
    "http://fictional-preview.supabase.co",
    "https://example.test",
    "https://supabase.co.example.test",
    "https://user@fictional-preview.supabase.co",
    "https://user:password@fictional-preview.supabase.co",
    "https://fictional-preview.supabase.co?query=value",
    "https://fictional-preview.supabase.co#fragment",
    "https://fictional-preview.supabase.co/unexpected",
    " https://fictional-preview.supabase.co"
  ]) {
    let captured;
    try {
      validateVercelRuntimeEnvironment(validEnvironment({ NEXT_PUBLIC_SUPABASE_URL: url }));
    } catch (error) {
      captured = formatDeploymentEnvironmentError(error);
    }
    assert.equal(captured, "invalid_supabase_url: NEXT_PUBLIC_SUPABASE_URL");
    assert.equal(captured.includes(url), false);
  }
});

test("protects secret values without trimming them", () => {
  const environment = validEnvironment({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: " fictional-anon-key ",
    SUPABASE_SERVICE_ROLE_KEY: " fictional-service-role-key ",
    ACCOUNT_CLAIM_SECRET: " fictional-account-claim-secret-longer-than-32-characters "
  });
  assert.equal(validateVercelRuntimeEnvironment(environment).provider, "supabase");
  expectStage(validEnvironment({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "   " }), "required_runtime_variable_missing", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  expectStage(validEnvironment({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "same", SUPABASE_SERVICE_ROLE_KEY: "same" }), "supabase_keys_must_differ");
  expectStage(validEnvironment({ ACCOUNT_CLAIM_SECRET: "short" }), "account_claim_secret_too_short", "ACCOUNT_CLAIM_SECRET");
});

test("rejects enabled stub pages and every local operator variable", () => {
  expectStage(validEnvironment({ NEXT_PUBLIC_ENABLE_STUB_PAGES: "true" }), "stub_pages_must_be_disabled", "NEXT_PUBLIC_ENABLE_STUB_PAGES");
  assert.equal(validateVercelRuntimeEnvironment(validEnvironment({ NEXT_PUBLIC_ENABLE_STUB_PAGES: "false" })).provider, "supabase");
  for (const key of LOCAL_OPERATOR_VARIABLES) {
    expectStage(validEnvironment({ [key]: "fictional-local-only-value" }), "local_operator_variable_present", key);
  }
});

test("prebuild guard detection skips outside Vercel and validates on Vercel", () => {
  assert.equal(isVercelBuild({}), false);
  assert.equal(validateVercelRuntimeEnvironment({}).skipped, true);
  assert.equal(isVercelBuild(validEnvironment()), true);
});
