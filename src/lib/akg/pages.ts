// ============================================================
// واصفات الصفحات (Self-descriptions) — كلّ صفحة تُعرّف نفسها للعقل.
//   تُطابق القدرات الحقيقيّة في الكود (حقول ProductsPage، أفعال المشاركة،
//   محرّر الصورة، QR…). إضافة مجال/صفحة جديدة = واصف هنا، بلا مسّ القلب.
// ============================================================

import { registerPage } from './registry';
import { baseFields, UNIVERSAL_KEYS } from '../catalog';

// ── صفحة المنتجات — المتجر: أضف/عدّل/شارك المنتجات ──
registerPage({
  page: 'products',
  title: 'المنتجات',
  purpose: 'تضيف منتجاتك وتنشرها وتشاركها — بصور واحترافيّة',
  intents: ['sell', 'create_store', 'manage'],
  entities: ['product'],
  modes: ['conversation', 'form', 'basics'],
  module: 'products',
  services: ['ai.description', 'ai.removeBg', 'design.image', 'brand.logo', 'share.whatsapp', 'share.social', 'share.qr', 'ai.price'],
  next: 'شارك المنتج على واتساب لتصل لزبنائك',
  keywords: ['بيع', 'منتج', 'سلعة', 'produit', 'متجر', 'catalogue'],
  // الحقولُ من `src/lib/catalog.ts` — **نفسُها التي تعرضها الاستمارة**.
  //   كانت مكتوبةً هنا يدويًّا (٩ حقولٍ عامّة) ومكتوبةً هناك حسب الفئة (٤٠+)،
  //   فكان المساعدُ يسأل عن «الوصف» والاستمارةُ تسأل عن «الخامة» و«الموسم».
  fields: baseFields('product').map(f => ({
    ...f, kind: f.kind as any,
    ...(f.key === 'photos' ? { evidence: true } : {}),
  })),
  actions: [
    { key: 'add',      label: 'أضف منتجًا',       outcome: 'يفتح نموذج منتج جديد', primary: true },
    { key: 'design',   label: 'صمّم صورة',        outcome: 'يفتح محرّر الصورة (خلفيّة/لوغو/نصّ)' },
    { key: 'logo',     label: 'أضف اللوغو',       outcome: 'يضع شعارك على صورة المنتج' },
    { key: 'wa',       label: 'شارك على واتساب',  outcome: 'يفتح واتساب برسالة ورابط جاهزين' },
    { key: 'social',   label: 'شارك (فيسبوك/إنستغرام)', outcome: 'ينسخ منشورًا جاهزًا للنشر' },
    { key: 'qr',       label: 'رمز QR',           outcome: 'يولّد QR يفتح صفحة المنتج' },
    { key: 'edit',     label: 'عدّل',             outcome: 'يفتح المنتج للتعديل' },
  ],
});

// ── النشر الكوني — «قل ما تريد، نبني الإعلان» ──
registerPage({
  page: 'publish',
  title: 'النشر الكوني',
  purpose: 'تكتب حاجتك بجملة، فيبني العقل الإعلان ويسأل ما ينقص فقط',
  intents: ['sell', 'create_service', 'rent'],
  entities: ['product', 'vehicle', 'realEstate', 'service', 'rental'],
  modes: ['conversation', 'form', 'basics'],
  module: 'products',
  services: ['ai.description', 'ai.enhance', 'design.image', 'ai.price', 'geo.city', 'share.whatsapp', 'share.social'],
  next: 'شارك الإعلان بعد نشره',
  keywords: ['نشر', 'إعلان', 'بيع', 'كراء', 'خدمة', 'publier', 'annonce'],
  // المفاتيحُ الكونيّةُ من `catalog.ts` — كانت مكتوبةً هنا بيدٍ ثالثة، فقالت
  // «العنوان» و«الثمن» بينما تقول الاستمارةُ «اسم المنتج» و«الثمن (درهم)».
  // حقلٌ واحدٌ باسمين يجعل التاجرَ يظنّهما حقلين.
  fields: baseFields('product')
    .filter(f => (UNIVERSAL_KEYS as readonly string[]).includes(f.key))
    .map(f => ({
      ...f, kind: f.kind as any,
      ...(f.key === 'photos' ? { evidence: true } : {}),
    })),
  actions: [
    { key: 'publish', label: 'انشر الآن',     outcome: 'ينشر الإعلان ويعطيك رابطًا للمشاركة', primary: true },
    { key: 'assume',  label: 'فكّر قبل السؤال', outcome: 'يفترض ما يقدر عليه ويؤكّده معك' },
    { key: 'share',   label: 'شارك',          outcome: 'يفتح المشاركة بعد النشر' },
  ],
});

// ── الطلبات — إدارة ما بِيع ──
registerPage({
  page: 'orders',
  title: 'الطلبات',
  purpose: 'تتابع طلبات زبنائك وحالتها وتوصيلها',
  intents: ['manage'],
  modes: ['form'],
  module: 'products',
  services: ['ai.reply', 'notify.push', 'pay.checkout'],
  next: 'أكّد الطلب ثمّ افتح التوصيل',
  keywords: ['طلب', 'طلبات', 'زبون', 'commande', 'توصيل'],
  fields: [
    { key: 'status',   label: 'الحالة',    kind: 'select' },
    { key: 'customer', label: 'الزبون',    kind: 'text' },
    { key: 'total',    label: 'المجموع',   kind: 'money' },
  ],
  actions: [
    { key: 'confirm',  label: 'أكّد الطلب',  outcome: 'ينقل الطلب لِـ«مقبول»', primary: true },
    { key: 'ship',     label: 'أرسل',       outcome: 'يفتح التوصيل' },
    { key: 'cancel',   label: 'ألغِ',       outcome: 'يلغي الطلب' },
  ],
});

// ── المساعد — عقل المحادثة في كلّ مكان ──
registerPage({
  page: 'assistant',
  title: 'المساعد',
  purpose: 'تسأل بلغتك فيفهم حاجتك ويقودك للفعل المناسب',
  intents: ['find_pro', 'buy', 'unknown', 'urgent'],
  modes: ['conversation'],
  module: 'professions',
  services: ['ai.reply', 'geo.city'],
  next: 'خذني للصفحة التي تُلبّي حاجتي',
  keywords: ['مساعد', 'سؤال', 'assistant', 'بغيت'],
  fields: [
    { key: 'query', label: 'حاجتك', kind: 'text', essential: true },
  ],
  actions: [
    { key: 'ask',    label: 'اسأل',       outcome: 'يفهم النيّة ويقترح الخطوة', primary: true },
    { key: 'route',  label: 'خذني هناك',  outcome: 'يفتح الصفحة التي تُلبّي حاجتك' },
  ],
});

// ── المحفظة — المال والمعاملات ──
registerPage({
  page: 'wallet',
  title: 'المحفظة',
  purpose: 'تتابع رصيدك ومعاملاتك ومدفوعاتك',
  intents: ['manage'],
  modes: ['form'],
  services: ['pay.wallet', 'pay.checkout', 'notify.push'],
  next: 'اعرض المعاملات أو اسحب رصيدك',
  keywords: ['محفظة', 'رصيد', 'دفع', 'portefeuille', 'فلوس'],
  fields: [
    { key: 'balance', label: 'الرصيد',    kind: 'money' },
    { key: 'method',  label: 'طريقة الدفع', kind: 'select' },
  ],
  actions: [
    { key: 'view',     label: 'اعرض المعاملات', outcome: 'يعرض سجلّ المعاملات', primary: true },
    { key: 'withdraw', label: 'اسحب',          outcome: 'يبدأ طلب سحب' },
  ],
});

// ── مركز المعرفة (Studio) — رؤية العقل نفسه (أدمن) ──
registerPage({
  page: 'knowledge',
  title: 'مركز المعرفة',
  purpose: 'ترى كيف يفكّر التطبيق: رحلات المستخدمين، ما تعلّمه، وما يعرفه عن نفسه',
  intents: ['manage'],
  modes: ['form'],
  services: ['notify.push'],
  next: 'راجع خريطة المعرفة أو اعتمد ما تعلّمه العقل',
  keywords: ['معرفة', 'studio', 'أدمن', 'تعلّم', 'رحلات'],
  fields: [],
  actions: [
    { key: 'journeys', label: 'رحلات المستخدمين', outcome: 'يعرض تحليلات الرحلات وأوقات الوصول', primary: true },
    { key: 'akg',      label: 'خريطة معرفة التطبيق', outcome: 'يعرض ما يعرفه العقل عن كلّ صفحة' },
    { key: 'candidates', label: 'المعرفة المرشّحة', outcome: 'يعرض ما تعلّمه التطبيق لاعتماده' },
  ],
});
