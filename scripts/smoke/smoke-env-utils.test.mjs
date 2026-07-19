import { test } from 'node:test';
import * as assert from 'node:assert';
import { validateSmokeEnv, formatSmokeEnvironmentError, REQUIRED_SMOKE_VARIABLES } from './smoke-env-utils.mjs';

function getValidEnv() {
  return {
    SMOKE_BASE_URL: 'http://127.0.0.1:3000',
    SMOKE_EXPECTED_SUPABASE_HOST: 'fictional123.supabase.co',
    SMOKE_WORKFLOW_CONFIRM: 'RUN_PKM_DES_DISPOSABLE_SMOKE',
    SMOKE_REGISTRAR_EMAIL: 'registrar@fictional.test',
    SMOKE_REGISTRAR_PASSWORD: 'password123',
    SMOKE_NEW_STUDENT_PASSWORD: 'password123',
    NEXT_PUBLIC_SUPABASE_URL: 'https://fictional123.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_key_123',
    SUPABASE_SERVICE_ROLE_KEY: 'service_role_123',
    ACCOUNT_CLAIM_SECRET: 'claim_secret_123',
    DATABASE_PROVIDER: 'supabase',
  };
}

function expectError(env, expectedStage, expectedVar) {
  try {
    validateSmokeEnv(env);
    assert.fail('Expected validation to fail');
  } catch (err) {
    assert.strictEqual(err.stage, expectedStage);
    if (expectedVar) {
      assert.strictEqual(err.variableName, expectedVar);
    }
  }
}

test('1. Valid fictional localhost configuration passes', () => {
  const result = validateSmokeEnv(getValidEnv());
  assert.strictEqual(result.skipped, false);
  assert.strictEqual(result.provider, 'supabase');
});

test('2. Missing confirmation is rejected', () => {
  const env = getValidEnv();
  delete env.SMOKE_WORKFLOW_CONFIRM;
  expectError(env, 'smoke_required_variable_missing', 'SMOKE_WORKFLOW_CONFIRM');
});

test('3. Incorrect confirmation is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_WORKFLOW_CONFIRM = 'YES';
  expectError(env, 'smoke_confirmation_missing', 'SMOKE_WORKFLOW_CONFIRM');
});

test('4. Vercel URL is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'https://pkm-des.vercel.app';
  expectError(env, 'smoke_base_url_not_local', 'SMOKE_BASE_URL');
});

test('5. A generic HTTPS remote URL is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'https://example.com';
  expectError(env, 'smoke_base_url_not_local', 'SMOKE_BASE_URL');
});

test('6. A non-loopback HTTP URL is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://192.168.1.100:3000';
  expectError(env, 'smoke_base_url_not_local', 'SMOKE_BASE_URL');
});

test('7. localhost is accepted', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://localhost:3000';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.skipped, false);
});

test('8. 127.0.0.1 is accepted', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://127.0.0.1:3000';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.skipped, false);
});

test('9. ::1 is accepted', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://[::1]:3000';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.skipped, false);
});

test('10. sqlite provider rejected', () => {
  const env = getValidEnv();
  env.DATABASE_PROVIDER = 'sqlite';
  expectError(env, 'smoke_database_provider_invalid', 'DATABASE_PROVIDER');
});

test('11. Absent provider rejected', () => {
  const env = getValidEnv();
  delete env.DATABASE_PROVIDER;
  expectError(env, 'smoke_required_variable_missing', 'DATABASE_PROVIDER');
});

test('12. Non-Supabase URL rejected', () => {
  const env = getValidEnv();
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://fictional123.example.com';
  expectError(env, 'smoke_supabase_url_invalid', 'NEXT_PUBLIC_SUPABASE_URL');
});

test('13. HTTP Supabase URL rejected', () => {
  const env = getValidEnv();
  env.NEXT_PUBLIC_SUPABASE_URL = 'http://fictional123.supabase.co';
  expectError(env, 'smoke_supabase_url_invalid', 'NEXT_PUBLIC_SUPABASE_URL');
});

test('14. Misleading hostname rejected', () => {
  const env = getValidEnv();
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.co.example.test';
  expectError(env, 'smoke_supabase_url_invalid', 'NEXT_PUBLIC_SUPABASE_URL');
});

test('15. Mismatched hostname rejected', () => {
  const env = getValidEnv();
  env.SMOKE_EXPECTED_SUPABASE_HOST = 'other.supabase.co';
  expectError(env, 'smoke_supabase_host_mismatch', 'SMOKE_EXPECTED_SUPABASE_HOST');
});

test('16. Every required variable checked', () => {
  for (const v of REQUIRED_SMOKE_VARIABLES) {
    const env = getValidEnv();
    delete env[v];
    expectError(env, 'smoke_required_variable_missing', v);
  }
});

test('17. Whitespace-only values rejected', () => {
  const env = getValidEnv();
  env.SMOKE_REGISTRAR_PASSWORD = '   ';
  expectError(env, 'smoke_required_variable_missing', 'SMOKE_REGISTRAR_PASSWORD');
});

test('18. Passwords never appear in formatted errors', () => {
  const env = getValidEnv();
  env.SMOKE_REGISTRAR_PASSWORD = 'super_secret_password';
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  try {
    validateSmokeEnv(env);
  } catch (err) {
    const formatted = formatSmokeEnvironmentError(err);
    assert.strictEqual(formatted.includes('super_secret_password'), false);
  }
});

test('19. Service-role keys never appear in errors', () => {
  const env = getValidEnv();
  env.SUPABASE_SERVICE_ROLE_KEY = 'super_secret_role_key';
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  try {
    validateSmokeEnv(env);
  } catch (err) {
    const formatted = formatSmokeEnvironmentError(err);
    assert.strictEqual(formatted.includes('super_secret_role_key'), false);
  }
});

test('20. Account-claim secrets never appear in errors', () => {
  const env = getValidEnv();
  env.ACCOUNT_CLAIM_SECRET = 'super_secret_claim_key';
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  try {
    validateSmokeEnv(env);
  } catch (err) {
    const formatted = formatSmokeEnvironmentError(err);
    assert.strictEqual(formatted.includes('super_secret_claim_key'), false);
  }
});

test('21. Unexpected errors converted to generic stage', () => {
  const err = new Error('fictional-sensitive-detail');
  const formatted = formatSmokeEnvironmentError(err);
  assert.strictEqual(formatted, 'smoke_environment_validation_failed');
  assert.strictEqual(formatted.includes('fictional-sensitive-detail'), false);
  assert.strictEqual(formatted.includes('password'), false);
  assert.strictEqual(formatted.includes('anon_key'), false);
  assert.strictEqual(formatted.includes('service_role'), false);
  assert.strictEqual(formatted.includes('claim_secret'), false);
  assert.strictEqual(formatted.includes('supabase.co'), false);
  assert.strictEqual(formatted.includes('Object'), false);
  assert.strictEqual(formatted.includes('stack'), false);
});

test('22. The injected environment object is never serialized', () => {
  const env = getValidEnv();
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  try {
    validateSmokeEnv(env);
  } catch (err) {
    const formatted = formatSmokeEnvironmentError(err);
    assert.strictEqual(formatted.includes('SMOKE_BASE_URL'), false); // The object contents aren't dumped, only the stage/variableName
  }
});

test('23. Direct execution of workflow setup rejected when confirmation is absent', () => {
  const env = getValidEnv();
  delete env.SMOKE_WORKFLOW_CONFIRM;
  expectError(env, 'smoke_required_variable_missing', 'SMOKE_WORKFLOW_CONFIRM');
});

test('24. Direct execution of workflow setup rejected when base URL is remote', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'https://pkm-des.vercel.app';
  expectError(env, 'smoke_base_url_not_local', 'SMOKE_BASE_URL');
});

test('25. Direct execution of workflow setup rejected when expected Supabase hostname does not match', () => {
  const env = getValidEnv();
  env.SMOKE_EXPECTED_SUPABASE_HOST = 'mismatched.supabase.co';
  expectError(env, 'smoke_supabase_host_mismatch', 'SMOKE_EXPECTED_SUPABASE_HOST');
});
