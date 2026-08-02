'use strict';

// ============================================================
// النسخُ الاحتياطيّة — ووعدٌ لا يُقال إلّا إن أمكن الوفاءُ به.
//
//   العطبُ الذي وُلد منه هذا الملفّ: نسخةٌ يوميّةٌ تُكتب في `server/data/`
//   ثمّ **تُمحى مع كلّ نشرٍ** على Railway (حاويةٌ بلا قرصٍ دائم). والأسوأ
//   أنّ `/api/settings/backups` كان يعرضها للتاجر كأنّها محفوظة — فيُبنى
//   قرارٌ («عندي نسخة، أقدر أجرّب») على شيءٍ غيرِ موجود.
//
//   القاعدة: **الوعدُ يُقاس بمكان الكتابة لا بحدوثها.** الكتابةُ نجحت فعلًا؛
//   الدوامُ هو الذي لم يكن. فنُفرّق بينهما صراحةً في كلّ مخرَج.
//
//   الدوامُ يُعلَن بضبط `BACKUP_DIR` أو `RAILWAY_VOLUME_MOUNT_PATH`. وبدونهما
//   نكتب — لأنّ النسخةَ المؤقّتةَ خيرٌ من لا شيءٍ خلال تشغيلٍ واحد — لكنّنا
//   **نقول إنّها مؤقّتة** في السجلّ وفي الواجهة وفي بوّابة الجاهزيّة.
// ============================================================

const fs = require('fs');
const path = require('path');

const KEEP = 7;

/** أين تُكتب النسخ، وهل ذلك المكانُ دائم؟ */
function location() {
  const explicit = process.env.BACKUP_DIR;
  const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (explicit) return { dir: explicit, durable: true, why: 'BACKUP_DIR مضبوط' };
  if (volume)   return { dir: path.join(volume, 'backups'), durable: true, why: 'قرصٌ دائمٌ على Railway' };
  return {
    dir: path.join(__dirname, '..', 'data', 'backups'),
    durable: false,
    why: 'قرصُ الحاوية — تُمحى النسخُ عند كلّ نشر. اضبط BACKUP_DIR أو ركّب قرصًا دائمًا',
  };
}

/** حالةُ النظام — تقرؤها بوّابةُ الجاهزيّة والواجهة. */
function status() {
  const loc = location();
  let count = 0;
  try { count = fs.readdirSync(loc.dir).filter(f => f.endsWith('.json')).length; } catch { /* لا مجلّد بعد */ }
  return { ...loc, count };
}

/** نسخُ مستخدمٍ واحد. يُرجع ما حدث فعلًا — لا يرمي. */
function writeOne(user, payload, dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `backup-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(payload, null, 2));

    // الاستبقاء: آخرُ سبعٍ لكلّ مستخدم.
    const mine = fs.readdirSync(dir).filter(f => f.includes(user.id)).sort();
    if (mine.length > KEEP) {
      for (const old of mine.slice(0, mine.length - KEEP)) {
        try { fs.unlinkSync(path.join(dir, old)); } catch { /* لا يُسقط النسخ */ }
      }
    }
    return { ok: true, filename };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * ينسخ بياناتِ كلّ مستخدم.
 * @returns {Promise<{durable:boolean, dir:string, written:number, failed:number, why:string}>}
 */
async function run(db) {
  const loc = location();
  const out = { ...loc, written: 0, failed: 0 };
  let users = [];
  try { users = await db.listUsers(); } catch (e) { out.error = e.message; return out; }
  if (!Array.isArray(users) || !users.length) return out;

  for (const user of users) {
    const payload = {
      timestamp: new Date().toISOString(),
      durable: loc.durable,
      products:  await db.getProducts(user.id).catch(() => [])  || [],
      orders:    await db.getOrders(user.id).catch(() => [])    || [],
      customers: await db.getCustomers(user.id).catch(() => []) || [],
      settings:  await db.getSettings(user.id).catch(() => ({})) || {},
    };
    const r = writeOne(user, payload, loc.dir);
    if (r.ok) out.written++; else out.failed++;
  }

  // سطرٌ واحدٌ يقول الحقيقةَ كاملةً بدل «✅» يوهم بالأمان.
  console.log(loc.durable
    ? `[Backup] ✅ ${out.written} نسخة → ${loc.dir}`
    : `[Backup] ⚠️  ${out.written} نسخة مؤقّتة — ${loc.why}`);
  return out;
}

module.exports = { run, status, location, KEEP };
