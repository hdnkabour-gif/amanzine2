import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { decideExecution } from '../../src/lib/executionPolicy';
import { abilityFor } from '../../src/lib/abilities';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';
import { categoryForConcept } from '../../src/lib/catalog';

// ============================================================
// **من شاشات صاحب المشروع** — أربعُ لقطاتٍ حيّة، لا جملٌ مُختلَقة.
//
//   وكشفت طبقةً لم تكن مقيسة: الحَكَمُ يقرأ صحيحًا **والشاشةُ تسأل كأنّها
//   لم تقرأ**. وهذا هو «المستويان لا يلتقيان» في أوضح صورةٍ للإنسان:
//
//     «fin wesselat lcommande deyal tanger» ⇒ «أشنو المجال؟ 💧 الماء / ⚡ الكهرباء…»
//     «بغيت نبدل النمرة ديالي»               ⇒ «شنو كتعرض؟ 🧰 خدمة / 🏪 محلّ…»
//     «عندي مشكل فالتلفازة»                  ⇒ «أشنو نوع المشكل؟ … ❄️ **جهاز خربان**»
//     «bghit nebi3 bikala»                   ⇒ «**نتا درّاجة هوائيّة** وباغي تعلن»
//
//   الثالثةُ أوضحُها: قرأ «إصلاح التلفاز» ثمّ عرض «جهاز خربان» خيارًا —
//   عرض الجوابَ سؤالًا. والرابعةُ تقول للإنسان إنّه درّاجة.
// ============================================================

const judge = (s: string) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  const match = abilityFor({ action: u.action, intent: r?.intent, stance: u.stance } as any);
  return { u, r, match, d: decideExecution(u, match || undefined, false) };
};

test('**مَن يدير حسابَه لا يُسأل سؤالَ سوق** — والفعلُ مقروءٌ بيقين', () => {
  const cases: [string, string, string][] = [
    ['fin wesselat lcommande deyal tanger', 'VIEW_ORDERS', 'orders'],
    ['بغيت نبدل النمرة ديالي', 'CHANGE_PHONE', 'settings'],
    ['bghit nebdel nemra deyali', 'CHANGE_PHONE', 'settings'],
    ['بدّل السمية ديال المحل', 'UPDATE_WORKSPACE', 'settings'],
  ];
  for (const [s, id, page] of cases) {
    const { r, match, d } = judge(s);
    assert.equal(r.steps ?? undefined, undefined, `«${s}» سُئلت «${r.steps?.[0]?.q}» — وهي فعلٌ إداريٌّ لا طلبُ سوق`);
    assert.equal(match?.id, id, `«${s}» طابقت ${match?.id}`);
    assert.equal(d.dest?.page, page, `«${s}» وجهتُها ${d.dest?.page}`);
  }
});

test('والحقلُ يُفتَح وحدَه — «النمرة» و«السميّة» خانتان لا صفحتان', () => {
  assert.equal(judge('bghit nebdel nemra deyali').d.dest?.focus, 'phone');
  assert.equal(judge('bghit nbdel smiya dyal l7anout').d.dest?.focus, 'shop_name');
  // ── **والمجرّدُ بلا «ال» يُسبَر بجملةٍ تحتاجه** ────────────────
  //   سُبرت الصيغةُ العارية أوّلًا بجملةٍ فيها «ال» فلم يسقط شيء — لأنّ
  //   `nemra` تُحوَّل إلى «**ال**نمرة» في خريطة الكلمات. أي أنّ السبرَ كان
  //   يقيس ما لا يعتمد عليه. وهذه تحتاجها: بلا الصيغة العارية تُقرأ
  //   `update/settings` ⇒ «شنو بغيتي تبدّل؟» لمن سمّى نمرتَه.
  assert.equal(understand('بدل نمرة ديالي').action?.object, 'phone',
    'سقط المجرّدُ بلا «ال» — «بدل نمرة ديالي» تُقرأ إعداداتٍ عامّة');
});

test('ولا يبتلع الفعلُ الإداريُّ السوقَ — القراءةُ الضعيفةُ لا تحسم', () => {
  for (const [s, intent] of [['بغيت نبيع شي حاجة جديدة', 'sell'], ['عندي دار للكراء', 'rent'],
                             ['كنقلب على حداد', 'find_pro'], ['عندي محل ديال المسمن والحرشة', 'create_store']] as const) {
    assert.equal(judge(s).r.intent, intent, `«${s}» صارت ${judge(s).r.intent}`);
  }

  // ── **والحدُّ نفسُه يُسبَر بجملةٍ تبلغه** ──────────────────────
  //
  //   سُبر أوّلًا بـ«بغيت نبيع شي حاجة جديدة» فلم يسقط الحارس — لأنّ طبقةَ
  //   النيّة الإنسانيّة تحسمها `SELL` قبل أن يصل الدورُ إلى هذا الفرع أصلًا.
  //   أي أنّ الحارسَ كان يحرس حدًّا لا تبلغه جملتُه. وهي ثالثُ مرّةٍ في هذا
  //   العمل، فصار السبرُ لا الاطمئنانُ هو المقياس.
  //
  //   وهذه تبلغه: «بغيت **نغير** حياتي» تُقرأ `update/settings` بثقة ٠٫٣٥ —
  //   فعلٌ عامٌّ بلا هدفٍ يسقط على الإعدادات. ولو قُبلت القراءةُ الضعيفةُ
  //   لسِيقَ مَن يريد أن يغيّر حياتَه إلى **إعدادات التطبيق**.
  const life = judge('بغيت نغير حياتي');
  assert.notEqual(life.r.intent, 'manage',
    'سِيق مَن يريد أن يغيّر حياتَه إلى الإعدادات — سقط حدُّ ٠٫٥');
  assert.notEqual(judge('بغيت نزيد').r.intent, 'manage', '«بغيت نزيد» بلا هدفٍ صارت أمرًا إداريًّا');
});

// ── **حارسٌ صحيحٌ ومُعطَّلٌ بصمت** ──────────────────────────────
//
//   شرطُ «لا تسأل سؤالًا تعرف جوابه» كان يستدعي `categoryForConcept` —
//   وهي تختار **قالبَ الاستمارة** لا تقيس معرفتَنا بالمجال. و`tv_repair`
//   لا تطالب بها فئةٌ ولا `services[]` لها، فرجعت `undefined` فسقط الحارسُ
//   **مفتوحًا** على الحالة التي كُتب لها بالضبط.
test('«عندي مشكل فالتلفازة» ⇒ إصلاحُ التلفاز — لا «أشنو نوع المشكل؟»', () => {
  const { r } = judge('عندي مشكل فالتلفازة');
  assert.equal(r.steps ?? undefined, undefined, `سُئل «${r.steps?.[0]?.q}» وقد قال جهازَه`);
  assert.equal(r.label, 'إصلاح التلفاز');
  // والسببُ البنيويُّ يُحرَس: لو عاد الشرطُ إلى قالب الاستمارة لعاد العطب.
  assert.equal(categoryForConcept(resolveConcept('عندي مشكل فالتلفازة')?.id), undefined,
    'صار لـ`tv_repair` قالبُ استمارة — الحارسُ ما عاد يقيس ما وُضع له');
});

test('ويبقى السؤالُ حيث لا جواب — إسقاطُه بلا معرفةٍ تخمينٌ', () => {
  for (const s of ['عندي مشكل فالدار', 'عندي مشكل', 'واش ممكن تعاونّي؟']) {
    assert.ok(judge(s).r.steps?.length, `«${s}» ما بقاش كتسأل — وما عرفنا مجالَها`);
  }
});

test('و«الحرف والصنائع» عنوانُ بابٍ لا مجال — سطرُ جدولٍ صار مفهومًا', () => {
  // «أنا حرفي» تنحلّ إلى `artisanat_et_m_tiers_manuels` — دارجتُه «`crafts`»
  // بين علامتَي اقتباسٍ خلفيّتَين، وأعمدةُ لغاته مُزاحة. فهو جوابُ السؤال
  // نفسِه («🔧 حرفيّ») لا شيءٌ أخصُّ منه، وإسقاطُ السؤال يترك الرجلَ بلا حرفة.
  const { r } = judge('أنا حرفي');
  assert.ok(r.steps?.[0]?.q?.includes('الخدمة'), 'سقط سؤالُ الحرفة على تعريفٍ عامّ');
  assert.match(String((resolveConcept('أنا حرفي') as any)?.concept?.darija), /^`.*`$/,
    'تغيّرت بياناتُ المفهوم — التوقيعُ الذي يميّز سطرَ الجدول لم يعد قائمًا');
});

test('و«نتا» لمن يكون لا لما يملك — «نتا درّاجة هوائيّة» تقول للإنسان إنّه درّاجة', () => {
  // الفرقُ مقروءٌ سلفًا: ما جاء من `profession` هو المتكلّمُ نفسُه، وما جاء
  // من غيره شيءٌ يملكه. والقياسُ هنا على المصدر لا على النصّ المعروض.
  const bike = understand('bghit nebi3 bikala') as any;
  assert.equal(bike.profession?.label, undefined, 'صارت الدرّاجةُ حرفةً — انقلب المصدر');
  assert.equal(parseNeed('bghit nebi3 bikala', {} as any).label, 'درّاجة هوائيّة');
  const smith = understand('أنا حداد') as any;
  assert.ok(smith.profession?.label, 'الحدّادُ فقد حرفتَه — والصيغةُ تعتمد عليها');
});
