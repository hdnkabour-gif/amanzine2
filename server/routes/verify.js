'use strict';

// ============================================================
// مسارُ التحقّق الموحَّد — بابٌ واحدٌ لكلّ القنوات.
//
//   كان لكلّ قناةٍ مسارٌ أو لم تكن لها قناةٌ أصلًا: `/auth/request-otp`
//   بريدٌ وحدَه ومربوطٌ بالحساب، و`/auth/social` طريقٌ ثالثٌ لا يعرف
//   التحقّق. فمن أراد تأكيدًا برقمِ هاتفٍ لم يجد بابًا.
//
//   والغرضُ (`purpose`) **يُصرَّح به من المُنادي**: الفعلُ يقول لماذا يطلب
//   الرمز، فيُربَط الرمزُ بفعله ولا يصير مفتاحًا عامًّا.
// ============================================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../database');
const verify = require('../lib/verify');
const { PURPOSES, kindOf } = require('../lib/verify/contract');

/** أغراضٌ يجوز طلبُها بلا حساب — وما عداها يلزمه صاحبُه. */
const PUBLIC_PURPOSES = new Set(['order_confirm']);

// GET /api/verify/channels — ما هو مُهيّأٌ فعلًا لهذه الهويّة.
//   تقرؤها الواجهةُ لتعرض ما يعمل، فلا يُعرَض للإنسان زرُّ قناةٍ لا تُرسل.
router.get('/channels', async (req, res) => {
  try {
    const identifier = String(req.query.identifier || '');
    let settings = null;
    if (req.query.userId) settings = await db.getSettings(String(req.query.userId));
    res.json({
      all: verify.listChannels(),
      usable: verify.channelsFor(identifier, { settings }).map(c => c.meta.id),
      kind: kindOf(identifier),
    });
  } catch (e) { console.error('[verify/channels]', e.message); res.status(500).json({ error: 'Server error' }); }
});

/**
 * مصادقةٌ **مشروطةٌ بالغرض**: غرضٌ يخصّ حسابًا لا يُطلَب إلّا لصاحبه.
 *
 *   بلا هذا يطلب أيُّ أحدٍ رمزًا لبريد غيره فيُغرقه برسائلَ لم يطلبها —
 *   وهو باب إزعاجٍ مجّانيّ. و`order_confirm` وحدَه عامّ: الزبونُ يؤكّد طلبَه
 *   ولا حسابَ له، وهذا هو المقصودُ منه.
 */
function authIfNeeded(req, res, next) {
  const purpose = req.body?.purpose;
  if (PUBLIC_PURPOSES.has(purpose)) return next();
  return auth(req, res, next);
}

// POST /api/verify/start — { identifier, purpose, channel? }
router.post('/start', authIfNeeded, async (req, res) => {
  try {
    const { identifier, purpose, channel } = req.body || {};
    if (!PURPOSES.includes(purpose)) return res.status(400).json({ error: 'غرضٌ غيرُ معروف' });

    let userId = null, settings = null, storeName = 'AMANZINE';
    if (req.user) {
      userId = req.user.id;
      settings = await db.getSettings(userId) || {};
      storeName = settings.brand?.name || 'AMANZINE';
    }

    const out = await verify.start({ identifier, purpose, userId, settings, storeName, channel });
    if (!out.ok) {
      const msg = out.reason === 'no-channel'
        ? 'ما كايناش شي قناة مهيّأة باش نصيفطو الكود — زيد بريد ولا ربط واتساب'
        : out.reason === 'identifier-invalid' ? 'بريد ولا نمرة ماشي صالحين'
        : 'ما قدرناش نصيفطو الكود دابا — عاود من بعد شويّة';
      return res.status(400).json({ error: msg, reason: out.reason, channels: out.channels || [] });
    }
    res.json({ sent: true, channel: out.channel, masked: out.masked, channels: out.channels });
  } catch (e) { console.error('[verify/start]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/verify/check — { identifier, purpose, code }
router.post('/check', authIfNeeded, async (req, res) => {
  try {
    const { identifier, purpose, code } = req.body || {};
    if (!PURPOSES.includes(purpose)) return res.status(400).json({ error: 'غرضٌ غيرُ معروف' });
    if (!code) return res.status(400).json({ error: 'الرمز مطلوب' });

    const out = await verify.check({ identifier, purpose, code });
    if (!out.valid) {
      const msg = {
        expired: 'سالات صلاحية الكود — طلب واحد جديد',
        'too-many': 'حاولتي بزّاف — طلب كود جديد',
        none: 'ما كاين حتّى كود مطلوب — طلب واحد',
      }[out.reason] || (out.left != null ? `كود ماشي صحيح — بقا ليك ${out.left}` : 'كود ماشي صحيح');
      return res.status(400).json({ error: msg, reason: out.reason, left: out.left });
    }
    res.json({ verified: true });
  } catch (e) { console.error('[verify/check]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
