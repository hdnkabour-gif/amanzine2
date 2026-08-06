import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Package, Search, Loader2, AlertTriangle } from 'lucide-react';

// ============================================================
// تتبّعُ الطلب — **البابُ الذي كان ناقصًا**.
//
//   الخادمُ يُجيب عن كود التتبّع منذ زمن (`GET /api/orders/track-code/:code`
//   و`/track/:phone`، كلاهما عامٌّ بلا مصادقة)، ورسالةُ واتساب تقول للزبون
//   «🔑 كود التتبع» و«احتفظ به لمتابعة طلبك» — **ولا مكانَ يُدخِله فيه**.
//   وعدٌ في رسالةٍ بلا بابٍ يفي به.
//
//   ── ولماذا يحمل الرابطُ هويّةَ المتجر ──
//   المساران يشترطان `userId`، والزبونُ لا يعرفه ولا يجب أن يعرفه. فالرابطُ
//   الذي يصله في واتساب يحمله (`/track/:userId`)، والكودُ يُملأ تلقائيًّا من
//   `?code=`. فيصل بضغطةٍ واحدةٍ لا بنسخٍ ولصق.
//
//   ── وبابان لا بابٌ واحد ──
//   من ضاع منه الكودُ يبقى معه هاتفُه. والبحثُ بالهاتف يُرجع طلباتِه عند
//   **هذا التاجر وحدَه** — لا سجلَّ عامًّا لأحد.
// ============================================================

interface TrackedOrder {
  id: string;
  status: string;
  statusAr: string;
  total: number;
  customerCode?: string;
  trackingNumber?: string;
  deliveryProvider?: string;
  deliveryStatus?: string;
  createdAt?: string;
  items?: { productName?: string; quantity?: number }[];
  city?: string;
}

/** مراحلُ الطلب كما يراها الزبون — لا حالاتٍ داخليّة. */
const STAGES = [
  { key: 'pending', label: 'وصل الطلب' },
  { key: 'approved', label: 'تأكّد' },
  { key: 'processing', label: 'كيتوجّد' },
  { key: 'shipped', label: 'ف الطريق' },
  { key: 'delivered', label: 'وصل ليك' },
];
const stageIndex = (status: string) => {
  const i = STAGES.findIndex(s => s.key === status);
  return i >= 0 ? i : 0;
};

export default function TrackOrder() {
  const { userId = '' } = useParams();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('code') || '');
  const [mode, setMode] = useState<'code' | 'phone'>('code');
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const lookup = useCallback(async (q: string, how: 'code' | 'phone') => {
    const v = q.trim();
    if (!v) return;
    setBusy(true); setErr(''); setOrders(null);
    try {
      const url = how === 'code'
        ? `/api/orders/track-code/${encodeURIComponent(v)}?userId=${encodeURIComponent(userId)}`
        : `/api/orders/track/${encodeURIComponent(v)}?userId=${encodeURIComponent(userId)}`;
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'ما لقيناش الطلب');
      const list = Array.isArray(d) ? d : [d];
      if (!list.length) throw new Error('ما لقيناش حتّى طلب بهاد المعلومات');
      setOrders(list);
    } catch (e: any) {
      // رسالةُ الخادم كما هي: هو الذي يعرف أهو كودٌ خاطئٌ أم لا طلبَ أصلًا.
      setErr(e?.message || 'ما قدرناش نجيبو الطلب دابا');
    }
    setBusy(false);
  }, [userId]);

  // كودٌ في الرابط ⇒ يُبحَث فورًا. الزبونُ ضغط رابطًا، فطلبُ ضغطةٍ ثانيةٍ
  // على «تتبّع» عملٌ بلا معنى.
  useEffect(() => {
    const c = params.get('code');
    if (c) lookup(c, 'code');
  }, [params, lookup]);

  const inp: React.CSSProperties = {
    flex: 1, padding: '13px 15px', borderRadius: 13, fontSize: 15, fontFamily: 'inherit',
    border: '1px solid var(--border2,rgba(255,255,255,.14))',
    background: 'var(--void2,rgba(0,0,0,.18))', color: 'var(--ink1)',
  };

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: 'var(--void,#060B14)', color: 'var(--ink1,#E8E4DC)',
      fontFamily: 'Tajawal, system-ui, sans-serif', padding: '28px 18px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <Package size={30} style={{ color: 'var(--ember,#FF6A00)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: '10px 0 4px' }}>فين وصل طلبي؟</h1>
          <p style={{ fontSize: 13, color: 'var(--ink3)' }}>دخّل كود التتبّع اللي توصّلتي بيه، ولا نمرة تيليفونك.</p>
        </div>

        <div style={{ display: 'flex', gap: 7, marginBottom: 11, justifyContent: 'center' }}>
          {([['code', 'بكود التتبّع'], ['phone', 'بنمرة التيليفون']] as const).map(([m, t]) => (
            <button key={m} onClick={() => { setMode(m); setOrders(null); setErr(''); }}
              style={{ padding: '8px 15px', borderRadius: 11, fontFamily: 'inherit', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 800,
                border: `1px solid ${mode === m ? 'var(--ember,#FF6A00)' : 'var(--border2,rgba(255,255,255,.14))'}`,
                background: mode === m ? 'rgba(255,106,0,.12)' : 'transparent',
                color: mode === m ? 'var(--ember,#FF6A00)' : 'var(--ink3)' }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') lookup(query, mode); }}
            placeholder={mode === 'code' ? 'مثلاً A1B2C3D4' : '06XXXXXXXX'}
            dir={mode === 'phone' ? 'ltr' : undefined}
            aria-label={mode === 'code' ? 'كود التتبّع' : 'نمرة التيليفون'}
            style={inp} />
          <button onClick={() => lookup(query, mode)} disabled={busy || !query.trim()}
            style={{ padding: '0 18px', borderRadius: 13, border: 'none', fontFamily: 'inherit',
              background: query.trim() ? 'var(--ember,#FF6A00)' : 'var(--panel2,rgba(255,255,255,.06))',
              color: query.trim() ? '#fff' : 'var(--ink3)', fontWeight: 800,
              cursor: query.trim() ? 'pointer' : 'not-allowed' }}>
            {busy ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          </button>
        </div>

        {err && (
          <div style={{ marginTop: 14, padding: '12px 15px', borderRadius: 13, fontSize: 13, fontWeight: 700,
            border: '1px solid rgba(245,158,11,.3)', background: 'rgba(245,158,11,.07)',
            display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertTriangle size={15} /> {err}
          </div>
        )}

        {orders?.map(o => {
          const idx = stageIndex(o.status);
          const cancelled = o.status === 'cancelled';
          return (
            <div key={o.id} style={{ marginTop: 16, padding: '17px 18px', borderRadius: 17,
              border: '1px solid var(--border,rgba(255,255,255,.1))', background: 'var(--panel,rgba(255,255,255,.04))' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 13 }}>
                <span style={{ fontSize: 15, fontWeight: 900 }}>{o.statusAr}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 12, color: 'var(--ink3)' }}>{o.id}</span>
              </div>

              {/* المراحلُ كما يراها الزبون. الملغى لا يُرسَم شريطًا — شريطٌ
                  نصفُه مضيءٌ لطلبٍ ملغًى يوهم بأنّه ما زال يتحرّك. */}
              {!cancelled && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 13 }}>
                  {STAGES.map((s, i) => (
                    <div key={s.key} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 4, borderRadius: 9,
                        background: i <= idx ? 'var(--mint,#12A150)' : 'var(--border2,rgba(255,255,255,.12))' }} />
                      <div style={{ fontSize: 10.5, marginTop: 5, fontWeight: 700,
                        color: i <= idx ? 'var(--ink2)' : 'var(--ink3)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {!!o.items?.length && (
                <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.8, marginBottom: 8 }}>
                  {o.items.map((it, i) => (
                    <div key={i}>• {it.productName || 'منتوج'}{it.quantity && it.quantity > 1 ? ` ×${it.quantity}` : ''}</div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 800 }}>{(o.total || 0).toLocaleString()} درهم</div>

              {/* رقمُ التتبّع يُعرَض **حين يكون حقيقيًّا** وحدَه: الحقلُ معناه
                  واحدٌ لا ثانيَ له — رقمٌ جاء من شركة توصيل. */}
              {o.trackingNumber ? (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink3)' }}>
                  🚚 {o.deliveryProvider || 'شركة التوصيل'} — رقم التتبّع:{' '}
                  <strong style={{ color: 'var(--ink1)', direction: 'ltr', display: 'inline-block' }}>{o.trackingNumber}</strong>
                </div>
              ) : o.status === 'shipped' || o.status === 'processing' ? (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink3)' }}>
                  🚚 كيتسجّل عند شركة التوصيل — رقم التتبّع غادي يبان هنا.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
