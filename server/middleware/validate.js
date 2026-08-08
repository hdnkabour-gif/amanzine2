'use strict';
/**
 * Input validation middleware for AMANZINE SHOP
 * Protects against XSS, injection, oversized payloads
 */

// Sanitize a string value
function sanitizeStr(val, maxLen = 500) {
  if (val === null || val === undefined) return '';
  return String(val)
    .slice(0, maxLen)
    .replace(/[<>]/g, '') // basic XSS
    .trim();
}

// Validate Moroccan phone number
function isValidPhone(phone) {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-\+]/g, '');
  return /^(212|0)(5|6|7)\d{8}$/.test(clean) || /^\d{9,12}$/.test(clean);
}

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

// Fields that contain large data (base64 images, long content) — never truncate
const LARGE_FIELDS = new Set(['imageUrl','images','colorImages','logo','image','photo','avatar','cover','banner','data','content','description','notes','message','body','html','text','caption']);

// Middleware: sanitize string body fields safely
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      const val = req.body[key];
      // Skip arrays and objects entirely
      if (Array.isArray(val) || (val && typeof val === 'object')) continue;
      // Skip large/image fields — never truncate them
      if (LARGE_FIELDS.has(key)) {
        if (typeof val === 'string') {
          // Only remove dangerous HTML tags, don't truncate
          req.body[key] = val.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
        }
        continue;
      }
      // Normal string fields: sanitize and limit to 1000 chars
      if (typeof val === 'string') {
        req.body[key] = String(val).slice(0, 1000).replace(/[<>]/g, '').trim();
      }
    }
  }
  next();
}

/**
 * تحقّقُ طلبٍ قادمٍ من واجهة المتجر — `POST /api/orders/public` وحدَه.
 *
 *   ── **و`total` لا يُشترَط، لأنّه لا يُصدَّق** ──
 *   كان الشرطُ `isNaN(parseFloat(total))` ⇒ «المجموع غير صحيح». والمسارُ
 *   الذي خلفَه **يعيد حسابَ المجموع من الصفر** — من أثمانِ المنتجات في
 *   القاعدة، والباقاتِ، والكوبون، وثمنِ التوصيل — ويكتب في مكتوبٌ في أعلاه:
 *   «القادمُ من العميل يُتجاهَل عمدًا».
 *
 *   فكان البابُ **يشترط حقلًا يرميه**. والثمنُ الذي دُفع مقيسٌ: أوّلُ مرّةٍ
 *   مُشيَ فيها الطريقُ كاملًا — حسابٌ ⟵ منتج ⟵ طلبُ زبون — انكسر هنا،
 *   بجوابٍ يقول «المجموع غير صحيح» عن مجموعٍ **لم يكن مطلوبًا أصلًا**.
 *
 *   وأثرُه على منتَجٍ حقيقيّ: أيُّ عميلٍ ثانٍ — تطبيقُ هاتفٍ، بوتُ واتساب،
 *   شريكٌ يطلب برمجيًّا — يُردّ بجملةٍ **كاذبة**: المجموعُ ليس خاطئًا، هو
 *   غيرُ لازم. ورسالةٌ خاطئةٌ توقِف المطوّرَ ساعةً على بابٍ مفتوح.
 *
 *   وحين يُرسَل — كما ترسله واجهةُ المتجر اليومَ — **يُفحَص شكلُه ويُهمَل
 *   أثرُه**: رقمٌ سالبٌ يُردّ لأنّه علامةُ عميلٍ معطوبٍ أو عابث، لا لأنّ
 *   الخادمَ يعتمد عليه.
 */
function validateOrder(req, res, next) {
  const { customerName, customerPhone, items, total } = req.body;
  const errors = [];
  if (!customerName || customerName.length < 2) errors.push('الاسم مطلوب (2 أحرف على الأقل)');
  if (!customerPhone) errors.push('رقم الهاتف مطلوب');
  if (!Array.isArray(items) || items.length === 0) errors.push('يجب إضافة منتج واحد على الأقل');
  if (total !== undefined && total !== null && total !== ''
    && (isNaN(parseFloat(total)) || parseFloat(total) < 0)) errors.push('المجموع غير صحيح');
  if (items && items.length > 50) errors.push('الحد الأقصى 50 منتج في الطلب');
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  next();
}

// Middleware: validate product
function validateProduct(req, res, next) {
  const { name, price } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'اسم المنتج مطلوب' });
  if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
    return res.status(400).json({ error: 'السعر غير صحيح' });
  }
  next();
}

// Middleware: validate auth
function validateAuth(req, res, next) {
  const { email, password } = req.body;
  if (!isValidEmail(email)) return res.status(400).json({ error: 'البريد الإلكتروني غير صحيح' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  next();
}

module.exports = { sanitizeBody, validateOrder, validateProduct, validateAuth, sanitizeStr, isValidPhone, isValidEmail };
