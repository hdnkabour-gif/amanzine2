'use strict';

// ============================================================
// طابورُ إعادة المحاولة — تعطُّلٌ لحظيٌّ لدى الشركة لا يُضيع شحنة.
//
//   API شركةِ التوصيل تسقط أحيانًا لدقائق. اليوم يعني ذلك سقوطًا إلى المحاكاة
//   وشحنةً لم تصل الشركةَ فعلًا، ولا شيءَ يُعيد المحاولة. الطابورُ يحفظ الفعلَ
//   ويُعيده بتباعدٍ أُسّيّ، فيمرّ العطبُ العابر بلا تدخّل.
//
//   القرارُ الحاكم: **الفشلُ الدائم لا يُعاد**. مفتاحٌ خاطئ أو مدينةٌ مرفوضة
//   لن تُصلحها ألفُ محاولة — تُعلَن مرّةً بدل أن تُغرق السجلّ.
// ============================================================

/** أخطاءٌ عابرة: يُعاد معها. ما عداها خطأُ تهيئةٍ أو بيانات. */
const TRANSIENT = /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|network|fetch failed|HTTP 5\d\d|HTTP 429/i;

function isTransient(error) {
  return TRANSIENT.test(String(error || ''));
}

/** تباعدٌ أُسّيّ: 1د · 4د · 9د … مع سقفٍ عند ساعة. */
function nextDelayMs(attempts) {
  const minutes = Math.min(60, Math.pow(Math.max(1, attempts), 2));
  return minutes * 60 * 1000;
}

/**
 * يقرّر مصيرَ محاولةٍ فاشلة.
 * @returns {{retry:boolean, reason:string, nextAttemptAt?:string}}
 */
function decide({ error, attempts = 0, maxAttempts = 5 }) {
  if (!isTransient(error)) {
    return { retry: false, reason: 'خطأٌ دائم (تهيئة أو بيانات) — الإعادةُ لن تُصلحه' };
  }
  if (attempts >= maxAttempts) {
    return { retry: false, reason: `استُنفدت المحاولات (${maxAttempts})` };
  }
  return {
    retry: true,
    reason: `عطبٌ عابر — محاولةٌ ${attempts + 1}/${maxAttempts}`,
    nextAttemptAt: new Date(Date.now() + nextDelayMs(attempts + 1)).toISOString(),
  };
}

module.exports = { decide, isTransient, nextDelayMs, TRANSIENT };
