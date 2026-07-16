import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Sparkles, Camera, Mic, MessageCircle, FileText, Check, ArrowLeft, Rocket, List, Clock } from 'lucide-react';
import { startJourney, jMeta, jStep, finishJourney, setJourneyFeedback, type Journey } from '../lib/journey';
import { buildContext } from '../lib/core/context';
import { playGate } from '../lib/gateTransition';
import {
  decide, buildUIStep, allUIFields, planActions, checkPolicy, setUserAttr,
  type UIStep, type PolicyResult, type PageDef,
} from '../lib/akg';
import UniversalRenderer, { FullFormRenderer } from './UniversalRenderer';
import type { Page } from '../types';

// ============================================================
// CreateFlow — محرّك الإنشاء (renderer:'create'). يرسمه PageEngine من PageDef.
//   واجهة فقط: العقل يُصدّر UIStep والـ Renderer يعرضه. صفحة موجَّهة
//   (products.create) تبدأ مباشرةً من بذرة المجال؛ الصفحة الكونيّة تبدأ من
//   نصّ حرّ. لا منطق عرض ولا معرفة بالحقول هنا.
// ============================================================

type Values = Record<string, any>;
const EXAMPLES = ['عندي آيفون 13 نبيعو ب 3000', 'بغيت نبيع Golf 2018', 'أنا نجّار', 'عندي شقة للكراء فالرباط'];

export default function CreateFlow({ def }: { def: PageDef }) {
  const store = useStore();
  const { setPage, user } = store;
  const scoped = def.kind === 'create';           // صفحة موجَّهة لمجال (products.create…)
  const [raw, setRaw] = useState('');
  const [built, setBuilt] = useState(false);
  const [values, setValues] = useState<Values>({});
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [done, setDone] = useState(false);
  const [rec, setRec] = useState<Values>({});
  const [finished, setFinished] = useState<Journey | null>(null);
  const [fb, setFb] = useState<string | null>(null);
  const [gate, setGate] = useState<PolicyResult | null>(null);

  const build = (text: string) => {
    const q = text.trim(); if (!q) return;
    try { const ctx = buildContext(store as any, { authed: !!user }); if (ctx.place.city) setUserAttr('city', ctx.place.city); } catch { /* noop */ }
    const d0 = decide(q, {});
    setRaw(q); setValues({}); setRejected(new Set());
    setShowAll(false); setBuilt(true); setGate(null); setDone(false); setFinished(null); setFb(null);
    startJourney(q); jMeta(d0.entity, d0.intent, d0.blueprintLabel); jStep('build', { note: def.id });
    for (const a of d0.assumed) jStep('assume', { key: a.key, value: a.value });
  };

  useEffect(() => {
    try {
      const seed = sessionStorage.getItem('amanzine_publish_seed');
      if (seed) { sessionStorage.removeItem('amanzine_publish_seed'); if (seed.trim()) { build(seed); return () => { finishJourney(false); }; } }
    } catch { /* noop */ }
    if (scoped && def.seed) build(def.seed);   // صفحة موجَّهة → ابدأ من بذرة المجال
    return () => { finishJourney(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  const rejArr = useMemo(() => Array.from(rejected), [rejected]);
  const step: UIStep | null = useMemo(() => (built && raw ? buildUIStep(raw, values, rejArr) : null), [built, raw, values, rejArr]);
  const fullFields = useMemo(() => (built && raw ? allUIFields(raw) : []), [built, raw]);

  const gold = 'var(--amz-gold,#D4A017)'; const green = 'var(--amz-emerald,#0a8f6f)';
  const set = (k: string, val: any) => { setValues(v => ({ ...v, [k]: val })); jStep('answer', { key: k, value: val }); };
  const correct = (k: string) => { setRejected(s => new Set(s).add(k)); setValues(v => { const n = { ...v }; delete n[k]; return n; }); };

  useEffect(() => { if (step?.field) jStep('question', { key: step.field.key }); }, [step?.field?.key]);

  const merged = (): Values => {
    const d = decide(raw, values);
    const m: Values = {};
    for (const a of d.assumed) if (!rejected.has(a.key)) m[a.key] = a.value;
    return { ...m, ...values };
  };

  const publish = () => {
    const rc = merged();
    // Policies: الصلاحيّات من PageDef (النشر يتطلّب دخولًا).
    if (def.permissions.includes('publish')) {
      const pol = checkPolicy('publish', { authed: !!user, city: rc.city });
      if (pol.decision !== 'allow') { setGate(pol); return; }
    }
    setGate(null); setRec(rc);
    const j = finishJourney(true); setFinished(j); setDone(true);
  };

  const onAction = (id: string) => { if (id === 'showAll') setShowAll(true); else if (id === 'publish') publish(); };

  if (done) {
    const secs = finished?.seconds;
    const fast = secs != null && secs < 45;
    const ops = raw ? planActions(raw, rec).opportunities : [];
    const dec = raw ? decide(raw, rec) : null;
    return (
      <div style={{ maxWidth: 560, margin: '10px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center', paddingTop: 18 }}>
        <div style={{ width: 74, height: 74, borderRadius: 22, background: `color-mix(in srgb, ${green} 22%, transparent)`, border: `1.5px solid ${gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={38} style={{ color: gold }} /></div>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: 'var(--ink1)' }}>{dec?.verb || 'نُشِر'} «{rec.title || rec.profession || 'إعلانك'}» ✦</h2>
        {secs != null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 99, background: fast ? `color-mix(in srgb, ${green} 16%, transparent)` : 'var(--panel2,#132040)', border: `1px solid ${fast ? green : gold}`, fontSize: 13.5, fontWeight: 800, color: fast ? green : gold }}>
            <Clock size={15} /> نُشِر في {secs} ثانية {fast ? '🎯' : ''}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink3)' }}>صار مرئيًّا للباحثين قربك.{finished?.twinId ? ` · معرّف: ${finished.twinId}` : ''}</p>

        <div style={{ width: '100%', maxWidth: 340, padding: 14, borderRadius: 14, background: 'var(--panel,rgba(255,255,255,.03))', border: '1px solid var(--border,rgba(255,255,255,.08))' }}>
          {!fb ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink1)', marginBottom: 10 }}>واش كانت ساهلة؟</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {([['😀', 'good'], ['😐', 'ok'], ['😞', 'bad']] as const).map(([e, m]) => (
                  <button key={m} onClick={() => { if (finished) setJourneyFeedback(finished.id, m); setFb(m); }} style={{ width: 52, height: 52, borderRadius: 14, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'transparent', fontSize: 26, cursor: 'pointer' }}>{e}</button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 700, color: green }}>شكرًا! 🙏 ملاحظتك كتعاوننا نحسّنو.</div>
          )}
        </div>

        {ops.length > 0 && (
          <div style={{ width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink3)', marginBottom: 8 }}>✨ الخطوة الجايّة؟</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
              {ops.map((o, i) => (
                <button key={i} onClick={() => build(o.label)} style={{ padding: '7px 12px', borderRadius: 99, border: `1px solid ${gold}`, background: 'transparent', color: gold, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{o.label}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <button onClick={() => playGate(() => setPage('products' as Page))} style={btn(gold, true)}>عرض في متجري <ArrowLeft size={16} /></button>
          <button onClick={() => { setDone(false); setBuilt(false); setValues({}); setRaw(''); setFinished(null); setFb(null); if (scoped && def.seed) build(def.seed); }} style={btn(gold, false)}>افعل شيئًا آخر</button>
        </div>
      </div>
    );
  }

  const gateBanner = gate ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 14px', borderRadius: 12, background: `color-mix(in srgb, ${gold} 12%, transparent)`, border: `1px solid ${gold}`, width: '100%' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink1)' }}>{gate.reason}</div>
      {gate.remedy === 'login' && (
        <button onClick={() => { try { sessionStorage.setItem('amanzine_publish_seed', raw); } catch { /* noop */ } window.location.href = '/login'; }} style={{ ...btn(gold, true), alignSelf: 'flex-start' }}>تسجيل الدخول</button>
      )}
      {gate.remedy === 'askCity' && (
        <button onClick={() => { setGate(null); setShowAll(true); }} style={{ ...btn(gold, true), alignSelf: 'flex-start' }}>زيد المدينة</button>
      )}
    </div>
  ) : null;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* الرأس: كونيّ = بطل + نصّ حرّ · موجَّه = عنوان مضغوط */}
      {scoped ? (
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <h1 style={{ fontSize: 'clamp(1.3rem,4vw,1.7rem)', fontWeight: 900, margin: '4px 0', color: 'var(--ink1)' }}>{def.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>أمانزين يسولك السؤال المناسب فقط.</p>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', paddingTop: 4 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: gold }}><Sparkles size={15} /> محرّك السيناريوهات</div>
            <h1 style={{ fontSize: 'clamp(1.4rem,4.5vw,1.9rem)', fontWeight: 900, margin: '6px 0 4px', color: 'var(--ink1)' }}>افعل أيّ شيء… من جملة وحدة</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink3)', margin: 0 }}>بيع، كراء، أو أعلن عن مهنتك — قول لينا، وأمانزين يسولك السؤال المناسب فقط.</p>
          </div>

          <div style={{ background: 'var(--panel,rgba(255,255,255,.03))', border: '1.5px solid var(--border2,rgba(255,255,255,.14))', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={2} placeholder="مثلاً: بغيت نبيع Golf 2018 · أنا نجّار · عندي شقة للكراء"
              style={{ width: '100%', resize: 'vertical', background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink1)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', direction: 'rtl' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[{ i: Camera, l: 'صورة' }, { i: Mic, l: 'صوت' }, { i: MessageCircle, l: 'واتساب' }, { i: FileText, l: 'PDF' }].map(m => (
                <button key={m.l} type="button" title={`${m.l} — قريبًا`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 10, border: '1px solid var(--border,rgba(255,255,255,.08))', background: 'transparent', color: 'var(--ink3)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}><m.i size={14} /> {m.l}</button>
              ))}
              <button onClick={() => build(raw)} disabled={!raw.trim()} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 12, border: 'none', background: raw.trim() ? gold : 'var(--panel4,#1E3260)', color: raw.trim() ? '#1a1300' : 'var(--ink3)', fontSize: 13.5, fontWeight: 900, fontFamily: 'inherit', cursor: raw.trim() ? 'pointer' : 'default' }}><Sparkles size={15} /> ابنِ السيناريو</button>
            </div>
          </div>

          {!built && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {EXAMPLES.map(c => <button key={c} onClick={() => build(c)} style={{ padding: '8px 13px', borderRadius: 99, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink2)', fontSize: 12.5, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>{c}</button>)}
            </div>
          )}
        </>
      )}

      {built && step && (
        <div style={{ border: `1.5px solid ${step.theme?.accent || gold}`, borderRadius: 16, padding: 16, background: `color-mix(in srgb, ${step.theme?.accent || green} 8%, var(--panel,rgba(255,255,255,.03)))`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 900, color: step.theme?.accent || gold }}>
            <span>{step.theme?.icon || '🚀'}</span> {step.scenarioLabel}
            <button onClick={() => setShowAll(s => !s)} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border2,rgba(255,255,255,.14))', borderRadius: 99, padding: '4px 10px', color: 'var(--ink3)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              <List size={12} /> {showAll ? 'وضع المحادثة' : 'عرض الكل'}
            </button>
          </div>

          {showAll ? (
            <>
              <FullFormRenderer fields={fullFields} values={values} gold={gold} green={green} onChange={set} />
              {gateBanner}
              <button onClick={publish} style={{ ...btn(gold, true), justifyContent: 'center', padding: '13px', fontSize: 15 }}><Rocket size={17} /> نشر الآن</button>
            </>
          ) : (
            <UniversalRenderer step={step} values={values} gold={gold} green={green} onChange={set} onAction={onAction} onCorrect={correct} gate={gateBanner} />
          )}
        </div>
      )}
    </div>
  );
}

function btn(gold: string, primary: boolean): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 13, border: primary ? 'none' : `1px solid ${gold}`, background: primary ? gold : 'transparent', color: primary ? '#1a1300' : gold, fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' };
}
