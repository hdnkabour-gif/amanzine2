import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { providersAPI, bookingsAPI, type Provider, type Booking } from '../services/api';
import { Plus, Trash2, RefreshCw, X, CheckCircle, Calendar, MapPin, BadgeCheck } from 'lucide-react';

// ============================================================
// صفحة الحجوزات وسوق الخدمات (alloservix)
// إدارة مقدّمي الخدمات + الحجوزات مع كشف تعارض المواعيد على الخادم.
// ============================================================

const STATUS_AR: Record<string, string> = {
  pending: '⏳ بانتظار التأكيد', confirmed: '✅ مؤكّد', completed: '📦 منجز', cancelled: '❌ ملغى',
};
const PROVIDER_STATUS_AR: Record<string, string> = {
  pending: '⏳ بانتظار الموافقة', approved: '✅ معتمد', rejected: '❌ مرفوض', suspended: '⛔ معلّق',
};

export default function BookingsPage() {
  const { notify } = useStore();
  const [tab, setTab] = useState<'bookings' | 'providers'>('bookings');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, bs] = await Promise.all([
        providersAPI.list().catch(() => []),
        bookingsAPI.list().catch(() => []),
      ]);
      setProviders(ps); setBookings(bs);
    } catch { notify('error', 'تعذّر تحميل بيانات الحجوزات'); }
    setLoading(false);
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const providerName = (id: string) => providers.find(p => p.id === id)?.name || '—';

  // ── إجراءات المقدّمين ──────────────────────────────────────
  const setProviderStatus = async (id: string, status: string) => {
    try { await providersAPI.setStatus(id, status); notify('success', `تم تحديث حالة المقدّم`); load(); }
    catch { notify('error', 'فشل التحديث'); }
  };
  const removeProvider = async (id: string) => {
    if (!confirm('حذف هذا المقدّم وكل حجوزاته؟')) return;
    try { await providersAPI.remove(id); notify('success', 'تم الحذف'); load(); }
    catch { notify('error', 'فشل الحذف'); }
  };

  // ── إجراءات الحجوزات ───────────────────────────────────────
  const setBookingStatus = async (id: string, status: string) => {
    try { await bookingsAPI.setStatus(id, status); notify('success', 'تم تحديث الحجز'); load(); }
    catch { notify('error', 'فشل التحديث'); }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>📅 الحجوزات وسوق الخدمات</h1>
          <p style={{ color: 'var(--ink3)', margin: '4px 0 0', fontSize: 13 }}>مقدّمو الخدمات، مواعيدهم، والحجوزات — مع منع تعارض المواعيد تلقائياً</p>
        </div>
        <button onClick={load} className="btn" style={{ gap: 6 }}><RefreshCw size={15} /> تحديث</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn ${tab === 'bookings' ? 'btn-primary' : ''}`} onClick={() => setTab('bookings')}>الحجوزات ({bookings.length})</button>
        <button className={`btn ${tab === 'providers' ? 'btn-primary' : ''}`} onClick={() => setTab('providers')}>المقدّمون ({providers.length})</button>
      </div>

      {loading && <p style={{ color: 'var(--ink3)' }}>جارٍ التحميل…</p>}

      {/* ── تبويب الحجوزات ── */}
      {!loading && tab === 'bookings' && (
        <div>
          <button className="btn btn-primary" style={{ gap: 6, marginBottom: 14 }}
            onClick={() => { if (!providers.some(p => p.status === 'approved')) { notify('warning', 'أضف مقدّم خدمة معتمداً أولاً'); setTab('providers'); return; } setShowBookingForm(true); }}>
            <Plus size={16} /> حجز جديد
          </button>
          {bookings.length === 0 ? (
            <p style={{ color: 'var(--ink3)' }}>لا حجوزات بعد.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {bookings.map(b => (
                <div key={b.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{b.customerName} <span style={{ color: 'var(--ink3)', fontWeight: 400 }}>— {providerName(b.providerId)}</span></div>
                    <div style={{ fontSize: 13, color: 'var(--ink3)', display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      <span><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {new Date(b.scheduledAt).toLocaleString('ar-MA')}</span>
                      <span>⏱️ {b.durationMin} دق</span>
                      <span dir="ltr">📞 {b.customerPhone}</span>
                      {!!b.price && <span>💰 {b.price}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>{STATUS_AR[b.status] || b.status}</span>
                    {b.status === 'pending' && <button className="btn" onClick={() => setBookingStatus(b.id, 'confirmed')}><CheckCircle size={14} /> تأكيد</button>}
                    {b.status === 'confirmed' && <button className="btn" onClick={() => setBookingStatus(b.id, 'completed')}>إنهاء</button>}
                    {b.status !== 'cancelled' && b.status !== 'completed' && <button className="btn" onClick={() => setBookingStatus(b.id, 'cancelled')}><X size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── تبويب المقدّمين ── */}
      {!loading && tab === 'providers' && (
        <div>
          <button className="btn btn-primary" style={{ gap: 6, marginBottom: 14 }} onClick={() => setShowProviderForm(true)}>
            <Plus size={16} /> إضافة مقدّم خدمة
          </button>
          {providers.length === 0 ? (
            <p style={{ color: 'var(--ink3)' }}>لا مقدّمي خدمات بعد.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {providers.map(p => (
                <div key={p.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.name} {p.isVerified && <BadgeCheck size={15} color="#3b82f6" />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink3)', display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      {p.city && <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {p.city}</span>}
                      <span>{PROVIDER_STATUS_AR[p.status || 'pending']}</span>
                      {!!p.ratingCount && <span>⭐ {p.ratingAvg} ({p.ratingCount})</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.status !== 'approved' && <button className="btn" onClick={() => setProviderStatus(p.id, 'approved')}>اعتماد</button>}
                    {p.status === 'approved' && <button className="btn" onClick={() => setProviderStatus(p.id, 'suspended')}>تعليق</button>}
                    <button className="btn" onClick={() => removeProvider(p.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showProviderForm && <ProviderForm onClose={() => setShowProviderForm(false)} onSaved={() => { setShowProviderForm(false); load(); }} />}
      {showBookingForm && <BookingForm providers={providers.filter(p => p.status === 'approved')} onClose={() => setShowBookingForm(false)} onSaved={() => { setShowBookingForm(false); load(); }} />}
    </div>
  );
}

// ── نموذج إضافة مقدّم ──────────────────────────────────────────
function ProviderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { notify } = useStore();
  const [form, setForm] = useState({ name: '', city: '', phone: '', bio: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.name.trim()) { notify('error', 'الاسم مطلوب'); return; }
    setBusy(true);
    try { await providersAPI.create({ ...form, status: 'approved' }); notify('success', 'تمت الإضافة'); onSaved(); }
    catch (e: any) { notify('error', e.message || 'فشل'); }
    setBusy(false);
  };
  return (
    <Modal title="إضافة مقدّم خدمة" onClose={onClose}>
      <input className="input" placeholder="الاسم *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input className="input" placeholder="المدينة" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
      <input className="input" dir="ltr" placeholder="الهاتف" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      <textarea className="textarea" rows={2} placeholder="نبذة" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
      <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? '...' : 'حفظ'}</button>
    </Modal>
  );
}

// ── نموذج حجز جديد ─────────────────────────────────────────────
function BookingForm({ providers, onClose, onSaved }: { providers: Provider[]; onClose: () => void; onSaved: () => void }) {
  const { notify } = useStore();
  const [form, setForm] = useState({ providerId: providers[0]?.id || '', customerName: '', customerPhone: '', scheduledAt: '', durationMin: '60' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.providerId || !form.customerName.trim() || !form.customerPhone.trim() || !form.scheduledAt) { notify('error', 'كل الحقول مطلوبة'); return; }
    setBusy(true);
    try {
      await bookingsAPI.create({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString(), durationMin: +form.durationMin || 60 });
      notify('success', 'تم إنشاء الحجز'); onSaved();
    } catch (e: any) {
      notify('error', e.message?.includes('تعارض') ? '⛔ الموعد يتعارض مع حجز آخر — اختر وقتاً آخر' : (e.message || 'فشل'));
    }
    setBusy(false);
  };
  return (
    <Modal title="حجز جديد" onClose={onClose}>
      <select className="input" value={form.providerId} onChange={e => setForm({ ...form, providerId: e.target.value })}>
        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input className="input" placeholder="اسم الزبون *" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
      <input className="input" dir="ltr" placeholder="هاتف الزبون *" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
      <label style={{ fontSize: 13, color: 'var(--ink3)' }}>الموعد *</label>
      <input className="input" type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
      <input className="input" type="number" placeholder="المدة (دقائق)" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: e.target.value })} />
      <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? '...' : 'حجز'}</button>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 20, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
