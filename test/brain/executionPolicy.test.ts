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
