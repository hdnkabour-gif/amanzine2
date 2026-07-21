import type { Page } from '../types';

// ============================================================
// domain — «طبقة منطقية» موحّدة فوق البيانات الحالية (Products/Orders/…)،
// بلا أي تغيير في القاعدة. تعرض مفاهيم AMANZINE (Capability · Offer ·
// Activity · اقتراحات النموّ) من نفس البيانات الموجودة. كل ما نبنيه لاحقًا
// (فضائي، البطاقات الذكية…) يقرأ من هنا، فيبقى مصدر واحد للحقيقة.
// إضافيّ بالكامل: لا يحذف ولا يبدّل شيئًا مما هو قائم.
// ============================================================

export interface DomainInput {
  products: any[];
  orders: any[];
  customers: any[];
  conversations: any[];
  settings: any;
}

// قدرات الشخص (لا أدوار): تُشتقّ من نشاطه الفعليّ، وتُفتح تدريجيًّا.
export interface Capabilities {
  buy: boolean; sell: boolean; store: boolean; services: boolean; bookings: boolean;
}
export function getCapabilities(s: DomainInput): Capabilities {
  const published = s.products.filter(p => p.status === 'published').length;
  const hasServices = s.products.some(p => (p as any).type === 'service');
  return {
    buy: true,                                                   // كل إنسان يشتري
    sell: s.products.length > 0 || s.orders.length > 0,
    store: published > 0,
    services: hasServices,
    bookings: hasServices,
  };
}

// Offer موحّد: منتج/خدمة (وقابل للتوسّع لعقار/سيارة/… لاحقًا) بنفس الشكل.
export interface Offer { id: string; type: 'product' | 'service'; title: string; price?: number; status: string; page: Page }
export function getOffers(s: DomainInput): Offer[] {
  return s.products.map(p => ({
    id: String(p.id),
    type: ((p as any).type === 'service' ? 'service' : 'product') as 'product' | 'service',
    title: p.name,
    price: p.price,
    status: p.status,
    page: ((p as any).type === 'service' ? 'services' : 'products') as Page,
  }));
}

// Activity موحّد: كل ما يحدث (طلب/رسالة) في خيط واحد — أساس «نشاطي/تعاملاتي».
export interface Activity { id: string; kind: 'order' | 'message'; title: string; at: number; page: Page }
export function getActivities(s: DomainInput): Activity[] {
  const cur = s.settings?.brand?.currency || '';
  const acts: Activity[] = [];
  for (const o of s.orders) acts.push({ id: `o-${o.id}`, kind: 'order', title: `طلب من ${o.customerName || 'زبون'} · ${Number(o.total || 0).toLocaleString()} ${cur}`, at: Date.parse(o.createdAt) || 0, page: 'orders' });
  for (const c of s.conversations) acts.push({ id: `c-${c.id}`, kind: 'message', title: `رسالة من ${c.customerName || 'زبون'}`, at: Date.parse(c.messages?.[c.messages.length - 1]?.timestamp || c.createdAt) || 0, page: 'conversations' });
  return acts.sort((a, b) => b.at - a.at);
}

// اقتراحات النموّ (Progressive Platform): الميزة تبحث عن المستخدم.
// كلٌّ له سبب واضح ووجهة حقيقية داخل التطبيق.
export interface Suggestion { id: string; text: string; cta: string; page: Page; why: string }
export function getProactive(s: DomainInput): Suggestion[] {
  const out: Suggestion[] = [];
  const published = s.products.filter(p => p.status === 'published').length;

  // ملاحظة: «اربط السحابة» و«الإشعارات» لهما بانرات مخصّصة أعلى فضائي —
  // لا نكرّرهما هنا. نبقي على اقتراحات النموّ غير المعروضة في مكان آخر.
  if (s.orders.length >= 3) out.push({ id: 'delivery', text: 'وليتي كتستقبل طلبات بزّاف — تفعّل التوصيل؟', cta: 'فعّل', page: 'delivery', why: 'لأنك تجاوزت ٣ طلبات' });
  if (published > 0) out.push({ id: 'wa', text: 'اربط واتساب باش الزبناء يوصلو ليك مباشرة.', cta: 'اربط', page: 'connections', why: 'لأن عندك منتجات منشورة' });
  if (s.conversations.length >= 3) out.push({ id: 'ai', text: 'عندك محادثات بزّاف — فعّل الردود الذكية.', cta: 'فعّل', page: 'connections', why: 'لأن رسائلك تزايدت' });
  if (!s.settings?.brand?.phone) out.push({ id: 'phone', text: 'زيد رقم تيليفونك فالمتجر.', cta: 'زيد', page: 'settings', why: 'لأن الرقم ناقص' });

  return out;
}
