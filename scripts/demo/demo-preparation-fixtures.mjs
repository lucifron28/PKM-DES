import { resolveDemoTerm } from "./demo-records.mjs";

export const DEMO_SHARED_PASSWORD = "Demo1234!";
export const DEMO_PREPARATION_CONFIRMATION = "PREPARE_PKM_DES_DEMO";
export const DEMO_ENVIRONMENT_VARIABLE = "PKM_DEMO_ENVIRONMENT";

export const DEMO_ACCOUNTS = Object.freeze([
  {
    key: "registrar",
    email: "pkmregistrarofficial@gmail.com",
    firstName: "PKM Demo",
    lastName: "Registrar",
    role: "admin",
    portalRole: "Registrar/Admin",
    officialRole: null,
    clearanceType: null
  },
  {
    key: "librarian",
    email: "pkm.demo.librarian@example.com",
    firstName: "Demo",
    lastName: "Librarian",
    role: "admin",
    portalRole: "Librarian",
    officialRole: "LIBRARIAN",
    clearanceType: "LIBRARY_CLEARANCE"
  },
  {
    key: "nurse",
    email: "pkm.demo.nurse@example.com",
    firstName: "Demo",
    lastName: "Nurse",
    role: "admin",
    portalRole: "Nurse",
    officialRole: "NURSE",
    clearanceType: "HEALTH_CLEARANCE"
  },
  {
    key: "program-chair",
    email: "pkm.demo.programchair@example.com",
    firstName: "Demo",
    lastName: "Program Chair",
    role: "admin",
    portalRole: "Program Chair",
    officialRole: "PROGRAM_CHAIR",
    clearanceType: "PROGRAM_CLEARANCE"
  },
  {
    key: "accountant",
    email: "pkm.demo.accountant@example.com",
    firstName: "Demo",
    lastName: "Accountant",
    role: "admin",
    portalRole: "Accountant",
    officialRole: "ACCOUNTANT",
    clearanceType: "ACCOUNTING_CLEARANCE"
  },
  {
    key: "dean",
    email: "pkm.demo.dean@example.com",
    firstName: "Demo",
    lastName: "Dean",
    role: "admin",
    portalRole: "Dean",
    officialRole: "DEAN",
    clearanceType: "DEAN_CLEARANCE"
  },
  {
    key: "student",
    email: "pkm.demo.student@example.com",
    firstName: "Maria Demo",
    lastName: "Student",
    role: "student",
    portalRole: "Student",
    officialRole: null,
    clearanceType: null
  }
]);

export const PRIMARY_DEMO_STUDENT = Object.freeze({
  key: "primary-student",
  email: "pkm.demo.student@example.com",
  studentIdNumber: "26-DEMO-001",
  firstName: "Maria Demo",
  lastName: "Student",
  programCode: "BSAIS",
  yearLevel: "1st Year",
  studentType: "Incoming 1st Year Student",
  genderSex: "Female",
  enrollmentStatus: "NOT ENROLLED"
});

export const DEMO_EMAILS = Object.freeze(DEMO_ACCOUNTS.map((account) => account.email));

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function accountForEmail(email) {
  const normalized = normalizeEmail(email);
  return DEMO_ACCOUNTS.find((account) => account.email === normalized) ?? null;
}

export function requireEnvironmentValue(name, value) {
  if (!String(value ?? "").trim()) {
    throw new Error(`${name} is required.`);
  }

  return String(value).trim();
}

export function readDemoPreparationConfiguration(environment = process.env, { requireMutationOptIn = true } = {}) {
  const url = requireEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL", environment.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY", environment.SUPABASE_SERVICE_ROLE_KEY);
  const targetEnvironment = requireEnvironmentValue(DEMO_ENVIRONMENT_VARIABLE, environment[DEMO_ENVIRONMENT_VARIABLE]);
  const projectRef = requireEnvironmentValue("PKM_DEMO_PROJECT_REF", environment.PKM_DEMO_PROJECT_REF).toLowerCase();
  const parsedUrl = new URL(url);
  const isLocalTarget = projectRef === "local";
  const expectedHost = isLocalTarget ? parsedUrl.hostname : `${projectRef}.supabase.co`;

  if (isLocalTarget && !["localhost", "127.0.0.1"].includes(parsedUrl.hostname.toLowerCase())) {
    throw new Error("PKM_DEMO_PROJECT_REF=local requires a localhost Supabase URL.");
  }
  if (isLocalTarget && parsedUrl.port !== "54321") {
    throw new Error("PKM_DEMO_PROJECT_REF=local requires the local Supabase port 54321.");
  }
  if (parsedUrl.protocol !== "https:" && !isLocalTarget) {
    throw new Error("Hosted demo preparation requires an HTTPS Supabase URL.");
  }

  if (parsedUrl.hostname.toLowerCase() !== expectedHost) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL does not match PKM_DEMO_PROJECT_REF.");
  }

  if (requireMutationOptIn) {
    if (String(environment.PKM_ALLOW_DEMO_SEED).toLowerCase() !== "true") {
      throw new Error("PKM_ALLOW_DEMO_SEED=true is required before demo data can be changed.");
    }
    if (environment.PKM_DEMO_CONFIRM !== DEMO_PREPARATION_CONFIRMATION) {
      throw new Error(`PKM_DEMO_CONFIRM must equal ${DEMO_PREPARATION_CONFIRMATION}.`);
    }
  }

  const password = environment.DEMO_ACCOUNT_PASSWORD?.trim() || DEMO_SHARED_PASSWORD;
  if (!password) {
    throw new Error("DEMO_ACCOUNT_PASSWORD must not be empty.");
  }

  return {
    url,
    serviceRoleKey,
    password,
    projectRef,
    targetEnvironment,
    targetHost: parsedUrl.host,
    term: resolveDemoTerm(environment)
  };
}

export function fullName(account) {
  return `${account.firstName} ${account.lastName}`.replace(/\s+/g, " ").trim();
}
