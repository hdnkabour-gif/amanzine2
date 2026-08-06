import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { walletAPI, paymentAPI, type WalletState, type PaymentRow, type PaymentMethod } from '../services/api';
import { Wallet, TrendingUp, Banknote, CreditCard, Clock, ArrowDownLeft, CheckCircle, Loader2, AlertTriangle, Plus } from 'lucide-react';

// ============================================================
// المحفظة — **البابُ الذي كان يُشار إليه ولا يوجد**.
//
//   `MAKE_PAYMENT` و`VIEW_PAYMENTS` تُعلنان صفحةَ `wallet` ومسارَ
//   `/api/payment`، و`VIEW_WALLET` تُعلن `/api/wallet`. وهذه الصفحةُ لم تكن
//   تنادي أيًّا منهما: كلُّ أرقامها مشتقّةٌ من الطلبات في المخزن.
//   فالطبقةُ كلُّها تعمل على الخادم — سجلُّ دفعاتٍ ومحرّكُ طرقٍ ومحفظةٌ ذرّيّة
//   — ولا مُنادِيَ لها واحدًا في `src/` كلّه.
//
//   ── وثلاثةُ أرقامٍ لا رقمٌ واحد ──
//   كان المكتوبُ «رصيدي المتاح» وتحته مجموعُ الطلبات المسلَّمة. وهذا ليس
//   رصيدًا: مالُ الدفع عند الاستلام يقبضه المندوبُ ثمّ يُحوَّل، ورصيدُ
//   المحفظة (`wallets`) شيءٌ آخرُ تمامًا. فصارت الثلاثةُ منفصلةً بأسمائها:
//   **رصيد المحفظة** (من القاعدة) · **مداخيل مسلَّمة** · **معلّق**.
//
//   ── وطرقُ الدفع تُقرأ لا تُكتب ──
//   كانت أربعَ بطاقاتٍ مكتوبةً بيدٍ («CIH Pay — قريبًا»)، والمحرّكُ يُعلن
//   ستّةَ محوّلاتٍ بحالاتٍ حقيقيّة. فكان التاجرُ يرى «مفعّل» لطريقةٍ قد لا
//   تكون مُهيَّأة. الآن تُقرأ من `/api/payment/methods` بحقائقها الثلاث:
//   أمكتوبٌ المحوّل؟ أمضبوطةٌ اعتماداتُه؟ أفَيتاح؟ — والفرقُ بين «ما تكتبش
//   بعد» و«ينقصه مفتاح» جوابان مختلفان للتاجر، لا رايةٌ واحدة.
// ============================================================

const DH = (n: number) => n.toLocaleString('fr-MA') + ' د.م';

/** أسماءُ المحوّلات بالدارجة. ما لا اسمَ له يُعرَض بمُعرِّفه لا يُخفى. */
const METHOD_LABEL: Record<string, string> = {
  cod: 'الدفع عند الاستلام', transfer: 'تحويل بنكي', wallet: 'من المحفظة',
  cmi: 'CMI', stripe: 'Stripe', paypal: 'PayPal',
};
const PAY_STATUS: Record<string, { l: string; ok: boolean }> = {
  pending: { l: 'كيتسنّى', ok: false }, paid: { l: 'تخلّص', ok: true },
  failed: { l: 'فشل', ok: false }, refunded: { l: 'ترجّع', ok: false },
};

export default function WalletPage() {
  const { orders, notify } = useStore();
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; orderId: string; provider: string; amount: string }>(
    { open: false, orderId: '', provider: '', amount: '' });

  const load = useCallback(() => {
    walletAPI.get().then(setWallet).catch(() => setWallet(null));
    paymentAPI.list().then(setPayments).catch(() => setPayments([]));
    paymentAPI.methods().then(r => setMethods(r.methods)).catch(() => setMethods([]));
  }, []);
  useEffect(load, [load]);

  // مجاميعُ الطلبات تبقى — لكن باسمها الصحيح، لا باسم «الرصيد».
  const { earned, pending } = useMemo(() => {
    let earned = 0, pending = 0;
    for (const o of orders) {
      if (o.status === 'delivered' || o.status === 'approved') earned += o.total || 0;
      else if (o.status === 'pending' || o.status === 'pending_confirmation' || o.status === 'processing' || o.status === 'shipped') pending += o.total || 0;
    }
    return { earned, pending };
  }, [orders]);

  const usable = (methods || []).filter(m => m.available);
  const unpaidOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled').slice(0, 40), [orders]);

  const gold = 'var(--amz-gold,#D4A017)';
  const green = 'var(--amz-emerald,#0a8f6f)';

  const record = async () => {
    const amount = +form.amount;
    if (!form.provider) { notify('error', 'اختار طريقة الخلاص'); return; }
    if (!(amount > 0)) { notify('error', 'دخّل مبلغ صحيح'); return; }
    setBusy('charge');
    try {
      const r = await paymentAPI.charge({ provider: form.provider, amount, orderId: form.orderId || undefined });
      // الخادمُ يُجيب بحالةٍ لا بنجاحٍ مطلق: `unavailable` تعني طريقةً لم
      // تُكتب أو تنقصها اعتمادات — تُقال كما هي لا تُترجَم إلى «تمّ».
      if (r.status === 'paid') notify('success', '✅ تسجّل الخلاص');
      else if (r.status === 'pending') notify('info', `⏳ تسجّل — كيتسنّى التأكيد${r.note ? ` · ${r.note}` : ''}`);
      else notify('error', r.error || 'ما تسجّلش الخلاص');
      if (r.status === 'paid' || r.status === 'pending') setForm({ open: false, orderId: '', provider: '', amount: '' });
      load();
    } catch (e: any) { notify('error', e?.message || 'تعذّر تسجيل الخلاص'); }
    setBusy(null);
  };

  const confirm = async (id: string, status: 'paid' | 'refunded') => {
    setBusy(id);
    try {
      await paymentAPI.confirm(id, status);
      notify('success', status === 'paid' ? '✅ تأكّد الخلاص' : '↩️ ترجّع المبلغ');
      load();
    } catch (e: any) { notify('error', e?.message || 'ما تأكّدش'); }
    setBusy(null);
  };

  const card: React.CSSProperties = {
    padding: 13, borderRadius: 14, background: 'var(--panel,rgba(255,255,255,.03))',
    border: '1px solid var(--border,rgba(255,255,255,.08))',
  };
  const inp: React.CSSProperties = {
    padding: '10px 12px', borderRadius: 11, fontSize: 13, fontFamily: 'inherit',
    border: '1px solid var(--border2,rgba(255,255,255,.14))',
    background: 'var(--void2,rgba(0,0,0,.18))', color: 'var(--ink1)',
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* بطاقة الرصيد — الرقمُ الأوّلُ من القاعدة، والمشتقّان تحته بأسمائهما */}
      <div style={{ borderRadius: 20, padding: 22, background: `linear-gradient(135deg, ${green}, #073c22)`, border: `1px solid ${gold}`, boxShadow: '0 12px 40px rgba(0,0,0,.25)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 60% at 90% 10%, rgba(212,160,23,.28), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.82)', fontSize: 13, fontWeight: 700 }}>
            <Wallet size={17} /> رصيد المحفظة
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', marginTop: 6, letterSpacing: '-.01em' }}>
            {wallet ? DH(wallet.balance) : '—'}
          </div>
          {!wallet && (
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.72)', marginTop: 4 }}>
              ما قدرناش نجيبو الرصيد دابا — الأرقام اللي تحت من الطلبات ديالك.
            </div>
          )}
          <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
            <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>مداخيل مسلَّمة</div><div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{DH(earned)}</div></div>
            <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>معلّق ف الطلبات</div><div style={{ fontSize: 16, fontWeight: 800, color: '#ffe6a3' }}>{DH(pending)}</div></div>
          </div>
        </div>
      </div>

      {/* طرق الدفع — من المحرّك، بحالاتها الثلاث */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink2)', marginBottom: 10 }}>طرق الخلاص</div>
        {methods === null ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}><Loader2 size={15} className="spin" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
            {methods.map(m => {
              const Icon = m.provider === 'cod' || m.provider === 'wallet' ? Banknote : CreditCard;
              // ثلاثُ حالاتٍ لا اثنتان: متاح · ينقصه مفتاح · لم يُكتب بعد.
              const state = m.available ? { l: 'مفعّل', c: green }
                : !m.implemented ? { l: 'ما تكتبش بعد', c: 'var(--ink3)' }
                : { l: 'خاصو الإعدادات', c: gold };
              return (
                <div key={m.provider} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Icon size={18} style={{ color: m.available ? green : 'var(--ink3)' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'var(--panel2,#132040)', color: state.c }}>{state.l}</span>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{METHOD_LABEL[m.provider] || m.provider}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* تسجيلُ خلاص — بابُ `MAKE_PAYMENT` */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink2)' }}>الأداءات</div>
          <button onClick={() => setForm(f => ({ ...f, open: !f.open }))}
            disabled={usable.length === 0}
            title={usable.length === 0 ? 'ما كاينة حتّى طريقة مفعّلة' : undefined}
            style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              borderRadius: 11, fontFamily: 'inherit', fontSize: 12, fontWeight: 800,
              border: `1px solid ${usable.length ? gold : 'var(--border2,rgba(255,255,255,.14))'}`,
              background: 'transparent', color: usable.length ? gold : 'var(--ink3)',
              cursor: usable.length ? 'pointer' : 'not-allowed' }}>
            <Plus size={13} /> سجّل خلاص
          </button>
        </div>

        {form.open && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 11 }}>
            <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} style={inp}>
              <option value="">اختار طريقة الخلاص…</option>
              {usable.map(m => <option key={m.provider} value={m.provider}>{METHOD_LABEL[m.provider] || m.provider}</option>)}
            </select>
            <select value={form.orderId} onChange={e => {
              const o = orders.find(x => x.id === e.target.value);
              setForm(f => ({ ...f, orderId: e.target.value, amount: o ? String(o.total || '') : f.amount }));
            }} style={inp}>
              <option value="">بلا طلب معيّن</option>
              {unpaidOrders.map(o => <option key={o.id} value={o.id}>{o.customerName || 'طلب'} — {DH(o.total || 0)}</option>)}
            </select>
            <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              inputMode="decimal" placeholder="المبلغ بالدرهم" aria-label="المبلغ" style={inp} />
            <button onClick={record} disabled={busy === 'charge'}
              style={{ padding: '11px', borderRadius: 12, border: 'none', fontFamily: 'inherit', fontWeight: 800,
                fontSize: 13, background: gold, color: '#1a1200', cursor: 'pointer' }}>
              {busy === 'charge' ? <Loader2 size={15} className="spin" /> : 'سجّل'}
            </button>
          </div>
        )}

        {payments === null ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}><Loader2 size={15} className="spin" /></div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 18, textAlign: 'center', color: 'var(--ink3)', fontSize: 12.5, border: '1px dashed var(--border2,rgba(255,255,255,.14))', borderRadius: 14 }}>
            ما كاين حتّى أداء مسجّل. الخلاص اللي كيوصل عند الاستلام كتسجّلو هنا باش يبقى ليك سجلّ.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payments.map(p => {
              const st = PAY_STATUS[p.status] || { l: p.status, ok: false };
              return (
                <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 13 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: st.ok ? `color-mix(in srgb, ${green} 16%, transparent)` : 'var(--panel2,#132040)', color: st.ok ? green : gold }}>
                    {st.ok ? <CheckCircle size={17} /> : p.status === 'failed' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{METHOD_LABEL[p.provider] || p.provider}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink3)' }}>{st.l}{p.ref ? ` · ${p.ref}` : ''}</span>
                  </span>
                  {p.status === 'pending' && (
                    <button onClick={() => confirm(p.id, 'paid')} disabled={busy === p.id}
                      style={{ padding: '6px 11px', borderRadius: 10, fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800,
                        border: `1px solid ${green}`, background: 'transparent', color: green, cursor: 'pointer' }}>
                      {busy === p.id ? '…' : 'وصل الخلاص'}
                    </button>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 900, color: st.ok ? green : gold }}>{DH(p.amount)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* حركاتُ المحفظة نفسِها — من القاعدة لا من الطلبات */}
      {!!wallet?.transactions?.length && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: 'var(--ink2)', marginBottom: 10 }}>
            <TrendingUp size={15} /> حركات المحفظة
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wallet.transactions.slice(0, 12).map(t => (
              <div key={t.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 13 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: t.amount >= 0 ? `color-mix(in srgb, ${green} 16%, transparent)` : 'var(--panel2,#132040)', color: t.amount >= 0 ? green : gold }}>
                  <ArrowDownLeft size={17} style={{ transform: t.amount >= 0 ? undefined : 'rotate(180deg)' }} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{t.note || t.type}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink3)' }}>{t.ref || ''}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: t.amount >= 0 ? green : gold }}>{DH(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
