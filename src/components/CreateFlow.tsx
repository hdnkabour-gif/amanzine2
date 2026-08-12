import { useState, useMemo, useEffect } from 'react';
import { consumeState } from '../lib/clientState';
import { useStore } from '../store';
import ShareShop from './ShareShop';
import { Sparkles, Camera, Mic, MessageCircle, FileText, Check, ArrowLeft, Rocket, List, Clock } from 'lucide-react';
import { startJourney, jMeta, jStep, finishJourney, setJourneyFeedback, type Journey } from '../lib/journey';
import { buildContext } from '../lib/core/context';
import { playGate } from '../lib/gateTransition';
import {
  decide, buildUIStep, allUIFields, planActions, checkPolicy, setUserAttr,
  getWorkflow, currentStageIndex, type Workflow, type Phase,
  type UIStep, type PolicyResult, type PageDef,
} from '../lib/akg';
import UniversalRenderer, { FullFormRenderer } from './UniversalRenderer';
import type { Page } from '../types';

// شريط المراحل (من Workflow Registry) — لا مراحل مكتوبة في الصفحة.
function Stepper({ wf, phase, accent }: { wf: Workflow; phase: Phase; accent: string }) {
  const cur = currentStageIndex(wf, phase);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {wf.stages.map((s, i) => {
        const active = i <= cur;
        return (
          <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, color: active ? accent : 'var(--ink3,#7E877F)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: active ? accent : 'transparent', border: `1.5px solid ${active ? accent : 'var(--ink3,#7E877F)'}` }} />
              {s.label}
            </span>
            {i < wf.stages.length - 1 && <span style={{ width: 12, height: 1.5, background: i < cur ? accent : 'var(--line,rgba(255,255,255,.12))' }} />}
          </span>
        );
      })}
    </div>
  );
}

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
  const { setPage, user, addProduct } = store;
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
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

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
      // يُستهلَك مرّةً عبر السجلّ — وله مدّةٌ الآن، فبذرةٌ متروكةٌ منذ ساعاتٍ
      //   لا تسبق ما كتبه صاحبُها للتوّ.
      const seed = consumeState<string>('amanzine_publish_seed');
      if (seed && seed.trim()) { build(seed); return () => { finishJourney(false); }; }
    } catch { /* noop */ }
    if (scoped && def.seed) build(def.seed);   // صفحة موجَّهة → ابدأ من بذرة المجال
    return () => { finishJourney(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  const rejArr = useMemo(() => Array.from(rejected), [rejected]);
  const step: UIStep | null = useMemo(() => (built && raw ? buildUIStep(raw, values, rejArr) : null), [built, raw, values, rejArr]);
  const fullFields = useMemo(() => (built && raw ? allUIFields(raw) : []), [built, raw]);

  const gold = 'var(--amz-gold,#D4A017)'; const green = 'var(--amz-emerald,#0a8f6f)';
  // Workflow Registry: المراحل بيانات — الطور الحاليّ يُشتقّ من حالة المحرّك.
  const wf = getWorkflow(def.id);
  const phase: Phase = done ? 'success' : !built ? 'draft' : step?.mode === 'ready' ? 'ready' : 'collect';
  const accent = step?.theme?.accent || gold;
  const set = (k: string, val: any) => { setValues(v => ({ ...v, [k]: val })); jStep('answer', { key: k, value: val }); };
  const correct = (k: string) => { setRejected(s => new Set(s).add(k)); setValues(v => { const n = { ...v }; delete n[k]; return n; }); };

  useEffect(() => { if (step?.field) jStep('question', { key: step.field.key }); }, [step?.field?.key]);

  const merged = (): Values => {
    const d = decide(raw, values);
    const m: Values = {};
    for (const a of d.assumed) if (!rejected.has(a.key)) m[a.key] = a.value;
    return { ...m, ...values };
  };

  // القيمُ المجموعة → منتج/خدمة تُحفَظ فعلًا. الحقول تختلف بالقالب (سيّارة/عقار/
  // خدمة)، لذا نأخذ المعروف بالاسم ونُبقي الباقي في `data` بلا ضياع.
  const toProduct = (v: Values) => {
    const KNOWN = ['title', 'profession', 'price', 'dailyPrice', 'desc', 'city', 'photos', 'video',
      'category', 'sizes', 'colors', 'stock', 'cost'];
    // حقولُ القالب الخاصّة (ماركة · سنة · كيلومتراج · خبرة · ضمانة…) تُحفَظ في
    // `customFields` — نفس الحقل الذي يقرأه السوق ويعرضه للزبون. بلا هذا كانت
    // تُجمَع في الواجهة ثمّ تُرمى عند الحفظ، فيُنشَر إعلانُ سيّارةٍ بلا ماركة.
    const labels: Record<string, string> = {
      brand: 'الماركة', model: 'الموديل', year: 'السنة', mileage: 'الكيلومتراج',
      fuel: 'الوقود', gearbox: 'علبة السرعات', condition: 'الحالة', papers: 'الأوراق',
      warranty: 'الضمانة', specialties: 'التخصّصات', experience: 'الخبرة',
      mobile: 'يتنقّل للزبون', hours: 'أوقات العمل', phone: 'الهاتف',
      deposit: 'الضمان', insurance: 'التأمين',
    };
    const customFields = Object.entries(v)
      .filter(([k, val]) => !KNOWN.includes(k) && val != null && val !== '')
      .map(([k, val]) => ({
        id: k, label: labels[k] || k, options: [] as string[],
        type: (typeof val === 'boolean' ? 'boolean' : 'text') as any,
        value: String(typeof val === 'boolean' ? (val ? 'نعم' : 'لا') : val),
      }));
    const photos: string[] = Array.isArray(v.photos) ? v.photos : v.photos ? [String(v.photos)] : [];
    const num = (x: any) => { const n = parseFloat(String(x ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0; };
    // قيمٌ متعدّدة: قد تصل مصفوفةً من `TagsPicker` أو نصًّا مفصولًا بفواصل.
    const list = (x: any): string[] =>
      Array.isArray(x) ? x.map(s => String(s).trim()).filter(Boolean)
      : x ? String(x).split(/\s*[،,]\s*/).map(s => s.trim()).filter(Boolean) : [];
    return {
      // الخادم يرفض اسمًا أقصر من حرفين — لا نترك النشر يفشل على تفصيلٍ كهذا.
      name: (String(v.title || v.profession || raw).trim() || 'إعلان جديد').slice(0, 120),
      description: String(v.desc || raw || ''),
      price: num(v.price ?? v.dailyPrice),
      // كانت هذه أربعَ قيمٍ ثابتةٍ تطمس ما كتبه التاجر: `cost: 0` تجعل كلَّ
      // ربحٍ يبدو ١٠٠٪، و`stock: 1` تُغلق البيعَ بعد أوّل طلبٍ لمن عنده أربعون
      // قطعة، و`sizes: []`/`colors: []` تبتلعان ما مَلأه. القيمةُ الآن من
      // التاجر، والصفرُ افتراضٌ لا حكم.
      cost: num(v.cost),
      stock: v.stock != null && v.stock !== '' ? Math.max(0, Math.round(num(v.stock))) : 1,
      category: String(v.category || def.id),
      sizes: list(v.sizes), colors: list(v.colors),
      status: 'published',
      emoji: '📦',
      imageUrl: photos[0] || '',
      images: photos,
      isForChildren: false,
      views: 0, sales: 0,
      city: v.city || undefined,
      videoUrl: typeof v.video === 'string' ? v.video : '',
      customFields,               // حقول القالب — يقرأها السوق ويعرضها
    };
  };

  const publish = async () => {
    const rc = merged();
    // Policies: الصلاحيّات من PageDef (النشر يتطلّب دخولًا).
    if (def.permissions.includes('publish')) {
      const pol = checkPolicy('publish', { authed: !!user, city: rc.city });
      if (pol.decision !== 'allow') { setGate(pol); return; }
    }
    setGate(null);
    // الحفظ الحقيقيّ. كانت هذه الدالّة تكتب سجلًّا محلّيًّا وتعرض «صار مرئيًّا
    // للباحثين قربك» — ولا يصل شيءٌ إلى الخادم أبدًا. الإعلان لم يكن يُنشَر.
    setSaving(true); setSaveErr(null);
    try {
      await addProduct(toProduct(rc));
    } catch (e: any) {
      setSaving(false);
      setSaveErr(e?.message || 'تعذّر الحفظ — تحقّق من الاتّصال وعاود');
      return;                     // لا نعرض نجاحًا لم يقع
    }
    setSaving(false); setRec(rc);
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
        <Stepper wf={wf} phase="success" accent={green} />
        {secs != null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 99, background: fast ? `color-mix(in srgb, ${green} 16%, transparent)` : 'var(--panel2,#132040)', border: `1px solid ${fast ? green : gold}`, fontSize: 13.5, fontWeight: 800, color: fast ? green : gold }}>
            <Clock size={15} /> نُشِر في {secs} ثانية {fast ? '🎯' : ''}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink3)' }}>صار مرئيًّا للباحثين قربك.{finished?.twinId ? ` · معرّف: ${finished.twinId}` : ''}</p>

        {/* **الرابطُ في اليد.** كانت الشاشةُ تقول «نُشِر» ثمّ تنتهي: يخرج التاجرُ
            من المحلّ بلا شيءٍ يأخذه معه. والزيارةُ الميدانيّةُ تُربَح هنا —
            رابطٌ يصيفطو لزبنائه اليوم، قبل أن يصل أيُّ زبونٍ من التطبيق. */}
        {user?.id && (
          <div style={{ width: '100%', maxWidth: 340 }}>
            <ShareShop
              userId={String(user.id)}
              name={rec.title || rec.profession || 'المحلّ ديالي'}
              where={[rec.district, rec.city].filter(Boolean).join('، ')}
            />
          </div>
        )}

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
              {/* أربعةُ أزرارٍ كانت تبدو فعّالةً ولا تفعل شيئًا، و«قريبًا» مخبّأةٌ
                  في title لا يراها مستخدمُ الهاتف. صارت معطّلةً ومعلَنةً. */}
              {[{ i: Camera, l: 'صورة' }, { i: Mic, l: 'صوت' }, { i: MessageCircle, l: 'واتساب' }, { i: FileText, l: 'PDF' }].map(m => (
                <button key={m.l} type="button" disabled style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 10, border: '1px dashed var(--border,rgba(255,255,255,.08))', background: 'transparent', color: 'var(--ink3)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'default', opacity: .45 }}><m.i size={14} /> {m.l} · قريبًا</button>
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
          <Stepper wf={wf} phase={phase} accent={accent} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 900, color: step.theme?.accent || gold }}>
            <span>{step.theme?.icon || '🚀'}</span> {step.scenarioLabel}
            {/* النموذج اليدويّ الكامل: كان زرًّا رماديًّا صغيرًا مكتوبًا عليه «عرض
                الكل» — لا يدلّ على أنّه نموذجٌ كامل، فلم يكن أحدٌ يعرف بوجوده.
                صار مسمّى بصراحة، بلونٍ ظاهر، ومعه عددُ حقوله. */}
            <button onClick={() => setShowAll(s => !s)} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: showAll ? 'transparent' : `color-mix(in srgb, ${accent} 14%, transparent)`, border: `1px solid ${accent}`, borderRadius: 99, padding: '5px 12px', color: accent, fontSize: 11.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
              {/* كان مكتوبًا «النموذج الكامل (٢٠ حقل)» — العددُ يُخيف قبل أن
                  يبدأ التاجر، ولا يفيده في شيء. الدعوةُ فعلٌ لا إحصاء. */}
              {showAll
                ? <><MessageCircle size={12} /> رجّع المحادثة</>
                : <><List size={12} /> عمّرها كلها بيدك</>}
            </button>
          </div>

          {/* يُقال مرّةً واحدة، قبل أن يبدأ الجواب — لا بعد أن يملّ */}
          {!showAll && Object.keys(values).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.75, marginTop: -6 }}>
              كنسولوك سؤالًا بسؤال باش تكون ساهلة. وإلا كتفضّل تعمّر كلشي بيدك،
              اضغط <b style={{ color: accent }}>عمّرها كلها بيدك</b> من فوق.
            </div>
          )}

          {saveErr && (
            <div style={{ padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.08)', color: '#FCA5A5', fontSize: 13, fontWeight: 700, lineHeight: 1.7 }}>
              ما تنشرش — {saveErr}
            </div>
          )}
          {showAll ? (
            <>
              <FullFormRenderer fields={fullFields} values={values} gold={gold} green={green} onChange={set} />
              {gateBanner}
              <button onClick={publish} disabled={saving} style={{ ...btn(gold, true), justifyContent: 'center', padding: '13px', fontSize: 15, opacity: saving ? .7 : 1, cursor: saving ? 'progress' : 'pointer' }}>
                <Rocket size={17} /> {saving ? 'كنسجّل…' : 'نشر الآن'}
              </button>
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
