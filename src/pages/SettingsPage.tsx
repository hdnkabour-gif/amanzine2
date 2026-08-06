import { useState, useRef, useEffect } from 'react';
import VerifyCode from '../components/VerifyCode';
import { getToken as getAuthToken } from '../services/api';
import { useStore } from '../store';
import {
  Settings, Bot, Package, Truck, FileText, Shield, Users,
  RefreshCw, Download, Upload, Plus, Trash2, Cloud, Bell,
  Palette, Wifi, Edit2, X, Save,
} from 'lucide-react';
import type { TeamMember } from '../types';
import { LANGS } from '../i18n';
import SystemCheck from '../components/SystemCheck';
import QRCode from '../components/QRCode';

type Tab =
  | 'general' | 'ai' | 'chatbot' | 'products' | 'delivery'
  | 'connections' | 'templates' | 'team' | 'security'
  | 'notifs' | 'design' | 'cloud' | 'logs';

const TABS: { id: Tab; icon: typeof Settings; label: string }[] = [
  { id: 'general',     icon: Settings,  label: 'المتجر' },
  { id: 'ai',         icon: Bot,       label: 'AI' },
  { id: 'chatbot',    icon: Bot,       label: 'المساعد' },
  { id: 'products',   icon: Package,   label: 'المنتجات' },
  { id: 'delivery',   icon: Truck,     label: 'التوصيل' },
  { id: 'connections',icon: Wifi,      label: 'الاتصالات' },
  { id: 'templates',  icon: FileText,  label: 'القوالب' },
  { id: 'team',       icon: Users,     label: 'الفريق' },
  { id: 'security',   icon: Shield,    label: 'الأمان' },
  { id: 'notifs',     icon: Bell,      label: 'الإشعارات' },
  { id: 'design',     icon: Palette,   label: 'التصميم' },
  { id: 'cloud',      icon: Cloud,     label: 'السحابة' },
  { id: 'logs',       icon: Settings,  label: 'السجلات' },
];

const SEASONAL_THEMES = [
  { id: 'auto',        label: 'تلقائي (حسب التاريخ)' },
  { id: 'default',     label: 'افتراضي' },
  { id: 'ramadan',     label: '🌙 رمضان' },
  { id: 'eid',         label: '🎉 عيد' },
  { id: 'summer',      label: '☀️ صيف' },
  { id: 'blackfriday', label: '🖤 Black Friday' },
];

// ─── Helper components ─────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
    <h2 style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1)', marginBottom: 2 }}>{title}</h2>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="label">{label}</label>{children}</div>
);

const Toggle = ({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)' }}>
    <div>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt-1)' }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 1 }}>{sub}</p>}
    </div>
    <button onClick={onClick} className={`toggle ${on ? 'on' : ''}`} />
  </div>
);

// ─── Change Password Form ───────────────────────────────────────────────────────

function ChangePasswordForm({ notify }: { notify: (type: string, msg: string) => void }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.current || !form.next) { notify('error', 'أدخل كلمة المرور الحالية والجديدة'); return; }
    if (form.next !== form.confirm) { notify('error', 'كلمتا المرور غير متطابقتين'); return; }
    if (form.next.length < 6) { notify('error', 'يجب أن تكون 6 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      const tok = getAuthToken() || '';
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const d = await r.json();
      if (d.success) { notify('success', '✅ تم تغيير كلمة المرور'); setForm({ current: '', next: '', confirm: '' }); }
      else notify('error', d.error || 'فشل التغيير');
    } catch { notify('error', 'خطأ في الاتصال'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input className="input" type="password" placeholder="كلمة المرور الحالية" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
      <input className="input" type="password" placeholder="كلمة المرور الجديدة" value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} />
      <input className="input" type="password" placeholder="تأكيد كلمة المرور الجديدة" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
      <button onClick={submit} disabled={loading} className="btn btn-primary" style={{ width: 'fit-content' }}>
        {loading ? '⏳ جارٍ...' : '🔒 تغيير كلمة المرور'}
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

// نسخ الخادم الاحتياطية اليومية — قائمة + تنزيل مُصادَق (كان الـ endpoint بلا واجهة)
function ServerBackups() {
  const [list, setList] = useState<{ filename: string; date: string; size: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const tok = () => { try { return getAuthToken() || ''; } catch { return ''; } };

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/settings/backups', { headers: { Authorization: `Bearer ${tok()}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'تعذّر جلب النسخ');
      setList(Array.isArray(d.backups) ? d.backups : []);
    } catch (e: any) { setErr(e.message || 'خطأ'); setList([]); }
    setLoading(false);
  };

  const download = async (filename: string) => {
    try {
      const r = await fetch(`/api/settings/backups/${encodeURIComponent(filename)}`, { headers: { Authorization: `Bearer ${tok()}` } });
      if (!r.ok) throw new Error('فشل التحميل');
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e: any) { alert(e.message || 'فشل التحميل'); }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={load} className="btn btn-ghost btn-sm" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? '⟳ جارٍ التحميل...' : '☁️ نسخ الخادم الاحتياطية (يومية)'}
      </button>
      {err && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>{err}</div>}
      {list && list.length === 0 && !err && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>لا توجد نسخ خادم بعد — تُنشأ يومياً تلقائياً.</div>}
      {list && list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {list.map(b => (
            <div key={b.filename} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--panel2)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--ink2)' }}>📅 {b.date} · {Math.round((b.size || 0) / 1024)} KB</span>
              <button onClick={() => download(b.filename)} className="btn btn-ghost btn-sm"><Download size={13} /> تحميل</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings, updateSettings, notify, setPage,
    addTemplate, updateTemplate, deleteTemplate,
    auditLogs, exportData, importData, resetToDemo,
    deliveryProviders,
  } = useStore();

  const [tab, setTab]   = useState<Tab>('general');
  // مسوّدةُ النمرة: تُكتَب هنا ولا تُحفَظ حتّى يتأكّد صاحبُها منها.
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneErr, setPhoneErr] = useState('');
  const importRef       = useRef<HTMLInputElement>(null);
  const s               = settings;
  // المسوّدةُ تُهيَّأ من المحفوظ: بلا هذا تبدأ فارغةً فيبدو أنّ التاجرَ يغيّر
  // نمرتَه في كلّ مرّةٍ يفتح فيها الإعدادات.
  useEffect(() => { setPhoneDraft(s.brand?.phone || ''); }, [s.brand?.phone]);

  // ── Quick-reply input ref ────────────────────────────────────────────────────
  const qrInputRef = useRef<HTMLInputElement>(null);

  // ── Escalation keywords input ref ───────────────────────────────────────────
  const escInputRef = useRef<HTMLInputElement>(null);

  // ── Product size / color input refs ─────────────────────────────────────────
  const sizeInputRef  = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // ── Log filter state ─────────────────────────────────────────────────────────
  const [logFilter, setLogFilter] = useState<string>('all');

  // ── Template inline form ─────────────────────────────────────────────────────
  const blankTpl = { name: '', category: 'reply', content: '' };
  const [tplForm, setTplForm]       = useState(blankTpl);
  const [tplEditId, setTplEditId]   = useState<string | null>(null);   // null = add mode
  const [tplFormOpen, setTplFormOpen] = useState(false);

  const openAddTpl = () => {
    setTplEditId(null);
    setTplForm(blankTpl);
    setTplFormOpen(true);
  };

  const openEditTpl = (t: (typeof s.templates)[0]) => {
    setTplEditId(t.id);
    setTplForm({ name: t.name, category: t.category, content: t.content });
    setTplFormOpen(true);
  };

  const closeTplForm = () => { setTplFormOpen(false); setTplForm(blankTpl); setTplEditId(null); };

  const saveTpl = () => {
    if (!tplForm.name.trim() || !tplForm.content.trim()) { notify('error', 'اسم ومحتوى القالب مطلوبان'); return; }
    if (tplEditId) {
      updateTemplate(tplEditId, { name: tplForm.name, category: tplForm.category as any, content: tplForm.content });
    } else {
      addTemplate({ name: tplForm.name, category: tplForm.category, content: tplForm.content, variables: [], active: true });
    }
    notify('success', '✅ تم الحفظ');
    closeTplForm();
  };

  // ── Team inline form ─────────────────────────────────────────────────────────
  const blankMember = { name: '', email: '', role: 'seller' };
  const [memberForm, setMemberForm]   = useState(blankMember);
  const [memberFormOpen, setMemberFormOpen] = useState(false);

  const openAddMember = () => { setMemberForm(blankMember); setMemberFormOpen(true); };
  const closeMemberForm = () => { setMemberFormOpen(false); setMemberForm(blankMember); };

  const saveMember = () => {
    if (!memberForm.name.trim() || !memberForm.email.trim()) { notify('error', 'الاسم والبريد الإلكتروني مطلوبان'); return; }
    const newMember: TeamMember = {
      id: `u${Date.now()}`,
      name: memberForm.name.trim(),
      email: memberForm.email.trim(),
      role: memberForm.role as TeamMember['role'],
      active: true,
    };
    updateSettings('team', [...s.team, newMember]);
    notify('success', '✅ تمت إضافة العضو');
    closeMemberForm();
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`
        @media (max-width: 639px) {
          .s2col { grid-template-columns: 1fr !important; }
          .s2col-sm { grid-template-columns: 1fr !important; }
          .card { padding: 14px !important; }
          .settings-tabs { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        }
      `}</style>
      <div>
        <h1 className="page-title">الإعدادات</h1>
        <p className="page-sub">تخصيص كامل للنظام</p>
      </div>

      {/* Tabs */}
      <div className="tabs scroll-x settings-tabs" style={{ gap: 4 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          General Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="معلومات المتجر">
            <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="اسم المتجر">
                <input className="input" value={s.brand.name} onChange={e => updateSettings('brand', { ...s.brand, name: e.target.value })} />
              </Field>
              <Field label="رقم الهاتف">
                {/* ── النمرةُ تُبدَّل بتحقّقٍ لا بكتابة ────────────────────
                    هي **قناةُ الزبون الوحيدة** إليك: تظهر في المتجر وعلى
                    الفاتورة وفي رسالة واتساب. وخطأٌ في رقمٍ يقطع كلَّ اتّصالٍ
                    بلا أن يشتكي أحد — لا رسالةَ خطأٍ ولا سجلّ، فقط زبناءُ
                    يتّصلون بمن لا يعرفونه. والتحقّقُ يمنع هذا بثلاثين ثانية. */}
                <input className="input" value={phoneDraft} dir="ltr"
                  onChange={e => { setPhoneDraft(e.target.value); setPhoneErr(''); }} />
                {phoneDraft.trim() !== (s.brand.phone || '').trim() && (
                  phoneVerifying ? (
                    <div style={{ marginTop: 8 }}>
                      <VerifyCode
                        identifier={phoneDraft.trim()}
                        purpose="phone_change"
                        why="النمرة هي الطريق الوحيد اللي كيوصلو بيه الزبناء ليك — خاصنا نتأكّدو منها."
                        onCancel={() => setPhoneVerifying(false)}
                        onVerified={() => {
                          updateSettings('brand', { ...s.brand, phone: phoneDraft.trim() });
                          setPhoneVerifying(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => {
                          // نمرةٌ ناقصةٌ لا تُرسَل إلى قناةٍ لتردَّ بخطأ — يُقال هنا.
                          if (phoneDraft.replace(/\D/g, '').length < 9) { setPhoneErr('النمرة ناقصة'); return; }
                          setPhoneVerifying(true);
                        }}
                        style={{ padding: '8px 15px', borderRadius: 10, border: 'none', background: 'var(--ember,#FF6A00)',
                          color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
                        أكّد النمرة الجديدة
                      </button>
                      <button onClick={() => { setPhoneDraft(s.brand.phone || ''); setPhoneErr(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 12,
                          fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                        رجّع القديمة
                      </button>
                      {phoneErr && <span style={{ color: 'var(--red,#F5484A)', fontSize: 12, fontWeight: 700 }}>{phoneErr}</span>}
                    </div>
                  )
                )}
              </Field>
              <Field label="البريد الإلكتروني">
                <input className="input" type="email" value={s.brand.email} dir="ltr" onChange={e => updateSettings('brand', { ...s.brand, email: e.target.value })} />
              </Field>
              <Field label="العنوان">
                <input className="input" value={s.brand.address} onChange={e => updateSettings('brand', { ...s.brand, address: e.target.value })} />
              </Field>
              <Field label="العملة">
                <select className="select" value={s.brand.currency} onChange={e => updateSettings('brand', { ...s.brand, currency: e.target.value })}>
                  {['MAD','EUR','USD','GBP','SAR','AED','DZD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="اللغة">
                <select className="select" value={s.brand.language} onChange={e => updateSettings('brand', { ...s.brand, language: e.target.value })}>
                  {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                </select>
              </Field>
              <Field label="المنطقة الزمنية">
                <select className="select" value={(s.brand as any).timezone||'Africa/Casablanca'} onChange={e=>updateSettings('brand',{...s.brand,timezone:e.target.value} as any)}>
                  {['Africa/Casablanca','Europe/Paris','Europe/London','Asia/Dubai','America/New_York','America/Los_Angeles'].map(tz=><option key={tz} value={tz}>{tz}</option>)}
                </select>
              </Field>
            </div>
            <Field label="رابط شعار المتجر (URL)">
              <input
                className="input"
                dir="ltr"
                placeholder="https://example.com/logo.png"
                value={(s.brand as any).logoUrl || ''}
                onChange={e => updateSettings('brand', { ...s.brand, logoUrl: e.target.value })}
              />
              {(s.brand as any).logoUrl && (
                <img
                  src={(s.brand as any).logoUrl}
                  alt="logo preview"
                  style={{ marginTop: 8, height: 56, borderRadius: 10, objectFit: 'contain', background: 'rgba(255,255,255,0.06)', padding: 6 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </Field>
            <Field label="الوصف">
              <textarea className="textarea" rows={2} value={s.brand.description} onChange={e => updateSettings('brand', { ...s.brand, description: e.target.value })} />
            </Field>
            <Field label="المدينة — تُظهر متجرك في الاكتشاف المحلي (سوق AMANZINE)">
              <select className="input" value={(s.brand as any).city || ''} onChange={e => updateSettings('brand', { ...s.brand, city: e.target.value } as any)}>
                <option value="">— اختر المدينة —</option>
                {['الدار البيضاء','الرباط','مراكش','فاس','طنجة','أكادير','مكناس','وجدة','سلا','تطوان','القنيطرة','الجديدة'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            {/* ساعاتُ العمل — **حقلٌ واحدٌ لا اثنان**. كانت مكرّرةً في هذه
                الصفحة نفسِها (أعلى ⟵ «بداية/نهاية ساعات العمل») تكتبان في
                `workStart`/`workEnd` أنفسِهما بافتراضاتٍ مختلفة، فيرى التاجرُ
                الإعدادَ مرّتين ويظنّهما شيئين. تبقى النسخةُ هنا لأنّها تجاور
                «الحالة المباشرة» التي تُشتقّ منها. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="ساعة الفتح"><input className="input" type="time" value={(s.brand as any).workStart || ''} onChange={e => updateSettings('brand', { ...s.brand, workStart: e.target.value } as any)} /></Field>
              <Field label="ساعة الإغلاق"><input className="input" type="time" value={(s.brand as any).workEnd || ''} onChange={e => updateSettings('brand', { ...s.brand, workEnd: e.target.value } as any)} /></Field>
            </div>
            <Field label="الحالة المباشرة — تؤثّر على ترتيب متجرك في البحث">
              <select className="input" value={(s.brand as any).statusOverride || ''} onChange={e => updateSettings('brand', { ...s.brand, statusOverride: e.target.value } as any)}>
                <option value="">تلقائي (حسب ساعات العمل)</option>
                <option value="busy">🟠 مشغول</option>
                <option value="appointment">🟣 بموعد مسبق</option>
                <option value="delivery">🔵 توصيل فقط</option>
                <option value="quick">🟡 ردّ سريع</option>
                <option value="vacation">🔴 في إجازة</option>
                <option value="offline">⚫ غير متصل</option>
              </select>
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--mint,#12A150)' }}>✓ كيتسجّل أوتوماتيكيًّا عند كل تبديل</div>
          </Section>

          <Section title="أهداف المبيعات">
            <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={`هدف يومي (${s.brand.currency})`}>
                <input className="input" type="number" value={s.goals.daily} dir="ltr" onChange={e => updateSettings('goals', { ...s.goals, daily: parseInt(e.target.value)||0 })} />
              </Field>
              <Field label={`هدف شهري (${s.brand.currency})`}>
                <input className="input" type="number" value={s.goals.monthly} dir="ltr" onChange={e => updateSettings('goals', { ...s.goals, monthly: parseInt(e.target.value)||0 })} />
              </Field>
            </div>
          </Section>

          <Section title="🔗 رابط الكتالوج العام">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <QRCode value={`${window.location.origin}?catalog=1`} size={130} label="امسح للوصول للكتالوج" />
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?catalog=1`); notify('success', '✅ تم نسخ الرابط'); }}
                  className="btn btn-ghost" style={{ flex: 1 }}
                >📋 نسخ الرابط</button>
                <button
                  onClick={() => { if (navigator.share) navigator.share({ title: s.brand.name, url: `${window.location.origin}?catalog=1` }); }}
                  className="btn btn-primary" style={{ flex: 1 }}
                >📱 مشاركة</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--txt-3)', textAlign: 'center' }}>الزبائن يرون منتجاتك ويطلبون عبر واتساب مباشرة</p>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AI Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="مزوّد الذكاء الاصطناعي">
            <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['openai','gemini','claude','deepseek','grok','mistral'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => updateSettings('ai', { ...s.ai, provider: p })}
                  style={{
                    padding: '13px', borderRadius: 12, fontWeight: 800, fontSize: 13,
                    cursor: 'pointer', transition: 'all .18s',
                    border: `1.5px solid ${s.ai.provider === p ? 'rgba(99,102,241,0.45)' : 'var(--clr-border)'}`,
                    background: s.ai.provider === p ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                    color: s.ai.provider === p ? 'var(--clr-pri-h)' : 'var(--txt-3)',
                  }}
                >
                  {p === 'openai' ? '🧠 OpenAI GPT' : p === 'gemini' ? '🤖 Gemini (مجاني)' : p === 'claude' ? '🟠 Claude' : p === 'deepseek' ? '🔮 DeepSeek (دارجة)' : p === 'grok' ? '🚀 Grok (xAI)' : '🌬️ Mistral'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--txt-3)' }}>💡 المزود المختار يُجرَّب أولاً — وعند فشله ينتقل النظام تلقائياً لأي مزود آخر مربوط (Fallback)</p>
            {s.ai.provider === 'openai' && (
              <Field label="OpenAI API Key">
                <input className="input" type="password" placeholder="sk-proj-..." value={s.ai.apiKey} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('ai', { ...s.ai, apiKey: e.target.value })} />
                <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 5 }}>من platform.openai.com/api-keys</p>
              </Field>
            )}
            {s.ai.provider === 'gemini' && (
              <Field label="Gemini API Key (مجاني)">
                <input className="input" type="password" placeholder="AIzaSy..." value={s.ai.geminiKey} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('ai', { ...s.ai, geminiKey: e.target.value })} />
                <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 5 }}>من aistudio.google.com/app/apikey</p>
              </Field>
            )}
            {s.ai.provider === 'claude' && (
              <Field label="Claude API Key (Anthropic)">
                <input className="input" type="password" placeholder="sk-ant-..." value={s.ai.claudeKey || ''} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('ai', { ...s.ai, claudeKey: e.target.value })} />
                <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 5 }}>من console.anthropic.com/settings/keys</p>
              </Field>
            )}
            {s.ai.provider === 'deepseek' && (
              <Field label="DeepSeek API Key">
                <input className="input" type="password" placeholder="sk-..." value={s.ai.deepseekKey || ''} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('ai', { ...s.ai, deepseekKey: e.target.value })} />
                <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 5 }}>من platform.deepseek.com/api_keys</p>
              </Field>
            )}
            {s.ai.provider === 'grok' && (
              <Field label="Grok API Key (xAI)">
                <input className="input" type="password" placeholder="xai-..." value={s.ai.grokKey || ''} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('ai', { ...s.ai, grokKey: e.target.value })} />
                <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 5 }}>من console.x.ai — مدفوع حسب الاستخدام</p>
              </Field>
            )}
            {s.ai.provider === 'mistral' && (
              <Field label="Mistral API Key">
                <input className="input" type="password" placeholder="..." value={s.ai.mistralKey || ''} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('ai', { ...s.ai, mistralKey: e.target.value })} />
                <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 5 }}>من console.mistral.ai/api-keys</p>
              </Field>
            )}
            <Field label="النموذج">
              {s.ai.provider === 'openai' && (
                <select className="select" value={s.ai.model} onChange={e => updateSettings('ai', { ...s.ai, model: e.target.value })}>
                  {[['gpt-4o','GPT-4o (الأذكى)'],['gpt-4o-mini','GPT-4o Mini (سريع)'],['gpt-3.5-turbo','GPT-3.5 Turbo (اقتصادي)']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              {s.ai.provider === 'gemini' && (
                <select className="select" value={s.ai.model} onChange={e => updateSettings('ai', { ...s.ai, model: e.target.value })}>
                  {[['gemini-1.5-pro','Gemini 1.5 Pro'],['gemini-pro','Gemini Pro'],['gemini-1.5-flash','Gemini Flash (سريع)']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              {s.ai.provider === 'claude' && (
                <select className="select" value={s.ai.claudeModel || 'claude-haiku-4-5'} onChange={e => updateSettings('ai', { ...s.ai, claudeModel: e.target.value })}>
                  {[['claude-haiku-4-5','Claude Haiku 4.5 (الأسرع والأرخص — موصى به)'],['claude-sonnet-4-6','Claude Sonnet 4.6 (الأذكى للمهام المعقدة)']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              {s.ai.provider === 'deepseek' && (
                <select className="select" value="deepseek-chat" disabled>
                  <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                </select>
              )}
              {s.ai.provider === 'grok' && (
                <select className="select" value={s.ai.grokModel || 'grok-3-mini'} onChange={e => updateSettings('ai', { ...s.ai, grokModel: e.target.value })}>
                  {[['grok-3-mini','Grok 3 Mini (اقتصادي)'],['grok-3','Grok 3'],['grok-4','Grok 4 (الأذكى)']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              {s.ai.provider === 'mistral' && (
                <select className="select" value={s.ai.mistralModel || 'mistral-small-latest'} onChange={e => updateSettings('ai', { ...s.ai, mistralModel: e.target.value })}>
                  {[['mistral-small-latest','Mistral Small (سريع)'],['mistral-large-latest','Mistral Large (الأذكى)']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
            </Field>
          </Section>

          <Section title="الشخصية والأسلوب">
            <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="الشخصية">
                <select className="select" value={s.ai.personality} onChange={e => updateSettings('ai', { ...s.ai, personality: e.target.value })}>
                  {['Moroccan Seller','Professional','Friendly','Luxury','Fast Seller'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="لغة الردود">
                <select className="select" value={s.ai.language} onChange={e => updateSettings('ai', { ...s.ai, language: e.target.value })}>
                  {['Darija','Arabic','French','English'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="تأخير الرد (ثوانٍ)">
                <input className="input" type="number" min={0} max={15} value={s.ai.replyDelay} dir="ltr" onChange={e => updateSettings('ai', { ...s.ai, replyDelay: parseInt(e.target.value)||2 })} />
              </Field>
              <Field label="الحرارة (Temperature)">
                <input className="input" type="number" min={0} max={2} step={0.1} value={s.ai.temperature} dir="ltr" onChange={e => updateSettings('ai', { ...s.ai, temperature: parseFloat(e.target.value)||0.7 })} />
              </Field>
              <Field label="حد الخصم التلقائي %">
                <input className="input" type="number" min={0} max={50} value={s.ai.maxDiscount} dir="ltr" onChange={e => updateSettings('ai', { ...s.ai, maxDiscount: parseInt(e.target.value)||15 })} />
              </Field>
            </div>
            <Field label="System Prompt">
              <textarea className="textarea" rows={3} value={s.ai.systemPrompt} onChange={e => updateSettings('ai', { ...s.ai, systemPrompt: e.target.value })} />
            </Field>
            {[
              { l: 'محاكاة السلوك البشري', k: 'humanSimulation', sub: 'يكتب ببطء ويتأخر قليلاً' },
              { l: 'خصم تلقائي عند التفاوض', k: 'autoDiscount', sub: '' },
              { l: 'وضع الدارجة المغربية',   k: 'darijaMode',   sub: '' },
            ].map(item => (
              <Toggle
                key={item.k}
                on={(s.ai as any)[item.k]}
                onClick={() => updateSettings('ai', { ...s.ai, [item.k]: !(s.ai as any)[item.k] })}
                label={item.l}
                sub={item.sub}
              />
            ))}
            <Field label={`ذاكرة السياق (${(s.ai as any).contextMemory || 10} رسالة)`}>
              <input className="input" type="range" min={1} max={20} value={(s.ai as any).contextMemory||10} onChange={e=>updateSettings('ai',{...s.ai,contextMemory:parseInt(e.target.value)} as any)} />
            </Field>
            <Toggle
              on={(s.ai as any).learnFromConversations}
              onClick={() => updateSettings('ai', { ...s.ai, learnFromConversations: !(s.ai as any).learnFromConversations } as any)}
              label="التعلم من المحادثات"
              sub="يحسّن الردود بمرور الوقت"
            />
            <button onClick={async()=>{
              notify('info','⏳ جارٍ الاختبار...');
              try{
                const tok=getAuthToken()||'';
                const r=await fetch('/api/ai/reply',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${tok}`},body:JSON.stringify({message:'مرحبا'})});
                const d=await r.json();
                d.reply?notify('success','✅ AI يعمل! الرد: '+d.reply.slice(0,50)):notify('error','❌ لا يوجد رد');
              }catch{notify('error','❌ فشل الاتصال بـ AI');}
            }} className="btn btn-ghost btn-sm" style={{width:'fit-content'}}>🧪 اختبار AI</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--mint,#12A150)' }}>✓ كيتسجّل أوتوماتيكيًّا عند كل تبديل</div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Chatbot Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'chatbot' && (
        <Section title="إعدادات المساعد الذكي">
          <Field label="رسالة الترحيب">
            <textarea className="textarea" rows={2} value={s.chatbot.greetingMessage} onChange={e => updateSettings('chatbot', { ...s.chatbot, greetingMessage: e.target.value })} />
          </Field>
          <Field label="رسالة الفشل">
            <textarea className="textarea" rows={2} value={s.chatbot.fallbackMessage} onChange={e => updateSettings('chatbot', { ...s.chatbot, fallbackMessage: e.target.value })} />
          </Field>

          <div>
            <label className="label">ردود سريعة</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {s.chatbot.quickReplies.map((r, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--clr-border)', fontSize: 12.5 }}>
                  {r}
                  <button
                    onClick={() => updateSettings('chatbot', { ...s.chatbot, quickReplies: s.chatbot.quickReplies.filter((_,j) => j !== i) })}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                  >✕</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={qrInputRef} className="input" placeholder="رد سريع جديد..." onKeyDown={e => {
                if (e.key === 'Enter' && qrInputRef.current?.value.trim()) {
                  updateSettings('chatbot', { ...s.chatbot, quickReplies: [...s.chatbot.quickReplies, qrInputRef.current.value.trim()] });
                  qrInputRef.current.value = '';
                }
              }} />
              <button onClick={() => {
                if (qrInputRef.current?.value.trim()) {
                  updateSettings('chatbot', { ...s.chatbot, quickReplies: [...s.chatbot.quickReplies, qrInputRef.current.value.trim()] });
                  qrInputRef.current.value = '';
                }
              }} className="btn btn-ghost">إضافة</button>
            </div>
          </div>

          <div>
            <label className="label">كلمات التصعيد (تحويل للإنسان)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {((s.chatbot as any).escalationKeywords||[]).map((k: string,i: number)=>(
                <span key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',fontSize:12.5,color:'var(--txt-2)'}}>
                  {k}
                  <button onClick={()=>updateSettings('chatbot',{...s.chatbot,escalationKeywords:((s.chatbot as any).escalationKeywords||[]).filter((_: string,j: number)=>j!==i)} as any)} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:14}}>✕</button>
                </span>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input ref={escInputRef} className="input" placeholder="مثال: مسؤول، شكوى..." onKeyDown={e=>{if(e.key==='Enter'&&escInputRef.current?.value.trim()){updateSettings('chatbot',{...s.chatbot,escalationKeywords:[...((s.chatbot as any).escalationKeywords||[]),escInputRef.current.value.trim()]} as any);escInputRef.current.value='';}}}/>
              <button onClick={()=>{if(escInputRef.current?.value.trim()){updateSettings('chatbot',{...s.chatbot,escalationKeywords:[...((s.chatbot as any).escalationKeywords||[]),escInputRef.current.value.trim()]} as any);escInputRef.current.value='';}}} className="btn btn-ghost">إضافة</button>
            </div>
          </div>

          <Toggle
            on={(s.chatbot as any).autoClose||false}
            onClick={()=>updateSettings('chatbot',{...s.chatbot,autoClose:!(s.chatbot as any).autoClose} as any)}
            label="إغلاق تلقائي للمحادثات"
            sub="بعد فترة خمول"
          />
          {(s.chatbot as any).autoClose&&(
            <Field label="مدة الخمول (دقائق)">
              <input className="input" type="number" min={5} max={1440} value={(s.chatbot as any).autoCloseMinutes||30} dir="ltr" onChange={e=>updateSettings('chatbot',{...s.chatbot,autoCloseMinutes:parseInt(e.target.value)||30} as any)}/>
            </Field>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--mint,#12A150)' }}>✓ كيتسجّل أوتوماتيكيًّا عند كل تبديل</div>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Products Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="إعدادات المنتجات">
            <div className="s2col-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="بادئة SKU">
                <input className="input" value={s.products.skuPrefix} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('products', { ...s.products, skuPrefix: e.target.value })} />
              </Field>
              <Field label="تنبيه مخزون منخفض (≤)">
                <input className="input" type="number" value={s.products.lowStockAlert} dir="ltr" onChange={e => updateSettings('products', { ...s.products, lowStockAlert: parseInt(e.target.value)||5 })} />
              </Field>
              <Field label="الضريبة %">
                <input className="input" type="number" value={s.products.taxRate} dir="ltr" onChange={e => updateSettings('products', { ...s.products, taxRate: parseFloat(e.target.value)||0 })} />
              </Field>
            </div>
            <Toggle on={s.products.autoSku} onClick={() => updateSettings('products', { ...s.products, autoSku: !s.products.autoSku })} label="توليد SKU تلقائياً" />
            <Toggle on={s.products.autoPublishOnCreate} onClick={() => updateSettings('products', { ...s.products, autoPublishOnCreate: !s.products.autoPublishOnCreate })} label="نشر تلقائي عند الإضافة" />
          </Section>

          <Section title="المقاسات الافتراضية">
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {((s.products as any).defaultSizes||[]).map((sz: string,i: number)=>(
                <span key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid var(--clr-border)',fontSize:12.5}}>
                  {sz}
                  <button onClick={()=>updateSettings('products',{...s.products,defaultSizes:((s.products as any).defaultSizes||[]).filter((_: string,j: number)=>j!==i)} as any)} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:14}}>✕</button>
                </span>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input ref={sizeInputRef} className="input" placeholder="مقاس جديد (S, M, L, 40...)" onKeyDown={e=>{if(e.key==='Enter'&&sizeInputRef.current?.value.trim()){updateSettings('products',{...s.products,defaultSizes:[...((s.products as any).defaultSizes||[]),sizeInputRef.current.value.trim()]} as any);sizeInputRef.current.value='';}}}/>
              <button onClick={()=>{if(sizeInputRef.current?.value.trim()){updateSettings('products',{...s.products,defaultSizes:[...((s.products as any).defaultSizes||[]),sizeInputRef.current.value.trim()]} as any);sizeInputRef.current.value='';}}} className="btn btn-ghost">إضافة</button>
            </div>
          </Section>

          <Section title="الألوان الافتراضية">
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {((s.products as any).defaultColors||[]).map((clr: string,i: number)=>(
                <span key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid var(--clr-border)',fontSize:12.5}}>
                  {clr}
                  <button onClick={()=>updateSettings('products',{...s.products,defaultColors:((s.products as any).defaultColors||[]).filter((_: string,j: number)=>j!==i)} as any)} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:14}}>✕</button>
                </span>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input ref={colorInputRef} className="input" placeholder="لون جديد (أحمر، أزرق...)" onKeyDown={e=>{if(e.key==='Enter'&&colorInputRef.current?.value.trim()){updateSettings('products',{...s.products,defaultColors:[...((s.products as any).defaultColors||[]),colorInputRef.current.value.trim()]} as any);colorInputRef.current.value='';}}}/>
              <button onClick={()=>{if(colorInputRef.current?.value.trim()){updateSettings('products',{...s.products,defaultColors:[...((s.products as any).defaultColors||[]),colorInputRef.current.value.trim()]} as any);colorInputRef.current.value='';}}} className="btn btn-ghost">إضافة</button>
            </div>
          </Section>

          <Section title="التصنيفات">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {s.products.categories.map((c, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--clr-border)', fontSize: 12.5 }}>
                  {c}
                  <button onClick={() => updateSettings('products', { ...s.products, categories: s.products.categories.filter((_,j) => j !== i) })} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="cat-in" className="input" placeholder="تصنيف جديد..." onKeyDown={e => {
                if (e.key === 'Enter') {
                  const el = document.getElementById('cat-in') as HTMLInputElement;
                  if (el?.value.trim()) { updateSettings('products', { ...s.products, categories: [...s.products.categories, el.value.trim()] }); el.value = ''; }
                }
              }} />
              <button onClick={() => {
                const el = document.getElementById('cat-in') as HTMLInputElement;
                if (el?.value.trim()) { updateSettings('products', { ...s.products, categories: [...s.products.categories, el.value.trim()] }); el.value = ''; }
              }} className="btn btn-ghost">إضافة</button>
            </div>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Delivery Tab  — behavior toggles only; provider mgmt → DeliveryPage
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'delivery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="خيارات التوصيل">
            <Toggle
              on={s.delivery.autoSendOnApproval}
              onClick={() => updateSettings('delivery', { ...s.delivery, autoSendOnApproval: !s.delivery.autoSendOnApproval })}
              label="إرسال تلقائي عند الموافقة"
            />
            <Toggle
              on={s.delivery.notifyCustomerOnShip}
              onClick={() => updateSettings('delivery', { ...s.delivery, notifyCustomerOnShip: !s.delivery.notifyCustomerOnShip })}
              label="إشعار الزبون عند الشحن"
            />
            <Field label="شركة التوصيل الافتراضية">
              <select className="select" value={(s.delivery as any).defaultProvider||''} onChange={e=>updateSettings('delivery',{...s.delivery,defaultProvider:e.target.value} as any)}>
                <option value="">— اختر —</option>
                {deliveryProviders.filter(p=>p.enabled).map(p=><option key={p.id} value={p.name}>{p.logo} {p.name}</option>)}
              </select>
            </Field>
            <Field label="رابط التتبع (استبدل {'{'}tracking{'}'})">
              <input className="input" dir="ltr" placeholder="https://example.com/track/{tracking}" value={(s.delivery as any).trackingUrlTemplate||''} onChange={e=>updateSettings('delivery',{...s.delivery,trackingUrlTemplate:e.target.value} as any)}/>
            </Field>
          </Section>

          {/* Redirect to DeliveryPage for full provider management */}
          <button
            onClick={() => setPage('delivery')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border2)',
              background: 'var(--panel2)', cursor: 'pointer', textAlign: 'right', width: '100%',
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink1)', marginBottom: 3 }}>🚚 إدارة شركات التوصيل</p>
              <p style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {deliveryProviders.length > 0
                  ? `${deliveryProviders.length} شركة مُضافة — انقر لإدارتها وربط API`
                  : 'لا توجد شركات بعد — انقر للإضافة'}
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ember)', padding: '6px 14px', borderRadius: 8, background: 'rgba(255,106,0,0.1)', flexShrink: 0 }}>
              فتح صفحة التوصيل ←
            </span>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Templates Tab  — inline form, no prompt()
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1)' }}>القوالب ({s.templates.length})</p>
            {!tplFormOpen && (
              <button onClick={openAddTpl} className="btn btn-primary btn-sm">
                <Plus size={14} /> إضافة قالب
              </button>
            )}
          </div>

          {/* Inline template form */}
          {tplFormOpen && (
            <div style={{ padding: '18px', borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt-1)' }}>
                  {tplEditId ? 'تعديل القالب' : 'قالب جديد'}
                </p>
                <button onClick={closeTplForm} style={{ background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="اسم القالب">
                  <input
                    className="input"
                    placeholder="مثال: رسالة ترحيب"
                    value={tplForm.name}
                    onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field label="الفئة">
                  <select
                    className="select"
                    value={tplForm.category}
                    onChange={e => setTplForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {['reply','order','delivery','promo','followup','other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="محتوى القالب">
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="مرحبا {name}، شكراً على طلبك..."
                  value={tplForm.content}
                  onChange={e => setTplForm(f => ({ ...f, content: e.target.value }))}
                />
                <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 4 }}>يمكن استخدام {'{'}name{'}'} {'{'}product{'}'} {'{'}price{'}'} كمتغيرات</p>
              </Field>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveTpl} className="btn btn-primary" style={{ flex: 1 }}><Save size={14} /> حفظ</button>
                <button onClick={closeTplForm} className="btn btn-ghost">إلغاء</button>
              </div>
            </div>
          )}

          {/* Templates grid */}
          <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {s.templates.map(t => (
              <div key={t.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--txt-1)' }}>{t.name}</span>
                    <span style={{ marginRight: 8, fontSize: 11, color: 'var(--txt-3)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 10 }}>{t.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => openEditTpl(t)}
                      style={{ background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                      title="تعديل"
                    ><Edit2 size={14} /></button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                      title="حذف"
                    ><Trash2 size={14} /></button>
                  </div>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--txt-3)', lineHeight: 1.6, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {t.content.length > 120 ? t.content.slice(0, 120) + '…' : t.content}
                </p>
              </div>
            ))}
          </div>

          {s.templates.length === 0 && !tplFormOpen && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--txt-3)', fontSize: 13 }}>
              <p>لا توجد قوالب بعد — اضغط "إضافة قالب" للبدء</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Team Tab  — inline form, no prompt()
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1)' }}>الفريق ({s.team.length})</p>
            {!memberFormOpen && (
              <button onClick={openAddMember} className="btn btn-primary btn-sm">
                <Plus size={14} /> إضافة عضو
              </button>
            )}
          </div>

          {/* Inline member form */}
          {memberFormOpen && (
            <div style={{ padding: '18px', borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt-1)' }}>إضافة عضو جديد</p>
                <button onClick={closeMemberForm} style={{ background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div className="s2col-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <Field label="الاسم الكامل">
                  <input
                    className="input"
                    placeholder="أحمد بنعلي"
                    value={memberForm.name}
                    onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field label="البريد الإلكتروني">
                  <input
                    className="input"
                    type="email"
                    dir="ltr"
                    placeholder="ahmed@store.com"
                    value={memberForm.email}
                    onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field label="الدور">
                  <select className="select" value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}>
                    {['admin','seller','support','delivery'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveMember} className="btn btn-primary" style={{ flex: 1 }}><Save size={14} /> إضافة</button>
                <button onClick={closeMemberForm} className="btn btn-ghost">إلغاء</button>
              </div>
            </div>
          )}

          {/* Team list */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {s.team.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>لا يوجد أعضاء بعد</p>
            ) : (
              s.team.map((m: TeamMember, i: number) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', borderBottom: i < s.team.length - 1 ? '1px solid var(--clr-border)' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--clr-pri-g)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {m.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--txt-1)' }}>{m.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--txt-3)' }}>{m.email}</p>
                  </div>
                  <select
                    className="select"
                    style={{ width: 130, height: 36, fontSize: 13, paddingInline: '10px' }}
                    value={m.role}
                    onChange={e => { const t=[...s.team]; t[i]={...t[i], role: e.target.value as any}; updateSettings('team', t); }}
                  >
                    {['admin','seller','support','delivery'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button
                    onClick={() => { const t=[...s.team]; t[i]={...t[i], active:!t[i].active}; updateSettings('team', t); }}
                    style={{ fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: 'none', background: m.active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: m.active ? '#34d399' : '#f87171' }}
                  >
                    {m.active ? 'نشط' : 'معطّل'}
                  </button>
                  <button
                    onClick={() => updateSettings('team', s.team.filter(x => x.id !== m.id))}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}
                  ><Trash2 size={14} /></button>
                </div>
              ))
            )}
          </div>

          {/* Permissions table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--clr-border)' }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--txt-1)' }}>جدول الصلاحيات</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--clr-border)' }}>
                    {['الصلاحية','👑 Admin','🛒 Seller','💬 Support','🚚 Delivery'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: h === 'الصلاحية' ? 'right' : 'center', color: 'var(--txt-3)', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['لوحة التحكم',   true,  true,  true,  true ],
                    ['إضافة منتج',    true,  true,  false, false],
                    ['حذف منتج',      true,  false, false, false],
                    ['الطلبات',       true,  true,  true,  true ],
                    ['الزبائن',       true,  true,  true,  false],
                    ['المحادثات',     true,  true,  true,  false],
                    ['التحليلات',     true,  true,  false, false],
                    ['الإعدادات',     true,  false, false, false],
                  ].map(([perm, ...perms], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--txt-1)', fontWeight: 600 }}>{perm as string}</td>
                      {(perms as boolean[]).map((has, j) => (
                        <td key={j} style={{ textAlign: 'center', padding: '10px', fontSize: 16 }}>{has ? '✅' : '❌'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Security Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'rgba(255,106,0,.07)', border: '1px solid rgba(255,106,0,.22)',
            borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Shield size={18} style={{ color: 'var(--ember)', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--ember)' }}>تذكير أمني:</strong> فعّل المصادقة الثنائية واستخدم كلمة مرور قوية لحماية حسابك وبيانات متجرك.
            </p>
          </div>
          <Section title="الأمان">
            <Toggle
              on={s.security.twoFactorEnabled}
              onClick={() => updateSettings('security', { ...s.security, twoFactorEnabled: !s.security.twoFactorEnabled })}
              label="المصادقة الثنائية (2FA)"
              sub="حماية إضافية لحسابك"
            />

            {s.security.twoFactorEnabled && (
              <div style={{ background: 'rgba(0,200,150,.06)', border: '1px solid rgba(0,200,150,.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink1)' }}>اختبار المصادقة الثنائية</div>
                <button onClick={async () => {
                  const tok = getAuthToken() || '';
                  const r = await fetch('/api/auth/request-otp', { method: 'POST', headers: { 'Authorization': `Bearer ${tok}` } });
                  const d = await r.json();
                  if (d.sent) {
                    const code = prompt(`أدخل الرمز المرسل لـ ${d.email}${d.code ? ` (DEV: ${d.code})` : ''}`);
                    if (code) {
                      const r2 = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` }, body: JSON.stringify({ code }) });
                      const d2 = await r2.json();
                      notify(d2.verified ? 'success' : 'error', d2.verified ? '✅ رمز صحيح — 2FA تعمل!' : '❌ رمز غير صحيح');
                    }
                  } else { notify('error', 'فشل إرسال الرمز'); }
                }} className="btn btn-ghost btn-sm">
                  🔐 اختبار OTP
                </button>
              </div>
            )}

            <div style={{ background: 'var(--void2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink1)', marginBottom: 12 }}>تغيير كلمة المرور</div>
              <ChangePasswordForm notify={notify as any} />
            </div>

            <Field label="تسجيل الخروج التلقائي (دقائق)">
              <input className="input" type="number" value={s.security.autoLogoutMinutes} dir="ltr" onChange={e => updateSettings('security', { ...s.security, autoLogoutMinutes: parseInt(e.target.value)||60 })} />
            </Field>
            <Toggle
              on={(s.security as any).loginNotification||false}
              onClick={()=>updateSettings('security',{...s.security,loginNotification:!(s.security as any).loginNotification} as any)}
              label="إشعار عند تسجيل دخول جديد"
            />
          </Section>

          <Section title="النسخ الاحتياطي">
            <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={exportData} className="btn btn-ghost" style={{ justifyContent: 'center' }}><Download size={15} /> تصدير نسخة احتياطية</button>
              <button onClick={() => importRef.current?.click()} className="btn btn-ghost" style={{ justifyContent: 'center' }}><Upload size={15} /> استيراد نسخة</button>
              <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => { const f=e.target.files?.[0]; if(f){const r=new FileReader();r.onload=ev=>importData(ev.target?.result as string);r.readAsText(f);} }} />
            </div>
            <ServerBackups />
            <button
              onClick={() => { if (window.confirm('هل أنت متأكد؟ ستُفقد البيانات الحالية.')) resetToDemo(); }}
              className="btn btn-danger"
              style={{ justifyContent: 'center', width: '100%' }}
            >
              <RefreshCw size={15} /> إعادة البيانات التجريبية
            </button>
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Notifications Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'notifs' && (
        <Section title="إعدادات الإشعارات">
          {[
            { l: '🛒 طلب جديد',                k: 'newOrder' },
            { l: '💬 رسالة جديدة',             k: 'newMessage' },
            { l: '⚠️ مخزون منخفض',             k: 'lowStock' },
            { l: '🚚 عند الشحن',               k: 'orderShipped' },
            { l: '🔊 صوت تنبيه',               k: 'sound' },
            { l: '📱 إشعارات WhatsApp للزبائن', k: 'whatsappBroadcast' },
          ].map(item => (
            <Toggle
              key={item.k}
              on={(s.notifs as any)[item.k]}
              onClick={() => updateSettings('notifs', { ...s.notifs, [item.k]: !(s.notifs as any)[item.k] })}
              label={item.l}
            />
          ))}
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Design Tab  — + seasonal theme selector
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'design' && (
        <Section title="التصميم">
          {/* Light/Dark theme */}
          <div>
            <label className="label">الثيم</label>
            <div className="s2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['dark','light'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => updateSettings('design', { ...s.design, theme: t })}
                  style={{
                    padding: '16px', borderRadius: 13, fontSize: 14, fontWeight: 800,
                    cursor: 'pointer', transition: 'all .18s',
                    border: `1.5px solid ${s.design.theme === t ? 'rgba(99,102,241,0.45)' : 'var(--clr-border)'}`,
                    background: t === 'dark' ? '#09090f' : '#f8f9fc',
                    color: t === 'dark' ? '#fff' : '#0f172a',
                  }}
                >
                  {t === 'dark' ? '🌙 داكن' : '☀️ فاتح'}
                </button>
              ))}
            </div>
          </div>

          {/* Seasonal theme */}
          <div>
            <label className="label">الثيم الموسمي</label>
            <div className="s2col-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {SEASONAL_THEMES.map(st => {
                const current = (s.design as any).seasonalTheme || 'auto';
                const active   = current === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => updateSettings('design', { ...s.design, seasonalTheme: st.id } as any)}
                    style={{
                      padding: '10px 12px', borderRadius: 11, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', transition: 'all .18s', textAlign: 'center',
                      border: `1.5px solid ${active ? 'rgba(99,102,241,0.45)' : 'var(--clr-border)'}`,
                      background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                      color: active ? 'var(--clr-pri-h)' : 'var(--txt-2)',
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="اللون الرئيسي">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <input type="color" value={(s.design as any).primaryColor||'#6366f1'} onChange={e=>updateSettings('design',{...s.design,primaryColor:e.target.value} as any)} style={{width:48,height:48,borderRadius:10,border:'1px solid var(--clr-border)',cursor:'pointer',padding:3}}/>
              <div style={{flex:1}}>
                <input className="input" dir="ltr" value={(s.design as any).primaryColor||'#6366f1'} onChange={e=>updateSettings('design',{...s.design,primaryColor:e.target.value} as any)} style={{fontFamily:'monospace'}}/>
                <p style={{fontSize:11,color:'var(--txt-3)',marginTop:4}}>يؤثر على أزرار التطبيق والعناصر التفاعلية</p>
              </div>
              <div style={{width:40,height:40,borderRadius:10,background:(s.design as any).primaryColor||'#6366f1',flexShrink:0,boxShadow:'0 4px 12px rgba(0,0,0,.3)'}}/>
            </div>
          </Field>

          <Toggle
            on={s.design.watermarkEnabled}
            onClick={() => updateSettings('design', { ...s.design, watermarkEnabled: !s.design.watermarkEnabled })}
            label="علامة مائية على الصور"
          />
          {s.design.watermarkEnabled && (
            <Field label="نص العلامة">
              <input className="input" value={s.design.watermarkText} onChange={e => updateSettings('design', { ...s.design, watermarkText: e.target.value })} />
            </Field>
          )}
          <Toggle
            on={s.design.compressImages}
            onClick={() => updateSettings('design', { ...s.design, compressImages: !s.design.compressImages })}
            label="ضغط الصور تلقائياً"
          />
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Cloud Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'cloud' && (
        <Section title="الحفظ السحابي — Supabase">
          <div style={{ padding: '12px 14px', borderRadius: 11, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p style={{ fontSize: 13, color: 'var(--txt-2)', lineHeight: 1.6 }}>Supabase مجاني حتى 500MB — يحل مشكلة localStorage نهائياً ويتيح المزامنة بين الأجهزة.</p>
          </div>
          <Field label="Supabase Project URL">
            <input className="input" placeholder="https://xxxx.supabase.co" value={s.supabaseUrl} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('supabaseUrl', e.target.value as any)} />
          </Field>
          <Field label="Supabase Anon Key">
            <input className="input" type="password" placeholder="eyJ..." value={s.supabaseKey} dir="ltr" style={{ fontFamily: 'monospace' }} onChange={e => updateSettings('supabaseKey', e.target.value as any)} />
          </Field>
          <button onClick={async () => {
            if (!s.supabaseUrl || !s.supabaseKey) { notify('error', 'يرجى إدخال URL والمفتاح'); return; }
            notify('info', '⏳ جارٍ اختبار الاتصال...');
            try {
              const r = await fetch(`${s.supabaseUrl}/rest/v1/`, { headers: { 'apikey': s.supabaseKey } });
              r.ok ? notify('success', '✅ Supabase متصل!') : notify('error', '❌ فشل الاتصال');
            } catch { notify('error', '❌ فشل — تحقق من URL'); }
          }} className="btn btn-primary" style={{ justifyContent: 'center' }}>اختبار الاتصال</button>
          <Toggle
            on={s.cloudEnabled}
            onClick={() => updateSettings('cloudEnabled', !s.cloudEnabled as any)}
            label="تفعيل الحفظ السحابي"
            sub="البيانات ستُحفظ في Supabase"
          />
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Logs Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--txt-1)' }}>سجلات التدقيق ({auditLogs.length})</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['all','order','product','ai','delivery','settings','auth'].map(t=>(
                  <button key={t} onClick={()=>setLogFilter(t)} className={`chip ${logFilter===t?'active':''}`} style={{fontSize:11}}>
                    {t==='all'?'الكل':t==='order'?'🛒':t==='product'?'📦':t==='ai'?'🤖':t==='delivery'?'🚚':t==='settings'?'⚙️':'🔐'}
                    {t!=='all'&&t}
                  </button>
                ))}
                <button onClick={()=>{const blob=new Blob([JSON.stringify(auditLogs,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`logs-${new Date().toISOString().split('T')[0]}.json`;a.click();}} className="btn btn-ghost btn-sm" style={{marginRight:'auto'}}>تصدير</button>
              </div>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {(logFilter==='all'?auditLogs:auditLogs.filter(l=>l.type===logFilter)).slice(0, 50).map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--clr-border)' }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>
                    {log.type === 'order' ? '🛒' : log.type === 'product' ? '📦' : log.type === 'ai' ? '🤖' : log.type === 'delivery' ? '🚚' : '⚙️'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--txt-2)' }}>{log.action}</p>
                    {log.details && <p style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>{log.details}</p>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--txt-3)', flexShrink: 0 }}>{log.timestamp.split(' ')[1]}</span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p style={{ padding: '24px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>لا نشاط بعد</p>
              )}
            </div>
          </div>
          <SystemCheck />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Connections Tab
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="🤖 مفاتيح الذكاء الاصطناعي">
            <Field label="OpenAI API Key (GPT-4o)">
              <input
                className="input" type="password" dir="ltr"
                placeholder="sk-proj-..."
                value={s.ai.apiKey || ''}
                onChange={e => updateSettings('ai', { ...s.ai, apiKey: e.target.value })}
              />
              <p style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 4 }}>من platform.openai.com/api-keys</p>
            </Field>
            <Field label="Google Gemini API Key (مجاني)">
              <input
                className="input" type="password" dir="ltr"
                placeholder="AIzaSy..."
                value={s.ai.geminiKey || ''}
                onChange={e => updateSettings('ai', { ...s.ai, geminiKey: e.target.value })}
              />
              <p style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 4 }}>من aistudio.google.com/app/apikey</p>
            </Field>
            <Field label="Claude API Key (Anthropic)">
              <input
                className="input" type="password" dir="ltr"
                placeholder="sk-ant-..."
                value={s.ai.claudeKey || ''}
                onChange={e => updateSettings('ai', { ...s.ai, claudeKey: e.target.value })}
              />
              <p style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 4 }}>من console.anthropic.com/settings/keys</p>
            </Field>
            <Field label="DeepSeek API Key (الأفضل للدارجة)">
              <input
                className="input" type="password" dir="ltr"
                placeholder="sk-..."
                value={s.ai.deepseekKey || ''}
                onChange={e => updateSettings('ai', { ...s.ai, deepseekKey: e.target.value })}
              />
              <p style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 4 }}>من platform.deepseek.com/api_keys</p>
            </Field>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => updateSettings('ai', { ...s.ai, provider: 'openai' })}
                className={`chip ${s.ai.provider === 'openai' ? 'active' : ''}`}
              >🧠 OpenAI</button>
              <button
                onClick={() => updateSettings('ai', { ...s.ai, provider: 'gemini' })}
                className={`chip ${s.ai.provider === 'gemini' ? 'active' : ''}`}
              >🤖 Gemini</button>
              <button
                onClick={() => updateSettings('ai', { ...s.ai, provider: 'claude' })}
                className={`chip ${s.ai.provider === 'claude' ? 'active' : ''}`}
              >🟠 Claude</button>
              <button
                onClick={() => updateSettings('ai', { ...s.ai, provider: 'deepseek' })}
                className={`chip ${s.ai.provider === 'deepseek' ? 'active' : ''}`}
              >🔮 DeepSeek</button>
              <button
                onClick={() => updateSettings('ai', { ...s.ai, provider: 'grok' })}
                className={`chip ${s.ai.provider === 'grok' ? 'active' : ''}`}
              >🚀 Grok</button>
              <button
                onClick={() => updateSettings('ai', { ...s.ai, provider: 'mistral' })}
                className={`chip ${s.ai.provider === 'mistral' ? 'active' : ''}`}
              >🌬️ Mistral</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--mint,#12A150)' }}>✓ كيتسجّل أوتوماتيكيًّا عند كل تبديل</div>
          </Section>

          <Section title="📱 واتساب بيزنس">
            <Field label="Phone Number ID">
              <input
                className="input" dir="ltr"
                placeholder="123456789012345"
                value={s.social?.whatsapp?.pageId || ''}
                onChange={e => updateSettings('social', { ...s.social, whatsapp: { ...s.social.whatsapp, pageId: e.target.value } })}
              />
            </Field>
            <Field label="Access Token">
              <input
                className="input" type="password" dir="ltr"
                placeholder="EAAxxxxxxx..."
                value={s.social?.whatsapp?.accessToken || ''}
                onChange={e => updateSettings('social', { ...s.social, whatsapp: { ...s.social.whatsapp, accessToken: e.target.value } })}
              />
            </Field>
            <Toggle
              on={(s.social as any)?.whatsapp?.autoPublish||false}
              onClick={()=>updateSettings('social',{...s.social,whatsapp:{...(s.social as any)?.whatsapp,autoPublish:!((s.social as any)?.whatsapp?.autoPublish)}} as any)}
              label="نشر تلقائي على واتساب"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--mint,#12A150)' }}>✓ كيتسجّل أوتوماتيكيًّا عند كل تبديل</div>
          </Section>

          <Section title="📘 فيسبوك وإنستغرام">
            <Field label="Facebook Page ID">
              <input
                className="input" dir="ltr"
                placeholder="123456789"
                value={s.social?.facebook?.pageId || ''}
                onChange={e => updateSettings('social', { ...s.social, facebook: { ...s.social.facebook, pageId: e.target.value } })}
              />
            </Field>
            <Field label="Page Access Token (يصلح لـ Facebook وInstagram)">
              <input
                className="input" type="password" dir="ltr"
                placeholder="EAAxxxxxxx..."
                value={s.social?.facebook?.accessToken || ''}
                onChange={e => updateSettings('social', { ...s.social, facebook: { ...s.social.facebook, accessToken: e.target.value }, instagram: { ...s.social.instagram, accessToken: e.target.value } })}
              />
            </Field>
            <Field label="Instagram Account ID">
              <input
                className="input" dir="ltr"
                placeholder="17841400000000000"
                value={s.social?.instagram?.pageId || ''}
                onChange={e => updateSettings('social', { ...s.social, instagram: { ...s.social.instagram, pageId: e.target.value } })}
              />
            </Field>
            <Toggle
              on={(s.social as any)?.facebook?.autoPublish||false}
              onClick={()=>updateSettings('social',{...s.social,facebook:{...(s.social as any)?.facebook,autoPublish:!((s.social as any)?.facebook?.autoPublish)}} as any)}
              label="نشر تلقائي على فيسبوك"
            />
            <Toggle
              on={(s.social as any)?.facebook?.autoHashtags||false}
              onClick={()=>updateSettings('social',{...s.social,facebook:{...(s.social as any)?.facebook,autoHashtags:!((s.social as any)?.facebook?.autoHashtags)}} as any)}
              label="إضافة هاشتاقات تلقائياً"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--mint,#12A150)' }}>✓ كيتسجّل أوتوماتيكيًّا عند كل تبديل</div>
          </Section>

          <Section title="🎵 TikTok Shop">
            <Field label="TikTok App Key">
              <input className="input" dir="ltr" placeholder="xxxxxxxxxx" value={(s.social as any)?.tiktok?.pageId||''} onChange={e=>updateSettings('social',{...s.social,tiktok:{...(s.social as any)?.tiktok,pageId:e.target.value}} as any)}/>
            </Field>
            <Field label="TikTok Access Token">
              <input className="input" type="password" dir="ltr" placeholder="act.xxxxxxxx..." value={(s.social as any)?.tiktok?.accessToken||''} onChange={e=>updateSettings('social',{...s.social,tiktok:{...(s.social as any)?.tiktok,accessToken:e.target.value}} as any)}/>
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--mint,#12A150)' }}>✓ كيتسجّل أوتوماتيكيًّا عند كل تبديل</div>
          </Section>

          <div className="card" style={{ padding: '16px 18px', background: 'rgba(0,210,179,.04)', border: '1px solid rgba(0,210,179,.15)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--mint)', marginBottom: 6 }}>💡 نصيحة</p>
            <p style={{ fontSize: 12, color: 'var(--txt-3)', lineHeight: 1.6 }}>
              لربط واتساب: اذهب لـ developers.facebook.com وأنشئ App من نوع Business.<br />
              للحصول على Gemini مجاناً: اذهب لـ aistudio.google.com وأنشئ API Key.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
