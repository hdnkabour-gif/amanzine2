// يُجمّع النبضَ بـesbuild ثمّ يُشغّله — نفسُ فلسفة اختبارات العقل.
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const out = join(mkdtempSync(join(tmpdir(), 'amz-pulse-')), 'pulse.mjs');
execSync(`npx esbuild scripts/pulse.ts --bundle --platform=node --format=esm --outfile="${out}" --log-level=error`, { stdio: 'inherit' });
const { measure, render } = await import(out);
const p = measure();
if (process.argv.includes('--json')) console.log(JSON.stringify(p, null, 1));
else console.log(render(p));
