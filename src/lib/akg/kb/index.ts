// ============================================================
// Knowledge Foundation Pack v2 — النواة المعرفيّة (Modules مستقلّة). المحور:
//   المشكلة. understand(text) يفهم المستخدم من كلامه (دارجة) حتّى لو لم يذكر
//   اسم المهنة — عبر Symptom Graph → Problem → Solution(profession+
//   capabilities) → Geo/Context. مع خطوات استدلال قابلة للتفسير (reasoning).
//   بيانات فقط تغذّي inference/search — تحترم الـ Freeze.
// ============================================================

import { CONCEPTS as ALL_CONCEPTS } from './concepts';

export * from './vocabulary';
export * from './professions';
export * from './problems';
export * from './symptomGraph';
export * from './capabilities';
export * from './tools';
export * from './geo';
export * from './categories';
export * from './memory';
export * from './arabizi';
// المفاهيم: نصدّر المصدر الموحّد (concepts = مولّد + توسعة) بدل الخام (knowledgeData)
export { CITIES } from './knowledgeData';
export type { CityData } from './knowledgeData';
export * from './concepts';
export * from './knowledge';
export * from './ambiguity';
export * from './facts';
export * from './knowledgeGraph';

import { conceptsIn, normalize, type VocabEntry } from './vocabulary';
import { deArabizi } from './arabizi';
import { resolveConcept, resolveCity } from './knowledge';
import { detectAmbiguity, type Ambiguity } from './ambiguity';
import { detectFacts, FACT_LABEL, type FactTopic } from './facts';
import { getProblem, type Problem } from './problems';
import { findProblemBySymptom } from './symptomGraph';
import { getProfession, findProfessionByLabel, type Profession } from './professions';
import { cityInText } from './geo';
import { matchApprovedMemory } from './memory';

export interface Understanding {
  problem?: Problem;               // المشكلة المستنتَجة
  profession?: Profession;         // المهنة الحالّة
  capabilities: string[];          // القدرات المطلوبة
  concepts: VocabEntry[];          // مفاهيم مذكورة
  city?: string;
  district?: string;               // الحيّ (من قاعدة المدن) إن وُجد
  category?: string;               // فئة المفهوم (automotive/home…) من القاموس المتعدّد اللغات
  service?: string;                // مُعرّف المفهوم القانونيّ (mechanic/plumber…)
  language?: string;               // لغة الكتابة المكتشَفة (darija/ar/fr/en/mixed)
  context: { urgent: boolean; night: boolean; weekend: boolean };
  confidence: number;              // 0..1
  reasoning: string[];             // خطوات الاستدلال (تفسير)
  learned?: { phrase: string; concept: string }; // معرفة معتمَدة بشريًّا طُبِّقت
  stance?: Stance;                 // يَعرض أم يطلب؟ «أنا حدّاد» ≠ «بغيت حدّاد»
  // غموضٌ معجميّ: كلمةٌ لمعنيَين بلا قرينةٍ حاسمة («موطور» = محرّك ولا درّاجة؟).
  // حين تُملأ، **يُسأل الإنسانُ ولا يُخمَّن له** — التخمينُ يأخذه للمكان الخطأ
  // بلا أثرٍ يُراجَع، والسؤالُ يُنهي الأمرَ في ثانية.
  ambiguity?: Ambiguity;
  // الوقائعُ المذكورة: «واش كاين التوصيل» لا مهنةَ فيها ولا مفهوم — تسأل عن
  // واقعةٍ عن نسخة. تُقرأ مع stance: طلبًا إن سُئلت، خبرًا إن أُخبِر بها.
  facts?: FactTopic[];
}

// الاتّجاه: بدونه كان «أنا حدّاد» يُفهَم كطلبٍ لحدّاد، فيردّ التطبيق «نقلبو عليه»
// على من يعرض حدادته. علاماتٌ عامّة تعمل مع كلّ المفاهيم، ثمّ عباراتُ المفهوم نفسه.
export type Stance = 'offer' | 'seek' | 'unknown';

const OFFER_MARKS = [
  'انا ', 'أنا ', 'احنا', 'إحنا', 'عندي', 'عندنا', 'كنبيع', 'نبيع', 'كنخدم',
  'كنصايب', 'كنصنع', 'كنقدم', 'كندير', 'خدمتي', 'شركتي', 'محلي', 'متجري',
  'عندي محل', 'عندي شركة', 'صاحب', 'حرفي', 'مول ',
];
const SEEK_MARKS = [
  'بغيت', 'بغينا', 'خاصني', 'خاصنا', 'محتاج', 'نحتاج', 'كنقلب', 'كنقلبو',
  'فين نلقى', 'فين كاين', 'واش كاين', 'شكون', 'ابحث', 'أبحث', 'اريد', 'أريد',
  // ضُمَّت من قائمة needEngine.WANT: كانت هناك إشاراتٌ طلبٍ لا يعرفها الاتّجاه،
  // فيختلف العقلان على نفس الجملة. المصدر واحدٌ الآن.
  'باغي', 'خصني', 'نقلب', 'وين', 'فين', 'علاش', 'شحال ثمن', 'عندكم',
  // «شي واحد يصايب ليا…» من أكثر صيغ الطلب نطقًا في الدارجة، ولم تكن معروفة:
  // فتُقرأ الجملةُ بلا اتّجاه، فيُعامَل الطالبُ معاملةَ مستفسِرٍ عابر.
  'شي واحد', 'شي حد', 'شي شخص', 'شي مول', 'شكون يقدر', 'شكون كيدير',
];

// شكوى: «عندي مشكل» تبدأ بعلامة عرض («عندي») لكنّها طلبُ مساعدة.
// «لديّ/عندي/فيا» — الشكوى تُكتب بصيغٍ كثيرة، وكلّها طلبُ مساعدة لا عرض.
const COMPLAINT = [
  'عندي مشكل', 'عندي مشكلة', 'عندنا مشكل', 'عندي عطل', 'عندي خلل', 'ما كيخدمش', 'خربان',
  'لدي مشكل', 'لديّ مشكل', 'لدي مشكلة', 'عندي مشكيل', 'واجهتني مشكلة', 'طرا لي مشكل',
  // الدارجة تؤنّث كثيرًا (الثلّاجة، الغسّالة، الطوموبيل) — بلا صيغة المؤنّث كانت
  // «الثلاجة ما بقاتش خدامة» تُقرأ بلا اتّجاه فتضيع شكوى.
  'ما بقاش خدام', 'ما بقاتش خدامة', 'ما بقاتش خدّامة', 'ما بقاتش',
  'ما خدامش', 'ما خدماش', 'ما كتخدمش', 'ما كيخدمش',
  'تخربق', 'تخربقات', 'تعطل', 'تعطلات', 'حبس', 'حبسات',
];

// «عندي» + عيبٌ = شكوى، لا عرض. «عندي خدش فالبارشوك» كان يُقرأ **عرضًا**
// لأنّ «عندي» علامةُ عرض — فيُرسَل صاحبُ الخدش لينشر إعلانًا بدل أن يجد
// مَن يُصلحه. الشكوى نادرًا ما تقول «مشكل»؛ تقول اسمَ العيب مباشرةً.
// أسماءُ العيوب كما ينطقها الناسُ في الورشة، لا كما تُكتب في قاموس:
// «شرطة» و«ضربة» و«خدشة» — ثلاثتُها كانت تُقرأ **عرضًا** لأنّ «عندي» علامةُ
// عرض، فيُرسَل صاحبُ الضربة لينشر إعلانًا بدل أن يجد مَن يُصلحها.
const DEFECT = [
  'خدش', 'خدشة', 'خدوش', 'خديشة', 'شرطة', 'شرط', 'شرطات', 'ضربة', 'ضربات',
  'طق', 'بوسة', 'صدمة', 'كسر', 'مكسور', 'مهرس', 'مهرسة', 'طبعة', 'بقعة',
  'ثقب', 'تقب', 'تسرب', 'تسريب', 'كيسيل', 'كيقطر',
  // عطبٌ بلا وصفٍ حسّيّ: «الثلاجة خاسرة» · «ما خدامش» · «واقفة». كانت تُفهَم
  // مساعدةً بلا اتّجاه، فلا يعرف المحرّكُ أنّ صاحبها **يطلب**.
  'خاسر', 'خاسره', 'خاسرة', 'خسرات', 'تخسرات', 'ما خدامش', 'ماخدامش',
  'ما خدماش', 'واقف', 'واقفه', 'واقفة', 'مقطوع', 'معطل', 'معطّل', 'خربان', 'عطل', 'عيب', 'شق', 'شقوق',
];
// الوسخُ شكوى أيضًا: «الزربية موسخة» طلبُ تنظيفٍ لا عرضُ زربيّة. وكانت
// تُقرأ بلا اتّجاهٍ أصلًا، فتُعامَل معاملةَ استعلامٍ عامّ.
const DIRTY = ['موسخ', 'موسخة', 'موسّخ', 'مّوسخ', 'مسخة', 'متسخة', 'متسخ', 'وسخة',
  'عامر بالزيت', 'عامر بالوسخ', 'مليان وسخ', 'ديال الوسخ'];

// أفعالُ العرض بصيغة المتكلّم — تغلب أداةَ الطلب حين تجتمعان.
const SELF_OFFER = ['نبيع', 'كنبيع', 'نسوق', 'نسوّق', 'باغي نبيع', 'بغيت نبيع'];

/**
 * **«كن» + فعلٌ = عملٌ أزاوله، أي عرض.** قاعدةٌ صرفيّةٌ لا قائمةَ ألفاظ:
 * «كنوصل الطلبات» · «كنطبخ» · «كنخيّط» · «كنصلّح» — كلُّها إخبارٌ عن حرفة.
 *
 *   وضميرُ المتكلّم وحدَه: «كن» و«تن». أمّا «كي» فللغائب — «شكون **كي**صلح
 *   الماكينة» سؤالٌ عن غيره لا إخبارٌ عن نفسه، وقد كسر هذا التمييزُ اختبارًا
 *   قائمًا حين غفلتُ عنه.
 *
 *   وأفعالُ البحث تُستثنى: «كنقلّب» · «كنبحث» · «كنحتاج».
 *   بلا هذه القاعدة كان «كنوصل الطلبات فكازا» مجهولَ الاتّجاه: يُخبِر عن
 *   حرفته فيُعامَل كأنّه لم يقل شيئًا.
 */
const HABITUAL = /(^|\s)(كن|تن)[ء-ي]{3,}/;
const HABITUAL_SEEK = ['كنقلب', 'كنقلّب', 'كنبحث', 'كنحتاج', 'كنسأل', 'كنسول', 'كنتسنى'];

/**
 * **الملكيّةُ تقلب الاتّجاه.**
 *
 *   لاحظها المالكُ بنفسه، وهي أدقُّ ملاحظةٍ لغويّةٍ في المشروع كلِّه:
 *
 *       «بغيت نكري دار»   ⇒ أبحث عن دارٍ لأسكنها     (طلب)
 *       «بغيت نكري داري»  ⇒ أعرض داري للكراء          (عرض)
 *
 *   حرفٌ واحد — ياءُ الملكيّة — يقلب المعنى كلَّه. وكان المحرّكُ يقرأ
 *   الاثنتين `rent` بلا فرق، فيُرسَل صاحبُ الدار ليستأجر ما يملك.
 *
 *   والقاعدةُ أعمُّ من العقار: «نبيع داري» · «السيارة ديالي» · «المحل ديالنا».
 *   كلُّ ما أُضيف إلى المتكلّم فهو **ما يملكه**، ومن يملك يعرض لا يطلب.
 */
const OWNED = [
  'ديالي', 'ديالنا', 'ديال الدار ديالي',
  'داري', 'دارنا', 'محلي', 'محلّي', 'حانوتي', 'شقتي', 'سيارتي', 'طوموبيلي',
  'مطعمي', 'مقهاي', 'أرضي', 'ارضي', 'دكاني', 'مخزني', 'كراجي',
];
/** ما يُعرَض للكراء صراحة: «عندي دار للكراء» · «كنكري محلّي». */
const OFFER_RENT = ['للكراء عندي', 'كنكري', 'كنكريو', 'نكري ديالي'];
// السؤالُ طلبٌ لا عرض. كانت «انا ف طنجة امتا توصلني» تُقرأ **عرضًا**، لأنّ
// «أنا» في علامات العرض — والضميرُ وحدَه لا يعرض شيئًا؛ الزبونةُ تُعرِّف نفسَها
// لا تعرض بضاعة. تُفحَص بعد علامات الطلب وقبل علامات العرض: من يسأل يطلب،
// ولو ذكر نفسَه. وهذا يُصلح معه «شحال القياس» و«بشحال التوصيل» — كانتا بلا
// اتّجاهٍ أصلًا، فيُعامَل السائلُ معاملةَ عابرٍ لا زبون.
const QUESTION = ['امتا', 'اماتا', 'فوقاش', 'كيفاش', 'شحال', 'بشحال', 'شنو', 'اشنو', 'شني',
  // «واش» أداةُ استفهامٍ خالصةٌ في الدارجة — لا تُقال إلّا سؤالًا.
  'واش',
  // «عندك» خطابٌ لغيرك: سؤالٌ عمّا يملكه هو، لا إخبارٌ عمّا تملك أنت.
  // («عندي» تبقى علامةَ عرضٍ — الفرقُ حرفٌ واحدٌ ومعنًى مقلوب.)
  'عندك',
  // صيغةُ الأمر: «وريني كساوي اللي عندك» طلبٌ صريحٌ كانت تُقرأ بلا اتّجاه.
  'وريني', 'وريهم', 'ورينا', 'وريها', 'صيفط ليا', 'بين ليا', 'بيّن ليا'];

const HAS = ['عندي', 'عندنا', 'فيا', 'لدي', 'لديّ'];

/**
 * **حالُ البدن طلبٌ بذاته.** «جاني جوع» ليست فيها أداةُ طلبٍ ولا فعلُ شراء،
 * فكانت تُقرأ «مجهولة الاتّجاه» — ومَن جاع لا يَعرض الطعامَ بل يطلبه.
 * القياسُ نفسُه الذي جعل العطبَ طلبًا: «الثلاجة خاسرة» ⇒ يطلب إصلاحًا.
 */
const BODY_NEED = [
  'جاني جوع', 'جاني الجوع', 'جعت', 'جيعان', 'جيعانة', 'راني جيعان', 'عندي جوع',
  'تشهيت', 'تشهّيت', 'مشتهي', 'عطشان', 'جاني عطش', 'ماكلتش', 'خاصني ناكل',
];

/**
 * **مَن يطلب عملًا يَعرض نفسَه.** «بغيت نخدم دليفري» صياغتُها طلبٌ ومعناها
 * عرضُ يدٍ عاملة؛ ولولا هذا لأُرسل الباحثُ عن عملٍ ليَستأجر موصِّلًا.
 */
const WORK_OFFER = [
  'بغيت نخدم', 'باغي نخدم', 'بغيت نخدم بحال', 'كنقلب على خدمة', 'نقلب على خدمة',
  'باغي خدمة عندكم', 'بغيت نشتغل', 'باغي نشتغل', 'كنقلب على الخدمة',
];

function detectStance(t: string, c?: { stance?: { offer?: string[]; seek?: string[] } }): Stance {
  // العملُ يُعرَض ولو بصيغة الطلب — يُفحَص قبل كلّ شيءٍ لأنّ فيه «بغيت».
  if (WORK_OFFER.some(w => t.includes(w))) return 'offer';
  if (BODY_NEED.some(w => t.includes(w))) return 'seek';
  if (COMPLAINT.some(w => t.includes(w))) return 'seek';
  // «عندي» + عيب ⇒ شكوى. و«موسخ» شكوى بذاتها بلا «عندي».
  if (HAS.some(h => t.includes(h)) && DEFECT.some(d => t.includes(d))) return 'seek';
  if (DIRTY.some(w => t.includes(w))) return 'seek';
  // عطبٌ مذكورٌ بلا «عندي» شكوى أيضًا: «الثلاجة خاسرة» — من يصف عطبًا يطلب
  // إصلاحَه، ولا يعرضه للبيع.
  if (DEFECT.some(w => t.includes(w))) return 'seek';
  // عباراتُ المفهوم أدقّ من العلامات العامّة ⇒ تُفحَص أوّلًا.
  for (const ph of c?.stance?.offer || []) if (ph && t.includes(ph)) return 'offer';
  for (const ph of c?.stance?.seek  || []) if (ph && t.includes(ph)) return 'seek';
  // **الملكيّةُ قبل كلّ شيء.** «بغيت نكري داري» صياغتُها طلبٌ ومعناها عرض،
  // والفارقُ حرفٌ واحد. تُفحَص قبل علامات الطلب وإلّا غلبت «بغيت» الياءَ.
  if (OWNED.some(w => t.includes(w))) return 'offer';
  if (OFFER_RENT.some(w => t.includes(w))) return 'offer';
  // «عندي X للكراء/للبيع» عرضٌ مهما سبقته أداةُ طلب.
  if (HAS.some(h => t.includes(h)) && ['للكراء', 'للبيع', 'للإيجار', 'للايجار'].some(w => t.includes(w))) return 'offer';
  // فعلُ العرض يغلب أداةَ الطلب: «بغيت نبيع طوموبيل» صياغتُه طلبٌ ومعناه عرض.
  // بدون هذا كان صاحبُ السيّارة يُرسَل إلى السوق ليشتري ما يريد بيعه.
  if (SELF_OFFER.some(w => t.includes(w))) return 'offer';
  // الإخبارُ عن حرفةٍ عرضٌ: «كنوصل الطلبات» — بعد علامات الطلب الصريحة
  // كي لا تغلب القاعدةُ الصرفيّةُ عبارةً أوضحَ منها.
  if (HABITUAL.test(t) && !HABITUAL_SEEK.some(w => t.includes(w))) return 'offer';
  // الطلب يغلب العرض عند اجتماعهما: «عندي مشكل وبغيت سبّاك» طلبٌ لا عرض.
  const seek  = SEEK_MARKS.some(w => t.includes(w));
  if (seek) return 'seek';
  if (QUESTION.some(w => t.includes(w))) return 'seek';
  if (OFFER_MARKS.some(w => t.includes(w))) return 'offer';
  return 'unknown';
}

// اتّجاهُ نصٍّ بذاته (بلا فهمٍ كامل) — يحتاجه المساعد ليختار أيّ أسئلةٍ يعرض:
// «أنا حدّاد» يُسأل سؤالَ العارض، و«بغيت حدّاد» يُسأل سؤالَ الطالب.
export function stanceOf(input: string, conceptId?: string): Stance {
  const t = deArabizi(input).toLowerCase().trim();
  return detectStance(t, conceptId ? ALL_CONCEPTS.find(x => x.id === conceptId) : undefined);
}

const has = (t: string, arr: string[]) => arr.some(w => t.includes(w));

// الجسر إلى المحرّكات — يفهم النصّ عبر السجلّات (المشكلة أوّلًا).
export function understand(input: string): Understanding {
  // 0) طبقة اللاتينيّة — «bghit 3andi mouchkil» → «بغيت عندي مشكل» قبل أيّ قراءة.
  const text = deArabizi(input);
  const t = text.toLowerCase().trim();
  const reasoning: string[] = [];
  if (text !== input) reasoning.push('🔤 حوّلنا الكتابة اللاتينيّة إلى دارجة');
  const concepts = conceptsIn(text);

  // 1) Symptom Graph — من العرَض إلى المشكلة.
  let problem: Problem | undefined;
  let problemConf = 0;
  const sym = findProblemBySymptom(text);
  if (sym) {
    problem = getProblem(sym.problemId);
    problemConf = sym.confidence;
    if (problem) reasoning.push(`🔍 عرَض → مشكلة «${problem.name}» (ثقة ${problemConf})`);
  }

  // 2) المهنة: من حلّ المشكلة أوّلًا، وإلّا من مفهوم مهنة مذكور.
  let profession: Profession | undefined;
  let capabilities: string[] = [];
  let profConf = 0;
  if (problem?.solutions?.length) {
    const sol = problem.solutions[0];
    profession = getProfession(sol.profession);
    capabilities = sol.capabilities ?? [];
    profConf = +(problemConf * 0.95).toFixed(2);
    if (profession) reasoning.push(`👤 المهنة الحالّة «${profession.label}» (ثقة ${profConf})`);
  }
  if (!profession) {
    const pc = concepts.find(c => c.kind === 'profession');
    if (pc) { profession = findProfessionByLabel(pc.concept); if (profession) { profConf = 0.7; reasoning.push(`👤 المهنة من المفردات «${profession.label}»`); } }
  }

  // 2.5) المعرفة المعتمَدة بشريًّا (Applied Memory) — إغلاق حلقة التعلّم.
  //   عبارة اعتمدها الإنسان في مركز التعلّم ⇒ تُطبَّق الآن (لا تعديل ذاتيّ).
  let learned: { phrase: string; concept: string } | undefined;
  const mem = matchApprovedMemory(text);
  if (mem) {
    learned = { phrase: mem.phrase, concept: mem.concept };
    if (!profession && mem.profession) { profession = mem.profession; profConf = Math.max(profConf, 0.9); }
    if (!problem && mem.problem) { problem = mem.problem; problemConf = Math.max(problemConf, 0.9); }
    reasoning.push(`🧠 معرفة معتمَدة: «${mem.phrase}» ⇒ ${profession?.label || problem?.name || mem.concept}`);
  }

  // 2.7) القاموس المتعدّد اللغات (دارجة/عربيّة/فرنسيّة/إنجليزيّة/Arabizi) — إشارةٌ
  //      إضافيّة تملأ الفجوات فقط (لا تُلغي ما فوقها). تربط «je cherche un mécanicien»
  //      و«bghit mecanicien» و«ميكانيكي» بمفهومٍ قانونيّ واحد.
  let category: string | undefined;
  let service: string | undefined;
  let language: string | undefined;
  const kc = resolveConcept(input);   // النصّ الأصليّ (لا المُعرَّب) — ليقرأ الفرنسيّة/الإنجليزيّة
  if (kc) {
    category = kc.category || undefined;
    service = kc.id;
    language = kc.language;
    reasoning.push(`🗂️ مفهوم «${kc.concept.ar || kc.id}» (${kc.category || 'عامّ'}) · لغة: ${kc.language}`);
    if (!profession) {
      const p = findProfessionByLabel(kc.concept.ar || '') || findProfessionByLabel(kc.concept.darija || '');
      if (p) { profession = p; profConf = Math.max(profConf, 0.6); reasoning.push(`👤 المهنة من القاموس «${p.label}»`); }
    }
  }

  // 3) الموقع — قاعدة المدن أوّلًا (أعمق: أسماء بديلة + أحياء)، ثمّ المطابقة القديمة.
  let city = cityInText(text);
  let district: string | undefined;
  const gc = resolveCity(input);
  if (gc) { city = city || gc.city; district = gc.district; }
  if (city) reasoning.push(`📍 الموقع «${city}»${district ? ` · ${district}` : ''}`);

  // 4) السياق (طارئ/ليل/عطلة).
  const context = {
    urgent: has(t, ['دابا', 'الآن', 'عاجل', 'طوارئ', 'بزربة']) || problem?.emergency === true,
    night: has(t, ['الليل', 'ليلا', 'ف الليل']),
    weekend: has(t, ['الجمعة', 'السبت', 'الأحد', 'ويكاند']),
  };
  if (context.urgent) reasoning.push('⏰ سياق: طارئ');

  // 5) الثقة الكلّيّة.
  let confidence = 0.2;
  if (problem && profession) confidence = Math.max(Math.min(problemConf, profConf), 0.3);
  else if (profession) confidence = 0.45;
  else if (concepts.length) confidence = 0.35;
  // مفهومٌ قانونيٌّ من القاموس المتعدّد اللغات يرفع الثقة (فهمنا الخدمة/الفئة).
  if (service) confidence = Math.max(confidence, profession ? 0.6 : 0.5);
  // معرفة معتمَدة بشريًّا ترفع الثقة (الإنسان أكّدها).
  if (learned && profession) confidence = Math.max(confidence, 0.85);
  else if (learned) confidence = Math.max(confidence, 0.6);

  // 6) الاتّجاه — يُحسَب على النصّ المطبَّع مع عبارات المفهوم المحلول إن وُجد.
  const stanceConcept = service ? ALL_CONCEPTS.find(x => x.id === service) : undefined;
  const stance = detectStance(t, stanceConcept);
  if (stance !== 'unknown') reasoning.push(stance === 'offer' ? '🧭 اتّجاه: يَعرض' : '🧭 اتّجاه: يطلب');

  // الغموضُ يُفحَص أخيرًا وعلى النصّ الأصليّ: لو حُسم بقرينةٍ فلا شيءَ يُضاف،
  // ولو بقي غامضًا فالجوابُ الصحيح **سؤال** لا نتيجة. لا نُلغي ما فُهم — نُرفقه.
  const ambiguity = detectAmbiguity(text) || undefined;
  if (ambiguity) reasoning.push(`❓ «${ambiguity.term}» تحتمل معنيَين — نسأل بدل أن نُخمّن`);

  // الوقائع: جملةٌ بلا مهنةٍ ليست بالضرورة جملةً بلا معنى. «بشحال التوصيل»
  // سؤالٌ كاملُ الوضوح عن واقعة — كان يرجع فارغًا لأنّنا نبحث عن نوعٍ فقط.
  const factList = detectFacts(text);
  const facts = factList.length ? factList : undefined;
  if (facts) {
    reasoning.push(`📋 وقائع: ${facts.map(f => FACT_LABEL[f]).join(' · ')}`);
    // فهمُ الواقعةِ فهمٌ حقيقيّ، ولو لم نُصِب مفهومًا — فلا نتركها بثقة البداية.
    confidence = Math.max(confidence, 0.4);
  }
  return { problem, profession, capabilities, concepts, city, district, category, service, language, context, confidence, reasoning, learned, stance, ambiguity, facts };
}

export function resolveTerm(term: string) { return normalize(term); }
