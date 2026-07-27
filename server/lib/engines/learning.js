'use strict';
// ============================================================
// Learning Loop — DR-0004
// مشترك واحد على Event Bus (من عائلة analytics/rules) يحوّل كل تفاعل
// في القمع إلى نقطة معرفة: تجميع يومي *مجهّل* (بلا هوية مستخدم).
// ليس محرّكًا جديدًا — يعيد استخدام العمود الفقري القائم (القانون ٤).
// المخرَج: Learning Score + بيانات لوحة «عقل AMANZINE» (aggregate فقط).
// ============================================================
const { db } = require('../../database');

// حدث القمع → مرحلة تعلّم. أحداث لا تخصّ القمع تُتجاهَل.
const STAGE_OF = {
  'business.viewed': 'view',
  'product.viewed':  'view',
  'service.viewed':  'view',
  'business.clicked': 'click',
  'business.contact': 'contact',
  'booking.created':  'booking',
  'order.created':    'order',   // proxy للدفع حتى تُربَط أحداث الدفع
  'review.created':   'review',
};

function stageOf(type) { return STAGE_OF[type] || null; }

// يشترك على كل الأحداث؛ يعدّ المراحل المعروفة فقط. fire-and-forget، صامت الفشل.
function init(bus) {
  bus.subscribe('*', (ev) => {
    const stage = stageOf(ev && ev.type);
    if (!stage) return;
    db.recordLearningStage(stage).catch(() => {}); // مجهّل: لا userId يُخزَّن
  });
}

// ملخّص «عقل AMANZINE» — كله مجمّع/مجهّل (DR-0004 + حدود الخصوصية DR-0003 §7).
async function brain({ days = 30 } = {}) {
  // topCities/topTerms إضافةٌ للوحة المالك: «أفضل مدينة · أفضل خدمة».
  // كلٌّ منها اختياريّ — فشلُه لا يُسقط اللوحة كاملة.
  const safe = (p) => p.catch(() => []);
  const [stages, quality, topMisses, topCities, topTerms, fresh] = await Promise.all([
    db.getLearningStages({ days }),
    db.getSearchQuality({ days }),
    db.listSearchMisses({ status: 'open', limit: 10 }),
    safe(db.getTopCities({ days, limit: 8 })),
    safe(db.getTopTerms({ days, limit: 10 })),
    db.getNewSince({ days }).catch(() => null),
  ]);
  const searches = quality.total || 0;
  const rate = (n) => (searches ? Math.round(((n || 0) / searches) * 1000) / 1000 : 0);
  const score = {
    searchSuccess: quality.successRate,
    viewRate:    rate(stages.view),
    contactRate: rate(stages.contact),
    bookingRate: rate(stages.booking),
    orderRate:   rate(stages.order),
    reviewRate:  rate(stages.review),
  };
  return { days, searches, quality, funnel: stages, score, topMisses, topCities, topTerms, fresh };
}

module.exports = { STAGE_OF, stageOf, init, brain };
