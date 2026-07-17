// ============================================================
// Vocabulary Registry — نواة المعرفة اللغويّة. لا «قاموس» عملاق، بل سجلّ
//   بمسؤوليّة واضحة: يربط الأسطح اللغويّة (عربيّة/دارجة/فرنسيّة/إنجليزيّة/
//   أمازيغيّة + مرادفات + أخطاء إملائيّة + عاميّة) بـ«مفهوم» واحد.
//   يغذّي inference/search/normalize بلا مسّ المعماريّة (بيانات فقط).
// ============================================================

export type Lang = 'ar' | 'darija' | 'fr' | 'en' | 'amazigh';
export type ConceptKind = 'profession' | 'vehicle' | 'engine' | 'part' | 'service' | 'category' | 'city' | 'general';

export interface VocabEntry {
  concept: string;                          // المفهوم المرجعيّ («سبّاك»، «مازوط»…)
  kind: ConceptKind;
  terms: Partial<Record<Lang, string[]>>;   // الأسطح لكلّ لغة
  synonyms?: string[];                      // مرادفات/عاميّة/اختصارات (عابرة اللغات)
  typos?: string[];                         // أخطاء إملائيّة شائعة
}

const entries: VocabEntry[] = [];
const index = new Map<string, VocabEntry>();   // سطح (lowercase) → مفهوم

const norm = (s: string) => s.trim().toLowerCase();

export function registerVocab(e: VocabEntry): void {
  entries.push(e);
  const all = [
    ...Object.values(e.terms).flat(),
    ...(e.synonyms ?? []), ...(e.typos ?? []), e.concept,
  ].filter(Boolean) as string[];
  for (const t of all) if (!index.has(norm(t))) index.set(norm(t), e);
}

// تطبيع سطح لغويّ → مفهوم (يطابق أيّ لغة/مرادف/خطأ إملائيّ).
export function normalize(term: string): VocabEntry | undefined {
  return index.get(norm(term));
}

// كلّ المفاهيم الموجودة في نصّ (بحث احتواء بسيط، الأطول أوّلًا).
export function conceptsIn(text: string): VocabEntry[] {
  const t = norm(text);
  const keys = Array.from(index.keys()).sort((a, b) => b.length - a.length);
  const found: VocabEntry[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    if (k.length >= 3 && t.includes(k) && !seen.has(index.get(k)!.concept)) {
      found.push(index.get(k)!); seen.add(index.get(k)!.concept);
    }
  }
  return found;
}

export function allVocab(): VocabEntry[] { return entries.slice(); }
export function vocabSize(): number { return entries.length; }

// ── البذرة v1 (من قواعد معرفة الملفّ: سيّارات + حرفيّون) ──
const SEED: VocabEntry[] = [
  // — مركبات —
  { concept: 'سيّارة', kind: 'vehicle', terms: { ar: ['سيارة', 'سيّارة'], darija: ['طونوبيل', 'طوموبيل'], fr: ['voiture'], en: ['car'] }, typos: ['طونوبين'] },
  { concept: 'دراجة نارية', kind: 'vehicle', terms: { ar: ['دراجة نارية'], darija: ['موطور', 'موتور'], fr: ['moto'], en: ['motorcycle'] } },
  { concept: 'شاحنة', kind: 'vehicle', terms: { ar: ['شاحنة'], fr: ['camion'], en: ['truck'] } },
  // — محرّك/وقود —
  { concept: 'مازوط', kind: 'engine', terms: { ar: ['ديزل'], darija: ['مازوط', 'مازوت'], fr: ['diesel'], en: ['diesel'] } },
  { concept: 'بنزين', kind: 'engine', terms: { ar: ['بنزين'], fr: ['essence'], en: ['petrol', 'gasoline'] } },
  { concept: 'كهربائي (محرّك)', kind: 'engine', terms: { ar: ['كهربائي'], fr: ['électrique'], en: ['electric'] } },
  { concept: 'هجين', kind: 'engine', terms: { ar: ['هجين'], fr: ['hybride'], en: ['hybrid'] } },
  // — قطع غيار —
  { concept: 'إطار', kind: 'part', terms: { ar: ['إطار', 'عجلة'], darija: ['پنو', 'بنو', 'روي'], fr: ['pneu'], en: ['tire'] } },
  { concept: 'بطارية', kind: 'part', terms: { ar: ['بطارية'], darija: ['باتري'], fr: ['batterie'], en: ['battery'] } },
  { concept: 'فرامل', kind: 'part', terms: { ar: ['فرامل'], darija: ['فرام'], fr: ['freins'], en: ['brakes'] } },
  { concept: 'علبة السرعات', kind: 'part', terms: { ar: ['علبة السرعات'], darija: ['بوات', 'بوابيتيس'], fr: ['boîte de vitesses'] } },
  { concept: 'محرّك', kind: 'part', terms: { ar: ['محرّك', 'محرك'], darija: ['موطور', 'ماطور'], fr: ['moteur'], en: ['engine'] } },
  // — حرفيّون —
  { concept: 'سبّاك', kind: 'profession', terms: { ar: ['سبّاك', 'سباك'], darija: ['سباك'], fr: ['plombier'], en: ['plumber'] }, synonyms: ['صحّي'] },
  { concept: 'كهربائي', kind: 'profession', terms: { ar: ['كهربائي'], darija: ['كهربائي', 'ضوّاي'], fr: ['électricien'], en: ['electrician'] } },
  { concept: 'نجّار', kind: 'profession', terms: { ar: ['نجّار', 'نجار'], fr: ['menuisier'], en: ['carpenter'] } },
  { concept: 'صبّاغ', kind: 'profession', terms: { ar: ['صبّاغ', 'صباغ'], darija: ['صباغ'], fr: ['peintre'], en: ['painter'] } },
  { concept: 'ميكانيكي', kind: 'profession', terms: { ar: ['ميكانيكي'], darija: ['ميكانيسيان', 'ميكانيك'], fr: ['mécanicien'], en: ['mechanic'] } },
  { concept: 'حدّاد', kind: 'profession', terms: { ar: ['حدّاد', 'حداد'], darija: ['فورجرون'], fr: ['forgeron', 'ferronnier'] } },
  { concept: 'بنّاي', kind: 'profession', terms: { ar: ['بنّاي', 'بناي'], darija: ['بنّاي'], fr: ['maçon'], en: ['mason'] } },
  { concept: 'كوّافير', kind: 'profession', terms: { ar: ['حلّاق', 'كوافير'], darija: ['حلاق', 'كوافور'], fr: ['coiffeur'], en: ['barber'] } },
  { concept: 'تقني تبريد', kind: 'profession', terms: { ar: ['تقني تبريد', 'مكيّف'], darija: ['كليماتيزور'], fr: ['climatisation'] } },
];

SEED.forEach(registerVocab);
