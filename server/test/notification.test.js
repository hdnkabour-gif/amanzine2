'use strict';
// ============================================================
// محرّك الإشعارات — سقّاطةٌ على عطبٍ صامت.
//
//   العطبُ الذي وُلد منه هذا الملفّ: القنواتُ كانت تُرجع `undefined` بلا فعل،
//   و`notify()` تبتلع ذلك بهدوء. النتيجة: النظامُ «يُشعِر» ولا يصل شيء، ولا
//   اختبارٌ يسقط — لأنّ الدالّة كانت لا تُرجع شيئًا يُفحَص. **قناةٌ لا تقول
//   ما حدث لها = قناةٌ لا يمكن اختبارُها.**
//
//   ولذلك الاختبارُ هنا يفحص **النتيجةَ المُعادة** لكلّ قناة، لا مجرّدَ أنّ
//   النداءَ لم يرمِ.
// ============================================================
const test = require('node:test');
const assert = require('node:assert');

const notification = require('../lib/engines/notification');
const wa = require('../lib/whatsapp');
const mailer = require('../lib/mailer');

// السياقُ الذي يُمرَّر للمحوّلات — نفسُ شكل `notify`.
const CTX = (owner = { userId: null, phone: null, kind: 'unknown' }) =>
  ({ audience: 'owner', businessId: 'provider:x', owner, message: 'اختبار', event: { type: 'test' } });

test('كلُّ قناةٍ مُعلَنةٍ لها محوّلٌ فعليّ — لا مقاعدَ فارغة', async () => {
  for (const ch of ['in-app', 'push', 'email', 'whatsapp']) {
    const adapter = notification.CHANNELS[ch];
    assert.equal(typeof adapter, 'function', `القناة ${ch} بلا محوّل`);
    // الفحصُ الحقيقيّ: **المحوّلُ نفسُه** يجب أن يُبلّغ عمّا فعل. المقعدُ
    // الفارغ (`async () => { void message; }`) يُرجع undefined — و`notify`
    // كانت تُلبسه سببًا معقولًا فيصير الصمتُ شبيهًا بالفشل المشروع.
    // نستدعي المحوّلَ مباشرةً كي لا يسترَه أحد.
    const r = await adapter(CTX());
    assert.ok(r && typeof r === 'object', `القناة ${ch}: مقعدٌ فارغٌ لا يُرجع نتيجة`);
    assert.equal(typeof r.sent, 'boolean', `القناة ${ch}: نتيجةٌ بلا sent`);
  }
});

test('notify يُعيد نتيجةً لكلّ قناة — لا صمتَ يُخفي الفشل', async () => {
  const r = await notification.notify({
    businessId: 'provider:does-not-exist',
    channel: ['in-app', 'email', 'push', 'whatsapp'],
    message: 'اختبار',
  });
  for (const ch of ['in-app', 'email', 'push', 'whatsapp']) {
    assert.ok(r[ch], `لا نتيجةَ للقناة ${ch}`);
    assert.equal(typeof r[ch].sent, 'boolean', `${ch}: sent ليس منطقيًّا`);
    // بلا قاعدةِ بياناتٍ لا يوجد مالك ⇒ يجب أن يُقال السبب، لا أن يُدَّعى النجاح.
    assert.equal(r[ch].sent, false);
    assert.ok(r[ch].reason, `${ch}: فشلٌ بلا سبب`);
    // `no-result` هو ما تضعه `notify` حين لا يُرجع المحوّلُ شيئًا ⇒ مقعدٌ فارغ.
    assert.notEqual(r[ch].reason, 'no-result', `${ch}: مقعدٌ فارغٌ لا قناة`);
  }
});

test('قناةٌ مجهولةٌ تُقال ولا تُتجاهَل', async () => {
  const r = await notification.notify({ businessId: 'store:u1', channel: ['pigeon'], message: 'x' });
  assert.deepEqual(r.pigeon, { sent: false, reason: 'unknown-channel' });
});

test('حالةُ القنوات تُعلَن — «غيرُ مهيّأ» معلومةٌ لا صمت', () => {
  const s = notification.channelStatus();
  assert.equal(s['in-app'], true);
  for (const ch of ['push', 'email']) assert.equal(typeof s[ch], 'boolean');
  // واتساب يُهيَّأ لكلّ تاجرٍ في إعداداته لا في البيئة ⇒ لا يُحسم عالميًّا.
  assert.equal(s.whatsapp, null);
});

// ── مُرسِلُ واتساب المشترك ────────────────────────────────────────────────────

test('واتساب: بلا اعتمادٍ أو رقمٍ أو نصّ لا يُرسَل شيءٌ ويُقال السبب', async () => {
  assert.deepEqual(await wa.sendText({ to: '0600000000', text: 'x' }), { sent: false, reason: 'not-configured' });
  assert.deepEqual(await wa.sendText({ token: 't', phoneId: 'p', to: '', text: 'x' }), { sent: false, reason: 'no-phone' });
  assert.deepEqual(await wa.sendText({ token: 't', phoneId: 'p', to: '0600000000', text: '' }), { sent: false, reason: 'no-text' });
});

test('واتساب: الاعتمادُ يُقرأ من إعدادات التاجر لا من البيئة', () => {
  assert.equal(wa.credsFromSettings(null), null);
  assert.equal(wa.credsFromSettings({ social: { whatsapp: { accessToken: 't' } } }), null, 'مفتاحٌ بلا رقمٍ ليس اعتمادًا');
  assert.deepEqual(
    wa.credsFromSettings({ social: { whatsapp: { accessToken: 't', pageId: 'p' } } }),
    { token: 't', phoneId: 'p' }
  );
});

test('واتساب: تطبيعُ الرقم ورابطُ المحادثة اليدويّة', () => {
  assert.equal(wa.normalizePhone('+212 661-11 11 11'), '212661111111');
  assert.equal(wa.normalizePhone('لا رقم'), '');
  assert.equal(wa.manualLink('+212661111111'), 'https://wa.me/212661111111');
  assert.equal(wa.manualLink(''), '', 'رابطٌ لرقمٍ فارغٍ وعدٌ كاذب');
});

// ── البريد المشترك ───────────────────────────────────────────────────────────

test('البريد: يُعلن تهيّؤه ولا يدّعي إرسالًا بلا ناقل', async () => {
  assert.equal(typeof mailer.available(), 'boolean');
  if (!mailer.available()) {
    assert.deepEqual(await mailer.send({ to: 'a@b.c', subject: 's' }), { sent: false, reason: 'not-configured' });
  }
  assert.ok(mailer.wrap('عنوان', 'متن').includes('عنوان'));
});
