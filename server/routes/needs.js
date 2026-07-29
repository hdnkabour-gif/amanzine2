'use strict';
// ============================================================
// /api/needs — Demand Capture. سوقٌ جديد يبدأ فارغًا؛ فأخطرُ شاشةٍ في البيتا
// هي «ما لقيناش». بلا التقاطٍ تخسر زبونًا وإشارةَ طلبٍ معًا، ومع التقاطٍ
// يصير كلّ فشلٍ طلبًا مؤكّدًا تذهب به إلى الحرفيّ.
//   POST /            عامّ (بلا حساب) — الباحث غالبًا لم يسجّل بعد.
//   GET  /demand      أدمن — الطلب مجمّعًا (مفهوم × مدينة).
//   GET  /            أدمن — الطلبات المفتوحة.
//   PATCH /:id        أدمن — ربطٌ أو إغلاق.
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../database');
const { platformAdmin: admin } = require('../middleware/platformAdmin');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/config');

const PHONE = /^(?:\+212|0)[\s.-]?[5-7](?:[\s.-]?\d){8}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

// هويّةٌ اختياريّة: إن كان معه توكن نربط الطلب به، وإلّا يمرّ بلا حساب.
function softAuth(req, _res, next) {
  const h = req.headers.authorization;
  const tok = h && h.startsWith('Bearer ') ? h.slice(7) : (req.cookies && req.cookies.token) || '';
  if (tok) { try { req.user = jwt.verify(tok, JWT_SECRET); } catch { /* زائر */ } }
  next();
}

router.post('/', softAuth, async (req, res) => {
  try {
    const raw = String(req.body?.raw || '').trim();
    if (raw.length < 2) return res.status(400).json({ error: 'اكتب حاجتك أوّلًا' });

    // الاتّصال اختياريّ — لكن إن أُرسل فليكن صالحًا، وإلّا وعدناه بردٍّ لن يصله.
    const contactRaw = String(req.body?.contact || '').trim();
    let contact = null, contactKind = null;
    if (contactRaw) {
      if (PHONE.test(contactRaw.replace(/\s/g, ''))) { contact = contactRaw; contactKind = 'phone'; }
      else if (EMAIL.test(contactRaw)) { contact = contactRaw; contactKind = 'email'; }
      else return res.status(400).json({ error: 'الرقم ولا البريد ماشي صحيح — تأكّد منّو' });
    }

    const row = await db.createNeedRequest({
      raw, concept: req.body?.concept || null, city: req.body?.city || null,
      contact, contactKind, userId: req.user?.id || null,
    });
    // لا نُرجع بيانات الاتّصال في الردّ (لا داعي لإعادتها للعميل).
    res.status(201).json({ id: row.id, ok: true, reachable: !!contact });
  } catch (e) { console.error('[needs]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// عامّ — «أكثر ما يقلّب عليه الناس اليوم». يُغذّي أمثلة صفحة الهبوط ببيانات
// حقيقيّة بدل قائمةٍ مكتوبة. لا يُعرَض شيءٌ إلّا بعد حرّاس الخصوصيّة في
// getPublicTrendingTerms، وفشلُه لا يكسر الصفحة (تعود للأمثلة الثابتة).
router.get('/trending', async (_req, res) => {
  try {
    const rows = await db.getPublicTrendingTerms({ days: 7, limit: 8 });
    res.json({ terms: rows.map(r => r.term) });
  } catch (e) { console.error('[needs]', e.message); res.json({ terms: [] }); }
});

router.get('/demand', auth, admin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    res.json({ demand: await db.needDemand({ days }) });
  } catch (e) { console.error('[needs]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', auth, admin, async (req, res) => {
  try {
    const status = ['open', 'matched', 'closed'].includes(req.query.status) ? req.query.status : 'open';
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    res.json({ requests: await db.listNeedRequests({ status, concept: req.query.concept, city: req.query.city, limit }) });
  } catch (e) { console.error('[needs]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', auth, admin, async (req, res) => {
  try {
    const status = ['open', 'matched', 'closed'].includes(req.body?.status) ? req.body.status : undefined;
    const row = await db.updateNeedRequest(String(req.params.id), { status, matchedBusiness: req.body?.matchedBusiness });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ request: row });
  } catch (e) { console.error('[needs]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
