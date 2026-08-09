import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RemoteProvider } from '../../src/lib/understanding';

// ============================================================
// **ذاكرةُ المحادثة — الأنبوبُ كان مبنيًّا كاملًا، ولا أحدَ يصبُّ فيه.**
//
//   `UnderstandingContext.recentMessages` معرَّفٌ منذ زمن، و`understanding.ts`
//   يقتطع منه ستًّا ويرسلها، و`server/routes/ai.js` يحوّلها إلى `history`.
//   ثلاثُ طبقاتٍ سليمة — والداعي في `LivingHome` كان يمرّر `[q]`: الجملةَ
//   الحاضرةَ وحدَها. فالذاكرةُ موجودةٌ وفارغة.
//
//   وهذا **العطبُ نفسُه للمرّة الثامنة** في هذا المشروع: طبقةٌ صحيحةٌ لا
//   ينادِيها أحد. فيُحرَس هنا ما يمكن حراستُه سلوكًا: **الحدُّ والترتيب**.
//
//   ولماذا الترتيبُ شرطٌ لا تفصيل: `_recentHistory` في الخادم يُلبس كلَّ
//   عنصرٍ `role: 'user'`، ثمّ يضعها قبل الجملة الحاضرة. فلو انقلب الترتيبُ
//   قرأ النموذجُ الجوابَ قبل السؤال — سياقٌ مقلوبٌ أسوأُ من لا سياق.
//
//   ولا يُختبَر هنا **البقاءُ بعد التحديث**: قرارُ خصوصيّةٍ واحتفاظِ بيانات،
//   لم يُتَّخذ. فالذاكرةُ تعيش في الجلسة وتموت معها — عمدًا.
// ============================================================

/** يلتقط ما أُرسل فعلًا إلى `/api/ai/understand` بلا شبكة. */
async function sentBody(recentMessages: string[]): Promise<any> {
  const real = globalThis.fetch;
  let captured: any = null;
  globalThis.fetch = (async (_url: any, init: any) => {
    captured = JSON.parse(String(init?.body || '{}'));
    return { ok: true, json: async () => ({ available: false }) } as any;
  }) as any;
  try {
    await RemoteProvider.understand('الجملةُ الحاضرة', { recentMessages });
  } finally {
    globalThis.fetch = real;
  }
  return captured;
}

test('الحدُّ ستٌّ — ولا تُرسَل محادثةٌ كاملةٌ إلى الخادم', async () => {
  const ten = Array.from({ length: 10 }, (_, i) => `رسالة ${i + 1}`);
  const body = await sentBody(ten);
  assert.equal(body.recentMessages.length, 6,
    `أُرسلت ${body.recentMessages.length} رسالة — الحدُّ ستٌّ. رفعُه يعني إرسالَ محادثةِ الإنسان كاملةً إلى مزوّدٍ خارجيّ`);
});

test('**والمقتطَعُ هو الأحدث** — لا الأقدم', async () => {
  const ten = Array.from({ length: 10 }, (_, i) => `رسالة ${i + 1}`);
  const body = await sentBody(ten);
  assert.deepEqual(body.recentMessages,
    ['رسالة 5', 'رسالة 6', 'رسالة 7', 'رسالة 8', 'رسالة 9', 'رسالة 10'],
    'اقتُطع من الذيل بدل الرأس — فيقرأ النموذجُ بدايةَ محادثةٍ انتهت ويجهل ما قيل قبل سطر');
});

test('الترتيبُ الأقدمُ أوّلًا — والخادمُ يبني `history` عليه', async () => {
  const body = await sentBody(['بغيت سبّاك', 'فالرباط']);
  assert.deepEqual(body.recentMessages, ['بغيت سبّاك', 'فالرباط'],
    'انقلب الترتيبُ — «فالرباط» قبل «بغيت سبّاك» تجعل السياقَ يقرأ الجوابَ قبل السؤال');
});

test('محادثةٌ فارغةٌ تُرسِل مصفوفةً فارغةً، لا `undefined`', async () => {
  const body = await sentBody([]);
  assert.deepEqual(body.recentMessages, [],
    'أوّلُ جملةٍ في محادثةٍ جديدةٍ يجب ألّا تحمل شيئًا — وإلّا سرّب `reset` سياقًا محذوفًا');
});
