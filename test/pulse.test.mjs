import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ============================================================
// السقّاطة — **الأرقامُ تتحسّن ولا ترتدّ**.
//
//   سؤالُ المالك الذي وُلد منه هذا الملفّ: «كيف سنعرف أنّ كلَّ ما قمنا به
//   يؤثّر على التطبيق؟»
//
//   الاختباراتُ الأخرى تُثبت أنّ **القطعة** تعمل. وقد تكون كلُّها خضراءَ
//   والحصيلةُ رديئة: قِيس أنّ ٤٥ جملةً من ٥٩ كانت تُقابَل بسؤال، و**صفرٌ**
//   يُنفَّذ — بينما كلُّ اختبارٍ يمرّ.
//
//   فهذا الملفّ يقيس **الحصيلة**: يمرّر المدوّنةَ على كلّ الطبقات ويقارن
//   بخطِّ أساسٍ محفوظ. ولا يطلب رقمًا بعينه — يطلب **ألّا يسوء**.
//
//   ── لماذا سقّاطةٌ لا قيمةٌ ثابتة ──
//   لو ثبّتنا «٣٥ مفهومة» لسقط الاختبارُ عند كلّ تحسّن. ولو تركناه بلا حدٍّ
//   لمرّ كلُّ ارتداد. فالسقّاطةُ تسمح بالصعود وتمنع النزول — ويُحدَّث الأساسُ
//   بيدٍ واعية، لا بتشغيلٍ تلقائيٍّ يجعله يتبع العطبَ إلى أسفل.
//
//   ولا تُحذَف جملةٌ من المدوّنة لترتفع النسبة: ذاك أسهلُ طرق خداع النفس،
//   ويحرسه `sentences` أدناه.
//
//   ── وحدُّ هذه الأداة، مكتوبًا بصراحة ──
//   سُبرت بإعادة خمسة أعطابٍ من مراحلَ منجَزة. أمسكت ثلاثةً وأفلتت اثنين:
//   ارتدادَ المطبِّع (أُصلح بإضافة `variantDrift`)، وتخمينَ الجسر لقدرةٍ
//   قريبةٍ — وهذا لا يُمسَك هنا لأنّ أثرَه لا يظهر في الحصيلة، ويحرسه
//   اختبارُ الوحدة. فالنبضُ يقيس **الحصيلة**، والاختباراتُ تقيس **الآليّة**،
//   ولا يُغني أحدُهما عن الآخر. وادّعاءُ أنّ رقمًا واحدًا يكفي وهمٌ مريح.
// ============================================================

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = JSON.parse(readFileSync(join(ROOT, 'test/pulse.baseline.json'), 'utf8'));

const out = join(mkdtempSync(join(tmpdir(), 'amz-pulse-')), 'pulse.mjs');
execSync(`npx esbuild scripts/pulse.ts --bundle --platform=node --format=esm --outfile="${out}" --log-level=error`,
  { cwd: ROOT, stdio: 'pipe' });
const { measure } = await import(out);
const p = measure();

test('المدوّنةُ لم تُقلَّص — لا تُحذَف جملةٌ صعبةٌ لترتفع النسبة', () => {
  assert.ok(p.sentences >= BASE.sentences,
    `صُغِّرت المدوّنةُ من ${BASE.sentences} إلى ${p.sentences} — النسبةُ ترتفع بلا أن يتحسّن شيء`);
});

test('الفهمُ لا يرتدّ', () => {
  assert.ok(p.understood >= BASE.minUnderstood,
    `فُهم ${p.understood} وكان ${BASE.minUnderstood}`);
  assert.ok(p.stanceKnown >= BASE.minStanceKnown,
    `عُرف الاتّجاه في ${p.stanceKnown} وكان ${BASE.minStanceKnown}`);
});

test('حقائقُ الشخص لا ترتدّ', () => {
  // كانت صفرًا. وأيُّ عودةٍ إلى الصفر تعني أنّ التطبيق نسي من يُكلّمه.
  assert.ok(p.personFacts >= BASE.minPersonFacts,
    `حقائقُ الشخص ${p.personFacts} وكانت ${BASE.minPersonFacts}`);
});

test('كلُّ جملةٍ تجد قدرةً في الكتالوج', () => {
  // نقصانُ هذا الرقم يعني جملةً يفهمها التطبيقُ ولا يعرف ماذا يفعل بها.
  assert.ok(p.abilityMatched >= BASE.minAbilityMatched,
    `طابقت ${p.abilityMatched} قدرةً وكانت ${BASE.minAbilityMatched}`);
});

test('التنفيذُ لا يقلّ والسؤالُ لا يكثر', () => {
  // العطبُ الأصليّ: عتبةٌ واحدةٌ ٠٫٩٠ جعلت التنفيذَ صفرًا والسؤالَ ٤٥.
  // ومن يُسأل في كلّ جملةٍ يشعر أنّه يملأ استمارةً لا أنّه يُفهَم.
  assert.ok((p.verdicts.execute || 0) >= BASE.minExecute,
    `نُفِّذت ${p.verdicts.execute || 0} وكانت ${BASE.minExecute}`);
  assert.ok((p.verdicts.ask || 0) <= BASE.maxAsk,
    `سُئل في ${p.verdicts.ask || 0} وكان ${BASE.maxAsk}`);
});

test('انقسامُ العقلَين لا يتّسع', () => {
  // `understand` يرى مفهومًا و`parseNeed` يقول `unknown` — أو العكس.
  // الرقمُ الذي يقيس الانقسامَ البنيويّ، وهدفُه النزولُ إلى صفر.
  assert.ok(p.brainSplit <= BASE.maxBrainSplit,
    `اختلف العقلان في ${p.brainSplit} وكان ${BASE.maxBrainSplit}`);
});

test('لا صمتَ جديد', () => {
  assert.ok(p.silent <= BASE.maxSilent,
    `صمتَ في ${p.silent} وكان ${BASE.maxSilent}`);
});

test('الفهمُ لا يتزحزح بفارقٍ لا يراه إنسان', () => {
  // أُضيف بعد سبرٍ كشف حدَّ الأداة: إعادةُ المطبِّع الضعيف **لم تُحرّك** أيَّ
  // رقمٍ آخر، لأنّ المدوّنة مكتوبةٌ بصيغةٍ واحدة والناسُ يكتبون بصيغٍ شتّى.
  assert.ok(p.variantDrift <= BASE.maxVariantDrift,
    `انحرف الفهمُ في ${p.variantDrift} حالةً وكان ${BASE.maxVariantDrift}`);
});

test('لا يُنفَّذ ما لا يجوز تنفيذُه — **صفرٌ مطلق**', () => {
  // نقلُ كلامِ غيره · نفيٌ · «كيفاش» · شرطٌ · ماضٍ. هذا الحدُّ الوحيدُ الذي
  // ليس سقّاطةً بل شرطٌ قاطع: فعلٌ لم يطلبه أحدٌ أسوأُ من ألّا نفهم.
  assert.equal(p.wrongExecutions, 0,
    `نُفِّذت ${p.wrongExecutions} جملةً لا يجوز تنفيذُها`);
});
