'use strict';
// ============================================================
// **ثقةُ TLS لقاعدة البيانات — صريحةٌ، لا ضمنيّة.**
//
//   كان الافتراضُ لأيّ قاعدةٍ بعيدةٍ هو `{ rejectUnauthorized: false }` — أي
//   **تشفيرٌ بلا هويّة**. القناةُ مُعمّاةٌ فعلًا، لكنّ الخادمَ الذي في الطرف
//   الآخر لا يُتحقَّق منه: من جلس بين التطبيق وقاعدته قدّم شهادتَه هو، وقُبِلت،
//   وقرأ كلَّ طلبٍ وكتب كلَّ جواب. والتعميةُ بلا مصادقةِ طرفٍ تحمي من المتنصّت
//   السلبيّ وحدَه، ولا تحمي من المعترِض — وهو الخطرُ الحقيقيّ على وصلةٍ تعبر
//   شبكةَ مزوّدٍ عامّة.
//
//   وكان فيه عطبٌ ثانٍ أخفى: من ضبط `DATABASE_CA` بمسارٍ خاطئ كان يُطبَع له
//   تحذيرٌ ثمّ **يُخفَّض إلى الوضع المتسامح صامتًا**. أي أنّ محاولةَ التشديد
//   نفسَها كانت تنتهي إلى التساهل، ويظنّ صاحبُها أنّه شدّد.
//
//   ── القرار ──
//   ①  تعطيلٌ صريح (`PGSSLMODE=disable` · `DB_SSL=false` · `sslmode=disable`)
//      ⇒ بلا TLS. صريحٌ ومقصود.
//   ②  شهادةُ جذرٍ مُعطاة (`DATABASE_CA` نصًّا أو `PGSSLROOTCERT`/
//      `DATABASE_CA_PATH` مسارًا) ⇒ تحقّقٌ صارمٌ بها. وفشلُ تحميلها **يرمي**
//      ولا يُخفَّض.
//   ③  قاعدةٌ محلّيّةٌ في غير الإنتاج ⇒ بلا TLS (تطويرٌ وقواعدُ زائلة).
//   ④  ما عدا ذلك — قاعدةٌ بعيدة ⇒ **`rejectUnauthorized: true`**: تُتحقَّق
//      الهويّةُ من متجر الشهادات المعياريّ.
//
//   وأثرُ ④ معلَنٌ ولا يُخفى: مزوّدٌ يقدّم شهادةً موقّعةً ذاتيًّا سيفشل
//   الاتّصالُ به الآن بدل أن يمرّ. وهذا هو المقصود — والرسالةُ تقول ما يُضبَط
//   بالضبط. **الفشلُ المعلَنُ خيرٌ من وصلةٍ تبدو آمنةً وليست كذلك.**
// ============================================================

/** رسالةٌ تقول ما يُفعَل، لا «فشل الاتّصال». */
const ADVICE =
  'DB TLS: تعذّر التحقّق من هويّة خادم القاعدة. اضبط DATABASE_CA (نصّ الشهادة) '
  + 'أو PGSSLROOTCERT/DATABASE_CA_PATH (مسارها). وللتطوير المحلّيّ استعمل PGSSLMODE=disable.';

/**
 * @param {object} env — عادةً `process.env`. يُمرَّر ليكون القرارُ قابلًا للقياس.
 * @param {(p: string) => string} readFile — يُحقَن في الاختبار.
 * @returns {false | { rejectUnauthorized: boolean, ca?: string }}
 */
function buildSSL(env = process.env, readFile = null) {
  const url = String(env.DATABASE_URL || '');

  // ① تعطيلٌ صريح
  if (env.PGSSLMODE === 'disable' || env.DB_SSL === 'false' || /sslmode=disable/i.test(url)) return false;

  // ② شهادةُ جذرٍ مُعطاة — والفشلُ هنا يرمي ولا يُخفِّض
  const caInline = env.DATABASE_CA;
  const caPath = env.PGSSLROOTCERT || env.DATABASE_CA_PATH;
  if (caInline) return { rejectUnauthorized: true, ca: caInline };
  if (caPath) {
    const read = readFile || ((p) => require('fs').readFileSync(p, 'utf8'));
    let ca;
    try { ca = read(caPath); } catch (e) {
      // لا سقوطَ إلى التساهل: من قصد التشديد لا يُعطى ضدَّه.
      throw new Error(`DB TLS: تعذّرت قراءة شهادة الجذر من ${caPath} (${e.message}). ${ADVICE}`);
    }
    return { rejectUnauthorized: true, ca };
  }

  // ③ قاعدةٌ محلّيّةٌ في غير الإنتاج
  const isLocal = /@(localhost|127\.0\.0\.1|\[?::1\]?)[:/]/i.test(url);
  if (isLocal && env.NODE_ENV !== 'production') return false;

  // ④ بعيدةٌ بلا شهادةٍ مُعطاة ⇒ تحقّقٌ من الهويّة، لا تساهُل
  return { rejectUnauthorized: true };
}

module.exports = { buildSSL, ADVICE };
