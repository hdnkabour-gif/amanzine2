import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideExecution, explainDecision } from '../../src/lib/executionPolicy';
import { understand } from '../../src/lib/akg/kb';

// ============================================================
// سياسةُ التنفيذ — المكانُ الوحيد الذي يقول «نفّذ أم لا».
//
//   كان القرارُ مبعثرًا في أربعة ملفّات، وخطرُ التبعثر ليس الفوضى بل
//   **الثقب**: طبقةٌ تقول «لا أعرف» وأخرى تقول «واثق»، فيُنفَّذ الفعلُ لأنّ
//   أحدًا لم يجمع الصوتَين — ولا يمكن اختبارُ الحصيلة إطلاقًا.
//
//   والترتيبُ هنا **جزءٌ من المعنى**، وأهمُّه الأوّل: **الوضوحُ ليس إذنًا**.
// ============================================================

const U = (o: any) => ({ capabilities: [], concepts: [], context: {}, reasoning: [], confidence: 0.95, ...o }) as any;

test('الوضوحُ ليس إذنًا — النقلُ عن غيره لا يُنفَّذ ولو بلغت الثقةُ ١٠٠٪', () => {
  const u = understand('قال ليا الزبون بغيت نرجع السلعة');
  const d = decideExecution({ ...u, confidence: 1 } as any);
  assert.equal(d.verdict, 'explain');
  assert.match(d.trace[0], /صيغة/);
});

test('النفيُ يسأل ولا يُنفّذ ولا يُخمّن عكسًا', () => {
  const d = decideExecution(U({ negated: true }));
  assert.equal(d.verdict, 'ask');
  assert.match(d.say, /شنو بغيتي/);
});

test('الغموضُ يسأل بسؤال المفهوم نفسِه', () => {
  const d = decideExecution(U({ ambiguity: { term: 'موطور', ask: 'موطور ديال الطوموبيل، ولا درّاجة؟', options: [] } }));
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, 'موطور ديال الطوموبيل، ولا درّاجة؟');
});

test('النقصُ المعلوم يسأل سؤالًا واحدًا — لا استمارة', () => {
  const d = decideExecution(U({ action: { verb: 'update', object: 'price', scope: 'workspace', needs: ['أيّ منتج؟'], confidence: .7, reason: '' } }));
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, 'أيّ منتج؟');
});

test('ما لا يُسترجَع يُؤكَّد — ولو كان الفهمُ تامًّا', () => {
  const d = decideExecution(U({ action: { verb: 'delete', object: 'workspace', scope: 'workspace', needs: ['تأكيد: هذا لا يُسترجَع'], confidence: .7, reason: '' } }));
  assert.equal(d.verdict, 'confirm');
  assert.match(d.say, /ما كيرجعش/);
});

test('اليقينُ العالي ينفّذ بلا سؤال', () => {
  assert.equal(decideExecution(U({ confidence: 0.95 })).verdict, 'execute');
});

test('اليقينُ المتوسّط يؤكّد، والضعيفُ يسأل', () => {
  assert.equal(decideExecution(U({ confidence: 0.7 })).verdict, 'confirm');
  assert.equal(decideExecution(U({ confidence: 0.2 })).verdict, 'ask');
});

// ── الترتيبُ جزءٌ من المعنى ───────────────────────────────────
test('الصيغةُ تسبق النفيَ والغموضَ والثقة', () => {
  const u = understand('قال ليا الزبون بغيت نرجع السلعة');
  const d = decideExecution({ ...u, negated: true, ambiguity: { term: 'x', ask: 'y', options: [] }, confidence: 1 } as any);
  assert.equal(d.verdict, 'explain', 'حسمت طبقةٌ أدنى قبل الصيغة');
});

test('التأكيدُ يأتي بعد اكتمال الفهم لا قبله', () => {
  // حذفٌ + نقصٌ حقيقيّ ⇒ نسأل عن النقص أوّلًا. سؤالُ التأكيد على فعلٍ لم
  // نفهمه بعد يجعل الإنسانَ يؤكّد شيئًا لا يعرفه.
  const d = decideExecution(U({ action: { verb: 'delete', object: 'product', scope: 'workspace', needs: ['أيّ منتج؟', 'تأكيد: هذا لا يُسترجَع'], confidence: .5, reason: '' } }));
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, 'أيّ منتج؟');
});

test('كلُّ قرارٍ يحمل أثرَه — يُعرَض عند الشكوى ويُصحَّح به', () => {
  const d = decideExecution(U({ confidence: 0.95 }));
  assert.ok(d.trace.length, 'قرارٌ بلا أثر');
  assert.match(explainDecision(d), /execute ←/);
});

// ============================================================
// العتبةُ تتبع الخطورة — لا عتبةً واحدةً لكلّ شيء.
//
//   قياسٌ على ٣٦ جملةً من المالك: `execute` **صفر**، و`ask` ٣٢. والسببُ
//   بنيويّ لا لغويّ: عتبةُ التنفيذ ٠٫٩٠ وسقفُ الفهم الواقعيّ ٠٫٦٠ — فصار
//   «نفّذ» بابًا لا يُفتَح، والتطبيقُ استمارةً تسأل ولا تفعل.
//
//   والخفضُ العامُّ ليس حلًّا: يُحذَف متجرٌ بثقةٍ ضعيفة. فالصواب أن تتبع
//   العتبةُ ما يُخسَر لو أخطأنا.
// ============================================================
import { ability, RISK_THRESHOLD } from '../../src/lib/abilities';
import { abilityFor } from '../../src/lib/abilities';

test('العرضُ يُنفَّذ بثقةٍ لا تكفي للتعديل', () => {
  // الفهمُ **تامٌّ** عمدًا: الحاجةُ معروفة (`service`)، كي يكون المقيسُ هنا
  // هو العتبةَ وحدَها لا بوّابةَ النقص. ولو تُرك الفهمُ فارغًا لخرج `ask`
  // من الطبقة ⑤ فبدا أنّ العتبةَ فشلت وهي لم تُبلَغ أصلًا.
  const u: any = { confidence: 0.5, reasoning: [], service: 'clothing' };
  // بلا قدرةٍ: العتبةُ العامّة ٠٫٩٠ ⇒ سؤال. وهذا هو العطبُ المقيس.
  assert.equal(decideExecution(u).verdict, 'ask');
  // بقدرةٍ منخفضة الخطر: يُنفَّذ.
  assert.equal(decideExecution(u, ability('BUY_PRODUCT')).verdict, 'execute');
  // وبقدرةٍ متوسّطة: لا يُنفَّذ بنفس الثقة.
  assert.notEqual(decideExecution(u, ability('UPDATE_PRODUCT')).verdict, 'execute');
});

test('الخطِرُ لا يُنفَّذ ولو بلغ اليقينُ مئةً', () => {
  // الحارسُ الحقيقيُّ أن الخطِرَ **لا يبلغ `execute` أبدًا** — لا أن يخرج
  // `confirm` بعينه. فمن نقص فهمُه يُسأل أوّلًا (الطبقة ⑤ قبل ⑥)، وهذا
  // أسلمُ لا أضعف: من يؤكّد دفعًا بلا مبلغٍ يؤكّد شيئًا لا يعرفه.
  const u: any = { confidence: 1, reasoning: [] };
  for (const id of ['DELETE_PRODUCT', 'CHANGE_PHONE', 'MAKE_PAYMENT', 'CREATE_SHIPMENT']) {
    const d = decideExecution(u, ability(id)!);
    assert.notEqual(d.verdict, 'execute', `${id}: نُفِّذ بلا تأكيد`);
  }
  assert.ok(RISK_THRESHOLD.high > 1, 'عتبةُ الخطِر قابلةٌ للبلوغ');
});

test('وحين يكتمل الفهمُ يُؤكَّد التأكيدُ **باسم الفعل**', () => {
  // «واش هادشي هو اللي بغيتي؟» تصلح للفهم، ولا تصلح لما لا يُسترجَع: من
  // يؤكّد حذفًا يجب أن يقرأ كلمة «تحيّد» قبل أن يضغط. ولذلك لا يكفي أن
  // تُخرِج العتبةُ `confirm` — يلزم حارسٌ صريح.
  //
  //   وهذا الحارسُ كان مدمَجًا في الذي فوقه، فسقط حين صار النقصُ يُطرَح:
  //   الدفعُ والشحنُ يُسألان عن مبلغٍ وطلبٍ لا تحملهما `Understanding`.
  //   ففُصل ووُضع على الحذف — الخطِرُ الوحيدُ الذي تُملأ حاجتُه من الجملة.
  const a = ability('DELETE_PRODUCT')!;
  const d = decideExecution({ confidence: 1, reasoning: [], service: 'clothing' } as any, a);
  assert.equal(d.verdict, 'confirm', 'الحذفُ نُفِّذ بلا تأكيد');
  assert.ok(d.say.includes(a.say), `تأكيدٌ لا يسمّي الفعل — «${d.say}»`);
  assert.ok(d.trace.some(t => t.includes(a.id)), 'أثرٌ لا يذكر القدرة');
});


test('الجسر: الفعلُ أدقُّ من النيّة', () => {
  // قِيس حرفيًّا: «بغيت نبدل الثمن ديال القميص الأحمر ل ١٢٠ درهم» تُقرأ في
  // `parseNeed` نيّةَ **شراء** بميزانية ١٢٠ درهمًا — أي تاجرٌ يُقرأ زبونًا.
  // و`readAction` يقرؤها `update:price` صحيحةً. فمن حسم الفعلُ عنده لا
  // تُسأل النيّة.
  const a = abilityFor({ action: { verb: 'update', object: 'price' }, intent: 'buy' });
  assert.equal(a?.id, 'UPDATE_PRODUCT', 'غلبت النيّةُ الفعلَ — فيُقرأ التاجرُ زبونًا');
});

test('الجسر لا يخمّن — ما لا يطابق يُرجع null', () => {
  // قدرةٌ خاطئةٌ أسوأُ من لا قدرة: تلك تُسأل، وهذه تنفّذ فعلًا لم يطلبه أحد.
  assert.equal(abilityFor({ action: null, intent: 'unknown' }), null);
  assert.equal(abilityFor({}), null);
  assert.equal(abilityFor({ action: { verb: 'زائف', object: 'زائف' } }), null);
});

test('النيّةُ تُستعمَل حين لا فعلَ — ولا تُهمَل', () => {
  assert.equal(abilityFor({ action: null, intent: 'find_pro' })?.id, 'FIND_PROVIDER');
  assert.equal(abilityFor({ intent: 'create_store' })?.id, 'CREATE_WORKSPACE');
});

// ============================================================
// «موتُ السحر» — أن يعرف التطبيقُ ثمّ يسأل عمّا يعرفه.
//
//   قِيس بالنبض: ٧ من ٢٥ جملةً واضحةً تُقابَل بسؤالٍ بلا داعٍ. وأصرحُها:
//       «عندي محل ديال الخضرة» ⇒ «شنو نوع النشاط؟»
//       «أنا خضار»             ⇒ «شنو الخدمة اللي كتقدّم؟»
//   والسببُ بنيويٌّ لا لغويّ: `needs` كانت **نصوصًا تُطبَع**، فلا سبيلَ إلى
//   سؤالها «هل عُرف هذا؟». صارت مفاتيحَ تُفحَص.
// ============================================================
import { unmetNeeds, nextQuestion, NEED_ASK, ABILITIES } from '../../src/lib/abilities';

test('ما عُرف يُطرَح من المطلوب — لا يُسأل عمّا قيل للتوّ', () => {
  const sell = ability('SELL_PRODUCT')!;
  assert.deepEqual(unmetNeeds(sell), ['product', 'price'], 'بلا فهمٍ: كلُّه ناقص');
  // من سمّى بضاعتَه سمّى منتَجَه — «بغيت نبيع طوموبيل».
  assert.deepEqual(unmetNeeds(sell, { trade: 'automobile' }), ['price']);
  assert.deepEqual(unmetNeeds(sell, { trade: 'automobile', price: 30000 }), []);
  // والخضّارُ لا يُسأل عن نشاطه بعد أن سمّاه.
  assert.deepEqual(unmetNeeds(ability('OFFER_SERVICE')!, { trade: 'greengrocer' }), []);
});

test('الثمنُ صفرٌ ثمنٌ مذكور — والفراغُ ليس رقمًا', () => {
  // `!!0 === false`. ولو قيست الحاجةُ بالصدق لسُئل مَن قال «بلاش» عن ثمنه.
  const sell = ability('SELL_PRODUCT')!;
  assert.ok(!unmetNeeds(sell, { trade: 'x', price: 0 }).includes('price'), 'الصفرُ عُدّ نقصًا');
  assert.ok(unmetNeeds(sell, { trade: 'x', price: '' }).includes('price'));
  assert.ok(unmetNeeds(sell, { trade: 'x' }).includes('price'));
});

test('سؤالٌ واحدٌ لا استمارة — وبصياغةٍ من مكانٍ واحد', () => {
  const sell = ability('SELL_PRODUCT')!;
  assert.equal(nextQuestion(sell), NEED_ASK.product, 'سُئل عن غير الأوّل');
  assert.equal(nextQuestion(sell, { trade: 'automobile' }), NEED_ASK.price);
  assert.equal(nextQuestion(sell, { trade: 'automobile', price: 30000 }), '', 'سأل وما نقص شيء');
});

test('كلُّ مفتاحِ حاجةٍ له سؤالٌ دارجيّ — لا مفتاحَ يخرج بلا كلام', () => {
  // لو أُضيف مفتاحٌ إلى قدرةٍ ونُسي في `NEED_ASK` لخرج `undefined` إلى وجه
  // الإنسان. حارسٌ رخيصٌ يمسك السهو عند الإضافة لا عند الشكوى.
  for (const a of ABILITIES) {
    for (const k of a.needs) {
      assert.ok(NEED_ASK[k] && NEED_ASK[k].trim().length > 2,
        `${a.id}: حاجةٌ بلا سؤال — «${k}»`);
    }
  }
});

test('البوّابةُ موصولةٌ بالقرار — لا تعيش في ملفّها وحدَها', () => {
  // الحارسُ أعلاه يقيس الدالّة. وهذا يقيس أنّ `decideExecution` **يستعملها**:
  // نفسُ الثقة، ونفسُ القدرة، والفرقُ الوحيدُ هو ما عُرف.
  const offer = ability('OFFER_SERVICE')!;
  const blind: any = { confidence: 0.95, reasoning: [] };
  const knowing: any = { confidence: 0.95, reasoning: [], service: 'greengrocer' };
  assert.equal(decideExecution(blind, offer).verdict, 'ask');
  assert.equal(decideExecution(blind, offer).say, NEED_ASK.trade);
  assert.equal(decideExecution(knowing, offer).verdict, 'execute',
    'عرف ثمّ سأل — «موتُ السحر»');
});

test('«بشحال؟» سؤالٌ في محلّه — والحدُّ معلَنٌ لا مخفيّ', () => {
  // وسمتُ «بغيت نبيع طوموبيل» في المدوّنة سؤالًا **بلا داعٍ**، وكان وسمي
  // خاطئًا: من يبيع بلا ثمنٍ لا إعلانَ له. والسببُ البنيويّ أنّ
  // `Understanding` **لا تحمل ثمنًا أصلًا** — الميزانيّةُ تُقرأ في
  // `parseNeed` ولا تصل إلى هنا. فالسؤالُ صحيحٌ اليوم، ويبقى صحيحًا حتّى
  // يُوصَل الثمن. وهذا الحارسُ يجعل ذلك اليومَ مرئيًّا لا صامتًا.
  const d = decideExecution({ confidence: 0.95, reasoning: [], service: 'automobile' } as any,
    ability('SELL_PRODUCT')!);
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, NEED_ASK.price, 'سُئل عن غير الثمن — والبضاعةُ مذكورة');
});

test('النقصُ يسبق الثقةَ والتأكيد — الترتيبُ جزءٌ من المعنى', () => {
  // يقينٌ تامٌّ وفهمٌ ناقص ⇒ سؤالٌ لا تنفيذ. الوضوحُ في **الصياغة** ليس
  // اكتمالًا في **المضمون**.
  const d = decideExecution({ confidence: 1, reasoning: [] } as any, ability('SELL_PRODUCT')!);
  assert.equal(d.verdict, 'ask');
  assert.match(d.trace.join(' · '), /ينقص/);
});

// ============================================================
// **أين يُساق** — بابُ القدرة لا صفحةُ النيّة.
//
//   لاحظه المالك: «أظنّ أنّ هناك خلطًا — أنت تشتغل على نيّة الطالب والعارض،
//   وهو يشتغل على ما يريد المستخدمُ أن يفعله». والقياسُ أثبته: `parseNeed`
//   تخلط محورَين في حقلٍ واحدٍ اسمُه `intent` — `sell`/`buy`/`find_pro`
//   اتّجاهُ سوق، و`create_store`/`manage` فعلٌ في التطبيق — **وهي التي كانت
//   تقرّر الصفحة**:
//
//       «بغيت نبدل رقم الهاتف ديالي» ⇒ intent=create_service ⇒ publish
//       «بغيت نشوف الزبناء ديالي»    ⇒ intent=create_service ⇒ conversations
//
//   أي أنّ صاحبَ الحساب يُدير متجرَه فيُساق إلى السوق ليتصفّح أو ينشر.
//   والكتالوجُ يعرف البابَ الصحيح ولم يكن أحدٌ يسأله.
// ============================================================
import { parseNeed } from '../../src/lib/needEngine';

const decideFor = (s: string) => {
  const u = understand(s);
  const r = parseNeed(s, {}) as { intent: string };
  return { u, r, d: decideExecution(u, abilityFor({ action: u.action ?? null, intent: r.intent }) ?? undefined) };
};

test('الفعلُ الإداريُّ يُساق إلى باب قدرته لا إلى السوق', () => {
  const CASES: [string, string][] = [
    ['بغيت نبدل رقم الهاتف ديالي', 'profile'],
    ['بغيت نشوف الزبناء ديالي', 'customers'],
    ['بغيت نزيد منتوج جديد', 'products'],
    ['بغيت نشوف الرصيد ديالي', 'wallet'],
  ];
  for (const [s, page] of CASES) {
    assert.equal(decideFor(s).d.dest?.page, page, `«${s}» سِيقت إلى غير بابها`);
  }
});

test('والباحثُ لا تُنتزَع منه وجهتُه — الحدُّ معلَن', () => {
  // `FIND_PROVIDER.page = 'home'` و`BUY_PRODUCT.page = 'home'` تقولان **أين
  // تعيش القدرة**، لا «أين يُساق الآن». والباحثُ واقفٌ على `home` أصلًا،
  // ووجهةُ `/market?q=…` أنفعُ منها. فسَوقُه إليها ينتزعه من نتائجه.
  //
  //   ── ولماذا ضاق هذا الحارسُ إلى الباحث وحدَه ──
  //   كان يشمل «بغيت نبيع سباط» و«عندي محل ديال الخضرة» أيضًا، وصفحتاهما
  //   `publish` — بابٌ حقيقيٌّ لا مكانَ سكنى. وقياسٌ على جملِ الناس أظهر
  //   الثمن: خمسُ جملٍ مفهومةٍ تمامًا تنتهي بلا وجهة، واثنتان منها يُحكَم
  //   فيهما بـ`execute` — أي أنّ التطبيق قرّر أن يفعل ثمّ لم يجد أين.
  //   وطلبُ صاحب المشروع نصًّا: مَن فُهم أنّه يريد بيعَ منتوجٍ تُفتَح له
  //   نافذةُ إضافة منتوج. فالحدُّ الصحيحُ `page === 'home'` لا مصدرُ المطابقة.
  for (const s of ['بغيت ميكانيكي فكازا', 'بغيت شي حداد']) {
    assert.equal(decideFor(s).d.dest, undefined, `«${s}» انتُزعت وجهتُها من نتائج البحث`);
  }
});

test('**ومن فُهمت نيّتُه يجد بابًا** — لا فهمَ ينتهي إلى لا شيء', () => {
  // نصفُ الحارس أعلاه المحذوف، مقلوبًا إلى ما يجب أن يقع.
  //   والوجهةُ تُقرأ من الكتالوج لا تُخمَّن هنا: «عندي محل ديال الخضرة»
  //   تُطابق `CREATE_WORKSPACE` ⇒ `settings` (صايب المحلّ)، لا `publish`.
  //   وقد كتبتُ `publish` أوّلًا ظنًّا فأسقطني السبرُ — والقياسُ هو الحكم.
  for (const [s, page] of [
    ['بغيت نبيع سباط', 'publish'],
    ['بغيت نبيع', 'publish'],
    ['عندي محل', 'publish'],
    ['عندي محل ديال الخضرة', 'settings'],
  ] as const) {
    const { d } = decideFor(s);
    assert.equal(d.dest?.page, page, `«${s}» ⇒ ${d.verdict} بلا وجهة — فهمٌ تامٌّ ينتهي إلى لا شيء`);
  }
});

test('الوجهةُ ترافق كلَّ حكمٍ لا الحكمَ الناجح وحدَه', () => {
  // «بغيت نبدل رقم الهاتف ديالي» حكمُها `ask` (تنقص النمرة). ولو لم تُرفَق
  // الوجهةُ بالسؤال لضاع البابُ بمجرّد أن يجيب الإنسان.
  const { d } = decideFor('بغيت نبدل رقم الهاتف ديالي');
  assert.equal(d.verdict, 'ask');
  assert.equal(d.dest?.page, 'profile', 'ضاعت الوجهةُ مع السؤال');
});

// ============================================================
// «ما نقدرش» — عادت، وعلى أساسٍ يُقاس هذه المرّة.
//
//   حُذفت أوّلًا لأنّ بابَها كان تحصيلَ حاصل، والبديلُ المرشَّح («لا قدرةَ
//   في الكتالوج») قِيس فوُجد يرفض ٤٢ زوجًا فيها أبوابٌ تعمل. وعادت الآن على
//   `ENTITY_VERBS`: إعلانٌ عن المجال لا عن كتالوجنا.
//
//   وهذان الاختباران وجهان لعملةٍ واحدة: أن تصدر حين يجب، وألّا تصدر حين
//   لا يجب. الأوّلُ وحدَه يُنتج مساعدًا يعتذر عمّا يقدر عليه.
// ============================================================
import { entityAccepts, VERB_MAP, OBJECT_MAP } from '../../src/lib/abilities';
import { abilityFor as abilityForJudge } from '../../src/lib/abilities';
import { understand as understandKb } from '../../src/lib/akg/kb';

/** نفسُ الحساب الذي تُجريه `LivingHome` — كي يُختبَر ما يعمل لا ما يُشبهه. */
const READ_ENOUGH = 0.5;
function judge(q: string) {
  const u: any = understandKb(q);
  const av = u.action ? VERB_MAP[u.action.verb] : undefined;
  const ae = u.action ? OBJECT_MAP[u.action.object] : undefined;
  // نفسُ حساب `LivingHome` — بما فيه حدُّ الثقة، وإلّا اختُبر ما لا يعمل.
  const impossible = !!(av && ae && (u.action?.confidence ?? 0) >= READ_ENOUGH
    && !entityAccepts(av, ae));
  // **والقدرةُ تُمرَّر.** كانت `undefined` دائمًا، فكان «حيّد الكوبون ⇒ confirm»
  // يمرّ بحكم `DESTRUCTIVE` لا بحكم خطورة القدرة — اختبارٌ يشهد لغير ما يقيس.
  const match = abilityForJudge({ action: u.action, intent: '' });
  return decideExecution(u, match || undefined, impossible).verdict;
}

test('«ما نقدرش» تصدر فعلًا — «حيّد اللغة» فعلٌ لا يفعله أحد', () => {
  assert.equal(judge('حيّد اللغة'), 'refuse',
    'الحكمُ عاد ميّتًا كما كان — لا جملةَ تُنتجه');
});

test('ولا تصدر على بابٍ يعمل — «وريني المنتجات» والصفحةُ قائمة', () => {
  // هذا هو الاختبارُ الذي أسقط البديلَ الأوّل: `view:product` ثغرةُ كتالوجٍ
  // لا عجز. من قيسها عجزًا اعتذر عمّا يقدر عليه.
  for (const q of ['وريني المنتجات', 'وريني الطلبات', 'وريني الزبناء', 'زيد منتوج جديد']) {
    assert.notEqual(judge(q), 'refuse', `«${q}» رُفضت وهي بابٌ يعمل`);
  }
});

test('والنيّةُ الخشنةُ تُسأل ولا تُرفَض — الجهلُ عندنا ليس عجزًا عندنا', () => {
  for (const q of ['بغيت سباك', 'عندي محل ديال الخضرة', 'شي حاجة']) {
    assert.notEqual(judge(q), 'refuse', `«${q}» رُفضت بلا فعلٍ صريح`);
  }
});

test('العجزُ يسبق النقصَ — لا يُستوضَح تفصيلُ فعلٍ لا يُفعَل', () => {
  const u: any = { confidence: 1, reasoning: [],
    action: { verb: 'delete', object: 'language', scope: 'user', needs: ['أيّ لغة؟'], confidence: 1, reason: '' } };
  assert.equal(decideExecution(u, undefined, true).verdict, 'refuse',
    'سُئل عن تفصيلِ فعلٍ مستحيل');
});


// ============================================================
// **العجزُ حكمٌ قاطعٌ فلا يُبنى على قراءةٍ ضعيفة.**
//
//   قِيس بعد إكمال الكتالوج: «زيد زبون جديد» تُقرأ `create:settings` بثقة
//   ٠٫٣٥ — قارئُ الأفعال يسقط على `settings` حين لا يعرف الهدف. والمجالُ لا
//   يقبل إنشاءَ إعدادات، فصار الجوابُ **«هادشي ما كايتديرش أصلًا»** لطلبٍ
//   مشروعٍ تمامًا. سوءُ قراءةٍ تحوّل رفضًا قاطعًا.
//
//   والفصلُ واضحٌ في الأرقام: الصحيحُ ٠٫٧٠–٠٫٨٥ والمُساء ٠٫٣٥.
// ============================================================
test('سوءُ قراءةٍ يُسأل عنه ولا يُرفَض — «زيد زبون جديد» طلبٌ مشروع', () => {
  assert.notEqual(judge('زيد زبون جديد'), 'refuse',
    '**رُفض طلبٌ مشروعٌ لأنّ قارئَ الأفعال أخطأ هدفَه**');
});

test('والرفضُ يبقى على القراءة الواثقة — «حيّد اللغة» تُقرأ بثقة ٠٫٧', () => {
  assert.equal(judge('حيّد اللغة'), 'refuse',
    'حدُّ الثقة ابتلع الحكمَ كلَّه — عاد ميّتًا كما كان');
});

// ── تصحيحُ ادّعاء ──────────────────────────────────────────────
//
//   ادّعيتُ أنّ إعلانَ `DELETE_COUPON` هو ما جعل «حيّد الكوبون» تُؤكَّد.
//   وسبرٌ أسقط الادّعاء: حذفُ القدرة **لم يُغيّر الحكم**، لأنّ
//   `DESTRUCTIVE.has('delete')` يُؤكِّد كلَّ حذفٍ بقدرةٍ أو بلا قدرة.
//   فكان الاختبارُ يشهد لغير ما يقيس.
//
//   وقياسٌ على المدوّنة كلِّها: القدرةُ تُبدّل الحكمَ في **أربع** حالاتٍ
//   فقط، وكلُّها من قدراتٍ **قديمة**. أي أنّ الأربعين المُعلَنةَ حديثًا
//   **لا تُبدّل حكمًا اليوم** — تُغلق الكتالوجَ وتُصحّح خطورةَ ما يُعلَن،
//   ولا تُنسَب إليها فائدةٌ غيرُ مقيسة.
test('حذفُ الكوبون يُعلَن خطِرًا — والخطورةُ هي ما تحمله القدرة', () => {
  const a = ability('DELETE_COUPON');
  assert.ok(a, 'قدرةُ حذف الكوبون غيرُ مُعلَنة');
  assert.equal(a!.risk, 'high', 'حذفٌ لا يُسترجَع مُعلَنٌ غيرَ خطِر');
  assert.equal(RISK_THRESHOLD[a!.risk] > 1, true, 'الخطِرُ يُنفَّذ تلقائيًّا');
});

test('وكلُّ حذفٍ يُؤكَّد ولو بلا قدرةٍ مُعلَنة — حارسٌ مستقلٌّ عن الكتالوج', () => {
  const u: any = { confidence: 1, reasoning: [],
    action: { verb: 'delete', object: 'product', scope: 'workspace', needs: [], confidence: .9, reason: '' } };
  assert.equal(decideExecution(u, undefined).verdict, 'confirm',
    'حذفٌ بلا قدرةٍ مُعلَنةٍ مرّ بلا تأكيد — الحارسُ يعتمد على الكتالوج وحدَه');
});
