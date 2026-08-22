export const REQUIRED_RUNTIME_VARIABLES = Object.freeze([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ACCOUNT_CLAIM_SECRET"
]);

export const LOCAL_OPERATOR_VARIABLES = Object.freeze([
  "DEMO_STUDENT_PASSWORD",
  "DEMO_RESET_CONFIRM",
  "DEMO_REGISTRAR_EMAIL",
  "PREVIEW_EXPECTED_SUPABASE_HOST",
  "PREVIEW_REGISTRAR_EMAIL",
  "PREVIEW_REGISTRAR_PASSWORD",
  "PREVIEW_CREDENTIALS_CONFIRM"
]);

const DEPLOYED_DEMO_ENVIRONMENTS = new Set(["preview", "demo"]);
const DEMO_RESET_CONFIRMATION = "RESET_PKM_DES_DEMO";

export class DeploymentEnvironmentError extends Error {
  constructor(stage, variableName = null) {
    super(variableName ? `${stage}: ${variableName}` : stage);
    this.name = "DeploymentEnvironmentError";
    this.stage = stage;
    this.variableName = variableName;
  }
}

function hasOwn(environment, key) {
  return Object.prototype.hasOwnProperty.call(environment, key);
}

function requireSecret(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new DeploymentEnvironmentError("required_runtime_variable_missing", key);
  }
  return value;
}

export function isVercelBuild(environment = process.env) {
  return hasOwn(environment, "VERCEL") && Boolean(environment.VERCEL);
}

export function validateSupabaseProjectUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new DeploymentEnvironmentError("required_runtime_variable_missing", "NEXT_PUBLIC_SUPABASE_URL");
  }
  if (value !== value.trim()) {
    throw new DeploymentEnvironmentError("invalid_supabase_url", "NEXT_PUBLIC_SUPABASE_URL");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new DeploymentEnvironmentError("invalid_supabase_url", "NEXT_PUBLIC_SUPABASE_URL");
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".supabase.co") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new DeploymentEnvironmentError("invalid_supabase_url", "NEXT_PUBLIC_SUPABASE_URL");
  }

  return url.toString();
}

function isExplicitDeployedDemoReset(environment, supabaseUrl) {
  if (environment.DEMO_RESET_ENABLED !== "true") return false;
  if (!DEPLOYED_DEMO_ENVIRONMENTS.has(String(environment.PKM_DEMO_ENVIRONMENT ?? "").trim().toLowerCase())) return false;
  if (environment.PKM_ALLOW_DEMO_SEED !== "true") return false;
  if (String(environment.DEMO_RESET_CONFIRM ?? "").trim() !== DEMO_RESET_CONFIRMATION) return false;

  const projectRef = String(environment.PKM_DEMO_PROJECT_REF ?? "").trim().toLowerCase();
  if (!projectRef) return false;

  return new URL(supabaseUrl).hostname.toLowerCase() === `${projectRef}.supabase.co`;
}

export function validateVercelRuntimeEnvironment(environment = process.env) {
  if (!isVercelBuild(environment)) return { skipped: true };

  if (environment.DATABASE_PROVIDER !== "supabase") {
    throw new DeploymentEnvironmentError("invalid_database_provider", "DATABASE_PROVIDER");
  }

  const url = validateSupabaseProjectUrl(requireSecret(environment, "NEXT_PUBLIC_SUPABASE_URL"));
  const anonKey = requireSecret(environment, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requireSecret(environment, "SUPABASE_SERVICE_ROLE_KEY");
  const accountClaimSecret = requireSecret(environment, "ACCOUNT_CLAIM_SECRET");
  const demoResetIsExplicitlyScoped = isExplicitDeployedDemoReset(environment, url);

  for (const key of LOCAL_OPERATOR_VARIABLES) {
    if (hasOwn(environment, key) && !(key === "DEMO_RESET_CONFIRM" && demoResetIsExplicitlyScoped)) {
      throw new DeploymentEnvironmentError("local_operator_variable_present", key);
    }
  }

  if (anonKey === serviceRoleKey) {
    throw new DeploymentEnvironmentError("supabase_keys_must_differ");
  }
  if (accountClaimSecret.length < 32) {
    throw new DeploymentEnvironmentError("account_claim_secret_too_short", "ACCOUNT_CLAIM_SECRET");
  }
  if (environment.NEXT_PUBLIC_ENABLE_STUB_PAGES === "true") {
    throw new DeploymentEnvironmentError("stub_pages_must_be_disabled", "NEXT_PUBLIC_ENABLE_STUB_PAGES");
  }

  return { skipped: false, provider: "supabase", url };
}

export function validateProductionEnvironment(environment = process.env) {
  const provider = environment.DATABASE_PROVIDER ?? "supabase";
  if (provider !== "supabase" && provider !== "sqlite") {
    throw new DeploymentEnvironmentError("invalid_database_provider", "DATABASE_PROVIDER");
  }
  if ((environment.NODE_ENV === "production" || isVercelBuild(environment)) && provider === "sqlite") {
    throw new DeploymentEnvironmentError("sqlite_not_deployable", "DATABASE_PROVIDER");
  }
  if (provider === "supabase") {
    validateSupabaseProjectUrl(requireSecret(environment, "NEXT_PUBLIC_SUPABASE_URL"));
    const anonKey = requireSecret(environment, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = requireSecret(environment, "SUPABASE_SERVICE_ROLE_KEY");
    const accountClaimSecret = requireSecret(environment, "ACCOUNT_CLAIM_SECRET");
    if (anonKey === serviceRoleKey) throw new DeploymentEnvironmentError("supabase_keys_must_differ");
    if (accountClaimSecret.length < 32) throw new DeploymentEnvironmentError("account_claim_secret_too_short", "ACCOUNT_CLAIM_SECRET");
  }
  return { provider };
}

export function formatDeploymentEnvironmentError(error) {
  if (error instanceof DeploymentEnvironmentError) {
    return error.variableName ? `${error.stage}: ${error.variableName}` : error.stage;
  }
  return "deployment_environment_validation_failed";
}
