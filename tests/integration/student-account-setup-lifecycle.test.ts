import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";

const rawUrl = process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL;
if (!rawUrl || (new URL(rawUrl).hostname !== "127.0.0.1" && new URL(rawUrl).hostname !== "localhost")) {
  throw new Error("Integration test requires an isolated loopback PostgreSQL database URL (PKM_LOCAL_SUPABASE_TEST_DB_URL).");
}

const DB_URL = rawUrl;

function query(sql: string) {
  const output = execFileSync("psql", [DB_URL, "-t", "-A", "-F\t", "-c", sql], {
    encoding: "utf8"
  });
  return output
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .filter((line) => Boolean(line) && line !== "SET" && line !== "RESET")
    .map((line) => line.split("\t"));
}

function execute(sql: string) {
  execFileSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8"
  });
}

function asUser(userId: string, sql: string) {
  return query(`
    SET ROLE authenticated;
    SET "request.jwt.claim.sub" = '${userId}';
    SET "request.jwt.claim.role" = 'authenticated';
    ${sql}
  `);
}

function tryExecuteAsUser(userId: string, sql: string) {
  try {
    execFileSync(
      "psql",
      [
        DB_URL,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `SET ROLE authenticated; SET "request.jwt.claim.sub" = '${userId}'; SET "request.jwt.claim.role" = 'authenticated'; ${sql}`
      ],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return { ok: true, error: null };
  } catch (err: unknown) {
    let errorMsg = String(err);
    if (err && typeof err === "object" && "stderr" in err && err.stderr) {
      errorMsg = String(err.stderr);
    }
    return { ok: false, error: errorMsg };
  }
}

test("Database Lifecycle: Student account setup, profile transition (SETUP -> ACTIVE), and admin rejection", () => {
  const studentProfileId = randomUUID();
  const adminProfileId = randomUUID();
  const programId = randomUUID();

  // 1. Setup isolated test fixtures
  execute(`
    SET pkm.demo_reset = 'true';
    DELETE FROM public.profiles WHERE id IN ('${studentProfileId}', '${adminProfileId}') OR email IN ('setup.student@example.test', 'setup.admin@example.test');
    DELETE FROM auth.users WHERE id IN ('${studentProfileId}', '${adminProfileId}') OR email IN ('setup.student@example.test', 'setup.admin@example.test');
    DELETE FROM public.programs WHERE code = 'TEST_SETUP';

    INSERT INTO public.programs (id, name, code)
    VALUES ('${programId}', 'Setup Test Program', 'TEST_SETUP')
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO auth.users (id, email) VALUES
      ('${studentProfileId}', 'setup.student@example.test'),
      ('${adminProfileId}', 'setup.admin@example.test');

    -- Student profile is created in SETUP status during account claim/registration
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${studentProfileId}', 'setup.student@example.test', 'student', 'Setup', 'Student', 'SETUP');

    -- Administrator profile is ACTIVE
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${adminProfileId}', 'setup.admin@example.test', 'admin', 'Setup', 'Admin', 'ACTIVE');
  `);

  // Verify initial statuses
  const [studentInitial] = query(`SELECT role, account_status FROM public.profiles WHERE id = '${studentProfileId}';`);
  assert.deepEqual(studentInitial, ["student", "SETUP"]);

  const [adminInitial] = query(`SELECT role, account_status FROM public.profiles WHERE id = '${adminProfileId}';`);
  assert.deepEqual(adminInitial, ["admin", "ACTIVE"]);

  // 2. Reject unauthenticated invocation
  const [unauthRes] = query(`
    RESET ROLE;
    SELECT outcome FROM public.complete_student_account_setup();
  `);
  assert.equal(unauthRes[0], "unauthorized", "Unauthenticated session must not execute complete_student_account_setup");

  // 3. Confirm administrative accounts cannot complete student setup
  const [adminAttempt] = asUser(
    adminProfileId,
    `SELECT outcome FROM public.complete_student_account_setup();`
  );
  assert.equal(adminAttempt[0], "invalid_setup", "Admin accounts must be rejected from student account setup");

  // Verify admin status is unmodified
  const [adminCheck] = query(`SELECT account_status FROM public.profiles WHERE id = '${adminProfileId}';`);
  assert.equal(adminCheck[0], "ACTIVE");

  // 4. Confirm direct client table update to bypass complete_student_account_setup is blocked
  tryExecuteAsUser(
    studentProfileId,
    `UPDATE public.profiles SET account_status = 'ACTIVE', role = 'admin' WHERE id = '${studentProfileId}';`
  );
  // Verify student status remains SETUP (not altered by direct update)
  const [studentStillSetup] = query(`SELECT account_status, role FROM public.profiles WHERE id = '${studentProfileId}';`);
  assert.deepEqual(studentStillSetup, ["SETUP", "student"], "Direct client update must not modify student status or role");

  // 5. Eligible student executes complete_student_account_setup()
  const [setupSuccess] = asUser(
    studentProfileId,
    `SELECT outcome FROM public.complete_student_account_setup();`
  );
  assert.equal(setupSuccess[0], "completed", "Student in SETUP status must successfully complete account setup");

  // 6. Verify profile transitioned from SETUP to ACTIVE
  const [studentAfter] = query(`SELECT role, account_status FROM public.profiles WHERE id = '${studentProfileId}';`);
  assert.deepEqual(studentAfter, ["student", "ACTIVE"], "Profile must transition to ACTIVE student");

  // 7. Re-running complete_student_account_setup() fails closed (idempotent / non-resurrecting)
  const [reSetupRes] = asUser(
    studentProfileId,
    `SELECT outcome FROM public.complete_student_account_setup();`
  );
  assert.equal(reSetupRes[0], "invalid_setup", "Already ACTIVE student must receive invalid_setup on re-execution");

  // 8. Cleanup test fixtures
  execute(`
    SET pkm.demo_reset = 'true';
    DELETE FROM public.profiles WHERE id IN ('${studentProfileId}', '${adminProfileId}') OR email IN ('setup.student@example.test', 'setup.admin@example.test');
    DELETE FROM auth.users WHERE id IN ('${studentProfileId}', '${adminProfileId}') OR email IN ('setup.student@example.test', 'setup.admin@example.test');
    DELETE FROM public.programs WHERE code = 'TEST_SETUP';
  `);
});
