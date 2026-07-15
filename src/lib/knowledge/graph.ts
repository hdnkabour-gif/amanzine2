// ============================================================
// Knowledge Graph (بذرة دلاليّة) — لا Graph DB، بل علاقات مُنسَّقة قابلة للنموّ.
// التطبيق لا يحفظ كلمات فقط، بل «العلاقات بين الأشياء»: بعد صبّاغ غالبًا تحتاج
// كهربائيًّا ونجّارًا وتنظيفًا. هذه البذرة تُثري تدفّق الـ Need باقتراح الخطوة
// المجاورة — والتجارب/المرشّحات ستوسّعها لاحقًا بلا إعادة كتابة.
// ============================================================

export type NodeType = 'profession' | 'category' | 'problem';

interface GraphNode {
  label: string;
  type: NodeType;
  alsoNeed?: string[];   // ما يُطلَب عادةً بعده (علاقة «often followed by»)
  facets?: string[];     // أبعاد الفئة (للتصنيفات) — للتوسّع لاحقًا
}

// بذرة الحرف المغربية الشائعة + علاقاتها (منسّقة يدويًّا كنقطة انطلاق).
const GRAPH: Record<string, GraphNode> = {
  'صبّاغ':        { label: 'صبّاغ', type: 'profession', alsoNeed: ['كهربائي', 'نجّار', 'تنظيف بعد الأشغال'] },
  'سبّاك':        { label: 'سبّاك', type: 'profession', alsoNeed: ['صبّاغ', 'بنّاي'] },
  'كهربائي':      { label: 'كهربائي', type: 'profession', alsoNeed: ['تقني تركيبات', 'صبّاغ'] },
  'حدّاد':        { label: 'حدّاد', type: 'profession', alsoNeed: ['صبّاغ', 'بنّاي', 'نجّار'] },
  'نجّار':        { label: 'نجّار', type: 'profession', alsoNeed: ['صبّاغ', 'حدّاد'] },
  'بنّاي':        { label: 'بنّاي', type: 'profession', alsoNeed: ['حدّاد', 'سبّاك', 'كهربائي', 'صبّاغ'] },
  'كوافير':       { label: 'كوافير', type: 'profession', alsoNeed: ['حلّاقة', 'تجميل'] },
  'تقني تبريد':   { label: 'تقني تبريد', type: 'profession', alsoNeed: ['كهربائي'] },
  'تقني هواتف':   { label: 'تقني هواتف', type: 'profession', alsoNeed: ['ملحقات', 'كهربائي'] },
  'تقني تركيبات': { label: 'تقني تركيبات', type: 'profession', alsoNeed: ['كهربائي'] },
};

// ما يُطلَب عادةً بعد هذا المفهوم (الخطوة المجاورة في الرسم).
export function relatedProfessions(concept?: string): string[] {
  if (!concept) return [];
  return GRAPH[concept]?.alsoNeed ? GRAPH[concept].alsoNeed!.slice(0, 3) : [];
}

export function graphSize(): number { return Object.keys(GRAPH).length; }
