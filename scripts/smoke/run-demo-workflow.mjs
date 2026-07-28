import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { checkPreconditions } from './workflow-preconditions.mjs';
import { formatSmokeEnvironmentError } from './smoke-env-utils.mjs';

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
  try {
    checkPreconditions(env);
  } catch (err) {
    console.error(`Smoke environment validation failed at stage: ${formatSmokeEnvironmentError(err)}`);
    console.error('Please ensure you are using a separately authorized disposable smoke project and have set SMOKE_WORKFLOW_CONFIRM=RUN_PKM_DES_DISPOSABLE_SMOKE.');
    process.exit(1);
  }

  console.log('Preconditions check passed. Starting Playwright smoke workflow...');

  const playwrightCli = path.resolve(projectRoot, 'node_modules/@playwright/test/cli.js');
  const useLocalCli = fs.existsSync(playwrightCli);

  const command = useLocalCli
    ? process.execPath
    : (process.platform === 'win32' ? 'npx.cmd' : 'npx');

  const args = useLocalCli
    ? [playwrightCli, 'test', 'tests/smoke/demo-workflow.spec.ts']
    : ['playwright', 'test', 'tests/smoke/demo-workflow.spec.ts'];

  const playwrightStatus = runCommand(command, args, env);

  if (playwrightStatus !== 0) {
    console.error('Smoke workflow failed or was interrupted.');
    console.error('The database and Auth state may be partially mutated.');
    console.error('Please run the guarded demo reset (e.g. npm run demo:reset) before retrying.');
  }

  process.exit(playwrightStatus ?? 1);
}

main();
