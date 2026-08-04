'use strict';

// ============================================================
// دورةُ حياة الطلب — حالاتٌ قليلة، وأحداثٌ لا تُحصى.
//
//   الإغراءُ الذي رُفض: سردُ ستَّ عشرةَ حالةً في عمود `status`
//   (`Packed`, `Picked`, `Partially Returned`, `Refund Requested`…).
//   ويكسرها سؤالٌ واحدٌ لا جوابَ له: **طلبٌ من ثلاثِ قطعٍ رُفضت منه واحدةٌ
//   وسُلِّمت اثنتان — ما حالتُه؟** لا `delivered` صادقةٌ ولا `returned`،
//   وعمودٌ واحدٌ لا يحمل الاثنين. فالحالةُ الواحدةُ تكذب.
//
//   والصواب: «مُرجَعٌ جزئيًّا» ليست حالةً بل **استنتاجٌ**، و«طُلب استرجاع»
//   ليست حالةً بل **حدثٌ لم يُغلَق**. فالحالاتُ هنا ستٌّ تصف أين الطلبُ في
//   الطريق، والغنى كلُّه في الأحداث.
//
//   والمال: `amount_delta` في كلّ حدث. المبلغُ الواجبُ تحصيلُه **يُحسَب من
//   الأحداث ولا يُخزَّن**، فلا يفترق رقمان عن بعضهما أبدًا. كان تعديلُ المبلغ
//   يكتب فوق القديم فلا يبقى أثرٌ يقول لماذا صار ٩٠ بعد ١٥٠ — والآن يُقرأ
//   السببُ من الدفتر.
// ============================================================

/**
 * الحالاتُ الستّ — «أين الطلبُ في طريقه»، لا «ما جرى له».
 * `closed` نهائيّةٌ: لا حدثَ ماليٌّ بعدها.
 */
const STATES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'closed'];

/**
 * الانتقالاتُ المسموحة. الطلبُ المُسلَّم لا يعود «قيد الانتظار»، والملغى لا
 * يُشحَن. بلا هذا الجدول كان أيُّ نداءٍ يكتب أيَّ حالةٍ فوق أيّ حالة.
 */
const TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: ['closed'],
  cancelled: ['closed'],
  closed:    [],
};

/**
 * أنواعُ الأحداث. `money` تعني أنّ الحدثَ يُغيّر المبلغَ الواجبَ تحصيلُه،
 * فيجب أن يحمل `amount_delta`. و`closes` تعني أنّه يُنهي طلبًا مفتوحًا سابقًا
 * (`refund.requested` ← `refund.completed`) — فنعرف ما بقي معلّقًا.
 */
const EVENTS = {
  'order.created':      { money: false },
  'discount.applied':   { money: true },
  'order.confirmed':    { money: false },
  'shipment.created':   { money: false },
  'courier.assigned':   { money: false },
  'courier.picked':     { money: false },
  'address.changed':    { money: false },
  'price.adjusted':     { money: true },
  'item.rejected':      { money: true },   // رفض الزبونُ قطعةً عند التسليم
  'item.returned':      { money: true },
  'order.delivered':    { money: false },
  'refund.requested':   { money: false },
  'refund.completed':   { money: true, closes: 'refund.requested' },
  'exchange.requested': { money: false },
  'exchange.completed': { money: false, closes: 'exchange.requested' },
  'order.cancelled':    { money: false },
  'order.closed':       { money: false },
  'note.added':         { money: false },
};

function isKnownEvent(type) { return Object.prototype.hasOwnProperty.call(EVENTS, type); }

/** هل الانتقالُ مسموح؟ البقاءُ في المكان مسموحٌ دائمًا (حدثٌ بلا تغييرِ حالة). */
function canTransition(from, to) {
  if (!STATES.includes(to)) return false;
  if (from === to) return true;
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * المبلغُ الواجبُ تحصيلُه = الأصلُ + مجموعُ آثار الأحداث.
 *
 *   يُحسَب ولا يُخزَّن. ولو خُزِّن لصار رقمان لنفس الشيء، ويكفي نداءٌ واحدٌ
 *   يُحدّث أحدَهما دون الآخر ليُرسَل للموزّع مبلغٌ لا يطابق الدفتر.
 *
 * @param {number} originalTotal
 * @param {Array<{amountDelta?:number, amount_delta?:number}>} events
 * @returns {number} لا ينزل تحت الصفر
 */
function amountDue(originalTotal, events) {
  const base = Math.max(0, +originalTotal || 0);
  const delta = (events || []).reduce(
    (s, e) => s + (+(e?.amountDelta ?? e?.amount_delta) || 0), 0
  );
  return Math.max(0, Math.round((base + delta) * 100) / 100);
}

/**
 * وقائعُ مستنتَجةٌ من الدفتر — ما كان يُطلَب أن يكون حالاتٍ.
 *
 *   `partiallyReturned` هي الجواب على السؤال الذي كسر نموذجَ الحالة الواحدة:
 *   رُدَّ شيءٌ ولم يُرَدَّ كلُّ شيء. تُحسَب ولا تُخزَّن، فلا تكذب أبدًا.
 */
function deriveFacts(order, events) {
  const list = Array.isArray(events) ? events : [];
  const has = (t) => list.some(e => e.type === t);
  const returnedQty = list
    .filter(e => e.type === 'item.rejected' || e.type === 'item.returned')
    .reduce((s, e) => s + Math.max(0, +(e.payload?.quantity) || 0), 0);
  const totalQty = (order?.items || [])
    .reduce((s, i) => s + Math.max(1, +i?.quantity || 1), 0);

  // مفتوحٌ = طُلب ولم يُنجَز. هكذا يُعرَف ما ينتظر التاجرَ بلا عمودٍ جديد.
  const pending = [];
  for (const [type, def] of Object.entries(EVENTS)) {
    if (!def.closes) continue;
    const opened = list.filter(e => e.type === def.closes).length;
    const done = list.filter(e => e.type === type).length;
    if (opened > done) pending.push(def.closes);
  }

  return {
    amountDue: amountDue(order?.total, list),
    originalTotal: Math.max(0, +order?.total || 0),
    returnedQty,
    totalQty,
    // رُدَّ شيءٌ ولم يُرَدَّ كلُّه — الحالةُ التي لا يحملها عمودٌ واحد.
    partiallyReturned: returnedQty > 0 && returnedQty < totalQty,
    fullyReturned: totalQty > 0 && returnedQty >= totalQty,
    refunded: has('refund.completed'),
    exchanged: has('exchange.completed'),
    pendingRequests: pending,
    eventCount: list.length,
  };
}

/**
 * يتحقّق من حدثٍ قبل كتابته. الرفضُ هنا أرخصُ من دفترٍ فيه واقعةٌ مستحيلة —
 * الدفترُ لا يُعدَّل، فالخطأُ فيه يبقى إلى الأبد.
 * @returns {string[]} المشاكل (فارغةٌ = صالح)
 */
function validateEvent(ev, order, existing) {
  const problems = [];
  if (!ev || typeof ev !== 'object') return ['الحدث ليس كائنًا'];
  if (!isKnownEvent(ev.type)) problems.push(`نوعُ حدثٍ غيرُ معروف: ${ev.type}`);
  const def = EVENTS[ev.type];
  const delta = +ev.amountDelta || 0;
  if (def && !def.money && delta !== 0) {
    problems.push(`${ev.type} لا يُغيّر المال — لا يجوز أن يحمل amount_delta`);
  }
  // لا يُحصَّل أقلُّ من صفر، ولا يُردّ أكثرُ ممّا دُفع.
  if (delta < 0 && order) {
    const due = amountDue(order.total, existing);
    if (Math.abs(delta) > due + 1e-9) {
      problems.push(`المبلغُ المطروح (${Math.abs(delta)}) أكبرُ من الواجبِ تحصيلُه (${due})`);
    }
  }
  if (ev.status && !canTransition(order?.status || 'pending', ev.status)) {
    problems.push(`انتقالٌ ممنوع: ${order?.status || 'pending'} ⇒ ${ev.status}`);
  }
  // إغلاقُ ما لم يُفتَح: `refund.completed` بلا `refund.requested` يعني مالًا
  // خرج بلا طلبٍ يُبرّره — وهو ما يجب أن يُكتشَف الآن لا في الجرد.
  if (def?.closes) {
    const opened = (existing || []).filter(e => e.type === def.closes).length;
    const done = (existing || []).filter(e => e.type === ev.type).length;
    if (opened <= done) problems.push(`${ev.type} بلا ${def.closes} مفتوح`);
  }
  return problems;
}

module.exports = {
  STATES, TRANSITIONS, EVENTS,
  isKnownEvent, canTransition, amountDue, deriveFacts, validateEvent,
};
