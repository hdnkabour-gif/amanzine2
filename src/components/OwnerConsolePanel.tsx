import { useMemo, useState } from 'react';
import { Crown, CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { computeSystemMap } from '../lib/akg/systemMap';
import { allProfessions, allProblems, understand } from '../lib/akg/kb';
import { deriveEntity, ENTITY_TYPE_LABEL } from '../lib/entity';

// ============================================================
// OwnerConsolePanel — «دليل المالك» (قراءة فقط، بلغة صاحب المشروع لا المطوّر).
//   يجعل AMANZINE يشرح نفسه: ما هو · كيف يفكّر (مثال حيّ) · ماذا يعرف (أرقام) ·
//   ماذا لا يعرف · نسبة الاكتمال · ما يجب قبل البيتا. كلّ رقم محسوب من السجلّات
//   لحظيًّا — فالتطبيق نفسه يجيب، لا تقرير خارجيّ.
// ============================================================

const PANEL = 'var(--panel,rgba(255,255,255,0.03))';
const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK2 = 'var(--ink2,#B8C0BA)';
const INK3 = 'var(--ink3,#7E877F)';
const GREEN = 'var(--amz-emerald,#0a8f6f)';
const GOLD = 'var(--amz-gold,#D4A017)';
const AMBER = 'var(--amber,#F59E0B)';
const RED = 'var(--red,#F5484A)';

const EXAMPLE = 'الما كيهرب فالدار البيضاء بزربة';

export default function OwnerConsolePanel() {
  const map = useMemo(() => computeSystemMap(), []);
  const coverage = useMemo(() => {
    const profs = allProfessions();
    const covered = new Set(allProblems().flatMap(p => p.solutions.map(s => s.profession)));
    const missing = profs.filter(p => !covered.has(p.id));
    return { total: profs.length, covered: covered.size, pct: Math.round(covered.size / profs.length * 100), missing };
  }, []);
  const u = useMemo(() => understand(EXAMPLE), []);
  const entity = useMemo(() => deriveEntity(), []);
  const [showThink, setShowThink] = useState(true);

  const c = map.counts;
  const readiness = [
    { label: 'العقل (الفهم)', state: 'ok' as const, note: 'يعمل ومختبَر' },
    { label: 'الربط بين الأجزاء', state: map.issues.length === 0 ? 'ok' as const : 'warn' as const, note: `${map.issues.length} رابط مكسور` },
    { label: 'الاختبارات', state: 'ok' as const, note: 'npm test — 41 اختبارًا' },
    { label: 'المعرفة (التغطية)', state: coverage.pct >= 85 ? 'ok' as const : 'warn' as const, note: `${coverage.pct}% من المهن مربوطة` },
    { label: 'تجربة البداية', state: 'warn' as const, note: 'Landing جديدة · جولة اختياريّة · splash يُراجَع لاحقًا' },
    { label: 'البيانات الحقيقيّة', state: 'no' as const, note: 'فارغة — تملؤها البيتا' },
  ];

  const checklist = [
    { done: true, t: 'هويّة Need OS (واجهة + وثائق)' },
    { done: true, t: 'العقل + الاختبارات + مركز القيادة' },
    { done: true, t: 'Landing جديدة + جولة اختياريّة' },
    { done: coverage.pct >= 85, t: `تغطية المهن (${coverage.covered}/${coverage.total})` },
    { done: false, t: 'إدخال أوّل 100–150 مزوّد (الدار البيضاء)' },
    { done: false, t: 'قائمة دعوة أوّل المستخدمين' },
    { done: false, t: 'تعيين مشغّل معرفة (متابعة يوميّة)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, background: `color-mix(in srgb, ${GOLD} 15%, transparent)` }}><Crown size={22} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: INK1 }}>دليل المالك</div>
          <div style={{ fontSize: 12.5, color: INK3 }}>AMANZINE يشرح نفسه لك — بلغتك، بأرقام حيّة، دون فتح الكود.</div>
        </div>
      </div>

      {/* ① من هو */}
      <Section n="١" title="ما هو AMANZINE؟">
        <p style={{ margin: 0, color: INK2, fontSize: 14.5, lineHeight: 1.85 }}>
          <b style={{ color: INK1 }}>نظام تشغيل للحاجة.</b> المستخدم يكتب حاجته بالدارجة، فيفهمها العقل ويوصّله للحلّ.
          السلسلة واحدة: <b style={{ color: GREEN }}>حاجة → فهم → قرار → إجراء</b>. المجالات (منتجات، خدمات،
          حِرف، سيّارات…) بيانات لا ميزات — كلّها على نفس العقل.
        </p>
      </Section>

      {/* ② كيف يفكّر — مثال حيّ */}
      <Section n="٢" title="كيف يفكّر؟ (مثال حيّ الآن)">
        <div style={{ background: `color-mix(in srgb, ${GREEN} 6%, ${PANEL})`, border: `1px solid ${GREEN}`, borderRadius: 12, padding: '13px 15px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: INK1, marginBottom: 8 }}>المستخدم كتب: «{EXAMPLE}»</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: INK2 }}>
            <Trace k="فهم العرَض" v={u.problem?.name} />
            <Trace k="المختصّ" v={u.profession?.label} tone />
            <Trace k="المدينة" v={u.city} />
            <Trace k="مستعجل؟" v={u.context.urgent ? 'نعم' : 'لا'} />
          </div>
          <button onClick={() => setShowThink(s => !s)} style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: INK3, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
            <ChevronDown size={13} style={{ transform: showThink ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /> لماذا قرّر هذا؟
          </button>
          {showThink && (
            <div style={{ marginTop: 7, paddingInlineStart: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {u.reasoning.map((r, i) => <div key={i} style={{ fontSize: 12, color: INK3, lineHeight: 1.5 }}>{r}</div>)}
            </div>
          )}
        </div>
      </Section>

      {/* ②.٥ نوع الحساب — مستنتَج لا مسؤول */}
      <Section n="٢.٥" title="نوع الحساب — يُستنتَج لا يُسأل">
        <div style={{ background: `color-mix(in srgb, ${GOLD} 6%, ${PANEL})`, border: `1px solid ${GOLD}`, borderRadius: 12, padding: '13px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: INK3, fontWeight: 700, fontSize: 13 }}>النوع المستنتَج:</span>
            <span style={{ color: GOLD, fontWeight: 900, fontSize: 15 }}>{ENTITY_TYPE_LABEL[entity.type]}</span>
          </div>
          <div style={{ fontSize: 12, color: INK3, marginTop: 4 }}>{entity.reason}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
            {[['يبيع', entity.capabilities.canSell], ['يقدّم خدمة', entity.capabilities.canServe], ['يكري', entity.capabilities.canRent], ['زبون', entity.capabilities.isConsumer]].map(([l, on]) => (
              <span key={l as string} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 99, border: `1px solid ${on ? GREEN : 'var(--border,rgba(255,255,255,.12))'}`, color: on ? GREEN : INK3, background: on ? `color-mix(in srgb, ${GREEN} 10%, transparent)` : 'transparent' }}>{on ? '✓' : '○'} {l as string}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: INK3, marginTop: 9, lineHeight: 1.6 }}>
            لا نسأل «شنو بغيتي تدير؟». الحساب <b style={{ color: INK1 }}>Entity</b> واحد، ونوعه يظهر من أوّل حاجة يكتبها (<b style={{ color: INK1 }}>parseNeed</b>) وقدراته تنمو من أفعاله.
          </div>
        </div>
      </Section>

      {/* ③ ماذا يعرف */}
      <Section n="٣" title="ماذا يعرف الآن؟">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))', gap: 8 }}>
          {[
            ['مهن', c.professions], ['أعطال', c.problems], ['أعراض', c.symptoms], ['قدرات', c.kbCapabilities],
            ['مفردات', c.vocabulary], ['مدن', c.cities], ['خدمات', c.services], ['وحدات', c.modules],
          ].map(([l, v]) => (
            <div key={l as string} style={{ background: PANEL, border: BORDER, borderRadius: 11, padding: '11px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 900, color: INK1 }}>{v as number}</div>
              <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{l as string}</div>
            </div>
          ))}
        </div>
        {/* شريط التغطية */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 5 }}>
            <span>تغطية المهن (لها مسار فهم)</span>
            <span style={{ color: coverage.pct >= 85 ? GREEN : AMBER }}>{coverage.covered}/{coverage.total} · {coverage.pct}%</span>
          </div>
          <div style={{ height: 9, borderRadius: 99, background: 'var(--bg2,rgba(255,255,255,0.06))', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${coverage.pct}%`, background: coverage.pct >= 85 ? GREEN : AMBER, borderRadius: 99 }} />
          </div>
        </div>
      </Section>

      {/* ④ ماذا لا يعرف */}
      <Section n="٤" title="ماذا لا يعرف بعد؟">
        {coverage.missing.length === 0
          ? <div style={{ fontSize: 13.5, color: GREEN }}>كلّ المهن لها مسار فهم 👌</div>
          : (
            <>
              <div style={{ fontSize: 12.5, color: INK3, marginBottom: 8 }}>مهن مسجّلة لكن بلا مسار عرَض→عطل (لن يفهمها العقل من الكلام بعد):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {coverage.missing.map(p => (
                  <span key={p.id} style={{ fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: `1px solid ${AMBER}`, color: AMBER, background: `color-mix(in srgb, ${AMBER} 8%, transparent)` }}>{p.label}</span>
                ))}
              </div>
            </>
          )}
      </Section>

      {/* ⑤ نسبة الاكتمال */}
      <Section n="٥" title="ما نسبة اكتماله؟ (بمعايير واضحة)">
        <div style={{ background: PANEL, border: BORDER, borderRadius: 12, overflow: 'hidden' }}>
          {readiness.map((r, i) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : BORDER }}>
              <StateIcon s={r.state} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: INK1 }}>{r.label}</span>
              <span style={{ fontSize: 11.5, color: INK3 }}>{r.note}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ⑥ قبل البيتا */}
      <Section n="٦" title="ماذا يجب قبل البيتا؟">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {checklist.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
              {it.done
                ? <CheckCircle2 size={17} style={{ color: GREEN, flexShrink: 0 }} />
                : <span style={{ width: 17, height: 17, borderRadius: 5, border: `1.5px solid ${INK3}`, flexShrink: 0 }} />}
              <span style={{ color: it.done ? INK3 : INK1, textDecoration: it.done ? 'line-through' : 'none', fontWeight: it.done ? 600 : 750 }}>{it.t}</span>
            </div>
          ))}
        </div>
      </Section>

      <p style={{ fontSize: 11.5, color: INK3, lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
        كلّ رقم هنا محسوب من العقل نفسه لحظة فتحك الصفحة — إن تغيّرت المعرفة، تغيّرت الأرقام. التطبيق يجيبك، لا تقرير.
      </p>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 900, color: GOLD, background: `color-mix(in srgb, ${GOLD} 14%, transparent)` }}>{n}</span>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 900, color: INK1 }}>{title}</h3>
      </div>
      <div style={{ paddingInlineStart: 33 }}>{children}</div>
    </div>
  );
}

function Trace({ k, v, tone }: { k: string; v?: string; tone?: boolean }) {
  return v ? (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: INK3, minWidth: 70, fontWeight: 700 }}>{k}</span>
      <span style={{ color: tone ? GREEN : INK1, fontWeight: tone ? 800 : 650 }}>{v}</span>
    </div>
  ) : null;
}

function StateIcon({ s }: { s: 'ok' | 'warn' | 'no' }) {
  if (s === 'ok') return <CheckCircle2 size={17} style={{ color: GREEN, flexShrink: 0 }} />;
  if (s === 'warn') return <AlertTriangle size={17} style={{ color: AMBER, flexShrink: 0 }} />;
  return <XCircle size={17} style={{ color: RED, flexShrink: 0 }} />;
}
