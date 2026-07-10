'use strict';
// ============================================================
// AI Engine — مساعد أعمال (لا ChatBot): يفهم النيّة ويحوّلها إلى استعلام
//   "أريد من يصلح باباً خشبياً اليوم في الدار البيضاء"
//     → { category:'نجار', city:'الدار البيضاء', availableToday:true, type:'service' }
//     → Search Engine → نتائج مرتّبة.
// طبقة Adapter: المحلّل الافتراضي قائم على قواعد (يعمل بلا مفتاح). عند توفّر
// نموذج (OpenAI/Claude/Gemini/Local) يُسجَّل عبر setAdapter دون تغيير المستهلكين.
// ============================================================
const search = require('./search');
const graph = require('./graph');

const CITIES = ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة', 'أكادير', 'مكناس', 'وجدة', 'سلا', 'تطوان', 'القنيطرة', 'الجديدة', 'الناظور', 'برشيد', 'خريبكة'];
const TODAY = ['اليوم', 'دابا', 'الآن', 'حالا', "aujourd'hui", 'maintenant', 'today', 'now'];
const TRUST = ['أفضل', 'احسن', 'أحسن', 'موثوق', 'ثقة', 'ممتاز', 'meilleur', 'best', 'top'];
const norm = (s) => String(s || '').toLowerCase().trim();

// إشارات المشكلة → الفئة (يجعل "باب خشبي" → نجار، "صنبور كيقطر" → سباك)
const PROBLEM_HINTS = [
  { cat: 'نجار',     words: ['باب', 'خشب', 'خزانة', 'طاولة', 'رفوف', 'nجار', 'bois', 'porte'] },
  { cat: 'سباك',     words: ['صنبور', 'ماء', 'تسريب', 'كيقطر', 'يقطر', 'حنفية', 'مرحاض', 'قنوات', 'fuite', 'plomberie'] },
  { cat: 'كهربائي',  words: ['كهرباء', 'تيار', 'ضو', 'مصباح', 'قابس', 'دارة', 'électricité', 'courant'] },
  { cat: 'تكييف',    words: ['مكيف', 'تكييف', 'برودة', 'مبرّد', 'clim'] },
  { cat: 'ميكانيكي', words: ['سيارة', 'محرك', 'عجلة', 'موطور', 'voiture', 'moteur'] },
  { cat: 'كاميرات',  words: ['كاميرا', 'مراقبة', 'caméra', 'surveillance'] },
  { cat: 'دهان',     words: ['صباغة', 'دهان', 'طلاء', 'peinture'] },
  { cat: 'حلاق',     words: ['شعر', 'حلاقة', 'قص', 'coiffure'] },
  { cat: 'مصور',     words: ['صورة', 'تصوير', 'فوتو', 'photo'] },
];

// المحلّل الافتراضي (قواعد) — قابل للاستبدال بنموذج لغوي
function ruleAdapter(query) {
  const q = norm(query);
  const city = CITIES.find(c => q.includes(norm(c))) || undefined;

  // الفئة: فئة مباشرة من الغراف، وإلا استنتاج من إشارات المشكلة (باب→نجار…)
  let category;
  for (const key of Object.keys(graph.CATEGORY_AFFINITY)) {
    if (q.includes(norm(key))) { category = key; break; }
  }
  if (!category) {
    const hint = PROBLEM_HINTS.find(h => h.words.some(w => q.includes(norm(w))));
    if (hint) category = hint.cat;
  }
  const intent = search.detectIntent(query); // service/general + nearby
  const availableToday = TODAY.some(t => q.includes(norm(t)));
  const wantTrust = TRUST.some(t => q.includes(norm(t)));

  const filters = {
    q: category || undefined,
    city,
    type: intent.kind === 'service' ? 'service' : undefined,
    availableToday: availableToday || undefined,
    openNow: (availableToday && intent.kind === 'service') || undefined,
    verified: wantTrust || undefined,
    ratingMin: wantTrust ? 4 : undefined,
  };
  return { understood: { category: category || null, city: city || null, availableToday, wantTrust, kind: intent.kind, nearby: intent.nearby }, filters };
}

let _adapter = ruleAdapter;
function setAdapter(fn) { if (typeof fn === 'function') _adapter = fn; }

// نيّة → استعلام → نتائج (عبر Search Engine الموحّد)
async function ask({ q, lat, lng, radiusKm } = {}) {
  if (!q || !String(q).trim()) return { understood: {}, filters: {}, businesses: [], products: [], suggestions: [] };
  const { understood, filters } = await _adapter(q);
  const result = await search.execute({
    q: filters.q || q, city: filters.city, type: filters.type,
    lat, lng, radiusKm,
    filters: { availableToday: filters.availableToday, openNow: filters.openNow, verified: filters.verified, ratingMin: filters.ratingMin },
    limit: 20,
  });
  // Next Best Action: فئات ذات صلة من شبكة المعرفة (يستهلك معرفة قائمة — قانون ١١).
  // تساعد المستخدم على خطوته التالية، وتُنقذ حالة «لا نتيجة» من الطريق المسدود.
  const suggestions = understood.category
    ? graph.relatedCategoriesWeighted([understood.category]).slice(0, 4).map(s => s.category)
    : [];
  return { understood, filters, intent: result.intent, businesses: result.businesses, products: result.products, suggestions };
}

module.exports = { ask, setAdapter, ruleAdapter };
