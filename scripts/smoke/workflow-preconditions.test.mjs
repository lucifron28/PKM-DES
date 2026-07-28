import { test } from 'node:test';
import * as assert from 'node:assert';
import { checkPreconditions } from './workflow-preconditions.mjs';
import { formatSmokeEnvironmentError } from './smoke-env-utils.mjs';

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

test('1. Missing smoke confirmation prevents starting', () => {
  const env = getValidEnv();
  delete env.SMOKE_WORKFLOW_CONFIRM;
  assert.throws(() => {
    checkPreconditions(env, () => true);
  }, (err) => {
    return err.stage === 'smoke_required_variable_missing' && err.variableName === 'SMOKE_WORKFLOW_CONFIRM';
  });
});

test('2. A remote base URL prevents starting', () => {
  const env = getValidEnv();
  env.SMOKE_BASE_URL = 'https://pkm-des.vercel.app';
  assert.throws(() => {
    checkPreconditions(env, () => true);
  }, (err) => {
    return err.stage === 'smoke_base_url_not_local';
  });
});

test('3. A Supabase hostname mismatch prevents starting', () => {
  const env = getValidEnv();
  env.SMOKE_EXPECTED_SUPABASE_HOST = 'mismatch.supabase.co';
  assert.throws(() => {
    checkPreconditions(env, () => true);
  }, (err) => {
    return err.stage === 'smoke_supabase_host_mismatch';
  });
});

test('4. Failed canonical demo verification prevents starting', () => {
  const env = getValidEnv();
  assert.throws(() => {
    checkPreconditions(env, () => false);
  }, (err) => {
    return err.stage === 'smoke_demo_state_verification_failed';
  });
});

test('5. Unexpected verifier failures become one sanitized stage', () => {
  const env = getValidEnv();
  assert.throws(() => {
    checkPreconditions(env, () => {
      throw new Error('Fictional internal DB connection timeout with credential: my_db_secret_pass');
    });
  }, (err) => {
    return err.stage === 'smoke_demo_state_verification_failed';
  });
});

test('6. Verifier output is not copied into the formatted error', () => {
  const env = getValidEnv();
  try {
    checkPreconditions(env, () => {
      throw new Error('Fictional sensitive database detail');
    });
    assert.fail('Expected to throw');
  } catch (err) {
    const formatted = formatSmokeEnvironmentError(err);
    assert.strictEqual(formatted, 'smoke_demo_state_verification_failed');
    assert.ok(!formatted.includes('sensitive'));
  }
});

test('7. The successful precondition result contains no credentials', () => {
  const env = getValidEnv();
  const result = checkPreconditions(env, () => true);
  assert.deepStrictEqual(Object.keys(result).sort(), ['baseUrl', 'provider', 'supabaseHost'].sort());
  assert.ok(!result.baseUrl.includes('password'));
  assert.ok(!result.supabaseHost.includes('secret'));
});

test('8. Direct Playwright invocation with smoke variables absent fails before browser navigation', () => {
  const env = {};
  assert.throws(() => {
    checkPreconditions(env, () => true);
  }, (err) => {
    return err.stage === 'smoke_required_variable_missing';
  });
});

test('9. Direct invocation cannot bypass canonical demo verification', () => {
  const env = getValidEnv();
  assert.throws(() => {
    checkPreconditions(env, () => false);
  }, (err) => {
    return err.stage === 'smoke_demo_state_verification_failed';
  });
});
