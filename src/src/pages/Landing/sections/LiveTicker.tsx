import { type Lang } from '../../../i18n/translations';
import { C } from '../theme';
import { useLanding } from '../context';
import { CITY_FALLBACK } from '../data';

// نصوص مُحلّية للشريط (5 لغات) — قصيرة وخاصة بهذا القسم
const TXT: Record<Lang, { live: string; beFirst: string }> = {
  ar:     { live: 'مباشر الآن', beFirst: 'كن أول تاجر في' },
  darija: { live: 'مباشر دابا', beFirst: 'كن أول تاجر ف' },
  fr:     { live: 'En direct',  beFirst: 'Soyez le 1er marchand à' },
  en:     { live: 'Live now',   beFirst: 'Be the first merchant in' },
  zh:     { live: '实时',        beFirst: '成为第一个商家：' },
};

export default function LiveTicker() {
  const { lang, listings } = useLanding();
  const x = TXT[lang] || TXT.ar;
  const items = listings.length
    ? listings.slice(0, 12).map(l => `${l.type === 'service' ? '🛠️' : '🛍️'} ${l.name}${l.city ? ` · ${l.city}` : ''}`)
    : CITY_FALLBACK.map(c => `🚀 ${x.beFirst} ${c}`);
  const loop = [...items, ...items];

  return (
    <div style={{ position: 'relative', zIndex: 10, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: `${C.surface}cc`, backdropFilter: 'blur(6px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeD})`, color: '#fff', fontWeight: 900, fontSize: 11.5, zIndex: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'lpShimmer 1.4s ease infinite' }} /> {x.live}
        </div>
        <div style={{ overflow: 'hidden', flex: 1, maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)' as any }}>
          <div style={{ display: 'flex', gap: 36, whiteSpace: 'nowrap', padding: '11px 0', animation: 'lpTicker 30s linear infinite', fontSize: 12.5, fontWeight: 700, color: C.ink2, width: 'max-content' }}>
            {loop.map((s, i) => <span key={i} style={{ paddingInlineStart: 18 }}>{s}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
