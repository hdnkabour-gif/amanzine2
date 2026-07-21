import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import * as api from '../services/api';
import { Plus, Copy, Trash2, RefreshCw, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}

interface CouponForm {
  code: string;
  type: 'percent' | 'fixed' | 'shipping';
  value: string;
  minOrder: string;
  maxUses: string;
  expiresAt: string;
  active: boolean;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  type: 'percent',
  value: '',
  minOrder: '',
  maxUses: '',
  expiresAt: '',
  active: true,
};

// ─── Helper: generate random coupon code ─────────────────────────────────────
function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

// ─── Helper: build API base URL ───────────────────────────────────────────────
function apiBase(): string {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173' || window.location.port === '4173') {
      return 'http://localhost:3001/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3001/api';
}

function authHeaders(): Record<string, string> {
  const token = api.getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// ─── Demo mode check ─────────────────────────────────────────────────────────
function isDemo(): boolean {
  try { return localStorage.getItem('ai_commerce_token') === 'demo-token-local'; } catch { return false; }
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CouponsPage() {
  const { settings, updateSettings, notify } = useStore();
  const currency = settings.brand?.currency || 'MAD';
  const demo = isDemo();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // ── Fetch coupons ──────────────────────────────────────────────────────────
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError('');
    if (demo) {
      try {
        const stored = localStorage.getItem('demo_coupons');
        setCoupons(stored ? JSON.parse(stored) : []);
      } catch { setCoupons([]); }
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase()}/coupons`, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'فشل تحميل الكوبونات');
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  // ── Create coupon ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setFormError('');
    if (!form.code.trim()) { setFormError('الرجاء إدخال رمز الكوبون'); return; }
    if (form.type !== 'shipping' && (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)) {
      setFormError('الرجاء إدخال قيمة صحيحة للخصم'); return;
    }
    setSaving(true);
    try {
      const body: any = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.type === 'shipping' ? 0 : Number(form.value),
        minOrder: Number(form.minOrder) || 0,
        maxUses: Number(form.maxUses) || 0,
        active: form.active,
        usedCount: 0,
        createdAt: new Date().toISOString(),
      };
      if (form.expiresAt) body.expiresAt = form.expiresAt;

      if (demo) {
        const newCoupon: Coupon = { ...body, id: 'demo_' + Date.now() };
        const updated = [newCoupon, ...coupons];
        setCoupons(updated);
        try { localStorage.setItem('demo_coupons', JSON.stringify(updated)); } catch {}
        setShowModal(false);
        setForm(EMPTY_FORM);
        setSaving(false);
        return;
      }

      const res = await fetch(`${apiBase()}/coupons`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const created = await res.json();
      setCoupons(prev => [created, ...prev]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      setFormError(e.message || 'فشل إنشاء الكوبون');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete coupon ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('هل تريد حذف هذا الكوبون؟')) return;
    if (demo) {
      const updated = coupons.filter(c => c.id !== id);
      setCoupons(updated);
      try { localStorage.setItem('demo_coupons', JSON.stringify(updated)); } catch {}
      return;
    }
    try {
      const res = await fetch(`${apiBase()}/coupons/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      alert('فشل حذف الكوبون: ' + (e.message || ''));
    }
  };

  // ── Copy code ─────────────────────────────────────────────────────────────
  const handleCopy = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
    }
  };

  // ── WhatsApp share ────────────────────────────────────────────────────────
  const handleWhatsApp = (code: string) => {
    const text = encodeURIComponent(
      `مرحباً! استخدم كود الخصم: ${code}\nأدخله عند إتمام طلبك للحصول على خصمك.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatValue = (c: Coupon): string => {
    if (c.type === 'percent') return `${c.value}%`;
    if (c.type === 'fixed') return `${c.value} ${currency}`;
    return 'شحن مجاني';
  };

  const isExpired = (c: Coupon): boolean => {
    if (!c.expiresAt) return false;
    return new Date(c.expiresAt) < new Date();
  };

  const formatDate = (d: string): string => {
    try {
      return new Date(d).toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  const openModal = () => { setForm(EMPTY_FORM); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page-title">الكوبونات</h1>
          <p className="page-sub">{coupons.length} كوبون</p>
        </div>
        <button onClick={openModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} strokeWidth={2.5} />
          إضافة كوبون
        </button>
      </div>

      {/* ── Explanation banner ── */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 'var(--r)',
        background: 'rgba(0,210,179,0.08)',
        border: '1px solid rgba(0,210,179,0.2)',
        fontSize: 13.5,
        color: 'var(--ink2)',
        lineHeight: 1.6,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
        <span>
          <strong style={{ color: 'var(--ink)' }}>كيف تعمل الكوبونات؟</strong>{' '}
          الكوبون يُعطيه التاجر للزبون عبر واتساب، الزبون يدخله في المتجر عند الطلب للحصول على خصمه تلقائياً.
        </span>
      </div>

      {/* ── العروض الذكية ── */}
      <SmartPromotions settings={settings} updateSettings={updateSettings} notify={notify} currency={currency} />

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r)', background: 'var(--ember-soft)', border: '1px solid rgba(255,106,0,.25)', color: 'var(--ember)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span> {error}
          <button onClick={fetchCoupons} style={{ marginRight: 'auto', background: 'none', border: 'none', color: 'var(--ember)', cursor: 'pointer', padding: '2px 6px', fontSize: 12 }}>إعادة المحاولة</button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--ink3)', fontSize: 14 }}>
          جاري التحميل...
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && coupons.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 20px', color: 'var(--ink3)' }}>
          <span style={{ fontSize: 48 }}>🎟️</span>
          <p style={{ fontSize: 14, fontWeight: 600 }}>لا توجد كوبونات بعد</p>
          <p style={{ fontSize: 12.5, textAlign: 'center' }}>أنشئ أول كوبون خصم وشاركه مع زبائنك</p>
          <button onClick={openModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Plus size={15} /> إضافة كوبون
          </button>
        </div>
      )}

      {/* ── Coupons grid ── */}
      {!loading && coupons.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {coupons.map(coupon => {
            const expired = isExpired(coupon);
            const statusActive = coupon.active && !expired;
            const usageText = coupon.maxUses > 0
              ? `${coupon.usedCount}/${coupon.maxUses}`
              : `${coupon.usedCount}/∞`;
            const usageFull = coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses;

            return (
              <div key={coupon.id} className="card" style={{
                padding: '16px',
                position: 'relative',
                opacity: (!statusActive || usageFull) ? 0.7 : 1,
                border: statusActive && !usageFull
                  ? '1px solid rgba(0,210,179,0.2)'
                  : '1px solid var(--border)',
              }}>
                {/* Status pill */}
                <div style={{ position: 'absolute', top: 12, left: 14 }}>
                  {usageFull ? (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,106,0,0.1)', color: 'var(--ember)', border: '1px solid rgba(255,106,0,0.2)' }}>نفدت</span>
                  ) : expired ? (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,106,0,0.1)', color: 'var(--ember)', border: '1px solid rgba(255,106,0,0.2)' }}>منتهي</span>
                  ) : statusActive ? (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,210,179,0.1)', color: 'var(--mint)', border: '1px solid rgba(0,210,179,0.2)' }}>نشط</span>
                  ) : (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'var(--ink3)', border: '1px solid var(--border)' }}>معطل</span>
                  )}
                </div>

                {/* Code */}
                <div style={{ marginTop: 28, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: 20,
                    fontWeight: 900,
                    letterSpacing: 2,
                    color: 'var(--ink)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '4px 10px',
                    borderRadius: 7,
                    border: '1px dashed var(--border)',
                    flex: 1,
                    textAlign: 'center',
                  }}>
                    {coupon.code}
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink3)' }}>الخصم</span>
                    <span style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 15 }}>{formatValue(coupon)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--ink3)' }}>الاستخدامات</span>
                    <span style={{ fontWeight: 700, color: usageFull ? 'var(--ember)' : 'var(--ink2)' }}>{usageText}</span>
                  </div>
                  {coupon.minOrder > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--ink3)' }}>الحد الأدنى</span>
                      <span style={{ fontWeight: 700, color: 'var(--ink2)' }}>{coupon.minOrder} {currency}</span>
                    </div>
                  )}
                  {coupon.expiresAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--ink3)' }}>الصلاحية</span>
                      <span style={{ fontWeight: 700, color: expired ? 'var(--ember)' : 'var(--ink2)', fontSize: 12 }}>
                        {formatDate(coupon.expiresAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleCopy(coupon.code)}
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12.5 }}
                    title="نسخ الرمز"
                  >
                    {copied === coupon.code
                      ? <><span style={{ color: 'var(--mint)' }}>✓</span> تم النسخ</>
                      : <><Copy size={13} strokeWidth={2} /> نسخ</>
                    }
                  </button>
                  <button
                    onClick={() => handleWhatsApp(coupon.code)}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '6px 10px', borderRadius: 'var(--r-sm)',
                      background: 'rgba(37,211,102,0.1)',
                      border: '1px solid rgba(37,211,102,0.25)',
                      color: '#25D366',
                      fontSize: 12.5, fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    title="مشاركة عبر واتساب"
                  >
                    <span style={{ fontSize: 14 }}>💬</span> واتساب
                  </button>
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ width: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ember)', flexShrink: 0 }}
                    title="حذف"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL ══ */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440 }}>
            {/* Modal header */}
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>إضافة كوبون جديد</h2>
              <button onClick={closeModal}
                style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--ink3)', cursor: 'pointer' }}>
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>

            {/* Modal body */}
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Code field */}
              <div>
                <label className="label">رمز الكوبون</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="مثال: SUMMER20"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 1, fontWeight: 700 }}
                    maxLength={20}
                  />
                  <button
                    onClick={() => setForm(f => ({ ...f, code: randomCode() }))}
                    className="btn btn-ghost"
                    style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, flexShrink: 0 }}
                    title="توليد تلقائي"
                    type="button"
                  >
                    <RefreshCw size={13} strokeWidth={2} /> توليد
                  </button>
                </div>
              </div>

              {/* Type field */}
              <div>
                <label className="label">نوع الخصم</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as CouponForm['type'] }))}
                >
                  <option value="percent">نسبة مئوية (%)</option>
                  <option value="fixed">مبلغ ثابت ({currency})</option>
                  <option value="shipping">شحن مجاني</option>
                </select>
              </div>

              {/* Value field (hidden for shipping) */}
              {form.type !== 'shipping' && (
                <div>
                  <label className="label">
                    {form.type === 'percent' ? 'نسبة الخصم (%)' : `قيمة الخصم (${currency})`}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={form.type === 'percent' ? 100 : undefined}
                    placeholder={form.type === 'percent' ? '20' : '50'}
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  />
                </div>
              )}

              {/* Min order */}
              <div>
                <label className="label">الحد الأدنى للطلب ({currency}) <span style={{ color: 'var(--ink3)', fontWeight: 400 }}>اختياري</span></label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.minOrder}
                  onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                />
              </div>

              {/* Max uses */}
              <div>
                <label className="label">أقصى عدد استخدامات <span style={{ color: 'var(--ink3)', fontWeight: 400 }}>0 = غير محدود</span></label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                />
              </div>

              {/* Expiry date */}
              <div>
                <label className="label">تاريخ الانتهاء <span style={{ color: 'var(--ink3)', fontWeight: 400 }}>اختياري</span></label>
                <input
                  className="input"
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>تفعيل الكوبون مباشرة</span>
                <button
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  style={{
                    width: 44, height: 24,
                    borderRadius: 99,
                    background: form.active ? 'var(--ember)' : 'var(--border)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                  type="button"
                >
                  <span style={{
                    position: 'absolute',
                    top: 3, left: form.active ? 23 : 3,
                    width: 18, height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              {/* Form error */}
              {formError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--ember-soft)', border: '1px solid rgba(255,106,0,0.2)', color: 'var(--ember)', fontSize: 12.5 }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* Submit buttons */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button onClick={closeModal} className="btn btn-ghost" style={{ flex: 1 }} type="button">
                  إلغاء
                </button>
                <button
                  onClick={handleCreate}
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  type="button"
                >
                  {saving ? 'جاري الحفظ...' : <><Plus size={15} strokeWidth={2.5} /> إنشاء الكوبون</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ العروض الذكية — توصيل مجاني، خصم الباقة، عجلة الحظ ═══════════════════
// منطق الحماية: خصم واحد فقط يصل للزبون (الأفضل له)، النسب محصورة بسقف،
// والخادم يعيد حساب كل طلب من أسعار قاعدة البيانات مع حارس هامش الربح (80%).
function SmartPromotions({ settings, updateSettings, notify, currency }: {
  settings: any; updateSettings: (k: any, v: any) => Promise<void>;
  notify: (t: any, m: string) => void; currency: string;
}) {
  const saved = settings.promotions || {};
  const [freeShip, setFreeShip] = useState(String(saved.freeShippingThreshold ?? 400));
  const [bundleOn, setBundleOn] = useState(saved.bundle?.enabled !== false);
  const [bundleMin, setBundleMin] = useState(String(saved.bundle?.minItems ?? 3));
  const [bundlePct, setBundlePct] = useState(String(saved.bundle?.percent ?? 10));
  const [wheelOn, setWheelOn] = useState(saved.wheel?.enabled !== false);
  const [wheelMin, setWheelMin] = useState(String(saved.wheel?.minOrder ?? 150));
  const [savingPromo, setSavingPromo] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // مزامنة عند وصول الإعدادات من الخادم
  useEffect(() => {
    const p = settings.promotions;
    if (!p) return;
    setFreeShip(String(p.freeShippingThreshold ?? 400));
    setBundleOn(p.bundle?.enabled !== false);
    setBundleMin(String(p.bundle?.minItems ?? 3));
    setBundlePct(String(p.bundle?.percent ?? 10));
    setWheelOn(p.wheel?.enabled !== false);
    setWheelMin(String(p.wheel?.minOrder ?? 150));
  }, [settings.promotions]);

  const save = async () => {
    // حصر القيم في حدود آمنة للتاجر — نفس الحدود المطبقة في الخادم
    const pct = Math.min(Math.max(Number(bundlePct) || 10, 3), 25);
    const payload = {
      freeShippingThreshold: Math.max(Number(freeShip) || 400, 100),
      bundle: { enabled: bundleOn, minItems: Math.max(Number(bundleMin) || 3, 2), percent: pct },
      wheel: { enabled: wheelOn, minOrder: Math.max(Number(wheelMin) || 150, 0) },
    };
    setSavingPromo(true);
    try {
      await updateSettings('promotions', payload);
      notify('success', '✅ تم حفظ إعدادات العروض الذكية على الخادم');
    } catch (e: any) {
      notify('error', `❌ لم يتم الحفظ: ${e?.message || 'تحقق من الاتصال'}`);
    }
    setSavingPromo(false);
  };

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' };
  const numStyle: React.CSSProperties = { width: 90, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel2)', color: 'var(--ink1)', fontSize: 13, textAlign: 'center' };

  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink1)' }}>⚡ العروض الذكية</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>تعمل تلقائياً في متجرك — الزبون يحصل على أفضل خصم واحد فقط، والخادم يحمي هامش ربحك</div>
        </div>
        <button onClick={() => setShowTips(s => !s)} className="btn btn-ghost btn-xs">{showTips ? 'إخفاء' : '💰 كيف أربح منها؟'}</button>
      </div>

      {showTips && (
        <div style={{ background: 'var(--gold-soft)', border: '1px solid var(--border-gold)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--ink2)', lineHeight: 1.9 }}>
          <b style={{ color: 'var(--gold)' }}>لماذا هذه العروض تزيد ربحك ولا تنقصه؟</b><br/>
          🚚 <b>التوصيل المجاني فوق {freeShip} {currency}:</b> الزبون الذي سلته 300 يضيف منتجاً آخر ليبلغ العتبة — تدفع 30 درهم توصيل وتربح هامش منتج إضافي كامل.<br/>
          🎁 <b>خصم الباقة:</b> خصم {bundlePct}% على 3 قطع أرباحه أكبر من بيع قطعة واحدة بلا خصم — الحجم يعوّض النسبة، والنسبة محصورة بسقف 25%.<br/>
          🎡 <b>عجلة الحظ:</b> أغلب الجوائز صغيرة (5-8%) و«حظ أوفر»، الكود صالح 48 ساعة فقط وبحد أدنى للطلب — تحفيز شراء عاجل بتكلفة محسوبة.<br/>
          🛡️ <b>الحماية المضمونة:</b> خصم واحد فقط لا تراكم، والخادم يعيد حساب كل طلب من أسعارك الحقيقية ويمنع أي خصم يأكل أكثر من 80% من هامش الربح (حسب تكلفة المنتج المسجلة).
        </div>
      )}

      {/* التوصيل المجاني */}
      <div style={rowStyle}>
        <span style={{ fontSize: 22 }}>🚚</span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink1)' }}>توصيل مجاني فوق</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>يظهر للزبون شريط تقدم يشجعه على رفع قيمة سلته</div>
        </div>
        <input type="number" min={100} value={freeShip} onChange={e => setFreeShip(e.target.value)} style={numStyle} />
        <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{currency}</span>
      </div>

      {/* خصم الباقة */}
      <div style={rowStyle}>
        <span style={{ fontSize: 22 }}>🎁</span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink1)' }}>خصم الباقة (شراء عدة قطع)</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>خصم تلقائي عند بلوغ عدد القطع — النسبة محصورة 3-25%</div>
        </div>
        <label className="toggle toggle-sm"><input type="checkbox" checked={bundleOn} onChange={e => setBundleOn(e.target.checked)} /><span className="toggle-track" /><span className="toggle-thumb" /></label>
        {bundleOn && (<>
          <input type="number" min={2} value={bundleMin} onChange={e => setBundleMin(e.target.value)} style={{ ...numStyle, width: 64 }} title="عدد القطع" />
          <span style={{ fontSize: 12, color: 'var(--ink3)' }}>قطع ←</span>
          <input type="number" min={3} max={25} value={bundlePct} onChange={e => setBundlePct(e.target.value)} style={{ ...numStyle, width: 64 }} title="نسبة الخصم" />
          <span style={{ fontSize: 12, color: 'var(--ink3)' }}>%</span>
        </>)}
      </div>

      {/* عجلة الحظ */}
      <div style={rowStyle}>
        <span style={{ fontSize: 22 }}>🎡</span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink1)' }}>عجلة الحظ</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>لفّة واحدة يومياً لكل زائر، كوبون حقيقي صالح 48 ساعة وبحد أدنى للطلب</div>
        </div>
        <label className="toggle toggle-sm"><input type="checkbox" checked={wheelOn} onChange={e => setWheelOn(e.target.checked)} /><span className="toggle-track" /><span className="toggle-thumb" /></label>
        {wheelOn && (<>
          <span style={{ fontSize: 12, color: 'var(--ink3)' }}>حد أدنى</span>
          <input type="number" min={0} value={wheelMin} onChange={e => setWheelMin(e.target.value)} style={{ ...numStyle, width: 80 }} />
          <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{currency}</span>
        </>)}
      </div>

      <button onClick={save} disabled={savingPromo} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
        {savingPromo ? '⟳ جارٍ الحفظ...' : '💾 حفظ العروض'}
      </button>
    </div>
  );
}
