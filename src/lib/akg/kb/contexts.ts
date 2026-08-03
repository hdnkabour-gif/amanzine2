// ============================================================
// السياقات — ما يَصِف المبيعَ ولا يكونه.
//
//   العطبُ الذي وُلدت منه هذه الطبقة، مقيسًا:
//
//     «صباط ديال الرجال»  ⇒  ملابس رجال   (والحذاءُ ضاع)
//     «تراكسي ديال البنات» ⇒  ملابس نساء   (والرياضةُ ضاعت)
//
//   السبب: جعلتُ «ديال الرجال» مرادفًا لمفهوم `mens_clothing`. والفهرسُ
//   يفوز فيه الأطول، و«ديال الرجال» (١١ حرفًا) أطولُ من «صباط» (٤). فيغلب
//   **الوصفُ الموصوفَ**.
//
//   والخلاصةُ أعمُّ من الملابس: «ديال الرجال» و«شتوي» و«ديال العيد» ليست
//   أشياءَ تُباع — بل **صفاتٌ لما يُباع**. وضعُها في الفهرس نفسِه الذي
//   يحمل الأشياءَ خلطٌ بين طبقتين. مكانُها هنا.
//
//   وفائدتُها الثانيةُ أكبر: ما يُلتقَط هنا **لا يُسأل عنه**. من كتب «كسوة
//   شتوية للبنات» أجاب سلفًا عن الموسم والجمهور — وكان التطبيقُ يسألهما.
// ============================================================

export type ContextKind = 'audience' | 'season' | 'occasion';

export interface ContextSignal {
  kind: ContextKind;
  /** مفتاحُ الحقل الذي يملؤه — يطابق `categoryFields`. */
  key: string;
  /** القيمةُ كما تُعرَض وتُخزَّن. */
  value: string;
  /** **الدليل**: أيُّ كلمةٍ في نصّ المستخدم أنتجت هذا. */
  because: string;
  confidence: number;
}

interface Rule { kind: ContextKind; key: string; value: string; terms: string[] }

/** تطبيعٌ مطابقٌ لِما في `knowledge.ts` — الطرفان يقارنان الشكلَ نفسَه أو لا يلتقيان. */
const norm = (s: string) => (s || '').toLowerCase()
  .replace(/[ً-ْٰـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

const RULES: Rule[] = [
  // ── الجمهور ────────────────────────────────────────────────
  { kind: 'audience', key: 'audience', value: 'رجال', terms: [
    'ديال الرجال', 'ديال الرجالة', 'للرجال', 'رجالي', 'رجالية', 'حريمي رجالي',
    'pour homme', 'homme', 'hommes', 'men', 'mens', 'for men', 'male'] },
  { kind: 'audience', key: 'audience', value: 'نساء', terms: [
    'ديال العيالات', 'ديال النساء', 'ديال البنات', 'للنساء', 'للبنات', 'نسائي', 'نسائية', 'حريمي',
    'pour femme', 'femme', 'femmes', 'women', 'womens', 'for women', 'ladies', 'female'] },
  { kind: 'audience', key: 'audience', value: 'أطفال', terms: [
    'ديال الدراري', 'ديال الصغار', 'ديال الولاد', 'للأطفال', 'للاطفال', 'أطفالي',
    'pour enfant', 'enfant', 'enfants', 'kids', 'for kids', 'children'] },
  { kind: 'audience', key: 'audience', value: 'رُضّع', terms: [
    'ديال البيبي', 'ديال المواليد', 'للرضع', 'للمواليد',
    // `infant` يملكها مفهومُ `baby_clothing` — تسميةُ شيءٍ لا وصفُه.
    'pour bebe', 'bebe', 'baby', 'newborn'] },

  // ── الموسم ─────────────────────────────────────────────────
  { kind: 'season', key: 'season', value: 'شتاء', terms: [
    'شتوي', 'شتوية', 'ديال الشتا', 'ديال البرد', 'للشتاء', 'دافي', 'دافية',
    'hiver', 'winter'] },
  { kind: 'season', key: 'season', value: 'صيف', terms: [
    'صيفي', 'صيفية', 'ديال الصيف', 'ديال الصهد', 'للصيف', 'خفيف للصيف',
    'ete', 'summer'] },
  { kind: 'season', key: 'season', value: 'ربيع', terms: ['ربيعي', 'ربيعية', 'printemps', 'spring'] },
  { kind: 'season', key: 'season', value: 'خريف', terms: ['خريفي', 'خريفية', 'automne', 'autumn', 'fall'] },

  // ── المناسبة ───────────────────────────────────────────────
  { kind: 'occasion', key: 'occasion', value: 'عيد', terms: [
    'ديال العيد', 'للعيد', 'العيد', 'عيد الفطر', 'عيد الاضحى', 'aid', 'eid'] },
  { kind: 'occasion', key: 'occasion', value: 'رمضان', terms: ['رمضان', 'ديال رمضان', 'ramadan'] },
  { kind: 'occasion', key: 'occasion', value: 'عرس', terms: [
    'ديال العرس', 'للعرس', 'العرس', 'عرس', 'زفاف', 'mariage', 'wedding'] },
  { kind: 'occasion', key: 'occasion', value: 'عمل', terms: [
    'ديال الخدمة', 'للعمل', 'ديال الشغل', 'رسمي', 'travail', 'work', 'bureau'] },
  { kind: 'occasion', key: 'occasion', value: 'مدرسة', terms: [
    'ديال المدرسة', 'للمدرسة', 'مدرسي', 'ecole', 'school', 'rentree'] },
  // `sport` و`gym` يملكهما مفهومان قائمان (ملابسُ رياضيّةٌ وقاعة) — أسماءُ
  // أشياءَ لا أوصاف. السياقُ يأخذ ما يصف الاستعمالَ وحدَه.
  { kind: 'occasion', key: 'occasion', value: 'رياضي', terms: [
    'ديال الرياضة', 'للرياضة', 'رياضي', 'رياضية'] },
  { kind: 'occasion', key: 'occasion', value: 'يومي', terms: [
    'ديال الدار', 'ديال كل نهار', 'كاجوال', 'casual', 'quotidien'] },
];

/**
 * كلُّ ما يَصِف المبيعَ في هذه الجملة، **مع سببِ كلِّ التقاط**.
 *
 * لا يقرّر شيئًا ولا يمسّ المفاهيم — يُخرِج إشاراتٍ يقرؤها `inference`.
 * وهو **قابلٌ للتصحيح**: كلُّ إشارةٍ تحمل الكلمةَ التي أنتجتها، فيرى التاجرُ
 * «الموسم: شتاء — لأنّك قلت "شتوية"» ويصحّحها بنقرة.
 */
export function extractContexts(raw: string): ContextSignal[] {
  const t = ` ${norm(raw)} `;
  if (t.trim().length < 2) return [];
  const out: ContextSignal[] = [];
  const seen = new Set<string>();               // مفتاحٌ واحدٌ لا يُملأ مرّتين

  // الأطولُ أوّلًا داخل كلّ قاعدة: «ديال العيد» تسبق «العيد».
  for (const r of RULES) {
    if (seen.has(r.key + ':' + r.kind)) continue;
    const hit = [...r.terms].sort((a, b) => b.length - a.length)
      .find(term => {
        const n = norm(term);
        return n.length >= 3 && t.includes(` ${n} `);
      });
    if (!hit) continue;
    seen.add(r.key + ':' + r.kind);
    out.push({
      kind: r.kind, key: r.key, value: r.value, because: hit,
      // الوصفُ الصريحُ أوثقُ من الاستنتاج: من كتب «شتوية» قال الموسمَ بنفسه.
      confidence: 0.92,
    });
  }
  return out;
}

/** المصطلحاتُ كلُّها — يقرؤها حارسٌ يمنع عودتَها إلى فهرس المفاهيم. */
export function allContextTerms(): string[] {
  return RULES.flatMap(r => r.terms);
}
