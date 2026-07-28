'use strict';
// ============================================================
// /api/knowledge — إدارة طبقة المعرفة (أدمن فقط) — DR-0002
// عرض عمليات البحث بلا نتيجة وربطها بفئة (أول خطوة نحو نموّ القاموس).
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../database');
const knowledge = require('../lib/engines/knowledge');
const learning = require('../lib/engines/learning');

// حارس أدمن المنصّة (مصدرٌ واحد). كان هنا `req.user.role === 'admin'` — وهو دورٌ
// يأخذه **كلّ** مَن يسجّل (مالك متجره)، فكان أيّ مشتركٍ يقرأ بيانات المنصّة كاملةً
// ويعدّل المعرفة. الاعتماد الآن على البريد وحده.
const { platformAdmin: admin } = require('../middleware/platformAdmin');

// قائمة عمليات البحث بلا نتيجة (الأكثر تكرارًا أولًا) — مادة مراجعة القاموس.
router.get('/misses', auth, admin, async (req, res) => {
  try {
    const status = String(req.query.status || 'open');
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    res.json({ misses: await knowledge.listMisses({ status, limit }) });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// جودة البحث (نسبة النجاح المجهّلة) — DR-0003 §6.b. مادة لوحة «عقل AMANZINE».
router.get('/quality', auth, admin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    res.json(await knowledge.searchQuality({ days }));
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// عقل AMANZINE (Learning Score + القمع + جودة البحث + أكثر ما لا يُفهَم) — DR-0004، مجهّل.
router.get('/brain', auth, admin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    res.json(await learning.brain({ days }));
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ربط عنقود بحث بفئة (resolve) أو تجاهله (ignore).
router.post('/misses/:id/resolve', auth, admin, async (req, res) => {
  try {
    const { category, status } = req.body || {};
    const st = status === 'ignored' ? 'ignored' : 'resolved';
    if (st === 'resolved' && !category) return res.status(400).json({ error: 'category required' });
    const row = await knowledge.resolveMiss(req.params.id, { category, status: st, adminId: req.user.id });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ miss: row });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ── مفاهيم الأدمن (custom_concepts) ───────────────────────────
// نفس ضمانات مستورد CSV، لكن من الواجهة: لا يُحفَظ مفهومٌ يسرق مرادفًا من آخر،
// لأنّ ذلك يجعل الفهم عشوائيًّا بلا رسالة خطأ.
const normTerm = (x) => String(x || '').toLowerCase().trim()
  .replace(/[\u064B-\u065F]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const LANGS = ['ar', 'darija', 'fr', 'en', 'arabizi'];
const arr = (v) => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : []);

function normalizeConcept(body) {
  const variants = {};
  for (const l of LANGS) { const v = arr(body?.variants?.[l]); if (v.length) variants[l] = v; }
  const pair = (o) => {
    const out = {};
    for (const k of ['offer', 'seek']) { const v = arr(o?.[k]); if (v.length) out[k] = v; }
    return out;
  };
  const links = {};
  for (const k of ['related', 'needs', 'sells', 'near']) { const v = arr(body?.links?.[k]); if (v.length) links[k] = v; }
  const concept = {};
  for (const l of ['ar', 'darija', 'fr', 'en']) { const v = String(body?.concept?.[l] || '').trim(); if (v) concept[l] = v; }
  return {
    id: String(body?.id || '').trim().toLowerCase(),
    category: String(body?.category || '').trim(),
    concept, variants, stance: pair(body?.stance), asks: pair(body?.asks), links,
    services: arr(body?.services), examples: arr(body?.examples),
    status: body?.status === 'published' ? 'published' : 'draft',
  };
}

// GET — قائمة المفاهيم المضافة
router.get('/concepts', auth, admin, async (req, res) => {
  try {
    const status = ['draft', 'published'].includes(req.query.status) ? req.query.status : undefined;
    res.json({ concepts: await db.listCustomConcepts({ status }) });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST — إضافةٌ أو تحديث. يرفض قبل الحفظ لا بعده.
router.post('/concepts', auth, admin, async (req, res) => {
  try {
    const c = normalizeConcept(req.body);
    const errors = [];
    if (!/^[a-z][a-z0-9_]*$/.test(c.id)) errors.push('المعرّف (id) يجب أن يكون حروفًا لاتينيّةً صغيرةً و_ فقط');
    if (!c.category) errors.push('الفئة مطلوبة');
    if (!c.concept.ar) errors.push('الاسم بالعربيّة مطلوب');
    if (!Object.keys(c.variants).length) errors.push('أضِف مرادفًا واحدًا على الأقلّ');

    // تعارضٌ مع مفاهيمَ أخرى: يشمل **الأسماء** لا المرادفات وحدها. اسمٌ يطابق
    // مرادفَ مفهومٍ آخر يجعل الفهم عشوائيًّا تمامًا كما يفعل المرادف المكرّر.
    if (!errors.length) {
      const terms = (o, keys) => {
        const out = new Set();
        for (const k of keys) for (const w of (o?.[k] || [])) out.add(normTerm(w));
        return out;
      };
      const mine = terms(c.variants, LANGS);
      for (const v of Object.values(c.concept)) if (v) mine.add(normTerm(v));
      for (const row of await db.listCustomConcepts()) {
        if (row.id === c.id) continue;   // تعديلُ النفس ليس تعارضًا
        const theirs = terms(row.variants, LANGS);
        for (const v of Object.values(row.concept || {})) if (v) theirs.add(normTerm(String(v)));
        for (const w of mine) if (theirs.has(w)) errors.push(`«${w}» يستعمله المفهوم «${row.id}» (اسمًا أو مرادفًا) — اختر كلمةً أدقّ`);
      }
    }
    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    const saved = await db.upsertCustomConcept({ ...c, createdBy: req.user.id });
    res.json({ concept: saved });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// PUT — تعديلُ مفهومٍ موجود. بدونه كان التصحيح يعني الحذف ثمّ إعادة الإضافة.
router.put('/concepts/:id', auth, admin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const existing = await db.getCustomConcept(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    // المعرّف في المسار هو المرجع — لا يُغيَّر من الجسم.
    req.body = { ...req.body, id };
    const c = normalizeConcept(req.body);
    const errors = [];
    if (!c.category) errors.push('الفئة مطلوبة');
    if (!c.concept.ar) errors.push('الاسم بالعربيّة مطلوب');
    if (!Object.keys(c.variants).length) errors.push('أضِف مرادفًا واحدًا على الأقلّ');
    if (!errors.length) {
      const terms = (o, keys) => {
        const out = new Set();
        for (const k of keys) for (const w of (o?.[k] || [])) out.add(normTerm(w));
        return out;
      };
      const mine = terms(c.variants, LANGS);
      for (const v of Object.values(c.concept)) if (v) mine.add(normTerm(v));
      for (const row of await db.listCustomConcepts()) {
        if (row.id === id) continue;
        const theirs = terms(row.variants, LANGS);
        for (const v of Object.values(row.concept || {})) if (v) theirs.add(normTerm(String(v)));
        for (const w of mine) if (theirs.has(w)) errors.push(`«${w}» يستعمله المفهوم «${row.id}» — اختر كلمةً أدقّ`);
      }
    }
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    res.json({ concept: await db.upsertCustomConcept({ ...c, createdBy: existing.created_by || req.user.id }) });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/concepts/:id', auth, admin, async (req, res) => {
  try {
    const ok = await db.deleteCustomConcept(String(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
