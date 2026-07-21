import { useState, useEffect } from 'react';
import { providersAPI, bookingsAPI, type Provider, type ProviderService } from '../services/api';
import { BadgeCheck, MapPin, Star, X, Calendar, Phone } from 'lucide-react';

// ============================================================
// واجهة الزبون للحجز داخل الـ Storefront (alloservix)
// تعرض مقدّمي الخدمات المعتمَدين للمتجر وتتيح حجز موعد عام.
// مكتفية بذاتها (لا تعتمد على DS الداخلي) وتختفي إن لا مقدّمين
// — فالمتاجر بلا خدمات لا تتأثر إطلاقاً.
// ============================================================

const CARD_BG = 'rgba(255,255,255,0.04)';
const BORDER = '1px solid rgba(255,255,255,0.08)';
const PURPLE = '#8b5cf6';

export default function ProvidersBooking({ userId, currency }: { userId: string; currency: string }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Provider | null>(null);

  useEffect(() => {
    if (!userId) return;
    providersAPI.discover(userId).then(setProviders).catch(() => setProviders([])).finally(() => setLoading(false));
  }, [userId]);

  if (loading || providers.length === 0) return null; // لا مقدّمين → لا قسم

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 4, height: 24, background: `linear-gradient(180deg, ${PURPLE}, #a78bfa)`, borderRadius: 99 }} />
        <span style={{ fontSize: 16, fontWeight: 900 }}>مقدّمو الخدمات</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: CARD_BG, border: BORDER, padding: '3px 10px', borderRadius: 99 }}>{providers.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
        {providers.map(p => (
          <div key={p.id} style={{ background: CARD_BG, border: BORDER, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>👨‍🔧</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {p.isVerified && <BadgeCheck size={14} color={PURPLE} style={{ flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 8, marginTop: 2 }}>
                  {p.city && <span><MapPin size={10} style={{ verticalAlign: 'middle' }} /> {p.city}</span>}
                  {!!p.ratingCount && <span><Star size={10} style={{ verticalAlign: 'middle' }} /> {p.ratingAvg}</span>}
                </div>
              </div>
            </div>
            {p.bio && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.bio}</p>}
            {!!(p.services && p.services.length) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {p.services!.slice(0, 3).map(s => (
                  <span key={s.id} style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 99 }}>
                    {s.serviceLabel}{s.priceMin ? ` · ${s.priceMin}${s.priceMax && s.priceMax !== s.priceMin ? `-${s.priceMax}` : ''} ${currency}` : ''}
                  </span>
                ))}
              </div>
            )}
            <button onClick={() => setBooking(p)} style={{ marginTop: 'auto', padding: '9px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${PURPLE}, #a78bfa)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Calendar size={14} /> احجز موعداً
            </button>
          </div>
        ))}
      </div>
      {booking && <BookingModal userId={userId} provider={booking} currency={currency} onClose={() => setBooking(null)} />}
    </div>
  );
}

function BookingModal({ userId, provider, currency, onClose }: { userId: string; provider: Provider; currency: string; onClose: () => void }) {
  const services = provider.services || [];
  const [serviceId, setServiceId] = useState<string>(services[0]?.id || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'conflict'>('idle');
  const [msg, setMsg] = useState('');

  const svc: ProviderService | undefined = services.find(s => s.id === serviceId);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !when) { setMsg('الاسم والهاتف والموعد مطلوبة'); return; }
    setState('loading'); setMsg('');
    try {
      await bookingsAPI.book({
        userId, providerId: provider.id, serviceId: serviceId || undefined,
        customerName: name.trim(), customerPhone: phone.trim(),
        scheduledAt: new Date(when).toISOString(),
        durationMin: svc?.durationMin, notes: notes.trim(),
      });
      setState('done');
    } catch (e: any) {
      if (String(e.message || '').includes('محجوز') || String(e.message || '').includes('409')) {
        setState('conflict'); setMsg('هذا الموعد محجوز — اختر وقتاً آخر');
      } else { setState('idle'); setMsg(e.message || 'تعذّر إتمام الحجز'); }
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#141018', border: BORDER, borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>حجز موعد مع {provider.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {state === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>تم إرسال طلب الحجز!</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>سيؤكّد المتجر موعدك قريباً. احتفظ بهاتفك متاحاً.</div>
            <button onClick={onClose} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${PURPLE}, #a78bfa)`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>تمام</button>
          </div>
        ) : (
          <>
            {services.length > 0 && (
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>الخدمة
                <select value={serviceId} onChange={e => setServiceId(e.target.value)} style={inputStyle}>
                  {services.map(s => <option key={s.id} value={s.id} style={{ background: '#141018' }}>{s.serviceLabel}{s.priceMin ? ` (${s.priceMin} ${currency})` : ''}</option>)}
                </select>
              </label>
            )}
            <input placeholder="الاسم الكامل *" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            <input placeholder="رقم الهاتف *" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>الموعد *
              <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={inputStyle} />
            </label>
            <textarea placeholder="ملاحظات (اختياري)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
            {msg && <div style={{ fontSize: 12, color: state === 'conflict' ? '#f59e0b' : '#ef4444' }}>{msg}</div>}
            <button onClick={submit} disabled={state === 'loading'} style={{ padding: '11px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${PURPLE}, #a78bfa)`, color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: state === 'loading' ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {state === 'loading' ? 'جارٍ الإرسال…' : <><Phone size={14} /> تأكيد الحجز</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, marginTop: 4,
  background: 'rgba(255,255,255,0.05)', border: BORDER, color: '#fff', fontSize: 13, fontFamily: 'inherit',
};
