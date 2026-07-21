import { useMemo, useState } from 'react';
import { Activity, HelpCircle, Check } from 'lucide-react';
import { getInteractions } from '../lib/experienceLog';
import { understand, type Understanding } from '../lib/akg/kb';
import { validateCandidate } from '../lib/knowledge/candidates';

// ============================================================
// LiveBrainPanel — «العقل الحيّ». يأخذ آخر تفاعلات المستخدم من سجلّ التجارب،
//   ويُمرّر كلّ نصّ عبر understand() (نقطة الإدراك الوحيدة — القانون #5) ليُظهر:
//   ماذا فهم العقل، وأين تردّد أو عجز. المرحلة ب: «ما لم يُفهَم» صار قابلًا
//   للتعليم فورًا (Observe → Suggest → Approve) — الإنسان يعتمد فتُطبَّق حالًا.
// ============================================================

const PANEL = 'var(--panel,rgba(255,255,255,0.03))';
const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const GREEN = 'var(--amz-emerald,#0a8f6f)';
const AMBER = 'var(--amber,#F59E0B)';
const RED = 'var(--red,#F5484A)';

interface Trace { at: number; raw: string; u: Understanding; }

const LOW = 0.5;

export default function LiveBrainPanel() {
  const [rev, setRev] = useState(0);            // يُعيد تشغيل understand() بعد كلّ تعليم
  const [teach, setTeach] = useState<Record<string, string>>({}); // عبارة → مفهوم مُدخَل

  const traces = useMemo<Trace[]>(() => {
    const seen = new Set<string>();
    const out: Trace[] = [];
    for (const i of getInteractions().slice().reverse()) {
      const raw = (i.object?.raw || i.raw || '').trim();
      if (raw.length < 3) continue;
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ at: i.at, raw, u: understand(raw) });
      if (out.length >= 18) break;
    }
    return out;
  }, [rev]);

  // اعتماد بشريّ (القانون #3): يخزّن العبارة→المفهوم ويرفع الإصدار، فيُطبّقها
  // understand() فورًا في التمريرة التالية. لا اعتماد آليّ.
  const approve = (phrase: string) => {
    const concept = (teach[phrase] || '').trim();
    if (!concept) return;
    validateCandidate(phrase, concept);
    setTeach(m => { const n = { ...m }; delete n[phrase]; return n; });
    setRev(r => r + 1);
  };

  const unknowns = traces.filter(t => !t.u.problem && !t.u.profession);
  const weak = traces.filter(t => (t.u.problem || t.u.profession) && t.u.confidence < LOW);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, background: `color-mix(in srgb, ${GREEN} 15%, transparent)` }}><Activity size={18} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: INK1 }}>العقل الحيّ</div>
          <div style={{ fontSize: 12, color: INK3 }}>آخر ما مرّ على العقل — وأين تردّد أو عجز</div>
        </div>
      </div>

      {/* mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <Stat value={traces.length} label="تفاعلات" tone={INK1} />
        <Stat value={weak.length} label="تردّد (ثقة منخفضة)" tone={AMBER} />
        <Stat value={unknowns.length} label="لم يُفهَم" tone={RED} />
      </div>

      {/* unknowns — تعليم فوريّ (Observe → Suggest → Approve → Apply) */}
      {unknowns.length > 0 && (
        <div style={{ background: `color-mix(in srgb, ${RED} 6%, ${PANEL})`, border: `1px solid ${RED}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: RED }}>
            <HelpCircle size={14} /> عبارات لم يفهمها العقل · {unknowns.length}
          </div>
          <div style={{ padding: '2px 14px 10px', fontSize: 11, color: INK3 }}>اربِط العبارة بمهنة (سبّاك، كهربائي…) واعتمِدها — يطبّقها العقل حالًا.</div>
          {unknowns.map((t, i) => (
            <div key={i} style={{ padding: '10px 14px', borderTop: BORDER, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: '1 1 150px', minWidth: 0, fontSize: 13, fontWeight: 750, color: INK1 }}>«{t.raw}»</span>
              <input value={teach[t.raw] || ''} onChange={e => setTeach(m => ({ ...m, [t.raw]: e.target.value }))}
                placeholder="اربطها بـ… (سبّاك، كهربائي)"
                style={{ flex: '1 1 150px', minWidth: 0, background: 'var(--bg2,rgba(255,255,255,0.02))', border: '1px solid var(--border2,rgba(255,255,255,0.14))', borderRadius: 9, padding: '8px 11px', color: INK1, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', direction: 'rtl' }} />
              <button onClick={() => approve(t.raw)} disabled={!(teach[t.raw] || '').trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 9, border: 'none', background: (teach[t.raw] || '').trim() ? GREEN : 'var(--border2,rgba(255,255,255,0.12))', color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: (teach[t.raw] || '').trim() ? 'pointer' : 'default' }}>
                <Check size={14} /> علّم
              </button>
            </div>
          ))}
        </div>
      )}

      {/* trace list */}
      <div style={{ background: PANEL, border: BORDER, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '11px 14px', borderBottom: BORDER, fontSize: 13, fontWeight: 800, color: INK1 }}>سجلّ الإدراك</div>
        {traces.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: INK3, fontSize: 13 }}>لا تفاعلات بعد — اكتب حاجة في الصفحة الرئيسيّة وستظهر هنا.</div>
        )}
        {traces.map((t, i) => {
          const ok = !!(t.u.problem || t.u.profession);
          const weakOne = ok && t.u.confidence < LOW;
          const dot = !ok ? RED : weakOne ? AMBER : GREEN;
          return (
            <div key={i} style={{ padding: '11px 14px', borderTop: i === 0 ? 'none' : BORDER, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: dot, marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: INK1 }}>«{t.raw}»</div>
                <div style={{ fontSize: 11.5, color: INK3, marginTop: 2 }}>
                  {ok
                    ? <>{t.u.problem?.name && <span>{t.u.problem.name} · </span>}<b style={{ color: GREEN }}>{t.u.profession?.label || '—'}</b>{t.u.city && <span> · {t.u.city}</span>}{t.u.context?.urgent && <span style={{ color: RED }}> · مستعجل</span>}{t.u.learned && <span style={{ color: GREEN }}> · 🧠 معتمَدة</span>}</>
                    : <span style={{ color: RED }}>لم يُفهَم</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11.5, color: INK3, lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
        كلّ سطر مرّ عبر <b style={{ color: INK1 }}>understand()</b> نفسها التي يراها المستخدم — نقطة إدراك واحدة (القانون #5). ما عجز عنه العقل ليس خطأً، بل درسه القادم.
      </p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div style={{ background: PANEL, border: BORDER, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: tone }}>{value}</div>
      <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{label}</div>
    </div>
  );
}
