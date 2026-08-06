'use strict';

// ============================================================
// التحقّقُ الموحَّد — **قناةٌ واحدةٌ محايدة، والفعلُ هو ما يطلب الرمز**.
//
//   ── ما كان ──
//   `otp.js` يعرف البريدَ وحدَه: يبني الرسالةَ، ويرسلها بنفسه، ويكتب في
//   جدولٍ مفتاحُه البريد. وGoogle مسارٌ ثالثٌ منفصلٌ تمامًا (`/auth/social`)
//   لا يعرف شيئًا عن التحقّق. وواتساب مبنيٌّ ويُستعمل للطلبات ولا يُستعمل
//   للتحقّق — والتاجرُ المغربيُّ يملك واتساب ولا يفتح بريدَه.
//
//   ── القاعدة ──
//   **الفعلُ يطلب تحقّقًا ولا يختار قناة.** «أكّد الطلب» و«بدّل نمرتك»
//   و«دخل» كلُّها `start({ purpose })`. والقناةُ تُختار من نوع الهويّة ومن
//   **ما هو مُهيّأ فعلًا** — لا من فرعٍ مكتوبٍ في كلّ مُنادٍ.
//
//   ── وGoogle ليس قناةً بل مُثبِتٌ ──
//   لا يرسل رمزًا: هو نفسُه برهانُ ملكِ البريد. فمن دخل به يُعَدُّ متحقّقًا
//   بلا رمزٍ إطلاقًا (`satisfy`). ووضعُه في صفّ القنوات كان سيجعله «يرسل
//   شيئًا» — وهو وعدٌ بمفهومٍ لا وجودَ له.
//
//   ── الأمان ──
//   الرمزُ مربوطٌ بـ`purpose`: رمزُ تأكيدِ طلبٍ لا يبدّل نمرةَ صاحب الحساب.
//   والمحاولاتُ معدودة: بلا عدٍّ يُخمَّن رمزٌ من ستّ خاناتٍ بالقوّة الغاشمة.
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../../database');
const {
  PURPOSES, validateChannel, kindOf, normalizeIdentifier, maskIdentifier,
} = require('./contract');

const TTL_MS = 5 * 60 * 1000;
/** أقصى محاولةٍ خاطئةٍ لرمزٍ واحد — بعدها يُبطَل ويُطلَب رمزٌ جديد. */
const MAX_ATTEMPTS = 5;

// ── سجلُّ القنوات: اكتشافٌ بمسح المجلّد ────────────────────────
//   نفسُ عقد `services/delivery/registry`: إضافةُ قناةٍ = إسقاطُ ملفٍّ في
//   `channels/`. ولا خريطةَ ثابتةً من نوع `{ email, whatsapp }` في الكود —
//   تلك تجعل كلَّ قناةٍ جديدةٍ تعديلًا في مكانَين.
const CHANNELS_DIR = path.join(__dirname, 'channels');
const _channels = new Map();
const _rejected = [];
let _loaded = false;

function _load() {
  if (_loaded) return;
  _loaded = true;
  let files = [];
  try { files = fs.readdirSync(CHANNELS_DIR).filter(f => f.endsWith('.channel.js')); }
  catch (e) { console.warn('[verify] تعذّر قراءة مجلّد القنوات:', e.message); return; }
  for (const file of files.sort()) {
    let mod;
    try { mod = require(path.join(CHANNELS_DIR, file)); }
    catch (e) { _rejected.push({ file, problems: [e.message] }); continue; }
    const problems = validateChannel(mod);
    if (problems.length) {
      _rejected.push({ file, problems });
      console.warn(`[verify] ✗ ${file}: ${problems.join(' · ')}`);
      continue;
    }
    _channels.set(mod.meta.id, mod);
  }
  console.log(`[verify] ${_channels.size} قناة (${[..._channels.keys()].join(', ') || '—'})`);
}

/** كلُّ القنوات المسجَّلة — للوحة الإدارة والتشخيص. */
function listChannels() {
  _load();
  return [..._channels.values()].map(c => ({ ...c.meta }));
}

/** قنواتٌ **تصلح الآن** لهذه الهويّة: من نوعها، ومُهيّأةٌ فعلًا. */
function channelsFor(identifier, ctx = {}) {
  _load();
  const kind = kindOf(identifier);
  if (!kind) return [];
  return [..._channels.values()]
    .filter(c => c.meta.kind === kind)
    .filter(c => { try { return c.available(ctx); } catch { return false; } });
}

const genCode = () => {
  const buf = Buffer.alloc(3);
  crypto.randomFillSync(buf);
  return (100000 + (buf.readUIntBE(0, 3) % 900000)).toString();
};

/**
 * يبدأ تحقّقًا: يولّد رمزًا ويرسله على أوّل قناةٍ صالحة.
 *
 * @param {{identifier:string, purpose:string, userId?:string, settings?:object,
 *          storeName?:string, channel?:string}} p
 *        `channel` اختيارٌ صريحٌ من الإنسان («صيفطو ليا ف واتساب») — يُحترَم
 *        إن كان صالحًا، ولا يُفرَض إن لم يكن مُهيّأً.
 * @returns {Promise<{ok:boolean, channel?:string, masked?:string, reason?:string,
 *                     channels?:string[], devCode?:string}>}
 */
async function start({ identifier, purpose, userId, settings, storeName, channel }) {
  if (!PURPOSES.includes(purpose)) return { ok: false, reason: 'purpose-unknown' };
  const id = normalizeIdentifier(identifier);
  if (!id) return { ok: false, reason: 'identifier-invalid' };

  const usable = channelsFor(id, { settings, userId });
  if (!usable.length) {
    // **تُعلَن ولا تُخفى.** بلا هذا ينتظر الإنسانُ رمزًا لا قناةَ له.
    return { ok: false, reason: 'no-channel', channels: [] };
  }
  const chosen = (channel && usable.find(c => c.meta.id === channel)) || usable[0];

  const code = genCode();
  await db.invalidateVerifications(id, purpose);
  await db.createVerification({
    identifier: id, purpose, userId: userId || null,
    channel: chosen.meta.id, code,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  });

  const res = await chosen.send({ to: id, code, storeName, settings });
  if (!res.sent) {
    // الرمزُ يبقى صالحًا: قد تنجح إعادةُ الإرسال على قناةٍ أخرى بنفس الرمز،
    // ولا نُبطله فنُجبر الإنسانَ على البدء من الصفر بسبب عطبٍ عندنا.
    return {
      ok: false, reason: res.reason || 'send-failed', channel: chosen.meta.id,
      channels: usable.map(c => c.meta.id),
    };
  }
  return {
    ok: true, channel: chosen.meta.id, masked: maskIdentifier(id),
    channels: usable.map(c => c.meta.id),
  };
}

/**
 * يتحقّق من رمز. **الغرضُ جزءٌ من المفتاح**: رمزُ تأكيدِ طلبٍ لا يُقبَل
 * لتبديل نمرة.
 * @returns {Promise<{valid:boolean, reason?:string, left?:number}>}
 */
async function check({ identifier, purpose, code }) {
  const id = normalizeIdentifier(identifier);
  if (!id || !PURPOSES.includes(purpose)) return { valid: false, reason: 'invalid' };

  const row = await db.getPendingVerification(id, purpose);
  if (!row) return { valid: false, reason: 'none' };
  if (new Date(row.expires_at) < new Date()) {
    await db.invalidateVerifications(id, purpose);
    return { valid: false, reason: 'expired' };
  }
  // مقارنةٌ ثابتةُ الزمن: الفارقُ في زمن الردّ يسرّب الرمزَ خانةً خانة.
  const given = Buffer.from(String(code || '').trim());
  const want = Buffer.from(String(row.code));
  const same = given.length === want.length && crypto.timingSafeEqual(given, want);
  if (!same) {
    const attempts = await db.bumpVerificationAttempts(row.id);
    if (attempts >= MAX_ATTEMPTS) {
      await db.invalidateVerifications(id, purpose);
      return { valid: false, reason: 'too-many' };
    }
    return { valid: false, reason: 'wrong', left: MAX_ATTEMPTS - attempts };
  }
  await db.invalidateVerifications(id, purpose);
  return { valid: true };
}

/**
 * يُثبت التحقّقَ **بلا رمز** — لِمَن أثبت هويّتَه بطريقٍ آخر.
 *
 *   Google أثبت ملكَ البريد بنفسه؛ فإرسالُ رمزٍ بعده طقسٌ فارغٌ يُبطئ
 *   الإنسانَ ولا يزيد يقينًا. تُسجَّل الواقعةُ كي يبقى للتحقّق أثرٌ واحدٌ
 *   مهما اختلف طريقُه.
 */
async function satisfy({ identifier, purpose, userId, via }) {
  const id = normalizeIdentifier(identifier);
  if (!id || !PURPOSES.includes(purpose)) return { valid: false, reason: 'invalid' };
  await db.invalidateVerifications(id, purpose);
  await db.recordVerified({ identifier: id, purpose, userId: userId || null, channel: via || 'external' });
  return { valid: true, via: via || 'external' };
}

module.exports = {
  start, check, satisfy, channelsFor, listChannels,
  MAX_ATTEMPTS, TTL_MS,
  _rejected,
};
