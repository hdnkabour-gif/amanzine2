#!/usr/bin/env node
'use strict';
// ============================================================
// **استخراجُ لغة التطبيق كلِّها وما يستطيع فعلَه** — مُولَّدٌ لا مكتوب.
//
//   طلبَ صاحبُ المشروع: «استخراج كل لغة التطبيق وكل ما يقوم به وما يمكن
//   تنفيذه». وكتابةُ ذلك بيدٍ تعني وثيقةً تكذب بعد أوّل تعديل — وهو نفسُ
//   المرض الذي عولج في هذا المشروع مرارًا: **قائمةٌ ثانيةٌ تتباعد بصمت**.
//
//   فيُقرأ كلُّ شيءٍ من المصادر نفسِها التي يقرؤها التطبيقُ في التشغيل:
//     · المفاهيم    ← `knowledgeData` + `knowledgeExtra` (اتّحادٌ بالمُعرِّف)
//     · الأفعال     ← `actions.ts` (VERBS · OBJECTS)
//     · القدرات     ← `abilities.ts` (ABILITIES · ENTITY_VERBS · NEED_ASK)
//     · الغايات     ← `goals.ts`
//     · اللاتينيّة   ← `arabizi.ts`
//     · المدن       ← `knowledgeData.CITIES` + `places`
//
//   الاستعمال:  npm run report:lexicon
// ============================================================
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// تُجمَّع الوحداتُ بـesbuild كما تُجمَّع اختباراتُ العقل — فلا نسخةَ ثانيةً
// من منطق القراءة، ولا تحليلَ نصٍّ يخمّن ما في الملفّات.
function load() {
  const dir = mkdtempSync(join(tmpdir(), 'lexicon-'));
  const entry = join(dir, 'entry.ts');
  writeFileSync(entry, `
    export { CITIES } from ${JSON.stringify(join(ROOT, 'src/lib/akg/kb/knowledgeData'))};
    export { CONCEPTS } from ${JSON.stringify(join(ROOT, 'src/lib/akg/kb/concepts'))};
    export { ABILITIES, ENTITY_VERBS, NEED_ASK, RISK_THRESHOLD } from ${JSON.stringify(join(ROOT, 'src/lib/abilities'))};
    export { LIFE_NEEDS } from ${JSON.stringify(join(ROOT, 'src/lib/akg/kb/goals'))};
    export { PLACE_COUNT } from ${JSON.stringify(join(ROOT, 'src/lib/akg/kb/places'))};
    export { readAction } from ${JSON.stringify(join(ROOT, 'src/lib/akg/kb/actions'))};
    export { deArabizi } from ${JSON.stringify(join(ROOT, 'src/lib/akg/kb/arabizi'))};
  `);
  const out = join(dir, 'bundle.cjs');
  execFileSync(join(ROOT, 'node_modules/.bin/esbuild'),
    [entry, '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`, '--log-level=error'],
    { cwd: ROOT });
  return require(out);
}

const M = load();

// **المفاهيمُ تُقرأ من `concepts.ts` — لا تُدمَج هنا من جديد.**
//
//   كتبتُ أوّلًا دمجًا محلّيًّا لـ`knowledgeData` و`knowledgeExtra`، فأعطى
//   **١٨٥** مفهومًا والحقيقةُ **٢٠٧**: أسقط `knowledgeExtra.generated`
//   (المستورَد من CSV) وتجاهل `DISOWNED`. نسخةٌ ثانيةٌ من منطق الدمج تكذب
//   في أوّل قياس — وهو نفسُ ما يحرسه هذا المشروعُ في كلّ مكان.
const CONCEPTS = M.CONCEPTS;
const termsOf = (c) => [
  ...Object.values(c.concept || {}),
  ...Object.values(c.variants || {}).flat(),
].map(t => String(t || '').trim()).filter(Boolean);

const ALL_TERMS = new Set();
for (const c of CONCEPTS) for (const t of termsOf(c)) ALL_TERMS.add(t.toLowerCase());

// ── الأفعالُ والأهداف: تُستخرَج بالقياس لا بقراءة النصّ ──────────
//
//   لا نُحلّل `actions.ts` نصًّا (تحليلُ النصّ يخمّن). بل نُمرّر كلَّ مصطلحٍ
//   على `readAction` ونسجّل ما تقرؤه — فالتقريرُ يصف **السلوكَ** لا الشيفرة.
const ACTION_ROWS = [];
{
  const VERB_PROBE = {
    view: ['وريني', 'شوف', 'فين وصلات', 'شحال من', 'شحال ثمن', 'عندي طرد راجع'],
    create: ['زيد', 'ضيف', 'صايب', 'ربط', 'دير ليا'],
    update: ['بدل', 'غير', 'عدل', 'صحح'],
    delete: ['حيد', 'مسح', 'حذف', 'الغي'],
    share: ['شارك', 'رابط المحل'],
    send: ['صيفط', 'ارسل'],
  };
  const OBJ_PROBE = [
    ['رقم الهاتف', 'phone'], ['كلمة السر', 'password'], ['اللغة', 'language'],
    ['حسابي', 'account'], ['المحل', 'workspace'], ['اسم المحل', 'shop_name'],
    ['وقت الخدمة', 'shop_hours'], ['التوصيل', 'delivery'], ['الواتساب', 'channel'],
    ['الثمن', 'price'], ['المخزون', 'stock'], ['التصويرة', 'photo'],
    ['الوصف', 'content'], ['المنتوج', 'product'], ['الطلبات', 'orders'],
    ['الزبناء', 'customers'], ['كوبون', 'coupon'], ['المحفظة', 'wallet'],
    ['الاعدادات', 'settings'],
  ];
  for (const [verb, probes] of Object.entries(VERB_PROBE)) {
    for (const [objWord, obj] of OBJ_PROBE) {
      const read = M.readAction(`${probes[0]} ${objWord}`);
      if (read && read.verb === verb && read.object === obj) {
        ACTION_ROWS.push({ verb, object: obj, say: `${probes[0]} ${objWord}`, needs: read.needs });
      }
    }
  }
}

const n = (x) => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
const L = [];
const p = (s = '') => L.push(s);

p('# لغةُ أمانزين وما يستطيع فعلَه');
p();
p('> **مُولَّدٌ آليًّا** بـ`npm run report:lexicon` — لا يُحرَّر بيد.');
p('> يُقرأ من نفس المصادر التي يقرؤها التطبيقُ في التشغيل، فلا يكذب بعد تعديل.');
p();
p(`آخرُ توليد: ${new Date().toISOString().slice(0, 10)}`);
p();

// ── ① الخلاصة ────────────────────────────────────────────────
p('## ① الخلاصةُ بالأرقام');
p();
p('| ما هو | العدد |');
p('|---|---|');
p(`| مفهومًا يفهمه التطبيق | **${n(CONCEPTS.length)}** |`);
p(`| مصطلحًا مميَّزًا (كلَّ اللغات) | **${n(ALL_TERMS.size)}** |`);
p(`| قدرةً يستطيع تنفيذها | **${n(M.ABILITIES.length)}** |`);
p(`| زوجَ فعلٍ×هدفٍ مقروءًا | **${n(ACTION_ROWS.length)}** |`);
p(`| غايةَ حياةٍ تُقرأ | **${n(M.LIFE_NEEDS.length)}** |`);
p(`| مدينةً كبرى بأحيائها | **${n(M.CITIES.length)}** |`);
p(`| مكانًا مغربيًّا (جماعاتٌ ومراكز) | **${n(M.PLACE_COUNT)}** |`);
p();

// ── ② ما يستطيع فعلَه ────────────────────────────────────────
p('## ② ما يستطيع التطبيقُ تنفيذَه');
p();
p('كلُّ سطرٍ **عقد**: فعلٌ وكيانٌ وما يحتاجه قبل التنفيذ وخطورتُه وأين يعيش.');
p('و«الخطورة» تحدّد العتبة: `low` يُنفَّذ بثقةٍ أقلّ، و`high` **يُؤكَّد دائمًا**.');
p();
p('| ما يقوله للإنسان | الفعل | الكيان | يحتاج | الخطورة | الصفحة | المسار |');
p('|---|---|---|---|---|---|---|');
for (const a of M.ABILITIES) {
  const needs = a.needs.length ? a.needs.map(k => M.NEED_ASK[k]).join(' · ') : '—';
  p(`| ${a.say} | ${a.verb} | ${a.entity} | ${needs} | ${a.risk} | ${a.page || '**بلا باب**'} | ${a.api || '—'} |`);
}
p();
p('### الأفعالُ التي يقبلها كلُّ كيان');
p();
p('ما ليس هنا يُقابَل بـ«هادشي ما كايتديرش أصلًا» — صدقًا لا اعتذارًا.');
p();
p('| الكيان | الأفعالُ المقبولة |');
p('|---|---|');
for (const [ent, verbs] of Object.entries(M.ENTITY_VERBS)) p(`| ${ent} | ${verbs.join(' · ')} |`);
p();

// ── ③ الأفعالُ الإداريّة ─────────────────────────────────────
p('## ③ الأوامرُ الإداريّةُ المقروءة');
p();
p('«شنو بغيتي **ندير**» لا «شنو بغيتي **تشري**». الجملةُ تُفصَل: فعلٌ + هدفٌ + نطاق.');
p();
p('| مثالٌ يُقرأ | الفعل | الهدف | ما ينقص بعده |');
p('|---|---|---|---|');
for (const r of ACTION_ROWS) {
  p(`| ${r.say} | ${r.verb} | ${r.object} | ${r.needs.length ? r.needs.join(' · ') : '—'} |`);
}
p();

// ── ④ الغايات ────────────────────────────────────────────────
p('## ④ غاياتُ الحياة — ما وراء الطلب');
p();
p('«بنتي داخلة للمدرسة» ليست طلبَ شراء: هي حالٌ يُشتقّ منها ما يليق.');
p();
p('| الغاية | ما يُسأل عنها |');
p('|---|---|');
for (const g of M.LIFE_NEEDS) p(`| ${g.label || g.id} | ${g.ask || '—'} |`);
p();

// ── ⑤ اللغة ──────────────────────────────────────────────────
p('## ⑤ اللغةُ التي يفهمها');
p();
p('خمسةُ أسطحٍ لكلّ مفهوم: الدارجة · العربيّة · الفرنسيّة · الإنجليزيّة · **اللاتينيّة**');
p('(Arabizi — «bghit» · «3andi» · «7aja»)، وكلُّها تصل إلى نفس المفهوم.');
p();
const byCat = new Map();
for (const c of CONCEPTS) {
  const k = c.category || '(بلا فئة)';
  if (!byCat.has(k)) byCat.set(k, []);
  byCat.get(k).push(c);
}
p('| الفئة | المفاهيم | مصطلحات |');
p('|---|---|---|');
for (const [cat, list] of [...byCat].sort((a, b) => b[1].length - a[1].length)) {
  const terms = list.reduce((s, c) => s + termsOf(c).length, 0);
  p(`| ${cat} | ${n(list.length)} | ${n(terms)} |`);
}
p();
p('### كلُّ مفهومٍ وما يُكتب به');
p();
p('<details><summary>افتح القائمة الكاملة</summary>');
p();
p('| المفهوم | بالدارجة | ما يُكتب به |');
p('|---|---|---|');
for (const c of [...CONCEPTS].sort((a, b) => a.id.localeCompare(b.id))) {
  const t = termsOf(c);
  const shown = t.slice(0, 14).join(' · ');
  p(`| \`${c.id}\` | ${c.concept?.darija || c.concept?.ar || '—'} | ${shown}${t.length > 14 ? ` … (+${n(t.length - 14)})` : ''} |`);
}
p();
p('</details>');
p();

// ── ⑥ اللاتينيّة ─────────────────────────────────────────────
p('## ⑥ الطريقُ اللاتينيّ (Arabizi)');
p();
p('يُحوَّل قبل الفهم، فيصل المحرِّكَ عربيًّا. أمثلةٌ مقيسةٌ الآن:');
p();
p('| ما يكتبه | ما يُقرأ |');
p('|---|---|');
for (const s of ['bghit sbat', 'khassni hallaq', 'bghit nakol', 'lavage', 'Fin wesselat lcomonde deyali',
  '3andi mouchkil f dou', 'bghit chi lbessa zewina lbenti ana f casa']) {
  p(`| \`${s}\` | ${M.deArabizi(s)} |`);
}
p();

// ── ⑦ الجغرافيا ──────────────────────────────────────────────
p('## ⑦ الجغرافيا');
p();
p(`${n(M.CITIES.length)} مدينةً كبرى بأحيائها ومرادفاتها، و${n(M.PLACE_COUNT)} مكانًا مغربيًّا.`);
p('والمدينةُ تُطابَق **كلمةً كاملة**: «Fin wesselat» لا تُنتج «سلا».');
p();
p('| المدينة | كما تُكتب |');
p('|---|---|');
for (const c of M.CITIES.filter(x => (x.aliases || []).length)) {
  p(`| ${c.ar} | ${(c.aliases || []).join(' · ')} |`);
}
p();

mkdirSync(join(ROOT, 'REPORTS'), { recursive: true });
writeFileSync(join(ROOT, 'REPORTS/LEXICON.md'), L.join('\n'));
console.log(`[lexicon] ${CONCEPTS.length} مفهومًا · ${ALL_TERMS.size} مصطلحًا · ${M.ABILITIES.length} قدرةً · ${ACTION_ROWS.length} زوجَ فعلٍ×هدف → REPORTS/LEXICON.md`);
