// ============================================================
// محرّكُ الأفعال — «شنو بغيتي **ندير**؟» لا «شنو بغيتي **تشري**؟»
//
//   سؤالُ المالك حرفيًّا: كيف يعرف التطبيقُ أنّ «بغيت نبدل رقم الهاتف» إعدادٌ،
//   و«بغيت نبدل الثمن» منتوج، و«بغيت نزيد محل» نشاطٌ جديد — وكلُّها تبدأ
//   بـ«بغيت»؟
//
//   والجوابُ ليس ذكاءً جديدًا، بل **فصلُ ما كان مختلطًا**. الجملةُ الواحدة
//   تحمل ثلاثةَ أشياءَ لا شيئًا واحدًا:
//
//       بغيت نبدل    رقم الهاتف    ديالي
//         ↑             ↑            ↑
//        فعل          هدف         نطاق
//
//   فإن فُصلت صارت مصفوفةً صغيرةً مقروءة، وإن بقيت مختلطةً احتجتَ قاعدةً
//   لكلّ جملةٍ ممكنةٍ في الدنيا.
//
//   ── لماذا هنا لا في `facts.ts` ──
//   `facts.ts` يقرأ ما يسأل عنه **الزبون** عن بضاعةٍ معروضة (الثمن، المقاس،
//   التوصيل). وهذا يقرأ ما يريد **صاحبُ الحساب** أن يفعله بتطبيقه. نفسُ
//   النمط، ومجالان لا يصحّ خلطُهما: «شحال الثمن؟» سؤالُ زبون، و«بدّل الثمن»
//   أمرُ تاجر.
//
//   ── وما لا يفعله هذا الملفّ ──
//   لا يُنفّذ شيئًا. يقرأ فقط، ويقول **ما ينقص** ليُنفَّذ. فمن يقول «بدّل
//   الثمن» لم يقل ثمنَ أيّ منتج — والجوابُ الصحيح سؤالٌ واحد لا تخمين،
//   وهي نفسُ قاعدة `ambiguity.ts`: **اسأل، ولا تُخمّن**.
// ============================================================

import { deArabizi } from './arabizi';
import { normLoose } from '../../normalize';

/** ما يريد فعلَه. */
export type ActionVerb = 'view' | 'create' | 'update' | 'delete' | 'share' | 'send';

/** بماذا. */
export type ActionObject =
  | 'phone' | 'language' | 'password' | 'account'      // إعداداتُ الشخص
  | 'workspace' | 'shop_name' | 'shop_hours' | 'delivery' | 'settings'  // إعداداتُ النشاط
  | 'product' | 'price' | 'stock' | 'photo'            // الكتالوج
  | 'orders' | 'customers' | 'coupon' | 'wallet';      // العمل

/** لمن يعود الهدف: الشخصُ أم نشاطُه؟ */
export type ActionScope = 'user' | 'workspace';

export interface ActionRead {
  verb: ActionVerb;
  object: ActionObject;
  scope: ActionScope;
  /** ما ينقص ليُنفَّذ — تُطرَح سؤالًا واحدًا، لا استمارة. */
  needs: string[];
  confidence: number;
  /** لماذا قُرئت هكذا — «كلُّ شيءٍ قابل للشرح». */
  reason: string;
}

const norm = normLoose;   // كان نسخةً محلّيّةً أضعف

// ── الأفعال ───────────────────────────────────────────────────
// «بغيت» وحدَها ليست فعلًا إداريًّا: «بغيت نبيع» تجارةٌ لا إعداد. فلا تدخل
// هنا — يلتقطها `humanIntent` بعدَنا. الفعلُ هنا **صريحٌ في التصرّف**.
const VERBS: { verb: ActionVerb; terms: string[] }[] = [
  { verb: 'delete', terms: ['حيد', 'حيّد', 'نحيد', 'حذف', 'نحذف', 'امسح', 'نمسح', 'الغي', 'نلغي', 'سد', 'نسد', 'supprimer'] },
  { verb: 'update', terms: ['بدل', 'بدّل', 'نبدل', 'غير', 'غيّر', 'نغير', 'صحح', 'نصحح', 'عدل', 'نعدل', 'حدث', 'نحدث', 'modifier', 'changer'] },
  { verb: 'create', terms: ['زيد', 'نزيد', 'ضيف', 'نضيف', 'اضف', 'صايب', 'نصايب', 'دير ليا', 'ندير واحد', 'جديد', 'ajouter', 'creer'] },
  { verb: 'share',  terms: ['شارك', 'نشارك', 'صيفط الرابط', 'رابط المحل', 'partager'] },
  { verb: 'send',   terms: ['صيفط', 'نصيفط', 'ارسل', 'نرسل', 'envoyer'] },
  { verb: 'view',   terms: ['وريني', 'ورينا', 'شوف', 'نشوف', 'بين ليا', 'عرض', 'اعرض', 'فين كاين', 'افتح', 'نفتح', 'voir', 'afficher'] },
];

// ── الأهداف ───────────────────────────────────────────────────
// الترتيبُ من الأخصّ إلى الأعمّ — **جزءٌ من المعنى**: «رقم الهاتف» هدفٌ
// مستقلّ، ولو سبقته «الإعدادات» العامّةُ لابتلعته.
const OBJECTS: { object: ActionObject; scope: ActionScope; terms: string[]; needs?: string[] }[] = [
  // إعداداتُ الشخص
  { object: 'phone',    scope: 'user', terms: ['رقم الهاتف', 'رقم التيليفون', 'النمرة', 'رقمي', 'الهاتف ديالي', 'numero'] },
  { object: 'password', scope: 'user', terms: ['كلمة السر', 'كلمه السر', 'الباسوورد', 'mot de passe', 'password'] },
  { object: 'language', scope: 'user', terms: ['اللغه', 'اللغة', 'لغه التطبيق', 'بالعربيه', 'بالفرنسيه', 'langue'] },
  { object: 'account',  scope: 'user', terms: ['الحساب ديالي', 'حسابي', 'الكونط ديالي', 'mon compte'] },

  // النشاط
  { object: 'workspace',  scope: 'workspace', terms: ['محل', 'المحل', 'متجر', 'المتجر', 'حانوت', 'الحانوت', 'نشاط', 'boutique', 'magasin'] },
  { object: 'shop_name',  scope: 'workspace', terms: ['اسم المحل', 'سميه المحل', 'اسم المتجر'] },
  { object: 'shop_hours', scope: 'workspace', terms: ['وقت الخدمه', 'ساعات العمل', 'وقتاش كنحل', 'التوقيت'] },
  { object: 'delivery',   scope: 'workspace', terms: ['التوصيل', 'شركه التوصيل', 'ثمن التوصيل', 'livraison'] },

  // الكتالوج — الثمنُ والمخزونُ يحتاجان **نسخة**، فيُعلَن نقصُها صراحةً.
  { object: 'price',   scope: 'workspace', terms: ['الثمن', 'التمن', 'السوم', 'الاثمنه', 'prix'], needs: ['أيّ منتج؟'] },
  { object: 'stock',   scope: 'workspace', terms: ['المخزون', 'الستوك', 'الكميه', 'stock'], needs: ['أيّ منتج؟'] },
  { object: 'photo',   scope: 'workspace', terms: ['الصوره', 'التصويره', 'الصور', 'photo', 'image'], needs: ['أيّ منتج؟'] },
  { object: 'product', scope: 'workspace', terms: ['منتوج', 'المنتوج', 'المنتج', 'سلعه', 'produit'] },

  // العمل
  { object: 'orders',    scope: 'workspace', terms: ['الطلبات', 'الطلبيات', 'كوموند', 'commandes'] },
  { object: 'customers', scope: 'workspace', terms: ['الزبناء', 'الزباين', 'العملاء', 'clients'] },
  { object: 'coupon',    scope: 'workspace', terms: ['كوبون', 'الكوبونات', 'تخفيض', 'خصم', 'promo'] },
  { object: 'wallet',    scope: 'workspace', terms: ['المحفظه', 'الرصيد', 'الفلوس ديالي', 'portefeuille'] },

  // الأعمُّ أخيرًا: تُصيب حين لا يُصيب هدفٌ أخصّ.
  { object: 'settings',  scope: 'user', terms: ['الاعدادات', 'الاعداد', 'parametres', 'reglages'] },
];

const hits = (t: string, terms: string[]) => terms.find(w => t.includes(norm(w)));

/**
 * يقرأ فعلًا إداريًّا من جملة، أو `null` إن لم تكن كذلك.
 *
 *   `null` هي الجوابُ الصحيح لأغلب الجمل: «بغيت نبيع قميص» تجارةٌ لا إعداد،
 *   وتُترَك لمن بعدَنا. محرّكٌ يدّعي فهمَ كلّ شيءٍ يفسد أكثرَ ممّا يُصلح.
 */
export function readAction(raw: string): ActionRead | null {
  const t = norm(deArabizi(raw || ''));
  if (!t) return null;

  const v = VERBS.find(x => hits(t, x.terms));
  if (!v) return null;
  const vTerm = hits(t, v.terms)!;

  const o = OBJECTS.find(x => hits(t, x.terms));
  if (!o) {
    // فعلٌ بلا هدفٍ معروف. وهنا يفترق صنفان:
    //
    //   «بدّل» وحدَها ⇒ أمرُ إعدادٍ نقص هدفُه ⇒ نسأل «شنو بغيتي تبدّل؟».
    //   «وريني» وحدَها ⇒ **ليست أمرَ إعدادٍ أصلًا**. «وريني كساوي اللي عندك»
    //   جملةُ زبونةٍ تطلب بضاعة — قِيست من زيارةٍ ميدانيّة. ولو ادّعيناها
    //   إعدادًا لفتحنا للزبونة شاشةَ إعداداتٍ بدل أن نُريها الكساوي.
    //
    // فالأفعالُ العامّةُ في الكلام (عرضٌ وإرسالٌ ومشاركة) تصمت بلا هدف،
    // والأفعالُ التصرّفيّةُ (تعديلٌ وحذفٌ وإنشاء) تسأل.
    const ACTS_ON_DATA: ActionVerb[] = ['update', 'delete', 'create'];
    if (!ACTS_ON_DATA.includes(v.verb)) return null;
    return {
      verb: v.verb, object: 'settings', scope: 'user',
      needs: [`شنو بغيتي ${v.verb === 'delete' ? 'تحيّد' : v.verb === 'create' ? 'تزيد' : 'تبدّل'}؟`],
      confidence: 0.35,
      reason: `فعلٌ «${vTerm}» بلا هدفٍ واضح`,
    };
  }
  const oTerm = hits(t, o.terms)!;

  // الحذفُ يحتاج تأكيدًا دائمًا — لا يُنفَّذ من جملةٍ واحدة مهما وضحت.
  const needs = [...(o.needs || [])];
  if (v.verb === 'delete') needs.push('تأكيد: هذا لا يُسترجَع');

  return {
    verb: v.verb, object: o.object, scope: o.scope, needs,
    confidence: needs.length ? 0.7 : 0.85,
    reason: `«${vTerm}» + «${oTerm}»`,
  };
}

/** نصٌّ دارجيٌّ لما سيحدث — تعرضه الواجهةُ قبل التنفيذ ليؤكّد الإنسان. */
export function describeAction(a: ActionRead): string {
  const V: Record<ActionVerb, string> = {
    view: 'نوريك', create: 'نزيد', update: 'نبدّل',
    delete: 'نحيّد', share: 'نشارك', send: 'نصيفط',
  };
  const O: Record<ActionObject, string> = {
    phone: 'رقم الهاتف', language: 'اللغة', password: 'كلمة السرّ', account: 'الحساب',
    workspace: 'المحلّ', shop_name: 'اسم المحلّ', shop_hours: 'وقت الخدمة',
    delivery: 'التوصيل', settings: 'الإعدادات',
    product: 'المنتوج', price: 'الثمن', stock: 'المخزون', photo: 'الصورة',
    orders: 'الطلبات', customers: 'الزبناء', coupon: 'الكوبون', wallet: 'المحفظة',
  };
  return `${V[a.verb]} ${O[a.object]}`;
}
