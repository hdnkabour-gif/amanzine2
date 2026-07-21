// ============================================================
// AppKnowledgePanel — عارض «DNA التطبيق». يُظهر أنّ العقل يعرف التطبيق كما
// يعرفه المطوّر: الطبقات الأربع (CORE→SERVICES→MODULES→BRAINS)، متتبّع حيّ
// يبني المسار الكامل من جملة (Need→Intent→Entity→Module→Page→Fields→
// Actions→Services→Next)، ثمّ الوحدات والخدمات والصفحات. قراءة فقط.
// ============================================================

import { useState, useMemo } from 'react';
import { Network, ChevronDown, Zap, Layers, Boxes, Wrench, Search } from 'lucide-react';
import {
  allCapabilities, akgStats, allModules, allServices, resolveDna, decide, planQuestion, planActions,
  type PageCapability, type AppModule, type AppService, type DnaPath, type Decisions,
  type PlannerState, type ActionPlan,
} from '../lib/akg';

const PANEL = 'var(--panel,#14161A)';
const BORDER = '1px solid var(--line,rgba(255,255,255,.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const EMBER = 'var(--ember,#FF6A00)';
const EMBER_SOFT = 'var(--ember-soft,rgba(255,106,0,.12))';

const MODE_LABEL: Record<string, string> = { conversation: 'محادثة', form: 'استمارة', basics: 'أساسيّات' };
const KIND_LABEL: Record<string, string> = { ai: 'ذكاء', media: 'وسائط', share: 'مشاركة', commerce: 'تجارة', geo: 'موقع', system: 'نظام' };

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'ember' | 'plain' }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
      border: tone === 'ember' ? 'none' : BORDER,
      background: tone === 'ember' ? EMBER_SOFT : 'transparent',
      color: tone === 'ember' ? EMBER : INK3 }}>{children}</span>
  );
}

function SectionHead({ icon, title, count }: { icon: React.ReactNode; title: string; count?: React.ReactNode }) {
  return (
    <div style={{ padding: '13px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: INK1 }}>
      {icon} {title}{count != null && <span style={{ color: EMBER }}>· {count}</span>}
    </div>
  );
}

// ── متتبّع الـ DNA الحيّ ──────────────────────────────────────
function DnaTracer() {
  const [q, setQ] = useState('بغيت نبيع Golf 7');
  const dna: DnaPath | null = useMemo(() => {
    const s = q.trim();
    return s ? resolveDna(s) : null;
  }, [q]);
  const dec: Decisions | null = useMemo(() => {
    const s = q.trim();
    return s ? decide(s) : null;
  }, [q]);
  const plan: PlannerState | null = useMemo(() => {
    const s = q.trim();
    return s ? planQuestion(s) : null;
  }, [q]);
  const act: ActionPlan | null = useMemo(() => {
    const s = q.trim();
    return s ? planActions(s) : null;
  }, [q]);

  const DKIND: Record<string, { icon: string; label: string }> = {
    have: { icon: '✅', label: 'موجود' }, auto: { icon: '🔮', label: 'استنتج' },
    confirm: { icon: '❔', label: 'أكّد' }, ai: { icon: '🤖', label: 'ذكاء' },
    ask: { icon: '🗣️', label: 'اسأل' }, optional: { icon: '·', label: 'لاحقًا' },
  };

  const Row = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: boolean }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderTop: BORDER }}>
      <span style={{ flexShrink: 0, width: 66, fontSize: 11, fontWeight: 800, color: INK3 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: tone ? 800 : 600, color: tone ? EMBER : INK1, lineHeight: 1.5 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
      <SectionHead icon={<Search size={15} style={{ color: EMBER }} />} title="متتبّع الـ DNA — اكتب حاجة، شاهد المسار" />
      <div style={{ padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="مثال: بغيت نكري شقّة فالرباط"
          dir="rtl"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: BORDER,
            background: 'var(--panel2,rgba(255,255,255,.03))', color: INK1, fontSize: 13.5, outline: 'none' }}
        />
        {dna && (
          <div style={{ marginTop: 6 }}>
            <Row label="الحاجة" value={dna.need} />
            <Row label="النيّة" value={dna.intent} tone />
            <Row label="الكيان" value={dna.entity} tone />
            <Row label="الوحدة" value={dna.module?.label ?? '—'} />
            <Row label="الصفحة" value={dna.page?.title ?? '—'} />
            <Row label="الحقول" value={
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {dna.fields.length ? dna.fields.map(f => <Chip key={f.key}>{f.label}</Chip>) : '—'}
              </span>
            } />
            <Row label="الأفعال" value={
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {dna.actions.length ? dna.actions.map(a => <Chip key={a.key} tone={a.primary ? 'ember' : 'plain'}>{a.label}</Chip>) : '—'}
              </span>
            } />
            <Row label="الخدمات" value={
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {dna.services.length ? dna.services.map(s => <Chip key={s.id}>{s.label}</Chip>) : '—'}
              </span>
            } />
            <Row label="التالي" value={dna.next ?? '—'} />
            <Row label="علاقات" value={
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {dna.companions.length ? dna.companions.map((r, i) => <Chip key={i}>{r.label}</Chip>) : '—'}
              </span>
            } />
            <Row label="بعد الفعل" value={
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {dna.followUps.length ? dna.followUps.map((r, i) => <Chip key={i} tone="ember">{r.label}</Chip>) : '—'}
              </span>
            } tone />
          </div>
        )}
        {/* Decision Engine — القرار لكلّ حقل + سؤال واحد */}
        {dec && (
          <div style={{ marginTop: 12, borderTop: `2px solid ${EMBER_SOFT}`, paddingTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: EMBER, marginBottom: 8 }}>🧠 Decision Engine — فكّر قبل ما يسأل</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {dec.fields.map(f => (
                <span key={f.key} title={DKIND[f.kind]?.label}
                  style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 8, border: BORDER,
                    color: f.kind === 'ask' ? EMBER : INK1, opacity: f.kind === 'optional' ? 0.5 : 1 }}>
                  {DKIND[f.kind]?.icon} {f.label}{f.value !== undefined ? `: ${String(f.value)}` : ''}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderTop: BORDER }}>
              <span style={{ flexShrink: 0, width: 66, fontSize: 11, fontWeight: 800, color: INK3 }}>يسأل الآن</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: EMBER }}>{dec.askNow?.label ?? 'لا شيء — الأساسيّات مكتملة ✓'}</span>
            </div>
            <div style={{ fontSize: 11, color: INK3, marginTop: 4 }}>
              الظرف: <b style={{ color: INK1 }}>{dec.world.season} · {dec.world.partOfDay}{dec.world.occasions[0] ? ' · ' + dec.world.occasions[0] : ''}</b>
            </div>
          </div>
        )}
        {/* Question Planner + Action Planner — الحلقة الكاملة */}
        {plan && act && (
          <div style={{ marginTop: 12, borderTop: `2px solid ${EMBER_SOFT}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: EMBER }}>🗣️ Question Planner → ▶️ Action Planner</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ flexShrink: 0, width: 66, fontSize: 11, fontWeight: 800, color: INK3 }}>أوّل سؤال</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: INK1 }}>{plan.askNow?.question ?? 'لا سؤال — جاهز للتنفيذ ✓'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ flexShrink: 0, width: 66, fontSize: 11, fontWeight: 800, color: INK3 }}>التنفيذ</span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {act.primary && <Chip tone="ember">{act.primary.label}</Chip>}
                {act.ai.map(a => <Chip key={a.id}>{a.label}</Chip>)}
                {act.share.map(a => <Chip key={a.id}>{a.label}</Chip>)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ flexShrink: 0, width: 66, fontSize: 11, fontWeight: 800, color: INK3 }}>الفرص</span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {act.opportunities.length ? act.opportunities.map((o, i) => <Chip key={i} tone="ember">{o.label}</Chip>) : '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── طبقات المعماريّة ─────────────────────────────────────────
function LayerStrip() {
  const layers = [
    { k: 'CORE', label: 'القلب', desc: 'المحرّك · الهويّة · الأمن · القدرات', tone: false },
    { k: 'SERVICES', label: 'الخدمات', desc: `${allServices().length} قدرة مشتركة`, tone: true },
    { k: 'MODULES', label: 'الوحدات', desc: `${allModules().length} مجالات`, tone: true },
    { k: 'BRAINS', label: 'الأدمغة', desc: 'نيّة · كيان · معرفة · تعلّم', tone: false },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
      {layers.map(l => (
        <div key={l.k} style={{ background: PANEL, border: l.tone ? `1px solid ${EMBER}` : BORDER, borderRadius: 12, padding: '11px 10px', textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.5px', color: l.tone ? EMBER : INK3 }}>{l.k}</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginTop: 2 }}>{l.label}</div>
          <div style={{ fontSize: 10, color: INK3, marginTop: 2, lineHeight: 1.4 }}>{l.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── الوحدات ──────────────────────────────────────────────────
function ModuleCard({ m }: { m: AppModule }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: BORDER }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, color: INK1 }}>
        <ChevronDown size={15} style={{ color: INK3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{m.label} <span className="mono" style={{ fontSize: 10, color: INK3, fontWeight: 700 }}>/{m.id}</span></div>
          <div style={{ fontSize: 11, color: INK3, marginTop: 2 }}>{m.pages.length} صفحات · {m.services.length} خدمات · {m.workflow.length} خطوات</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {m.entities.map(e => <Chip key={e}>{e}</Chip>)}
        </div>
      </button>
      {open && (
        <div style={{ padding: '2px 16px 14px 42px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: INK3, fontWeight: 700 }}>الصفحات:</span>
            {m.pages.map(p => <Chip key={p}>{p}</Chip>)}
          </div>
          <div>
            <span style={{ fontSize: 11, color: INK3, fontWeight: 700 }}>سير العمل:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5, alignItems: 'center' }}>
              {m.workflow.map((w, i) => (
                <span key={w.step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Chip>{w.step}</Chip>
                  {i < m.workflow.length - 1 && <span style={{ color: INK3, fontSize: 11 }}>←</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── الصفحات ──────────────────────────────────────────────────
function CapCard({ cap }: { cap: PageCapability }) {
  const [open, setOpen] = useState(false);
  const essentials = cap.fields.filter(f => f.essential);
  return (
    <div style={{ borderTop: BORDER }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, color: INK1 }}>
        <ChevronDown size={15} style={{ color: INK3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{cap.title} <span className="mono" style={{ fontSize: 10, color: INK3, fontWeight: 700 }}>/{cap.page}</span></div>
          <div style={{ fontSize: 11.5, color: INK3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cap.purpose}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {cap.modes.map(m => <Chip key={m}>{MODE_LABEL[m] || m}</Chip>)}
        </div>
      </button>
      {open && (
        <div style={{ padding: '2px 16px 15px 42px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: INK3, fontWeight: 700 }}>تُلبّي:</span>
            {cap.intents.map(i => <Chip key={i} tone="ember">{i}</Chip>)}
          </div>
          {essentials.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: INK3, fontWeight: 700 }}>الأساسيّات:</span>
              {essentials.map(f => <Chip key={f.key}>{f.label}</Chip>)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {cap.actions.map(a => (
              <div key={a.key} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                <Zap size={11} style={{ color: a.primary ? EMBER : INK3, flexShrink: 0, transform: 'translateY(2px)' }} />
                <span style={{ fontWeight: a.primary ? 800 : 700, color: INK1 }}>{a.label}</span>
                <span style={{ color: INK3 }}>— {a.outcome}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppKnowledgePanel() {
  const caps = allCapabilities();
  const modules = allModules();
  const services = allServices();
  const s = akgStats();
  if (caps.length === 0) return null;

  const svcKinds = Array.from(new Set(services.map(x => x.kind)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* رأس + إحصاء */}
      <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
        <SectionHead icon={<Network size={15} style={{ color: EMBER }} />} title="DNA التطبيق — العقل يعرف نفسه" />
        <div style={{ padding: '10px 16px', fontSize: 11.5, color: INK3, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span><b style={{ color: INK1 }}>{modules.length}</b> وحدات</span>
          <span><b style={{ color: INK1 }}>{services.length}</b> خدمات</span>
          <span><b style={{ color: INK1 }}>{s.pages}</b> صفحات</span>
          <span><b style={{ color: INK1 }}>{s.actions}</b> فعلًا</span>
          <span><b style={{ color: INK1 }}>{s.fields}</b> حقلًا</span>
          <span><b style={{ color: INK1 }}>{s.intents}</b> حاجات</span>
        </div>
        <div style={{ padding: '0 16px 14px' }}><LayerStrip /></div>
      </div>

      {/* متتبّع حيّ */}
      <DnaTracer />

      {/* الوحدات */}
      <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
        <SectionHead icon={<Boxes size={15} style={{ color: EMBER }} />} title="الوحدات (Modules)" count={modules.length} />
        {modules.map(m => <ModuleCard key={m.id} m={m} />)}
      </div>

      {/* الخدمات */}
      <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
        <SectionHead icon={<Wrench size={15} style={{ color: EMBER }} />} title="الخدمات المشتركة (Services)" count={services.length} />
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {svcKinds.map(k => (
            <div key={k}>
              <div style={{ fontSize: 11, fontWeight: 800, color: INK3, marginBottom: 6 }}>{KIND_LABEL[k] || k}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {services.filter(x => x.kind === k).map((x: AppService) => (
                  <span key={x.id} title={x.outcome} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 99, border: BORDER, color: INK1 }}>{x.label}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* الصفحات */}
      <div style={{ background: PANEL, border: BORDER, borderRadius: 16, overflow: 'hidden' }}>
        <SectionHead icon={<Layers size={15} style={{ color: EMBER }} />} title="الصفحات (Pages)" count={s.pages} />
        {caps.map(c => <CapCard key={c.page} cap={c} />)}
      </div>
    </div>
  );
}
