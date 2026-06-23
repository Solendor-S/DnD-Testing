/**
 * Downloads the open 5e SRD dataset (5e-bits/5e-database, OGL v1.0a content)
 * into data/raw/ via a shallow git clone. Idempotent: if data/raw already
 * exists it pulls the latest instead of re-cloning.
 *
 * Run: npm run fetch-srd
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW_DIR = join(ROOT, 'data', 'raw');
const REPO = 'https://github.com/5e-bits/5e-database.git';

function run(cmd: string, cwd: string) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function main() {
  if (existsSync(join(RAW_DIR, '.git'))) {
    console.log('data/raw exists — pulling latest SRD data...');
    try {
      run('git pull --depth 1 --ff-only', RAW_DIR);
    } catch {
      console.warn('git pull failed; re-cloning from scratch.');
      rmSync(RAW_DIR, { recursive: true, force: true });
      run(`git clone --depth 1 ${REPO} "${RAW_DIR}"`, ROOT);
    }
  } else {
    if (existsSync(RAW_DIR)) rmSync(RAW_DIR, { recursive: true, force: true });
    run(`git clone --depth 1 ${REPO} "${RAW_DIR}"`, ROOT);
  }
  console.log('SRD data ready at data/raw/src/2014/en/');
}

main();
