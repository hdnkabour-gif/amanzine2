// مفتاحُ المحاولة — جانبُ العميل.
//
//   العهدُ الذي يحرسه: **نقرتان على زرٍّ واحد = طلبٌ واحد**، و**طلبٌ ثانٍ
//   مقصود = طلبٌ ثانٍ**. فالمفتاحُ يُولَد مرّةً لكلِّ محاولة، ويبقى ثابتًا
//   مهما تكرّرت النقرةُ أو أُعيدت المحاولةُ بعد انقطاعِ شبكة، ولا يتغيّر
//   إلّا حين تنتهي المحاولةُ فعلًا — أي بعد نجاحِ الطلب.
//
//   ولا يُولَّد داخلَ دالّةِ الإرسال: مفتاحٌ جديدٌ مع كلِّ نقرةٍ يجعل
//   الحمايةَ صفرًا بينما كلُّ شيءٍ يبدو مربوطًا.

const keys = new Map<string, string>();

function fresh(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* متصفّحٌ قديمٌ أو سياقٌ غيرُ آمن */ }
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** مفتاحُ المحاولة الجارية لهذا المسار — يُولَّد عند أوّل طلبٍ ثمّ يثبت. */
export function attemptKey(scope: string): string {
  let k = keys.get(scope);
  if (!k) { k = fresh(); keys.set(scope, k); }
  return k;
}

/** انتهت المحاولة (نجحت، أو تخلّى عنها المستخدم) ⇒ التالي محاولةٌ أخرى. */
export function endAttempt(scope: string): void {
  keys.delete(scope);
}
