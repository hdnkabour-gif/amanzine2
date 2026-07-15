import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Sparkles, Camera, Mic, MessageCircle, FileText, Check, ArrowLeft, Rocket, List, SkipForward, Clock } from 'lucide-react';
import { parseNeed } from '../lib/needEngine';
import { resolveBlueprint, completeness, planNext, type BField, type Blueprint } from '../lib/blueprints';
import { inferValues, CONF, type Inferred } from '../lib/inference';
import { startJourney, jMeta, jStep, finishJourney, setJourneyFeedback, type Journey } from '../lib/journey';
import { buildContext } from '../lib/core/context';
import { playGate } from '../lib/gateTransition';
import type { Page } from '../types';

// ============================================================
// Universal Action + Question Planner + Context Brain.
//   جملة → نيّة + كيان → Blueprint → **محادثة**: يسأل الأنسب التالي (لا نموذج كامل).
//   Context Brain: يملأ ما يعرفه مسبقًا (مدينة المستخدم…) فلا يسأل عنه.
//   «عرض الكل» يكشف النموذج كاملًا لمن يفضّل. نسبة الاكتمال حيّة.
// ============================================================

type Values = Record<string, any>;

function prefill(fields: BField[], raw: string): Values {
  const t = raw.toLowerCase();
  const v: Values = {};
  const year = raw.match(/\b(19|20)\d{2}\b/);
  let price: string | undefined;
  const withCur = raw.match(/(\d[\d.,]{2,9})\s*(درهم|dh|dhs|د\.?م)/);
  if (withCur) price = withCur[1].replace(/[.,]$/, '');
  else { const nums = (raw.match(/\d[\d.,]{2,9}/g) || []).map(s => s.replace(/[.,]$/, '')); price = nums.find(n => !(year && n === year[0])); }
  const title = raw.replace(/بغيت|باغي|نبيع|نبيعو|عندي|للبيع|للكراء|نكري|أنا\s/g, '').replace(/(\d[\d.,]{2,9})\s*(درهم|dh|dhs|د\.?م)?/g, '').replace(/\s+/g, ' ').trim();
  for (const f of fields) {
    if (f.key === 'title' && title) v.title = title.slice(0, 60);
    if ((f.key === 'price' || f.key === 'dailyPrice') && price) v[f.key] = price;
    if (f.key === 'year' && year) v.year = year[0];
    if (f.key === 'profession' && title) v.profession = title.slice(0, 40);
    if (f.key === 'category') { for (const [kw, c] of CATMAP) if (t.includes(kw)) { v.category = c; break; } }
    if (f.key === 'condition') v.condition = /جديد/.test(t) ? 'جديد' : /مستعمل|خدام/.test(t) ? 'مستعمل' : undefined;
    if (f.key === 'kind') { for (const [kw, c] of REMAP) if (t.includes(kw)) { v.kind = c; break; } }
    // (الماركة يتكفّل بها Inference Engine — Golf → Volkswagen)
  }
  return v;
}
const CATMAP: [string, string][] = [['ايفون','إلكترونيات'],['آيفون','إلكترونيات'],['تلفون','إلكترونيات'],['هاتف','إلكترونيات'],['لابطوب','إلكترونيات'],['صباط','أحذية'],['حذاء','أحذية'],['قميص','ملابس'],['لباس','ملابس'],['كنبة','أثاث'],['موبيليا','أثاث']];
const REMAP: [string, string][] = [['شقة','شقة'],['فيلا','فيلا'],['ستوديو','ستوديو'],['دار','دار'],['ارض','أرض'],['محل','محل']];

const EXAMPLES = ['عندي آيفون 13 نبيعو ب 3000', 'بغيت نبيع Golf 2018', 'أنا نجّار', 'عندي شقة للكراء فالرباط'];

export default function UniversalPublish() {
  const store = useStore();
  const { setPage, user } = store;
  const [raw, setRaw] = useState('');
  const [scenario, setScenario] = useState<{ bp: Blueprint; fields: BField[] } | null>(null);
  const [values, setValues] = useState<Values>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [assumptions, setAssumptions] = useState<Inferred[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [done, setDone] = useState(false);
  const [finished, setFinished] = useState<Journey | null>(null); // الرحلة المسجّلة (ثواني/twinId/feedback)
  const [fb, setFb] = useState<string | null>(null);

  const build = (text: string) => {
    const q = text.trim(); if (!q) return;
    setRaw(q); setSkipped(new Set()); setShowAll(false);
    const r = parseNeed(q);
    const { blueprint, fields, entity } = resolveBlueprint(r.intent, q);
    const vals = prefill(fields, q);
    // Context Brain: نملأ ما نعرفه (مدينة المستخدم) فلا نسأل عنه.
    try { const ctx = buildContext(store as any, { authed: !!user }); if (ctx.place.city && fields.some(f => f.key === 'city') && !vals.city) vals.city = ctx.place.city; } catch { /* noop */ }
    // Inference + Confidence: نفكّر قبل أن نسأل — نستنتج ما نقدر ونملؤه (مع نسبة ثقة).
    const inferred = inferValues(entity, q).filter(i => fields.some(f => f.key === i.key) && vals[i.key] == null);
    for (const i of inferred) if (i.confidence >= CONF.confirm) vals[i.key] = i.value;
    setAssumptions(inferred.filter(i => i.confidence >= CONF.confirm));
    setScenario({ bp: blueprint, fields }); setValues(vals);
    // Journey: بداية التسجيل (Analytics + Replay + Seconds).
    startJourney(q); jMeta(entity, r.intent, blueprint.id); jStep('build', { note: blueprint.id });
    for (const i of inferred) if (i.confidence >= CONF.confirm) jStep('assume', { key: i.key, value: i.value });
  };

  useEffect(() => {
    try { const seed = sessionStorage.getItem('amanzine_publish_seed'); if (seed) { sessionStorage.removeItem('amanzine_publish_seed'); if (seed.trim()) build(seed); } } catch { /* noop */ }
    // إن غادر المستخدم بلا نشر → نسجّل الرحلة كمنسحبة (Analytics: نقطة الخروج).
    return () => { finishJourney(false); };
  }, []);

  const publish = () => { const j = finishJourney(true); setFinished(j); setDone(true); };

  const comp = useMemo(() => scenario ? completeness(scenario.fields, values) : { score: 0 }, [scenario, values]);
  const askable = useMemo(() => scenario ? scenario.fields.filter(f => !skipped.has(f.key)) : [], [scenario, skipped]);
  const next = useMemo(() => scenario ? planNext(askable, values) : null, [scenario, askable, values]);
  const gold = 'var(--amz-gold,#D4A017)'; const green = 'var(--amz-emerald,#0a8f6f)';
  const set = (k: string, val: any) => { setValues(v => ({ ...v, [k]: val })); jStep('answer', { key: k, value: val }); };

  // Journey: نسجّل السؤال المطروح (Analytics: نقطة الخروج).
  useEffect(() => { if (next) jStep('question', { key: next.key }); }, [next?.key]);

  if (done && scenario) {
    const secs = finished?.seconds;
    const fast = secs != null && secs < 45; // KPI: ثوانٍ حتى النتيجة (هدف < 45)
    return (
      <div style={{ maxWidth: 560, margin: '10px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center', paddingTop: 18 }}>
        <div style={{ width: 74, height: 74, borderRadius: 22, background: `color-mix(in srgb, ${green} 22%, transparent)`, border: `1.5px solid ${gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={38} style={{ color: gold }} /></div>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: 'var(--ink1)' }}>{scenario.bp.verb} «{values.title || values.profession || 'إعلانك'}» ✦</h2>
        {/* Seconds-to-Result — المؤشّر الأوّل */}
        {secs != null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 99, background: fast ? `color-mix(in srgb, ${green} 16%, transparent)` : 'var(--panel2,#132040)', border: `1px solid ${fast ? green : gold}`, fontSize: 13.5, fontWeight: 800, color: fast ? green : gold }}>
            <Clock size={15} /> نُشِر في {secs} ثانية {fast ? '🎯' : ''}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink3)' }}>اكتمل {comp.score}٪ — صار مرئيًّا للباحثين قربك.{finished?.twinId ? ` · معرّف: ${finished.twinId}` : ''}</p>

        {/* Feedback — أغلى من ألف تخمين */}
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

        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <button onClick={() => playGate(() => setPage('products' as Page))} style={btn(gold, true)}>عرض في متجري <ArrowLeft size={16} /></button>
          <button onClick={() => { setDone(false); setScenario(null); setValues({}); setRaw(''); setFinished(null); setFb(null); }} style={btn(gold, false)}>افعل شيئًا آخر</button>
        </div>
      </div>
    );
  }

  const fieldControl = (f: BField, big = false) => (
    f.type === 'select' ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {f.options!.map(op => (
          <button key={op} type="button" onClick={() => set(f.key, op)} style={{ padding: big ? '10px 16px' : '7px 12px', borderRadius: 11, border: `1px solid ${values[f.key] === op ? gold : 'var(--border2,rgba(255,255,255,.14))'}`, background: values[f.key] === op ? `color-mix(in srgb, ${gold} 18%, transparent)` : 'transparent', color: values[f.key] === op ? gold : 'var(--ink2)', fontSize: big ? 14 : 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{op}</button>
        ))}
      </div>
    ) : f.type === 'toggle' ? (
      <div style={{ display: 'flex', gap: 8 }}>
        {[['نعم', true], ['لا', false]].map(([lbl, val]) => (
          <button key={String(val)} type="button" onClick={() => set(f.key, val)} style={{ padding: big ? '10px 20px' : '7px 14px', borderRadius: 11, border: `1px solid ${values[f.key] === val ? green : 'var(--border2,rgba(255,255,255,.14))'}`, background: values[f.key] === val ? `color-mix(in srgb, ${green} 18%, transparent)` : 'transparent', color: values[f.key] === val ? green : 'var(--ink3)', fontSize: big ? 14 : 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>{lbl as string}</button>
        ))}
      </div>
    ) : f.type === 'photos' || f.type === 'video' ? (
      <button type="button" onClick={() => set(f.key, values[f.key] ? undefined : 'أضيفت')} style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: big ? '11px 18px' : '9px 14px', borderRadius: 11, border: `1px dashed ${values[f.key] ? green : 'var(--border2,rgba(255,255,255,.14))'}`, background: 'transparent', color: values[f.key] ? green : 'var(--ink3)', fontSize: big ? 14 : 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
        {f.type === 'video' ? <FileText size={16} /> : <Camera size={16} />} {values[f.key] ? `${f.label} ✓` : `أضف ${f.label}`}
      </button>
    ) : (
      <input value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} inputMode={f.type === 'number' || f.type === 'money' || f.type === 'phone' ? 'numeric' : undefined} autoFocus={big}
        placeholder={f.hint || ''} style={{ width: '100%', padding: big ? '13px 14px' : '10px 12px', borderRadius: 11, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(0,0,0,.15))', color: 'var(--ink1)', fontSize: big ? 16 : 14, fontWeight: 700, fontFamily: 'inherit', direction: 'rtl' }} />
    )
  );

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      {!scenario && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {EXAMPLES.map(c => <button key={c} onClick={() => build(c)} style={{ padding: '8px 13px', borderRadius: 99, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink2)', fontSize: 12.5, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>{c}</button>)}
        </div>
      )}

      {scenario && (
        <div style={{ border: `1.5px solid ${gold}`, borderRadius: 16, padding: 16, background: `color-mix(in srgb, ${green} 8%, var(--panel,rgba(255,255,255,.03)))`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 900, color: gold }}>
            <Rocket size={16} /> {scenario.bp.label}
            <button onClick={() => setShowAll(s => !s)} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border2,rgba(255,255,255,.14))', borderRadius: 99, padding: '4px 10px', color: 'var(--ink3)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              <List size={12} /> {showAll ? 'وضع المحادثة' : 'عرض الكل'}
            </button>
          </div>

          {/* Prediction Brain: «افترضنا هذه المعلومات» — ثقة عالية ✓ · متوسّطة ~ (اضغط لتصحيح) */}
          {assumptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 12, background: 'color-mix(in srgb, var(--amz-emerald,#0a8f6f) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--amz-emerald,#0a8f6f) 30%, transparent)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: green }}>🔮 فكّرنا قبل ما نسولوك — افترضنا:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {assumptions.map(a => {
                  const high = a.confidence >= CONF.auto;
                  return (
                    <button key={a.key} type="button" onClick={() => { setValues(v => ({ ...v, [a.key]: undefined })); setAssumptions(list => list.filter(x => x.key !== a.key)); }}
                      title="اضغط لتصحيحه" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, border: `1px solid ${high ? green : gold}`, background: 'transparent', color: high ? green : gold, fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                      {a.label}: {String(values[a.key] ?? a.value)} {high ? '✓' : '~'}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink3)' }}>✓ متأكّدون · ~ خمّنّا (اضغط لتصحيح إلا خصّ)</div>
            </div>
          )}

          {/* نسبة الاكتمال الحيّة */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              <span style={{ color: comp.score >= 80 ? green : gold }}>اكتمل {comp.score}٪</span>
              {comp.next && <span style={{ color: 'var(--ink3)' }}>زيد «{comp.next.label}» +{comp.next.gain}٪</span>}
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'var(--panel2,#132040)', overflow: 'hidden' }}>
              <div style={{ width: `${comp.score}%`, height: '100%', background: `linear-gradient(90deg, ${green}, ${gold})`, transition: 'width .4s ease' }} />
            </div>
          </div>

          {/* وضع المحادثة: سؤال واحد الأنسب */}
          {!showAll && next && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink1)' }}>{questionOf(next)}{next.required && <span style={{ color: gold }}> *</span>}</div>
              {next.hint && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: -4 }}>💡 {next.hint}</div>}
              {fieldControl(next, true)}
              <div style={{ display: 'flex', gap: 9, marginTop: 2 }}>
                {!next.required && (
                  <button onClick={() => setSkipped(s => new Set(s).add(next.key))} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border2,rgba(255,255,255,.14))', borderRadius: 11, padding: '9px 14px', color: 'var(--ink3)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}><SkipForward size={14} /> تخطّى</button>
                )}
                <button onClick={() => setShowAll(true)} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: gold, fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>خلّصني دفعة وحدة ←</button>
              </div>
            </div>
          )}

          {/* وضع المحادثة انتهى: جاهز للنشر */}
          {!showAll && !next && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center', padding: '6px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink1)' }}>واجد! جمعنا كل الأساسيّ ✓</div>
              <button onClick={publish} style={{ ...btn(gold, true), padding: '13px 22px', fontSize: 15 }}><Rocket size={17} /> نشر الآن</button>
              <button onClick={() => setShowAll(true)} style={{ background: 'transparent', border: 'none', color: gold, fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>زيد تفاصيل ترفع نسبة الاكتمال ←</button>
            </div>
          )}

          {/* وضع «عرض الكل»: النموذج كامل */}
          {showAll && (
            <>
              {scenario.fields.map(f => (
                <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700 }}>{f.label}{f.required && <span style={{ color: gold }}> *</span>}</span>
                  {fieldControl(f)}
                </label>
              ))}
              <button onClick={publish} style={{ ...btn(gold, true), justifyContent: 'center', padding: '13px', fontSize: 15 }}><Rocket size={17} /> نشر الآن</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// صياغة السؤال من الحقل (محادثة طبيعيّة بدل عنوان جافّ)
function questionOf(f: BField): string {
  const Q: Record<string, string> = {
    title: 'شنو سميّة اللي كتنشر؟', price: 'بشحال؟', dailyPrice: 'شحال فاليوم؟', city: 'فينا مدينة؟',
    photos: 'زيد شي صور', video: 'عندك فيديو؟', category: 'أشمن فئة؟', condition: 'أشمن حالة؟',
    brand: 'أشمن ماركة؟', model: 'أشمن موديل؟', year: 'أشمن عام؟', mileage: 'شحال ديال الكيلومترات؟',
    fuel: 'أشمن نوع ديال الوقود؟', gearbox: 'أشمن ناقل حركة؟', profession: 'أشمن مهنة؟', phone: 'شنو رقم الهاتف/واتساب؟',
    experience: 'شحال ديال سنوات الخبرة؟', kind: 'أشمن نوع؟',
  };
  return Q[f.key] || f.label;
}

function btn(gold: string, primary: boolean): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 13, border: primary ? 'none' : `1px solid ${gold}`, background: primary ? gold : 'transparent', color: primary ? '#1a1300' : gold, fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' };
}
