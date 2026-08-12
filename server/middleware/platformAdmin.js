'use strict';
// ============================================================
// حارس أدمن المنصّة — مصدرٌ واحدٌ للحقيقة.
//
// خطرٌ حقيقيٌّ كان قائمًا: كلّ مستخدمٍ يسجّل يأخذ `role: 'admin'` في auth.js
// (بمعنى «مالك متجره»، لا «مالك المنصّة»). أيّ حارسٍ يقبل `role === 'admin'`
// يفتح المنصّة كلَّها لأيّ مشترك. لذلك **الدور لا يُعتدّ به هنا إطلاقًا** —
// أدمن المنصّة يُحدَّد بالبريد وحده.
//
// يُقبَل من أيٍّ من: ADMIN_EMAILS (قائمة بفواصل) · PLATFORM_ADMIN_EMAIL · ADMIN_EMAIL
//
// **وهذه الثلاثةُ متغيّراتُ تصريحٍ لا عناوينَ اتّصال.** وبقاءُ `ADMIN_EMAIL`
// فيها ليس تساهلًا: `server/index.js` يُنشئ به حسابَ المالك عند الإقلاع
// (`ADMIN_EMAIL` + `ADMIN_PASSWORD`)، ويُعلن عند غيابه أنّ لوحةَ المنصّة
// مقفلة. فهو **هويّةُ المالك** في هذا المنتَج، لا عنوانُ مراسلة — والدليلُ
// في الكود لا في العادة.
//
// وما كان يلتبس به: `routes/push.js` كان يأخذ منه عنوانَ اتّصال VAPID. فمن
// أراد أن يضع عنوانَ مراسلةٍ للإشعارات كان **يمنح صلاحيّةَ المنصّة** بلا أن
// يقصد. فُصل ذلك: للاتّصال متغيّرُه، وللتصريح متغيّراتُه.
// ============================================================

function platformAdminEmails() {
  const list = String(process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  for (const k of ['PLATFORM_ADMIN_EMAIL', 'ADMIN_EMAIL']) {
    const v = String(process.env[k] || '').trim().toLowerCase();
    if (v) list.push(v);
  }
  return Array.from(new Set(list));
}

function isPlatformAdmin(req) {
  const allow = platformAdminEmails();
  const email = String((req.user && req.user.email) || '').toLowerCase();
  if (!email) return false;
  // ── **قائمةٌ فارغةٌ = منعٌ، بلا استثناء** ─────────────────────
  //   كان هنا `return process.env.NODE_ENV !== 'production'` — أي سماحٌ لكلّ
  //   من يملك حسابًا كلَّما لم يكن `NODE_ENV` مضبوطًا على `production`. وهذا
  //   شرطٌ لا يملكه المستودع: لا `railway.json` ولا `nixpacks.toml` ولا
  //   `Procfile` ولا `package.json` يضبطه. فالبابُ كان يُفتَح بغياب إعدادٍ
  //   لا بحضور إذن — وهو عكسُ ما يجب أن يفعله حارس.
  //
  //   والافتراضُ الآمن لا يُقاس ببيئةٍ بل بإذنٍ صريح: **لا بريدَ مُصرَّحٌ به
  //   ⇒ لا أحدَ أدمنُ منصّة**، محلّيًّا كان أو في الإنتاج. ومن أراد التطوير
  //   يضبط `ADMIN_EMAILS` — سطرٌ واحدٌ يُكتَب مرّةً، مقابلَ منصّةٍ مفتوحة.
  if (allow.length === 0) return false;
  return allow.includes(email);
}

// Middleware
function platformAdmin(req, res, next) {
  if (!isPlatformAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { platformAdmin, isPlatformAdmin, platformAdminEmails };
