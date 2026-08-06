'use strict';

// ============================================================
// قناةُ واتساب — **الأقربُ للمغربيّ**.
//
//   التاجرُ المغربيُّ يملك واتساب ولا يفتح بريدَه. وكان المُرسِلُ مبنيًّا
//   (`lib/whatsapp.js`) ويُستعمل للطلبات والبثّ — **ولا يُستعمل للتحقّق**،
//   فبقي التحقّقُ بريدًا وحدَه لمن لا بريدَ له عمليًّا.
//
//   وبيانات الاعتماد **من إعدادات التاجر** لا من البيئة: كلُّ متجرٍ يرسل من
//   رقمه هو، فيرى الزبونُ اسمَ المحلّ لا اسمًا غريبًا.
// ============================================================

const whatsapp = require('../../whatsapp');

const meta = { id: 'whatsapp', name: 'واتساب', kind: 'phone' };

/** مُهيّأةٌ حين يملك هذا التاجرُ توكنًا ومُعرِّفَ رقم. */
function available(ctx) {
  return !!whatsapp.credsFromSettings(ctx?.settings);
}

async function send({ to, code, storeName, settings }) {
  const creds = whatsapp.credsFromSettings(settings);
  if (!creds) return { sent: false, reason: 'not-configured' };
  // نصٌّ قصيرٌ بالدارجة، والرمزُ وحدَه في سطر — يُنسَخ بضغطةٍ من واتساب.
  const text = `🔐 كود التحقق ديال ${storeName || 'AMANZINE'}:\n\n${code}\n\nصالح ٥ دقايق. ما تعطيه لحتّى حد.`;
  return whatsapp.sendText({ ...creds, to, text });
}

module.exports = { meta, available, send };
