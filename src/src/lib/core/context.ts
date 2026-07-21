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
  state: { openOrders: number; unread: number; hasBusiness: boolean };
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
    state: { openOrders, unread, hasBusiness: caps.store || caps.services },
  };
}
