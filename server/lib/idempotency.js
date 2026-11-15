'use strict';
/**
 * مفتاحُ المحاولة — تفرّدُ إنشاءِ الطلب.
 *
 *   ── لماذا لا نُميّز بالهاتف والمبلغ والوقت ──────────────────────
 *   زبونٌ اشترى قنينةَ ماءٍ مرّتين في دقيقةٍ واحدة **طلبان صحيحان**، لا
 *   تكرار. وقاعدةُ `UNIQUE(phone,total,minute)` تمحو الثانيَ وتُسمّي
 *   المحوَ حماية. فالتفرّدُ يجب أن يكون على **المحاولة** لا على الشبَه:
 *   نقرتان على زرٍّ واحد ⇒ محاولةٌ واحدة ⇒ مفتاحٌ واحد ⇒ صفٌّ واحد.
 *   وطلبٌ ثانٍ مقصود ⇒ محاولةٌ ثانية ⇒ مفتاحٌ آخر ⇒ صفٌّ ثانٍ.
 *
 *   ── ولماذا تملك القاعدةُ الحكم ──────────────────────────────────
 *   قفلٌ في ذاكرةِ العمليّة يحمي عمليّةً واحدة. ونسختان من الخادم على
 *   Railway ⇒ قفلان لا يعرف أحدُهما الآخر ⇒ صفّان. الفهرسُ الفريد في
 *   PostgreSQL هو الشاهدُ الوحيدُ المشتركُ بين كلِّ النسخ.
 */
const crypto = require('crypto');

// مفتاحٌ من العميل: يُقبَل شكلًا قبل أن يُثق به. طولٌ يكفي UUID،
// ومحارفُ لا تحتاج هروبًا في سجلٍّ ولا في رأسِ HTTP.
const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function normalizeKey(raw) {
  return String(raw === null || raw === undefined ? '' : raw).trim();
}

function isValidKey(k) { return KEY_RE.test(k); }

/**
 * بصمةُ الحمولة — تُميّز «إعادةَ إرسالِ نفسِ المحاولة» عن «مفتاحٍ أُعيد
 * استعمالُه لحمولةٍ أخرى». الأولى تُعيد الطلبَ الأصليّ، والثانيةُ تُردّ
 * بتعارضٍ صريح ولا تكتب فوق شيء.
 */
function fingerprint(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  const canon = JSON.stringify([
    String(o.customerName || '').trim(),
    String(o.customerPhone || '').replace(/[\s\-+]/g, ''),
    String(o.city || '').trim(),
    String(o.address || '').trim(),
    Math.round((+o.total || 0) * 100),          // بالسنتيم — لا عوّامَ يقارَن
    items.map(i => [
      String(i.productId || ''),
      Math.max(1, +i.quantity || 1),
      Math.round((+i.price || 0) * 100),
    ]),
  ]);
  return crypto.createHash('sha256').update(canon).digest('hex');
}

class IdempotencyConflict extends Error {
  constructor(existingOrderId) {
    super('idempotency key reused with a different payload');
    this.name = 'IdempotencyConflict';
    this.code = 'IDEMPOTENCY_CONFLICT';
    this.existingOrderId = existingOrderId || null;
  }
}

// عَلَمٌ غيرُ مُعدَّد: الطريقُ يقرأه ليختار 200 بدل 201، وJSON لا يراه
// فلا يتغيّر شكلُ الجواب الذي يعتمد عليه العميل.
function markReplay(order) {
  if (order) Object.defineProperty(order, 'idempotentReplay', { value: true, enumerable: false });
  return order;
}

module.exports = { KEY_RE, normalizeKey, isValidKey, fingerprint, IdempotencyConflict, markReplay };
