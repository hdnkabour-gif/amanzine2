import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_STATE, writeState, readState, consumeState, clearIdentityState, clearJourneyState, JOURNEY_TTL } from '../../src/lib/clientState';
import { SYNCED_KEYS } from '../../src/lib/userMemory';

// ============================================================
// **RC-P2 — حدودُ الهويّة والمدّة لما يُحفَظ في المتصفّح.**
//
//   خمسةُ مفاتيحَ بخمسِ قواعدَ كتبها من كتبها ولم يجمعها أحد: واحدٌ بلا قارئ،
//   واثنان بلا مدّة، وتنظيفٌ غيرُ متماثل، وخروجٌ يمسح مفتاحًا من ثمانية.
//   وهذه حارسُ **السلوك** لا الشكل: تُنادى الدوالُّ نفسُها.
// ============================================================

const AREA = () => ({ local: globalThis.localStorage, session: globalThis.sessionStorage });
const wipe = () => { AREA().local.clear?.(); AREA().session.clear?.(); };

test('**الخروجُ يمرّ على السجلّ** — لا يبقى إلّا ما يخصّ الجهاز', () => {
  wipe();
  for (const k of CLIENT_STATE) writeState(k.key, { x: 1 }, 'USER_A');
  const before = CLIENT_STATE.filter(k => readState(k.key, 'USER_A') !== null).length;
  assert.ok(before >= 7, `لم تُكتَب المفاتيحُ أصلًا (${before})`);

  clearIdentityState();

  for (const k of CLIENT_STATE) {
    const alive = readState(k.key, 'USER_A') !== null;
    if (k.scope === 'device') assert.equal(alive, true, `مُحي تفضيلُ جهازٍ: ${k.key}`);
    else assert.equal(alive, false, `نجا مفتاحٌ يخصّ الهويّة/الرحلة: ${k.key}`);
  }
});

test('**ونسخةُ حسابٍ لا تُقرأ لحسابٍ آخر** — ولو نجت من المسح', () => {
  // المسحُ عند الخروج لا يكفي وحدَه: متصفّحٌ يُغلَق فجأةً يترك النسخة.
  wipe();
  writeState('ai_commerce_os_state', { products: [{ name: 'سلعةُ (أ)' }] }, 'USER_A');
  assert.ok(readState('ai_commerce_os_state', 'USER_A'), 'لم تُقرأ لمالكها');
  assert.equal(readState('ai_commerce_os_state', 'USER_B'), null, '**قُرئت نسخةُ (أ) تحت (ب)**');
  // ويُمحى المخالفُ عند الاصطدام، فلا يبقى فخًّا لقراءةٍ لاحقة.
  assert.equal(readState('ai_commerce_os_state', 'USER_A'), null, 'بقيت النسخةُ بعد رفضها');
});

test('**والمدّةُ تُفحَص لكلّ مفتاحِ رحلةٍ** — لا للحاجة وحدَها', () => {
  // `amanzine_need` كان له انتهاءٌ و`_stance` لا. فاتّجاهُ عرضٍ متروكٌ يخطف
  //   أوّلَ دخولٍ لاحقٍ إلى صفحة النشر، ولو مضت ساعات.
  wipe();
  for (const k of CLIENT_STATE.filter(x => x.scope === 'journey')) {
    assert.equal(k.ttlMs, JOURNEY_TTL, `مفتاحُ رحلةٍ بلا مدّة: ${k.key}`);
  }
  writeState('amanzine_need_stance', 'offer');
  assert.equal(readState('amanzine_need_stance'), 'offer');
  // يُزوَّر ختمُ الوقت إلى ما قبل المدّة
  const raw = JSON.parse(globalThis.sessionStorage.getItem('amanzine_need_stance')!);
  raw.at = Date.now() - JOURNEY_TTL - 1000;
  globalThis.sessionStorage.setItem('amanzine_need_stance', JSON.stringify(raw));
  assert.equal(readState('amanzine_need_stance'), null, '**اتّجاهٌ منتهٍ ما زال يُقرأ**');
});

test('و«من جديد» تُنهي الرحلةَ كلَّها ولا تمسّ الهويّة', () => {
  wipe();
  writeState('ai_commerce_os_state', { a: 1 }, 'U');
  writeState('amanzine_publish_seed', 'بذرة');
  writeState('amanzine_conversation', [{ who: 'user', text: 'x' }]);
  clearJourneyState();
  assert.equal(readState('amanzine_publish_seed'), null);
  assert.equal(readState('amanzine_conversation'), null);
  assert.ok(readState('ai_commerce_os_state', 'U'), 'مُحيت نسخةُ العمل بـ«من جديد»');
});

test('والمُستهلَكُ يُقرأ مرّةً واحدة', () => {
  wipe();
  writeState('amanzine_publish_seed', 'بذرة');
  assert.equal(consumeState('amanzine_publish_seed'), 'بذرة');
  assert.equal(readState('amanzine_publish_seed'), null, 'بقيت البذرةُ بعد استهلاكها');
});

test('**ومفتاحٌ غيرُ مُعلَنٍ في السجلّ لا يُكتَب** — لا بابَ خلفيًّا', () => {
  // بلا هذا يعود كلُّ سطرٍ جديدٍ يكتب مفتاحَه الخاصَّ خارج السجلّ، فيعود
  //   الخروجُ يمسح ما يذكره كاتبُه لا ما هو موجود.
  wipe();
  writeState('مفتاح_غير_معلن' as any, { x: 1 });
  assert.equal(globalThis.localStorage.getItem('مفتاح_غير_معلن'), null);
  assert.equal(globalThis.sessionStorage.getItem('مفتاح_غير_معلن'), null);
});

test('و`amanzine_need_seed` أُسقط — كتابةٌ بلا مصبٍّ لا تُحفَظ «للتوافق»', () => {
  assert.equal(CLIENT_STATE.find(k => k.key === 'amanzine_need_seed'), undefined,
    'عاد مفتاحٌ لا قارئَ له إلى السجلّ');
});

test('**وكلُّ مفتاحِ ذاكرةٍ مُزامَنٍ مُعلَنٌ في السجلّ** — لا قائمتان تتباعدان', () => {
  // كشفته رحلةٌ ذهبيّةٌ في متصفّحٍ حقيقيّ: بعد الخروج بقيت عشرةُ مفاتيحَ
  //   فيها **الجملُ التي كتبها الإنسانُ ولم تُفهَم** ورحلاتُه ورضاه، ولا واحدٌ
  //   منها في السجلّ. فمَن يدخل بعده على نفس الجهاز يرث ما تعلّمه التطبيقُ عنه.
  //
  //   والحارسُ يمنع عودةَ الفجوة من بابها: مفتاحٌ يُضاف إلى `SYNCED_KEYS`
  //   ولا يُعلَن هنا يسقط هذا الاختبار — لا يُكتشَف بعد سنةٍ في متصفّح.
  const missing = SYNCED_KEYS.filter(k => !CLIENT_STATE.some(c => c.key === k));
  assert.deepEqual(missing, [], `مفاتيحُ مزامنةٍ خارجَ السجلّ — تنجو من الخروج: ${missing.join(' · ')}`);
  // وكلُّها تخصّ الحساب: ذاكرةُ تعلّمٍ بنطاق `device` تبقى للداخل التالي.
  const wrongScope = SYNCED_KEYS
    .map(k => CLIENT_STATE.find(c => c.key === k)!)
    .filter(c => c.scope !== 'identity');
  assert.deepEqual(wrongScope.map(c => c.key), [], 'ذاكرةُ تعلّمٍ بنطاقٍ لا يُمحى عند تبدّل الهويّة');
});

test('**وتبدّلُ الهويّة يمحو ذاكرةَ التعلّم فعلًا**', () => {
  wipe();
  for (const k of SYNCED_KEYS) writeState(k, { secret: 'سِرُّ-الأوّل' }, 'USER_A');
  assert.ok(SYNCED_KEYS.every(k => readState(k, 'USER_A') !== null), 'لم تُكتَب أصلًا');
  clearIdentityState();
  const survived = SYNCED_KEYS.filter(k => globalThis.localStorage.getItem(k) !== null);
  assert.deepEqual(survived, [], `نجت ذاكرةُ تعلّمٍ تخصّ الخارج: ${survived.join(' · ')}`);
});
