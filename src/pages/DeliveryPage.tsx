import { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  Truck, Plus, Trash2, Eye, EyeOff, CheckCircle, AlertTriangle,
  Zap, ChevronDown, ChevronUp, Globe, Key, Copy, ExternalLink, X,
} from 'lucide-react';
import type { DeliveryProviderConfig } from '../types';
import { settingsAPI, getToken as getAuthToken } from '../services/api';

// ─── سجل الشحنات: الحقيقة الكاملة لكل عملية شحن ──────────────────────────────
// يقرأ سجلات النظام (type=delivery) ويبين لكل طلب: هل أُنشئت شحنة حقيقية
// لدى الشركة (API/Webhook) أم كانت محاكاة برقم داخلي يتطلب إدخالاً يدوياً.
function ShipmentsLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    settingsAPI.getLogs()
      .then(all => setLogs((all || []).filter((l: any) => l.type === 'delivery').slice(0, 20)))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const kind = (l: any): { label: string; color: string; bg: string } => {
    const t = `${l.action || ''} ${l.details || ''}`;
    if (/محاكاة|simulated|SIMULATED/i.test(t)) return { label: '⚠️ محاكاة — أدخل يدوياً', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' };
    if (/حقيقية|Amana|Jibli|Livo|Webhook|automation/i.test(t)) return { label: '✅ شحنة حقيقية', color: '#34d399', bg: 'rgba(16,185,129,0.1)' };
    return { label: 'ℹ️ حدث توصيل', color: 'var(--txt-3)', bg: 'rgba(255,255,255,0.05)' };
  };

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--txt-1)' }}>📦 سجل الشحنات — ماذا حدث فعلاً؟</p>
        <button onClick={load} className="btn btn-ghost btn-xs">↻ تحديث</button>
      </div>
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--txt-3)', textAlign: 'center', padding: '14px 0' }}>جارٍ التحميل...</p>
      ) : logs.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--txt-3)', textAlign: 'center', padding: '14px 0' }}>
          لا شحنات بعد — عند شحن أول طلب من صفحة الطلبات سيظهر هنا ما حدث بالضبط (حقيقي أم محاكاة)
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((l: any) => {
            const k = kind(l);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--clr-border)' }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: k.bg, color: k.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{k.label}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt-1)' }}>{l.action}</p>
                  {l.details && <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 2 }}>{l.details}</p>}
                  <p style={{ fontSize: 10.5, color: 'var(--txt-3)', marginTop: 2, opacity: 0.7 }}>{l.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Templates ───────────────────────────────────────────────────────────────
const TEMPLATES = [
  { name: 'Amana', logo: '📦', url: 'https://www.amana.ma', loginUrl: 'https://www.amana.ma/auth', addOrder: 'https://www.amana.ma/orders/create', guide: 'أنشئ حساباً تجارياً على amana.ma' },
  { name: 'Jibli Maroc', logo: '🚚', url: 'https://app.jibli.ma', loginUrl: 'https://app.jibli.ma/auth/login', addOrder: 'https://app.jibli.ma/shipments/create', guide: 'سجل على jibli.ma كبائع' },
  { name: 'Naqel', logo: '⚡', url: 'https://www.naqelexpress.com', loginUrl: 'https://merchant.naqelexpress.com/login', addOrder: '', guide: 'أنشئ حساب تاجر على naqelexpress.com' },
  { name: 'Livo', logo: '🛵', url: 'https://my.livo.ma', loginUrl: '', addOrder: '', apiEndpoint: 'https://rest.livo.ma', guide: 'REST API بمفتاح — الوثائق: my.livo.ma/api-docs' },
  { name: 'أخرى', logo: '🏢', url: '', loginUrl: '', addOrder: '', guide: 'أدخل بيانات شركتك يدوياً' },
];

const LOGO_OPTIONS = ['📦','🚚','⚡','🏢','🛵','🏍️','✈️','🚀','🌍','🔗'];

// ─── Simple-mode known companies ─────────────────────────────────────────────
const SIMPLE_COMPANIES = [
  { name: 'Amana', logo: '📦', url: 'https://www.amana.ma', loginUrl: 'https://www.amana.ma/auth', addOrder: 'https://www.amana.ma/orders/create' },
  { name: 'Jibli Maroc', logo: '🚚', url: 'https://app.jibli.ma', loginUrl: 'https://app.jibli.ma/auth/login', addOrder: 'https://app.jibli.ma/shipments/create' },
  { name: 'Naqel', logo: '⚡', url: 'https://www.naqelexpress.com', loginUrl: 'https://merchant.naqelexpress.com/login', addOrder: '' },
  { name: 'Maystro', logo: '🏍️', url: 'https://maystro-delivery.com', loginUrl: 'https://maystro-delivery.com/login', addOrder: 'https://maystro-delivery.com/create-order' },
  { name: 'Yalidin', logo: '🛵', url: 'https://yalidin.com', loginUrl: 'https://yalidin.com/login', addOrder: '' },
  { name: 'أخرى', logo: '🏢', url: '', loginUrl: '', addOrder: '' },
];

// ─── Default order field selectors ───────────────────────────────────────────
const DEFAULT_FIELD_ROWS: { key: string; label: string; placeholder: string }[] = [
  { key: 'recipientName', label: 'اسم الزبون',   placeholder: `input[name="recipient_name"]` },
  { key: 'phone',         label: 'هاتف الزبون',  placeholder: `input[name="phone"]` },
  { key: 'city',          label: 'المدينة',      placeholder: `select[name="city"]` },
  { key: 'address',       label: 'العنوان',       placeholder: `input[name="address"]` },
  { key: 'cod',           label: 'مبلغ COD',     placeholder: `input[name="cod_amount"]` },
  { key: 'notes',         label: 'ملاحظات',       placeholder: `textarea[name="notes"]` },
];

// ─── Empty states ────────────────────────────────────────────────────────────
const EMPTY_API: Partial<DeliveryProviderConfig> = {
  name: '', logo: '🚚', websiteUrl: '', loginUrl: '', username: '', password: '',
  addOrderPage: '', livraisonBonPage: '', ramassagePage: '',
  apiKey: '', apiEndpoint: '', apiType: '',
  enabled: true, mode: 'api', fields: {},
};

interface UrlRecipeDraft {
  // step 1
  name: string;
  logo: string;
  websiteUrl: string;
  // step 2
  loginUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  loginSubmit: string;
  username: string;
  password: string;
  // step 3
  createOrderUrl: string;
  fields: Record<string, string>;
  submitSelector: string;
  trackingSelector: string;
}

const EMPTY_URL: UrlRecipeDraft = {
  name: '', logo: '📦', websiteUrl: '',
  loginUrl: '', usernameSelector: `input[name="email"]`,
  passwordSelector: `input[name="password"]`, loginSubmit: `button[type="submit"]`,
  username: '', password: '',
  createOrderUrl: '',
  fields: { recipientName: '', phone: '', city: '', address: '', cod: '', notes: '' },
  submitSelector: `button[type="submit"]`,
  trackingSelector: '.tracking-number',
};

// ─── ManualAssistModal ────────────────────────────────────────────────────────
interface ManualAssistData {
  loginUrl?: string;
  createOrderUrl?: string;
  fields: Record<string, string>;
}

function ManualAssistModal({ data, providerName, onClose }: { data: ManualAssistData; providerName: string; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (label: string, val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  };

  const targetUrl = data.createOrderUrl || data.loginUrl || '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid var(--clr-border)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--txt-1)', marginBottom: 3 }}>مساعدة يدوية — {providerName}</h2>
            <p style={{ fontSize: 12, color: 'var(--txt-3)' }}>الأتمتة الكاملة غير متاحة — انسخ البيانات وأدخلها يدوياً</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left: site link */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt-1)' }}>موقع التوصيل</p>
            {targetUrl ? (
              <>
                <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)', fontFamily: 'monospace', fontSize: 11.5, color: 'var(--txt-2)', wordBreak: 'break-all' }}>
                  {targetUrl}
                </div>
                <a href={targetUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--clr-pri-h)', fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                  <ExternalLink size={14} /> فتح الموقع
                </a>
                {data.loginUrl && data.loginUrl !== targetUrl && (
                  <a href={data.loginUrl} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)', color: 'var(--txt-2)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    <Key size={13} /> صفحة الدخول
                  </a>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--txt-3)' }}>لا يوجد رابط محفوظ</p>
            )}

            <div style={{ marginTop: 8, padding: '10px 13px', borderRadius: 10, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p style={{ fontSize: 11.5, color: 'rgba(251,191,36,0.8)', lineHeight: 1.6 }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginLeft: 4 }} />
                افتح الموقع، سجل الدخول، ثم انسخ بيانات الطلب من اليمين وأدخلها في الحقول المناسبة
              </p>
            </div>
          </div>

          {/* Right: order fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt-1)' }}>بيانات الطلب</p>
            {Object.entries(data.fields).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10.5, color: 'var(--txt-3)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</p>
                </div>
                <button onClick={() => copy(label, value)}
                  style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 7, background: copied === label ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied === label ? 'rgba(16,185,129,0.35)' : 'var(--clr-border)'}`, color: copied === label ? '#10b981' : 'var(--txt-3)', cursor: 'pointer', fontSize: 11 }}>
                  {copied === label ? '✓' : <Copy size={12} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 22px 18px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ paddingInline: 24 }}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared input component ───────────────────────────────────────────────────
function Input({ label, value, onChange, ph, dir = 'ltr', secret = false, mono = true, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  ph?: string; dir?: string; secret?: boolean; mono?: boolean; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 5 }}>{hint}</p>}
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={secret && !show ? 'password' : 'text'}
          placeholder={ph}
          value={value}
          onChange={e => onChange(e.target.value)}
          dir={dir}
          style={{ paddingLeft: secret ? 40 : 14, fontSize: 13, fontFamily: mono ? 'monospace' : 'inherit' }}
        />
        {secret && (
          <button onClick={() => setShow(!show)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 8, height: 8, borderRadius: 4,
          background: i < current ? 'var(--clr-success, #10b981)' : i === current ? 'var(--clr-pri-h)' : 'var(--clr-border)',
          transition: 'all .25s',
        }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--txt-3)', marginRight: 4 }}>الخطوة {current + 1} من {total}</span>
    </div>
  );
}

// ─── URL Mode — 4-step wizard ─────────────────────────────────────────────────
function UrlWizard({ onSave, onCancel, onDirtyChange }: {
  onSave: (draft: UrlRecipeDraft) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UrlRecipeDraft>({ ...EMPTY_URL });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | 'ok' | 'fail' | 'stage'>(null);
  const [testStage, setTestStage] = useState('');

  const set = <K extends keyof UrlRecipeDraft>(k: K, v: UrlRecipeDraft[K]) => {
    setDraft(d => {
      const next = { ...d, [k]: v };
      const dirty = !!(next.name || next.websiteUrl || next.username || next.password);
      onDirtyChange?.(dirty);
      return next;
    });
  };

  const setField = (key: string, val: string) =>
    setDraft(d => ({ ...d, fields: { ...d.fields, [key]: val } }));

  const applyTpl = (t: typeof TEMPLATES[0]) => setDraft(d => ({
    ...d,
    name: t.name, logo: t.logo, websiteUrl: t.url,
    loginUrl: t.loginUrl, createOrderUrl: t.addOrder,
  }));

  const canNext0 = draft.name.trim().length > 0 && draft.websiteUrl.trim().length > 0;
  const canNext1 = draft.loginUrl.trim().length > 0 && draft.username.trim().length > 0 && draft.password.trim().length > 0;
  const canNext2 = draft.createOrderUrl.trim().length > 0;

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    const token = getAuthToken() || '';
    const stages = ['الاتصال بالخادم...', 'التحقق من الرابط...', 'فحص الاستجابة...'];
    for (const s of stages) { setTestStage(s); await new Promise(r => setTimeout(r, 380)); }
    try {
      const r = await fetch('/api/delivery/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: draft.websiteUrl }),
        signal: AbortSignal.timeout(10000),
      });
      const d = await r.json();
      setTestResult(d.ok ? 'ok' : 'fail');
      setTestStage(d.info || '');
    } catch {
      setTestResult('fail');
      setTestStage('');
    } finally { setTesting(false); }
  };

  // ── Step 0: Basic Info ───────────────────────────────────────────────────
  const renderStep0 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label">اختر شركة معروفة</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 4 }}>
          {TEMPLATES.map(t => (
            <button key={t.name} onClick={() => applyTpl(t)}
              style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${draft.name === t.name ? 'rgba(99,102,241,0.45)' : 'var(--clr-border)'}`, background: draft.name === t.name ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{t.logo}</div>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--txt-2)' }}>{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Input label="اسم الشركة *" value={draft.name} onChange={v => set('name', v)} ph="Amana Livraison" dir="rtl" mono={false} />
        </div>
        <div>
          <label className="label">شعار (إيموجي)</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {LOGO_OPTIONS.map(e => (
              <button key={e} onClick={() => set('logo', e)}
                style={{ width: 34, height: 34, borderRadius: 8, fontSize: 18, cursor: 'pointer', border: `1.5px solid ${draft.logo === e ? 'rgba(99,102,241,0.5)' : 'var(--clr-border)'}`, background: draft.logo === e ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)' }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <Input label="رابط الموقع *" value={draft.websiteUrl} onChange={v => set('websiteUrl', v)} ph="https://delivery-company.ma" />
        </div>
      </div>
    </div>
  );

  // ── Step 1: Login Config ─────────────────────────────────────────────────
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'rgba(165,180,252,0.85)', lineHeight: 1.6 }}>
        <Globe size={12} style={{ display: 'inline', marginLeft: 5 }} />
        أدخل بيانات تسجيل الدخول لحسابك التجاري على موقع {draft.name}، ثم حدد مُحددات CSS للحقول.
      </div>

      <Input label="رابط صفحة الدخول *" value={draft.loginUrl} onChange={v => set('loginUrl', v)} ph="https://delivery.ma/login" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="CSS: حقل اسم المستخدم" value={draft.usernameSelector} onChange={v => set('usernameSelector', v)} ph={`input[name="email"]`} />
        <Input label="CSS: حقل كلمة المرور" value={draft.passwordSelector} onChange={v => set('passwordSelector', v)} ph={`input[name="password"]`} />
        <div style={{ gridColumn: '1/-1' }}>
          <Input label="CSS: زر الإرسال" value={draft.loginSubmit} onChange={v => set('loginSubmit', v)} ph={`button[type="submit"]`} />
        </div>
        <Input label="اسم المستخدم / البريد *" value={draft.username} onChange={v => set('username', v)} ph="email@..." mono={false} />
        <Input label="كلمة المرور *" value={draft.password} onChange={v => set('password', v)} ph="••••••••" secret mono={false} />
      </div>
    </div>
  );

  // ── Step 2: Create Order Config ──────────────────────────────────────────
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input
        label="رابط صفحة إنشاء الطلب *"
        value={draft.createOrderUrl}
        onChange={v => set('createOrderUrl', v)}
        ph="https://delivery.ma/orders/create"
        hint="الصفحة التي يُفتح بعد تسجيل الدخول لإنشاء طلب جديد"
      />

      {/* Field mapping table */}
      <div>
        <label className="label">ربط حقول الطلب بمُحددات CSS</label>
        <p style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 10, lineHeight: 1.5 }}>
          لكل حقل في طلبك، أدخل مُحدد CSS المقابل في موقع شركة التوصيل.
          استخدم أدوات المطور (F12) في المتصفح للعثور على المُحددات.
        </p>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--clr-border)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderBottom: '1px solid var(--clr-border)' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--txt-2)' }}>بيانات الطلب</p>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--txt-2)' }}>CSS Selector على موقع التوصيل</p>
          </div>
          {DEFAULT_FIELD_ROWS.map((row, i) => (
            <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '9px 14px', borderBottom: i < DEFAULT_FIELD_ROWS.length - 1 ? '1px solid var(--clr-border)' : 'none', alignItems: 'center', gap: 12, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt-2)' }}>{row.label}</p>
              <input
                className="input"
                value={draft.fields[row.key] || ''}
                onChange={e => setField(row.key, e.target.value)}
                placeholder={row.placeholder}
                dir="ltr"
                style={{ fontSize: 12.5, fontFamily: 'monospace', padding: '7px 11px' }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input
          label="CSS: زر الإرسال / الإنشاء"
          value={draft.submitSelector}
          onChange={v => set('submitSelector', v)}
          ph={`button[type="submit"]`}
        />
        <Input
          label='CSS: مكان ظهور رقم التتبع'
          value={draft.trackingSelector}
          onChange={v => set('trackingSelector', v)}
          ph=".tracking-number"
          hint="العنصر الذي يعرض رقم التتبع بعد الإنشاء"
        />
      </div>
    </div>
  );

  // ── Step 3: Test & Save ──────────────────────────────────────────────────
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          ['الشركة', `${draft.logo} ${draft.name}`],
          ['الموقع', draft.websiteUrl],
          ['رابط الدخول', draft.loginUrl],
          ['حساب المستخدم', draft.username],
          ['صفحة الطلب', draft.createOrderUrl],
          ['حقول مربوطة', `${Object.values(draft.fields).filter(Boolean).length} / ${DEFAULT_FIELD_ROWS.length}`],
        ].map(([l, v]) => v ? (
          <div key={l} style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)' }}>
            <p style={{ fontSize: 10.5, color: 'var(--txt-3)', marginBottom: 3 }}>{l}</p>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: l === 'الشركة' ? 'inherit' : 'monospace' }}>{v}</p>
          </div>
        ) : null)}
      </div>

      {/* Test button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={testConnection}
          disabled={testing}
          className="btn btn-ghost"
          style={{ gap: 7 }}>
          <Zap size={14} />
          {testing ? 'جاري الاختبار...' : 'اختبار الاتصال'}
        </button>
        {testing && testStage && (
          <span style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 600 }}>{testStage}</span>
        )}
        {!testing && testResult === 'ok' && (
          <span style={{ fontSize: 12.5, color: '#10b981', fontWeight: 700 }}>
            <CheckCircle size={13} style={{ display: 'inline', marginLeft: 5 }} />
            الموقع يستجيب{testStage ? ` · ${testStage}` : ''}
          </span>
        )}
        {!testing && testResult === 'fail' && (
          <span style={{ fontSize: 12.5, color: '#f59e0b', fontWeight: 700 }}>
            <AlertTriangle size={13} style={{ display: 'inline', marginLeft: 5 }} />
            {testStage || 'لم يمكن الوصول للموقع'}
          </span>
        )}
      </div>

      <div style={{ padding: '11px 14px', borderRadius: 11, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'rgba(165,180,252,0.8)', lineHeight: 1.7 }}>
        <strong>كيف تعمل الأتمتة؟</strong><br />
        عند إنشاء توصيل، يفتح السيرفر متصفحاً مخفياً، يسجل الدخول لحسابك،
        يملأ بيانات الطلب تلقائياً، ويسترجع رقم التتبع.
        إذا لم يكن Puppeteer متاحاً، يُفعَّل وضع المساعدة اليدوية.
      </div>
    </div>
  );

  const steps = [
    { title: 'المعلومات الأساسية', render: renderStep0, canNext: canNext0 },
    { title: 'إعداد تسجيل الدخول', render: renderStep1, canNext: canNext1 },
    { title: 'نموذج إنشاء الطلب', render: renderStep2, canNext: canNext2 },
    { title: 'اختبار وحفظ', render: renderStep3, canNext: true },
  ];

  const current = steps[step];

  return (
    <>
      <StepDots current={step} total={steps.length} />
      <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1)', marginBottom: 16 }}>{current.title}</p>
      {current.render()}
      <div style={{ display: 'flex', gap: 10, paddingTop: 20, borderTop: '1px solid var(--clr-border)', marginTop: 8 }}>
        <button onClick={step === 0 ? onCancel : () => setStep(s => s - 1)} className="btn btn-ghost" style={{ paddingInline: 18 }}>
          {step === 0 ? 'إلغاء' : '→ رجوع'}
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={() => { if (current.canNext) setStep(s => s + 1); }}
            disabled={!current.canNext}
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center', opacity: current.canNext ? 1 : 0.5 }}>
            التالي ←
          </button>
        ) : (
          <button onClick={() => onSave(draft)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            <CheckCircle size={15} /> حفظ الوصفة
          </button>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DeliveryPage() {
  const { settings, updateSettings, notify, deliveryProviders, saveDeliveryProvider, removeDeliveryProvider } = useStore();
  const providers = deliveryProviders;

  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'simple' | 'whatsapp' | 'api' | 'url-recipe'>('simple');
  const [config, setConfig] = useState<Partial<DeliveryProviderConfig>>(EMPTY_API);
  const [selected, setSelected] = useState<string | null>(null);

  // Simple mode state
  const [simpleCompany, setSimpleCompany] = useState<string | null>(null);
  const [simpleCreds, setSimpleCreds] = useState({ username: '', password: '' });
  const [simpleCustomUrl, setSimpleCustomUrl] = useState({ url: '', loginUrl: '' });

  // WhatsApp mode state
  const [waName, setWaName] = useState('');
  const [waPhone, setWaPhone] = useState('');

  // ManualAssist state
  const [manualAssist, setManualAssist] = useState<{ data: ManualAssistData; providerName: string } | null>(null);

  // Dirty-state tracking to prevent accidental data loss
  const [urlWizardDirty, setUrlWizardDirty] = useState(false);

  // الجسرُ الهشّ الذي كان هنا (مزامنةُ الإعدادات ⇄ الجدول عند تغيّر العدد فقط)
  // زال: الخادمُ يمتصّ الشركاتِ القديمة عند أوّل قراءة، وكلُّ كتابةٍ تمرّ به.

  // ── API Mode save ──────────────────────────────────────────────────────────
  const saveApi = async () => {
    // شركةٌ بمفتاح REST (مثل Livo) لا تحتاج صفحة دخولٍ ولا كلمة مرور، والعكس صحيح.
    const hasKey  = !!(config.apiKey && config.apiEndpoint);
    const hasLogin = !!(config.loginUrl && config.username && config.password);
    if (!config.name || (!hasKey && !hasLogin)) {
      notify('error', 'املأ الاسم، ثم إمّا (مفتاح API + نقطة النهاية) أو (رابط الدخول + المستخدم + كلمة المرور)');
      return;
    }
    try {
      await saveDeliveryProvider({
        name: config.name!, logo: config.logo || '🚚',
        enabled: true, mode: 'api',
        websiteUrl: config.websiteUrl || '', loginUrl: config.loginUrl || '',
        username: config.username || '', password: config.password || '',
        addOrderPage: config.addOrderPage || '', livraisonBonPage: config.livraisonBonPage || '',
        ramassagePage: config.ramassagePage || '',
        apiKey: config.apiKey || '', apiEndpoint: config.apiEndpoint || '',
        apiType: config.apiType || '',
        fields: (config.fields || {}) as any,
      });
    } catch (e: any) {
      // لا نحفظ محلّيًّا عند الفشل: نسخةٌ محلّيّةٌ بلا صفٍّ في الخادم هي بالضبط
      // ما كان يُظهر الشركةَ «مفعّلة» بينما الشحنُ يقول «لا توجد شركة مفعّلة».
      notify('error', `تعذّر الحفظ على الخادم: ${e?.message || 'تحقّق من الاتصال'} — لم تُضَف الشركة`);
      return;
    }
    updateSettings('delivery', { ...settings.delivery, defaultProvider: config.name! });
    notify('success', `تم إضافة ${config.name}`);
    setShowAdd(false); setConfig(EMPTY_API);
  };

  // ── URL Recipe save ────────────────────────────────────────────────────────
  const saveUrlRecipe = async (draft: UrlRecipeDraft) => {
    const recipe = {
      loginUrl: draft.loginUrl,
      usernameSelector: draft.usernameSelector,
      passwordSelector: draft.passwordSelector,
      loginSubmit: draft.loginSubmit,
      username: draft.username,
      password: draft.password,
      createOrderUrl: draft.createOrderUrl,
      fields: draft.fields,
      submitSelector: draft.submitSelector,
      trackingSelector: draft.trackingSelector,
    };
    try {
      await saveDeliveryProvider({
        name: draft.name, logo: draft.logo,
        enabled: true, mode: 'browser',
        websiteUrl: draft.websiteUrl, loginUrl: draft.loginUrl,
        username: draft.username, password: draft.password,
        addOrderPage: draft.createOrderUrl,
        livraisonBonPage: '', ramassagePage: '',
        apiKey: '', apiEndpoint: '',
        // الوصفةُ تُخزَّن في عمودَيها الحقيقيّين لا داخل `fields`: delivery-auto.js
        // يبحث في الجدول عن apiType='url-recipe' ويقرأ webhookUrl — وكانت الوصفات
        // لا تصل الجدولَ أصلًا فيستحيل عليه العثورُ عليها.
        apiType: 'url-recipe', webhookUrl: JSON.stringify(recipe),
        fields: {} as any,
      });
    } catch (e: any) {
      notify('error', `تعذّر حفظ الوصفة على الخادم: ${e?.message || 'تحقّق من الاتصال'}`);
      return;
    }
    updateSettings('delivery', { ...settings.delivery, defaultProvider: draft.name });
    notify('success', `تم إضافة وصفة ${draft.name}`);
    setShowAdd(false);
  };

  // ── Simple Mode save ──────────────────────────────────────────────────────
  const saveSimple = async () => {
    const co = SIMPLE_COMPANIES.find(c => c.name === simpleCompany);
    if (!co || !simpleCreds.username || !simpleCreds.password) {
      notify('error', 'يرجى اختيار شركة وإدخال البريد وكلمة المرور');
      return;
    }
    try {
      await saveDeliveryProvider({
        name: co.name, logo: co.logo,
        enabled: true, mode: 'api',
        websiteUrl: co.url || simpleCustomUrl.url,
        loginUrl: co.loginUrl || simpleCustomUrl.loginUrl,
        username: simpleCreds.username, password: simpleCreds.password,
        addOrderPage: co.addOrder, livraisonBonPage: '', ramassagePage: '',
        apiKey: '', apiEndpoint: '', fields: {},
      });
    } catch (e: any) {
      notify('error', `تعذّر الحفظ على الخادم: ${e?.message || 'تحقّق من الاتصال'} — لم تُضَف الشركة`);
      return;
    }
    updateSettings('delivery', { ...settings.delivery, defaultProvider: co.name });
    notify('success', `تم إضافة ${co.name}`);
    setShowAdd(false);
    setSimpleCompany(null); setSimpleCreds({ username: '', password: '' }); setSimpleCustomUrl({ url: '', loginUrl: '' });
  };

  // ── WhatsApp Mode save ─────────────────────────────────────────────────────
  const saveWhatsApp = async () => {
    if (!waPhone || !waName) {
      notify('error', 'يرجى إدخال اسم الشركة ورقم واتساب');
      return;
    }
    const phone = waPhone.replace(/\D/g, '');
    try {
      await saveDeliveryProvider({
        name: waName, logo: '📱',
        enabled: true, mode: 'api',
        websiteUrl: `https://wa.me/${phone}`,
        loginUrl: '', username: '', password: '',
        addOrderPage: '', livraisonBonPage: '', ramassagePage: '',
        apiKey: '', apiEndpoint: phone,
        apiType: 'whatsapp', webhookUrl: phone,
        fields: {} as any,
      });
    } catch (e: any) {
      notify('error', `تعذّر الحفظ على الخادم: ${e?.message || 'تحقّق من الاتصال'} — لم تُضَف الشركة`);
      return;
    }
    updateSettings('delivery', { ...settings.delivery, defaultProvider: waName });
    notify('success', `تم إضافة واتساب التوصيل`);
    setShowAdd(false); setWaName(''); setWaPhone('');
  };

  const remove = async (id: string) => {
    // الحذفُ يمرّ بالخادم وحده. كان يُزال محلّيًّا ثم يُحاوَل حذفُ الصفّ بـ
    // catch صامت ⇒ فشلُ الشبكة يترك الصفَّ ومفتاحَه في القاعدة بلا أثرٍ ظاهر.
    try {
      await removeDeliveryProvider(id);
      notify('warning', 'تم الحذف');
    } catch (e: any) {
      notify('error', `تعذّر الحذف: ${e?.message || 'تحقّق من الاتصال'} — الشركة ما زالت مسجّلة`);
    }
  };

  const testConn = async (prov: DeliveryProviderConfig) => {
    notify('info', `اختبار ${prov.name}...`);
    const token = getAuthToken() || '';
    try {
      if (prov.websiteUrl) {
        const r = await fetch('/api/delivery/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ url: prov.websiteUrl }),
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        if (d.ok) { notify('success', `✅ ${prov.name} يستجيب${d.info ? ` · ${d.info}` : ''}`); return; }
        notify('warning', `⚠️ ${prov.name}: ${d.error || 'لم يستجب الموقع'}`);
        return;
      }
      notify('success', `إعدادات ${prov.name} محفوظة`);
    } catch { notify('warning', `لم يمكن الوصول لـ ${prov.name}`); }
  };

  // العمودُ `apiType` هو المرجع الآن؛ الشرطان الآخران يبقيان لصفوفٍ قديمة
  // كانت تخبّئ النوعَ داخل `fields` أو تضعه في `apiKey`.
  const isUrlRecipe = (p: DeliveryProviderConfig) =>
    p.apiType === 'url-recipe' || (p.fields as any)?.apiType === 'url-recipe' || p.apiKey === 'url-recipe';

  const closeAdd = () => {
    setShowAdd(false); setAddMode('simple'); setConfig(EMPTY_API);
    setSimpleCompany(null); setSimpleCreds({ username: '', password: '' }); setSimpleCustomUrl({ url: '', loginUrl: '' });
    setWaName(''); setWaPhone(''); setUrlWizardDirty(false);
  };

  const getIsDirty = () => {
    if (addMode === 'simple') return !!simpleCompany || !!simpleCreds.username || !!simpleCreds.password;
    if (addMode === 'whatsapp') return !!waName || !!waPhone;
    if (addMode === 'api') return !!(config.name || config.loginUrl || config.username);
    if (addMode === 'url-recipe') return urlWizardDirty;
    return false;
  };

  const handleCloseAdd = () => {
    if (getIsDirty() && !window.confirm('لديك بيانات غير محفوظة. هل تريد الإغلاق؟')) return;
    closeAdd();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">شركات التوصيل</h1>
          <p className="page-sub">إعداد شركات التوصيل — النظام يملأ الطلبات تلقائياً</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus size={16} /> إضافة شركة</button>
      </div>

      {/* How it works */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--txt-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={16} color="var(--clr-accent)" /> كيف يشتغل تلقائياً؟
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {['يفتح الموقع', 'يسجل الدخول', 'يملأ البيانات', 'يختار المدينة', 'ينشئ الطلب', 'يرجع التتبع'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.12))', border: '1px solid rgba(99,102,241,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'var(--clr-pri-h)', margin: '0 auto 5px' }}>{i + 1}</div>
                <p style={{ fontSize: 10, color: 'var(--txt-3)', whiteSpace: 'nowrap', fontWeight: 700 }}>{s}</p>
              </div>
              {i < 5 && <div style={{ width: 20, height: 1.5, background: 'var(--clr-border)', flexShrink: 0, marginBottom: 14 }} />}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 10, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.75)', lineHeight: 1.5 }}>الأتمتة الكاملة تحتاج Backend Server مع Puppeteer. بدونه، يُفعَّل وضع المساعدة اليدوية.</p>
        </div>
      </div>

      {/* الحقيقة: متى تكون الشحنة حقيقية ومتى محاكاة؟ */}
      <div className="card" style={{ padding: '16px 18px', borderColor: 'rgba(0,210,179,0.25)' }}>
        <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--mint)', marginBottom: 10 }}>🔍 كيف أعرف أن طلب الشحن أُنشئ فعلاً لدى الشركة؟</p>
        <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.9 }}>
          <b style={{ color: 'var(--ink1)' }}>إضافة الشركة هنا تحفظ بياناتها فقط — لا تُنشئ أي شحنة.</b> الشحنة تُنشأ عند ضغط «شحن» على طلب في صفحة الطلبات، وحينها يخبرك النظام بصدق بإحدى حالتين:<br/>
          <span style={{ color: '#34d399', fontWeight: 700 }}>✅ شحنة حقيقية</span> — فقط إذا هيأتَ للشركة: مفتاح API (أمانة/جيبلي/Livo) أو رابط Webhook أو وصفة أتمتة URL. عندها يُرسل الطلب فعلياً لنظام الشركة ويعود رقم تتبع حقيقي منها.<br/>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>⚠️ محاكاة</span> — إذا أضفت الشركة بالاسم والرابط فقط (بدون API). يُولَّد رقم تتبع داخلي للتنظيم، <b>وعليك إدخال الطلب يدوياً في موقع الشركة</b>. ستصلك رسالة تحذير صريحة بذلك مع سبب عدم الإرسال.<br/>
          والسجل أدناه يعرض تاريخ كل شحنة وما حدث فيها بالضبط.
        </div>
      </div>

      {/* سجل الشحنات */}
      <ShipmentsLog />

      {/* Auto settings */}
      <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { l: 'إرسال تلقائي للتوصيل عند الموافقة', k: 'autoSendOnApproval' },
          { l: 'إشعار الزبون عند الشحن', k: 'notifyCustomerOnShip' },
        ].map(item => (
          <div key={item.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-1)' }}>{item.l}</p>
            <button
              onClick={() => updateSettings('delivery', { ...settings.delivery, [item.k]: !(settings.delivery as any)[item.k] })}
              className={`toggle ${(settings.delivery as any)[item.k] ? 'on' : ''}`}
            />
          </div>
        ))}
      </div>

      {/* Providers list */}
      {providers.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Truck size={48} style={{ opacity: .2, marginBottom: 12 }} />
          <p style={{ color: 'var(--txt-2)', fontWeight: 700, marginBottom: 16 }}>لم تضف شركة توصيل بعد</p>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ margin: '0 auto' }}><Plus size={16} /> إضافة</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {providers.map(p => {
            const recipe = isUrlRecipe(p);
            return (
              <div key={p.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', cursor: 'pointer' }} onClick={() => setSelected(selected === p.id ? null : p.id)}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{p.logo}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <p style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--txt-1)' }}>{p.name}</p>
                      {recipe && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', color: 'var(--clr-pri-h)', fontWeight: 800 }}>
                          URL Recipe
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--txt-3)' }}>{p.websiteUrl || 'لا يوجد رابط'} · {recipe ? 'أتمتة موقع' : 'API'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); testConn(p); }} className="btn btn-ghost btn-sm" style={{ gap: 5 }}><Zap size={13} /> اختبار</button>
                    <button onClick={e => { e.stopPropagation(); remove(p.id); }} className="btn btn-danger btn-sm" style={{ paddingInline: 10 }}><Trash2 size={13} /></button>
                    <button onClick={e => {
                      e.stopPropagation();
                      // الكائنُ كاملًا لا حقولًا مختارة: الحفظُ يكتب كلَّ الأعمدة،
                      // فإرسالُ خمسةِ حقولٍ فقط كان يمحو الباقي (الشعار، الوضع، بيانات الدخول).
                      saveDeliveryProvider({ ...p, enabled: !p.enabled })
                        .catch(() => notify('warning', '⚠️ تعذّر تحديث الحالة على الخادم'));
                    }} className={`toggle ${p.enabled ? 'on' : ''}`} />
                  </div>
                  {selected === p.id ? <ChevronUp size={15} color="var(--txt-3)" /> : <ChevronDown size={15} color="var(--txt-3)" />}
                </div>

                {selected === p.id && (
                  <div className="anim-fade-in" style={{ borderTop: '1px solid var(--clr-border)', padding: '14px 18px' }}>
                    {recipe ? (
                      // URL Recipe detail view
                      (() => {
                        let parsedRecipe: any = {};
                        try {
                          // العمودُ أوّلًا، ثمّ `fields` للصفوف القديمة قبل الترحيل.
                          const stored = p.webhookUrl || (p.fields as any)?.webhookUrl;
                          if (stored) parsedRecipe = JSON.parse(stored);
                        } catch {}
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                              ['رابط الدخول', parsedRecipe.loginUrl],
                              ['صفحة الطلب', parsedRecipe.createOrderUrl],
                              ['CSS: اسم المستخدم', parsedRecipe.usernameSelector],
                              ['CSS: كلمة المرور', parsedRecipe.passwordSelector],
                              ['CSS: إرسال', parsedRecipe.submitSelector],
                              ['CSS: رقم التتبع', parsedRecipe.trackingSelector],
                            ].filter(([, v]) => v).map(([l, v]) => (
                              <div key={l} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--clr-border)' }}>
                                <p style={{ fontSize: 10.5, color: 'var(--txt-3)', fontWeight: 700, marginBottom: 3 }}>{l}</p>
                                <p style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      // API mode detail view
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[['رابط الدخول', p.loginUrl], ['صفحة الطلب', p.addOrderPage], ['Bon Livraison', p.livraisonBonPage], ['Ramassage', p.ramassagePage]].map(([l, v]) => v ? (
                          <div key={l} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--clr-border)' }}>
                            <p style={{ fontSize: 10.5, color: 'var(--txt-3)', fontWeight: 700, marginBottom: 3 }}>{l}</p>
                            <p style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</p>
                          </div>
                        ) : null)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Modal ─────────────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="modal-overlay" onClick={handleCloseAdd}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--clr-border)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--txt-1)' }}>إضافة شركة توصيل</h2>
              <button onClick={handleCloseAdd} style={{ background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '20px 24px 24px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Top mode tabs ─────────────────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { key: 'simple',    icon: '🏢', label: 'شركة معروفة',  desc: 'بريد + كلمة مرور فقط' },
                  { key: 'whatsapp',  icon: '📱', label: 'واتساب',        desc: 'أرسل الطلب بواتساب' },
                  { key: 'api',       icon: '⚙️', label: 'متقدم',          desc: 'API أو موقع مخصص' },
                ].map(m => {
                  const active = m.key === 'simple' ? addMode === 'simple'
                    : m.key === 'whatsapp' ? addMode === 'whatsapp'
                    : addMode === 'api' || addMode === 'url-recipe';
                  return (
                    <button key={m.key}
                      onClick={() => setAddMode(m.key as any)}
                      style={{ padding: '12px 8px', borderRadius: 13, cursor: 'pointer', textAlign: 'center', border: `2px solid ${active ? 'rgba(99,102,241,0.55)' : 'var(--clr-border)'}`, background: active ? 'rgba(99,102,241,0.13)' : 'rgba(255,255,255,0.04)', transition: 'all .18s' }}>
                      <div style={{ fontSize: 22, marginBottom: 5 }}>{m.icon}</div>
                      <p style={{ fontSize: 12.5, fontWeight: 800, color: active ? 'var(--clr-pri-h)' : 'var(--txt-2)' }}>{m.label}</p>
                      <p style={{ fontSize: 10.5, color: 'var(--txt-3)', marginTop: 2 }}>{m.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* ── Simple Mode ───────────────────────────────────────────────────── */}
              {addMode === 'simple' && (
                <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="label">اختر شركة التوصيل</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {SIMPLE_COMPANIES.map(c => (
                        <button key={c.name}
                          onClick={() => { setSimpleCompany(c.name); setSimpleCustomUrl({ url: c.url, loginUrl: c.loginUrl }); }}
                          style={{ padding: '16px 10px', borderRadius: 14, cursor: 'pointer', textAlign: 'center', border: `2px solid ${simpleCompany === c.name ? 'rgba(99,102,241,0.55)' : 'var(--clr-border)'}`, background: simpleCompany === c.name ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.04)', transition: 'all .18s' }}>
                          <div style={{ fontSize: 26, marginBottom: 6 }}>{c.logo}</div>
                          <p style={{ fontSize: 12.5, fontWeight: 800, color: simpleCompany === c.name ? 'var(--clr-pri-h)' : 'var(--txt-2)' }}>{c.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {simpleCompany && (
                    <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {simpleCompany !== 'أخرى' ? (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', fontSize: 12.5, color: 'rgba(52,211,153,0.9)', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <CheckCircle size={14} />
                          <span>جميع روابط <strong>{simpleCompany}</strong> جاهزة — أدخل فقط بيانات حسابك التجاري</span>
                        </div>
                      ) : (
                        <>
                          <Input label="رابط الموقع *" value={simpleCustomUrl.url} onChange={v => setSimpleCustomUrl(p => ({ ...p, url: v }))} ph="https://delivery.ma" />
                          <Input label="رابط صفحة تسجيل الدخول *" value={simpleCustomUrl.loginUrl} onChange={v => setSimpleCustomUrl(p => ({ ...p, loginUrl: v }))} ph="https://delivery.ma/login" />
                        </>
                      )}
                      <Input label="البريد الإلكتروني *" value={simpleCreds.username} onChange={v => setSimpleCreds(p => ({ ...p, username: v }))} ph="email@example.com" mono={false} />
                      <Input label="كلمة المرور *" value={simpleCreds.password} onChange={v => setSimpleCreds(p => ({ ...p, password: v }))} ph="••••••••" secret mono={false} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={handleCloseAdd} className="btn btn-ghost" style={{ paddingInline: 20 }}>إلغاء</button>
                    <button onClick={saveSimple}
                      disabled={!simpleCompany || !simpleCreds.username || !simpleCreds.password}
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: 'center', opacity: (!simpleCompany || !simpleCreds.username || !simpleCreds.password) ? 0.5 : 1 }}>
                      <CheckCircle size={16} /> حفظ شركة التوصيل
                    </button>
                  </div>
                </div>
              )}

              {/* ── WhatsApp Mode ──────────────────────────────────────────────────── */}
              {addMode === 'whatsapp' && (
                <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ padding: '12px 15px', borderRadius: 12, background: 'rgba(37,211,102,0.09)', border: '1px solid rgba(37,211,102,0.25)', fontSize: 12.5, color: 'rgba(74,222,128,0.9)', lineHeight: 1.7 }}>
                    📱 <strong>توصيل عبر واتساب</strong><br />
                    أضف رقم واتساب شركة التوصيل. عند إنشاء طلب سيتم إرسال تفاصيله تلقائياً عبر واتساب.
                  </div>

                  <Input label="اسم الشركة *" value={waName} onChange={setWaName} ph="Amana / شركة التوصيل" dir="rtl" mono={false} />
                  <Input
                    label="رقم واتساب شركة التوصيل *"
                    value={waPhone}
                    onChange={setWaPhone}
                    ph="212600000000"
                    hint="الرقم الدولي بدون + — مثال: 212612345678"
                  />

                  {waPhone && (
                    <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.18)', fontSize: 12, color: 'var(--txt-2)' }}>
                      رسالة الطلب ستُرسل إلى: <strong style={{ color: 'rgba(74,222,128,0.9)', fontFamily: 'monospace' }}>wa.me/{waPhone.replace(/\D/g,'')}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={handleCloseAdd} className="btn btn-ghost" style={{ paddingInline: 20 }}>إلغاء</button>
                    <button onClick={saveWhatsApp}
                      disabled={!waPhone || !waName}
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg,#25d366,#128c7e)', opacity: (!waPhone || !waName) ? 0.5 : 1 }}>
                      <CheckCircle size={16} /> إضافة واتساب التوصيل
                    </button>
                  </div>
                </div>
              )}

              {/* ── Advanced Mode (API / URL Recipe) ─────────────────────────────── */}
              {(addMode === 'api' || addMode === 'url-recipe') && (
                <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Sub-mode pills */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ key: 'api', label: 'API', icon: <Key size={13}/> }, { key: 'url-recipe', label: 'وصفة URL', icon: <Globe size={13}/> }].map(m => (
                      <button key={m.key}
                        onClick={() => setAddMode(m.key as any)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${addMode === m.key ? 'rgba(99,102,241,0.5)' : 'var(--clr-border)'}`, background: addMode === m.key ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', color: addMode === m.key ? 'var(--clr-pri-h)' : 'var(--txt-3)' }}>
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>

                  {addMode === 'api' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {TEMPLATES.map(t => (
                          <button
                            key={t.name}
                            onClick={() => setConfig(p => ({
                              ...p,
                              name: t.name,
                              logo: t.logo,
                              websiteUrl: t.url,
                              loginUrl: t.loginUrl,
                              addOrderPage: t.addOrder,
                              apiEndpoint: (t as any).apiEndpoint || '',
                              apiType: t.name === 'Livo' ? 'livo' : '', // ⬅️ تعيين apiType تلقائياً
                            }))}
                            style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${config.name === t.name ? 'rgba(99,102,241,0.45)' : 'var(--clr-border)'}`, background: config.name === t.name ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)' }}>
                            <div style={{ fontSize: 22, marginBottom: 5 }}>{t.logo}</div>
                            <p style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--txt-2)' }}>{t.name}</p>
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Input label="اسم الشركة *" value={config.name || ''} onChange={v => setConfig(p => ({ ...p, name: v }))} ph="Amana Livraison" dir="rtl" mono={false} />
                        <Input label="رابط الموقع" value={config.websiteUrl || ''} onChange={v => setConfig(p => ({ ...p, websiteUrl: v }))} ph="https://..." />
                        <div style={{ gridColumn: '1/-1' }}>
                          <Input label="رابط صفحة تسجيل الدخول *" value={config.loginUrl || ''} onChange={v => setConfig(p => ({ ...p, loginUrl: v }))} ph="https://.../login" />
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                          <Input label="مفتاح API (Bearer/Token)" value={config.apiKey || ''} onChange={v => setConfig(p => ({ ...p, apiKey: v }))} ph="sk_live_..." secret />
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                          <Input label="نقطة نهاية API" value={config.apiEndpoint || ''} onChange={v => setConfig(p => ({ ...p, apiEndpoint: v }))} ph="https://rest.livo.ma" />
                        </div>
                        <Input label="اسم المستخدم / البريد *" value={config.username || ''} onChange={v => setConfig(p => ({ ...p, username: v }))} ph="email@..." mono={false} />
                        <Input label="كلمة المرور *" value={config.password || ''} onChange={v => setConfig(p => ({ ...p, password: v }))} ph="••••••••" secret mono={false} />
                        <div style={{ gridColumn: '1/-1' }}>
                          <Input label="صفحة إضافة طلب" value={config.addOrderPage || ''} onChange={v => setConfig(p => ({ ...p, addOrderPage: v }))} ph="https://.../new" />
                        </div>
                        <Input label="Bon de Livraison" value={config.livraisonBonPage || ''} onChange={v => setConfig(p => ({ ...p, livraisonBonPage: v }))} ph="https://..." />
                        <Input label="Demande Ramassage" value={config.ramassagePage || ''} onChange={v => setConfig(p => ({ ...p, ramassagePage: v }))} ph="https://..." />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleCloseAdd} className="btn btn-ghost" style={{ paddingInline: 20 }}>إلغاء</button>
                        <button onClick={saveApi} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                          <CheckCircle size={16} /> حفظ شركة التوصيل
                        </button>
                      </div>
                    </>
                  )}

                  {addMode === 'url-recipe' && (
                    <UrlWizard onSave={saveUrlRecipe} onCancel={handleCloseAdd} onDirtyChange={setUrlWizardDirty} />
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Manual Assist Modal ────────────────────────────────────────────────── */}
      {manualAssist && (
        <ManualAssistModal
          data={manualAssist.data}
          providerName={manualAssist.providerName}
          onClose={() => setManualAssist(null)}
        />
      )}
    </div>
  );
}
