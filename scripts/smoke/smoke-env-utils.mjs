export const REQUIRED_SMOKE_VARIABLES = Object.freeze([
  'SMOKE_BASE_URL',
  'SMOKE_EXPECTED_SUPABASE_HOST',
  'SMOKE_WORKFLOW_CONFIRM',
  'SMOKE_REGISTRAR_EMAIL',
  'SMOKE_REGISTRAR_PASSWORD',
  'SMOKE_NEW_STUDENT_PASSWORD',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ACCOUNT_CLAIM_SECRET',
  'DATABASE_PROVIDER',
]);

export class SmokeEnvironmentError extends Error {
  constructor(stage, variableName = null) {
    super(variableName ? `${stage}: ${variableName}` : stage);
    this.name = 'SmokeEnvironmentError';
    this.stage = stage;
    this.variableName = variableName;
  }
}

function requireSecret(environment, key) {
  const value = environment[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new SmokeEnvironmentError('smoke_required_variable_missing', key);
  }
  return value;
}

export function validateSmokeEnv(environment = process.env) {
  for (const v of REQUIRED_SMOKE_VARIABLES) {
    requireSecret(environment, v);
  }

  if (environment.SMOKE_WORKFLOW_CONFIRM !== 'RUN_PKM_DES_DISPOSABLE_SMOKE') {
    throw new SmokeEnvironmentError('smoke_confirmation_missing', 'SMOKE_WORKFLOW_CONFIRM');
  }

  if (environment.DATABASE_PROVIDER !== 'supabase') {
    throw new SmokeEnvironmentError('smoke_database_provider_invalid', 'DATABASE_PROVIDER');
  }

  let baseUrl;
  try {
    baseUrl = new URL(environment.SMOKE_BASE_URL);
  } catch {
    throw new SmokeEnvironmentError('smoke_base_url_not_local', 'SMOKE_BASE_URL');
  }

  if (baseUrl.protocol !== 'http:') {
    throw new SmokeEnvironmentError('smoke_base_url_not_local', 'SMOKE_BASE_URL');
  }

  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  if (!localHosts.includes(baseUrl.hostname)) {
    throw new SmokeEnvironmentError('smoke_base_url_not_local', 'SMOKE_BASE_URL');
  }

  let supabaseUrl;
  try {
    supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new SmokeEnvironmentError('smoke_supabase_url_invalid', 'NEXT_PUBLIC_SUPABASE_URL');
  }

  if (supabaseUrl.protocol !== 'https:' || !supabaseUrl.hostname.endsWith('.supabase.co')) {
    throw new SmokeEnvironmentError('smoke_supabase_url_invalid', 'NEXT_PUBLIC_SUPABASE_URL');
  }

  if (supabaseUrl.hostname !== environment.SMOKE_EXPECTED_SUPABASE_HOST) {
    throw new SmokeEnvironmentError('smoke_supabase_host_mismatch', 'SMOKE_EXPECTED_SUPABASE_HOST');
  }

  return {
    skipped: false,
    baseUrl: baseUrl.toString().replace(/\/$/, ''), // Strip trailing slash for playwright
    supabaseHost: supabaseUrl.hostname,
    provider: 'supabase'
  };
}

export function formatSmokeEnvironmentError(error) {
  if (error instanceof SmokeEnvironmentError) {
    return error.variableName ? `${error.stage}: ${error.variableName}` : error.stage;
  }
  return 'smoke_environment_validation_failed';
}
