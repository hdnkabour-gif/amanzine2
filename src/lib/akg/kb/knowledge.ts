// ============================================================
// AMANZINE — Knowledge Layer (فهمٌ مغربيّ متعدّد اللغات). يبني فوق البيانات
//   المولّدة (knowledgeData) طبقةَ **تطبيعٍ** ومطابقةٍ تفهم المستخدم مهما كتب:
//   دارجة · عربيّة · فرنسيّة · إنجليزيّة · Arabizi. إضافةٌ خالصة — لا تمسّ
//   understand()/needEngine (تُستدعى منهما كإشارةٍ إضافيّة، وتحترم الـ Freeze).
//
//   resolveConcept('bghit mecanicien f casa') → { id:'mechanic', category:'automotive', language:'darija' }
//   resolveCity('bghit sbak f casa')          → { city:'الدار البيضاء' }
// ============================================================

import { CITIES } from './knowledgeData';
import { CONCEPTS } from './concepts';
import { deArabizi } from './arabizi';

// ── تطبيعٌ عربيّ (المراحل ١-٨): تشكيل، توحيد حروف، تكرار، رموز ──
const AR_DIAC = /[ً-ْٰـ]/g;   // تشكيل + تطويل
function normArabic(input: string): string {
  let s = (input || '').toLowerCase();
  s = s.replace(AR_DIAC, '');
  s = s
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[گﮒ]/g, 'ك').replace(/ڭ/g, 'ك').replace(/ڤ/g, 'ف').replace(/پ/g, 'ب');
  s = s.replace(/(.)\1{2,}/g, '$1');                 // حلااااق → حلاق
  s = s.replace(/[^؀-ۿ0-9\s]/g, ' ');       // أبقِ العربيّة/الأرقام فقط
  return s.replace(/\s+/g, ' ').trim();
}

// ── تطبيعٌ لاتينيّ (fr/en/arabizi): حروف صغيرة، إزالة النبرات، تكرار، رموز ──
function normLatin(input: string): string {
  let s = (input || '').toLowerCase();
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');   // é→e, è→e…
  s = s.replace(/(.)\1{2,}/g, '$1');
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// ── إثراءُ متغيّرات (لتغطية صياغاتٍ شائعة لم يوفّرها الملف حرفيًّا) ──
const AUGMENT: Record<string, Partial<Record<string, string[]>>> = {
  barber:      { fr: ['coiffeur'], en: ['hairdresser', 'haircut'] },
  plumber:     { darija: ['سباك'], en: ['plumber'] },
  mechanic:    { fr: ['mecanicien', 'mecano'], darija: ['ميكانيكي'] },
  car_wash:    { darija: ['غسل الطوموبيل', 'نغسل الطوموبيل'] },
  electrician: { darija: ['كهربائي'] },
};

// ── فهارس المطابقة: عربيّ (ar+darija) ولاتينيّ (fr+en+arabizi) ──
interface Match { id: string; category: string; concept: Record<string, string>; }
const stripAl = (t: string) => t.replace(/^ال/, '');
const toks = (s: string) => s.split(/\s+/).map(stripAl).filter(t => t.length >= 2);
const arIndex: { term: string; tokens: string[]; c: Match }[] = [];
const latIndex: { term: string; c: Match }[] = [];

for (const c of CONCEPTS) {
  const m: Match = { id: c.id, category: c.category, concept: c.concept };
  const aug = AUGMENT[c.id] || {};
  for (const t of [...(c.variants.ar || []), ...(c.variants.darija || []), ...(aug.ar || []), ...(aug.darija || [])]) {
    const n = normArabic(t); if (n.length >= 2) arIndex.push({ term: n, tokens: toks(n), c: m });
  }
  for (const t of [...(c.variants.fr || []), ...(c.variants.en || []), ...(c.variants.arabizi || []), ...(aug.fr || []), ...(aug.en || []), ...(aug.arabizi || [])]) {
    const n = normLatin(t); if (n.length >= 2) latIndex.push({ term: n, c: m });
  }
}
// الأطول أوّلًا (أدقّ مطابقة)
arIndex.sort((a, b) => b.term.length - a.term.length);
latIndex.sort((a, b) => b.term.length - a.term.length);
// فهرسٌ فرعيّ للمطابقة بالكلمات (متعدّد الكلمات فقط، الأكثر كلماتٍ أوّلًا = الأخصّ)
const arTokenIndex = arIndex.filter(e => e.tokens.length >= 2).sort((a, b) => b.tokens.length - a.tokens.length);

export type UnderLangDetect = 'darija' | 'ar' | 'fr' | 'en' | 'mixed';
export interface ConceptResolution { id: string; category: string; concept: Record<string, string>; language: UnderLangDetect; }

// قواعد تركيبيّة: مجموعاتٌ يجب أن تُصيب كلُّها (فعل + مفعول…) ⇒ خدمة. تحلّ ترتيب
// الكلمات وتخلّلها: «يغسل ليا الطوموبيل» · «الماكينة ديال الخياطة». لها الأولويّة.
const CAR = ['طوموبيل', 'طونوبيل', 'طموبيل', 'سياره', 'سيارات', 'لوطو', 'كرهبه', 'voiture', 'auto', 'car', 'tomobil'];
const COMPOSITE: { id: string; category: string; all: string[][] }[] = [
  { id: 'car_wash', category: 'automotive', all: [['غسل', 'يغسل', 'نغسل', 'تغسيل', 'نظف', 'ينظف', 'نضف', 'lavage', 'laver', 'wash', 'clean'], CAR] },
  { id: 'mechanic', category: 'automotive', all: [['يصلح', 'صلح', 'نصلح', 'مصلح', 'عطل', 'عطب', 'خربان', 'reparer', 'repair', 'fix', 'panne', 'frein'], CAR] },
  { id: 'sewing_machine_repair', category: 'home_services', all: [['ماكينه', 'ماكينة', 'machine', 'makina'], ['خياطه', 'خياطة', 'couture', 'sewing', 'خيط']] },
];
function conceptById(id: string): Record<string, string> {
  return CONCEPTS.find(c => c.id === id)?.concept || { ar: id };
}

// فئاتٌ مُنسَّقة (الملف يترك أغلبها فارغة) — تُكمِّل، لا تُلغي فئةً موجودة.
const CATEGORY_BY_ID: Record<string, string> = {
  car: 'automotive', mechanic: 'automotive', car_wash: 'automotive', car_service: 'automotive',
  tire_shop: 'automotive', car_tinting: 'automotive', auto_parts: 'automotive',
  plumber: 'home_services', electrician: 'home_services', carpenter: 'home_services',
  painter: 'home_services', tiler: 'home_services', mason: 'home_services',
  contractor: 'home_services', plasterer: 'home_services', locksmith: 'home_services',
  network_installer: 'home_services', curtain_maker: 'home_services',
  barber: 'beauty', tailor: 'fashion', cobbler: 'fashion',
  butcher: 'food_grocery', grocer: 'food_grocery', bakery: 'food_grocery', perfumer: 'food_grocery',
  pharmacy: 'health', doctor_gp: 'health', dentist: 'health', nutritionist: 'health',
  psychologist: 'health', pet_shop: 'health',
  cafe: 'food_dining', restaurant: 'food_dining',
  phone_repair: 'electronics', graphic_designer: 'digital', recruitment_agency: 'services',
  florist: 'retail', blacksmith: 'home_services',
};
function categoryFor(id: string, dataCat: string): string {
  return dataCat || CATEGORY_BY_ID[id] || '';
}

// resolveConcept — يفهم المفهوم (خدمة/مهنة) من نصٍّ بأيّ لغة/كتابة.
export function resolveConcept(text: string): ConceptResolution | null {
  if (!text) return null;
  const hasArabic = /[؀-ۿ]/.test(text);
  const hasLatin = /[a-z]/i.test(text);
  const ta = normArabic(text);                       // مطابقة العربيّة المكتوبة عربيًّا
  const tda = normArabic(deArabizi(text));           // مطابقة الدارجة اللاتينيّة (bghit sbak)
  const tl = normLatin(text);                         // مطابقة fr/en/arabizi
  const blob = `${ta} ${tda} ${tl}`;

  // القواعد التركيبيّة أوّلًا (كلّ مجموعةٍ يجب أن تُصيب). نتجاهل التطبيعات الفارغة.
  const hits = (terms: string[]) => terms.some(w => {
    const na = normArabic(w), nl = normLatin(w);
    return (na.length >= 2 && blob.includes(na)) || (nl.length >= 2 && blob.includes(nl));
  });
  for (const r of COMPOSITE) {
    if (r.all.every(hits)) return { id: r.id, category: categoryFor(r.id, r.category), concept: conceptById(r.id), language: hasArabic ? 'darija' : 'en' };
  }

  // العربيّة: مطابقةٌ متّصلة (أدقّ) أوّلًا.
  for (const { term, c } of arIndex) {
    if ((ta && ta.includes(term)) || (tda && tda.includes(term))) {
      return { id: c.id, category: categoryFor(c.id, c.category), concept: c.concept, language: 'darija' };
    }
  }
  // اللاتينيّة (fr/en/arabizi).
  for (const { term, c } of latIndex) {
    if (tl && new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(tl)) {
      const lang: UnderLangDetect = hasArabic && hasLatin ? 'mixed' : /(je |un |le |la |cherche|besoin)/.test(tl) ? 'fr' : hasLatin ? 'en' : 'darija';
      return { id: c.id, category: categoryFor(c.id, c.category), concept: c.concept, language: lang };
    }
  }
  // العربيّة: مطابقةٌ بالكلمات (تحلّ ترتيب/تخلّل الكلمات: «الماكينة ديال الخياطة»).
  const textToks = new Set([...toks(ta), ...toks(tda)]);
  for (const { tokens, c } of arTokenIndex) {
    if (tokens.every(t => textToks.has(t))) {
      return { id: c.id, category: categoryFor(c.id, c.category), concept: c.concept, language: 'darija' };
    }
  }
  return null;
}

// ── المدن: فهرسُ أسماءٍ وأسماءٍ بديلةٍ (عربيّة/لاتينيّة) → مدينة قانونيّة ──
interface CityMatch { city: string; districts: string[]; }
const cityArIndex: { term: string; c: CityMatch }[] = [];
const cityLatIndex: { term: string; c: CityMatch }[] = [];
for (const city of CITIES) {
  const c: CityMatch = { city: city.ar, districts: city.districts };
  const arTerms = [city.ar, city.darija, ...city.aliases].filter(t => /[؀-ۿ]/.test(t));
  const latTerms = [city.fr, city.en, ...city.aliases].filter(t => /[a-z]/i.test(t));
  for (const t of arTerms) { const n = normArabic(t); if (n.length >= 3) cityArIndex.push({ term: n, c }); }
  for (const t of latTerms) { const n = normLatin(t); if (n.length >= 3) cityLatIndex.push({ term: n, c }); }
}
cityArIndex.sort((a, b) => b.term.length - a.term.length);
cityLatIndex.sort((a, b) => b.term.length - a.term.length);

export interface CityResolution { city: string; district?: string; }
export function resolveCity(text: string): CityResolution | null {
  if (!text) return null;
  const ta = normArabic(text);
  const tl = normLatin(text);
  for (const { term, c } of cityArIndex) if (ta.includes(term)) return { city: c.city, district: districtIn(ta, c) };
  for (const { term, c } of cityLatIndex) if (new RegExp(`(^|\\s)${term}(\\s|$)`).test(tl)) return { city: c.city };
  return null;
}
function districtIn(ta: string, c: CityMatch): string | undefined {
  for (const d of c.districts) { const n = normArabic(d); if (n.length >= 3 && ta.includes(n)) return d; }
  return undefined;
}

export function knowledgeStats() {
  return { concepts: CONCEPTS.length, cities: CITIES.length, arTerms: arIndex.length, latTerms: latIndex.length };
}
