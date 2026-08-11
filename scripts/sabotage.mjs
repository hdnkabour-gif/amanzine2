// ============================================================
// **مصفوفةُ التخريب — كلُّ حارسٍ يُثبَت بعطبه.**
//
//   حارسٌ يمرّ ليس دليلًا على شيء. الدليلُ أن يُعاد العطبُ الذي وُلد الحارسُ
//   ليمنعه، فيسقط الحارسُ فعلًا. والحارسُ الذي ينجو من عطبه **خامل**: يُطمئن
//   ولا يحرس، وهو أسوأُ من غيابه لأنّه يشتري الثقةَ بلا مقابل.
//
//   وقع هذا في هذا المستودع مرارًا:
//     · حارسٌ يؤكّد عبر دالّةٍ لا تبلغ ما يحرسه إطلاقًا.
//     · صيغةٌ `[^)]*` لا تعبر القوسَ في `NOW()`، فلا تطابق شيئًا أبدًا.
//     · حارسٌ يطابق **شرحَه هو** المكتوبَ في تعليقٍ فوقه.
//     · قياسٌ يقيس البيئةَ لا الكود (مفتاحٌ غائبٌ يجعل التعميةَ ممرًّا).
//   ولم يُكشَف أيٌّ منها بتشغيل الاختبارات — كلُّها كانت **خضراء**.
//
//   ── ما يقيسه هذا الملفّ ──
//   لكلّ عطبٍ أُصلح: يُعاد نصًّا في مصدره، تُشغَّل الاختباراتُ المعنيّة، ويُعدّ
//   ما سقط. ثمّ **يُعاد الملفُّ ويُتحقَّق من بصمته** — تخريبٌ لا يُعاد أسوأُ من
//   ألّا يقع.
//
//   التشغيل:  node scripts/sabotage.mjs            (ما لا يحتاج قاعدة)
//             DATABASE_URL=… node scripts/sabotage.mjs   (كلُّه)
//             node scripts/sabotage.mjs RC-P1      (عائلةٌ بعينها)
// ============================================================
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const R = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'amz-sab-'));
const HAS_DB = !!process.env.DATABASE_URL;
const only = process.argv[2];

// ── المشغِّلات: كلُّ عائلةٍ تُقاس بأخصِّ اختباراتها لا بالمجموعة كلِّها ──
// **اسمٌ فريدٌ لكلّ شريحة.** كانت الشرائحُ تكتب في نفس الملفّ، فتُنشأ
//   الثانيةُ فوق الأولى وتُقاس عائلةٌ بمقياس عائلةٍ أخرى — فتمرّ كلُّ
//   تخريباتها. وهو بالضبط صنفُ العطب الذي وُلد هذا الملفُّ ليكشفه، وقع فيه.
let sliceNo = 0;
const brainSlice = (files) => {
  const n = ++sliceNo;
  const entry = path.join(TMP, `entry${n}.ts`);
  fs.writeFileSync(entry, ["test/brain/setup", ...files]
    .map(f => `import '${path.join(R, f)}';`).join('\n') + '\n');
  const out = path.join(TMP, `slice${n}.mjs`);
  return () => {
    try {
      execSync(`npx esbuild "${entry}" --bundle --platform=node --format=esm --outfile="${out}" --log-level=error`,
        { cwd: R, stdio: 'pipe' });
    } catch (e) { return { fail: -1, names: ['BUILD_FAIL: ' + String(e.stderr || '').slice(0, 200)] }; }
    return count(`node --test "${out}"`);
  };
};
const nodeTest = (file) => () => count(`node --test "${path.join(R, file)}"`);

function count(cmd) {
  let out = '';
  try { out = execSync(cmd, { cwd: R, encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const names = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map(m => m[1].trim());
  return { fail: names.length, total: Number((out.match(/^# tests (\d+)/m) || [])[1] || 0), names };
}

const RUN_OWNER = brainSlice(['test/brain/destinationOwner.test.ts', 'test/brain/referent.test.ts']);
const RUN_BUDGET = brainSlice(['test/brain/semanticBudget.test.ts']);
const RUN_STATE = brainSlice(['test/brain/clientState.test.ts']);
const RUN_ARCH = nodeTest('test/architecture.test.mjs');
/**
 * **مخطَّطٌ نظيفٌ قبل كلّ قياس.**
 *
 *   قيدٌ أُنشئ في تشغيلٍ سابقٍ يبقى في القاعدة، فحذفُ سطرِ إنشائه من
 *   `migrate.js` لا يُزيله — ويمرّ التخريبُ بلا أن يكون الحارسُ خاملًا.
 *   فالقياسُ الصادقُ يبدأ من قاعدةٍ لم تُرحَّل بعد.
 */
const RUN_DB = () => {
  execSync(`node -e "const p=require('${path.join(R, 'server/db.js').replace(/\\/g, '/')}');` +
    `p.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public').then(()=>p.end()).catch(e=>{console.error(e.message);process.exit(1)})"`,
    { cwd: R, stdio: 'pipe' });
  try { execSync(`node "${path.join(R, 'server/migrate.js')}"`, { cwd: path.join(R, 'server'), stdio: 'pipe' }); }
  catch { /* قد يسقط الترحيلُ عمدًا تحت التخريب — الاختباراتُ تقول ماذا حدث */ }
  return count(`node --test "${path.join(R, 'server/test/phase5-db-invariants.test.js')}"`);
};

// ── العائلات ────────────────────────────────────────────────────
const D = 'src/lib/decide.ts', LH = 'src/pages/LivingHome.tsx',
  NF = 'src/pages/Landing/sections/NeedFirst.tsx', AP = 'src/pages/AssistantPage.tsx',
  AU = 'src/pages/AuthPage.tsx', CS = 'src/lib/clientState.ts',
  MG = 'server/migrate.js', OL = 'server/lib/orderLifecycle.js';

const FAMILIES = [
  ['RC-P1', 'مالكٌ واحدٌ للوجهة الدلاليّة', RUN_OWNER, [
    ['شاشةٌ تركّب الطبقاتِ بنفسها', [
      [LH, `import { decideFor } from '../lib/decide';`,
        `import { decideFor } from '../lib/decide';\nimport { abilityFor } from '../lib/abilities';`],
      [LH, `    const d = decideFor(raw, { u, need: r, lastProduct: uctx.state.lastProduct });`,
        `    const _ab = abilityFor({ action: u.action, stance: u.stance, service: u.service });\n    void _ab;\n    const d = decideFor(raw, { u, need: r, lastProduct: uctx.state.lastProduct });`]]],
    ['وجهةٌ تُشتقّ من حكمٍ غيرِ حاسم', [
      [D, `  if (d.verdict !== 'execute' && d.verdict !== 'confirm') return {};`,
        `  if (d.verdict === 'refuse') return {};`]]],
    ['صفحةُ الدخول تُعيد الاشتقاقَ من اتّجاهٍ مخزَّن', [
      [AU, `j?.target?.page`, `(void 0 as any)?.page`],
      [AU, `j?.target?.url`, `(void 0 as any)?.url`]]],
    ['الباحثُ يُساق إلى سوقٍ بلا استعلامه', [
      [D, "    return { url: q ? `/market?q=${encodeURIComponent(q)}${city}` : '/market' };",
        `    return { url: '/market' };`]]],
    ['الشاشةُ تسأل المالكَ بلا سياق', [
      [LH, `    const d = decideFor(raw, { u, need: r, lastProduct: uctx.state.lastProduct });`,
        `    const d = decideFor(raw, { u, need: r });`]]],
    ['المالكُ يبتلع السياقَ ولا يوصله للحَكَم', [
      [D, `    { lastProduct: ctx.lastProduct, raw: q });`, `    { raw: q });`]]],
    ['كلُّ حاسمٍ يُساق إلى السوق', [
      [D, `  if (d.dest?.page) return { page: d.dest.page };`,
        `  if (d.verdict === 'execute' || d.verdict === 'confirm') return { url: '/market' };`]]],
    ['المالكُ يلمس ميكانيكا الملاحة', [
      [D, `export function targetOf(`,
        `export function goNow(u: string) { window.location.assign(u); }\nexport function targetOf(`]]],
    ['حدُّ التصديق يسقط', [[D, `export const READ_ENOUGH = 0.5;`, `export const READ_ENOUGH = 0;`]]],
    ['حارسُ الشكل على جذرٍ خاطئ', [
      ['test/brain/destinationOwner.test.ts', `const ROOT = process.cwd();`, `const ROOT = '/nowhere';`]]],
    ['المساعدُ يسقط إلى وجهةٍ مخبوزة', [
      [AP, `    if (!text) { receptionEnd('idle'); return; }`,
        `    if (!text) { navigate(r.url || '/market'); return; }`]]],
    ['الرسالةُ لا تحمل نصَّها', [
      [AP, `onClick={() => goTo(m.result!, m.raw)}`, `onClick={() => goTo(m.result!)}`]]],
    ['حوارُ المساعد لا ينجو من الملاحة', [
      [AP, `    () => readState<Msg[]>('amanzine_assistant') || [{ who: 'ai', text: GREET }]);`,
        `    () => [{ who: 'ai', text: GREET }]);`]]],
    ['مفتاحٌ بنطاقٍ يتجاوز الرحلة', [
      [CS, `  { key: 'amanzine_assistant', scope: 'journey', store: 'session', ttlMs: JOURNEY_TTL,`,
        `  { key: 'amanzine_assistant', scope: 'device', store: 'local',`]]],
    ['شرطٌ كاذبٌ دائمًا على المسح', [
      [LH, `    else clearState('amanzine_conversation');`,
        `    else clearJourneyState.length && clearState('amanzine_conversation');`]]],
  ]],

  ['ARCH', 'حُرّاسُ المعمارية بعد إعادة التوجيه', RUN_ARCH, [
    ['حَكَمُ الشكل يُنادى مرّتين', [
      [D, `  const iface = decideInterface({ ...(need as object), hasInput: true } as never, d.verdict);`,
        `  decideInterface({ ...(need as object), hasInput: true } as never, d.verdict);\n  const iface = decideInterface({ ...(need as object), hasInput: true } as never, d.verdict);`]]],
    ['المشهدُ يستدعي الحَكَمَ مرّتين', [
      [LH, `    const dec = applyVerdict(u, r, q);`, `    applyVerdict(u, r, q);\n    const dec = applyVerdict(u, r, q);`]]],
    ['موضعُ سؤالٍ ثانٍ للمالك', [
      [LH, `  const submit = (raw: string) => {`, `  const _peek = (s: string) => decideFor(s);\n  const submit = (raw: string) => {`]]],
    ['حدُّ المجال غيرُ مسؤولٍ', [
      [D, `  const impossible = !!(av && ae && !entityAccepts(av, ae));`, `  const impossible = !!(av && ae && false);`]]],
    ['الحدُّ يُحسَب ولا يُمرَّر', [
      [D, `  const d = decideExecution(u, ability || undefined, impossible,`,
        `  const d = decideExecution(u, ability || undefined, false,`]]],
    ['الاتّجاهُ لا يبلغ مطابِقَ القدرة', [
      [D, `    stance: u.stance, service: u.service,`, `    service: u.service,`]]],
    ['حدُّ القراءة يسقط قبل الكتالوج', [
      [D, `  const act = (u.action?.confidence ?? 0) >= READ_ENOUGH ? u.action : null;`, `  const act = u.action;`]]],
    ['السقّافةُ تُخفَض (٠٫٥ ⇐ ٠٫٢)', [[D, `export const READ_ENOUGH = 0.5;`, `export const READ_ENOUGH = 0.2;`]]],
    ['حكمُ الرفض بلا شكلٍ في العرض', [[LH, `mode === 'refuse'`, `mode === 'refuse_OFF'`]]],
    ['سقّافةُ التحليل تُرفَع في الصفحة', [
      [NF, `  const trace: string[] = (read.u?.reasoning as string[]) || [];`,
        `  const trace: string[] = ((understand(text) as any).reasoning || []);`]]],
  ]],

  ['RC-P6', 'تحليلٌ دلاليٌّ واحدٌ لكلّ فعل', RUN_BUDGET, [
    ['المالكُ يُعيد قراءةَ ما أُعطي', [[D, `  const u = ctx.u || understand(q);`, `  const u = understand(q);`]]],
    ['المالكُ يُعيد قراءةَ الحاجة', [
      [D, `  const need = ctx.need || parseNeed(q, {} as never);`, `  const need = parseNeed(q, {} as never);`]]],
    ['تعود القراءةُ داخل الرسم', [
      [LH, `{correctionOptions(uText).map(o => (`, `{correctionOptions(understand(text)).map(o => (`]]],
    ['النقرةُ لا تُمرّر قراءتَها', [
      [NF, `    const d = decideFor(need, { u: pre?.u || undefined, need: pre?.r || undefined });`,
        `    const d = decideFor(need);`]]],
    ['النقرةُ تقرأ ما قرأه العرضُ للتوّ', [
      [NF, `    const rd = need === text.trim() ? read : readNeed(need);`, `    const rd = readNeed(need);`]]],
    ['قراءةٌ مُخبَّأةٌ عالميًّا تُبطل الحارس', [
      [D, `  const u = ctx.u || understand(q);`,
        `  const __c = ((globalThis as any).__u ||= {}); const u = ctx.u || (__c[q] ||= understand(q));`]]],
  ]],

  ['RC-P2', 'حدودُ الهويّة لما يُحفَظ في المتصفّح', RUN_STATE, [
    ['مفتاحُ ذاكرةِ تعلّمٍ يخرج من السجلّ', [
      [CS, `  { key: 'amanzine_decisions', scope: 'identity', store: 'local', why: '**الجملُ التي كتبها ولم تُفهَم** وقراراتُ التوجيه' },\n`, ``]]],
    ['ذاكرةُ التعلّم تصير تفضيلَ جهازٍ فتنجو من الخروج', [
      [CS, `  { key: 'amanzine_journeys', scope: 'identity', store: 'local',`,
        `  { key: 'amanzine_journeys', scope: 'device', store: 'local',`]]],
    ['الخروجُ يترك مفاتيحَ الهويّة', [
      [CS, `  for (const k of CLIENT_STATE) if (k.scope !== 'device') clearState(k.key);`,
        `  for (const k of CLIENT_STATE) if (k.scope === 'journey') clearState(k.key);`]]],
    ['نسخةُ حسابٍ تُقرأ لحسابٍ آخر', [
      [CS, `    if (k.scope === 'identity' && env.owner && owner && env.owner !== owner) {`,
        `    if (false) {`]]],
  ]],

  ['RC-P5', 'القاعدةُ تحرس معناها', RUN_DB, [
    ['لا قفلَ — الترحيلُ ليس ذرّيًّا', [
      [MG, `    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK]);`, ``]]],
    ['قفلُ جلسةٍ بدل قفلِ معاملة', [[MG, `pg_advisory_xact_lock`, `pg_advisory_lock`]]],
    ['تعود الخطوةُ الاختياريّةُ تُبتلَع', [
      [MG, '      softFailures.push(`${label}: ${e.message}`);', `      void label; void e;`],
      [MG, '    await client.query(`SAVEPOINT ${name}`);', `    void name;`]]],
    ['يسقط قيدُ حالةِ الطلب', [
      [MG, "    await constraint('orders', 'chk_orders_status', `status = ANY(ARRAY[${LIST}])`);", ``]]],
    ['يسقط قيدُ المبلغ السالب', [
      [MG, `    await constraint('orders', 'chk_orders_total', 'total >= 0');`, ``]]],
    ['قيدٌ بلا فحصِ وجود', [
      [MG, `         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '\${name}') THEN`, `         IF true THEN`]]],
    ['يسقط دفترُ الترحيل', [
      [MG, `      [CHECKSUM, Date.now() - startedAt, softFailures.length]);`,
        `      ['0'.repeat(64), 0, 0]);`]]],
    ['يعود تجميدُ الطلب المُوافَق عليه', [
      [OL, `  const f = canonicalState(from), t = canonicalState(to);`, `  const f = from, t = to;`]]],
    ['الترجمةُ تفتح كلَّ انتقال', [[OL, `  return (TRANSITIONS[f] || []).includes(t);`, `  return true;`]]],
    ['المرادفُ يصير موضعًا سابعًا', [
      [OL, `const STATES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'closed'];`,
        `const STATES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'closed', 'approved'];`]]],
  ]],
];

// ── التشغيل ─────────────────────────────────────────────────────
let caught = 0, total = 0, missed = [], skipped = 0;

for (const [id, title, run, cases] of FAMILIES) {
  if (only && id !== only) continue;
  if (run === RUN_DB && !HAS_DB) {
    console.log(`\n⏭  ${id} — ${title}: مؤجَّلةٌ (لا DATABASE_URL)`);
    skipped += cases.length;
    continue;
  }
  console.log(`\n══ ${id} — ${title} ══`);
  const base = run();
  if (base.fail !== 0) {
    console.log(`  ‼ الأساسُ ليس أخضر (${base.fail}): ${base.names.slice(0, 3).join(' | ')}`);
    process.exitCode = 1; continue;
  }
  for (const [name, edits] of cases) {
    total++;
    const backups = [];
    let ok = true;
    for (const [f, from, to] of edits) {
      const p = path.join(R, f);
      const src = fs.readFileSync(p, 'utf8');
      backups.push([p, src]);
      if (!src.includes(from)) { ok = false; console.log(`  ⚠ ${name}: لم يُوجَد النصُّ في ${f}`); break; }
      fs.writeFileSync(p, src.replace(from, to));
    }
    const r = ok ? run() : { fail: -1, names: ['PATCH_MISS'] };
    // **يُعاد بالعكس**: تعديلان على ملفٍّ واحدٍ يعطيان نسختَين، الثانيةُ
    //   مُرقَّعةٌ سلفًا — فالإعادةُ بالترتيب تترك الرقعةَ الأولى في الملفّ.
    for (const [p, src] of [...backups].reverse()) fs.writeFileSync(p, src);
    const first = new Map();
    for (const [p, src] of backups) if (!first.has(p)) first.set(p, src);
    for (const [p, src] of first) {
      if (fs.readFileSync(p, 'utf8') !== src) {
        console.error(`  ‼ لم يُعَد الملفُّ إلى أصله: ${p} — أوقِف كلَّ شيء`);
        process.exit(2);
      }
    }
    if (r.fail > 0) { caught++; console.log(`  ✅ ${name} — ${r.fail} إخفاق`); }
    else { missed.push(`${id}/${name}`); console.log(`  ❌ ${name} — **لم يُمسَك**`); }
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${'═'.repeat(56)}`);
console.log(`الحصيلة: ${caught}/${total} أُمسكت` + (skipped ? ` · ${skipped} مؤجَّلةٌ لقاعدةٍ حقيقيّة` : ''));
if (missed.length) {
  console.log(`\n**حُرّاسٌ خاملة** — نجت من عطبها:`);
  for (const m of missed) console.log(`  · ${m}`);
  console.log(`\nولا يُضاف حارسٌ ليمرّ الجدول: يُقاس **لماذا** نجا العطب.`);
  process.exitCode = 1;
}
