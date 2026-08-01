'use strict';

// وسيلةُ اتصال: أتمتةُ موقع الشركة (وصفةُ URL) حين لا تُقدّم API إطلاقًا.
//
//   كان هذا المسارُ خارج السجلّ كلّيًّا في routes/delivery-auto.js، ومقطوعًا
//   من طرفين: الوصفاتُ لم تكن تصل الجدولَ الذي يبحث فيه، و`puppeteer` غيرُ
//   مُعلَنٍ في التبعيّات أصلًا. تسجيلُه هنا يجعل عجزَه **مُعلَنًا** بدل أن
//   يبدو مُهيّأً ثمّ يسقط بصمت إلى المحاكاة.

const { makeQuote } = require('../contract');

const meta = {
  id: 'url-recipe', name: 'أتمتة موقع الشركة', kind: 'adapter', version: '1.0',
};

const capabilities = {
  cities: 'none', pricing: 'none', tracking: 'none', cod: true, pickup: false,
};

/** هل مُحرِّكُ المتصفّح متاحٌ فعلًا؟ الجوابُ الصادقُ شرطُ ألّا نَعِد بما لا نملك. */
function engineAvailable() {
  try { require.resolve('puppeteer'); return true; } catch { return false; }
}

async function calculateQuote() {
  return makeQuote({ supported: false, reason: 'أتمتةُ الموقع لا تُرجع ثمنًا' });
}

async function createShipment(order, cfg) {
  if (!engineAvailable()) {
    return {
      success: false,
      error: 'مُحرِّك المتصفّح (puppeteer) غيرُ مثبَّت — أتمتةُ الموقع معطّلة على هذا الخادم',
    };
  }
  let recipe;
  try {
    recipe = JSON.parse(cfg?.webhookUrl || '{}');
  } catch {
    return { success: false, error: 'وصفةُ الأتمتة غيرُ صالحة (JSON معطوب)' };
  }
  if (!recipe.createOrderUrl) {
    return { success: false, error: 'الوصفةُ بلا رابطِ إنشاءِ طلب' };
  }
  // التنفيذُ الفعليّ يبقى في routes/delivery-auto.js حتى تُثبَّت التبعيّة؛
  // هنا نُعلن السببَ بدل الادّعاء بالنجاح.
  return { success: false, error: 'أتمتةُ الموقع تُنفَّذ عبر /api/delivery-auto وليست قناةً تلقائيّة' };
}

module.exports = { meta, capabilities, createShipment, calculateQuote, engineAvailable };
