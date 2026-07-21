// ============================================================
// SERVICES — الطبقة الرابعة (CORE → SERVICES → MODULES → BRAINS).
//   قدرات مشتركة يستعملها كثير من الصفحات: ذكاء الصورة، الوصف، QR، الدفع،
//   الخرائط، الإشعارات، المشاركة. ليست Modules ولا Brains — إنها Services.
//   الصفحة تصبح «مجموعة قدرات» تستدعي هذه الخدمات، لا كودًا مستقلًّا.
// ============================================================

export type ServiceKind = 'ai' | 'media' | 'share' | 'commerce' | 'geo' | 'system';

export interface AppService {
  id: string;          // معرّف ثابت: 'ai.description'
  label: string;       // بلغة المستخدم
  kind: ServiceKind;
  outcome: string;     // ماذا يُنتج هذا القدرة فعلًا
  needs?: string[];    // مدخلات يحتاجها (لِلتحقّق قبل الاستدعاء)
  provides?: string;   // حقل يقدر أن يملأه تلقائيًّا (للـ Decision Engine)
}

const registry = new Map<string, AppService>();

export function registerService(s: AppService): void {
  registry.set(s.id, s);
}
export function getService(id: string): AppService | undefined {
  return registry.get(id);
}
export function getServices(ids: string[] = []): AppService[] {
  return ids.map(id => registry.get(id)).filter(Boolean) as AppService[];
}
export function allServices(): AppService[] {
  return Array.from(registry.values());
}
export function servicesByKind(kind: ServiceKind): AppService[] {
  return allServices().filter(s => s.kind === kind);
}

// ── قدرات AMANZINE المشتركة (منسّقة من الكود الحقيقيّ) ──
const SERVICES: AppService[] = [
  // — ذكاء اصطناعيّ —
  { id: 'ai.description', label: 'كتابة وصف بالذكاء', kind: 'ai', outcome: 'يولّد وصفًا احترافيًّا من العنوان والفئة', needs: ['title'], provides: 'desc' },
  { id: 'ai.removeBg',    label: 'إزالة الخلفية',      kind: 'ai', outcome: 'يعزل المنتج على خلفيّة نظيفة', needs: ['photos'] },
  { id: 'ai.enhance',     label: 'تحسين الصورة',       kind: 'ai', outcome: 'يرفع جودة/إضاءة الصورة', needs: ['photos'] },
  { id: 'ai.reply',       label: 'ردّ ذكيّ',            kind: 'ai', outcome: 'يقترح ردًّا على الزبون بالدارجة' },
  { id: 'ai.price',       label: 'اقتراح الثمن',       kind: 'ai', outcome: 'يقترح ثمنًا من السوق المشابه', provides: 'price' },

  // — وسائط/تصميم —
  { id: 'design.image',   label: 'تصميم الصورة',       kind: 'media', outcome: 'يفتح محرّر الصورة (خلفيّة/نصّ/إطار)', needs: ['photos'] },
  { id: 'brand.logo',     label: 'إضافة اللوغو',       kind: 'media', outcome: 'يضع شعارك على الصورة', needs: ['photos'] },

  // — مشاركة/نشر —
  { id: 'share.whatsapp', label: 'مشاركة واتساب',      kind: 'share', outcome: 'يفتح واتساب برسالة ورابط جاهزين' },
  { id: 'share.social',   label: 'مشاركة فيسبوك/إنستغرام', kind: 'share', outcome: 'ينسخ منشورًا جاهزًا للنشر' },
  { id: 'share.qr',       label: 'رمز QR',             kind: 'share', outcome: 'يولّد QR يفتح الصفحة/المنتج' },

  // — تجارة —
  { id: 'pay.checkout',   label: 'الدفع/الطلب',        kind: 'commerce', outcome: 'يبدأ عمليّة الطلب أو الدفع', needs: ['price'] },
  { id: 'pay.wallet',     label: 'المحفظة',            kind: 'commerce', outcome: 'يتابع الرصيد والمعاملات' },

  // — خرائط/موقع —
  { id: 'geo.city',       label: 'تحديد المدينة',      kind: 'geo', outcome: 'يحدّد مدينتك للنتائج القريبة' },
  { id: 'geo.map',        label: 'الخريطة',            kind: 'geo', outcome: 'يعرض الموقع على الخريطة' },

  // — نظام —
  { id: 'notify.push',    label: 'الإشعارات',          kind: 'system', outcome: 'يرسل تنبيهًا عند حدث مهمّ' },
];

SERVICES.forEach(registerService);
