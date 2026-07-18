export function validateSmokeEnv(env) {
  try {
    const requiredVars = [
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
    ];

    for (const v of requiredVars) {
      if (!env[v] || typeof env[v] !== 'string' || env[v].trim() === '') {
        throw new Error(`smoke_required_variable_missing: ${v}`);
      }
    }

    if (env.SMOKE_WORKFLOW_CONFIRM !== 'RUN_PKM_DES_DISPOSABLE_SMOKE') {
      throw new Error('smoke_confirmation_missing');
    }

    if (env.DATABASE_PROVIDER !== 'supabase') {
      throw new Error('smoke_database_provider_invalid');
    }

    let baseUrl;
    try {
      baseUrl = new URL(env.SMOKE_BASE_URL);
    } catch {
      throw new Error('smoke_base_url_not_local');
    }

    if (baseUrl.protocol !== 'http:') {
      throw new Error('smoke_base_url_not_local');
    }

    const localHosts = ['localhost', '127.0.0.1', '[::1]'];
    if (!localHosts.includes(baseUrl.hostname)) {
      throw new Error('smoke_base_url_not_local');
    }

    let supabaseUrl;
    try {
      supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    } catch {
      throw new Error('smoke_supabase_url_invalid');
    }

    if (supabaseUrl.protocol !== 'https:') {
      throw new Error('smoke_supabase_url_invalid');
    }

    if (!supabaseUrl.hostname.endsWith('.supabase.co')) {
      throw new Error('smoke_supabase_url_invalid');
    }

    if (supabaseUrl.hostname !== env.SMOKE_EXPECTED_SUPABASE_HOST) {
      throw new Error('smoke_supabase_host_mismatch');
    }

    return { ok: true };
  } catch (err) {
    const message = err.message || 'smoke_validation_error_generic';
    return { ok: false, error: message };
  }
}
