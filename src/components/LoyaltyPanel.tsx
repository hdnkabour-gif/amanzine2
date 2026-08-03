import { useCallback, useEffect, useState } from 'react';
import { loyaltyAPI, type LoyaltyRow } from '../services/api';
import { Gift, RotateCcw } from 'lucide-react';

// ============================================================
// الولاء — الشاشةُ التي لم تكن.
//
//   النقاطُ تُمنَح عند تسليم كلّ طلب (`addLoyaltyPoints`)، وتُحفَظ في
//   `loyalty_points`، ويقرؤها `GET /api/loyalty` — **ولا يراها أحد**. ولا
//   مسارَ صرفٍ أصلًا رغم وجود `redeemLoyaltyPoints` في طبقة القاعدة.
//   برنامجُ ولاءٍ تُمنَح فيه النقاطُ ولا تُصرَف ليس برنامجَ ولاء.
//
//   القاعدةُ نفسُها هنا: **لا رقمَ بلا معنى**. النقطةُ الواحدة = ١٠ دراهم
//   مشترَاة (`Math.floor(amount / 10)` في القاعدة) — والقيمةُ تُعرَض لا تُخمَّن.
// ============================================================

/** نفسُ عتبات `addLoyaltyPoints` في الخادم — تُعرَض ولا تُعاد كتابتُها. */
const TIERS: Record<string, { label: string; color: string; at: number }> = {
  silver:  { label: '🥈 فضّي',  color: '#94a3b8', at: 0 },
  gold:    { label: '🥇 ذهبيّ', color: '#fbbf24', at: 2000 },
  diamond: { label: '💎 ماسيّ', color: '#38bdf8', at: 5000 },
};
/** ١٠ دراهم = نقطة. مذكورٌ صراحةً لأنّ التاجر يحتاج أن يعرف قيمةَ ما يمنح. */
const MAD_PER_POINT = 10;

export default function LoyaltyPanel({ currency, onNotify }: {
  currency: string;
  onNotify: (t: 'success' | 'error' | 'warning' | 'info', m: string) => void;
}) {
  const [rows, setRows] = useState<LoyaltyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    loyaltyAPI.list()
      .then(setRows)
      .catch(e => { setRows([]); setError(e?.message || 'تعذّر تحميل نقاط الولاء'); });
  }, []);
  useEffect(load, [load]);

  const redeem = async (r: LoyaltyRow) => {
    const raw = window.prompt(
      `صرفُ نقاطٍ لـ${r.customerName || 'الزبون'} — الرصيد ${r.points} نقطة (≈ ${r.points * MAD_PER_POINT} ${currency} مشترَاة).\nكم نقطة نصرف؟`,
      String(r.points)
    );
    if (raw === null) return;
    const pts = Math.floor(Number(raw));
    if (!isFinite(pts) || pts <= 0) { onNotify('error', 'أدخل عددًا موجبًا'); return; }
    setBusy(r.customerId);
    try {
      const res = await loyaltyAPI.redeem({ customerId: r.customerId, points: pts });
      onNotify('success', `✅ صُرفت ${res.redeemed} نقطة — الباقي ${res.points}`);
      load();
    } catch (e: any) {
      // الخادمُ يرفض الصرفَ الزائدَ ويقول السبب — لا يقصّه بصمتٍ ويدّعي النجاح.
      onNotify('error', e?.message || 'تعذّر الصرف');
    }
    setBusy(null);
  };

  if (rows === null) {
    return <p style={{ fontSize: 12.5, color: 'var(--ink3)', padding: '14px 0' }}>جارٍ التحميل…</p>;
  }

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Gift size={15} /> نقاط الولاء
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>
            نقطةٌ لكلّ {MAD_PER_POINT} {currency} — تُمنَح تلقائيًّا عند تسليم الطلب
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost btn-xs" style={{ gap: 5 }}>
          <RotateCcw size={12} /> تحديث
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>⚠️ {error}</p>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: '18px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink2)' }}>لا نقاطَ بعد</p>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4 }}>
            تُمنَح النقاطُ لحظةَ تسليم أوّل طلب — لا شيءَ لتضبطه
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => {
            const t = TIERS[r.tier] || TIERS.silver;
            const nextAt = r.tier === 'silver' ? TIERS.gold.at : r.tier === 'gold' ? TIERS.diamond.at : 0;
            const pct = nextAt ? Math.min(100, Math.round((r.totalEarned / nextAt) * 100)) : 100;
            return (
              <div key={r.customerId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel2,rgba(255,255,255,.02))', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>
                      {r.customerName || 'زبونٌ محذوف'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, color: t.color, border: `1px solid ${t.color}55` }}>{t.label}</span>
                    {r.vip && <span style={{ fontSize: 10, color: '#fbbf24' }}>⭐</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>
                    الرصيد <b style={{ color: 'var(--ink1)' }}>{r.points}</b> نقطة
                    {' · '}جُمعت {r.totalEarned}
                    {nextAt > 0 && ` · ${nextAt - r.totalEarned > 0 ? `${nextAt - r.totalEarned} للمستوى التالي` : 'جاهزٌ للترقية'}`}
                  </div>
                  {nextAt > 0 && (
                    <div style={{ height: 4, borderRadius: 99, background: 'var(--panel3,rgba(255,255,255,.06))', marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: t.color }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => redeem(r)}
                  disabled={busy === r.customerId || r.points <= 0}
                  className="btn btn-ghost btn-sm"
                  style={{ opacity: r.points > 0 ? 1 : 0.4 }}>
                  {busy === r.customerId ? '…' : `اصرف · ${r.points * MAD_PER_POINT} ${currency}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
