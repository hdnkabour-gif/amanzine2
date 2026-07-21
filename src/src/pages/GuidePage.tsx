import { useState } from 'react';
import { useStore } from '../store';
import {
  LayoutDashboard, Package, Layers, ShoppingCart, MessageCircle,
  Users, Bot, Megaphone, Truck, Tag, Sparkles, ChevronLeft,
  CheckCircle2, ArrowLeft, ArrowRight, BookOpen,
  Search, Clock, Zap, Link2,
  Wrench, HelpCircle, X, ChevronDown,
  Store, Star, ShieldCheck, Smartphone,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface GuideSection {
  id: string;
  icon: any;
  title: string;
  tagline: string;
  color: string;
  category: 'start' | 'manage' | 'sell' | 'communicate' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeToLearn: string;
  steps: { t: string; d: string; tip?: string; action?: { label: string; page?: string } }[];
  page?: string;
  videoUrl?: string;
  relatedIds?: string[];
}

interface FAQ {
  q: string;
  a: string;
  section: string;
}

// ═══════════════════════════════════════════════════════════
// DATA — Guide complet
// ═══════════════════════════════════════════════════════════
const SECTIONS: GuideSection[] = [
  // ── DÉMARRAGE ──
  {
    id: 'start', icon: Sparkles, title: 'البداية السريعة', tagline: 'من الصفر إلى أول عملية بيع في 5 دقائق',
    color: '#FF6A00', category: 'start', difficulty: 'beginner', timeToLearn: '5 دقائق',
    page: 'dashboard',
    steps: [
      { t: '1) أنشئ متجرك', d: 'سجّل حسابك وأدخل اسم نشاطك ونوعه (منتجات / خدمات / الاثنين). اختر الفئة الأقرب لنشاطك.', tip: 'نصيحة: اختر "الكل" إذا كنت تبيع منتجات وخدمات معاً' },
      { t: '2) أضف عناصرك', d: 'من لوحة التحكم، اضغط "إضافة منتج" أو "إضافة خدمة". املأ الحقول الأساسية: الاسم، السعر، الوصف، الصور.', tip: 'الصورة الأولى هي الأهم — اختر صورة واضحة على خلفية بيضاء', action: { label: 'إضافة منتج', page: 'products' } },
      { t: '3) اربط واتساب', d: 'من صفحة "ربط الخدمات"، ادخل بيانات WhatsApp Business. هذا يمكن الزبائن من الطلب مباشرة عبر واتساب.', tip: 'تحتاج حساب Facebook Business مجاني — الدليل في نفس الصفحة', action: { label: 'ربط واتساب', page: 'connections' } },
      { t: '4) شارك متجرك', d: 'انسخ رابط متجرك من زر "متجري" في الأعلى. أرسله لعملائك عبر واتساب، فيسبوك، أو انستغرام.', tip: 'يمكنك أيضاً إنشاء QR Code للمتجر من صفحة الإعدادات' },
    ],
    relatedIds: ['dashboard', 'products', 'connections'],
  },
  {
    id: 'dashboard', icon: LayoutDashboard, title: 'لوحة التحكم', tagline: 'مركز قيادة متجرك — كل شيء في مكان واحد',
    color: '#FF6A00', category: 'manage', difficulty: 'beginner', timeToLearn: '3 دقائق',
    page: 'dashboard',
    steps: [
      { t: 'نظرة عامة', d: 'في الأعلى: الإيراد الإجمالي، طلبات اليوم، عدد الزبائن، والرسائل غير المقروءة. كلها أرقام حقيقية مباشرة.' },
      { t: 'إجراءات سريعة', d: 'زري "إضافة منتج" و"الطلبات" يختصران عليك التنقل. استخدمهما يومياً.' },
      { t: 'تقرير الصباح', d: 'كل صباح، مساعدك الذكي يرسل لك ملخصاً: إيراد الأمس، الطلبات المعلقة، المنتجات منخفضة المخزون.' },
      { t: 'مسار البيع', d: 'شريط التقدم يوضح أين أنت في رحلة البيع: من إضافة المنتجات ← إلى أول توصيل. يساعدك ترى الخطوات المتبقية.' },
    ],
    relatedIds: ['products', 'orders', 'messages'],
  },

  // ── PRODUITS & SERVICES ──
  {
    id: 'products', icon: Package, title: 'المنتجات', tagline: 'أضف وعدّل منتجاتك باحترافية كاملة',
    color: '#A855F7', category: 'manage', difficulty: 'beginner', timeToLearn: '8 دقائق',
    page: 'products',
    steps: [
      { t: 'حقول حسب الفئة', d: 'اختر الفئة أولاً (ملابس، أحذية، إكسسوارات...) لتظهر الحقول المناسبة: مقاسات، ألوان، خامة، مناسبة، موسم.', tip: 'كل فئة لها حقولها الخاصة — لا تضيع وقتك في حقول لا تحتاجها' },
      { t: 'صور متعددة', d: 'ارفع حتى 10 صور للمنتج. الصورة الأولى هي الرئيسية. يمكنك رفع صورة مختلفة لكل لون.' },
      { t: 'فيديو المنتج', d: 'ارفع فيديو قصير (MP4/WEBM) يظهر للزبون في المعرض. يزيد الثقة والمبيعات.' },
      { t: 'وصف بالذكاء الاصطناعي', d: 'اضغط "توليد وصف" ليكتب لك AI وصفاً تسويقياً جذاباً بالدارجة أو العربية. يمكنك تعديله بعد التوليد.', tip: 'يتطلب ربط OpenAI أو Gemini من صفحة الاتصالات', action: { label: 'توليد وصف', page: 'products' } },
      { t: 'استوديو التصميم', d: 'صمم صوراً احترافية لمنتجك بالذكاء الاصطناعي. اكتب وصفاً للصورة التي تريدها (مثلاً: "قفطان مغربي على خلفية بيضاء")', tip: 'يستخدم DALL-E 3 — يحتاج OpenAI API Key' },
      { t: 'إدارة المخزون', d: 'حدد الكمية المتوفرة. سيظهر تنبيه تلقائي عندما يقل المخزون عن الحد الذي تحدده.' },
    ],
    relatedIds: ['services', 'banner', 'ai'],
  },
  {
    id: 'services', icon: Layers, title: 'الخدمات', tagline: 'للحرفيين وأصحاب المهن — قدّم خدماتك أونلاين',
    color: '#00D2B3', category: 'manage', difficulty: 'beginner', timeToLearn: '5 دقائق',
    page: 'products',
    steps: [
      { t: 'فئات مغربية', d: 'كهربائي، سباك، نجار، صباغ، مصمم، مبرمج، مصور، نقل، طبخ، تعليم... وغيرها من الفئات الجاهزة.' },
      { t: 'معلومات الخدمة', d: 'املأ: الوصف، السعر (ثابت/بالساعة/بالمشروع)، مدة التنفيذ، مدن التغطية، وإمكانية التنقل.' },
      { t: 'معرض الأعمال', d: 'ارفع صوراً من أعمالك السابقة. الزبون يريد أن يرى جودة عملك قبل الحجز.' },
      { t: 'فيديو تعريفي', d: 'ارفع فيديو قصير تشرح فيه خدمتك أو تعرض عملاً سابقاً. يزيد الحجوزات بشكل كبير.' },
    ],
    relatedIds: ['products', 'delivery', 'messages'],
  },

  // ── VENTES ──
  {
    id: 'orders', icon: ShoppingCart, title: 'الطلبات', tagline: 'من الطلب إلى التوصيل — متابعة كاملة',
    color: '#F59E0B', category: 'sell', difficulty: 'beginner', timeToLearn: '4 دقائق',
    page: 'orders',
    steps: [
      { t: 'لوحة المراحل', d: 'كل طلب يمر بـ 5 مراحل: معلق ← مقبول ← قيد التحضير ← مشحون ← تم التوصيل. انقر على أي طلب لتغيير حالته.' },
      { t: 'تفاصيل الطلب', d: 'انقر على طلب لترى: اسم الزبون، هاتفه، مدينته، عنوانه، المنتجات المطلوبة، المقاسات، الألوان، والمبلغ.' },
      { t: 'طباعة الفاتورة', d: 'بعد قبول الطلب، اطبع فاتورة احترافية جاهزة. يمكنك إرسالها للزبون مباشرة.' },
      { t: 'إرسال للزبون', d: 'زر "إرسال عبر واتساب" يرسل تفاصيل الطلب للزبون تلقائياً. زر "تأكيد" يرسل رسالة تأكيد.' },
      { t: 'إنشاء توصيل', d: 'بعد القبول، اضغط "إنشاء توصيل" لفتح موقع شركة الشحن آلياً مع بيانات الطلب جاهزة.' },
    ],
    relatedIds: ['delivery', 'customers', 'coupons'],
  },
  {
    id: 'delivery', icon: Truck, title: 'التوصيل', tagline: 'اربط شركات الشحن وأتمتة التوصيل',
    color: '#22C55E', category: 'sell', difficulty: 'intermediate', timeToLearn: '6 دقائق',
    page: 'delivery',
    steps: [
      { t: 'إضافة شركة توصيل', d: '3 طرق: 1) اختر من شركات مغربية جاهزة (Amana، Jibli، Naqel...) 2) واتساب شركة التوصيل 3) إعداد متقدم بوصفة URL.' },
      { t: 'الوضع البسيط', d: 'اختر اسم الشركة، أدخل بريدك وكلمة مرور حسابك التجاري. النظام يتكفل بالباقي.' },
      { t: 'وصفة URL (متقدم)', d: 'لأي شركة توصيل لها موقع: حدد روابط تسجيل الدخول، حقول النموذج، وزر الإرسال. النظام يملأ البيانات تلقائياً.' },
      { t: 'أتمتة كاملة', d: 'فعّل "إرسال تلقائي للتوصيل عند الموافقة". عند قبول أي طلب، يُنشأ التوصيل تلقائياً.' },
      { t: 'إشعار الزبون', d: 'فعّل "إشعار الزبون عند الشحن" ليتلقى الزبون رسالة واتساب برقم التتبع فور الشحن.' },
    ],
    relatedIds: ['orders', 'connections'],
  },
  {
    id: 'coupons', icon: Tag, title: 'الكوبونات والخصومات', tagline: 'خصومات ذكية تزيد مبيعاتك',
    color: '#FF8533', category: 'sell', difficulty: 'beginner', timeToLearn: '4 دقائق',
    page: 'coupons',
    steps: [
      { t: 'أنواع الكوبونات', d: '1) نسبة مئوية (خصم 10%) 2) مبلغ ثابت (خصم 50 درهم) 3) شحن مجاني.' },
      { t: 'إنشاء كوبون', d: 'حدد: الكود (مثلاً: RAMADAN2026)، نوع الخصم، قيمته، الحد الأدنى للطلب، عدد مرات الاستخدام، وتاريخ الانتهاء.' },
      { t: 'عجلة الحظ', d: 'أداة تفاعلية للزبائن: يدورون العجلة ويربحون كوبونات. تزيد التفاعل والمبيعات. الزبون يدخل رقم هاتفه أولاً.' },
      { t: 'مشاركة الكوبون', d: 'انسخ الكود أو رابط الكوبون وأرسله لعملائك. يمكنك جدولة حملات ترويجية كاملة.' },
    ],
    relatedIds: ['orders', 'marketing'],
  },

  // ── COMMUNICATION ──
  {
    id: 'messages', icon: MessageCircle, title: 'الرسائل والمحادثات', tagline: 'كل محادثاتك مع الزبائن في صندوق واحد',
    color: '#25D366', category: 'communicate', difficulty: 'beginner', timeToLearn: '3 دقائق',
    page: 'conversations',
    steps: [
      { t: 'صندوق موحّد', d: 'رسائل واتساب، فيسبوك ماسنجر، وانستغرام Direct — كلها في صندوق واحد. لا تفوّت أي رسالة.' },
      { t: 'ردود ذكية تلقائية', d: 'الذكاء الاصطناعي يرد على الزبائن تلقائياً. يفهم الأسئلة، يقترح منتجات، ويجمع معلومات الطلب.' },
      { t: 'إعدادات الذكاء الاصطناعي', d: 'من صفحة الإعدادات: اختر شخصية المساعد (بائع مغربي، احترافي، ودود، فاخر)، اللغة (دارجة/عربية/فرنسية)، ونسبة الخصم التلقائي.' },
      { t: 'تحويل للمحادثة البشرية', d: 'إذا لم يستطع AI الإجابة، يحول المحادثة لك تلقائياً مع ملخص لما تم.' },
    ],
    relatedIds: ['ai', 'connections', 'customers'],
  },
  {
    id: 'customers', icon: Users, title: 'الزبائن', tagline: 'اعرف زبائنك وابني علاقات دائمة',
    color: '#3B82F6', category: 'communicate', difficulty: 'beginner', timeToLearn: '3 دقائق',
    page: 'customers',
    steps: [
      { t: 'سجل كامل', d: 'كل زبون تلقائياً: اسمه، هاتفه، مدينته، عدد الطلبات، إجمالي المشتريات، مستوى الثقة، نقاط الولاء.' },
      { t: 'تواصل مباشر', d: 'من صفحة أي زبون، اضغط "راسل عبر واتساب" للتواصل المباشر. كل سجل المحادثات محفوظ.' },
      { t: 'نقاط الولاء', d: 'كل 10 دراهم = نقطة ولاء. الزبون يجمع نقاطاً تلقائياً. يمكنه استبدالها بخصومات.' },
      { t: 'مستوى الثقة', d: 'يقاس تلقائياً من تاريخ الطلبات وسرعة الدفع. الزبائن ذوي الثقة العالية يظهرون بعلامة VIP.' },
    ],
    relatedIds: ['orders', 'messages', 'coupons'],
  },
  {
    id: 'marketing', icon: Megaphone, title: 'التسويق والنشر', tagline: 'انشر منتجاتك على كل المنصات',
    color: '#EC4899', category: 'communicate', difficulty: 'intermediate', timeToLearn: '5 دقائق',
    page: 'banner',
    steps: [
      { t: 'استوديو البانرات', d: 'صمم إعلانات وبوستات احترافية جاهزة للنشر. اختر من قوالب جاهزة أو اكتب برومبت مخصص.' },
      { t: 'نشر تلقائي', d: 'انشر مباشرة على صفحتك في فيسبوك أو حساب انستغرام. الصورة والتعليق يجهزان تلقائياً.' },
      { t: 'هاشتاغات ذكية', d: 'الذكاء الاصطناعي يقترح أفضل الهاشتاغات لمنتجك — بالعربية، الدارجة، الفرنسية، والإنجليزية.' },
      { t: 'جدولة المنشورات', d: 'جهز منشوراتك مقدماً وانشرها في الأوقات المثالية تلقائياً.' },
    ],
    relatedIds: ['banner', 'connections', 'ai'],
  },

  // ── AVANCÉ ──
  {
    id: 'ai', icon: Bot, title: 'الذكاء الاصطناعي', tagline: 'مساعدك الذكي الذي يعمل 24 ساعة',
    color: '#7C3AED', category: 'advanced', difficulty: 'intermediate', timeToLearn: '5 دقائق',
    page: 'connections',
    steps: [
      { t: 'اختيار مزود AI', d: 'ادعم 4 مزودين: OpenAI (GPT-4o)، Google Gemini (مجاني)، Claude (Anthropic)، DeepSeek (الأرخص للعربية).' },
      { t: 'الحصول على مفتاح مجاني', d: 'Google Gemini مجاني تماماً — سجل بحساب Google واحصل على مفتاح في دقيقتين. مثالي للبدء.' },
      { t: 'البائع الآلي', d: 'بمجرد ربط AI، المساعد: يجاوب الزبائن، يقترح منتجات، يجمع معلومات الطلب (اسم، هاتف، مدينة)، ويكتشف نية الشراء.' },
      { t: 'Fallback تلقائي', d: 'إذا فشل مزود، ينتقل تلقائياً للمزود التالي. إذا فشل الجميع، يعمل بمحاكاة محلية ذكية.' },
      { t: 'تخصيص الشخصية', d: 'من الإعدادات: غيّر شخصية المساعد، لغته، سرعة ردوده، ونسبة الخصم التلقائي الذي يقدمه.' },
    ],
    relatedIds: ['connections', 'messages', 'settings'],
  },
  {
    id: 'connections', icon: Link2, title: 'ربط الخدمات', tagline: 'اربط كل حساباتك — النظام يتكفل بالباقي',
    color: '#7C3AED', category: 'advanced', difficulty: 'intermediate', timeToLearn: '10 دقائق',
    page: 'connections',
    steps: [
      { t: 'الخدمات المتاحة', d: 'WhatsApp Business، Facebook Page، Instagram Business، OpenAI، Gemini، Claude، DeepSeek، Supabase، Cloudinary، TikTok.' },
      { t: 'ربط سريع', d: 'كل خدمة لها بطاقتها الخاصة مع: شرح "ما هذه الخدمة؟"، خطوات مرقمة، رابط مباشر للموقع الرسمي.' },
      { t: 'اختبار الاتصال', d: 'بعد إدخال أي مفتاح، اضغط "اتصال وتحقق" — النظام يتصل فعلياً بالخدمة ويتأكد من صحة المفتاح.' },
      { t: 'اختبار واتساب حقيقي', d: 'لـ WhatsApp: أدخل رقمك واضغط "إرسال" لتتلقى رسالة اختبار حقيقية. يؤكد أن كل شيء يعمل.' },
      { t: 'اختبار جميع الاتصالات', d: 'زر واحد يختبر كل الخدمات المرتبطة دفعة واحدة ويعرض النتائج.' },
    ],
    relatedIds: ['ai', 'delivery', 'settings'],
  },
  {
    id: 'settings', icon: Wrench, title: 'الإعدادات', tagline: 'اضبط متجرك بالكامل حسب احتياجاتك',
    color: '#6B7280', category: 'advanced', difficulty: 'intermediate', timeToLearn: '8 دقائق',
    page: 'settings',
    steps: [
      { t: 'معلومات المتجر', d: 'اسم المتجر، الوصف، اللوجو، رقم الهاتف، المدينة، العملة (MAD)، وساعات العمل.' },
      { t: 'إعدادات البيع', d: 'حدد: التوصيل الافتراضي، وسيلة الدفع (عند الاستلام/تحويل)، العملة، ورمز البلد.' },
      { t: 'إعدادات الذكاء الاصطناعي', d: 'اختر المزود، النموذج، الشخصية، اللغة، سرعة الرد، ونسبة الخصم التلقائي القصوى.' },
      { t: 'النسخ الاحتياطي', d: 'فعّل Supabase للنسخ الاحتياطي التلقائي. صورك وبياناتك بأمان حتى عند تحديث التطبيق.' },
      { t: 'تصدير واستيراد', d: 'صدّر كل بياناتك (منتجات، طلبات، زبائن) كملف JSON. استعده في أي وقت.' },
    ],
    relatedIds: ['connections', 'ai', 'delivery'],
  },

  // ── السوق المغربي الموحّد (ميزات جديدة) ──
  {
    id: 'marketplace', icon: Store, title: 'السوق المغربي الموحّد', tagline: 'سوق واحد يجمع منتجات وخدمات كل البائعين 🇲🇦',
    color: '#FF6A00', category: 'sell', difficulty: 'beginner', timeToLearn: '4 دقائق',
    page: '/market',
    steps: [
      { t: 'ما هو «السوق»؟', d: 'صفحة عامة يدخلها أي زائر بدون حساب، تعرض كل الإعلانات المعتمَدة (منتجات + خدمات) من بائعين محليين، مع فلترة حسب النوع والمدينة.' },
      { t: 'انشر إعلانك مجاناً', d: 'من زر «+ انشر إعلانك»، يملأ البائع نموذجاً بسيطاً: النوع، الاسم، السعر، المدينة، صورة، واسمه ورقم واتسابه — بدون إنشاء حساب.', tip: 'الصورة تُضغط تلقائياً على جهاز البائع قبل الإرسال — لا تُبطئ الموقع', action: { label: 'افتح السوق', page: '/market' } },
      { t: 'مراجعة قبل النشر', d: 'كل إعلان يصل بحالة «قيد المراجعة» ولا يظهر للعموم حتى توافق عليه الإدارة — لحماية جودة السوق وثقة الزبائن.' },
      { t: 'تواصل مباشر مع البائع', d: 'الزبون يضغط «تواصل» فينفتح واتساب البائع برسالة جاهزة عن الإعلان. الطلب يذهب مباشرة للبائع بلا وسيط.' },
    ],
    relatedIds: ['reviews', 'moderation', 'otp'],
  },
  {
    id: 'reviews', icon: Star, title: 'التقييمات والنجوم', tagline: 'ثقة الزبائن تُبنى بالنجوم ⭐',
    color: '#FFB800', category: 'sell', difficulty: 'beginner', timeToLearn: 'دقيقتان',
    page: '/market',
    steps: [
      { t: 'متوسط التقييم بارز', d: 'كل إعلان في السوق يعرض متوسط نجومه وعدد التقييمات مباشرة على البطاقة — يساعد الزبون يقرر بسرعة.' },
      { t: 'أضف تقييمك', d: 'من نافذة تفاصيل الإعلان، يضغط الزبون «أضف تقييمك»، يختار النجوم (1–5)، يكتب اسمه ورأيه — بدون حساب.', action: { label: 'جرّب في السوق', page: '/market' } },
      { t: 'تقييمات ذات معنى', d: 'التقييم مسموح على الإعلانات المعتمَدة فقط، ومحمي ضد التكرار المفرط — حتى تبقى النجوم صادقة.' },
    ],
    relatedIds: ['marketplace', 'otp'],
  },
  {
    id: 'otp', icon: Smartphone, title: 'تأكيد رقم الهاتف (OTP)', tagline: 'بائع موثَّق = سوق نظيف',
    color: '#25D366', category: 'sell', difficulty: 'intermediate', timeToLearn: 'دقيقتان',
    page: '/market',
    steps: [
      { t: 'لماذا التأكيد؟', d: 'لمنع الإعلانات الوهمية، يمكن طلب تأكيد رقم هاتف البائع عبر رمز يصله على واتساب قبل نشر إعلانه.' },
      { t: 'كيف يعمل؟', d: 'بعد ملء النموذج، يصل للبائع رمز من 6 أرقام على واتساب، يُدخِله، فيُرسَل إعلانه للمراجعة. بسيط وسريع.' },
      { t: 'اختياري وذكي', d: 'الميزة تعمل فقط عند تفعيل مُرسِل واتساب للمنصة؛ وإن لم يُفعَّل يبقى النشر يعمل كالمعتاد دون أي تعطيل.', tip: 'للمشرف: تُضبط عبر متغيّري PLATFORM_WHATSAPP_TOKEN و PLATFORM_WHATSAPP_PHONE_ID' },
    ],
    relatedIds: ['marketplace', 'connections'],
  },
  {
    id: 'moderation', icon: ShieldCheck, title: 'مراجعة الإعلانات', tagline: 'أنت حارس بوابة جودة السوق',
    color: '#7C3AED', category: 'advanced', difficulty: 'intermediate', timeToLearn: '3 دقائق',
    page: 'moderation',
    steps: [
      { t: 'قائمة المراجعة', d: 'صفحة «مراجعة الإعلانات» تعرض الإعلانات الواردة بتبويبات: قيد المراجعة، معتمَدة، مرفوضة، موقوفة.' },
      { t: 'موافقة أو رفض', d: 'راجِع تفاصيل كل إعلان وصورته، ثم اضغط «اعتماد» لنشره للعموم أو «رفض» مع سبب — يصل قرارك فوراً.', action: { label: 'افتح المراجعة', page: 'moderation' } },
      { t: 'إيقاف لاحق', d: 'يمكنك إيقاف أي إعلان معتمَد لاحقاً إن خالف الشروط، فيختفي من السوق مباشرة.' },
      { t: 'من يملك الصلاحية؟', d: 'تُحصر المراجعة في حساب مشرف المنصة (PLATFORM_ADMIN_EMAIL). وإن لم يُحدَّد، فأي حساب تاجر يستطيع المراجعة في وضع التجربة.' },
    ],
    relatedIds: ['marketplace', 'reviews', 'settings'],
  },
];

// ═══════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════
const FAQS: FAQ[] = [
  { q: 'هل يمكنني استخدام التطبيق بدون ربط أي خدمة خارجية؟', a: 'نعم! التطبيق يعمل كاملاً بدون أي ربط. الذكاء الاصطناعي يعمل بمحاكاة محلية ذكية، والطلبات تصل عبر واتساب العادي. الربط يضيف فقط ميزات متقدمة.', section: 'start' },
  { q: 'كيف أجعل الزبائن يطلبون من متجري؟', a: 'شارك رابط متجرك معهم (من زر "متجري" في الأعلى). يمكنهم تصفح المنتجات والخدمات وإرسال الطلب مباشرة.', section: 'start' },
  { q: 'هل يمكنني بيع منتجات وخدمات في نفس المتجر؟', a: 'نعم! المنصة صممت خصيصاً للمنتجات والخدمات معاً. كل نوع له حقوله وإعداداته الخاصة.', section: 'manage' },
  { q: 'كيف أربط واتساب بالمتجر؟', a: 'اذهب لصفحة "ربط الخدمات" ← بطاقة WhatsApp ← اتبع الخطوات المرقمة. تحتاج حساب Facebook Business (مجاني).', section: 'communicate' },
  { q: 'هل الذكاء الاصطناعي يكلفني شيئاً؟', a: 'Gemini من Google مجاني تماماً (1500 طلب يومياً). DeepSeek رخيص جداً (أقل من دولار لـ 1000 محادثة). OpenAI يبدأ من 5$.', section: 'advanced' },
  { q: 'ماذا يحدث إذا تعطل الذكاء الاصطناعي؟', a: 'النظام ينتقل تلقائياً لمزود آخر (Fallback). إذا فشل الجميع، يعمل بمحاكاة محلية — لن يتوقف الرد على الزبائن أبداً.', section: 'advanced' },
  { q: 'هل يمكنني تخصيص شكل متجري؟', a: 'نعم! من صفحة "الاستوديو" يمكنك تخصيص الألوان، الخطوط، الشعار، وصفحة الهبوط.', section: 'manage' },
  { q: 'هل التطبيق يعمل على الهاتف؟', a: 'نعم، التطبيق مصمم للهاتف أولاً (Mobile-First). كل الصفحات متجاوبة مع كل أحجام الشاشات.', section: 'start' },
  { q: 'كيف أحصل على نسخة احتياطية من بياناتي؟', a: 'اربط Supabase من صفحة الاتصالات للنسخ الاحتياطي التلقائي. أو استخدم زر "تصدير" من الإعدادات.', section: 'advanced' },
  { q: 'هل يمكنني استخدام أكثر من مزود AI في نفس الوقت؟', a: 'نعم! أدخل مفاتيح كل المزودين. النظام يستخدمهم بالترتيب الذي تحدده — إذا فشل الأول ينتقل للثاني تلقائياً.', section: 'advanced' },
  { q: 'ما الفرق بين «متجري» و«السوق»؟', a: '«متجري» صفحة خاصة بك تعرض منتجاتك أنت فقط. «السوق» صفحة عامة موحّدة تجمع إعلانات كل البائعين المحليين (منتجات وخدمات) بعد مراجعة الإدارة.', section: 'sell' },
  { q: 'هل يحتاج البائع حساباً لينشر في السوق؟', a: 'لا. يكفي ملء نموذج بسيط (الاسم، السعر، المدينة، صورة، واتساب). الإعلان يصل للمراجعة ثم يظهر للعموم بعد الاعتماد.', section: 'sell' },
  { q: 'كيف يقيّم الزبائن الإعلانات؟', a: 'من نافذة تفاصيل الإعلان، يختار الزبون عدد النجوم (1–5) ويكتب رأيه بلا حساب. يظهر متوسط النجوم على البطاقة لزيادة الثقة.', section: 'sell' },
  { q: 'كيف أراجع إعلانات السوق وأوافق عليها؟', a: 'من صفحة «مراجعة الإعلانات» في القائمة الجانبية: راجع الإعلانات قيد الانتظار ثم اعتمِد أو ارفض. الصلاحية لمشرف المنصة.', section: 'advanced' },
];

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

function DifficultyBadge({ level }: { level: GuideSection['difficulty'] }) {
  const config = {
    beginner: { label: 'مبتدئ', color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
    intermediate: { label: 'متوسط', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    advanced: { label: 'متقدم', color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  };
  const c = config[level];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', maxWidth: 400, width: '100%' }}>
      <Search size={15} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="ابحث في الدليل..."
        style={{
          width: '100%', padding: '12px 44px 12px 16px',
          borderRadius: 14, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)', color: '#FAFAFA',
          fontSize: 13, outline: 'none', fontFamily: 'inherit',
        }}
      />
      {value && (
        <button onClick={() => onChange('')} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function GuidePage() {
  const { setPage } = useStore();
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [showFAQ, setShowFAQ] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'الكل', icon: '📚' },
    { id: 'start', label: 'البداية', icon: '🚀' },
    { id: 'manage', label: 'إدارة', icon: '📦' },
    { id: 'sell', label: 'بيع', icon: '💰' },
    { id: 'communicate', label: 'تواصل', icon: '💬' },
    { id: 'advanced', label: 'متقدم', icon: '⚙️' },
  ];

  const cur = SECTIONS.find(s => s.id === active);

  // Filter sections
  const filteredSections = SECTIONS.filter(s => {
    if (filterCat !== 'all' && s.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        s.steps.some(step => step.t.toLowerCase().includes(q) || step.d.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter FAQ
  const filteredFAQs = FAQS.filter(f => {
    if (filterCat !== 'all' && f.section !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    }
    return true;
  });

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/guide?id=${id}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // ── DETAIL VIEW ──
  if (cur) {
    const Icon = cur.icon;
    const relatedSections = (cur.relatedIds || []).map(id => SECTIONS.find(s => s.id === id)).filter(Boolean) as GuideSection[];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, margin: '0 auto', padding: '0 4px' }}>
        {/* Back */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setActive(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
            <ChevronLeft size={16} /> رجوع للدليل
          </button>
          <button onClick={() => copyLink(cur.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: copiedId === cur.id ? '#22C55E' : '#999', fontSize: 11, cursor: 'pointer' }}>
            {copiedId === cur.id ? <CheckCircle2 size={12} /> : <Link2 size={12} />}
            {copiedId === cur.id ? 'تم النسخ' : 'نسخ الرابط'}
          </button>
        </div>

        {/* Hero */}
        <div style={{
          padding: '32px 28px', borderRadius: 24,
          background: `linear-gradient(135deg, ${cur.color}12, ${cur.color}04)`,
          border: `1px solid ${cur.color}20`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${cur.color}18, transparent 70%)` }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${cur.color}15`, border: `2px solid ${cur.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: cur.color, flexShrink: 0,
              }}>
                <Icon size={28} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FAFAFA', marginBottom: 4 }}>{cur.title}</h1>
                <p style={{ fontSize: 13, color: '#999', margin: 0 }}>{cur.tagline}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <DifficultyBadge level={cur.difficulty} />
              <span style={{ fontSize: 11, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {cur.timeToLearn}
              </span>
              <span style={{ fontSize: 11, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={11} /> {cur.steps.length} خطوات
              </span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#999', marginBottom: 4 }}>📋 الخطوات</h3>
          {cur.steps.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, padding: '20px',
              borderRadius: 16, background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: `${cur.color}15`, color: cur.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA', marginBottom: 6 }}>{s.t}</p>
                <p style={{ fontSize: 13, color: '#999', lineHeight: 1.7, marginBottom: s.tip ? 10 : 0 }}>{s.d}</p>
                {s.tip && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,106,0,0.05)', border: '1px solid rgba(255,106,0,0.1)', fontSize: 12, color: '#FF9A55', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <Zap size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{s.tip}</span>
                  </div>
                )}
                {s.action && (
                  <button onClick={() => { const p = s.action!.page; if (!p) return; p.startsWith('/') ? window.open(p, '_blank') : setPage(p as any); }}
                    style={{
                      marginTop: 10, padding: '8px 16px', borderRadius: 10,
                      background: `${cur.color}15`, border: `1px solid ${cur.color}30`,
                      color: cur.color, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    <ArrowRight size={13} /> {s.action.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Related */}
        {relatedSections.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#999', marginBottom: 12 }}>🔗 ذات صلة</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {relatedSections.map(rs => {
                const RIcon = rs.icon;
                return (
                  <button key={rs.id} onClick={() => setActive(rs.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '14px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${rs.color}12`, border: `1px solid ${rs.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rs.color, flexShrink: 0 }}>
                      <RIcon size={18} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#FAFAFA' }}>{rs.title}</div>
                    <ChevronLeft size={14} style={{ marginRight: 'auto', color: '#666' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        {cur.page && (
          <button onClick={() => { const p = cur.page!; p.startsWith('/') ? window.open(p, '_blank') : setPage(p as any); }}
            style={{
              alignSelf: 'flex-start', padding: '14px 28px', borderRadius: 14,
              background: `linear-gradient(135deg, ${cur.color}, ${cur.color}CC)`,
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 8px 24px ${cur.color}30`,
            }}>
            <ArrowLeft size={16} /> اذهب إلى {cur.title}
          </button>
        )}
      </div>
    );
  }

  // ── OVERVIEW ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto', padding: '0 4px' }}>
      {/* Header */}
      <div style={{
        padding: 'clamp(28px, 4vw, 40px) clamp(20px, 3vw, 32px)',
        borderRadius: 28,
        background: 'linear-gradient(135deg, rgba(255,106,0,0.08), rgba(124,58,237,0.05), rgba(0,210,179,0.03))',
        border: '1px solid rgba(255,106,0,0.12)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,0,0.12), transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,106,0,0.06)', border: '1px solid rgba(255,106,0,0.15)', marginBottom: 16 }}>
            <BookOpen size={14} color="#FF6A00" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FF9A55' }}>دليل الاستخدام الكامل</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, color: '#FAFAFA', lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.02em' }}>
            تعلّم كل شيء عن <span style={{ color: '#FF6A00' }}>AMANZINE</span>
          </h1>
          <p style={{ fontSize: 14, color: '#999', maxWidth: 560, lineHeight: 1.8 }}>
            منصة متكاملة لبيع المنتجات والخدمات — مع ذكاء اصطناعي، واتساب، توصيل، والمزيد.
            اختر قسماً للبدء، أو استخدم البحث للوصول السريع.
          </p>
        </div>
      </div>

      {/* Feature Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['🤖 ذكاء اصطناعي', '💬 واتساب', '📘 فيسبوك', '📸 انستغرام', '🎵 تيكتوك', '🚚 توصيل', '👥 CRM', '🏪 متجر رقمي', '🎟️ كوبونات', '☁️ سحابة'].map(p => (
          <span key={p} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: '#999', fontWeight: 600 }}>
            {p}
          </span>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} />
        <div style={{ display: 'flex', gap: 4 }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setFilterCat(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 99,
                background: filterCat === cat.id ? 'rgba(255,106,0,0.1)' : 'rgba(255,255,255,0.02)',
                border: filterCat === cat.id ? '1px solid rgba(255,106,0,0.25)' : '1px solid rgba(255,255,255,0.04)',
                color: filterCat === cat.id ? '#FF6A00' : '#999', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap', fontFamily: 'inherit',
              }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections Grid */}
      {filteredSections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>لا توجد نتائج لـ "{search}"</p>
          <button onClick={() => { setSearch(''); setFilterCat('all'); }} style={{ marginTop: 10, padding: '8px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#999', fontSize: 12, cursor: 'pointer' }}>
            مسح البحث
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filteredSections.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => { setActive(s.id); setSearch(''); }}
                style={{
                  textAlign: 'right', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  padding: '22px 20px', borderRadius: 18,
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = `${s.color}40`;
                  e.currentTarget.style.boxShadow = `0 16px 40px ${s.color}10`;
                  e.currentTarget.style.background = `rgba(255,255,255,0.03)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${s.color}10`, border: `1.5px solid ${s.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: s.color,
                  }}>
                    <Icon size={24} />
                  </div>
                  <DifficultyBadge level={s.difficulty} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#FAFAFA', marginBottom: 4 }}>{s.title}</p>
                  <p style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>{s.tagline}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: s.color, fontSize: 11, fontWeight: 700 }}>
                    <CheckCircle2 size={12} /> {s.steps.length} خطوات
                  </div>
                  <span style={{ fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} /> {s.timeToLearn}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* FAQ Section */}
      <div style={{
        marginTop: 8, borderRadius: 20,
        background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}>
        <button onClick={() => setShowFAQ(!showFAQ)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', background: 'none', border: 'none',
            color: '#FAFAFA', fontSize: 16, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HelpCircle size={20} color="#FF6A00" />
            <span>أسئلة شائعة</span>
            <span style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>({FAQS.length})</span>
          </div>
          <ChevronDown size={18} style={{ transform: showFAQ ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>

        {showFAQ && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '4px 20px 20px' }}>
            {filteredFAQs.length === 0 ? (
              <p style={{ padding: '20px 0', textAlign: 'center', color: '#666', fontSize: 13 }}>لا توجد أسئلة تطابق بحثك</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredFAQs.map((faq, i) => (
                  <div key={i} style={{ borderBottom: i < filteredFAQs.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none' }}>
                    <button onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 0', background: 'none', border: 'none',
                        color: expandedFAQ === i ? '#FF6A00' : '#FAFAFA',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'right',
                      }}>
                      {faq.q}
                      <ChevronDown size={14} style={{ transform: expandedFAQ === i ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0, marginRight: 12 }} />
                    </button>
                    {expandedFAQ === i && (
                      <div style={{ padding: '0 0 14px', fontSize: 12, color: '#999', lineHeight: 1.7 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div style={{
        padding: '24px', borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(255,106,0,0.03))',
        border: '1px solid rgba(124,58,237,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, color: '#999', fontWeight: 600 }}>⚡ وصول سريع:</span>
        {[
          { label: 'إضافة منتج', page: 'products' as const },
          { label: 'الطلبات', page: 'orders' as const },
          { label: 'ربط الخدمات', page: 'connections' as const },
          { label: 'االإعدادات', page: 'settings' as const },
        ].map(link => (
          <button key={link.page} onClick={() => setPage(link.page)}
            style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#FAFAFA', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {link.label} <ArrowRight size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}