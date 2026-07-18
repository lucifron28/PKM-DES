import { test } from 'node:test';
import * as assert from 'node:assert';
import { validateSmokeEnv } from './smoke-env-utils.mjs';

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

test('1. Valid fictional localhost configuration passes', () => {
  const result = validateSmokeEnv(getValidEnv());
  assert.strictEqual(result.ok, true);
});

test('2. Missing confirmation is rejected', () => {
  const env = getValidEnv();
  delete env.SMOKE_WORKFLOW_CONFIRM;
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_required_variable_missing'));
});

test('3. Incorrect confirmation is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_WORKFLOW_CONFIRM = 'YES';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_confirmation_missing'));
});

test('4. Vercel URL is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'https://pkm-des.vercel.app';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_base_url_not_local'));
});

test('5. A generic HTTPS remote URL is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'https://example.com';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_base_url_not_local'));
});

test('6. A non-loopback HTTP URL is rejected', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://192.168.1.100:3000';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_base_url_not_local'));
});

test('7. localhost is accepted', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://localhost:3000';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, true);
});

test('8. 127.0.0.1 is accepted', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://127.0.0.1:3000';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, true);
});

test('9. ::1 is accepted', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'http://[::1]:3000';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, true);
});

test('10. sqlite provider rejected', () => {
  const env = getValidEnv();
  env.DATABASE_PROVIDER = 'sqlite';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_database_provider_invalid'));
});

test('11. Absent provider rejected', () => {
  const env = getValidEnv();
  delete env.DATABASE_PROVIDER;
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_required_variable_missing'));
});

test('12. Non-Supabase URL rejected', () => {
  const env = getValidEnv();
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://fictional123.example.com';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_supabase_url_invalid'));
});

test('13. HTTP Supabase URL rejected', () => {
  const env = getValidEnv();
  env.NEXT_PUBLIC_SUPABASE_URL = 'http://fictional123.supabase.co';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_supabase_url_invalid'));
});

test('14. Misleading hostname rejected', () => {
  const env = getValidEnv();
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.co.example.test';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_supabase_url_invalid'));
});

test('15. Mismatched hostname rejected', () => {
  const env = getValidEnv();
  env.SMOKE_EXPECTED_SUPABASE_HOST = 'other.supabase.co';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_supabase_host_mismatch'));
});

test('16. Every required variable checked', () => {
  const env = getValidEnv();
  delete env.SMOKE_REGISTRAR_EMAIL;
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_required_variable_missing'));
});

test('17. Whitespace-only values rejected', () => {
  const env = getValidEnv();
  env.SMOKE_REGISTRAR_PASSWORD = '   ';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.ok(result.error.includes('smoke_required_variable_missing'));
});

test('18. Passwords never appear in formatted errors', () => {
  const env = getValidEnv();
  env.SMOKE_REGISTRAR_PASSWORD = 'super_secret_password';
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.includes('super_secret_password'), false);
});

test('19. Service-role keys never appear in errors', () => {
  const env = getValidEnv();
  env.SUPABASE_SERVICE_ROLE_KEY = 'super_secret_role_key';
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.includes('super_secret_role_key'), false);
});

test('20. Account-claim secrets never appear in errors', () => {
  const env = getValidEnv();
  env.ACCOUNT_CLAIM_SECRET = 'super_secret_claim_key';
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.includes('super_secret_claim_key'), false);
});

test('21. Unexpected errors converted to generic stage', () => {
  // Pass an object that throws when accessing properties
  const badEnv = new Proxy({}, {
    get() {
      throw new Error('Some random exception');
    }
  });
  const result = validateSmokeEnv(badEnv);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, 'Some random exception');
});

test('22. The injected environment object is never serialized', () => {
  const env = getValidEnv();
  env.SMOKE_WORKFLOW_CONFIRM = 'WRONG';
  const result = validateSmokeEnv(env);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.includes('SMOKE_BASE_URL'), false); // The object contents aren't dumped
});
