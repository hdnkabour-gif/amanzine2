import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expandQuery, toSearchFilters, toSearchParams } from '../../src/lib/searchIntent';

// ============================================================
// **عقدُ البحث — واحدٌ لكلّ الأبواب.**
//
//   العطبُ الذي بُني هذا الملفُّ ليمنعَ عودتَه: أربعةُ أبوابٍ تصل الخادمَ
//   بسؤالٍ واحد، وثلاثةٌ منها تُسقط ما فهمه التطبيق. النداءُ ينجح،
//   والنتيجةُ صفر، ولا رسالةَ خطأ — فيستنتج الإنسانُ أنّ السوقَ خاوٍ.
//
//   ما يُحرَس هنا ليس شكلُ الدالّة، بل **أنّ الفهمَ يصل**: المرادفاتُ
//   والفئةُ والسقفُ والحال. وكلُّ حارسٍ أُثبت بحقنِ عطبِه.
// ============================================================

test('العقد: المرادفاتُ تركب — «بلومبي» يصل ومعه سبّاك وPlombier', () => {
  const f = toSearchFilters(expandQuery('بغيت بلومبي'), 'الدار البيضاء');
  assert.ok(f.terms, 'المرادفاتُ ما ركباتش فالعقد');
  const t = f.terms.split('|');
  assert.ok(t.length > 1, `مرادفٌ واحدٌ فقط: ${f.terms}`);
  assert.ok(t.some(x => /سباك|سبّاك/.test(x)), `ما فيهاش «سباك»: ${f.terms}`);
  assert.equal(f.city, 'الدار البيضاء');
});

test('العقد: الجملةُ الخامّةُ تبقى — المرادفاتُ تُضاف ولا تحلّ محلَّها', () => {
  const raw = 'بغيت شي كسوة لبنتي أنا فكازة';
  const f = toSearchFilters(expandQuery(raw));
  assert.equal(f.q, raw, 'الجملةُ الخامّةُ ضاعت — وهي ما كتبه الإنسان');
});

test('العقد: السقفُ والحالُ يركبان — «تلفون مستعمل بأقلّ من ٣٠٠ درهم»', () => {
  const f = toSearchFilters(expandQuery('بغيت تلفون مستعمل بأقلّ من ٣٠٠ درهم'));
  assert.equal(f.priceMax, 300, 'السقفُ ما وصلش');
  assert.equal(f.condition, 'used', 'حالُ السلعة ما وصلش');
});

test('العقد: «شي حاجة بأقلّ من ٢٠٠ درهم» — السقفُ هو الطلب، لا الجملة', () => {
  const f = toSearchFilters(expandQuery('بغيت شي حاجة بأقلّ من ٢٠٠ درهم'));
  assert.equal(f.priceMax, 200);
  assert.equal(f.q, undefined,
    'الجملةُ أُرسلت كـq فيبحث الفهرسُ عن اسمٍ يحوي «بأقلّ من ٢٠٠ درهم» — صفرٌ مضمون');
});

test('العقد: جملةٌ بلا مفهومٍ ولا سقفٍ تُرسَل كما هي', () => {
  const f = toSearchFilters(expandQuery('شي حاجة ما كتبانش'));
  assert.equal(f.q, 'شي حاجة ما كتبانش', 'الجملةُ الخامّةُ سقطت بلا سبب');
});

test('العقد: السلسلةُ مُشتقّةٌ من العقد لا موازيةٌ له', () => {
  const intent = expandQuery('بغيت بلومبي بأقلّ من ٥٠٠ درهم');
  const f = toSearchFilters(intent, 'فاس');
  const p = toSearchParams(intent, 'فاس');
  for (const [k, v] of Object.entries(f)) {
    assert.equal(p.get(k), String(v), `«${k}» في العقد وليس في السلسلة — بابان لسؤالٍ واحد`);
  }
});

test('القاعدةُ ㉒: مفهومٌ مقروءٌ يُمرَّر ولا يُقرأ ثانيةً', () => {
  // الحارسُ لا يُثبت شيئًا إن اتّفقت القراءتان. فتُختار جملةٌ تحسمها
  // القراءةُ الثانية إلى **غير** ما مُرِّر: إن غلبت القراءةُ الثانيةُ
  // ظهر للإنسان مفهومٌ وبُحث له عن آخر — وهذا ما تمنعه القاعدة.
  const said = 'بغيت شي كسوة لبنتي';
  const reread = expandQuery(said).concept;
  assert.equal(reread, 'kids_clothing', 'تغيّرت القراءةُ الثانية — يُراجَع الحارس');

  const i = expandQuery(said, 'plumber');
  assert.equal(i.concept, 'plumber',
    'المفهومُ المُمرَّرُ أُهمل وأُعيدت القراءة — حَكَمان في مشهدٍ واحد');
  assert.ok(i.terms.some(t => /سباك|Plombier/i.test(t)),
    `المرادفاتُ ما جاتش من المفهوم المُمرَّر: ${i.terms.join(' | ')}`);
});

// ── الأبوابُ نفسُها: مقروءةٌ من المصدر ─────────────────────────
// الحزمةُ تُكتَب في /tmp، فالمسارُ من جذر المستودع لا من موضع الملفّ.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

test('لا مُسلسِلَ ثانٍ لـ/search — `searchAPI.query` يُفوِّض ولا يبني قائمةً بيضاء', () => {
  const src = read('src/services/api.ts');
  const block = src.slice(src.indexOf('export const searchAPI'), src.indexOf('export const searchAPI') + 400);
  assert.ok(/businessAPI\.search\(/.test(block),
    '`searchAPI.query` ما بقاش يُفوِّض — رجعت القائمةُ البيضاء التي تُسقط ما تجهله بصمت');
  assert.ok(!/p\.set\(/.test(block), 'رجع بناءُ السلسلة يدويًّا داخل `searchAPI`');
});

test('السوقُ يسأل المحرّكَ الموحّد لا جدولًا واحدًا', () => {
  const src = read('src/pages/Marketplace.tsx');
  assert.ok(/businessAPI\.search\(/.test(src), 'السوقُ ما بقاش يسأل المحرّكَ الموحّد');
  assert.ok(!/listings\/public\/catalog/.test(src),
    'رجع بابُ الجدول الواحد — فالسوقُ يقول «ما لقّيناش» والبضاعةُ معروضةٌ في متجر');
  assert.ok(/toSearchFilters\(/.test(src), 'السوقُ يبني عقدَه بيدِه بدل العقد الواحد');
});

test('الأبوابُ الثلاثةُ تحمل الفهم: الشاشةُ الأولى · المساعد · المنسِّق', () => {
  for (const p of ['src/pages/LivingHome.tsx', 'src/pages/AssistantPage.tsx', 'src/lib/core/orchestrator.ts']) {
    const src = read(p);
    assert.ok(/from '(\.\.\/)+lib\/searchIntent'|from '\.\.\/searchIntent'/.test(src),
      `${p} ما كيستعملش عقدَ البحث — رجع يبني سلسلتَه بيدِه`);
  }
});

test('لا تُبنى سلسلةُ terms بيدٍ خارج العقد', () => {
  for (const p of ['src/pages/LivingHome.tsx', 'src/pages/AssistantPage.tsx', 'src/pages/Marketplace.tsx']) {
    const src = read(p);
    assert.ok(!/[?&]terms=|'terms'|"terms"/.test(src),
      `${p} يكتب «terms» بيدِه — نسختان من العقد تتباعدان مع الوقت`);
  }
});
