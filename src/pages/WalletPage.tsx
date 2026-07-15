import { useMemo } from 'react';
import { useStore } from '../store';
import { Wallet, TrendingUp, Banknote, CreditCard, Clock, ArrowDownLeft } from 'lucide-react';

// ============================================================
// المحفظة — رصيد التاجر + طرق الدفع المغربيّة + سجلّ المعاملات.
// تُشتقّ الأرقام من الطلبات الحقيقيّة (تسليم = دخل، بانتظار = معلّق).
// طرق الدفع أولًا: الدفع عند الاستلام · تحويل بنكي · CIH Pay · نقدًا.
// ============================================================

const DH = (n: number) => n.toLocaleString('fr-MA') + ' د.م';

export default function WalletPage() {
  const { orders } = useStore();

  const { balance, pending, income } = useMemo(() => {
    let balance = 0, pending = 0;
    for (const o of orders) {
      if (o.status === 'delivered' || o.status === 'approved') balance += o.total || 0;
      else if (o.status === 'pending' || o.status === 'pending_confirmation' || o.status === 'processing' || o.status === 'shipped') pending += o.total || 0;
    }
    return { balance, pending, income: balance };
  }, [orders]);

  const tx = useMemo(() => [...orders].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 12), [orders]);
  const gold = 'var(--amz-gold,#D4A017)';
  const green = 'var(--amz-emerald,#0a8f6f)';

  const methods = [
    { i: Banknote, l: 'الدفع عند الاستلام', s: 'COD — الأكثر استعمالًا', on: true },
    { i: CreditCard, l: 'تحويل بنكي', s: 'RIB — للطلبات الكبيرة', on: true },
    { i: CreditCard, l: 'CIH Pay', s: 'دفع إلكترونيّ', on: false },
    { i: Banknote, l: 'نقدًا في المتجر', s: 'استلام مباشر', on: true },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* بطاقة الرصيد */}
      <div style={{ borderRadius: 20, padding: 22, background: `linear-gradient(135deg, ${green}, #073c22)`, border: `1px solid ${gold}`, boxShadow: '0 12px 40px rgba(0,0,0,.25)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 60% at 90% 10%, rgba(212,160,23,.28), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.82)', fontSize: 13, fontWeight: 700 }}>
            <Wallet size={17} /> رصيدي المتاح
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', marginTop: 6, letterSpacing: '-.01em' }}>{DH(balance)}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
            <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>معلّق</div><div style={{ fontSize: 16, fontWeight: 800, color: '#ffe6a3' }}>{DH(pending)}</div></div>
            <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>إجمالي الدخل</div><div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{DH(income)}</div></div>
          </div>
        </div>
      </div>

      {/* طرق الدفع */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink2)', marginBottom: 10 }}>طرق الدفع</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {methods.map(m => (
            <div key={m.l} style={{ padding: 13, borderRadius: 14, background: 'var(--panel,rgba(255,255,255,.03))', border: '1px solid var(--border,rgba(255,255,255,.08))', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <m.i size={18} style={{ color: m.on ? green : 'var(--ink3)' }} />
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: m.on ? `color-mix(in srgb, ${green} 18%, transparent)` : 'var(--panel2,#132040)', color: m.on ? green : 'var(--ink3)' }}>{m.on ? 'مفعّل' : 'قريبًا'}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{m.l}</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{m.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* المعاملات */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: 'var(--ink2)', marginBottom: 10 }}>
          <TrendingUp size={15} /> آخر المعاملات
        </div>
        {tx.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink3)', fontSize: 13, border: '1px dashed var(--border2,rgba(255,255,255,.14))', borderRadius: 14 }}>ما كايناش معاملات بعد — أول طلب غادي يبان هنا.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tx.map(o => {
            const settled = o.status === 'delivered' || o.status === 'approved';
            return (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 13, background: 'var(--panel,rgba(255,255,255,.03))', border: '1px solid var(--border,rgba(255,255,255,.07))' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: settled ? `color-mix(in srgb, ${green} 16%, transparent)` : 'var(--panel2,#132040)', color: settled ? green : gold }}>
                  {settled ? <ArrowDownLeft size={17} /> : <Clock size={16} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{o.customerName || 'طلب'}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink3)' }}>{o.city || ''} · {settled ? 'مُسدّد' : 'معلّق'}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: settled ? green : gold }}>{DH(o.total || 0)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
