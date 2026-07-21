import { useState, useEffect, useCallback } from 'react';
import { feedAPI, type Activity } from '../services/api';
import { Flame, MapPin, Clock } from 'lucide-react';

// ============================================================
// Activity Feed — تغذية أعمال (لا Facebook): كل حدث Business.
// تبويبات: محلي (المدينة) · رائج · متابَع. تقرأ من /api/feed فقط.
// ============================================================

const CITIES = ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة', 'أكادير', 'مكناس', 'وجدة'];
const BG = '#0a0a0f', CARD = 'rgba(255,255,255,0.04)', BORDER = '1px solid rgba(255,255,255,0.08)';
const PURPLE = '#8b5cf6', MUTED = 'rgba(255,255,255,0.55)', INK = '#f5f5f7';

const ACT: Record<string, { icon: string; label: (p: any) => string }> = {
  'offer.created':     { icon: '🎁', label: p => `عرض جديد${p.code ? `: ${p.code}` : ''}` },
  'listing.approved':  { icon: '🏷️', label: p => `${p.name || 'إعلان'} — متاح الآن` },
  'business.verified': { icon: '✅', label: p => `${p.name || 'نشاط'} — تم اعتماده` },
  'product.created':   { icon: '🛍️', label: p => `منتج جديد${p.name ? `: ${p.name}` : ''}` },
  'service.created':   { icon: '🛠️', label: p => `خدمة جديدة${p.name ? `: ${p.name}` : ''}` },
  'review.created':    { icon: '⭐', label: () => 'تقييم جديد' },
};

export default function ActivityFeed() {
  const [tab, setTab] = useState<'trending' | 'local' | 'following'>('trending');
  const [city, setCity] = useState('');
  const [items, setItems] = useState<Activity[]>([]);
  const [trending, setTrending] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { type: tab, limit: 50 };
    if (tab === 'local') params.city = city || undefined;
    if (tab === 'following') { try { params.ids = (JSON.parse(localStorage.getItem('amanzine_following') || '[]') as string[]).join(','); } catch {} }
    feedAPI.get(params)
      .then(r => { setItems(r.items || []); if (r.trending) setTrending(r.trending); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tab, city]);
  useEffect(() => { load(); }, [load]);

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: BG, color: INK, fontFamily: 'Tajawal,system-ui,sans-serif', paddingBottom: 60 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(14px)', borderBottom: BORDER, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>📢</span>
          <div style={{ fontSize: 17, fontWeight: 900 }}>نشاط الأعمال</div>
          <a href="/explore" style={{ marginInlineStart: 'auto', fontSize: 11.5, color: PURPLE, textDecoration: 'none' }}>استكشف ↗</a>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['trending', '🔥 رائج'], ['local', '📍 محلي'], ['following', '👥 متابَع']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={tabBtn(tab === v)}>{l}</button>
          ))}
          {tab === 'local' && (
            <select value={city} onChange={e => setCity(e.target.value)} style={{ marginInlineStart: 'auto', background: CARD, border: BORDER, borderRadius: 99, color: INK, fontSize: 12, padding: '6px 10px', fontFamily: 'inherit' }}>
              <option value="">كل المدن</option>{CITIES.map(c => <option key={c} value={c} style={{ background: BG }}>{c}</option>)}
            </select>
          )}
        </div>
      </header>

      <div style={{ padding: 16 }}>
        {tab === 'trending' && trending.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}><Flame size={13} style={{ verticalAlign: 'middle' }} /> الأكثر نشاطاً</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {trending.map(t => <a key={t.category} href={`/explore?q=${encodeURIComponent(t.category)}`} style={{ textDecoration: 'none', background: 'rgba(139,92,246,0.12)', color: PURPLE, border: '1px solid rgba(139,92,246,0.3)', borderRadius: 99, padding: '5px 12px', fontSize: 12, fontWeight: 700 }}>{t.category} · {t.count}</a>)}
            </div>
          </div>
        )}

        {loading ? <Center>جارٍ التحميل…</Center>
          : items.length === 0 ? <Center>{tab === 'following' ? 'لا أنشطة من متابَعينك بعد.' : 'لا نشاط بعد.'}</Center>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(a => {
                const meta = ACT[a.type] || { icon: '📢', label: () => a.type };
                return (
                  <div key={a.id} style={{ background: CARD, border: BORDER, borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{meta.label(a.payload || {})}</div>
                      <div style={{ fontSize: 11, color: MUTED, display: 'flex', gap: 10, marginTop: 3 }}>
                        <span><Clock size={10} style={{ verticalAlign: 'middle' }} /> {timeAgo(a.createdAt)}</span>
                        {a.city && <span><MapPin size={10} style={{ verticalAlign: 'middle' }} /> {a.city}</span>}
                      </div>
                    </div>
                    {a.businessId && <a href={bizHref(a.businessId)} style={{ fontSize: 11.5, color: PURPLE, textDecoration: 'none', whiteSpace: 'nowrap' }}>عرض ↗</a>}
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

function bizHref(businessId: string): string {
  const [src, id] = String(businessId).split(':');
  if (['store', 'provider', 'listing'].includes(src) && id) return `/business/${src}/${id}`;
  return '/explore';
}
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'الآن';
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  return `منذ ${Math.floor(s / 86400)} يوم`;
}
function tabBtn(active: boolean): React.CSSProperties {
  return { padding: '8px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', background: active ? PURPLE : CARD, color: active ? '#fff' : MUTED };
}
function Center({ children }: { children: React.ReactNode }) { return <div style={{ textAlign: 'center', padding: '50px 20px', color: MUTED, fontSize: 14 }}>{children}</div>; }
