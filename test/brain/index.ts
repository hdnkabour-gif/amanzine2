// نقطة دخول اختبارات العقل — تُجمَّع عبر esbuild وتُشغَّل بـ node --test.
// setup أوّلًا (polyfill لـ localStorage) قبل أيّ وحدة تلمس التخزين.
import './setup';
import './understand.test';
import './memory.test';
import './describe.test';
import './systemMap.test';
import './entity.test';
