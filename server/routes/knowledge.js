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

// ══ إغلاقُ حلقة التعلّم ══════════════════════════════════════
//
//  كان هذا المسار يكتب `resolved_category` — نصًّا حرًّا، ليس حتّى مفتاحًا
//  خارجيًّا لفئةٍ حقيقيّة — ثمّ ينتهي. لا يمسّ custom_concepts، ولا يضيف
//  مرادفًا، ولا يتغيّر شيءٌ في الفهم. فيكتبها إنسانٌ آخر غدًا ولا نفهمها.
//  زرٌّ اسمه «حلّ» ولا يحلّ شيئًا: يُشعر بالتقدّم بينما المحرّك ثابتٌ مكانه —
//  نفسُ عطبِ «نُشِر ✦» بلا إعلان، وزرِّ الصور الذي يقول «أضيفت» بلا صورة.
//
//  الآن للمسار ثلاثةُ أوضاع، وواحدٌ فقط منها يُسمّى تعلّمًا:
//    • { status:'ignored' }                    ⇒ تجاهل (ضجيج/عبث)
//    • { conceptId, variants? }                ⇒ يتعلّم: يُضاف المرادفُ لمفهومٍ قائم
//    • { concept:{ar,…}, id, category, … }     ⇒ يتعلّم: مفهومٌ جديدٌ منشور
//  وفي وضعَي التعلّم يمرّ الطلبُ بـ conceptConflicts: لا يُسرَق مرادفٌ أبدًا.
//  الردُّ يحمل `learned` — فالواجهةُ لا تقول «تعلَّم» إلّا إذا تعلَّم فعلًا.
router.post('/misses/:id/resolve', auth, admin, async (req, res) => {
  try {
    const { status, conceptId, concept, variants, category, id: newId, lang } = req.body || {};

    if (status === 'ignored') {
      const row = await knowledge.resolveMiss(req.params.id, { status: 'ignored', adminId: req.user.id });
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.json({ miss: row, learned: null });
    }

    const miss = await db.getSearchMiss(req.params.id);
    if (!miss) return res.status(404).json({ error: 'Not found' });

    // المرادفاتُ المُتعلَّمة: ما أرسله الأدمن، وإلّا نصُّ الـmiss كما كتبه الإنسان.
    const learn = arr(variants).length ? arr(variants) : [String(miss.raw || '').trim()].filter(Boolean);
    if (!learn.length) return res.status(400).json({ error: 'لا يوجد ما يُتعلَّم — أرسِل مرادفًا أو تجاهل الطلب' });
    const L = ['ar', 'darija', 'fr', 'en', 'arabizi'].includes(lang) ? lang
      : (/[؀-ۿ]/.test(learn[0]) ? 'darija' : 'en');

    let saved;
    if (conceptId) {
      // ① إثراءُ مفهومٍ قائم — الحالةُ الغالبة. المفهومُ قد يكون مدمجًا (plumber)
      //    فلا صفَّ له في custom_concepts: نُنشئ صفَّ إثراءٍ بنفس المعرّف، وهو
      //    ما يدمجه concepts.ts اتّحادًا لا استبدالًا.
      const existing = await db.getCustomConcept(conceptId);
      const base = existing || {
        id: conceptId, category: String(category || '').trim(),
        concept: concept && concept.ar ? concept : { ar: conceptId },
        variants: {}, stance: {}, asks: {}, links: {}, services: [], examples: [],
      };
      const merged = { ...base.variants };
      merged[L] = Array.from(new Set([...(merged[L] || []), ...learn]));
      const c = normalizeConcept({ ...base, variants: merged, status: 'published' });
      const errors = await conceptConflicts(c, conceptId);
      if (errors.length) return res.status(409).json({ error: errors[0], errors });
      saved = await db.upsertCustomConcept({ ...c, createdBy: base.created_by || req.user.id });
    } else if (newId && concept?.ar) {
      // ② مفهومٌ جديدٌ كامل.
      const c = normalizeConcept({
        id: newId, category, concept, status: 'published',
        variants: { [L]: learn },
      });
      if (!/^[a-z][a-z0-9_]*$/.test(c.id)) return res.status(400).json({ error: 'المعرّف يجب أن يكون حروفًا لاتينيّةً صغيرةً و_ فقط' });
      const errors = await conceptConflicts(c, c.id);
      if (errors.length) return res.status(409).json({ error: errors[0], errors });
      saved = await db.upsertCustomConcept({ ...c, createdBy: req.user.id });
    } else {
      return res.status(400).json({ error: 'أرسِل conceptId (إثراء) أو id+concept.ar (مفهومٌ جديد) — أو status:"ignored"' });
    }

    const row = await knowledge.resolveMiss(req.params.id, {
      category: saved.category || category || null, status: 'resolved', adminId: req.user.id,
    });
    console.log(`[knowledge] تعلَّم «${learn.join('، ')}» ⇒ ${saved.id}`);
    res.json({ miss: row, learned: { id: saved.id, variants: learn, lang: L } });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ── مفاهيم الأدمن (custom_concepts) ───────────────────────────
// نفس ضمانات مستورد CSV، لكن من الواجهة: لا يُحفَظ مفهومٌ يسرق مرادفًا من آخر،
// لأنّ ذلك يجعل الفهم عشوائيًّا بلا رسالة خطأ.
const normTerm = (x) => String(x || '').toLowerCase().trim()
  .replace(/[\u064B-\u065F]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const LANGS = ['ar', 'darija', 'fr', 'en', 'arabizi'];
const arr = (v) => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : []);

// المفاهيمُ المدمجة (١٨٣ مفهومًا في src/lib/akg/kb) — يولّدها
// `npm run gen:variants`. بدونها كان الحارسُ أدناه يقارن بـ custom_concepts
// وحدها، فيسمح لمفهومٍ جديدٍ بسرقة «سبّاك» من `plumber` المدمج بلا اعتراض.
let BUILTIN = null;
function builtinVariants() {
  if (BUILTIN) return BUILTIN;
  try { BUILTIN = require('../generated/builtin-variants.json'); }
  catch { BUILTIN = {}; console.warn('[knowledge] ⚠️  لا فهرسَ للمرادفات المدمجة — شغّل `npm run gen:variants`'); }
  return BUILTIN;
}

// حارسُ التعارض — مصدرٌ واحد. كان مكرَّرًا في POST وPUT، وكان يفحص
// custom_concepts فقط. المرادفُ الذي يملكه مفهومان يجعل الفهم عشوائيًّا:
// فهرسُ التنفيذ عالميٌّ عبر اللغات، وأوّلُ إصابةٍ تفوز — فالمفهومُ الثاني
// يصير غيرَ قابلٍ للوصول إليه بتلك الكلمة، بلا أيّ رسالةٍ لأحد.
async function conceptConflicts(c, selfId) {
  const terms = (o) => {
    const out = new Set();
    for (const k of LANGS) for (const w of (o?.[k] || [])) out.add(normTerm(w));
    return out;
  };
  const mine = terms(c.variants);
  for (const v of Object.values(c.concept || {})) if (v) mine.add(normTerm(String(v)));

  const errors = [];
  const bi = builtinVariants();
  for (const w of mine) {
    const ownerId = bi[w];
    if (ownerId && ownerId !== selfId) errors.push(`«${w}» يملكه المفهوم المدمج «${ownerId}» — أضِفه إليه بدل إنشاء مفهومٍ ينازعه`);
  }
  for (const row of await db.listCustomConcepts()) {
    if (row.id === selfId) continue;   // تعديلُ النفس ليس تعارضًا
    const theirs = terms(row.variants);
    for (const v of Object.values(row.concept || {})) if (v) theirs.add(normTerm(String(v)));
    for (const w of mine) if (theirs.has(w)) errors.push(`«${w}» يستعمله المفهوم «${row.id}» (اسمًا أو مرادفًا) — اختر كلمةً أدقّ`);
  }
  return errors;
}

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

// GET عامّ — المفاهيم **المنشورة** فقط، لكلّ زائر بلا حساب.
// السبب: الفهم يخصّ الناس لا الأدمن. كان الإقلاع يستدعي المسار المحميّ أدناه
// لكلّ زائر، فيرجع 401 «Authentication required»، فيدفع العميلُ المستخدمَ إلى
// /login، فيُقلع من جديد، فيُستدعى ثانيةً — **حلقةُ إعادة تحميلٍ لا نهائيّة**
// على الصفحة الرئيسيّة وصفحة الدخول معًا. لا يُعرَض هنا شيءٌ سرّيّ: ما نُشر
// يظهر أصلًا في الفهم لكلّ من يكتب.
router.get('/concepts/public', async (_req, res) => {
  try {
    const rows = await db.listCustomConcepts({ status: 'published' });
    res.json({
      concepts: rows.map(r => ({
        id: r.id, category: r.category, concept: r.concept, variants: r.variants,
        stance: r.stance, asks: r.asks, links: r.links,
        services: r.services, examples: r.examples,
      })),
    });
  } catch (e) { console.error('[knowledge]', e.message); res.json({ concepts: [] }); }
});

// GET — قائمة المفاهيم المضافة (أدمن: تشمل المسوّدات وبيانات الإدارة)
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
    if (!errors.length) errors.push(...await conceptConflicts(c, c.id));
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
    if (!errors.length) errors.push(...await conceptConflicts(c, id));
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
