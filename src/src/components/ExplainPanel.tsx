import { useMemo, useState } from 'react';
import { Search, ArrowLeft, CornerDownLeft, CornerUpRight, AlertTriangle } from 'lucide-react';
import { describeAll, describableTypes, typeLabel, type Describable, type EntityType } from '../lib/akg/describe';

// ============================================================
// ExplainPanel — «التطبيق يفسّر نفسه» (ADR-0003، قراءة فقط). يستهلك describe()
//   ليُظهر أيّ كيان وهو يُجيب عن الأسئلة الأربعة: ما هو؟ لماذا؟ على ماذا يعتمد؟
//   من يعتمد عليه؟ + أثر الحذف. لا محرّك ولا منطق قرار — عدسة فوق السجلّات.
// ============================================================

const PANEL = 'var(--panel,rgba(255,255,255,0.03))';
const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const GREEN = 'var(--amz-emerald,#0a8f6f)';
const AMBER = 'var(--amber,#F59E0B)';

export default function ExplainPanel() {
  const all = useMemo<Describable[]>(() => describeAll(), []);
  const types = useMemo(() => describableTypes().filter(t => t.count > 0), []);
  const [type, setType] = useState<EntityType>(types[0]?.type ?? 'profession');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Describable | null>(null);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter(d => d.type === type && (!query || d.label.toLowerCase().includes(query) || d.id.toLowerCase().includes(query)));
  }, [all, type, q]);

  const orphan = sel && sel.usedBy.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, background: `color-mix(in srgb, ${GREEN} 15%, transparent)` }}><Search size={17} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: INK1 }}>التفسير — describe()</div>
          <div style={{ fontSize: 12, color: INK3 }}>كلّ كيان يُجيب: ما هو؟ لماذا؟ على ماذا يعتمد؟ من يعتمد عليه؟</div>
        </div>
      </div>

      {/* type pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {types.map(t => {
          const active = type === t.type;
          return (
            <button key={t.type} onClick={() => { setType(t.type); setSel(null); }}
              style={{ padding: '7px 12px', borderRadius: 10, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                border: active ? `1.5px solid ${GREEN}` : BORDER,
                background: active ? `color-mix(in srgb, ${GREEN} 12%, transparent)` : 'transparent',
                color: active ? GREEN : INK3 }}>
              {t.label} <span style={{ opacity: .7 }}>· {t.count}</span>
            </button>
          );
        })}
      </div>

      {!sel ? (
        <>
          {/* search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: PANEL, border: BORDER, borderRadius: 11, padding: '9px 12px' }}>
            <Search size={14} style={{ color: INK3, flexShrink: 0 }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={`ابحث في ${typeLabel(type)}…`}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: INK1, fontSize: 13, fontFamily: 'inherit', direction: 'rtl' }} />
          </div>
          {/* list */}
          <div style={{ background: PANEL, border: BORDER, borderRadius: 14, overflow: 'hidden' }}>
            {list.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: INK3, fontSize: 13 }}>لا نتيجة.</div>}
            {list.map((d, i) => (
              <button key={d.id} onClick={() => setSel(d)}
                style={{ width: '100%', textAlign: 'start', padding: '11px 14px', borderTop: i === 0 ? 'none' : BORDER, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 750, color: INK1 }}>{d.label}</div>
                  <div className="mono" style={{ fontSize: 11, color: INK3, marginTop: 1 }}>{d.id}</div>
                </div>
                {d.usedBy.length === 0
                  ? <span style={{ fontSize: 10.5, fontWeight: 800, color: AMBER, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={11} /> يتيم</span>
                  : <span style={{ fontSize: 11, color: INK3 }}>{d.usedBy.length} يعتمد</span>}
                <ArrowLeft size={14} style={{ color: INK3 }} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
          {/* card header */}
          <div style={{ padding: '14px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSel(null)} style={{ background: 'transparent', border: BORDER, borderRadius: 9, padding: '5px 9px', color: INK3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', fontSize: 12 }}>رجوع <ArrowLeft size={13} /></button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: INK1 }}>{sel.label}</div>
              <div className="mono" style={{ fontSize: 11, color: INK3 }}>{typeLabel(sel.type)} · {sel.id}</div>
            </div>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="لماذا وُجد" value={sel.purpose} />

            {sel.relations.length > 0 && (
              <div>
                <Head icon={<CornerUpRight size={13} />} text="على ماذا يعتمد" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                  {sel.relations.map((r, i) => (
                    <span key={i} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 8, border: BORDER, color: INK1 }}>
                      <span style={{ color: INK3 }}>{r.rel}:</span> <b>{r.to}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Head icon={<CornerDownLeft size={13} />} text="من يعتمد عليه" />
              {sel.usedBy.length === 0
                ? <div style={{ marginTop: 6, fontSize: 12.5, color: AMBER, display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={13} /> لا شيء — كيان يتيم، بذرة تنتظر ربطًا.</div>
                : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                    {sel.usedBy.map((u, i) => <span key={i} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 8, background: `color-mix(in srgb, ${GREEN} 10%, transparent)`, border: `1px solid ${GREEN}`, color: GREEN, fontWeight: 700 }}>{u}</span>)}
                  </div>}
            </div>

            <div style={{ padding: '10px 12px', borderRadius: 10, background: orphan ? `color-mix(in srgb, ${AMBER} 8%, transparent)` : 'transparent', border: orphan ? `1px solid ${AMBER}` : BORDER }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: INK3, marginBottom: 3 }}>أثر الحذف</div>
              <div style={{ fontSize: 12.5, color: orphan ? AMBER : INK1 }}>{sel.impactOfDeletion}</div>
            </div>

            {Object.keys(sel.metadata).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(sel.metadata).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                  <span key={k} className="mono" style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 7, border: BORDER, color: INK3 }}>{k}: {String(v)}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: INK3, lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
        كلّ كيان هنا يُفسّر نفسه عبر <b style={{ color: INK1 }}>describe()</b> نفسها (ADR-0003) — واجهة واحدة فوق السجلّات، لا محرّك جديد. اليتيم ليس خطأً، بل سؤال: لماذا هو هنا؟
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: INK3, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: INK1, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Head({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: INK1 }}><span style={{ color: INK3 }}>{icon}</span> {text}</div>;
}
