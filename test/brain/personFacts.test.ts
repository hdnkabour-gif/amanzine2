import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPersonFacts, rememberFacts, factSources, forgetFact } from '../../src/lib/personFacts';
import { knownAbout, enrichSignals } from '../../src/lib/knownContext';

// ============================================================
// حقائقُ الشخص — والقاعدةُ التي تحكمها كلَّها:
//
//   **حقيقةٌ خاطئةٌ تدوم أسوأُ من صفرِ حقائق.**
//
//   الجملةُ تُنسى بعد ثوانٍ، والحقيقةُ تبقى وتسمّم كلَّ ما بعدها. ولذلك
//   أكثرُ هذه الاختبارات يحرس **الصمت** لا الالتقاط: أن تسكت الطبقةُ أمام
//   النيّة، وأمام النقل، وأمام السؤال، وأمام النفي.
// ============================================================

const clear = () => { try { localStorage.clear(); } catch { /* noop */ } };

// ── ① التصريحُ يُلتقَط ────────────────────────────────────────
test('التصريحُ بالحرفة يُقرأ', () => {
  assert.equal(readPersonFacts('أنا خضار').find(f => f.kind === 'trade')?.value, 'vegetable_fruit_seller');
  assert.equal(readPersonFacts('عندي محل ديال الخضرة').find(f => f.kind === 'trade')?.value, 'greengrocer');
  assert.equal(readPersonFacts('كنصايب الحلويات').find(f => f.kind === 'trade')?.value, 'pastry_chef');
});

test('ملكيّةُ المحلّ حقيقةٌ بذاتها', () => {
  assert.ok(readPersonFacts('عندي محل ديال الحوت').some(f => f.kind === 'hasWorkspace'));
  assert.ok(readPersonFacts('عندي بوتيك').some(f => f.kind === 'hasWorkspace'));
});

test('المدينةُ تُقبَل بلا اشتراط تصريحٍ بالهويّة', () => {
  // «بغيت سباك ف طنجة» نيّةٌ لا هويّة — لكنّها **تقول أين هو**. وهي الحقيقةُ
  // الوحيدةُ التي لا يضرّ أخذُها من جملةِ طلب.
  const f = readPersonFacts('بغيت سباك ف طنجة');
  assert.equal(f.find(x => x.kind === 'city')?.value, 'طنجة');
  assert.ok(!f.some(x => x.kind === 'trade'), 'جُعل طالبُ السبّاك سبّاكًا');
});

// ── ② الصمتُ حيث يجب — وهو جوهرُ الملفّ ──────────────────────
test('النيّةُ ليست هويّة', () => {
  // أغلبُ «الذكاء» يقع هنا: يستنتج الهويّةَ من النيّة. ومن باع سيّارتَه
  // مرّةً ليس بائعَ سيّارات، ومن طلب ميكانيكيًّا ليس ميكانيكيًّا.
  for (const s of ['بغيت نبيع طوموبيل', 'بغيت ميكانيكي', 'كنقلب على سباك',
                   'بغيت نشري كسوة لبنتي', 'بغيت نقلب على حداد', 'محتاج اللي يجيب ليا بانيني']) {
    assert.ok(!readPersonFacts(s).some(f => f.kind === 'trade'), `صارت نيّةٌ هويّةً: «${s}»`);
  }
});

test('«أنا» قبل فعلِ نيّةٍ ضميرٌ لا تصريح', () => {
  // «أنا بغيت نبيع مواد التنظيف» — الضميرُ يسبق فعلًا ولا يصف صاحبَه.
  assert.deepEqual(readPersonFacts('أنا بغيت نبيع مواد التنظيف').filter(f => f.kind === 'trade'), []);
  // بينما «أنا كنبيع» عادةٌ ⇒ حرفة.
  assert.ok(readPersonFacts('انا كنبيع مواد التنظيف').some(f => f.kind === 'trade'));
});

test('نقلُ كلامِ غيره لا يُسجَّل عليه', () => {
  for (const s of ['قال ليا الزبون أنا خضار', 'صاحبي عندي محل ديال الخضرة', 'شي واحد قال أنا خضار']) {
    assert.deepEqual(readPersonFacts(s), [], `سُجِّل كلامُ غيره: «${s}»`);
  }
});

test('النفيُ والسؤالُ لا يُنتجان حقائق', () => {
  for (const s of ['ماشي أنا خضار', 'واش أنا خضار', 'كيفاش نولّي خضار', 'يمكن نولّي خضار']) {
    assert.deepEqual(readPersonFacts(s).filter(f => f.kind === 'trade'), [],
      `حقيقةٌ من صيغةٍ لا تُلزم: «${s}»`);
  }
});

test('الشرطُ والماضي والنفيُ الصريح — ما تحرسه الصيغةُ وحدَها', () => {
  // هذه الأربعُ لا تحمل أيًّا من كلمات المنع، ويحلّ فيها المفهومُ صحيحًا
  // (`greengrocer` · `pastry_chef` · `fishmonger`). فلا يمنعها إلّا قراءةُ
  // **صيغة الكلام** والنفي. وبدونهما يصير من قال «لوكان عندي حانوت ديال
  // الحوت» بائعَ سمكٍ مسجَّلًا، ومن قال «ما عنديش محل» صاحبَ محلّ.
  const ONLY_MOOD: [string, string][] = [
    ['الى كان عندي محل ديال الخضرة غادي نبيع', 'شرط'],
    ['لوكان عندي حانوت ديال الحوت', 'شرط'],
    ['بعت الحلويات البارح', 'ماضٍ'],
    ['ما عنديش محل ديال الخضرة', 'نفي'],
    ['ما كنبيعش الخضرة', 'نفي'],
  ];
  for (const [s, why] of ONLY_MOOD) {
    assert.deepEqual(readPersonFacts(s), [], `${why}: سُجِّلت حقيقةٌ من «${s}»`);
  }
});

test('الفارغُ والقصيرُ يُرجعان فارغًا', () => {
  assert.deepEqual(readPersonFacts(''), []);
  assert.deepEqual(readPersonFacts('اه'), []);
});

// ── ③ عقدُ التخزين ───────────────────────────────────────────
test('ما يُكتَب هو ما يقرؤه knownAbout — لا شكلان لرسمٍ واحد', () => {
  clear();
  // `akg/userGraph.ts` المفصول يكتب `profession`، و`knownAbout` يقرأ
  // `activity`. لو كتبنا الأوّلَ لما رآه أحد.
  rememberFacts(readPersonFacts('عندي محل ديال الخضرة'));
  const k = knownAbout();
  assert.equal(k.activity, 'greengrocer', 'كُتب في خانةٍ لا يقرؤها أحد');
  assert.equal(k.hasWorkspace, true);
  clear();
});

test('كلُّ حقيقةٍ تحمل جملتَها — وبلا مصدرٍ لا تُراجَع', () => {
  clear();
  rememberFacts(readPersonFacts('عندي محل ديال الخضرة'));
  const src = factSources().find(s => s.slot === 'activity');
  assert.ok(src, 'حقيقةٌ بلا مصدر');
  assert.ok(src!.from.includes('الخضرة'), `مصدرٌ لا يحمل الجملة: «${src!.from}»`);
  clear();
});

test('ما لا يُنسى لا يُكتَب — التصحيحُ يمحو', () => {
  clear();
  rememberFacts(readPersonFacts('عندي محل ديال الخضرة'));
  assert.equal(knownAbout().activity, 'greengrocer');
  assert.equal(forgetFact('activity'), true);
  assert.equal(knownAbout().activity, undefined, 'بقيت حقيقةٌ بعد نسيانها');
  assert.ok(!factSources().some(s => s.slot === 'activity'), 'بقي المصدرُ بعد النسيان');
  assert.equal(forgetFact('activity'), false, 'ادّعى نسيانَ ما لا يوجد');
  clear();
});

test('الجديدُ يغلب القديم — الناسُ ينتقلون', () => {
  clear();
  rememberFacts(readPersonFacts('أنا ف كازا'));
  assert.equal(knownAbout().city, 'الدار البيضاء');
  rememberFacts(readPersonFacts('أنا ف طنجة'));
  assert.equal(knownAbout().city, 'طنجة', 'ذاكرةٌ لا تُحدَّث تصير عنادًا');
  clear();
});

test('التكرارُ لا يُنمّي المخزن', () => {
  clear();
  const facts = readPersonFacts('عندي محل ديال الخضرة ف طنجة');
  rememberFacts(facts);
  const size = () => (localStorage.getItem('amanzine_user_graph') || '').length;
  const first = size();
  for (let i = 0; i < 50; i++) rememberFacts(facts);
  assert.equal(size(), first, 'نما المخزنُ بتكرار نفسِ الحقيقة');
  // ولا يُبلَّغ عن كتابةٍ لم تقع.
  assert.deepEqual(rememberFacts(facts), []);
  clear();
});

// ── ④ لا تُكسَر القاعدةُ القائمة ─────────────────────────────
test('الجملةُ الحاضرةُ تغلب الذاكرة', () => {
  clear();
  rememberFacts(readPersonFacts('أنا ف طنجة'));
  // من كتب مدينتَه الآن فهو فيها — الذاكرةُ تملأ الفراغَ ولا تُصحّح إنسانًا.
  const kept = enrichSignals({ direction: 'offer', place: 'كازا' } as never, knownAbout());
  assert.equal(kept.signals.place, 'كازا');
  // وتملأ الفراغَ حين يسكت.
  const filled = enrichSignals({ direction: 'offer' } as never, knownAbout());
  assert.equal(filled.signals.place, 'طنجة');
  assert.ok(filled.filled.length, 'مُلئ بلا تفسير');
  clear();
});

test('بلا متصفّحٍ لا يسقط شيء', () => {
  // الطبقةُ تُستدعى في مسار الفهم؛ ورميُ خطأٍ هنا يُسقط الصفحة.
  clear();
  const g = globalThis as unknown as { localStorage?: unknown };
  const saved = g.localStorage;
  try {
    delete g.localStorage;
    assert.deepEqual(rememberFacts(readPersonFacts('أنا خضار')), []);
    assert.deepEqual(factSources(), []);
    assert.equal(forgetFact('activity'), false);
  } finally { g.localStorage = saved; }
});

// ── ⑤ ما يراه الإنسان ────────────────────────────────────────
test('ما يُعرَض عربيٌّ لا مُعرِّفٌ تقنيّ (القانون ١٠)', () => {
  // كشفه **تشغيلُ التطبيق** لا الاختبار: كان الشريطُ يقول «كتخدم ف
  // greengrocer». والاختباراتُ كلُّها خضراء، لأنّ أحدًا لم يسأل: بأيّ لغةٍ؟
  for (const s of ['عندي محل ديال الخضرة', 'أنا خضار', 'كنصايب الحلويات',
                   'عندي حانوت ديال الحوت', 'عندي محل حلاقة', 'عندي بوتيك']) {
    for (const f of readPersonFacts(s)) {
      assert.ok(!/[a-z]{3,}/i.test(f.say),
        `مُعرِّفٌ تقنيٌّ أمام الإنسان: «${f.say}» من «${s}»`);
      assert.ok(/[؀-ۿ]/.test(f.say), `وصفٌ بلا عربيّة: «${f.say}»`);
    }
  }
});
