'use strict';
// ============================================================
// /api/wallet — محفظة المستخدم (رصيد + معاملات + إضافة/خصم)
// كل العمليات مقيّدة بالمستخدم المصادَق. الخصم ذرّي (لا رصيد سالب).
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../database');

// عرض المحفظة فقط (قراءة). الإضافة (cashback/refund/credit) تتم server-side
// حصراً عبر Wallet Engine (قواعد/استرجاع) — لا endpoint يسمح للمستخدم بإضافة
// رصيد لنفسه (كان سيكون ثغرة مالية). الخصم يتم عبر Payment Engine (charge).
router.get('/', auth, async (req, res) => {
  try {
    const [wallet, tx] = await Promise.all([db.getWallet(req.user.id), db.getWalletTx(req.user.id)]);
    res.json({ ...wallet, transactions: tx });
  } catch (e) { console.error('[wallet]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
