'use strict';
// ============================================================
// التشخيصُ الظاهر — «غيرُ مهيّأ» معلومةٌ لا صمت.
//
//   `/api/health` كان يذكر مزوّدَي ذكاءٍ من ستّة، فمفتاحُ DeepSeek (الموصى به
//   للدارجة) لو ضُبط لا يظهر، ولو غاب لا يظهر أيضًا — والفهمُ يبقى قواعدَ
//   محلّيّةً بلا أن يعرف أحدٌ لماذا. والقاعدةُ التي تحرسها هذه الاختبارات:
//   **التشخيصُ يُقرأ من مصدر الحلّ نفسِه، لا من نسخةٍ ثانيةٍ تتقادم.**
// ============================================================
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { aiEnvStatus } = require('../routes/ai');

test('حالةُ الذكاء تشمل كلَّ مزوّدٍ تدعمه الطبقة — لا اثنين من ستّة', () => {
  const s = aiEnvStatus();
  // المصدرُ هو قائمةُ المزوّدين في الطبقة نفسِها؛ نقرأها من الملفّ كي لا
  // تُكتَب هنا نسخةٌ ثانيةٌ تنسى مزوّدًا جديدًا بصمت.
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'ai.js'), 'utf8');
  const m = src.match(/const AI_PROVIDERS = \[([^\]]+)\]/);
  assert.ok(m, 'تعذّر قراءة قائمة المزوّدين');
  const declared = m[1].split(',').map(x => x.trim().replace(/['"]/g, '')).filter(Boolean);
  assert.ok(declared.length >= 6, `مزوّدون قليلون: ${declared.length}`);
  for (const p of declared) {
    assert.equal(typeof s.providers[p], 'boolean', `المزوّد ${p} غائبٌ عن التشخيص`);
  }
});

test('«متاح» يعني أنّ هناك مزوّدًا واحدًا على الأقلّ — لا ادّعاء', () => {
  const s = aiEnvStatus();
  const anyKey = Object.values(s.providers).some(Boolean);
  assert.equal(s.available, anyKey);
  assert.equal(s.order.length > 0, anyKey);
  // الترتيبُ لا يذكر إلّا المهيّأ: مزوّدٌ بلا مفتاحٍ في سلسلة السقوط = فشلٌ مؤجّل.
  for (const p of s.order) assert.equal(s.providers[p], true, `${p} في الترتيب بلا مفتاح`);
});

test('فحصُ الصحّة يُعلن الذكاءَ والإشعاراتِ معًا', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.ok(/ai:\s*aiStatus\(\)/.test(src), '/api/health لا يُعلن حالةَ الذكاء');
  assert.ok(/notifications:\s*notificationStatus\(\)/.test(src), '/api/health لا يُعلن حالةَ الإشعارات');
  // ولا يُعاد سردُ المفاتيح يدويًّا هنا — ذاك ما تقادم أوّلَ مرّة.
  assert.ok(!/openai:\s*!!\(process\.env/.test(src), 'عاد سردُ المفاتيح يدويًّا في فحص الصحّة');
});
