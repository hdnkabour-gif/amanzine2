// ============================================================
// كتالوجُ القدرات — **ما يستطيع AMANZINE أن يفعله**. قائمةٌ واحدةٌ مغلقة.
//
//   ── لماذا وُلد هذا الملفّ ──
//   قياسٌ على المشروع كشف أنّ لا أحدَ يملك هذه القائمة. فاخترع كلُّ محرّكٍ
//   قائمتَه: `HumanIntent`(٧) · `Intent`(١٠) · `Stance`(٣) ·
//   `ActionVerb×ActionObject`(٦×١٧) — أربعُ لغاتٍ لا تتطابق. واخترع كلُّ
//   حَكَمٍ عتبتَه: على جملةٍ واحدةٍ قال `clarify` «نفّذ» و`decideInterface`
//   «أكّد» و`decideExecution` «اسأل».
//
//   ونتيجتُه الأخطر: **سبعُ قدراتٍ تعمل على الخادم بلا بابٍ في التطبيق**،
//   وطبقةُ تنفيذٍ كاملةٌ بُنيت ولم تُوصَل — لأنّ لا شيءَ كان يُلزم بوصلها.
//
//   ── القاعدة ──
//   **الفهمُ يُقاس بما يستطيع التطبيقُ فعلَه، لا بما تحمله اللغة.**
//   ففهمُ جملةٍ لا نملك لها فعلًا وعدٌ لا يُوفى. ولذلك لا تبدأ القراءةُ من
//   اللغة بل من هذه القائمة، وتُقرأ الجملةُ **عليها**.
//
//   ── ما هذا الملفّ وما ليس ──
//   ليس مفرداتٍ ولا كلماتٍ مفتاحيّة. هو **عقدٌ**: لكلّ قدرةٍ فعلُها وكيانُها
//   وما تحتاجه وخطورتُها وأين تعيش. اللغةُ وسيلةٌ للوصول إليه، لا هدفٌ
//   بذاته — فتُضاف اللغةُ في `akg/kb/` وتبقى هذه القائمةُ ثابتة.
//
//   ── وحدُّه ──
//   المحتوى مكتوبٌ بيد (وهو معرفةٌ لا تُشتقّ)، لكنّ **اكتمالَه مقيسٌ آليًّا**:
//   يكسر `test/abilities.test.mjs` البناءَ حين يوجد مسارُ خادمٍ أو صفحةٌ
//   خارجَ هذه القائمة. فلا تكذب القائمةُ في اليوم الذي يُضاف فيه مسار.
// ============================================================

import { PAGE_IDS, type Page } from '../types';

/** الفعلُ — ما نوعُ العملية. مغلقٌ عمدًا: كلُّ زيادةٍ قرارٌ لا تفصيل. */
export type AbilityVerb =
  | 'offer'     // يَعرض (بيع · تقديمُ خدمة · نشرُ إعلان)
  | 'seek'      // يطلب (شراء · طلبُ خدمة · بحث)
  | 'create'    // يُنشئ كيانًا
  | 'update'    // يعدّل كيانًا
  | 'delete'    // يحذف كيانًا
  | 'view'      // يعرض/يستفسر
  | 'send'      // يرسل خارج نفسه (رسالة · شحنة · دفع)
  | 'book';     // يحجز وقتًا

/** الكيان — على ماذا يقع الفعل. */
export type AbilityEntity =
  | 'product' | 'service' | 'listing' | 'workspace' | 'order' | 'shipment'
  | 'customer' | 'booking' | 'coupon' | 'wallet' | 'payment' | 'message'
  | 'account' | 'phone' | 'address' | 'language' | 'settings' | 'delivery_provider'
  | 'media' | 'knowledge' | 'report' | 'need' | 'provider';

/**
 * الخطورة — **بديلُ العتبة الواحدة**.
 *
 *   كانت عتبةُ التنفيذ ٠٫٩٠ لكلّ شيء، وأعلى ثقةٍ بلغتها جملُ المالك ٠٫٦٠.
 *   أي «لا تنفّذ أبدًا»: ٣٢ من ٣٦ جملةً تُقابَل بسؤال. والحلُّ ليس خفضَ
 *   العتبة (فيُحذَف متجرٌ بثقةٍ ضعيفة) بل **تصنيفَ القرار**:
 *
 *     low    عرضٌ وبحثٌ وتصفّح — لا يُخسَر شيءٌ لو أخطأنا، فيُنفَّذ بثقةٍ أقلّ
 *     medium إنشاءٌ وتعديلٌ يُسترجَع — يُنفَّذ بثقةٍ متوسّطة
 *     high   لا يُسترجَع أو يخرج للناس أو يمسّ مالًا — **يُؤكَّد دائمًا**
 */
export type AbilityRisk = 'low' | 'medium' | 'high';

export interface Ability {
  /** مُعرِّفٌ ثابت — يُذكَر في الأثر والاختبارات، فلا يُغيَّر بعد استعماله. */
  id: string;
  verb: AbilityVerb;
  entity: AbilityEntity;
  /** ما يُقال للإنسان بالدارجة — لا مصطلحاتٍ تقنيّة (القانون ١٠). */
  say: string;
  risk: AbilityRisk;
  /** ما يجب معرفتُه قبل التنفيذ. فارغةٌ = تُنفَّذ فورًا. */
  needs: string[];
  /** هل تحتاج حسابًا؟ الزائرُ يتصفّح ويطلب، ولا ينشر ولا يعدّل. */
  auth: boolean;
  /** الصفحةُ التي تعيش فيها. `null` = قدرةٌ بلا باب (عيبٌ يُسدّ). */
  page: Page | null;
  /** جذرُ مسار الخادم. `null` = تعمل في المتصفّح وحدَه. */
  api: string | null;
}

// ── القائمة ───────────────────────────────────────────────────
// مرتّبةٌ بما يفعله الإنسانُ لا بما يفعله الكود: يَعرض · يطلب · يدير نشاطَه
// · يدير طلباتِه · يدير نفسَه · يكتشف.
export const ABILITIES: Ability[] = [
  // ① يَعرض ───────────────────────────────────────────────────
  { id: 'SELL_PRODUCT', verb: 'offer', entity: 'product', say: 'تبيع منتوج',
    risk: 'medium', needs: ['شنو باغي تبيع؟', 'بشحال؟'], auth: true, page: 'publish', api: '/api/products' },
  { id: 'OFFER_SERVICE', verb: 'offer', entity: 'service', say: 'تقدّم خدمة',
    risk: 'medium', needs: ['شنو الخدمة اللي كتقدّم؟'], auth: true, page: 'publish', api: '/api/providers' },
  { id: 'PUBLISH_LISTING', verb: 'offer', entity: 'listing', say: 'تنشر إعلان',
    risk: 'medium', needs: ['شنو باغي تنشر؟'], auth: true, page: 'publish', api: '/api/listings' },

  // ② يطلب ────────────────────────────────────────────────────
  { id: 'BUY_PRODUCT', verb: 'seek', entity: 'product', say: 'تشري شي حاجة',
    risk: 'low', needs: ['شنو باغي تشري؟'], auth: false, page: 'home', api: '/api/search' },
  { id: 'FIND_PROVIDER', verb: 'seek', entity: 'provider', say: 'تقلّب على حرفي ولا مختصّ',
    risk: 'low', needs: ['شنو المشكل ولا الخدمة؟'], auth: false, page: 'home', api: '/api/business' },
  { id: 'POST_NEED', verb: 'seek', entity: 'need', say: 'تكتب اللي محتاج ونقلّبو ليك',
    risk: 'low', needs: ['شنو محتاج؟'], auth: false, page: 'home', api: '/api/needs' },
  { id: 'BOOK_APPOINTMENT', verb: 'book', entity: 'booking', say: 'تاخد موعد',
    risk: 'medium', needs: ['مع من؟', 'إمتا؟'], auth: true, page: 'bookings', api: '/api/bookings' },

  // ③ نشاطُه ──────────────────────────────────────────────────
  { id: 'CREATE_WORKSPACE', verb: 'create', entity: 'workspace', say: 'تصايب المحلّ ديالك',
    risk: 'medium', needs: ['شنو نوع النشاط؟'], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'UPDATE_WORKSPACE', verb: 'update', entity: 'workspace', say: 'تبدّل معلومات المحلّ',
    risk: 'medium', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'DELETE_WORKSPACE', verb: 'delete', entity: 'workspace', say: 'تحيّد المحلّ ديالك',
    // كشفه النبضُ حين قِيست جودةُ القرار: «بغيت نحيد هاد المحل» كانت تُطابق
    // `FIND_PROVIDER` — قدرةً **منخفضةَ الخطر** — لأنّ الكتالوج لا يحوي
    // حذفَ محلٍّ أصلًا، بينما `DELETE /api/providers/:id` يعمل على الخادم.
    // ونجت من التنفيذ بحارسٍ آخر لا بخطورتها، وهو نجاةٌ بالصدفة.
    risk: 'high', needs: ['أيّ محلّ؟'], auth: true, page: 'settings', api: '/api/providers' },
  { id: 'CREATE_PRODUCT', verb: 'create', entity: 'product', say: 'تزيد منتوج',
    risk: 'medium', needs: ['شنو المنتوج؟', 'بشحال؟'], auth: true, page: 'products', api: '/api/products' },
  { id: 'UPDATE_PRODUCT', verb: 'update', entity: 'product', say: 'تبدّل منتوج (الثمن، الستوك، التصويرة)',
    risk: 'medium', needs: ['أيّ منتوج؟'], auth: true, page: 'products', api: '/api/products' },
  { id: 'DELETE_PRODUCT', verb: 'delete', entity: 'product', say: 'تحيّد منتوج',
    risk: 'high', needs: ['أيّ منتوج؟'], auth: true, page: 'products', api: '/api/products' },
  { id: 'MANAGE_COUPON', verb: 'create', entity: 'coupon', say: 'تصايب تخفيض ولا كوبون',
    risk: 'medium', needs: [], auth: true, page: 'coupons', api: '/api/coupons' },
  { id: 'MANAGE_LOYALTY', verb: 'update', entity: 'customer', say: 'تسيّر نقط الوفاء ديال الزبناء',
    risk: 'medium', needs: [], auth: true, page: null, api: '/api/loyalty' },
  { id: 'BROADCAST_MESSAGE', verb: 'send', entity: 'message', say: 'تصيفط رسالة لكل الزبناء',
    // تخرج للناس ولا تُسترجَع — وإن كانت الرسالةُ نصًّا، فالإرسالُ حدثٌ نهائيّ.
    risk: 'high', needs: ['شنو الرسالة؟', 'لمن؟'], auth: true, page: null, api: '/api/broadcast' },
  { id: 'MANAGE_MEDIA', verb: 'create', entity: 'media', say: 'تزيد تصاور',
    risk: 'low', needs: [], auth: true, page: 'editor', api: '/api/media' },
  { id: 'DESIGN_BANNER', verb: 'create', entity: 'media', say: 'تصايب بانير ولا إعلان',
    risk: 'low', needs: [], auth: true, page: 'banner', api: null },
  { id: 'IMPORT_DATA', verb: 'create', entity: 'product', say: 'تجيب المنتوجات من محادثة ولا ملفّ',
    risk: 'medium', needs: [], auth: true, page: 'import', api: '/api/products' },

  // ④ طلباتُه ─────────────────────────────────────────────────
  { id: 'VIEW_ORDERS', verb: 'view', entity: 'order', say: 'تشوف الطلبات',
    risk: 'low', needs: [], auth: true, page: 'orders', api: '/api/orders' },
  { id: 'UPDATE_ORDER', verb: 'update', entity: 'order', say: 'تبدّل حالة ولا عنوان الطلب',
    risk: 'medium', needs: ['أيّ طلب؟'], auth: true, page: 'orders', api: '/api/orders' },
  { id: 'TRACK_ORDER', verb: 'view', entity: 'shipment', say: 'تشوف فين وصل الطلب',
    risk: 'low', needs: ['أيّ طلب؟'], auth: false, page: null, api: '/api/track' },
  { id: 'CREATE_SHIPMENT', verb: 'send', entity: 'shipment', say: 'تصيفط الطلب مع شركة التوصيل',
    // شحنةٌ تُنشأ عند طرفٍ خارجيّ ويُطلَب مالٌ من الزبون — لا تُسترجَع.
    risk: 'high', needs: ['أيّ طلب؟', 'أيّ شركة؟'], auth: true, page: 'delivery', api: '/api/delivery' },
  { id: 'CREATE_SHIPMENT_AUTO', verb: 'send', entity: 'shipment', say: 'تصيفط الطلب لشركة ما عندهاش API',
    // نفسُ خطورة الشحن، بآليّةٍ أهشّ: أتمتةُ متصفّحٍ على موقع الشركة. يكفي
    // أن يتغيّر زرٌّ عندهم ليصير الفعلُ صامتًا — فالتأكيدُ هنا آكد.
    risk: 'high', needs: ['أيّ طلب؟'], auth: true, page: 'delivery', api: '/api/delivery-auto' },
  { id: 'CONNECT_DELIVERY', verb: 'create', entity: 'delivery_provider', say: 'تربط شركة التوصيل ديالك',
    risk: 'high', needs: ['أيّ شركة؟', 'التوكن ديالها'], auth: true, page: 'connections', api: '/api/delivery' },
  { id: 'VIEW_CUSTOMERS', verb: 'view', entity: 'customer', say: 'تشوف الزبناء ديالك',
    risk: 'low', needs: [], auth: true, page: 'customers', api: '/api/customers' },
  { id: 'CHAT_CUSTOMER', verb: 'send', entity: 'message', say: 'تهضر مع زبون',
    risk: 'medium', needs: ['مع من؟'], auth: true, page: 'conversations', api: '/api/conversations' },

  // ⑤ مالُه ──────────────────────────────────────────────────
  { id: 'VIEW_WALLET', verb: 'view', entity: 'wallet', say: 'تشوف الرصيد ديالك',
    risk: 'low', needs: [], auth: true, page: 'wallet', api: '/api/wallet' },
  { id: 'MAKE_PAYMENT', verb: 'send', entity: 'payment', say: 'تخلّص',
    risk: 'high', needs: ['شحال؟', 'بأشنو؟'], auth: true, page: 'wallet', api: '/api/payment' },

  // ⑥ نفسُه ──────────────────────────────────────────────────
  { id: 'SIGN_IN', verb: 'create', entity: 'account', say: 'تدخل ولا تصايب حساب',
    risk: 'medium', needs: ['النمرة ديالك'], auth: false, page: 'profile', api: '/api/auth' },
  { id: 'CHANGE_PHONE', verb: 'update', entity: 'phone', say: 'تبدّل النمرة ديالك',
    // النمرةُ هي الهويّةُ والدخول — خطؤها يقفل الحسابَ على صاحبه.
    risk: 'high', needs: ['النمرة الجديدة'], auth: true, page: 'profile', api: '/api/auth' },
  { id: 'CHANGE_ADDRESS', verb: 'update', entity: 'address', say: 'تبدّل العنوان',
    risk: 'medium', needs: ['العنوان الجديد'], auth: true, page: 'profile', api: '/api/settings' },
  { id: 'CHANGE_LANGUAGE', verb: 'update', entity: 'language', say: 'تبدّل اللغة',
    risk: 'low', needs: [], auth: false, page: 'settings', api: null },
  { id: 'UPDATE_SETTINGS', verb: 'update', entity: 'settings', say: 'تبدّل الإعدادات',
    risk: 'medium', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'MANAGE_NOTIFICATIONS', verb: 'update', entity: 'settings', say: 'تسيّر التنبيهات',
    risk: 'low', needs: [], auth: true, page: 'notifications', api: '/api/push' },
  { id: 'SYNC_MEMORY', verb: 'update', entity: 'settings', say: 'الذاكرة ديالك تبقى معاك ف كل جهاز',
    risk: 'low', needs: [], auth: true, page: null, api: '/api/memory' },

  // ⑦ يكتشف ويتعلّم ──────────────────────────────────────────
  { id: 'EXPLORE_FEED', verb: 'view', entity: 'listing', say: 'تشوف اللي جديد قربك',
    risk: 'low', needs: [], auth: false, page: 'home', api: '/api/feed' },
  { id: 'DISCOVER_NEARBY', verb: 'view', entity: 'provider', say: 'تكتشف اللي كاين ف المدينة ديالك',
    risk: 'low', needs: [], auth: false, page: 'home', api: '/api/discover' },
  { id: 'GET_RECOMMENDATION', verb: 'view', entity: 'listing', say: 'نقترح عليك اللي يناسبك',
    risk: 'low', needs: [], auth: false, page: 'home', api: '/api/recommend' },
  { id: 'ASK_ASSISTANT', verb: 'view', entity: 'knowledge', say: 'تسوّل ونجاوبك',
    risk: 'low', needs: ['شنو السؤال؟'], auth: false, page: 'assistant', api: '/api/ai' },
  { id: 'VIEW_ANALYTICS', verb: 'view', entity: 'report', say: 'تشوف شحال بعتي وشنو كيمشي',
    risk: 'low', needs: [], auth: true, page: 'analytics', api: '/api/analytics' },
  { id: 'VIEW_INSIGHTS', verb: 'view', entity: 'report', say: 'تشوف النصائح ديال النشاط ديالك',
    risk: 'low', needs: [], auth: true, page: 'insights', api: '/api/insights' },
  { id: 'VIEW_DASHBOARD', verb: 'view', entity: 'report', say: 'تشوف كلشي ف صفحة وحدة',
    risk: 'low', needs: [], auth: true, page: 'dashboard', api: null },
  { id: 'READ_GUIDE', verb: 'view', entity: 'knowledge', say: 'تقرا كيفاش تستعمل التطبيق',
    risk: 'low', needs: [], auth: false, page: 'guide', api: null },
  { id: 'MANAGE_SERVICES', verb: 'update', entity: 'service', say: 'تسيّر الخدمات ديالك',
    risk: 'medium', needs: [], auth: true, page: 'services', api: '/api/providers' },

  // ⑧ الأدمن ─────────────────────────────────────────────────
  { id: 'MODERATE_CONTENT', verb: 'update', entity: 'listing', say: 'تراجع وتقبل الإعلانات',
    risk: 'high', needs: [], auth: true, page: 'moderation', api: '/api/listings' },
  { id: 'EDIT_KNOWLEDGE', verb: 'update', entity: 'knowledge', say: 'تزيد وتصحّح المعرفة',
    // القانون ٣: لا معرفةَ تدخل بلا اعتمادِ إنسان — والاعتمادُ نفسُه خطِر.
    risk: 'high', needs: [], auth: true, page: 'knowledge', api: '/api/knowledge' },
  { id: 'FIELD_VISIT', verb: 'create', entity: 'provider', say: 'تسجّل زيارة ميدانية',
    risk: 'medium', needs: [], auth: true, page: 'field-visit', api: '/api/providers' },
];

// ── الوصولُ إلى القائمة ───────────────────────────────────────
const BY_ID = new Map(ABILITIES.map(a => [a.id, a]));
export function ability(id: string): Ability | undefined { return BY_ID.get(id); }

/** كلُّ ما يمكن فعلُه بهذا الكيان — أساسُ سؤال «تعديلَ ماذا؟». */
export function abilitiesFor(entity: AbilityEntity): Ability[] {
  return ABILITIES.filter(a => a.entity === entity);
}

/** كلُّ ما يمكن فعلُه بهذا الفعل — أساسُ الاقتراحات الحيّة بعد «بغيت…». */
export function abilitiesByVerb(verb: AbilityVerb): Ability[] {
  return ABILITIES.filter(a => a.verb === verb);
}

/**
 * **حدُّ القدرة**: هل يملك التطبيقُ فعلًا لهذه النيّة؟
 *
 *   هذه هي الدالّةُ التي كانت ناقصةً فبقيت `canDo` تُمرَّر `true` دائمًا،
 *   فلم يقل التطبيقُ «ما نقدرش» قطّ — وهو أصدقُ ما يمكن أن يقوله حين لا
 *   يملك فعلًا. قولُ «لا أستطيع» خيرٌ من فعلٍ ناقصٍ يُوهم أنّه تمّ.
 */
export function canDo(verb: AbilityVerb, entity: AbilityEntity): boolean {
  return ABILITIES.some(a => a.verb === verb && a.entity === entity);
}

/** القدراتُ المتاحةُ لهذا الشخص الآن — الزائرُ يتصفّح ويطلب، ولا ينشر. */
export function availableTo(isAuthed: boolean): Ability[] {
  return ABILITIES.filter(a => isAuthed || !a.auth);
}

/**
 * عتبةُ الثقة **بحسب الخطورة** — تحلّ محلَّ العتبة الواحدة.
 *
 *   `CONFIDENCE.ACT` كانت ٠٫٩٠ لكلّ شيء، وسقفُ الفهم الواقعيّ ٠٫٦٠.
 *   فصار «نفّذ» بابًا لا يُفتَح. هنا: العرضُ يُنفَّذ بما يُنفَّذ به العرض،
 *   والحذفُ يبقى مغلقًا.
 */
export const RISK_THRESHOLD: Record<AbilityRisk, number> = {
  low: 0.45,
  medium: 0.70,
  high: 1.01,   // > ١ ⇒ لا تنفيذَ تلقائيًّا أبدًا. يُؤكَّد دائمًا.
};

/** هل يُنفَّذ بلا تأكيد؟ */
export function mayExecute(a: Ability, confidence: number): boolean {
  return a.needs.length === 0 && confidence >= RISK_THRESHOLD[a.risk];
}

// ── سلامةُ القائمة ────────────────────────────────────────────
/** صفحاتٌ لا تذكرها أيُّ قدرة — يقرؤها الاختبارُ لا الواجهة. */
export function pagesWithoutAbility(): Page[] {
  const used = new Set(ABILITIES.map(a => a.page).filter(Boolean));
  return (PAGE_IDS as readonly Page[]).filter(p => !used.has(p));
}

/** قدراتٌ بلا باب — عيبٌ معلومٌ يُسدّ، ومكشوفٌ عمدًا لا مخفيّ. */
export function abilitiesWithoutPage(): Ability[] {
  return ABILITIES.filter(a => a.page === null);
}

// ── الجسر: ما فهمته الطبقاتُ ⇒ قدرةٌ في الكتالوج ───────────────
//
//   هنا تلتقي اللغةُ بالقائمة. وحدُّه صريح: **يُرجع `null` حين لا يطابق**،
//   ولا يخمّن أقربَ قدرة. فقدرةٌ خاطئةٌ أسوأُ من لا قدرة — تلك تُسأل،
//   وهذه تنفّذ فعلًا لم يطلبه أحد.

/** فعلُ `actions.ts` ⇒ فعلُ الكتالوج. ما ليس في الجدول لا يُترجَم. */
const VERB_MAP: Record<string, AbilityVerb> = {
  view: 'view', create: 'create', update: 'update', delete: 'delete', send: 'send', share: 'send',
};

/** هدفُ `actions.ts` ⇒ كيانُ الكتالوج. */
const OBJECT_MAP: Record<string, AbilityEntity> = {
  phone: 'phone', language: 'language', password: 'account', account: 'account',
  workspace: 'workspace', shop_name: 'workspace', shop_hours: 'workspace',
  delivery: 'delivery_provider', settings: 'settings',
  product: 'product', price: 'product', stock: 'product', photo: 'media',
  orders: 'order', customers: 'customer', coupon: 'coupon', wallet: 'wallet',
};

/** نيّةُ `needEngine` ⇒ قدرة. النيّاتُ أخشنُ من الأفعال، فتُطابَق مباشرةً. */
const INTENT_MAP: Record<string, string> = {
  sell: 'SELL_PRODUCT', buy: 'BUY_PRODUCT', find_pro: 'FIND_PROVIDER',
  create_service: 'OFFER_SERVICE', create_store: 'CREATE_WORKSPACE',
  book: 'BOOK_APPOINTMENT', urgent: 'FIND_PROVIDER', rent: 'PUBLISH_LISTING',
};

/**
 * يجد القدرةَ المطابِقة لما فُهم.
 *
 *   الترتيبُ جزءٌ من المعنى: **الفعلُ أدقُّ من النيّة**. «بغيت نبدل الثمن»
 *   فعلُها `update:price` وهو صريح، ونيّتُها تُقرأ `buy` خطأً (قِيس: تاجرٌ
 *   يغيّر ثمنَ قميصه فُهم زبونًا بميزانية ١٢٠ درهمًا). فمن حسم الفعلُ عنده
 *   لا تُسأل النيّة.
 */
export function abilityFor(input: {
  action?: { verb: string; object: string } | null;
  intent?: string;
}): Ability | null {
  const a = input.action;
  if (a) {
    const verb = VERB_MAP[a.verb], entity = OBJECT_MAP[a.object];
    if (verb && entity) {
      const hit = ABILITIES.find(x => x.verb === verb && x.entity === entity);
      if (hit) return hit;
    }
  }
  const byIntent = input.intent ? INTENT_MAP[input.intent] : undefined;
  return (byIntent && BY_ID.get(byIntent)) || null;
}
