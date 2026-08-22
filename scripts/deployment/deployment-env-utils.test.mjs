import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
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

const FICTIONAL_RUNTIME_SECRETS = Object.freeze({
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-anon-key-not-for-use",
  SUPABASE_SERVICE_ROLE_KEY: "fictional-service-role-key-not-for-use",
  ACCOUNT_CLAIM_SECRET: "fictional-account-claim-secret-longer-than-32-characters"
});

const FICTIONAL_LOCAL_OPERATOR_PASSWORD = "fictional-local-operator-password-not-for-use";

function assertSanitizedFailure(error, { stage, variableName, suppliedValues = [] }) {
  const formatted = formatDeploymentEnvironmentError(error);
  const expected = variableName ? `${stage}: ${variableName}` : stage;

  assert.equal(formatted, expected);
  for (const value of suppliedValues) {
    assert.equal(formatted.includes(value), false);
  }
  assert.equal(formatted.includes("{"), false);
  assert.equal(formatted.includes("Error:"), false);
  assert.equal(formatted.includes("\n    at "), false);
}

test("accepts a valid fictional Vercel Supabase configuration", () => {
  assert.deepEqual(validateVercelRuntimeEnvironment(validEnvironment()), {
    skipped: false,
    provider: "supabase",
    url: "https://fictional-preview.supabase.co/"
  });
});

test("accepts the confirmation phrase for an explicitly scoped deployed demo reset", () => {
  assert.equal(
    validateVercelRuntimeEnvironment(
      validEnvironment({
        DEMO_RESET_ENABLED: "true",
        PKM_DEMO_ENVIRONMENT: "demo",
        PKM_ALLOW_DEMO_SEED: "true",
        DEMO_RESET_CONFIRM: "RESET_PKM_DES_DEMO",
        PKM_DEMO_PROJECT_REF: "fictional-preview"
      })
    ).provider,
    "supabase"
  );
});

test("rejects the confirmation phrase when the deployed demo reset is not fully scoped", () => {
  expectStage(
    validEnvironment({ DEMO_RESET_CONFIRM: "RESET_PKM_DES_DEMO" }),
    "local_operator_variable_present",
    "DEMO_RESET_CONFIRM"
  );
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

test("formats deployment validation failures without supplied secret values", () => {
  const suppliedValues = [...Object.values(FICTIONAL_RUNTIME_SECRETS), FICTIONAL_LOCAL_OPERATOR_PASSWORD];

  try {
    validateVercelRuntimeEnvironment(validEnvironment({
      ...FICTIONAL_RUNTIME_SECRETS,
      PREVIEW_REGISTRAR_PASSWORD: FICTIONAL_LOCAL_OPERATOR_PASSWORD,
      DATABASE_PROVIDER: "sqlite"
    }));
    assert.fail("Expected the invalid provider to be rejected.");
  } catch (error) {
    assertSanitizedFailure(error, {
      stage: "invalid_database_provider",
      variableName: "DATABASE_PROVIDER",
      suppliedValues
    });
  }

  try {
    validateVercelRuntimeEnvironment(validEnvironment({
      ...FICTIONAL_RUNTIME_SECRETS,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: FICTIONAL_RUNTIME_SECRETS.SUPABASE_SERVICE_ROLE_KEY
    }));
    assert.fail("Expected matching Supabase keys to be rejected.");
  } catch (error) {
    assertSanitizedFailure(error, {
      stage: "supabase_keys_must_differ",
      suppliedValues
    });
  }

  try {
    validateVercelRuntimeEnvironment(validEnvironment({
      ...FICTIONAL_RUNTIME_SECRETS,
      ACCOUNT_CLAIM_SECRET: "tiny-secret"
    }));
    assert.fail("Expected a short account claim secret to be rejected.");
  } catch (error) {
    assertSanitizedFailure(error, {
      stage: "account_claim_secret_too_short",
      variableName: "ACCOUNT_CLAIM_SECRET",
      suppliedValues: [...suppliedValues, "tiny-secret"]
    });
  }

  try {
    validateVercelRuntimeEnvironment(validEnvironment({
      ...FICTIONAL_RUNTIME_SECRETS,
      PREVIEW_REGISTRAR_PASSWORD: FICTIONAL_LOCAL_OPERATOR_PASSWORD
    }));
    assert.fail("Expected a local operator variable to be rejected.");
  } catch (error) {
    assertSanitizedFailure(error, {
      stage: "local_operator_variable_present",
      variableName: "PREVIEW_REGISTRAR_PASSWORD",
      suppliedValues
    });
  }
});

test("formats unexpected validation errors without their message or stack", () => {
  const fictionalUnexpectedValue = "fictional-unexpected-error-detail-not-for-use";
  const error = new Error(fictionalUnexpectedValue);
  const formatted = formatDeploymentEnvironmentError(error);

  assert.equal(formatted, "deployment_environment_validation_failed");
  assert.equal(formatted.includes(fictionalUnexpectedValue), false);
  assert.equal(formatted.includes("Error:"), false);
  assert.equal(formatted.includes("\n    at "), false);
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

test("the prebuild script skips outside Vercel without runtime secrets", () => {
  const scriptPath = fileURLToPath(new URL("../check-vercel-env.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [scriptPath], {
    env: {},
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "Vercel environment check skipped outside Vercel.\n");
  assert.equal(result.stderr, "");
});
