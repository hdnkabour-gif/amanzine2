'use strict';
// ============================================================
// حارس أدمن المنصّة — مصدرٌ واحدٌ للحقيقة.
//
// خطرٌ حقيقيٌّ كان قائمًا: كلّ مستخدمٍ يسجّل يأخذ `role: 'admin'` في auth.js
// (بمعنى «مالك متجره»، لا «مالك المنصّة»). أيّ حارسٍ يقبل `role === 'admin'`
// يفتح المنصّة كلَّها لأيّ مشترك. لذلك **الدور لا يُعتدّ به هنا إطلاقًا** —
// أدمن المنصّة يُحدَّد بالبريد وحده.
//
// يُقبَل من أيّ من: ADMIN_EMAILS (قائمة بفواصل) · PLATFORM_ADMIN_EMAIL · ADMIN_EMAIL
// (دعمُ الثلاثة مقصود: النشرات القائمة تستعمل المفرد، فلا نقفل الباب على المالك.)
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
  // لم يُضبَط أيّ بريد ⇒ منعٌ في الإنتاج (آمن افتراضيًّا)، وسماحٌ محلّيًّا للتطوير.
  if (allow.length === 0) return process.env.NODE_ENV !== 'production';
  return allow.includes(email);
}

// Middleware
function platformAdmin(req, res, next) {
  if (!isPlatformAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { platformAdmin, isPlatformAdmin, platformAdminEmails };
