// ============================================================
// Entity — «الحساب Entity لا Role». لا نسأل المستخدم «شنو بغيتي تدير؟»؛ نستنتج
//   نوعه (بائع/مزوّد/زبون) من أوّل حاجة يكتبها عبر النيّة (parseNeed) ومن أفعاله
//   المتراكمة (experienceLog). شكل البيانات future-proof (identity + capabilities
//   + assets/catalog لاحقًا) لكن لا نملأ الآن إلّا القدرات المستنتَجة — بلا محرّك،
//   بلا تخزين جديد. قرار تصميم (Category A) لا ميزة.
// ============================================================

import { getInteractions } from './experienceLog';

// نيّات «يَعرِض» مقابل «يَطلب» — نفس مخرجات parseNeed (src/lib/needEngine.ts).
const OFFER = new Set(['sell', 'create_service', 'create_store', 'rent']);
const REQUEST = new Set(['buy', 'find_pro', 'book', 'urgent']);

export type EntityType = 'seller' | 'provider' | 'consumer' | 'new';

export interface EntityProfile {
  type: EntityType;                 // النوع المستنتَج (لا المفروض)
  capabilities: {                   // تنمو من الأفعال، لا تُعلَن عند التسجيل
    canSell: boolean;
    canServe: boolean;
    canRent: boolean;
    isConsumer: boolean;
  };
  signals: { offers: number; requests: number };
  reason: string;                   // تفسير الاستنتاج (شفافيّة)
}

// يستنتج ملفّ الـ Entity من سلوك المستخدم المسجَّل — لا من سؤال.
export function deriveEntity(log = getInteractions()): EntityProfile {
  let offers = 0, requests = 0, sell = 0, serve = 0, rent = 0;
  for (const i of log) {
    const it = i.intent;
    if (OFFER.has(it)) { offers++; if (it === 'sell' || it === 'create_store') sell++; if (it === 'create_service') serve++; if (it === 'rent') rent++; }
    else if (REQUEST.has(it)) requests++;
  }

  let type: EntityType = 'new';
  if (offers === 0 && requests === 0) type = 'new';
  else if (serve >= sell && serve > 0) type = 'provider';
  else if (offers > requests) type = 'seller';
  else type = 'consumer';

  const reason = type === 'new'
    ? 'لا سلوك بعد — يُستنتَج من أوّل حاجة يكتبها'
    : `عرَض ${offers} · طلب ${requests} — استُنتِج من السلوك، لا من سؤال`;

  return {
    type,
    capabilities: { canSell: sell > 0, canServe: serve > 0, canRent: rent > 0, isConsumer: requests > 0 },
    signals: { offers, requests },
    reason,
  };
}

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  seller: 'بائع', provider: 'مزوّد خدمة', consumer: 'زبون', new: 'جديد (لم يُستنتَج بعد)',
};
