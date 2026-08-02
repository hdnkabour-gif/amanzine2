'use strict';
// ============================================================
// بوّابةُ الجاهزيّة — الاختبارُ يحرس **صدقَها** لا وجودَها.
//
//   قائمةُ تحقّقٍ يمكن أن تكذب بطريقتين:
//     ① تُعلن الخضرةَ عمّا لم تفحصه (نسخٌ احتياطيّةٌ عند مزوّدٍ خارجيّ).
//     ② تبتلع فشلًا فتفتح البوّابةَ وهي مغلقة.
//   كلاهما مفحوصٌ هنا. والبندُ الذي لا يُفحَص يجب أن يقول `null`، لا `true`.
// ============================================================
const test = require('node:test');
const assert = require('node:assert');

const readiness = require('../lib/readiness');
const { db } = require('../database');

const run = () => readiness.evaluate({ db, migration: { ran: false, ok: null, error: null } });

test('كلُّ بندٍ يُبلّغ بحالةٍ من ثلاث — لا حالةَ رابعة', async () => {
  const r = await run();
  assert.ok(r.checks.length >= 12, `بنودٌ قليلة: ${r.checks.length}`);
  for (const c of r.checks) {
    assert.ok(c.id && c.label, 'بندٌ بلا هويّةٍ أو عنوان');
    assert.ok(c.ok === true || c.ok === false || c.ok === null, `${c.id}: حالةٌ غيرُ معروفة (${c.ok})`);
    assert.equal(typeof c.required, 'boolean', `${c.id}: لا يقول هل هو لازم`);
    // فشلٌ بلا سببٍ لا يُصلَح — والنجاحُ بلا وصفٍ لا يُصدَّق.
    if (c.ok !== true) assert.ok(c.detail, `${c.id}: حالةٌ غيرُ خضراءَ بلا سبب`);
  }
});

test('ما لا يُفحَص لا يُلوَّن أخضر', async () => {
  const r = await run();
  const byId = Object.fromEntries(r.checks.map(c => [c.id, c]));
  // النسخُ الاحتياطيّةُ والمراقبةُ خارجَ التطبيق: `null` دائمًا، ولو ادّعينا
  // غيرَ ذلك لصارت البوّابةُ ختمًا على شيءٍ لم نره.
  for (const id of ['backups', 'monitoring']) {
    assert.ok(byId[id], `البند ${id} غائب`);
    assert.equal(byId[id].ok, null, `${id}: يدّعي فحصًا لا يجريه`);
    assert.equal(byId[id].required, false, `${id}: يمنع العبورَ بما لا يفحصه`);
  }
});

test('البوّابةُ تُغلَق حين يفشل بندٌ لازم — ولا تُغلَق بغير اللازم', async () => {
  const r = await run();
  const failedRequired = r.checks.filter(c => c.required && c.ok === false).map(c => c.id);
  assert.deepEqual(r.blocking.slice().sort(), failedRequired.slice().sort());
  assert.equal(r.ready, failedRequired.length === 0);

  // البندُ الحاسم يتبع البيئةَ لا الافتراض. الصيغةُ الأولى كانت تفترض غيابَ
  // قاعدة البيانات دائمًا، فسقطت أوّلَ مرّةٍ شُغّلت على قاعدةٍ حقيقيّة —
  // **اختبارٌ يفشل حين تتحسّن البيئةُ اختبارٌ خاطئ**، لا بيئةٌ خاطئة.
  const db = r.checks.find(c => c.id === 'database');
  if (process.env.DATABASE_URL) {
    assert.notEqual(db.ok, null, 'قاعدةٌ مضبوطةٌ ولم تُفحَص');
  } else {
    assert.equal(db.ok, false, 'بلا DATABASE_URL يجب أن يسقط بندُ قاعدة البيانات');
    assert.ok(r.blocking.includes('database'), 'غيابُ قاعدة البيانات لا يُغلق البوّابة');
    assert.equal(r.ready, false, 'بوّابةٌ خضراءُ بلا قاعدة بيانات = فحصٌ كاذب');
  }
});

test('الاختياريُّ لا يمنع العبور مهما كانت حالتُه', async () => {
  const r = await run();
  for (const id of ['ai', 'notif-push', 'notif-email', 'notif-whatsapp']) {
    const c = r.checks.find(x => x.id === id);
    assert.ok(c, `البند ${id} غائب`);
    assert.equal(c.required, false, `${id}: غيابُ تهيئةٍ اختياريّةٍ يجب ألّا يُغلق البوّابة`);
    assert.ok(!r.blocking.includes(id));
  }
});

test('قنواتُ الإشعار تُفصَّل — «الإشعارات ✅» تُخفي ثلاثةَ أصفار', async () => {
  const r = await run();
  const ids = r.checks.map(c => c.id);
  for (const id of ['notif-inapp', 'notif-push', 'notif-email', 'notif-whatsapp']) {
    assert.ok(ids.includes(id), `القناة ${id} مدموجةٌ في بندٍ واحد`);
  }
});

test('البندُ اللازمُ لا يُخفَض إلى اختياريٍّ بصمت', async () => {
  const r = await run();
  const byId = Object.fromEntries(r.checks.map(c => [c.id, c]));
  // هذه هي أعمدةُ التشغيل: بلا أيٍّ منها لا يُطلَق شيء.
  for (const id of ['database', 'migration', 'auth', 'events', 'delivery', 'storage', 'rate-limit']) {
    assert.ok(byId[id], `البند اللازم ${id} غائب`);
    assert.equal(byId[id].required, true, `${id}: صار اختياريًّا`);
  }
});
