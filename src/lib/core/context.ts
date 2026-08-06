import { getCapabilities, type Capabilities, type DomainInput } from '../domain';

// ============================================================
// Context Engine — «من هو المستخدم الآن؟» قبل تفسير طلبه.
// نفس الجملة «بغيت صباط» تختلف حسب: من أنت · أين · متى · ماذا تفعل.
// هذه الطبقة تسبق الـ Need في الرحلة: Identity → Context → Need.
// ============================================================

export interface UserContext {
  identity: { authed: boolean; isSeller: boolean; capabilities: Capabilities };
  place: { city?: string };
  time: { hour: number; lateNight: boolean; likelyClosed: boolean };
  state: {
    openOrders: number; unread: number; hasBusiness: boolean;
    /**
     * آخرُ منتوجٍ أضافه — **ما تشير إليه «آخر منتوج» و«هاد المنتوج»**.
     *
     *   بلا هذا يبقى المؤشِّرُ مؤشِّرًا لا يشير إلى شيء، فيُسأل صاحبُه
     *   «أيّ منتوج؟» بعد أن عيّنه. والمعرفةُ كانت حاضرةً في `DomainInput`
     *   طوالَ الوقت — لم يكن ينقص إلّا أن تُقرأ.
     */
    lastProduct?: { id: string; name: string };
  };
}

export function buildContext(input: DomainInput, opts?: { authed?: boolean }): UserContext {
  const caps = getCapabilities(input);
  const hour = new Date().getHours();
  const openOrders = input.orders.filter(o => ['pending', 'approved', 'processing'].includes(o.status)).length;
  const unread = input.conversations.reduce((s, c: any) => s + (c.unread || 0), 0);
  return {
    identity: { authed: !!opts?.authed, isSeller: caps.sell, capabilities: caps },
    place: { city: (input.settings as any)?.brand?.city },
    time: { hour, lateNight: hour >= 22 || hour < 6, likelyClosed: hour >= 22 || hour < 7 },
    state: { openOrders, unread, hasBusiness: caps.store || caps.services, lastProduct: lastProductOf(input) },
  };
}

/**
 * آخرُ منتوجٍ أضافه — بالتاريخ لا بترتيب المصفوفة.
 *
 *   ترتيبُ المصفوفة يأتي من الخادم وقد ينقلب بتغيير استعلامٍ لا علاقةَ له
 *   بنا، فيصير «آخر منتوج» أوّلَه بلا أن يتغيّر سطرٌ هنا. والتاريخُ مكتوبٌ
 *   في المنتوج نفسِه (`createdAt`) — فيُقرأ منه.
 *
 *   ومَن لا تاريخَ له لا يُقصى: نُبقيه بأضعف رتبةٍ حتّى لا يختفي كتالوجٌ
 *   قديمٌ كُتب قبل أن يوجد الحقل.
 */
function lastProductOf(input: DomainInput): { id: string; name: string } | undefined {
  const list = Array.isArray(input.products) ? input.products : [];
  let best: any;
  let bestAt = -1;
  for (const p of list) {
    if (!p?.id) continue;
    const at = Date.parse(p.createdAt || '') || 0;
    if (best === undefined || at > bestAt) { best = p; bestAt = at; }
  }
  return best ? { id: String(best.id), name: String(best.name || '').trim() } : undefined;
}
