import { useState, useEffect } from 'react';
import { Brain, Check, X, Cloud, HardDrive, Sparkles, Star } from 'lucide-react';
import { knowledgeAPI, type BrainStats } from '../services/api';
import { getInteractions, knowledgeHealth } from '../lib/experienceLog';
import { mineCandidates, validateCandidate, kbVersion, type Candidate } from '../lib/knowledge/candidates';
import JourneyAnalytics from '../components/JourneyAnalytics';

// ============================================================
// Knowledge Studio — «عقل AMANZINE» للأدمن: ما تعلّمه التطبيق، وما لم يفهمه
// (misses)، مع اعتماد/رفض. القاموس ينمو من الاستخدام الحقيقيّ لا من إدخال يدويّ.
// يعمل بالخادم (‎/api/knowledge) متعدّد المستخدمين، ويتراجع لبيانات محلّية
// (نوايا لم يفهمها المحرّك) في وضع الديمو/أوفلاين.
// ============================================================

interface Miss { id: string; term: string; count: number }

const LEARN_KEY = 'amanzine_learned';
function loadLearned(): Record<string, string> { try { return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}'); } catch { return {}; } }
function learn(term: string, cat: string) { try { const m = loadLearned(); m[term.toLowerCase()] = cat; localStorage.setItem(LEARN_KEY, JSON.stringify(m)); } catch { /* noop */ } }

function localMisses(): Miss[] {
  const map = new Map<string, { term: string; count: number }>();
  for (const i of getInteractions()) {
    if (i.intent !== 'unknown') continue;
    const term = (i.object?.raw || i.raw || '').trim();
    if (!term) continue;
    const key = term.toLowerCase();
    const cur = map.get(key) || { term, count: 0 };
    cur.count++; map.set(key, cur);
  }
  return [...map.values()].map(v => ({ id: `local:${v.term.toLowerCase()}`, term: v.term, count: v.count })).sort((a, b) => b.count - a.count);
}

const PANEL = 'var(--panel,rgba(255,255,255,0.03))';
const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';

export default function KnowledgeStudio() {
  const [mode, setMode] = useState<'loading' | 'server' | 'local'>('loading');
  const [brain, setBrain] = useState<BrainStats | null>(null);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [cat, setCat] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [ver, setVer] = useState(1);

  useEffect(() => {
    setCandidates(mineCandidates(3));
    setVer(kbVersion());
    let alive = true;
    (async () => {
      try {
        const [b, m] = await Promise.all([knowledgeAPI.brain(30), knowledgeAPI.misses('open', 100)]);
        if (!alive) return;
        setBrain(b);
        setMisses((m.misses || []).map(x => ({ id: String(x.id), term: x.normalized || x.raw || x.term || '—', count: x.count || 0 })));
        setMode('server');
      } catch {
        if (!alive) return;
        setMisses(localMisses());
        setMode('local');
      }
    })();
    return () => { alive = false; };
  }, []);

  const approve = async (m: Miss) => {
    const c = (cat[m.id] || '').trim();
    if (!c) return;
    if (mode === 'server') { try { await knowledgeAPI.resolve(m.id, c); } catch { /* noop */ } }
    else { learn(m.term, c); }
    setMisses(x => x.filter(y => y.id !== m.id));
  };
  const reject = async (m: Miss) => {
    if (mode === 'server') { try { await knowledgeAPI.ignore(m.id); } catch { /* noop */ } }
    setMisses(x => x.filter(y => y.id !== m.id));
  };

  // Candidate → Validated (اعتماد يدويّ فقط، بلا اعتماد آليّ)
  const acceptCandidate = (c: Candidate) => {
    setVer(validateCandidate(c.phrase, c.concept));
    setCandidates(x => x.filter(y => y.id !== c.id));
    setMisses(x => x.filter(m => m.term.toLowerCase() !== c.phrase.toLowerCase()));
  };
  const rejectCandidate = (c: Candidate) => setCandidates(x => x.filter(y => y.id !== c.id));

  const pct = brain?.score?.searchSuccess ?? brain?.quality?.successRate;
  const searches = brain?.searches ?? 0;

  const health = knowledgeHealth();
  const satRate = health.satisfied + health.unsatisfied > 0
    ? `${Math.round(health.satisfied / (health.satisfied + health.unsatisfied) * 100)}%` : '—';
  const STATS = mode === 'server'
    ? [
        { label: 'عمليات البحث', value: searches.toLocaleString() },
        { label: 'نسبة الفهم', value: pct != null ? `${Math.round(pct * (pct <= 1 ? 100 : 1))}%` : '—' },
        { label: 'لم تُفهَم', value: String(misses.length) },
      ]
    : [
        { label: 'نسبة الفهم', value: `${Math.round(health.understandRate * 100)}%` },
        { label: 'لم يفهمها', value: String(health.unknown) },
        { label: 'رضا 👍', value: satRate },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ember,#FF6A00)', background: 'var(--ember-soft,rgba(255,106,0,.12))' }}><Brain size={22} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink1,#FAFAFA)' }}>مركز المعرفة</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink3,#7E877F)' }}>عقل AMANZINE — إدارة ما تعلّمه، ومعالجة ما لم يفهمه</div>
        </div>
        <span className="mono" style={{ fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 99, border: BORDER, color: 'var(--ink3,#7E877F)' }} title="إصدار المعرفة">v{ver}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 99, border: BORDER, color: mode === 'server' ? 'var(--mint,#12A150)' : 'var(--ink3,#7E877F)' }}>
          {mode === 'server' ? <Cloud size={13} /> : <HardDrive size={13} />}{mode === 'server' ? 'الخادم' : mode === 'local' ? 'محلّي' : '…'}
        </span>
      </div>

      {/* Journey Analytics + Replay (بيانات البيتا) */}
      <JourneyAnalytics />

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: PANEL, border: BORDER, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink1,#FAFAFA)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3,#7E877F)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* candidate knowledge — Observation → Candidate → (اعتماد) → Validated */}
      {candidates.length > 0 && (
        <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: 'var(--ink1,#FAFAFA)' }}>
            <Sparkles size={15} style={{ color: 'var(--ember,#FF6A00)' }} /> معرفة مرشّحة من التجارب <span style={{ color: 'var(--ember,#FF6A00)' }}>· {candidates.length}</span>
          </div>
          <div style={{ padding: '9px 16px 4px', fontSize: 11.5, color: 'var(--ink3,#7E877F)' }}>أنماط تكرّرت — لا تُعتمَد آليًّا. راجِعها ثم اعتمد.</div>
          {candidates.map(c => (
            <div key={c.id} style={{ padding: '13px 16px', borderTop: BORDER, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: '1 1 190px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--ink1,#FAFAFA)' }}>«{c.phrase}» <span style={{ color: 'var(--ink3,#7E877F)' }}>→</span> <b style={{ color: 'var(--ember,#FF6A00)' }}>{c.concept}</b></div>
                <div style={{ fontSize: 11, color: 'var(--ink3,#7E877F)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--mint,#12A150)', fontWeight: 800 }}><Star size={10} style={{ verticalAlign: -1 }} /> ثقة {Math.round(c.confidence * 100)}٪</span>
                  <span>{c.support} تجربة</span>
                  <span>رضا {Math.round(c.satisfaction * 100)}٪</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                <button onClick={() => acceptCandidate(c)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: 'none', background: 'var(--mint,#12A150)', color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}><Check size={14} /> اعتمد</button>
                <button onClick={() => rejectCandidate(c)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 11px', borderRadius: 10, border: BORDER, background: 'transparent', color: 'var(--ink3,#7E877F)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* misses to teach */}
      <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: BORDER, fontSize: 14, fontWeight: 800, color: 'var(--ink1,#FAFAFA)' }}>
          كلمات ينتظر التطبيق أن يتعلّمها {misses.length > 0 && <span style={{ color: 'var(--ember,#FF6A00)' }}>· {misses.length}</span>}
        </div>

        {mode === 'loading' && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink3,#7E877F)', fontSize: 13 }}>جاري التحميل…</div>}
        {mode !== 'loading' && misses.length === 0 && (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink3,#7E877F)', fontSize: 13.5 }}>ما كاين حتى كلمة غامضة دابا 👌<br />العقل فاهم كل شي.</div>
        )}

        {misses.map(m => (
          <div key={m.id} style={{ padding: '13px 16px', borderTop: BORDER, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--ink1,#FAFAFA)' }}>«{m.term}»</div>
              <div style={{ fontSize: 11, color: 'var(--ink3,#7E877F)', marginTop: 1 }}>كتبها {m.count} {m.count === 1 ? 'مرة' : 'مرّات'}</div>
            </div>
            <input value={cat[m.id] || ''} onChange={e => setCat(c => ({ ...c, [m.id]: e.target.value }))}
              placeholder="اربطها بـ… (سبّاك، مقهى، بقال…)"
              style={{ flex: '1 1 150px', minWidth: 0, background: 'var(--bg2,rgba(255,255,255,0.02))', border: '1px solid var(--border2,rgba(255,255,255,0.14))', borderRadius: 10, padding: '9px 12px', color: 'var(--ink1,#FAFAFA)', fontSize: 13, fontFamily: 'inherit', outline: 'none', direction: 'rtl' }} />
            <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
              <button onClick={() => approve(m)} disabled={!(cat[m.id] || '').trim()} title="اعتمد"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: 'none', background: (cat[m.id] || '').trim() ? 'var(--mint,#12A150)' : 'var(--border2,rgba(255,255,255,0.12))', color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: (cat[m.id] || '').trim() ? 'pointer' : 'default' }}>
                <Check size={14} /> اعتمد
              </button>
              <button onClick={() => reject(m)} title="رفض"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 11px', borderRadius: 10, border: BORDER, background: 'transparent', color: 'var(--ink3,#7E877F)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--ink3,#7E877F)', lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
        كل كلمة تعتمدها تُعلّم التطبيق للأبد — فيفهمها كل المستخدمين بعدها. هكذا يكبر عقل AMANZINE من الاستخدام، لا من إدخال يدويّ لا ينتهي.
      </p>
    </div>
  );
}
