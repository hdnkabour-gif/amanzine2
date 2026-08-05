'use strict';

// ============================================================
// مسارُ ذاكرة المستخدم — نقلُ نصفِ العقل من المتصفّح إلى الخادم.
//
//   ثلاثُ نقاطٍ فقط، وكلُّها مقيَّدةٌ بصاحبها: `req.user.id` هو النطاق دائمًا،
//   ولا يقبل المسارُ مُعرِّفَ مستخدمٍ من الجسم — وإلّا قرأ أحدُهم ذاكرةَ غيره
//   بتبديل رقم.
// ============================================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../database');
const { knownKeys, validateBatch, isKnownKey } = require('../lib/userMemory');

// GET /api/memory — كلُّ ما يعرفه التطبيقُ عن هذا الشخص، دفعةً واحدة.
router.get('/', auth, async (req, res) => {
  try {
    res.json({ memory: await db.getUserMemory(req.user.id), keys: knownKeys() });
  } catch (e) {
    console.error('[memory/get]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/memory/sync — يدمج ما عند الجهاز، ويُعيد الحصيلة **المدموجة**.
//
//   يُعيد الذاكرةَ كاملةً بعد الدمج لا مجرّد «تمّ»: الجهازُ الذي رفع للتوّ
//   يحتاج ما تعلّمه غيرُه في نفس اللحظة، وإلّا بقي ناقصًا حتى إقلاعٍ تالٍ.
router.post('/sync', auth, async (req, res) => {
  try {
    const entries = req.body?.entries;
    const problems = validateBatch(entries);
    if (problems.length) return res.status(400).json({ error: problems.join(' · ') });

    const merged = await db.mergeUserMemory(req.user.id, entries, req.body?.source || 'client');
    res.json({ ok: true, merged, memory: await db.getUserMemory(req.user.id) });
  } catch (e) {
    console.error('[memory/sync]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/memory/:key — «انسَ هذا عنّي». مفتاحٌ واحدٌ صراحةً، لا مسحَ جماعيّ.
router.delete('/:key', auth, async (req, res) => {
  try {
    if (!isKnownKey(req.params.key)) return res.status(400).json({ error: 'مفتاحٌ غيرُ معروف' });
    const removed = await db.clearUserMemory(req.user.id, req.params.key);
    res.json({ ok: true, removed });
  } catch (e) {
    console.error('[memory/delete]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
