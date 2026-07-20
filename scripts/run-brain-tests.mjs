// يشغّل اختبارات العقل بلا تبعيّات جديدة: esbuild يجمّع TS → node --test يشغّل.
// (نفس فلسفة اختبارات الخادم: node:test المدمج، صفر إطار خارجيّ.)
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'amz-brain-')), 'brain.test.mjs');
try {
  execSync(`npx esbuild test/brain/index.ts --bundle --platform=node --format=esm --outfile="${out}" --log-level=error`, { stdio: 'inherit' });
  execSync(`node --test "${out}"`, { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
