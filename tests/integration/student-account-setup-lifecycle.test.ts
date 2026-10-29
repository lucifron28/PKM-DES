import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import { performStudentRegistrationService } from "../../lib/account-claim/account-registration-service";
import { generateStudentAccountSetupLink } from "../../lib/account-claim/setup-delivery-service";
import { completeStudentAccountSetup } from "../../lib/account-setup/complete-setup";
import { SETUP_CLAIM_COOKIE_NAME, parseSetupClaim } from "../../lib/auth/setup-token";
import type { EmailEnvironment } from "../../lib/email";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required integration-test environment variable: ${name}`);
  return value;
}

const integrationEnvironment = requiredEnvironment("PKM_SUPABASE_INTEGRATION_ENV");
if (integrationEnvironment !== "disposable-local") {
  throw new Error("Account setup integration tests require PKM_SUPABASE_INTEGRATION_ENV=disposable-local.");
}

const databaseUrl = requiredEnvironment("PKM_SUPABASE_TEST_DB_URL");
const supabaseUrl = requiredEnvironment("PKM_SUPABASE_TEST_URL");
const anonKey = requiredEnvironment("PKM_SUPABASE_TEST_ANON_KEY");
const serviceRoleKey = requiredEnvironment("PKM_SUPABASE_TEST_SERVICE_ROLE_KEY");
const appBaseUrl = requiredEnvironment("APP_BASE_URL");
const integrationProjectId = requiredEnvironment("PKM_SUPABASE_INTEGRATION_PROJECT_ID");

if (!/^PKM-DES$|^pkm-des-it-[0-9a-f]{8}$/.test(integrationProjectId)) {
  throw new Error("Integration tests require the repository project or a unique disposable PKM-DES test project.");
}

function isLoopback(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
}

function validateLocalTargets() {
  const database = new URL(databaseUrl);
  const api = new URL(supabaseUrl);
  const app = new URL(appBaseUrl);

  assert.ok(["postgres:", "postgresql:"].includes(database.protocol), "database URL must use PostgreSQL");
  assert.ok(isLoopback(database.hostname), "database URL must target loopback");
  assert.equal(database.port, "54322", "database URL must target this repository's local Supabase port");
  assert.equal(decodeURIComponent(database.username), "postgres", "database URL must use the local Supabase database role");
  assert.equal(database.pathname, "/postgres", "database URL must target the local postgres database");

  assert.equal(api.protocol, "http:", "integration tests must use the local Supabase API");
  assert.ok(isLoopback(api.hostname), "Supabase API URL must target loopback");
  assert.equal(api.port, "54321", "Supabase API URL must target this repository's local API port");

  assert.equal(app.protocol, "http:", "integration app must use local HTTP");
  assert.ok(isLoopback(app.hostname), "application URL must target loopback");
  assert.equal(app.port, "3000", "application URL must target the local integration app");
}

validateLocalTargets();

function runDatabaseIdentityCheck() {
  const output = execFileSync(
    "psql",
    [
      databaseUrl,
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `select json_build_object(
        'database', current_database(),
        'user', current_user,
        'version', current_setting('server_version_num')::integer,
        'auth_users', to_regclass('auth.users') is not null,
        'migration_history', to_regclass('supabase_migrations.schema_migrations') is not null
      )::text;`
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();

  const identity = JSON.parse(output) as {
    database: string;
    user: string;
    version: number;
    auth_users: boolean;
    migration_history: boolean;
  };
  assert.equal(identity.database, "postgres");
  assert.equal(identity.user, "postgres");
  assert.equal(Math.floor(identity.version / 10000), 17, "local database must use the configured PostgreSQL 17 version");
  assert.equal(identity.auth_users, true, "target must be a Supabase Auth database");
  assert.equal(identity.migration_history, true, "target must have Supabase migration history");
}

function createClientOptions() {
  return { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } } as const;
}

function serverClientForCookies(cookies: Map<string, string>) {
  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (items: Array<{ name: string; value: string; options: CookieOptions }>) => {
        for (const { name, value, options } of items) {
          if (options.maxAge === 0 || !value) cookies.delete(name);
          else cookies.set(name, value);
        }
      }
    }
  });
}

async function browserServerClient(context: BrowserContext) {
  const browserCookies = await context.cookies(appBaseUrl);
  return serverClientForCookies(new Map(browserCookies.map(({ name, value }) => [name, value])));
}

async function findAuthUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error("Could not inspect the isolated Auth fixture during cleanup.");
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function removeAccountFixture(admin: SupabaseClient, profileId: string | null) {
  if (!profileId) return;

  const { error: studentError } = await admin.from("students").delete().eq("profile_id", profileId);
  if (studentError) throw new Error("Could not remove the current student fixture.");

  const { error: profileDeleteError } = await admin.from("profiles").delete().eq("id", profileId);
  if (profileDeleteError) throw new Error("Could not remove the current profile fixture.");

  const { error: authError } = await admin.auth.admin.deleteUser(profileId);
  if (authError && !/not found/i.test(authError.message)) {
    throw new Error("Could not remove the current Auth fixture.");
  }
}

test(
  "student account setup works through local Supabase Auth and the application flow",
  { timeout: 180_000 },
  async () => {
    runDatabaseIdentityCheck();

    const admin = createClient(supabaseUrl, serviceRoleKey, createClientOptions());
    const anonymous = createClient(supabaseUrl, anonKey, createClientOptions());
    const runId = randomUUID();
    const email = `setup.student.${runId}@example.test`;
    const adminEmail = `setup.admin.${runId}@example.test`;
    const password = `Pkm-${randomUUID()}-Aa1!`;
    const adminPassword = `Pkm-${randomUUID()}-Aa1!`;
    const studentIdNumber = `IT-${runId.slice(0, 8)}`;
    const programId = randomUUID();
    const programCode = `IT_${runId.slice(0, 8)}`;
    const officialRecordId = randomUUID();
    let studentProfileId: string | null = null;
    let adminProfileId: string | null = null;
    let studentClient: SupabaseClient | null = null;
    let adminClient: SupabaseClient | null = null;
    let newPasswordClient: SupabaseClient | null = null;
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let createdProgram = false;
    let createdOfficialRecord = false;
    let testError: unknown;

    try {
      const { error: programError } = await admin.from("programs").insert({
        id: programId,
        name: "Disposable account setup integration program",
        code: programCode
      });
      assert.equal(programError, null, "the run-specific program fixture must be created");
      createdProgram = true;

      const { error: recordError } = await admin.from("official_student_records").insert({
        id: officialRecordId,
        student_id_number: studentIdNumber,
        first_name: "Integration",
        last_name: "Student",
        email,
        program_id: programId,
        year_level: "1st Year",
        student_type: "Incoming 1st Year Student",
        gender_sex: "Female",
        enrollment_status: "NOT ENROLLED"
      });
      assert.equal(recordError, null, "the run-specific official record must be created");
      createdOfficialRecord = true;

      const emailEnvironment: EmailEnvironment = {
        fromAddress: undefined,
        gmailUser: undefined,
        gmailAppPassword: undefined,
        enabled: true,
        deliveryRequested: true,
        configurationError: false
      };
      const registration = await performStudentRegistrationService(
        admin,
        {
          officialRecordId,
          studentIdNumber,
          firstName: "Integration",
          lastName: "Student",
          email,
          programId,
          yearLevel: "1st Year",
          studentType: "Incoming 1st Year Student"
        },
        emailEnvironment
      );
      assert.equal(registration.success, true, "existing registration workflow must create the SETUP account");

      studentProfileId = await findAuthUserIdByEmail(admin, email);
      assert.ok(studentProfileId, "the run-specific student Auth account must be locatable for scoped cleanup");

      const { data: studentProfile, error: studentProfileError } = await admin
        .from("profiles")
        .select("id, role, account_status")
        .eq("email", email)
        .single();
      assert.equal(studentProfileError, null);
      assert.equal(studentProfile.id, studentProfileId);
      assert.equal(studentProfile.role, "student");
      assert.equal(studentProfile.account_status, "SETUP");

      const setupLink = await generateStudentAccountSetupLink(admin, email);
      const setupUrl = new URL(setupLink);
      assert.equal(setupUrl.origin, appBaseUrl);
      assert.equal(setupUrl.pathname, "/auth/callback");
      assert.equal(setupUrl.searchParams.get("type"), "magiclink");
      assert.ok(setupUrl.searchParams.get("token_hash"));

      const unauthenticatedResult = await completeStudentAccountSetup(
        createServerClient(supabaseUrl, anonKey, {
          cookies: { getAll: () => [], setAll: () => undefined }
        }),
        password
      );
      assert.deepEqual(unauthenticatedResult, { outcome: "unauthorized" });

      const adminAuth = await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        app_metadata: { role: "admin" },
        user_metadata: { first_name: "Integration", last_name: "Admin" }
      });
      assert.equal(adminAuth.error, null, "the run-specific administrative Auth account must be created");
      assert.ok(adminAuth.data.user);
      adminProfileId = adminAuth.data.user.id;

      const { error: adminProfileError } = await admin.from("profiles").insert({
        id: adminProfileId,
        role: "admin",
        first_name: "Integration",
        last_name: "Admin",
        email: adminEmail,
        account_status: "ACTIVE"
      });
      assert.equal(adminProfileError, null);

      adminClient = createClient(supabaseUrl, anonKey, createClientOptions());
      const adminSignIn = await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      assert.equal(adminSignIn.error, null, "the actual Supabase Auth admin session must be created");

      const adminSetup = await completeStudentAccountSetup(adminClient, password);
      assert.deepEqual(adminSetup, { outcome: "already_active", role: "admin" });

      const adminCompletion = await adminClient.rpc("complete_student_account_setup");
      assert.equal(adminCompletion.error, null);
      assert.equal(adminCompletion.data?.[0]?.outcome, "invalid_setup");

      const anonymousCompletion = await anonymous.rpc("complete_student_account_setup");
      assert.ok(anonymousCompletion.error, "anonymous clients must not execute account activation");

      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      const page = await context.newPage();
      const confirmationCookieHeader = new Promise<string>((resolve) => {
        page.on("request", (request) => {
          if (new URL(request.url()).pathname === "/auth/confirm-setup") {
            void request.allHeaders().then((headers) => resolve(headers.cookie ?? ""));
          }
        });
      });
      const confirmationResponse = await page.goto(setupLink, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/auth/confirm-setup", { timeout: 20_000 });
      assert.equal(new URL(page.url()).searchParams.has("token_hash"), false);

      const continueSetupButton = page.getByRole("button", { name: "Continue Account Setup" });
      const setupClaimCookie = (await context.cookies(appBaseUrl)).find(({ name }) => name === SETUP_CLAIM_COOKIE_NAME);
      assert.equal(
        await continueSetupButton.count(),
        1,
        `The confirmation page must preserve its one-time setup claim. ${JSON.stringify({
          pageText: (await page.locator("body").innerText()).slice(0, 500),
          confirmationPath: new URL(page.url()).pathname,
          confirmationQueryKeys: [...new URL(page.url()).searchParams.keys()],
          confirmationResponseUrl: confirmationResponse?.url(),
          confirmationRequestUrl: confirmationResponse?.request().url(),
          claimCookieSentToConfirmation: /(?:^|;\s*)pkm_setup_claim=/.test(await confirmationCookieHeader),
          claimCookiePresent: Boolean(setupClaimCookie),
          claimCookieSecure: setupClaimCookie?.secure ?? null,
          claimCookieDomain: setupClaimCookie?.domain ?? null,
          claimCookiePath: setupClaimCookie?.path ?? null,
          claimParsesInTestProcess: parseSetupClaim(setupClaimCookie?.value) !== null
        })}`
      );
      const verificationResponsePromise = page.waitForResponse(
        (response) => new URL(response.url()).pathname === "/auth/confirm-setup/verify",
        { timeout: 25_000 }
      ).catch(() => null);
      await continueSetupButton.click();
      const verificationResponse = await verificationResponsePromise;
      const verificationLocation = verificationResponse?.headers().location;
      const verificationLocationPath = verificationLocation
        ? new URL(verificationLocation, page.url()).pathname
        : null;
      assert.ok(
        verificationResponse,
        "The setup confirmation POST must reach the application. Current path: " + new URL(page.url()).pathname + "."
      );
      assert.equal(
        verificationResponse.status(),
        303,
        "The setup confirmation POST must redirect safely. " + JSON.stringify({
          status: verificationResponse.status(),
          locationPath: verificationLocationPath
        })
      );
      await page.waitForURL((url) => url.pathname === "/setup-account", { timeout: 20_000 });

      studentClient = await browserServerClient(context);
      const {
        data: { user: confirmedUser },
        error: confirmedUserError
      } = await studentClient.auth.getUser();
      assert.equal(confirmedUserError, null);
      assert.equal(confirmedUser?.id, studentProfile.id, "the session cookie must identify the claimed student");
      assert.equal(
        await page.locator("#password").count(),
        1,
        "A verified student setup session must show the password form. " + JSON.stringify({
          setupError: new URL(page.url()).searchParams.get("error"),
          setupPageText: (await page.locator("body").innerText()).replace(email, "[redacted]").slice(0, 500),
          browserCookieNames: (await context.cookies(appBaseUrl)).map(({ name }) => name)
        })
      );

      const directProfileUpdate = await studentClient
        .from("profiles")
        .update({ role: "admin", account_status: "ACTIVE" })
        .eq("id", studentProfile.id)
        .select("id");
      assert.ok(
        directProfileUpdate.error || (directProfileUpdate.data?.length ?? 0) === 0,
        "student cannot activate or promote the profile directly"
      );

      const { data: unchangedProfile, error: unchangedProfileError } = await admin
        .from("profiles")
        .select("role, account_status")
        .eq("id", studentProfile.id)
        .single();
      assert.equal(unchangedProfileError, null);
      assert.deepEqual(unchangedProfile, { role: "student", account_status: "SETUP" });

      await page.locator("#password").fill(password);
      await page.locator("#confirm_password").fill(password);
      await page.getByRole("button", { name: "Set Password & Complete Setup" }).click();
      await page.waitForURL((url) => url.pathname === "/student/dashboard", { timeout: 30_000 });
      await page.getByText("Student Profile", { exact: true }).waitFor({ state: "visible" });

      const {
        data: { user: dashboardUser },
        error: dashboardUserError
      } = await (await browserServerClient(context)).auth.getUser();
      assert.equal(dashboardUserError, null);
      assert.equal(dashboardUser?.id, studentProfile.id, "the authenticated browser session must survive the redirect");

      const { data: activeProfile, error: activeProfileError } = await admin
        .from("profiles")
        .select("role, account_status")
        .eq("id", studentProfile.id)
        .single();
      assert.equal(activeProfileError, null);
      assert.deepEqual(activeProfile, { role: "student", account_status: "ACTIVE" });

      const repeatedActivation = await (await browserServerClient(context)).rpc("complete_student_account_setup");
      assert.equal(repeatedActivation.error, null);
      assert.equal(repeatedActivation.data?.[0]?.outcome, "invalid_setup");

      await page.getByRole("button", { name: "Log out", exact: true }).click();
      await page.waitForURL((url) => ["/", "/login"].includes(url.pathname), { timeout: 20_000 });
      await page.goto(appBaseUrl + "/login", { waitUntil: "domcontentloaded" });
      await page.getByLabel("Email Address").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Login", exact: true }).click();
      await page.waitForURL((url) => url.pathname === "/student/dashboard", { timeout: 20_000 });
      await page.getByText("Student Profile", { exact: true }).waitFor({ state: "visible" });

      newPasswordClient = createClient(supabaseUrl, anonKey, createClientOptions());
      const newPasswordSignIn = await newPasswordClient.auth.signInWithPassword({ email, password });
      assert.equal(newPasswordSignIn.error, null, "the new password must authenticate through Supabase Auth");
      assert.equal(newPasswordSignIn.data.user.id, studentProfile.id);
      const dashboardStudent = await newPasswordClient.from("students").select("id, student_id_number").single();
      assert.equal(dashboardStudent.error, null, "the authenticated student must read their dashboard record");
      assert.equal(dashboardStudent.data.student_id_number, studentIdNumber);
      await newPasswordClient.auth.signOut();
      newPasswordClient = null;

      const replayContext = await browser.newContext();
      try {
        const replayPage = await replayContext.newPage();
        await replayPage.goto(setupLink, { waitUntil: "domcontentloaded" });
        await replayPage.waitForURL((url) => url.pathname === "/auth/confirm-setup", { timeout: 20_000 });
        await replayPage.getByRole("button", { name: "Continue Account Setup" }).click();
        await replayPage.waitForURL(
          (url) => url.pathname === "/setup-account" && url.searchParams.get("error") === "verification_failed",
          { timeout: 20_000 }
        );
      } finally {
        await replayContext.close();
      }
    } catch (error) {
      testError = error;
      throw error;
    } finally {
      const cleanupErrors: unknown[] = [];
      const cleanup = async (operation: () => Promise<unknown>) => {
        try {
          await operation();
        } catch {
          cleanupErrors.push(new Error("A run-scoped fixture cleanup operation failed."));
        }
      };

      if (context) await cleanup(() => context!.close());
      if (browser) await cleanup(() => browser!.close());
      if (studentClient) await cleanup(() => studentClient!.auth.signOut());
      if (newPasswordClient) await cleanup(() => newPasswordClient!.auth.signOut());
      if (adminClient) await cleanup(() => adminClient!.auth.signOut());

      await cleanup(() => removeAccountFixture(admin, studentProfileId));
      await cleanup(() => removeAccountFixture(admin, adminProfileId));

      if (createdOfficialRecord) {
        await cleanup(async () => {
          const { error } = await admin.from("official_student_records").delete().eq("id", officialRecordId);
          if (error) throw new Error("Could not remove the run-specific official record.");
        });
      }
      if (createdProgram) {
        await cleanup(async () => {
          const { error } = await admin.from("programs").delete().eq("id", programId);
          if (error) throw new Error("Could not remove the run-specific program.");
        });
      }

      if (cleanupErrors.length > 0) {
        if (testError) console.error("student_account_setup_integration:scoped_cleanup_failed");
        else throw new Error("Run-scoped student account setup fixtures could not be fully cleaned up.");
      }
    }
  }
);
