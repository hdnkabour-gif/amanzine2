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

export type ContextKind =
  | 'audience'      // لمن؟
  | 'season'        // متى يُلبَس/يُستعمل؟
  | 'occasion'      // لأيّ مناسبة؟
  | 'condition'     // جديد · مستعمل
  | 'authenticity'  // أصليّ · تقليد — سؤالٌ مغربيٌّ بامتياز
  | 'origin'        // صنع في…
  | 'transaction';  // بالجملة · بالتقسيط

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

  // ── القرابةُ جمهورٌ أيضًا ───────────────────────────────────
  //
  //   أوّلُ مثالٍ كتبه المالكُ حرفيًّا: **«بغيت لبسة لبنتي»**. وقياسٌ أظهر
  //   أنّ التطبيقَ لا يستخرج منها جمهورًا: يعرف «ديال البنات» ولا يعرف
  //   «لبنتي». المغربيُّ لا يصف الجمهورَ بالفئة، يصفه **بقرابته منه**.
  //
  //   وياءُ الملكيّة هنا لا تقلب الاتّجاه — بخلاف «داري». «بنتي» ليست سلعةً
  //   تُعرَض بل إنسانٌ يُشترى له، فالطلبُ يبقى طلبًا.
  { kind: 'audience', key: 'audience', value: 'بنت', terms: [
    'لبنتي', 'ل بنتي', 'ديال بنتي', 'بنتي', 'البنت ديالي', 'لولّيدتي', 'لخوتي البنات'] },
  { kind: 'audience', key: 'audience', value: 'ولد', terms: [
    'لولدي', 'ل ولدي', 'ديال ولدي', 'ولدي', 'الولد ديالي', 'لوليدي', 'لخويا الصغير'] },
  { kind: 'audience', key: 'audience', value: 'نساء', terms: [
    'لمراتي', 'ل مراتي', 'ديال مراتي', 'مراتي', 'المرا ديالي', 'لخطيبتي', 'لأمّي', 'لامي', 'لوالدتي'] },
  { kind: 'audience', key: 'audience', value: 'رجال', terms: [
    'لراجلي', 'ديال راجلي', 'راجلي', 'لخويا', 'لباّ', 'لوالدي', 'لبويا'] },
  { kind: 'audience', key: 'audience', value: 'أطفال', terms: [
    'لولادي', 'ديال ولادي', 'ولادي', 'لدراري ديالي', 'للصغار ديالي'] },

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

  // ── الحالة ─────────────────────────────────────────────────
  // كان يُسأل عنها دائمًا ولو قالها التاجرُ في السطر نفسِه: «تلفون مستعمل».
  { kind: 'condition', key: 'condition', value: 'جديد', terms: [
    'جديد', 'جديدة', 'ناوي', 'ناويّة', 'مازال فالكارطون', 'neuf', 'neuve', 'new', 'brand new'] },
  { kind: 'condition', key: 'condition', value: 'كالجديد', terms: [
    'شبه جديد', 'شبه جديدة', 'كالجديد', 'بحال جديد', 'مستعمل نظيف',
    'comme neuf', 'tres bon etat', 'like new'] },
  { kind: 'condition', key: 'condition', value: 'مستعمل', terms: [
    'مستعمل', 'مستعملة', 'مستعمَل', 'قديم', 'قديمة', 'خدام', 'occasion', 'used', 'second hand'] },

  // ── الأصالة ────────────────────────────────────────────────
  // سؤالٌ مغربيٌّ بامتياز، والصدقُ فيه يمنع نزاعًا بعد البيع.
  { kind: 'authenticity', key: 'authenticity', value: 'أصلي', terms: [
    'أصلي', 'اصلي', 'أصلية', 'اصلية', 'اوريجينال', 'original', 'authentique', 'authentic', 'genuine'] },
  { kind: 'authenticity', key: 'authenticity', value: 'تقليد', terms: [
    'كوبي', 'تقليد', 'مقلّد', 'مقلد', 'ريبليكا', 'copie', 'replique', 'replica', 'fake'] },

  // ── المنشأ ─────────────────────────────────────────────────
  // «جلابة صنع في المغرب» كانت تُقرأ **بحثًا عن حرفيّ** (find_pro) — لأنّ
  // «صنع» فعلٌ. وهي وصفُ منشأ، لا طلبُ صانع.
  { kind: 'origin', key: 'origin', value: 'المغرب', terms: [
    'صنع في المغرب', 'صنع مغربي', 'مغربي الصنع', 'محلي', 'محليّ', 'بلادي',
    'made in morocco', 'fabrique au maroc'] },
  { kind: 'origin', key: 'origin', value: 'مستورد', terms: [
    'مستورد', 'مستوردة', 'مستوردين', 'importe', 'imported'] },
  { kind: 'origin', key: 'origin', value: 'تركيا', terms: [
    'صنع في تركيا', 'تركي', 'تركية', 'turc', 'made in turkey'] },
  { kind: 'origin', key: 'origin', value: 'الصين', terms: [
    'صنع في الصين', 'صيني', 'صينية', 'chinois', 'made in china'] },

  // ── نوعُ المعاملة ──────────────────────────────────────────
  // «للبيع» و«للكراء» **ليست هنا**: هما نيّةٌ تُغيّر القالبَ نفسَه (الكراء له
  // ثمنٌ يوميٌّ وضمانة)، ويقرؤهما `needEngine`. وضعُهما هنا أيضًا يُنشئ
  // مصدرًا ثانيًا. ما هنا هو ما لا يُغيّر القالبَ بل يصف شروطَ البيع.
  { kind: 'transaction', key: 'transaction', value: 'بالجملة', terms: [
    'بالجملة', 'جملة', 'كميات', 'gros', 'en gros', 'wholesale', 'bulk'] },
  { kind: 'transaction', key: 'transaction', value: 'بالتقسيط', terms: [
    'بالتقسيط', 'تقسيط', 'كريدي', 'بالسلف', 'facilite', 'credit', 'installment'] },
  { kind: 'transaction', key: 'transaction', value: 'تبديل', terms: [
    'للتبديل', 'تبديل', 'نبدل', 'echange', 'troc', 'swap', 'trade'] },
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

/** القيمُ المعروفةُ لنوعِ سياقٍ ما — يقرؤها مَن يشير إليها بدل أن ينسخها. */
export function contextValues(kind: ContextKind): string[] {
  return Array.from(new Set(RULES.filter(r => r.kind === kind).map(r => r.value)));
}
