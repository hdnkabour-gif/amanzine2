'use strict';
// ============================================================
// Services Marketplace (alloservix) — مقدّمو الخدمات
// كل المسارات مقيَّدة بالمستأجر (req.user.id) على نمط products/orders.
// ملاحظة عزل: الكتابة تتطلّب مصادقة؛ العرض العام يمرّ عبر /api/providers/public.
// ============================================================
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/validate');
const { db } = require('../database');

// ── لوحة التاجر: إدارة المقدّمين ─────────────────────────────
router.get('/', auth, async (req, res) => {
  try { res.json(await db.getProviders(req.user.id, { status: req.query.status, q: req.query.q })); }
  catch (e) { console.error('[providers]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// قبل `/:id` عمدًا: المسارُ العامّ ذو المقطع الواحد يبتلع كلَّ ما يشبهه،
// فكان `/field-visits` يُقرأ معرّفَ مزوّدٍ فيرجع 404 بلا سببٍ ظاهر.
// «شكون سجّلت؟» — المزكِّي يرى سلسلته وحصّته الباقية. التزكيةُ اسمٌ
// يتحمّل، فمن حقّه ومن واجبه أن يرى ما زكّاه.
router.get('/my-vouches', auth, async (req, res) => {
  try {
    const v = await db.getVoucher(req.user.id);
    if (!v) return res.json({ canVouch: false, reason: 'ما عندكش محلّ معتمَد', vouched: [] });
    const vouched = await db.listVouchedBy(v.id);
    const quota = v.invite_quota || 0;
    res.json({
      canVouch: !!v.is_verified && v.depth < 2 && vouched.length < quota,
      me: { id: v.id, name: v.name, verified: !!v.is_verified, depth: v.depth },
      quota, used: vouched.length, left: Math.max(0, quota - vouched.length),
      vouched,
    });
  } catch (e) { console.error('[vouch]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ── أنواعُ التحقّق ───────────────────────────────────────────
// بتٌّ واحدٌ كان يحمل عدّة وقائع. الآن لكلّ واقعةٍ صاحبٌ ووقت، فيمكن غدًا
// أن تسأل «وريني اللي زرتُهم بنفسي» أو «اللي تأكّدنا من موقعهم».
router.post('/:id/verify', auth, async (req, res) => {
  if (!isPlatformAdmin(req)) return res.status(403).json({ error: 'التحقّقُ لأدمن المنصّة' });
  try {
    const { kind, note, remove } = req.body || {};
    const rows = remove
      ? await db.unverifyProvider(req.params.id, String(kind))
      : await db.verifyProvider(req.params.id, { kind: String(kind), by: req.user.id, note });
    res.json({ verifications: rows });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// تاريخُ زيارات محلّ — الزيارةُ تُعاد وتُقارَن، ويُعرَف من قام بها.
router.get('/:id/visits', auth, async (req, res) => {
  if (!isPlatformAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    res.json({
      visits: await db.listVisitsForProvider(req.params.id),
      verifications: await db.getProviderVerifications(req.params.id),
    });
  } catch (e) { console.error('[visits]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// حصادُ السوق — مجموعُ ما تعلَّمناه من كلّ الزيارات، محسوبًا من الخام فلا يُضخَّم.
router.get('/field-visits', auth, async (req, res) => {
  if (!isPlatformAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try { res.json({ harvest: await db.fieldHarvest(), visits: await db.listFieldVisits(50) }); }
  catch (e) { console.error('[field-visit]', e.message); res.status(500).json({ error: 'Server error' }); }
});
router.get('/:id', auth, async (req, res) => {
  try {
    const p = await db.getProvider(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    p.services = await db.getProviderServices(p.id);
    p.availability = await db.getAvailabilityTemplates(p.id);
    p.concepts = await db.getProviderConcepts(p.id);
    p.verifications = await db.getProviderVerifications(p.id);
    res.json(p);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ══ الجسرُ المفقود: مزوّدٌ ⇄ مفهوم ═══════════════════════════
//
//  المحرّك يفهم «بغيت نشري ورد» ⇒ flower_shop. ولم يكن يعرف **أيُّ مزوّدٍ**
//  بائعُ ورد — فيتوقّف الفهمُ عند حدود الفهم ولا يصل إلى إنسان. هذا هو الشرطُ
//  الوحيد لجملة «أيُّ محلٍّ كيفما كان نوعه».
//
//  متعدّد لا واحد: المخبزةُ تبيع خبزًا وقهوةً وحلويّات. والنشاطُ الواحد حالةٌ
//  خاصّةٌ من المتعدّد؛ والعكسُ غيرُ صحيح.
router.put('/:id/concepts', auth, async (req, res) => {
  try {
    const p = await db.getProvider(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const items = Array.isArray(req.body?.concepts) ? req.body.concepts : [];
    if (items.length > 12) return res.status(400).json({ error: 'أكثرُ من ١٢ نشاطًا يعني أنّ المحلّ غيرُ محدَّد — اختر الأهمّ' });
    // مفهومٌ لا وجودَ له = رابطٌ ميّتٌ من لحظة إنشائه. نرفضه عند الباب لا بعده.
    const known = require('../generated/builtin-variants.json');
    const builtinIds = new Set(Object.values(known));
    const custom = new Set((await db.listCustomConcepts()).map(r => r.id));
    for (const it of items) {
      const raw = String(it?.conceptId ?? it?.concept_id ?? it ?? '').trim();
      if (!raw) return res.status(400).json({ error: 'مفهومٌ فارغ' });
      const live = await db.resolveConceptAlias(raw);
      if (!builtinIds.has(live) && !custom.has(live)) {
        return res.status(400).json({ error: `المفهوم «${raw}» غيرُ موجود — أضِفه أوّلًا في المعرفة` });
      }
    }
    res.json({ concepts: await db.setProviderConcepts(p.id, items) });
  } catch (e) { console.error('[providers]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ══ الزيارة الميدانيّة ═══════════════════════════════════════
//
//  «نمشي للمحلّ، نسجّلو، ونجمع الملاحظات والكلمات وكلّ شيء.»
//
//  والمحصولُ الحقيقيُّ ليس صفَّ المحلّ — بل **اللغة**. صفُّ المحلّ يُكتب في
//  دقيقة؛ أمّا «برييون» و«دريساج» و«ليزان» فلا يعرفها قاموسٌ في الأرض، وكلُّ
//  كلمةٍ تدخل اليوم تفهم آلافًا غدًا. لذلك الكلماتُ والجملُ حقولٌ أولى هنا،
//  لا ملاحظاتٌ في آخر استمارة: ما لا يُلتقَط في ثلاث دقائقَ لا يُلتقَط أبدًا.
//
//  وقرارٌ حاسم: الكلماتُ تمرّ بـ**حارس التعارض** نفسِه. زيارةٌ ميدانيّة لا
//  يجوز أن تسمّم المعرفة، ولو بحسن نيّة. ما تعارض يُعاد موسومًا «يحتاج
//  مراجعة» — لا يُطبَّق صامتًا ولا يُرمى صامتًا.
const { platformAdminEmails } = require('../middleware/platformAdmin');
const knowledgeRoute = require('./knowledge');
const isPlatformAdmin = (req) => {
  const emails = platformAdminEmails();
  return !emails.length || emails.includes(String(req.user?.email || '').toLowerCase());
};

// حصّةُ التزكية لمحلٍّ معتمَد. محدودةٌ عمدًا: «بلا حدّ» تعني ٢٠٠ محلٍّ
// وهميٍّ في ليلة، وتعني أيضًا أنّ التزكية بلا كُلفةٍ — فتصير بلا معنى.
const VOUCH_QUOTA = 5;

router.post('/field-visit', auth, async (req, res) => {
  // مَن يسجّل؟ الأدمن، أو محلٌّ معتمَدٌ يزكّي غيرَه بنفس الطريقة.
  const admin = isPlatformAdmin(req);
  let voucher = null;
  if (!admin) {
    voucher = await db.getVoucher(req.user.id).catch(() => null);
    if (!voucher) return res.status(403).json({ error: 'التسجيلُ لأدمن المنصّة أو لمحلٍّ معتمَد' });
    if (!voucher.is_verified || voucher.depth >= 2) {
      // depth ≥ 2 ممنوعٌ من التزكية: السلسلةُ الطويلة تُخفّف المسؤوليّة حتّى
      // تنعدم، ويصير «معتمَد» وسمًا لا يميّز أحدًا — وهو أسوأ من غيابه.
      return res.status(403).json({ error: 'محلُّك مُزكًّى ولمّا يتعتمد بعد — الاعتمادُ يُكتسَب ولا يُورَث' });
    }
    const used = await db.countVouched(voucher.id);
    const quota = voucher.invite_quota || VOUCH_QUOTA;
    if (used >= quota) return res.status(429).json({ error: `سالات ليك الحصّة (${quota} محلّات). عاود من بعد ما يتّعتمدو.` });
  }
  try {
    const b = req.body || {};
    const shop = b.shop || {};
    const name = String(shop.name || '').trim();
    const phone = String(shop.phone || '').replace(/\s/g, '');
    if (!name) return res.status(400).json({ error: 'اسم المحلّ مطلوب' });
    if (!/^(\+212|0)[5-7]\d{8}$/.test(phone)) return res.status(400).json({ error: 'رقم هاتف مغربيّ صالح مطلوب' });

    const arr = (v) => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).slice(0, 60) : []);
    const customerLines = arr(b.customerLines);
    const pricingAsks   = arr(b.pricingAsks);
    const conceptItems  = Array.isArray(b.concepts) ? b.concepts.slice(0, 12) : [];

    // ① الحساب. البريدُ قد لا يكون موجودًا — الهاتفُ هو الهويّة في السوق.
    //    ورمزُ الدخول عشوائيّ، يُعرَض **مرّةً واحدة**، ولا يُكتب في أيّ لوغ.
    //    و`must_change_password` تُجبر على تغييره أوّلَ دخول: هذا حسابُ إنسانٍ
    //    حقيقيّ، وبلا الإجبار يبقى رمزٌ يعرفه شخصان إلى الأبد.
    const email = String(shop.email || '').trim().toLowerCase() || `${phone.replace(/^\+212/, '0')}@amanzine.local`;
    let user = await db.getUserByEmail(email);
    let code = null;
    if (!user) {
      code = String(require('crypto').randomInt(100000, 999999));
      user = await db.createUser({ name, email, password: require('bcryptjs').hashSync(code, 10), role: 'user' });
      if (!user?.id) return res.status(500).json({ error: 'تعذّر إنشاء الحساب' });
      await db.setMustChangePassword(user.id, true);
    }

    // ② المحلّ
    const provider = await db.createProvider(user.id, {
      name, phone, city: shop.city || '', bio: shop.bio || '',
      latitude: shop.latitude ?? null, longitude: shop.longitude ?? null, status: 'active',
    });

    // ── **ما يُقرّر الشراءَ يُكتَب حيث يُقرأ** ────────────────────────
    //   أجوبةُ الزيارة تختلف بالصنف (محلٌّ · حرفيّ · خدمة)، وأعمدةُ المحلّ
    //   تحمل ما يُقرّر منها سلفًا: الأوقاتُ ووسائلُ التوصيل. فلا يُخترَع لها
    //   عمودٌ ثانٍ — كتبتُ `profile JSONB` أوّلًا ثمّ حذفتُه لمّا وجدتُ
    //   `opening_hours` و`delivery_modes` قائمَين: مصدران لشيءٍ واحدٍ
    //   يتباعدان، ويُقرأ أحدُهما ويُكتَب الآخر.
    const prof = b.profile || {};
    const patch = {};
    if (prof.hours) patch.openingHours = { text: String(prof.hours).slice(0, 120) };
    if (prof.delivers === true) patch.deliveryModes = ['self'];
    if (prof.delivers === false) patch.deliveryModes = ['pickup'];
    if (Object.keys(patch).length) {
      await db.updateProvider(user.id, provider.id, patch).catch(e =>
        console.error('[field-visit] profile:', e.message));
    }

    // ②·٥ سلسلةُ التزكية. الاعتمادُ **لا يُورَث**: ما زرتُه بنفسي معتمَدٌ من
    //     يومه، وما زكّاه محلٌّ يبقى «مُزكًّى» حتّى يراه إنسانٌ من المنصّة.
    //     وبلا هذا التمييز يصير الجميعُ معتمَدين بعد شهر، فلا يعني الوسمُ شيئًا.
    await db.setProviderChain(provider.id, admin
      ? { depth: 1, vouchedBy: null, isVerified: false, inviteQuota: VOUCH_QUOTA }
      : { depth: 2, vouchedBy: voucher.id, isVerified: false, inviteQuota: 0 });
    // الاعتمادُ **واقعةٌ لا بتّ**: «رأيتُ المحلَّ بعينـي يوم كذا». نسجّلها،
    // وتُشتَقّ منها الصفةُ — كاتبٌ واحدٌ لا مصدران يفترقان.
    if (admin) {
      await db.verifyProvider(provider.id, { kind: 'business', by: req.user.id, note: 'زيارةٌ ميدانيّة' });
    }

    // ③ الخدمات — تُقرأ من جملته لا من قائمةٍ يختار منها.
    let linked = [];
    if (conceptItems.length) {
      try { linked = await db.setProviderConcepts(provider.id, conceptItems); }
      catch (e) { console.error('[field-visit] concepts:', e.message); }
    }

    // ④ الكلمات — عبر الحارس. `needs_review` ليست فشلًا بل معلومة.
    const words = [];
    for (const w of (Array.isArray(b.words) ? b.words.slice(0, 40) : [])) {
      const term = String(w && w.term || '').trim();
      const conceptId = String(w && w.conceptId || '').trim();
      if (!term || !conceptId) continue;
      try {
        const existing = await db.getCustomConcept(conceptId);
        const base = existing || { id: conceptId, category: '', concept: { ar: conceptId }, variants: {} };
        const merged = Object.assign({}, base.variants || {});
        merged.darija = Array.from(new Set([...(merged.darija || []), term]));
        const c = knowledgeRoute.normalizeConcept(Object.assign({}, base, { variants: merged, status: 'published' }));
        const errors = await knowledgeRoute.conceptConflicts(c, conceptId);
        if (errors.length) { words.push({ term, conceptId, status: 'needs_review', reason: errors[0] }); continue; }
        await db.upsertCustomConcept(Object.assign({}, c, { source: 'community', createdBy: req.user.id, reason: `field:${provider.id}` }));
        words.push({ term, conceptId, status: 'learned' });
      } catch (e) { words.push({ term, conceptId, status: 'error', reason: e.message }); }
    }

    // ⑤ أسئلةُ التسعير ⇒ `asks.seek` للمفهوم الأساسيّ. هذه **طريقةُ تفكير
    //    الحرفيّ** لا بيانات: «واش كبيرة ولا صغيرة؟» سؤالٌ يملكه هو، فنسأله
    //    نيابةً عنه بدل أن نعرض ثمنًا نخترعه — والثمنُ عنده دالّةٌ لا رقم.
    const primaryItem = conceptItems.find(x => x && x.isPrimary) || conceptItems[0];
    const primary = primaryItem && (primaryItem.conceptId || primaryItem.concept_id);
    if (primary && pricingAsks.length) {
      try {
        const existing = await db.getCustomConcept(primary);
        const base = existing || { id: primary, category: '', concept: { ar: primary }, variants: {}, asks: {} };
        const seek = Array.from(new Set([...((base.asks || {}).seek || []), ...pricingAsks]));
        const c = knowledgeRoute.normalizeConcept(Object.assign({}, base, {
          asks: Object.assign({}, base.asks || {}, { seek }), status: 'published' }));
        await db.upsertCustomConcept(Object.assign({}, c, {
          source: (existing && existing.source) || 'community', createdBy: req.user.id, reason: `field:${provider.id}` }));
      } catch (e) { console.error('[field-visit] asks:', e.message); }
    }

    const visit = await db.createFieldVisit({
      providerId: provider.id, agentId: req.user.id, servicesRaw: String(b.servicesRaw || ''),
      concepts: linked, customerLines, pricingAsks, words, notes: String(b.notes || ''),
      gpsLat: Number.isFinite(b.gpsLat) ? b.gpsLat : null,
      gpsLng: Number.isFinite(b.gpsLng) ? b.gpsLng : null,
      durationSec: Number.isFinite(b.durationSec) ? Math.min(b.durationSec, 86400) : null,
    });

    // «ما تعلَّمناه من هذا المحلّ» — الزيارةُ استثمارٌ مرئيّ لا محلٌّ يُضاف.
    res.json({
      provider: {
        id: provider.id, name: provider.name,
        // نقولها صراحةً: المزكِّي يجب أن يعرف أنّ تزكيتَه ليست اعتمادًا،
        // وإلّا وعد صاحبَ المحلّ بما لا يملكه.
        status: admin ? 'verified' : 'vouched',
        vouchedBy: voucher ? voucher.name : null,
      },
      loginCode: code, email,   // يُعرَض مرّةً واحدة. null ⇒ للحساب مالكٌ من قبل.
      learned: {
        concepts: linked.length,
        words: words.filter(w => w.status === 'learned').length,
        needsReview: words.filter(w => w.status === 'needs_review').length,
        customerLines: customerLines.length,
        pricingAsks: pricingAsks.length,
      },
      words, visitId: visit.id,
    });
  } catch (e) { console.error('[field-visit]', e.message); res.status(500).json({ error: 'Server error' }); }
});



// «شكون كيبيع الورد فالدار البيضاء؟» — عامٌّ: البحثُ يخصّ الناس لا الأدمن.
router.get('/by-concept/:conceptId', async (req, res) => {
  try {
    const rows = await db.providersByConcept({
      conceptId: req.params.conceptId,
      city: req.query.city || null,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 50),
    });
    // لا نُسرّب ما لا يخصّ الباحث: لا user_id ولا admin_note.
    res.json({
      providers: rows.map(p => ({
        id: p.id, name: p.name, bio: p.bio, city: p.city, phone: p.phone,
        avatar_url: p.avatar_url, latitude: p.latitude, longitude: p.longitude,
        is_verified: p.is_verified, rating_avg: p.rating_avg, rating_count: p.rating_count,
        is_primary: p.is_primary,
      })),
    });
  } catch (e) { console.error('[providers]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, sanitizeBody, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'الاسم مطلوب' });
    const p = await db.createProvider(req.user.id, req.body);
    res.status(201).json(p);
  } catch (e) { console.error('[providers]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', auth, sanitizeBody, async (req, res) => {
  try {
    const existing = await db.getProvider(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    res.json(await db.updateProvider(req.user.id, req.params.id, req.body));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// موافقة/رفض/تعليق (لوحة الأدمن)
router.put('/:id/status', auth, async (req, res) => {
  const { status, adminNote } = req.body;
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const existing = await db.getProvider(req.user.id, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const p = await db.updateProvider(req.user.id, req.params.id, { status, adminNote });
    await db.addLog({ userId: req.user.id, user: 'Admin', action: `Provider ${status}: ${p.name}`, details: adminNote || '', type: 'info', severity: 'info' });
    // Activity: اعتماد مقدّم خدمة → حدث عام (business.verified)
    if (status === 'approved') {
      try { require('../lib/engines/activity').emit({ businessId: `provider:${p.id}`, actor: 'admin', type: 'business.verified', category: 'business', city: p.city || null, payload: { name: p.name } }); } catch {}
    }
    res.json(p);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const ok = await db.deleteProvider(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── خدمات المقدّم ────────────────────────────────────────────
router.post('/:id/services', auth, sanitizeBody, async (req, res) => {
  try {
    const p = await db.getProvider(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: 'Provider not found' });
    if (!req.body.serviceKey || !req.body.serviceLabel) return res.status(400).json({ error: 'serviceKey و serviceLabel مطلوبان' });
    const sid = await db.addProviderService(p.id, req.body);
    res.status(201).json({ id: sid });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/services/:sid', auth, async (req, res) => {
  try {
    const p = await db.getProvider(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: 'Provider not found' });
    await db.removeProviderService(p.id, req.params.sid);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── التوفّر ──────────────────────────────────────────────────
router.put('/:id/availability', auth, async (req, res) => {
  try {
    const p = await db.getProvider(req.user.id, req.params.id);
    if (!p) return res.status(404).json({ error: 'Provider not found' });
    await db.setAvailabilityTemplates(p.id, req.body.templates || []);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── العرض العام (Discover) — مقدّمون معتمدون فقط ─────────────
router.get('/public/:userId', async (req, res) => {
  try {
    const all = await db.getProviders(req.params.userId, { status: 'approved', q: req.query.q });
    // لا نكشف ملاحظات الأدمن أو الهاتف كاملاً في القائمة العامة
    const list = await Promise.all(all.map(async p => ({
      id: p.id, name: p.name, bio: p.bio, city: p.city, avatarUrl: p.avatarUrl,
      isVerified: p.isVerified, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
      services: await db.getProviderServices(p.id),
    })));
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
