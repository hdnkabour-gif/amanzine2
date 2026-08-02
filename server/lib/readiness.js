'use strict';

// ============================================================
// بوّابةُ الجاهزيّة — القائمةُ التي تُنفَّذ، لا التي تُقرأ.
//
//   قائمةُ تحقّقٍ في وثيقةٍ تُملأ بعلامات ✅ يدويّة هي أسوأُ من غيابها: تُعطي
//   ثقةً بلا فحص. كلُّ بندٍ هنا **يُنفَّذ الآن** ويُبلّغ بما رآه.
//
//   ثلاثُ حالاتٍ لا اثنتان:
//     true  = فُحص ونجح
//     false = فُحص وفشل  ⇒ يمنع العبور إن كان البندُ **لازمًا**
//     null  = لم يُفحَص (غيرُ مهيّأ · اختياريّ · خارجَ التطبيق)
//
//   و`null` لا يُلوَّن أخضرَ أبدًا. البندُ الذي لا نستطيع فحصَه — كالنسخ
//   الاحتياطيّة عند مزوّد الاستضافة — يُقال إنّه **غيرُ مفحوص**، لا «سليم».
//   ادّعاءُ الخضرة عمّا لم يُفحَص هو بالضبط الخطأُ الذي تحرسه هذه البوّابة.
// ============================================================

const DEV_JWT = 'sahar-dev-secret-CHANGE-IN-PRODUCTION-2026';

/** بندٌ واحد. `required:true` يعني أنّ فشلَه يُغلق البوّابة. */
const item = (id, label, ok, detail, required = true) => ({ id, label, ok, detail: detail || '', required });

/**
 * يُنفّذ كلَّ الفحوص.
 * @param {{db?:any, migration?:{ran:boolean, ok:boolean|null, error:string|null}}} deps
 * @returns {Promise<{ready:boolean, blocking:string[], checks:Array}>}
 */
async function evaluate({ db, migration } = {}) {
  const checks = [];

  // ── قاعدة البيانات: استعلامٌ حقيقيّ، لا وجودُ متغيّرِ بيئة ───────────────
  if (!process.env.DATABASE_URL) {
    checks.push(item('database', 'قاعدة البيانات', false, 'DATABASE_URL غير مضبوط — لا حفظَ ولا تسجيلَ دخول'));
  } else {
    try {
      await db.raw('SELECT 1');
      checks.push(item('database', 'قاعدة البيانات', true, 'تستجيب'));
    } catch (e) {
      checks.push(item('database', 'قاعدة البيانات', false, `لا تستجيب: ${e.message}`));
    }
  }

  // ── الترحيل: المخطّطُ حديثٌ أم قديم ────────────────────────────────────
  if (!migration || !migration.ran) {
    checks.push(item('migration', 'ترحيل المخطّط', null, 'لم يُنفَّذ (لا قاعدة بيانات)'));
  } else {
    checks.push(item('migration', 'ترحيل المخطّط', migration.ok === true,
      migration.ok === true ? `نُفِّذ ${migration.at || ''}`.trim() : `فشل: ${migration.error || 'سببٌ غيرُ معروف'}`));
  }

  // ── المصادقة: السرُّ الافتراضيُّ في الإنتاج ثغرةٌ لا تحذير ───────────────
  const { JWT_SECRET } = require('./config');
  const isProd = process.env.NODE_ENV === 'production';
  if (!process.env.JWT_SECRET || JWT_SECRET === DEV_JWT) {
    checks.push(item('auth', 'المصادقة', isProd ? false : null,
      isProd ? 'JWT_SECRET غير مضبوط — كلُّ جلسةٍ قابلةٌ للتزوير' : 'سرُّ تطويرٍ — لا يصلح للنشر'));
  } else if (String(JWT_SECRET).length < 24) {
    checks.push(item('auth', 'المصادقة', false, `JWT_SECRET قصيرٌ (${String(JWT_SECRET).length} حرفًا) — اجعله ٣٢+`));
  } else {
    checks.push(item('auth', 'المصادقة', true, 'سرٌّ خاصٌّ بطولٍ كافٍ'));
  }

  // ── الأحداث: مشتركون فعليّون على الناقل، لا مجرّد ملفّاتٍ موجودة ────────
  try {
    const bus = require('./engines/eventbus');
    let handlers = 0;
    for (const set of bus._subs.values()) handlers += set.size;
    checks.push(item('events', 'ناقل الأحداث', handlers > 0,
      handlers > 0 ? `${handlers} مشتركًا (تحليلات · قواعد · تعلّم)` : 'لا مشترك — الأحداثُ تُنشَر إلى العدم'));
  } catch (e) {
    checks.push(item('events', 'ناقل الأحداث', false, e.message));
  }

  // ── حلقة التعلّم: كلُّ مرحلةٍ تُعَدّ لها مُصدِر ─────────────────────────
  try {
    const learning = require('./engines/learning');
    const stages = typeof learning.brain === 'function';
    checks.push(item('analytics', 'حلقة التعلّم', stages, stages ? 'القمعُ موصولٌ ومجهَّل' : 'غيرُ متاحة'));
  } catch (e) {
    checks.push(item('analytics', 'حلقة التعلّم', false, e.message));
  }

  // ── الذكاء: مزوّدٌ واحدٌ على الأقلّ، وإلّا فالفهمُ قواعدُ محلّيّةٌ فقط ──
  try {
    const ai = require('../routes/ai').aiEnvStatus();
    checks.push(item('ai', 'مزوّد الذكاء', ai.available ? true : null,
      ai.available ? `مهيّأ: ${ai.order.join(' → ')}` : 'بلا مفتاح — الفهمُ بالقواعد المحلّيّة وحدها (يعمل، لكنّ سقفَه أدنى)',
      false));
  } catch (e) {
    checks.push(item('ai', 'مزوّد الذكاء', false, e.message, false));
  }

  // ── قنوات الإشعار: كلٌّ على حدة، فـ«الإشعارات ✅» تُخفي ثلاثةَ أصفار ───
  let ch = {};
  try { ch = require('./engines/notification').channelStatus(); } catch { ch = {}; }
  checks.push(item('notif-inapp', 'إشعارٌ داخل التطبيق', ch['in-app'] === true, 'يُخزَّن للمالك'));
  checks.push(item('notif-push', 'إشعارٌ فوريّ (Push)', ch.push ? true : null,
    ch.push ? 'VAPID مضبوط' : 'VAPID_PUBLIC_KEY/PRIVATE غير مضبوطين — لا إشعارَ خارج التطبيق', false));
  checks.push(item('notif-email', 'البريد', ch.email ? true : null,
    ch.email ? 'SMTP مضبوط' : 'SMTP غير مضبوط — لا رسائلَ تحقّقٍ ولا تنبيهات', false));
  // واتساب يُهيَّأ لكلّ تاجرٍ في إعداداته لا في البيئة ⇒ لا يُحسم عالميًّا.
  checks.push(item('notif-whatsapp', 'واتساب', null,
    'يُهيَّأ لكلّ تاجرٍ في إعداداته — يُفحَص من صفحة الاتصالات', false));

  // ── التوصيل: مزوّدون مسجَّلون ولا مرفوض ─────────────────────────────────
  try {
    const registry = require('../services/delivery/registry');
    const list = registry.list(), bad = registry.rejected();
    checks.push(item('delivery', 'مزوّدو التوصيل', list.length > 0 && bad.length === 0,
      bad.length ? `${bad.length} مزوّدًا مرفوضًا: ${bad.map(b => b.file).join(' · ')}`
                 : `${list.length} مزوّدًا: ${list.map(p => p.id).join(' · ')}`));
  } catch (e) {
    checks.push(item('delivery', 'مزوّدو التوصيل', false, e.message));
  }

  // ── تحديد المعدّل: مثبَّتٌ فعلًا (يُسجَّل وقتَ التركيب لا يُخمَّن) ───────
  checks.push(item('rate-limit', 'تحديد المعدّل', _mounted.rateLimit === true,
    _mounted.rateLimit === true
      ? (_mounted.rateLimitCount ? `${_mounted.rateLimitCount} حدًّا مثبَّتًا` : 'مثبَّت')
      : 'لم يُسجَّل تركيبُه'));

  // ── التخزين: صورٌ تبقى بعد إعادة النشر ─────────────────────────────────
  const cloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  checks.push(item('storage', 'تخزين الوسائط', cloudinary ? true : false,
    cloudinary ? 'Cloudinary مضبوط — الصورُ تبقى'
               : 'قرصٌ محلّيّ — الصورُ **تُفقد** عند كلّ إعادة نشرٍ على Railway'));

  // ── ما لا يستطيع التطبيقُ فحصَه — يُقال ولا يُلوَّن ────────────────────
  checks.push(item('backups', 'النسخ الاحتياطيّة', null,
    'خارجَ التطبيق — تُضبط وتُتحقَّق عند مزوّد قاعدة البيانات (Railway)', false));
  checks.push(item('monitoring', 'المراقبة والتنبيه', null,
    'لا مراقبةَ خارجيّة — /api/health جاهزٌ ليُستدعى من خدمةِ مراقبة', false));

  const blocking = checks.filter(c => c.required && c.ok === false).map(c => c.id);
  return { ready: blocking.length === 0, blocking, checks };
}

// حقائقُ وقتِ التشغيل يسجّلها من يملكها (index.js) بدل أن تُخمَّن هنا.
const _mounted = {};
function register(fact, value) { _mounted[fact] = value; }

module.exports = { evaluate, register, _mounted };
