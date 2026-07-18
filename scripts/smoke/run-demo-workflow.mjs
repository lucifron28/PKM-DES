import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateSmokeEnv } from './smoke-env-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

function runCommand(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  return result.status;
}

function main() {
  const env = process.env;
  const validation = validateSmokeEnv(env);

  if (!validation.ok) {
    console.error(`Smoke environment validation failed at stage: ${validation.error}`);
    console.error('Please ensure you are using a separately authorized disposable smoke project and have set SMOKE_WORKFLOW_CONFIRM=RUN_PKM_DES_DISPOSABLE_SMOKE.');
    process.exit(1);
  }

  console.log('Smoke environment validation passed. Running canonical demo verifier...');

  const verifierStatus = runCommand('node', ['scripts/demo/verify-demo-data.mjs'], env);
  if (verifierStatus !== 0) {
    console.error('Canonical demo verification failed. Aborting smoke test.');
    console.error('Please run the demo reset script against your disposable project before running the mutating workflow.');
    process.exit(1);
  }

  console.log('Demo verifier passed. Starting Playwright smoke workflow...');

  const playwrightStatus = runCommand('npx', [
    'playwright',
    'test',
    'tests/smoke/demo-workflow.spec.ts'
  ], env);

  if (playwrightStatus !== 0) {
    console.error('Smoke workflow failed or was interrupted.');
    console.error('The database and Auth state may be partially mutated.');
    console.error('Please run the guarded demo reset (e.g. npm run demo:reset) before retrying.');
  }

  process.exit(playwrightStatus ?? 1);
}

main();
