'use strict';
// ============================================================
// Knowledge layer (بذرة) — DR-0002
// أول تنفيذ فعليّ لطبقة المعرفة: تسجيل عمليات البحث بلا نتيجة
// (search misses) لتنمية القاموس من الاستعمال الحقيقي، لا من التخمين.
// القانون ٥: لا كتابة مباشرة للقاموس — هذه مادة خام تُراجَع يدويًا.
// ============================================================
const { db } = require('../../database');

// تطبيع خفيف: توحيد الحالة والمسافات (نقطة توسّع لاحقة: إزالة التشكيل/اللهجة).
const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

// تسجيل بحث بلا نتيجة — fire-and-forget: يجب ألّا يُفشِل البحث أبدًا.
async function recordMiss({ raw, city } = {}) {
  const r = String(raw || '').trim();
  if (r.length < 2 || r.length > 120) return; // تجاهل الفارغ/الضخم
  try {
    await db.recordSearchMiss({ raw: r, normalized: norm(r), city: city || null });
  } catch (_e) {
    // بلا رمي: الفشل هنا لا يمسّ تجربة المستخدم
  }
}

async function listMisses(opts) { return db.listSearchMisses(opts); }

// ربط عنقود بحث بفئة → أول خطوة نحو النشر في القاموس (مراجعة أدمن).
async function resolveMiss(id, opts) { return db.resolveSearchMiss(id, opts); }

// تسجيل عملية بحث حقيقية بنتيجتها (DR-0003 §6.b): يغذّي جودة البحث المجهّلة،
// ويلتقط الفشل في search_misses. fire-and-forget — لا يمسّ تجربة المستخدم.
async function recordSearch({ raw, city, resultCount } = {}) {
  const r = String(raw || '').trim();
  if (r.length < 2 || r.length > 120) return; // بحث حقيقي فقط
  const hit = (Number(resultCount) || 0) > 0;
  try { await db.recordSearchDay({ city: city || null, hit }); } catch (_e) {}
  // المصطلح المطبَّع (لا النصّ الخام) — يجيب «أكثر الخدمات طلبًا» بلا مسّ الخصوصيّة.
  try { await db.recordSearchTerm({ term: norm(r), hit }); } catch (_e) {}
  if (!hit) await recordMiss({ raw: r, city });
}

// ملخّص جودة البحث (نسبة النجاح) — للوحة «عقل AMANZINE» لاحقًا.
async function searchQuality(opts) { return db.getSearchQuality(opts); }

module.exports = { norm, recordMiss, listMisses, resolveMiss, recordSearch, searchQuality };
