'use strict';

// ============================================================
// قناةُ الرسائل القصيرة — **مُهيّأةٌ من البيئة، ولا تَعِد بما ليس عندها**.
//
//   لا مزوّدَ SMS في المشروع اليوم. وكان أمامي طريقان: أن أكتب تكاملًا مع
//   شركةٍ بعينها (فيصير اسمُها في الكود، وهو ما تمنعه قاعدةُ التوصيل نفسُها)،
//   أو أن أُعلن قناةً تعمل **حين تُهيَّأ** وتُعلن عجزَها حين لا تُهيَّأ.
//
//   والثالثةُ — أن أكتب قناةً تبدو تعمل وتُسجّل في السجلّ وحدَه — هي بالضبط
//   الوعدُ بمفهومٍ لا وجودَ له (القاعدة ⑰): يظنّ الإنسانُ أنّ رسالةً في
//   الطريق وينتظر ما لن يصل.
//
//   فالعقدُ عامّ: `SMS_API_URL` يستقبل POST بجسمٍ JSON فيه الرقمُ والنصّ،
//   وأسماءُ الحقول تُضبَط بـ`SMS_FIELD_TO` و`SMS_FIELD_TEXT` — فأيُّ مزوّدٍ
//   مغربيٍّ يُوصَل بمتغيّرات بيئةٍ بلا سطرِ كود.
// ============================================================

const https = require('https');
const { URL } = require('url');

const meta = { id: 'sms', name: 'رسالة قصيرة (SMS)', kind: 'phone' };

const cfg = () => ({
  url: process.env.SMS_API_URL || '',
  key: process.env.SMS_API_KEY || '',
  fieldTo: process.env.SMS_FIELD_TO || 'to',
  fieldText: process.env.SMS_FIELD_TEXT || 'text',
  sender: process.env.SMS_SENDER || '',
});

function available() {
  const c = cfg();
  return !!(c.url && c.key);
}

/**
 * الرابطُ يأتي من البيئة، وهي أقلُّ خطرًا من مُدخَلِ تاجر — لكنّ القاعدةَ
 * واحدة: لا نداءَ إلى شبكةٍ داخليّة، ولا بروتوكولَ غيرِ HTTPS.
 */
function _assertSafeUrl(raw) {
  const u = new URL(String(raw));
  if (u.protocol !== 'https:') throw new Error('SMS_API_URL يجب أن يكون https');
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.endsWith('.internal')) {
    throw new Error('SMS_API_URL يشير إلى شبكةٍ داخليّة');
  }
  return u;
}

async function send({ to, code, storeName }) {
  const c = cfg();
  if (!available()) return { sent: false, reason: 'not-configured' };

  let u;
  try { u = _assertSafeUrl(c.url); }
  catch (e) { console.error('[verify/sms]', e.message); return { sent: false, reason: e.message }; }

  const text = `${storeName || 'AMANZINE'}: كود التحقق ${code} — صالح 5 دقائق. لا تشاركه.`;
  const payload = { [c.fieldTo]: to, [c.fieldText]: text };
  if (c.sender) payload.sender = c.sender;
  const body = JSON.stringify(payload);

  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const req = https.request({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${c.key}`,
      },
    }, (res) => {
      res.resume();
      finish(res.statusCode >= 200 && res.statusCode < 300
        ? { sent: true }
        : { sent: false, reason: `HTTP ${res.statusCode}` });
    });
    req.setTimeout(8000, () => { req.destroy(); finish({ sent: false, reason: 'timeout' }); });
    req.on('error', (e) => finish({ sent: false, reason: e.message }));
    req.end(body);
  });
}

module.exports = { meta, available, send, _assertSafeUrl };
