import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { validateSmokeEnv, SmokeEnvironmentError } from './smoke-env-utils.mjs';

function defaultRunVerifier(env) {
  const projectRoot = process.cwd();
  const verifierPath = path.resolve(projectRoot, 'scripts/demo/verify-demo-data.mjs');
  const result = spawnSync('node', [verifierPath], {
    cwd: projectRoot,
    stdio: 'pipe',
    env: { ...process.env, ...env }
  });
  return result.status === 0;
}

export function checkPreconditions(environment = process.env, runVerifier = defaultRunVerifier) {
  let validation;
  try {
    validation = validateSmokeEnv(environment);
  } catch (err) {
    throw err;
  }

  // Ensure normalized target URL is the validated local SMOKE_BASE_URL
  const rawBaseUrl = environment.SMOKE_BASE_URL;
  if (!rawBaseUrl) {
    throw new SmokeEnvironmentError('smoke_required_variable_missing', 'SMOKE_BASE_URL');
  }

  // Run the canonical demo verifier
  let ok;
  try {
    ok = runVerifier(environment);
  } catch {
    ok = false;
  }

  if (!ok) {
    throw new SmokeEnvironmentError('smoke_demo_state_verification_failed');
  }

  return {
    baseUrl: validation.baseUrl,
    supabaseHost: validation.supabaseHost,
    provider: validation.provider,
  };
}
