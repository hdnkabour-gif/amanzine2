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

/**
 * ما قد ينقص قبل التنفيذ — **مفتاحٌ يُفحَص**، لا جملةٌ تُطبَع.
 *
 *   كانت `needs` نصوصًا ثابتة، فكان التطبيقُ يسأل عمّا قاله الإنسانُ للتوّ:
 *       «عندي محل ديال الخضرة» ⇒ ينقص «شنو نوع النشاط؟»
 *       «بغيت نبيع طوموبيل»    ⇒ ينقص «شنو باغي تبيع؟»
 *   وهو «موتُ السحر» بعينه — يعرف ثمّ يسأل. والسببُ أنّ النصَّ لا يُفحَص:
 *   لا أحدَ يستطيع أن يسأل قائمةً «هل عُرف هذا؟».
 */
export type NeedKey =
  | 'trade'      // نوعُ النشاط أو الخدمة
  | 'product'    // أيُّ منتَج
  | 'price'      // بشحال
  | 'order'      // أيُّ طلب
  | 'workspace'  // أيُّ محلّ
  | 'provider'   // أيُّ شركة
  | 'phone'      // النمرة
  | 'address'    // العنوان
  | 'person'     // مع من
  | 'time'       // إمتا
  | 'amount'     // شحال
  | 'method'     // بأشنو
  | 'text'       // نصُّ الرسالة أو السؤال
  | 'audience'   // لمن
  | 'token'      // مفتاحُ الشركة
  | 'subject';   // شنو محتاج / شنو المشكل

/** السؤالُ الدارجيُّ لكلّ مفتاح — **مكانٌ واحد**، فلا تختلف صياغتان. */
export const NEED_ASK: Record<NeedKey, string> = {
  trade: 'شنو نوع النشاط ولا الخدمة؟', product: 'أيّ منتوج؟', price: 'بشحال؟',
  order: 'أيّ طلب؟', workspace: 'أيّ محلّ؟', provider: 'أيّ شركة؟',
  phone: 'شنو النمرة؟', address: 'شنو العنوان؟', person: 'مع من؟', time: 'إمتا؟',
  amount: 'شحال؟', method: 'بأشنو؟', text: 'شنو تبغي تقول؟', audience: 'لمن؟',
  token: 'التوكن ديال الشركة؟', subject: 'شنو محتاج بالضبط؟',
};

export interface Ability {
  /** مُعرِّفٌ ثابت — يُذكَر في الأثر والاختبارات، فلا يُغيَّر بعد استعماله. */
  id: string;
  verb: AbilityVerb;
  entity: AbilityEntity;
  /** ما يُقال للإنسان بالدارجة — لا مصطلحاتٍ تقنيّة (القانون ١٠). */
  say: string;
  risk: AbilityRisk;
  /** ما قد يُحتاج قبل التنفيذ. يُصفَّى بما عُرف — انظر `unmetNeeds`. */
  needs: NeedKey[];
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
    risk: 'medium', needs: ['product', 'price'], auth: true, page: 'publish', api: '/api/products' },
  { id: 'OFFER_SERVICE', verb: 'offer', entity: 'service', say: 'تقدّم خدمة',
    risk: 'medium', needs: ['trade'], auth: true, page: 'publish', api: '/api/providers' },
  { id: 'PUBLISH_LISTING', verb: 'offer', entity: 'listing', say: 'تنشر إعلان',
    risk: 'medium', needs: ['subject'], auth: true, page: 'publish', api: '/api/listings' },

  // ② يطلب ────────────────────────────────────────────────────
  { id: 'BUY_PRODUCT', verb: 'seek', entity: 'product', say: 'تشري شي حاجة',
    risk: 'low', needs: ['subject'], auth: false, page: 'home', api: '/api/search' },
  { id: 'FIND_PROVIDER', verb: 'seek', entity: 'provider', say: 'تقلّب على حرفي ولا مختصّ',
    risk: 'low', needs: ['subject'], auth: false, page: 'home', api: '/api/business' },
  { id: 'POST_NEED', verb: 'seek', entity: 'need', say: 'تكتب اللي محتاج ونقلّبو ليك',
    risk: 'low', needs: ['subject'], auth: false, page: 'home', api: '/api/needs' },
  { id: 'BOOK_APPOINTMENT', verb: 'book', entity: 'booking', say: 'تاخد موعد',
    risk: 'medium', needs: ['person', 'time'], auth: true, page: 'bookings', api: '/api/bookings' },

  // ③ نشاطُه ──────────────────────────────────────────────────
  { id: 'CREATE_WORKSPACE', verb: 'create', entity: 'workspace', say: 'تصايب المحلّ ديالك',
    risk: 'medium', needs: ['trade'], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'UPDATE_WORKSPACE', verb: 'update', entity: 'workspace', say: 'تبدّل معلومات المحلّ',
    risk: 'medium', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'DELETE_WORKSPACE', verb: 'delete', entity: 'workspace', say: 'تحيّد المحلّ ديالك',
    // كشفه النبضُ حين قِيست جودةُ القرار: «بغيت نحيد هاد المحل» كانت تُطابق
    // `FIND_PROVIDER` — قدرةً **منخفضةَ الخطر** — لأنّ الكتالوج لا يحوي
    // حذفَ محلٍّ أصلًا، بينما `DELETE /api/providers/:id` يعمل على الخادم.
    // ونجت من التنفيذ بحارسٍ آخر لا بخطورتها، وهو نجاةٌ بالصدفة.
    risk: 'high', needs: ['workspace'], auth: true, page: 'settings', api: '/api/providers' },
  { id: 'CREATE_PRODUCT', verb: 'create', entity: 'product', say: 'تزيد منتوج',
    risk: 'medium', needs: ['product', 'price'], auth: true, page: 'products', api: '/api/products' },
  { id: 'UPDATE_PRODUCT', verb: 'update', entity: 'product', say: 'تبدّل منتوج (الثمن، الستوك، التصويرة)',
    risk: 'medium', needs: ['product'], auth: true, page: 'products', api: '/api/products' },
  { id: 'DELETE_PRODUCT', verb: 'delete', entity: 'product', say: 'تحيّد منتوج',
    risk: 'high', needs: ['product'], auth: true, page: 'products', api: '/api/products' },
  { id: 'MANAGE_COUPON', verb: 'create', entity: 'coupon', say: 'تصايب تخفيض ولا كوبون',
    risk: 'medium', needs: [], auth: true, page: 'coupons', api: '/api/coupons' },
  // البابُ قائمٌ منذ بُنيت الشاشة: `LoyaltyPanel` مركَّبٌ داخل `CustomersPage`.
  // وبقي الإعلانُ `page: null` — فكان مَن قال «بغيت نشوف نقط الوفاء» يُقابَل
  // بلا وجهة، والشاشةُ تعمل على بُعد نقرةٍ واحدة.
  { id: 'MANAGE_LOYALTY', verb: 'update', entity: 'customer', say: 'تسيّر نقط الوفاء ديال الزبناء',
    risk: 'medium', needs: [], auth: true, page: 'customers', api: '/api/loyalty' },
  // ونفسُ الأمر: الإرسالُ الجماعيُّ يقع في `NotificationsPage` (`broadcastAPI.send`).
  { id: 'BROADCAST_MESSAGE', verb: 'send', entity: 'message', say: 'تصيفط رسالة لكل الزبناء',
    // تخرج للناس ولا تُسترجَع — وإن كانت الرسالةُ نصًّا، فالإرسالُ حدثٌ نهائيّ.
    risk: 'high', needs: ['text', 'audience'], auth: true, page: 'notifications', api: '/api/broadcast' },
  // «تزيد تصاور» تقع في `ProductsPage` (رفعٌ إلى `/api/media/upload`)، أمّا
  // `ImageEditorPage` فيُحمّل صورةً **ليعدّلها**. فمن قال «بغيت نزيد تصويرة»
  // كان يُساق إلى محرّرٍ فارغٍ ينتظر صورةً لم يرفعها بعد.
  { id: 'MANAGE_MEDIA', verb: 'create', entity: 'media', say: 'تزيد تصاور للمنتوج',
    risk: 'low', needs: [], auth: true, page: 'products', api: '/api/media' },
  { id: 'EDIT_MEDIA', verb: 'update', entity: 'media', say: 'تعدّل تصويرة (نصّ، شعار، خلفيّة)',
    risk: 'low', needs: [], auth: true, page: 'editor', api: null },
  { id: 'DESIGN_BANNER', verb: 'create', entity: 'media', say: 'تصايب بانير ولا إعلان',
    risk: 'low', needs: [], auth: true, page: 'banner', api: null },
  { id: 'IMPORT_DATA', verb: 'create', entity: 'product', say: 'تجيب المنتوجات من محادثة ولا ملفّ',
    risk: 'medium', needs: [], auth: true, page: 'import', api: '/api/products' },

  // ④ طلباتُه ─────────────────────────────────────────────────
  { id: 'VIEW_ORDERS', verb: 'view', entity: 'order', say: 'تشوف الطلبات',
    risk: 'low', needs: [], auth: true, page: 'orders', api: '/api/orders' },
  { id: 'UPDATE_ORDER', verb: 'update', entity: 'order', say: 'تبدّل حالة ولا عنوان الطلب',
    risk: 'medium', needs: ['order'], auth: true, page: 'orders', api: '/api/orders' },
  { id: 'TRACK_ORDER', verb: 'view', entity: 'shipment', say: 'تشوف فين وصل الطلب',
    // كان يشير إلى `/api/track` — وهو **مسارُ أحداث المشاهدة والنقر**
    // (تحليلات، `POST` وحدَه)، لا تتبّعُ الشحنات. ومرّ الحارسُ لأنّه يتحقّق
    // أنّ مسارًا **بهذا الاسم** موجود، وهو موجودٌ فعلًا ويفعل شيئًا آخر.
    // تتبّعُ الزبون: `GET /api/orders/track-code/:code` و`/track/:phone`،
    // وكلاهما عامٌّ بلا مصادقة — مطابقٌ لـ`auth: false` هنا.
    //
    //   و`page: null` **عمدًا**: البابُ موجودٌ ويعمل (`/track/:userId` في
    //   `App.tsx` → `TrackOrder.tsx`)، لكنّه خارج `PAGE_IDS` لأنّ `PAGE_IDS`
    //   صفحاتُ **التاجر داخل `MainLayout`**. وهذا بابُ الزبون: بلا حساب،
    //   بلا قائمةٍ جانبيّة، يصله رابطًا في واتساب. إدراجُه في `PAGE_IDS`
    //   يعني وضعَ صفحةِ الزبون في قائمة التاجر — وذاك خطأٌ لا تصحيح.
    risk: 'low', needs: ['order'], auth: false, page: null, api: '/api/orders' },
  { id: 'CREATE_SHIPMENT', verb: 'send', entity: 'shipment', say: 'تصيفط الطلب مع شركة التوصيل',
    // شحنةٌ تُنشأ عند طرفٍ خارجيّ ويُطلَب مالٌ من الزبون — لا تُسترجَع.
    risk: 'high', needs: ['order', 'provider'], auth: true, page: 'delivery', api: '/api/delivery' },
  { id: 'CREATE_SHIPMENT_AUTO', verb: 'send', entity: 'shipment', say: 'تصيفط الطلب لشركة ما عندهاش API',
    // نفسُ خطورة الشحن، بآليّةٍ أهشّ: أتمتةُ متصفّحٍ على موقع الشركة. يكفي
    // أن يتغيّر زرٌّ عندهم ليصير الفعلُ صامتًا — فالتأكيدُ هنا آكد.
    risk: 'high', needs: ['order'], auth: true, page: 'delivery', api: '/api/delivery-auto' },
  { id: 'CONNECT_DELIVERY', verb: 'create', entity: 'delivery_provider', say: 'تربط شركة التوصيل ديالك',
    risk: 'high', needs: ['provider', 'token'], auth: true, page: 'connections', api: '/api/delivery' },
  { id: 'VIEW_CUSTOMERS', verb: 'view', entity: 'customer', say: 'تشوف الزبناء ديالك',
    risk: 'low', needs: [], auth: true, page: 'customers', api: '/api/customers' },
  { id: 'CHAT_CUSTOMER', verb: 'send', entity: 'message', say: 'تهضر مع زبون',
    risk: 'medium', needs: ['person'], auth: true, page: 'conversations', api: '/api/conversations' },

  // ⑤ مالُه ──────────────────────────────────────────────────
  { id: 'VIEW_WALLET', verb: 'view', entity: 'wallet', say: 'تشوف الرصيد ديالك',
    risk: 'low', needs: [], auth: true, page: 'wallet', api: '/api/wallet' },
  // «تخلّص» كانت تَعِد بما لا يقع: التاجرُ لا يدفع لأحدٍ من التطبيق. الفعلُ
  // الحقيقيُّ في `WalletPage` هو **تسجيلُ خلاصٍ وصلَه** ثمّ تأكيدُه —
  // و`needs: ['amount','method']` تطابق حقلَي النموذج بالضبط.
  { id: 'MAKE_PAYMENT', verb: 'send', entity: 'payment', say: 'تسجّل خلاص ولا تأكّد أنّه وصل',
    risk: 'high', needs: ['amount', 'method'], auth: true, page: 'wallet', api: '/api/payment' },

  // ⑥ نفسُه ──────────────────────────────────────────────────
  // التحقّقُ الموحَّد: قناةٌ محايدة (بريد · واتساب · SMS)، والفعلُ هو ما يطلب
  // الرمز. `page: null` عمدًا — لا صفحةَ له: يظهر **داخل** الفعل الذي طلبه
  // (تأكيدُ طلبٍ · تبديلُ نمرة)، وصفحةٌ مستقلّةٌ للتحقّق لا معنى لها.
  { id: 'VERIFY_IDENTITY', verb: 'view', entity: 'account', say: 'تأكّد نمرتك ولا بريدك',
    risk: 'low', needs: [], auth: false, page: null, api: '/api/verify' },
  { id: 'SIGN_IN', verb: 'create', entity: 'account', say: 'تدخل ولا تصايب حساب',
    risk: 'medium', needs: ['phone'], auth: false, page: 'profile', api: '/api/auth' },
  { id: 'CHANGE_PHONE', verb: 'update', entity: 'phone', say: 'تبدّل النمرة ديالك',
    // النمرةُ هي الهويّةُ والدخول — خطؤها يقفل الحسابَ على صاحبه.
    risk: 'high', needs: ['phone'], auth: true, page: 'profile', api: '/api/auth' },
  // العنوانُ يعيش في `SettingsPage` (`brand.address`) — و`ProfilePage` لا
  // تحوي حقلَ عنوانٍ إطلاقًا. فكانت الوجهةُ صفحةً لا يجد فيها الإنسانُ ما جاء له.
  { id: 'CHANGE_ADDRESS', verb: 'update', entity: 'address', say: 'تبدّل العنوان',
    risk: 'medium', needs: ['address'], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'CHANGE_LANGUAGE', verb: 'update', entity: 'language', say: 'تبدّل اللغة',
    risk: 'low', needs: [], auth: false, page: 'settings', api: null },
  { id: 'UPDATE_SETTINGS', verb: 'update', entity: 'settings', say: 'تبدّل الإعدادات',
    risk: 'medium', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'MANAGE_NOTIFICATIONS', verb: 'update', entity: 'settings', say: 'تسيّر التنبيهات',
    risk: 'low', needs: [], auth: true, page: 'notifications', api: '/api/push' },
  // `page: null` **عمدًا**: لا أحدَ يذهب إلى صفحةٍ ليُزامن ذاكرتَه. المزامنةُ
  // تقع من نفسِها في `lib/userMemory.ts` عند الدخول وعند التبدّل. وصفحةٌ لها
  // تعني عملًا يدويًّا لشيءٍ قيمتُه كلُّها في أنّه لا يُطلَب.
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
    risk: 'low', needs: ['text'], auth: false, page: 'assistant', api: '/api/ai' },
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
  // ── ما كان يعمل ولم يكن مُعلَنًا ───────────────────────────────
  //
  //   أربعون بابًا لها مسارٌ في الخادم وصفحةٌ في التطبيق ولم تكن في هذه
  //   القائمة. وثمنُ ذلك مقيس: `abilityFor` تُرجع `null` لها، فيسقط الحكمُ
  //   على **العتبة العامّة** بدل عتبةٍ تتبع الخطورة — أي أنّ «وريني
  //   المنتجات» تُسأل حيث يجب أن تُنفَّذ، و«حيّد الكوبون» يمرّ حيث يجب أن
  //   يُؤكَّد. القائمةُ الناقصةُ لا تصمت: تُخطئ في الاتّجاهين معًا.
  //
  //   وكلُّها مقيسةٌ لا مُخترَعة: لكلٍّ مسارٌ بالطريقة الصحيحة (يحرسه
  //   `abilities.test.mjs`) وصفحةٌ يبلغها `MainLayout`.

  // ① يرى ما عنده ──────────────────────────────────────────────
  { id: 'VIEW_PRODUCTS', verb: 'view', entity: 'product', say: 'تشوف المنتوجات ديالك',
    risk: 'low', needs: [], auth: true, page: 'products', api: '/api/products' },
  { id: 'VIEW_SERVICES', verb: 'view', entity: 'service', say: 'تشوف الخدمات ديالك',
    risk: 'low', needs: [], auth: true, page: 'services', api: '/api/providers' },
  { id: 'VIEW_COUPONS', verb: 'view', entity: 'coupon', say: 'تشوف التخفيضات ديالك',
    risk: 'low', needs: [], auth: true, page: 'coupons', api: '/api/coupons' },
  { id: 'VIEW_BOOKINGS', verb: 'view', entity: 'booking', say: 'تشوف المواعيد',
    risk: 'low', needs: [], auth: true, page: 'bookings', api: '/api/bookings' },
  { id: 'VIEW_MESSAGES', verb: 'view', entity: 'message', say: 'تشوف الرسائل',
    risk: 'low', needs: [], auth: true, page: 'conversations', api: '/api/conversations' },
  { id: 'VIEW_DELIVERY_PROVIDERS', verb: 'view', entity: 'delivery_provider', say: 'تشوف شركات التوصيل',
    risk: 'low', needs: [], auth: true, page: 'delivery', api: '/api/delivery' },
  { id: 'VIEW_SETTINGS', verb: 'view', entity: 'settings', say: 'تشوف الإعدادات',
    risk: 'low', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'VIEW_WORKSPACE', verb: 'view', entity: 'workspace', say: 'تشوف معلومات المحلّ',
    risk: 'low', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'VIEW_PHONE', verb: 'view', entity: 'phone', say: 'تشوف النمرة ديالك',
    risk: 'low', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'VIEW_ADDRESS', verb: 'view', entity: 'address', say: 'تشوف العنوان',
    risk: 'low', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'VIEW_LANGUAGE', verb: 'view', entity: 'language', say: 'تشوف اللغة',
    risk: 'low', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'VIEW_MEDIA', verb: 'view', entity: 'media', say: 'تشوف التصاور ديالك',
    risk: 'low', needs: [], auth: true, page: 'products', api: '/api/media' },
  { id: 'VIEW_PAYMENTS', verb: 'view', entity: 'payment', say: 'تشوف الأداءات',
    risk: 'low', needs: [], auth: true, page: 'wallet', api: '/api/payment' },
  // الحاجاتُ المنشورة عامّةٌ عمدًا: مَن يعرض خدمةً يقرؤها ليردّ، ولا حسابَ يلزمه للقراءة.
  { id: 'VIEW_NEEDS', verb: 'view', entity: 'need', say: 'تشوف الطلبات اللي كتبو الناس',
    risk: 'low', needs: [], auth: false, page: 'home', api: '/api/needs' },

  // ② يُنشئ ─────────────────────────────────────────────────────
  { id: 'CREATE_CUSTOMER', verb: 'create', entity: 'customer', say: 'تزيد زبون',
    risk: 'medium', needs: ['person'], auth: true, page: 'customers', api: '/api/customers' },
  { id: 'CREATE_ORDER', verb: 'create', entity: 'order', say: 'تسجّل طلب',
    risk: 'medium', needs: ['product'], auth: true, page: 'orders', api: '/api/orders' },
  { id: 'CREATE_SERVICE', verb: 'create', entity: 'service', say: 'تزيد خدمة',
    risk: 'medium', needs: ['trade'], auth: true, page: 'services', api: '/api/providers' },
  { id: 'CREATE_LISTING', verb: 'create', entity: 'listing', say: 'تزيد إعلان',
    risk: 'medium', needs: ['subject'], auth: true, page: 'publish', api: '/api/listings' },
  { id: 'CREATE_BOOKING', verb: 'create', entity: 'booking', say: 'تسجّل موعد',
    risk: 'medium', needs: ['person', 'time'], auth: true, page: 'bookings', api: '/api/bookings' },
  { id: 'CREATE_MESSAGE', verb: 'create', entity: 'message', say: 'تصيفط رسالة لزبون',
    risk: 'medium', needs: ['person', 'text'], auth: true, page: 'conversations', api: '/api/conversations' },
  { id: 'CREATE_NEED', verb: 'create', entity: 'need', say: 'تكتب حاجة باش نقلّبو ليك',
    risk: 'low', needs: ['subject'], auth: false, page: 'home', api: '/api/needs' },
  { id: 'CREATE_KNOWLEDGE', verb: 'create', entity: 'knowledge', say: 'تعلّم التطبيق مفهوم جديد',
    risk: 'medium', needs: ['subject'], auth: true, page: 'knowledge', api: '/api/knowledge' },

  // ③ يعدّل ─────────────────────────────────────────────────────
  { id: 'UPDATE_COUPON', verb: 'update', entity: 'coupon', say: 'تبدّل تخفيض',
    risk: 'medium', needs: [], auth: true, page: 'coupons', api: '/api/coupons' },
  { id: 'UPDATE_BOOKING', verb: 'update', entity: 'booking', say: 'تبدّل موعد',
    risk: 'medium', needs: [], auth: true, page: 'bookings', api: '/api/bookings' },
  { id: 'UPDATE_DELIVERY_PROVIDER', verb: 'update', entity: 'delivery_provider', say: 'تبدّل إعدادات شركة التوصيل',
    risk: 'medium', needs: ['provider'], auth: true, page: 'delivery', api: '/api/delivery' },

  // ④ يحذف — **كلُّها خطِرةٌ ولا تُسترجَع** ────────────────────────
  { id: 'DELETE_COUPON', verb: 'delete', entity: 'coupon', say: 'تحيّد تخفيض',
    risk: 'high', needs: [], auth: true, page: 'coupons', api: '/api/coupons' },
  { id: 'DELETE_CUSTOMER', verb: 'delete', entity: 'customer', say: 'تحيّد زبون',
    risk: 'high', needs: ['person'], auth: true, page: 'customers', api: '/api/customers' },
  { id: 'DELETE_SERVICE', verb: 'delete', entity: 'service', say: 'تحيّد خدمة',
    risk: 'high', needs: ['trade'], auth: true, page: 'services', api: '/api/providers' },
  { id: 'DELETE_DELIVERY_PROVIDER', verb: 'delete', entity: 'delivery_provider', say: 'تحيّد شركة التوصيل',
    risk: 'high', needs: ['provider'], auth: true, page: 'delivery', api: '/api/delivery' },

  // ⑤ يرسل خارج نفسه — يخرج للناس فلا يُسترجَع ──────────────────
  { id: 'SHARE_WORKSPACE', verb: 'send', entity: 'workspace', say: 'تشارك رابط محلّك',
    risk: 'low', needs: [], auth: true, page: 'settings', api: '/api/settings' },
  { id: 'SHARE_PRODUCT', verb: 'send', entity: 'product', say: 'تشارك رابط منتوج',
    risk: 'low', needs: ['product'], auth: true, page: 'products', api: '/api/products' },
  { id: 'SEND_ORDER_CONFIRM', verb: 'send', entity: 'order', say: 'تصيفط تأكيد الطلب للزبون',
    risk: 'medium', needs: ['order'], auth: true, page: 'orders', api: '/api/orders' },
  { id: 'SEND_COUPON', verb: 'send', entity: 'coupon', say: 'تصيفط تخفيض للزبناء',
    risk: 'high', needs: ['audience'], auth: true, page: 'coupons', api: '/api/coupons' },
  { id: 'SEND_TO_CUSTOMERS', verb: 'send', entity: 'customer', say: 'تصيفط رسالة لزبناءك',
    risk: 'high', needs: ['audience', 'text'], auth: true, page: 'customers', api: '/api/customers' },

  // ⑥ يطلب ويَعرض ──────────────────────────────────────────────
  { id: 'SEEK_SERVICE', verb: 'seek', entity: 'service', say: 'تقلّب على خدمة',
    risk: 'low', needs: ['subject'], auth: false, page: 'home', api: '/api/providers' },
  { id: 'SEEK_LISTING', verb: 'seek', entity: 'listing', say: 'تقلّب على إعلان',
    risk: 'low', needs: ['subject'], auth: false, page: 'home', api: '/api/listings' },
  { id: 'OFFER_PROVIDER', verb: 'offer', entity: 'provider', say: 'تسجّل نشاطك باش يلقاوك الناس',
    risk: 'medium', needs: ['trade'], auth: true, page: 'publish', api: '/api/providers' },
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
 * **ما ينقص فعلًا** — بعد طرح ما عرفناه من الجملة.
 *
 *   القاعدةُ المكتوبةُ في `knownContext` منذ البداية: «لا يسأل التطبيقُ
 *   سؤالًا يعرف جوابَه». وكانت `needs` قائمةً ثابتةً لا تعرفها، فكان يسأل
 *   الخضّارَ عن نوع نشاطه بعد أن قال «عندي محل ديال الخضرة».
 *
 *   وهو «موتُ السحر» المكتوبُ في `needEngine`: أن يعرف أنّه حلّاقٌ ثمّ
 *   يسأله إن كان حرفيًّا أم مهنيًّا. قِيس: ستُّ جملٍ واضحةٍ من أصل ٢٥
 *   تُقابَل بسؤالٍ بلا داعٍ.
 *
 * @param known ما فُهم من الجملة (مفهومٌ · مدينة · ثمن · منتَج…)
 */
export function unmetNeeds(a: Ability, known: {
  trade?: string; product?: string; price?: number | string;
  order?: string; phone?: string; address?: string; subject?: string;
} = {}): NeedKey[] {
  const have: Partial<Record<NeedKey, boolean>> = {
    trade: !!known.trade,
    // من سمّى بضاعتَه سمّى منتَجَه: «بغيت نبيع طوموبيل» تقول ماذا يبيع.
    product: !!(known.product || known.trade),
    subject: !!(known.subject || known.trade),
    price: known.price !== undefined && known.price !== '',
    order: !!known.order, phone: !!known.phone, address: !!known.address,
  };
  return a.needs.filter(k => !have[k]);
}

/** ما يُسأل عنه بالدارجة — سؤالٌ **واحد**، لا استمارة. */
export function nextQuestion(a: Ability, known?: Parameters<typeof unmetNeeds>[1]): string {
  const missing = unmetNeeds(a, known);
  return missing.length ? NEED_ASK[missing[0]] : '';
}

//   حُذفت من هنا `canDo(verb, entity)`. كانت تُقدَّم على أنّها «حدُّ القدرة»
//   وهي في الواقع **حشوٌ منطقيّ**: مستهلكوها جميعًا كانوا يمرّرون لها
//   `match.verb` و`match.entity` من قدرةٍ أُخِذت من `ABILITIES` نفسِها، فكان
//   جوابُها `true` بحكم البناء لا بحكم القياس. وشرحُ الحذف كاملًا في
//   `executionPolicy.ts` حيث كان مستهلكُها الوحيد ذا الأثر.

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
// ============================================================
// ما **يقبله الكيانُ** من أفعال — ومنه وحدَه يُقال «ما نقدرش».
//
//   ── لماذا وُلد هذا الإعلان ──
//   حُذف حكمُ `refuse` بحقٍّ: بابُه الوحيد كان سؤالًا جوابُه `true` بحكم
//   البناء. والبديلُ المرشَّح — «لا قدرةَ في الكتالوج ⇒ ما نقدرش» — قِيس
//   فسقط: من ١٠٢ تركيبةٍ ممكنةٍ لا يغطّي الكتالوج ٤٢، وفيها `view:product`
//   و`view:coupon` و`delete:customer` — أبوابٌ **تعمل** ولها مساراتٌ وصفحات.
//   فذاك المقياسُ يقيس **نقصَ كتالوجنا** لا عجزَ التطبيق، ويقول «ما نقدرش»
//   عمّا نقدر عليه — وهو أسوأُ من الصمت.
//
//   ── والفرقُ الذي يجعل الحكمَ صادقًا ──
//   ٤٢ زوجًا صنفان لا صنفٌ واحد:
//     · **ثغرةُ كتالوج**: `view:product` بابٌ حقيقيٌّ لم يُعلَن ⇒ يُعلَن، ولا
//       يُقال فيه «ما نقدرش» أبدًا.
//     · **تركيبةٌ لا وجودَ لها**: `create:phone` · `delete:language` ·
//       `send:settings` — نتاجُ الضربِ الديكارتيّ لا نقصٌ عندنا. لا أحدَ
//       «يُنشئ هاتفًا» ولا «يحذف لغة».
//
//   فالسؤالُ الصادقُ ليس «أفي الكتالوج قدرة؟» بل **«أيقبل هذا الكيانُ هذا
//   الفعلَ أصلًا؟»** — وهي حقيقةٌ عن المجال تُعلَن مرّةً، لا تُشتقّ من نقصنا.
//
//   ── وحدُّه ──
//   كلُّ فعلٍ مُعلَنٍ هنا **يجب أن يُبرَّر** بمسارٍ في الخادم أو صفحةٍ في
//   التطبيق (`abilities.test.mjs`). فلا يصير هذا الإعلانُ بابًا خلفيًّا
//   يُوسَّع بالنيّة الحسنة حتّى يُصبح «كلُّ شيءٍ ممكن» ويعود `refuse` ميّتًا.
// ============================================================
export const ENTITY_VERBS: Record<AbilityEntity, AbilityVerb[]> = {
  // بضاعةٌ وخدمةٌ وإعلان: تُعرَض وتُطلَب وتُدار وتُشارَك.
  product:  ['offer', 'seek', 'create', 'update', 'delete', 'view', 'send'],
  service:  ['offer', 'seek', 'create', 'update', 'delete', 'view'],
  listing:  ['offer', 'seek', 'create', 'update', 'delete', 'view'],
  // المحلّ: يُنشأ ويُعدَّل ويُحذَف ويُشارَك رابطُه (ShareShop) — ولا يُطلَب.
  workspace: ['create', 'update', 'delete', 'view', 'send'],
  // الطلب: يُنشأ ويُعدَّل ويُشارَك تأكيدُه. **ولا يُحذَف** — يُلغى بتغيير حالته،
  // وسجلُّه يبقى لأنّ مالًا تحرّك.
  order:    ['create', 'update', 'view', 'send'],
  shipment: ['send', 'view'],
  customer: ['create', 'update', 'delete', 'view', 'send'],
  booking:  ['book', 'create', 'update', 'delete', 'view'],
  coupon:   ['create', 'update', 'delete', 'view', 'send'],
  // المحفظة: تُقرأ. رصيدُها يتغيّر بالدفع لا بتحريرٍ مباشر.
  wallet:   ['view'],
  payment:  ['send', 'view'],
  message:  ['create', 'view', 'send'],
  // الحساب: يُنشأ ويُعدَّل ويُقرأ. حذفُه ليس مبنيًّا بعد — فلا يُدَّعى.
  account:  ['create', 'view'],
  // النمرةُ واللغةُ والعنوانُ صفاتٌ تُبدَّل وتُقرأ — لا تُنشأ ولا تُحذَف ولا تُرسَل.
  phone:    ['update', 'view'],
  address:  ['update', 'view'],
  language: ['update', 'view'],
  settings: ['update', 'view'],
  delivery_provider: ['create', 'update', 'delete', 'view'],
  media:    ['create', 'update', 'delete', 'view'],
  knowledge: ['create', 'update', 'view'],
  report:   ['view'],
  need:     ['seek', 'create', 'view'],
  provider: ['offer', 'seek', 'create', 'view'],
};

/**
 * **حدُّ القدرة الصادق**: أيقبل هذا الكيانُ هذا الفعلَ أصلًا؟
 *
 *   `false` تعني عجزًا حقيقيًّا في المجال («احذف اللغة») — وعندها يُقال
 *   «ما نقدرش» بحقّ. ولا تعني «لا قدرةَ في كتالوجنا»: تلك ثغرةٌ عندنا
 *   يسدُّها حارسُ `abilities.test.mjs`، ولا يُحاسَب عليها الإنسان.
 */
export function entityAccepts(verb: AbilityVerb, entity: AbilityEntity): boolean {
  return (ENTITY_VERBS[entity] || []).includes(verb);
}

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
export const VERB_MAP: Record<string, AbilityVerb> = {
  view: 'view', create: 'create', update: 'update', delete: 'delete', send: 'send', share: 'send',
};

/** هدفُ `actions.ts` ⇒ كيانُ الكتالوج. */
export const OBJECT_MAP: Record<string, AbilityEntity> = {
  phone: 'phone', language: 'language', password: 'account', account: 'account',
  workspace: 'workspace', shop_name: 'workspace', shop_hours: 'workspace',
  delivery: 'delivery_provider', settings: 'settings',
  product: 'product', price: 'product', stock: 'product', photo: 'media',
  // وصفُ المنتوج وهاشتاگه تعديلٌ **للمنتوج** لا كيانٌ ثالث: النصُّ يعيش في
  // استمارته، وزرُّ التوليد بجانبه في `ProductsPage`.
  content: 'product',
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
