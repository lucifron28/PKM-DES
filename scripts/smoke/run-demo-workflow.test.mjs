import { test } from 'node:test';
import * as assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

test('runner fails safely when smoke variables are absent without ReferenceError', () => {
  const cleanEnv = {};
  for (const key of Object.keys(process.env)) {
    if (/^(PATH|Path|SYSTEMROOT|TMP|TEMP|HOME|USERPROFILE)$/i.test(key)) {
      cleanEnv[key] = process.env[key];
    }
  }

  const scriptPath = path.resolve(projectRoot, 'scripts/smoke/run-demo-workflow.mjs');
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    env: cleanEnv,
    encoding: 'utf8'
  });

  const output = `${result.stdout}\n${result.stderr}`;

  assert.notStrictEqual(result.status, 0, 'Runner must exit with non-zero status when smoke env is missing');
  assert.ok(output.includes('smoke_required_variable_missing: SMOKE_BASE_URL'), 'Output must contain sanitized variable missing error');
  assert.ok(!output.includes('ReferenceError'), 'Output must not contain ReferenceError');
  assert.ok(!output.includes('fileURLToPath is not defined'), 'Output must not contain fileURLToPath is not defined');
  assert.ok(!output.includes('path is not defined'), 'Output must not contain path is not defined');
  assert.ok(!output.includes('spawnSync is not defined'), 'Output must not contain spawnSync is not defined');
  assert.ok(!output.includes('Starting Playwright'), 'Output must not contain Playwright starting message');
  assert.ok(!output.includes('Preconditions check passed'), 'Output must not contain Preconditions check passed');
  assert.ok(!output.includes('Demo verification'), 'Output must not contain verifier output');
  assert.ok(!output.includes('password'), 'Output must not contain password');
  assert.ok(!output.includes('secret'), 'Output must not contain secret');
});
