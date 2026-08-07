import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(ROOT, 'REPORTS/PAGE_ACTIONS.md');

// ============================================================
// **جردُ ما يُفعَل في الصفحات — وهل يبلغه الكلام؟**
//
//   طلبُ صاحب المشروع: «كلُّ ما يمكن للمستخدم أن يقوم به في صفحةٍ يمكن له
//   أن يقوم به داخل المحادثة». فالمقياسُ ليس رأيًا: يُعَدُّ ما تفعله كلُّ
//   صفحةٍ ويُقارَن بما تبلغه جملة.
//
//   وأوّلُ قياسٍ كذب: عُدَّت نداءاتُ الـAPI في كلّ صفحة فظهرت `ProductsPage`
//   بلا `productsAPI` — لأنّ **المخزن** ينادي والصفحاتُ تستدعي أفعالَه.
//   فصار القياسُ على أفعال المخزن، وهي ما يملكه الإنسانُ فعلًا.
// ============================================================

function measured() {
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts/pageActions.mjs')], { encoding: 'utf8' });
  const m = out.match(/\[page-actions\] (\d+) فعلًا · (\d+) يبلغه الكلام · (\d+) لا يبلغه · (\d+) بلا صفحة/);
  assert.ok(m, `تعذّر قراءةُ خرج المولّد — تغيّرت صيغتُه والحارسُ أعمى:\n${out}`);
  return { actions: +m[1], spoken: +m[2], mute: +m[3], dead: +m[4] };
}

test('الجردُ موجودٌ ومُولَّد', () => {
  assert.ok(existsSync(REPORT), 'ناقص: REPORTS/PAGE_ACTIONS.md — شغّل `npm run report:page-actions`');
  assert.match(readFileSync(REPORT, 'utf8'), /مُولَّدٌ آليًّا/, 'الجردُ محرَّرٌ بيد — سيقدُم');
});

test('وأرقامُه تطابق الكودَ الآن', () => {
  const doc = readFileSync(REPORT, 'utf8');
  const now = measured();
  const declared = (label) => {
    const m = doc.match(new RegExp(`\\| ${label}[^|]*\\| \\*\\*([٠-٩]+)\\*\\* \\|`));
    return m ? Number([...m[1]].map(d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).join('')) : NaN;
  };
  assert.equal(declared('فعلًا يملكه الإنسان'), now.actions, 'عددُ الأفعال قديم — أعِد التوليد');
  assert.equal(declared('منها \\*\\*يبلغه الكلامُ\\*\\*'), now.spoken, 'عددُ ما يبلغه الكلام قديم');
});

// ── السقّاطة: ما يبلغه الكلامُ يزيد ولا ينقص ──────────────────
//
//   سقفٌ يُشدّ ولا يُرخى — كسائر سقوف هذا المشروع. وأخصُّ ما يحرسه: ألّا
//   يُخفَّض العددُ باستثناء فعلٍ من القائمة بدل وصله.
const FLOOR_SPOKEN = 23;   // قِيس ٢٣ بعد وصل دورة حياة الطلب
const CEIL_MUTE = 4;       // login · updateConversation · deleteConversation · resetToDemo

test('ما يبلغه الكلامُ لا يرتدّ', () => {
  const now = measured();
  assert.ok(now.spoken >= FLOOR_SPOKEN,
    `يبلغه الكلامُ ${now.spoken} وكان ${FLOOR_SPOKEN} — انقطع بابٌ كان موصولًا`);
  assert.ok(now.mute <= CEIL_MUTE,
    `لا يبلغه ${now.mute} وكان ${CEIL_MUTE} — أُضيف فعلٌ في صفحةٍ بلا كلمةٍ تبلغه`);
});

test('**ولا يُخفَّض العددُ بالاستثناء** — القائمةُ تُوصَل لا تُقلَّم', () => {
  // أسهلُ طريقةٍ لبلوغ «صفر لا يبلغه» أن يُضاف الفعلُ إلى `INFRA` فيختفي
  // من الجرد. فيُحرَس حجمُ الاستثناء كما يُحرَس البسط.
  const gen = readFileSync(join(ROOT, 'scripts/pageActions.mjs'), 'utf8');
  const infra = (gen.match(/const INFRA = new Set\(\[([\s\S]*?)\]\)/) || [])[1] || '';
  const n = [...infra.matchAll(/'(\w+)'/g)].length;
  assert.ok(n <= 8, `اتّسع استثناءُ «البنية» إلى ${n} — أيُوصَل الفعلُ أم يُخفى؟`);
  const now = measured();
  assert.ok(now.actions >= 30, `انكمش الجردُ إلى ${now.actions} فعلًا — قُلِّم المقامُ لا وُصل البسط`);
});
