// يُجمّع القياسَ بـesbuild ثمّ يكتب التقرير — نفسُ فلسفة النبض واختبارات العقل.
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(mkdtempSync(join(tmpdir(), 'amz-askkind-')), 'askKind.mjs');
execSync(`npx esbuild scripts/askKind.ts --bundle --platform=node --format=esm --outfile="${out}" --log-level=error`,
  { stdio: 'inherit', cwd: ROOT });
const { measure, render } = await import(out);
const rows = measure();
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); }
else {
  const md = render(rows) + '\n';
  writeFileSync(join(ROOT, 'REPORTS/ASK_KIND.md'), md);
  console.log(`REPORTS/ASK_KIND.md — ${rows.length} مفهومًا يُقرأ طلبُه «تقلّب على حرفي»`);
  console.log(`  بائع: ${rows.filter(r => r.cue === 'بائع').length} · حِرفيّ: ${rows.filter(r => r.cue === 'حِرفيّ').length} · ملتبس: ${rows.filter(r => r.cue === 'ملتبس').length}`);
}
