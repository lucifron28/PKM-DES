import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_ACCOUNTS,
  DEMO_OFFICIAL_ACCOUNTS,
  DEMO_SHARED_PASSWORD,
  DEMO_PREPARATION_CONFIRMATION,
  PRIMARY_DEMO_STUDENT,
  readDemoPreparationConfiguration,
  readDemoVerificationConfiguration
} from "./demo-preparation-fixtures.mjs";

function environment(overrides = {}) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://demo-ref.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
    PKM_DEMO_PROJECT_REF: "demo-ref",
    PKM_DEMO_ENVIRONMENT: "preview",
    PKM_ALLOW_DEMO_SEED: "true",
    PKM_DEMO_CONFIRM: DEMO_PREPARATION_CONFIRMATION,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-placeholder",
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
  assert.throws(
    () => readDemoPreparationConfiguration(environment({ PKM_DEMO_ENVIRONMENT: "production" })),
    /BLOCKED.*demo\/development/i
  );
  assert.throws(
    () => readDemoPreparationConfiguration(environment({ DEMO_ACCOUNT_PASSWORD: "not-the-demo-password" })),
    /fixed demo password/i
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
  assert.equal(DEMO_OFFICIAL_ACCOUNTS.length, 6);
  assert.equal(DEMO_OFFICIAL_ACCOUNTS.filter((account) => account.officialRole).length, 5);
  assert.equal(DEMO_ACCOUNTS.filter((account) => account.role === "student").length, 1);
  assert.equal(DEMO_ACCOUNTS.find((account) => account.key === "registrar")?.officialRole, null);
  assert.equal(PRIMARY_DEMO_STUDENT.genderSex, "Female");
  assert.equal(PRIMARY_DEMO_STUDENT.studentType, "Incoming 1st Year Student");
  assert.equal(DEMO_SHARED_PASSWORD, "Demo1234!");
});

test("each standard official demo login owns exactly one intended capability", () => {
  assert.deepEqual(
    new Map(DEMO_OFFICIAL_ACCOUNTS.map((account) => [account.email, account.officialRole])),
    new Map([
      ["pkmregistrarofficial@gmail.com", null],
      ["pkm.demo.librarian@example.com", "LIBRARIAN"],
      ["pkm.demo.nurse@example.com", "NURSE"],
      ["pkm.demo.programchair@example.com", "PROGRAM_CHAIR"],
      ["pkm.demo.accountant@example.com", "ACCOUNTANT"],
      ["pkm.demo.dean@example.com", "DEAN"]
    ])
  );
  assert.equal(new Set(DEMO_OFFICIAL_ACCOUNTS.map((account) => account.email)).size, 6);
});

test("verification requires the public Supabase key for real login checks", () => {
  assert.equal(readDemoVerificationConfiguration(environment()).anonKey, "anon-key-placeholder");
  assert.throws(
    () => readDemoVerificationConfiguration(environment({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })),
    /NEXT_PUBLIC_SUPABASE_ANON_KEY is required/i
  );
});
