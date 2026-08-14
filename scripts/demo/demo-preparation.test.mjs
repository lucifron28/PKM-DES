import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_ACCOUNTS,
  DEMO_PREPARATION_CONFIRMATION,
  PRIMARY_DEMO_STUDENT,
  readDemoPreparationConfiguration
} from "./demo-preparation-fixtures.mjs";

function environment(overrides = {}) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://demo-ref.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
    PKM_DEMO_PROJECT_REF: "demo-ref",
    PKM_DEMO_ENVIRONMENT: "preview",
    PKM_ALLOW_DEMO_SEED: "true",
    PKM_DEMO_CONFIRM: DEMO_PREPARATION_CONFIRMATION,
    ...overrides
  };
}

test("demo configuration requires an exact project URL and explicit opt-in", () => {
  const configuration = readDemoPreparationConfiguration(environment());
  assert.equal(configuration.projectRef, "demo-ref");
  assert.equal(configuration.targetEnvironment, "preview");
  assert.equal(configuration.term.academicYear, "2025-2026");
  assert.equal(configuration.term.semester, "2nd Semester");

  assert.throws(
    () => readDemoPreparationConfiguration(environment({ NEXT_PUBLIC_SUPABASE_URL: "https://other-ref.supabase.co" })),
    /does not match PKM_DEMO_PROJECT_REF/i
  );
  assert.throws(
    () => readDemoPreparationConfiguration(environment({ PKM_ALLOW_DEMO_SEED: "false" })),
    /PKM_ALLOW_DEMO_SEED=true/i
  );
});

test("local demo configuration stays on the local Supabase port", () => {
  const configuration = readDemoPreparationConfiguration(environment({
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    PKM_DEMO_PROJECT_REF: "local"
  }));
  assert.equal(configuration.projectRef, "local");

  assert.throws(
    () => readDemoPreparationConfiguration(environment({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54322",
      PKM_DEMO_PROJECT_REF: "local"
    })),
    /local Supabase port 54321/i
  );
});

test("demo account fixture has one Registrar, five officials, and one student", () => {
  assert.equal(DEMO_ACCOUNTS.length, 7);
  assert.equal(DEMO_ACCOUNTS.filter((account) => account.officialRole).length, 5);
  assert.equal(DEMO_ACCOUNTS.filter((account) => account.role === "student").length, 1);
  assert.equal(DEMO_ACCOUNTS.find((account) => account.key === "registrar")?.officialRole, null);
  assert.equal(PRIMARY_DEMO_STUDENT.genderSex, "Female");
  assert.equal(PRIMARY_DEMO_STUDENT.studentType, "Incoming 1st Year Student");
});
