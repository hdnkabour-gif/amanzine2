import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, AlertTriangle, CheckCircle2, Eye, Pencil, X } from 'lucide-react';
import { knowledgeAPI, type CustomConcept } from '../services/api';
import { understand, resolveConcept } from '../lib/akg/kb';

// ============================================================
// إضافة مفهوم — لوحةُ الأدمن لتعليم المنصّة مجالًا جديدًا بكلّ لغاته.
//
//   قبلها: المعرفة تُضاف بملفّ CSV وسطرِ أوامرٍ فقط. هنا تُضاف من التطبيق.
//   ثلاث ضماناتٍ مقصودة:
//   ① «جرّب الفهم» قبل الحفظ — ترى كيف سيفهم النظام جملتك فعلًا، لا كيف تظنّ.
//   ② كشفُ التعارض محلّيًّا (مرادفٌ يملكه مفهومٌ من الـ183) + على الخادم.
//   ③ مسوّدة/منشور — لا شيء يؤثّر في الفهم قبل أن تنشره أنت.
// ============================================================

const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const LINE = '1px solid var(--line,rgba(255,255,255,.10))';
const CARD = 'color-mix(in srgb, #fff 3%, transparent)';
const GREEN = '#0a8f6f';

const LANGS: { k: string; label: string }[] = [
  { k: 'ar', label: 'العربيّة' }, { k: 'darija', label: 'الدارجة' },
  { k: 'fr', label: 'الفرنسيّة' }, { k: 'en', label: 'الإنجليزيّة' }, { k: 'arabizi', label: 'لاتينيّة (Arabizi)' },
];

const emptyForm = () => ({
  id: '', category: '',
  concept: { ar: '', darija: '', fr: '', en: '' } as Record<string, string>,
  variants: { ar: '', darija: '', fr: '', en: '', arabizi: '' } as Record<string, string>,
  offer: '', seek: '', asksOffer: '', asksSeek: '',
  related: '', needs: '', sells: '', near: '',
  services: '', examples: '',
});

const split = (v: string) => v.split(/[|\n]/).map(s => s.trim()).filter(Boolean);
const join = (v: unknown) => (Array.isArray(v) ? v.join(' | ') : '');

// عكسُ `save`: صفٌّ محفوظ ← نموذجٌ قابلٌ للتحرير. بدونه كان «التعديل» يعني الحذف
// وإعادة الكتابة من الصفر — وهو أسرعُ طريقٍ لفقدان مرادفٍ كان يعمل.
const toForm = (c: CustomConcept) => ({
  id: c.id, category: c.category || '',
  concept: { ar: '', darija: '', fr: '', en: '', ...(c.concept || {}) } as Record<string, string>,
  variants: Object.fromEntries(LANGS.map(l => [l.k, join(c.variants?.[l.k])])) as Record<string, string>,
  offer: join(c.stance?.offer), seek: join(c.stance?.seek),
  asksOffer: join(c.asks?.offer), asksSeek: join(c.asks?.seek),
  related: join(c.links?.related), needs: join(c.links?.needs),
  sells: join(c.links?.sells), near: join(c.links?.near),
  services: join(c.services), examples: join(c.examples),
});

function Field({ label, value, onChange, ph, mono, disabled }: {
  label: string; value: string; onChange: (v: string) => void; ph?: string; mono?: boolean; disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 200px', minWidth: 180 }}>
      <span style={{ fontSize: 11.5, color: INK3, fontWeight: 700 }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={ph} disabled={disabled}
        style={{ padding: '9px 11px', borderRadius: 10, border: LINE,
          background: disabled ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)',
          color: disabled ? INK3 : INK1, fontSize: 13, fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
          outline: 'none', direction: mono ? 'ltr' : 'rtl' }} />
    </label>
  );
}

export default function AddConceptPanel() {
  const [f, setF] = useState(emptyForm());
  const [list, setList] = useState<CustomConcept[]>([]);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState('');
  // مفهومٌ قيد التعديل — المعرّف هو المرجع، فلا يُغيَّر أثناء التحرير.
  const [editing, setEditing] = useState<string | null>(null);

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const setIn = (grp: 'concept' | 'variants', k: string, v: string) =>
    setF(p => ({ ...p, [grp]: { ...p[grp], [k]: v } }));

  const load = () => knowledgeAPI.listConcepts().then(r => setList(r.concepts || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  // ② تعارضٌ محلّيّ: هل يملك أحدُ الـ183 هذا المرادف أصلًا؟ يظهر أثناء الكتابة.
  const conflicts: string[] = [];
  for (const l of LANGS) {
    for (const w of split(f.variants[l.k] || '')) {
      const hit = resolveConcept(w);
      if (hit && hit.id !== f.id) conflicts.push(`«${w}» يملكه «${hit.id}»`);
    }
  }

  const save = async (status: 'draft' | 'published') => {
    setBusy(true); setMsg(null);
    const body = {
      id: f.id.trim().toLowerCase(), category: f.category.trim(),
      concept: Object.fromEntries(Object.entries(f.concept).filter(([, v]) => v.trim())),
      variants: Object.fromEntries(LANGS.map(l => [l.k, split(f.variants[l.k] || '')]).filter(([, v]) => (v as string[]).length)),
      stance: { offer: split(f.offer), seek: split(f.seek) },
      asks: { offer: split(f.asksOffer), seek: split(f.asksSeek) },
      links: { related: split(f.related), needs: split(f.needs), sells: split(f.sells), near: split(f.near) },
      services: split(f.services), examples: split(f.examples), status,
    };
    try {
      if (editing) await knowledgeAPI.updateConcept(editing, body);
      else await knowledgeAPI.saveConcept(body);
      setMsg({ kind: 'ok', text: editing
        ? `حُدّث «${editing}»${status === 'published' ? ' — يعمل الآن' : ' (مسوّدة)'}`
        : status === 'published' ? `نُشر «${body.id}» — يعمل الآن` : `حُفظت مسوّدة «${body.id}»` });
      setF(emptyForm()); setEditing(null); load();
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'تعذّر الحفظ' });
    }
    setBusy(false);
  };

  const startEdit = (c: CustomConcept) => {
    setF(toForm(c)); setEditing(c.id); setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setF(emptyForm()); setEditing(null); setMsg(null); };

  const remove = async (id: string) => {
    if (!window.confirm(`حذف «${id}»؟`)) return;
    try { await knowledgeAPI.deleteConcept(id); if (editing === id) cancelEdit(); load(); } catch { /* noop */ }
  };

  // ① معاينة: ما الذي سيفهمه النظام من جملتك — الآن، قبل الحفظ.
  const u: any = probe.trim().length >= 2 ? understand(probe) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 900, color: INK1 }}>
          {editing ? 'تعديل مفهوم' : 'إضافة مفهوم'}
          {editing && <span style={{ fontSize: 11, color: GREEN, fontFamily: 'ui-monospace, monospace', marginInlineStart: 8 }}>{editing}</span>}
        </div>
        <div style={{ fontSize: 11, color: INK3 }}>
          {editing ? 'المعرّف ثابت — غيّر ما تشاء ثمّ احفظ' : 'علّم المنصّة مجالًا جديدًا — لا يؤثّر في الفهم حتّى تنشره'}
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 13px', borderRadius: 11, fontSize: 12.5, fontWeight: 650, lineHeight: 1.7,
          border: `1px solid ${msg.kind === 'ok' ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)'}`,
          background: msg.kind === 'ok' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.07)',
          color: msg.kind === 'ok' ? '#86EFAC' : '#FCA5A5' }}>
          {msg.text}
        </div>
      )}

      {/* الهويّة */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Field label="المعرّف (id) *" value={f.id} onChange={v => set('id', v)} ph="furniture_store" mono disabled={!!editing} />
        <Field label="الفئة *" value={f.category} onChange={v => set('category', v)} ph="أثاث" />
        {(['ar', 'darija', 'fr', 'en'] as const).map(l => (
          <Field key={l} label={`الاسم — ${LANGS.find(x => x.k === l)!.label}${l === 'ar' ? ' *' : ''}`}
            value={f.concept[l]} onChange={v => setIn('concept', l, v)} />
        ))}
      </div>

      {/* المرادفات */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 4 }}>المرادفات — كلّ ما قد يكتبه إنسان</div>
        <div style={{ fontSize: 11, color: INK3, marginBottom: 10 }}>افصل بينها بـ | — مثال: أثاث | مفروشات | صالون</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {LANGS.map(l => (
            <Field key={l.k} label={l.label} value={f.variants[l.k]} onChange={v => setIn('variants', l.k, v)}
              mono={l.k === 'fr' || l.k === 'en' || l.k === 'arabizi'} />
          ))}
        </div>
        {conflicts.length > 0 && (
          <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(245,158,11,.35)', background: 'rgba(245,158,11,.07)', color: '#FCD34D', fontSize: 12, lineHeight: 1.8 }}>
            <AlertTriangle size={12} style={{ verticalAlign: -2 }} /> تعارض — اختر كلمةً أدقّ:
            <br />{conflicts.slice(0, 5).join(' · ')}
          </div>
        )}
      </div>

      {/* الاتّجاه والأسئلة */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 4 }}>الاتّجاه والأسئلة</div>
        <div style={{ fontSize: 11, color: INK3, marginBottom: 10 }}>
          يميّز «عندي محل أثاث» (يَعرض) عن «بغيت أثاث» (يطلب) — ولكلٍّ أسئلته
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Field label="عبارات العرض" value={f.offer} onChange={v => set('offer', v)} ph="عندي محل أثاث | كنبيع الأثاث" />
          <Field label="عبارات الطلب" value={f.seek} onChange={v => set('seek', v)} ph="بغيت أثاث | خاصني صالون" />
          <Field label="أسئلةٌ للعارض" value={f.asksOffer} onChange={v => set('asksOffer', v)} ph="شنو كتبيع؟ | فين محلّك؟" />
          <Field label="أسئلةٌ للطالب" value={f.asksSeek} onChange={v => set('asksSeek', v)} ph="جديد ولا مستعمل؟ | شحال الميزانية؟" />
        </div>
      </div>

      {/* العلاقات */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 10 }}>العلاقات (معرّفات مفاهيم)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Field label="مرتبطٌ بـ" value={f.related} onChange={v => set('related', v)} ph="carpenter | painter" mono />
          <Field label="يحتاج" value={f.needs} onChange={v => set('needs', v)} ph="transport" mono />
          <Field label="يبيع" value={f.sells} onChange={v => set('sells', v)} ph="كنبة | خزانة" />
          <Field label="قريبٌ من" value={f.near} onChange={v => set('near', v)} ph="decor" mono />
          <Field label="الخدمات" value={f.services} onChange={v => set('services', v)} ph="بيع أثاث | توصيل" />
          <Field label="أمثلةٌ حقيقيّة" value={f.examples} onChange={v => set('examples', v)} ph="بغيت صالون جديد" />
        </div>
      </div>

      {/* ① جرّب الفهم */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <Eye size={13} style={{ color: GREEN }} />
          <span style={{ fontSize: 12.5, fontWeight: 800, color: INK1 }}>جرّب الفهم قبل الحفظ</span>
        </div>
        <input value={probe} onChange={e => setProbe(e.target.value)} placeholder="اكتب جملةً كما يكتبها زبون…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: LINE,
            background: 'rgba(255,255,255,.03)', color: INK1, fontSize: 13.5, fontFamily: 'inherit', outline: 'none', direction: 'rtl' }} />
        {u && (
          <div style={{ marginTop: 9, fontSize: 12.5, color: INK3, lineHeight: 1.9 }}>
            الحرفة: <b style={{ color: INK1 }}>{u.profession?.label || u.problem?.name || '— لم يُفهَم'}</b>
            {' · '}الاتّجاه: <b style={{ color: u.stance === 'offer' ? '#FCD34D' : GREEN }}>
              {u.stance === 'offer' ? 'يَعرض' : u.stance === 'seek' ? 'يطلب' : 'غير محدّد'}</b>
            {u.city ? <> · المدينة: <b style={{ color: INK1 }}>{u.city}</b></> : null}
            {' · '}الثقة: <b style={{ color: INK1 }}>{Math.round((u.confidence || 0) * 100)}%</b>
          </div>
        )}
      </div>

      {/* الحفظ */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <button onClick={() => save('published')} disabled={busy || conflicts.length > 0}
          style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 16px', borderRadius: 11,
            border: 'none', background: conflicts.length ? 'rgba(255,255,255,.12)' : GREEN, color: '#fff',
            fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: conflicts.length ? 'default' : 'pointer' }}>
          <CheckCircle2 size={15} /> {editing ? 'حفظ التعديل — منشور' : 'نشر — يعمل فورًا'}
        </button>
        <button onClick={() => save('draft')} disabled={busy}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 16px', borderRadius: 11, border: LINE,
            background: 'transparent', color: INK1, fontSize: 13, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer' }}>
          <Save size={15} /> {editing ? 'حفظ كمسوّدة' : 'مسوّدة'}
        </button>
        <button onClick={cancelEdit} style={{ padding: '11px 14px', borderRadius: 11, border: LINE, background: 'transparent', color: INK3, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
          {editing
            ? <><X size={14} style={{ verticalAlign: -2 }} /> إلغاء التعديل</>
            : <><Plus size={14} style={{ verticalAlign: -2 }} /> جديد</>}
        </button>
      </div>

      {/* المضاف سابقًا */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 10 }}>
          المفاهيم المضافة {list.length > 0 && <span style={{ color: GREEN }}>· {list.length}</span>}
        </div>
        {list.length === 0
          ? <div style={{ fontSize: 12, color: INK3 }}>ما زلت لم تُضِف مفهومًا — املأ النموذج فوق.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {list.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 750, color: INK1 }}>{(c.concept as any)?.ar || c.id}</span>
                  <span style={{ fontSize: 10.5, color: INK3, fontFamily: 'ui-monospace, monospace' }}>{c.id}</span>
                  <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                    background: c.status === 'published' ? 'rgba(34,197,94,.14)' : 'rgba(255,255,255,.06)',
                    color: c.status === 'published' ? '#86EFAC' : INK3 }}>
                    {c.status === 'published' ? 'منشور' : 'مسوّدة'}
                  </span>
                  <button onClick={() => startEdit(c)} aria-label="تعديل"
                    style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: editing === c.id ? GREEN : INK3, cursor: 'pointer', display: 'flex', padding: 3 }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove(c.id)} aria-label="حذف"
                    style={{ background: 'none', border: 'none', color: INK3, cursor: 'pointer', display: 'flex', padding: 3 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
