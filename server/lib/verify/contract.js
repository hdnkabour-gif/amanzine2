'use strict';

// ============================================================
// عقدُ قناةِ التحقّق — **القناةُ تفصيل، والتحقّقُ واحد**.
//
//   ── لماذا ──
//   كان التحقّقُ بريدًا وحدَه: `otp.js` يبني الرسالةَ ويرسلها ويكتب في جدولٍ
//   مفتاحُه البريد. فأيُّ تحقّقٍ برقمِ هاتفٍ — وهو ما يملكه التاجرُ المغربيُّ
//   فعلًا — كان يحتاج مسارًا ثانيًا كاملًا: جدولًا وحدَّ صلاحيّةٍ وسياسةَ
//   إبطالٍ ثانية. وثلاثُ نسخٍ من «أرسِل رمزًا» تتباعد عند أوّل إصلاح.
//
//   ── القاعدة ──
//   **الفعلُ يطلب تحقّقًا، ولا يختار قناة.** «أكّد الطلب» و«بدّل نمرتك» و
//   «دخل لحسابك» كلُّها تقول `verify.start({ purpose })`، والقناةُ تُختار من
//   نوع الهويّة وما هو مُهيّأ فعلًا. فإضافةُ قناةٍ غدًا = إسقاطُ ملفٍّ في
//   `channels/`، بلا لمسِ مسارٍ ولا واجهة — نفسُ عقد `services/delivery`.
//
//   ── وحدُّه ──
//   قناةٌ غيرُ مُهيّأةٍ **تُعلن ذلك ولا تصمت**. الصمتُ هنا أخطرُ ما يكون:
//   يظنّ الإنسانُ أنّ الرمزَ في الطريق وينتظر رمزًا لن يصل أبدًا.
// ============================================================

/** أنواعُ الهويّة التي يُثبَت ملكُها. */
const IDENTIFIER_KINDS = ['email', 'phone'];

/**
 * أغراضُ التحقّق — **الفعلُ الذي طلبه**. مغلقةٌ عمدًا.
 *
 *   رمزٌ طُلب لتأكيد طلبٍ لا يصلح لتبديل رقم الهاتف. بلا هذا الحقل يصير
 *   الرمزُ مفتاحًا عامًّا: من التقطه من رسالةِ تأكيدِ طلبٍ بدّل به نمرةَ
 *   صاحب الحساب.
 */
const PURPOSES = ['login', 'phone_change', 'order_confirm', 'password_reset'];

/** ما يجب أن تُعلنه كلُّ قناة. يُفحَص عند التحميل لا وقت الإرسال. */
function validateChannel(mod) {
  const problems = [];
  if (!mod || typeof mod !== 'object') return ['ليس وحدةً صالحة'];
  const m = mod.meta;
  if (!m || typeof m.id !== 'string' || !m.id.trim()) problems.push('meta.id ناقص');
  if (!m || typeof m.name !== 'string' || !m.name.trim()) problems.push('meta.name ناقص');
  if (!m || !IDENTIFIER_KINDS.includes(m.kind)) {
    problems.push(`meta.kind يجب أن يكون أحد: ${IDENTIFIER_KINDS.join(' · ')}`);
  }
  // `available` تُسأل قبل الإرسال، فتُعلن القناةُ عجزَها بدل أن تفشل صامتة.
  if (typeof mod.available !== 'function') problems.push('available() ناقصة');
  if (typeof mod.send !== 'function') problems.push('send() ناقصة');
  return problems;
}

/** أنموذجُ الهويّة: بريدٌ أم رقم؟ ما ليس واحدًا منهما لا يُتحقَّق منه. */
function kindOf(identifier) {
  const s = String(identifier || '').trim();
  if (!s) return null;
  if (s.includes('@')) return 'email';
  return /^[+\d][\d\s\-()]{6,}$/.test(s) ? 'phone' : null;
}

/** رقمٌ مغربيٌّ بصيغةٍ دوليّة: «0612…» ⇒ «212612…». الفارغُ يبقى فارغًا. */
function normalizePhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('212')) return d;
  if (d.startsWith('0')) return `212${d.slice(1)}`;
  return d;
}

/** الصيغةُ المعياريّةُ للهويّة — بها تُخزَّن وبها تُطابَق، فلا تُفوَّت مطابقة. */
function normalizeIdentifier(identifier) {
  const kind = kindOf(identifier);
  if (kind === 'email') return String(identifier).trim().toLowerCase();
  if (kind === 'phone') return normalizePhone(identifier);
  return '';
}

/** ما يُعرَض للإنسان بدل هويّته كاملة — لا يُطبَع بريدٌ ولا رقمٌ بتمامه. */
function maskIdentifier(identifier) {
  const kind = kindOf(identifier);
  if (kind === 'email') return String(identifier).replace(/(.{2}).*(@)/, '$1***$2');
  if (kind === 'phone') {
    const d = normalizePhone(identifier);
    return d.length > 4 ? `${'•'.repeat(Math.max(0, d.length - 4))}${d.slice(-4)}` : d;
  }
  return '';
}

module.exports = {
  IDENTIFIER_KINDS, PURPOSES,
  validateChannel, kindOf, normalizePhone, normalizeIdentifier, maskIdentifier,
};
