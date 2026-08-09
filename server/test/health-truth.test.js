'use strict';
// ============================================================
// **الرمزُ يقول ما يقوله المتن.**
//
//   وجده تدقيقُ Railway وأكّدتُه في الكود قبل إرساله: `/api/health` كان
//   يخرج بـ**200 دائمًا**، حتّى وهو يقول في متنه `"status": "degraded"`
//   لأنّ `DATABASE_URL` غائبٌ أو الترحيلَ فشل.
//
//   ومنصّةُ النشر **تقرأ الرمزَ لا المتن**. فخدمةٌ بلا قاعدةِ بياناتٍ تبدو
//   سليمةً تمامًا، وتُوجَّه إليها حركةُ الزبائن — وهي لا تقدر أن تحفظ طلبًا
//   واحدًا. أسوأُ الأعطاب: **أخضرُ كاذبٌ في نقطة الفحص.**
//
//   ويُقاس هنا **سلوكًا لا نصًّا**: تُشغَّل العمليّةُ فعلًا بلا `DATABASE_URL`
//   ويُطلَب البابُ. قراءةُ المصدر لا تُثبت رمزَ استجابة.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

/** يرفع الخادمَ ببيئةٍ معطاة ثمّ يسأل `/api/health`. */
function askHealth(env, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const port = 3400 + Math.floor(Math.random() * 400);
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
      env: { ...process.env, ...env, PORT: String(port), NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let done = false;
    const finish = (fn, arg) => { if (done) return; done = true; try { child.kill('SIGKILL'); } catch {} fn(arg); };
    const timer = setTimeout(() => finish(reject, new Error('الخادمُ ما قامش فالوقت')), timeoutMs);

    const poll = async (tries = 0) => {
      if (done) return;
      try {
        const r = await fetch(`http://127.0.0.1:${port}/api/health`);
        const body = await r.json().catch(() => ({}));
        clearTimeout(timer);
        return finish(resolve, { status: r.status, body });
      } catch {
        if (tries > 60) return finish(reject, new Error('ما وصلناش للباب'));
        setTimeout(() => poll(tries + 1), 350);
      }
    };
    child.on('error', e => finish(reject, e));
    setTimeout(() => poll(), 700);
  });
}

test('بلا قاعدةِ بيانات: المتنُ يقول `degraded` **والرمزُ 503**', async () => {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  const r = await askHealth({ ...env, DATABASE_URL: '' });
  assert.equal(r.body.status, 'degraded', `المتنُ ما قالش degraded: ${JSON.stringify(r.body).slice(0, 160)}`);
  assert.equal(r.status, 503,
    'الرمزُ رجع 200 والمتنُ يقول «معطوب» — منصّةُ النشر تقرأ الرمزَ وحدَه، فتُوجَّه حركةُ الزبائن إلى خدمةٍ لا تحفظ شيئًا');
});

test('وبقاعدةٍ سليمة: `ok` والرمزُ 200', { skip: !process.env.DATABASE_URL && 'لا DATABASE_URL' }, async () => {
  const r = await askHealth({ DATABASE_URL: process.env.DATABASE_URL });
  assert.equal(r.status, 200, `خدمةٌ سليمةٌ رجعت ${r.status} — فحصُ النشر غادي يسقط بلا سبب`);
  assert.equal(r.body.status, 'ok');
  assert.equal(r.body.migration?.ok, true, 'الترحيلُ ما نجحش');
});

test('**والترحيلُ يُعاد** — وإلّا أسقط عطبٌ عابرٌ النشرَ كلَّه', () => {
  // 503 وحدَها تجعل تعثّرًا لحظيًّا في القاعدة يُفشل النشر. وهذا ما خشيه من
  // كتب السطرَ الأصليّ، وكان محقًّا — فلا يُقبَل قلبُ الرمز بلا هذا.
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(src, /function retryMigration\(/,
    'رجعت 503 بلا إعادةِ محاولة — عطبٌ عابرٌ فالقاعدة غادي يقفل النشر');
  assert.match(src, /retryMigration\(\);/, 'الإعادةُ معرَّفةٌ ولا تُنادى عند الفشل');
  assert.match(src, /migrationState\.ok = true;[\s\S]{0,200}recovered on retry/,
    'الإعادةُ ما كتصلحش الحالةَ عند النجاح — تبقى الخدمةُ معطوبةً بعد أن شُفيت');
});
