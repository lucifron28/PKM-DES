import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_RESET_CONFIRMATION, getDemoResetAvailability, isDemoResetConfirmation } from "./reset-guard";

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    DEMO_RESET_ENABLED: "true",
    PKM_DEMO_ENVIRONMENT: "preview",
    PKM_DEMO_PROJECT_REF: "demo-ref",
    PKM_ALLOW_DEMO_SEED: "true",
    DEMO_RESET_CONFIRM: DEMO_RESET_CONFIRMATION,
    NEXT_PUBLIC_SUPABASE_URL: "https://demo-ref.supabase.co",
    ...overrides
  };
}

test("demo reset is disabled by default", () => {
  const result = getDemoResetAvailability({});
  assert.equal(result.enabled, false);
  assert.match(result.reason, /disabled/i);
});

test("demo reset requires every server-side opt-in and matching target", () => {
  assert.equal(getDemoResetAvailability(environment()).enabled, true);
  assert.equal(getDemoResetAvailability(environment({ PKM_ALLOW_DEMO_SEED: "false" })).enabled, false);
  assert.equal(getDemoResetAvailability(environment({ PKM_DEMO_PROJECT_REF: "other-ref" })).enabled, false);
  assert.equal(getDemoResetAvailability(environment({ PKM_DEMO_ENVIRONMENT: "production" })).enabled, false);
});

test("local demo target must stay on the local Supabase port", () => {
  assert.equal(
    getDemoResetAvailability(
      environment({
        PKM_DEMO_ENVIRONMENT: "local",
        PKM_DEMO_PROJECT_REF: "local",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321"
      })
    ).enabled,
    true
  );
  assert.equal(
    getDemoResetAvailability(
      environment({
        PKM_DEMO_ENVIRONMENT: "local",
        PKM_DEMO_PROJECT_REF: "local",
        NEXT_PUBLIC_SUPABASE_URL: "https://demo-ref.supabase.co"
      })
    ).enabled,
    false
  );
});

test("reset confirmation requires the exact phrase", () => {
  assert.equal(isDemoResetConfirmation(DEMO_RESET_CONFIRMATION), true);
  assert.equal(isDemoResetConfirmation(` ${DEMO_RESET_CONFIRMATION} `), true);
  assert.equal(isDemoResetConfirmation("RESET DEMO DATA"), false);
  assert.equal(isDemoResetConfirmation(""), false);
});
