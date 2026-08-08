import { useState, useMemo, useRef } from 'react';
import { Check, ArrowLeft, X, Plus, Loader2 } from 'lucide-react';
import { understand } from '../lib/akg/kb';
import { kindOfConcept, KIND_SAY, ASKS, GOLDEN, missingFor, type VisitKind, type VisitAsk } from '../lib/visitKind';
import { CONCEPTS } from '../lib/akg/kb/concepts';
// البحثُ يمرّ بالتطبيع نفسِه الذي تمرّ به المعرفة — «صباغه» و«صباغة» كلمةٌ واحدة.
import { normLoose } from '../lib/normalize';

// ============================================================
// **الزيارةُ الميدانيّة — جملةٌ واحدةٌ ثمّ تأكيدات.**
//
//   ── القيدُ الذي حكم كلَّ قرارٍ هنا ──
//   صاحبُ المشروع نصًّا: «صاحبُ محلٍّ أو تاجرٌ أو حرفيٌّ **لا يمكن أن تأخذ
//   نصفَ ساعةٍ من وقته وهو يشتغل**».
//
//   فالاستمارةُ الطويلةُ ليست بطيئةً فحسب — هي **خاطئةٌ في مبدئها**: تسأل
//   الزائرَ أن يترجم كلامَ التاجر إلى خاناتٍ بينما التاجرُ ينتظر. والصواب
//   أن يُكتَب **ما قاله التاجرُ كما قاله**، ويقرأه التطبيقُ بما بُني له.
//
//   ── ولذلك ثلاثُ خطواتٍ لا استمارة ──
//     ① جملةٌ واحدة  ⇒ يُقرأ منها المفهومُ والمدينةُ والخدمات
//     ② اسمٌ ونمرة   ⇒ سطران، والنمرةُ هي الهويّةُ في السوق لا البريد
//     ③ ثلاثةُ أسئلةٍ **تخصّ صنفَه** ⇒ يُشتقّ الصنفُ ولا يُسأل عنه
//
//   ── والصنفُ لا يُسأل ──
//   «واش نتا محلّ ولا حرفيّ؟» سؤالٌ **جوابُه مقروءٌ سلفًا** من جملته.
//   و`kindOfConcept` تقرؤه من قاعدة المعرفة. فإن لم يُحسَم — وذاك يقع —
//   يُسأل سؤالٌ واحدٌ ولا يُخمَّن: صفحةٌ بصنفٍ خاطئٍ تُخفي ما يُقرِّر الشراء.
//
//   ── وما يتعلّمه التطبيقُ من كلّ زيارة ──
//   كلُّ كلمةٍ لا يعرفها تُعرَض للزائر ليربطها بمفهوم، فتذهب إلى الخادم
//   **اقتراحًا** (`needs_review` عند التعارض) لا حقيقةً — القانونُ الثالث:
//   لا تعلُّمَ ذاتيّ. والسؤالُ الذهبيُّ («شنو كيسولوك الزبناء؟») يجمع لغةَ
//   الحرفة كما ينطقها الناسُ لا كما نكتبها نحن.
// ============================================================

// ── **ألوانُ التطبيق نفسِه — لأنّ لهذه القطعة بيتًا واحدًا** ──────────
//
//   `Threshold` تحمل ألوانَها لأنّها تظهر في **صفحتَين بسِمتَين متعاكستَين**
//   (هبوطٌ فاتحٌ وتطبيقٌ داكن). وهذه لا: `VisitFlow` لا تُستدعى إلّا من
//   `FieldVisit`، و`FieldVisit` لا تُبلَغ إلّا من `MainLayout` — والتطبيقُ
//   داكنٌ (`--void: #060B14`). فلوحٌ أبيضُ وسطَ صفحةٍ داكنةٍ ليس اختيارًا
//   في الذوق، هو **ورقةٌ مُقحَمةٌ** يراها الإنسانُ عطبًا.
//
//   والدرسُ الذي يفرّق بين الحالتَين: **عدُّ الأماكن التي تُعرَض فيها القطعة**
//   يسبق اختيارَ ألوانها. مكانٌ واحدٌ ⇒ ترث. مكانان متعاكسان ⇒ تحمل.
const K = {
  ink: 'var(--ink1,#F0F4FF)', ink2: 'var(--ink2,#8B96A8)', ink3: 'var(--ink2,#8B96A8)',
  line: 'var(--border2,rgba(255,255,255,.10))', card: 'var(--panel,#0F1A32)', soft: 'rgba(255,255,255,.06)',
  green: 'var(--mint,#00D2B3)', amber: 'var(--gold,#F6C453)', red: '#FF7B72',
  /** حبرٌ على الأخضر: `--mint` فاتحٌ، فالأبيضُ عليه لا يُقرأ. */
  onGreen: '#04121B',
};

export interface VisitDraft {
  said: string;
  name: string; phone: string; city: string;
  conceptId: string | null;
  kind: VisitKind | null;
  answers: Record<string, string | string[] | boolean>;
  words: { term: string; conceptId: string }[];
  golden: string[];
}

export const EMPTY_DRAFT: VisitDraft = {
  said: '', name: '', phone: '', city: '', conceptId: null, kind: null,
  answers: {}, words: [], golden: [],
};

/** رقمٌ مغربيٌّ صالح — نفسُ شرط الخادم، فلا يُرفَض بعد أن يُملأ كلُّ شيء. */
export const phoneOk = (p: string) => /^(\+212|0)[5-7]\d{8}$/.test(p.replace(/\s/g, ''));

type Step = 'said' | 'who' | 'asks' | 'golden';

export default function VisitFlow({ draft, onChange, onSubmit, busy, error }: {
  draft: VisitDraft;
  onChange: (d: VisitDraft) => void;
  onSubmit: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [step, setStep] = useState<Step>('said');
  const set = <K2 extends keyof VisitDraft>(k: K2, v: VisitDraft[K2]) => onChange({ ...draft, [k]: v });

  // ── القراءةُ الحيّة: يكتب الزائرُ ما قاله التاجرُ فيُقرأ فورًا ──────
  //   تحليلٌ واحدٌ للجملة، ويُعاد حسابُه مع النصّ وحدَه (القاعدة ㉒).
  const read = useMemo(() => {
    const q = draft.said.trim();
    if (q.length < 3) return null;
    const u = understand(q) as any;
    return {
      concept: u.service as string | undefined,
      city: u.city as string | undefined,
      services: (u.services || []) as string[],
      unknown: pickUnknown(q),
    };
  }, [draft.said]);

  const conceptName = (id?: string | null) =>
    (CONCEPTS as any[]).find(x => x.id === id)?.concept?.ar || id || '';

  // الصنفُ يُشتقّ فور أن يُقرأ المفهوم — ولا يُسأل عنه إلّا إن لم يُحسَم.
  const derived = draft.conceptId ? kindOfConcept(draft.conceptId) : null;
  const kind = draft.kind || derived;

  const next = () => {
    if (step === 'said') {
      // ما قُرئ يُثبَّت في المسوّدة: القراءةُ تُعاد مع كلّ حرفٍ، والمسوّدةُ لا.
      onChange({
        ...draft,
        conceptId: read?.concept || null,
        city: draft.city || read?.city || '',
        kind: null,
      });
      setStep('who');
      return;
    }
    if (step === 'who') { setStep('asks'); return; }
    if (step === 'asks') { setStep('golden'); return; }
    onSubmit();
  };

  const canNext =
    step === 'said' ? draft.said.trim().length >= 3
      : step === 'who' ? !!draft.name.trim() && phoneOk(draft.phone)
        : step === 'asks' ? !!kind && missingFor(kind, draft.answers).length === 0
          : true;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', direction: 'rtl', paddingBottom: 90 }}>
      <Progress step={step} />

      {step === 'said' && (
        <Card title="قول ليا بجملة شنو كيدير" sub="كما قالها هو — بلا ترتيب">
          <textarea
            autoFocus value={draft.said} onChange={e => set('said', e.target.value)}
            placeholder="مثلاً: عندي محل لافاج فالحي المحمدي، كنغسل الطوموبيلات و الزرابي"
            rows={3}
            style={{ ...field, resize: 'vertical', lineHeight: 1.9 }}
          />
          {/* المرآةُ الحيّة: يرى الزائرُ ما فُهم قبل أن يُكمل — فيصحّح الآن */}
          {read && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
              {read.concept && <Chip tone="green">🏷️ {conceptName(read.concept)}</Chip>}
              {read.city && <Chip tone="green">📍 {read.city}</Chip>}
              {read.services.slice(0, 4).map(s => <Chip key={s}>{conceptName(s)}</Chip>)}
              {!read.concept && <Chip tone="amber">ما عرفتش النشاط — غادي نسولك</Chip>}
            </div>
          )}
        </Card>
      )}

      {step === 'who' && (
        <Card title="الاسم والنمرة" sub="النمرةُ هي الهويّة — البريدُ اختياريّ">
          <input autoFocus value={draft.name} onChange={e => set('name', e.target.value)}
            placeholder="اسم المحلّ ولا ديالو" style={field} />
          <input value={draft.phone} onChange={e => set('phone', e.target.value)}
            placeholder="0600000000" inputMode="tel" dir="ltr"
            style={{ ...field, marginTop: 9, borderColor: draft.phone && !phoneOk(draft.phone) ? K.red : K.line }} />
          {draft.phone && !phoneOk(draft.phone) && (
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: K.red }}>نمرة مغربيّة: 06/07/05 و٩ أرقام</div>
          )}
          <input value={draft.city} onChange={e => set('city', e.target.value)}
            placeholder="المدينة" style={{ ...field, marginTop: 9 }} />
        </Card>
      )}

      {step === 'asks' && (
        <>
          {/* الصنفُ يُعرَض لا يُسأل — إلّا إن لم يُحسَم */}
          {kind ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11, flexWrap: 'wrap' }}>
              <Chip tone="green">✓ {KIND_SAY[kind]}</Chip>
              <button onClick={() => set('kind', null)} style={linkBtn}>ماشي هادا</button>
            </div>
          ) : (
            <Card title="شنو هو بالضبط؟" sub="ما قدرناش نعرفوها من الجملة">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['shop', 'craft', 'service'] as VisitKind[]).map(k => (
                  <button key={k} onClick={() => set('kind', k)} style={bigChoice}>{KIND_SAY[k]}</button>
                ))}
              </div>
            </Card>
          )}
          {kind && ASKS[kind].map(a => (
            <Ask key={a.id} ask={a}
              value={draft.answers[a.id]}
              onChange={v => onChange({ ...draft, answers: { ...draft.answers, [a.id]: v } })} />
          ))}
        </>
      )}

      {step === 'golden' && (
        <>
          <Ask ask={GOLDEN} value={draft.golden}
            onChange={v => set('golden', (Array.isArray(v) ? v : []) as string[])} />
          {/* الكلماتُ المجهولة: تُعرَض للزائر ليربطها — ولا تُكتَب حقيقةً */}
          {read?.unknown?.length ? (
            <Card title="كلماتٌ ما عرفناهاش" sub="ربطها بشي حاجة كتعرفها — التطبيقُ كيتعلّم منّك">
              {read.unknown.slice(0, 6).map(w => (
                <WordLink
                  key={w} term={w}
                  linked={draft.words.find(x => x.term === w)?.conceptId}
                  suggest={read.services}
                  onLink={id => {
                    const rest = draft.words.filter(x => x.term !== w);
                    set('words', id ? [...rest, { term: w, conceptId: id }] : rest);
                  }} />
              ))}
            </Card>
          ) : null}
        </>
      )}

      {error && (
        <div role="alert" style={{ margin: '11px 0', padding: '11px 14px', borderRadius: 12, background: 'rgba(255,123,114,.10)', border: `1px solid ${K.red}44`, color: K.red, fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* شريطٌ ثابتٌ أسفلَ الشاشة — الإبهامُ يبلغه بلا أن يمرّر */}
      <div style={{
        position: 'fixed', insetInline: 0, bottom: 0, padding: '11px 15px calc(11px + env(safe-area-inset-bottom))',
        background: 'var(--glass,rgba(11,13,20,.88))', borderTop: `1px solid ${K.line}`, backdropFilter: 'blur(12px)',
        display: 'flex', gap: 9, alignItems: 'center', justifyContent: 'center',
      }}>
        {step !== 'said' && (
          <button onClick={() => setStep(step === 'who' ? 'said' : step === 'asks' ? 'who' : 'asks')}
            style={{ ...btn, background: K.soft, color: K.ink2, flex: '0 0 auto' }}>رجع</button>
        )}
        <button onClick={next} disabled={!canNext || busy}
          style={{ ...btn, background: canNext && !busy ? K.green : 'rgba(255,255,255,.10)', color: canNext && !busy ? K.onGreen : K.ink3, flex: 1, maxWidth: 380 }}>
          {busy ? <Loader2 size={16} className="amz-spin" /> : step === 'golden' ? <Check size={16} /> : <ArrowLeft size={16} />}
          {step === 'golden' ? 'سجّل المحلّ' : 'كمّل'}
        </button>
      </div>
    </div>
  );
}

// ── قطعٌ صغيرة ────────────────────────────────────────────────

function Progress({ step }: { step: Step }) {
  const all: Step[] = ['said', 'who', 'asks', 'golden'];
  const i = all.indexOf(step);
  return (
    <div style={{ display: 'flex', gap: 5, marginBottom: 15 }}>
      {all.map((s, n) => (
        <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: n <= i ? K.green : 'rgba(255,255,255,.10)' }} />
      ))}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: 17, padding: '16px 17px', marginBottom: 12, boxShadow: 'var(--depth-sm,0 2px 8px rgba(0,0,0,.5))' }}>
      <div style={{ fontSize: 15.5, fontWeight: 900, color: K.ink }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: K.ink3, fontWeight: 700, marginTop: 4, marginBottom: 11 }}>{sub}</div>}
      {!sub && <div style={{ height: 11 }} />}
      {children}
    </div>
  );
}

/**
 * قطعةٌ مُثبَتة — وألوانُها **مكتوبةٌ كاملةً لا مركَّبةً بالجمع**.
 *
 *   `${K.green}12` يعمل حين يكون اللونُ `#00D2B3`، ويُنتج `var(--mint,…)12`
 *   حين يصير متغيّرًا — قيمةً غيرَ صالحةٍ يُسقطها المتصفّحُ صامتًا. فالجمعُ
 *   على لونٍ **يشتغل حتّى يكفّ بلا رسالةٍ واحدة**.
 */
const TONES = {
  plain: { fg: 'var(--ink2,#8B96A8)', bg: 'rgba(255,255,255,.05)', bd: 'rgba(255,255,255,.12)' },
  green: { fg: 'var(--mint,#00D2B3)', bg: 'var(--mint-soft,rgba(0,210,179,.08))', bd: 'var(--border-mint,rgba(0,210,179,.22))' },
  amber: { fg: 'var(--gold,#F6C453)', bg: 'var(--gold-soft,rgba(246,196,83,.08))', bd: 'var(--border-gold,rgba(246,196,83,.22))' },
} as const;

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'green' | 'amber' }) {
  const c = TONES[tone || 'plain'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, fontSize: 12.5, fontWeight: 800, color: c.fg, background: c.bg, border: `1px solid ${c.bd}` }}>
      {children}
    </span>
  );
}

/** سؤالٌ واحدٌ بشكلٍ يناسب جوابَه — والأشكالُ خمسةٌ لا غير. */
function Ask({ ask, value, onChange }: {
  ask: VisitAsk;
  value: string | string[] | boolean | undefined;
  onChange: (v: string | string[] | boolean) => void;
}) {
  const [t, setT] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const lines = Array.isArray(value) ? value : [];
  const add = () => { const v = t.trim(); if (!v) return; onChange([...lines, v]); setT(''); ref.current?.focus(); };

  return (
    <Card title={ask.q} sub={ask.hint}>
      {ask.kind === 'yesno' ? (
        <div style={{ display: 'flex', gap: 9 }}>
          {[['إيه', true], ['لا', false]].map(([l, v]) => (
            <button key={String(v)} onClick={() => onChange(v as boolean)}
              style={{ ...bigChoice, flex: 1, ...(value === v ? { background: K.green, color: K.onGreen, borderColor: K.green } : {}) }}>
              {l as string}
            </button>
          ))}
        </div>
      ) : ask.kind === 'lines' ? (
        <>
          <div style={{ display: 'flex', gap: 7 }}>
            <input ref={ref} value={t} onChange={e => setT(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder={ask.hint || 'كتب وضغط Enter'} style={{ ...field, marginTop: 0, flex: 1 }} />
            <button onClick={add} aria-label="زيد" style={{ ...btn, background: K.soft, color: K.ink, padding: '0 15px' }}>
              <Plus size={17} />
            </button>
          </div>
          {lines.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
              {lines.map((l, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 99, background: K.soft, border: `1px solid ${K.line}`, fontSize: 13, fontWeight: 700, color: K.ink }}>
                  {l}
                  <button onClick={() => onChange(lines.filter((_, n) => n !== i))} aria-label="حيّد"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: K.ink3, display: 'flex' }}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <input value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}
          placeholder={ask.hint} inputMode={ask.kind === 'money' ? 'decimal' : 'text'}
          style={field} />
      )}
    </Card>
  );
}

/**
 * **ربطُ كلمةٍ مجهولةٍ بمفهوم — بالعربيّة، لا بمُعرِّفٍ لاتينيّ.**
 *
 *   كان الحقلُ يطلب `car_wash` مكتوبةً بيد الزائر. وذاك يفترض أنّه يحفظ
 *   مئتَي مُعرِّفٍ إنجليزيّ، وهو **واقفٌ في محلٍّ وصاحبُه ينتظر**. فالقناةُ
 *   التي بُنيت ليتعلّم منها التطبيقُ تصير قناةً لا يمرّ فيها شيء.
 *
 *   فالبحثُ هنا بالعربيّة على أسماء المفاهيم، والاقتراحاتُ الأولى **من جملة
 *   التاجر نفسِها** — لأنّ الكلمةَ المجهولةَ في الغالب مرادفةٌ لِما قاله
 *   للتوّ: «برييون» بجانب «صباغة»، و«دريساج» بجانب «تربية الكلاب».
 *
 *   والقانونُ الثالث محفوظ: هذا **اقتراحٌ** يذهب إلى `learning_unknowns`،
 *   يُراجَع في «عقل AMANZINE» — لا كتابةَ في المعرفة بلا إنسان.
 */
function WordLink({ term, linked, suggest, onLink }: {
  term: string;
  linked?: string;
  /** مفاهيمُ قُرئت من جملته — أقربُ ما يكون للكلمة المجهولة. */
  suggest: string[];
  onLink: (conceptId: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const name = (id: string) => (CONCEPTS as any[]).find(x => x.id === id)?.concept?.ar || id;

  const hits = useMemo(() => {
    const t = q.trim();
    if (t.length < 2) return suggest.slice(0, 4);
    const n = normLoose(t);
    return (CONCEPTS as any[])
      .filter(c => normLoose([c.concept?.ar, c.concept?.darija].filter(Boolean).join(' ')).includes(n))
      .slice(0, 6).map(c => c.id);
  }, [q, suggest]);

  if (linked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, fontWeight: 900, color: K.ink }}>{term}</span>
        <span style={{ color: K.ink3 }}>←</span>
        <Chip tone="green">{name(linked)}</Chip>
        <button onClick={() => onLink(null)} style={linkBtn}>بدّل</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${K.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 900, color: K.ink, minWidth: 70 }}>{term}</span>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="قلّب بالعربيّة… مثلاً: صباغة"
          style={{ ...field, flex: 1, fontSize: 13.5, padding: '9px 12px' }} />
      </div>
      {hits.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
          {hits.map(id => (
            <button key={id} onClick={() => onLink(id)}
              style={{ ...bigChoice, padding: '7px 13px', fontSize: 13, borderRadius: 99 }}>
              {name(id)}
            </button>
          ))}
        </div>
      ) : (
        // ولا يُترَك بلا مخرج: مَن لم يجد يتركها، وتصل الكلمةُ خامًا للمراجعة.
        <div style={{ marginTop: 7, fontSize: 12, color: K.ink3, fontWeight: 700 }}>
          ما لقيناش — خلّيها خاوية وغادي نراجعوها احنا.
        </div>
      )}
    </div>
  );
}

/**
 * **كلماتٌ لا يعرفها التطبيق** — وهي أثمنُ ما تحمله الزيارة.
 *
 *   تُقرأ من جملة التاجر: ما لم يُطابق مفهومًا ولا مدينةً ولا كلمةً شائعة.
 *   وحدُّها ضيّقٌ عمدًا (٤ أحرفٍ فأكثر، عربيّةٌ خالصة) — قائمةٌ طويلةٌ من
 *   الضجيج تجعل الزائرَ يتجاهلها كلَّها، فتضيع الكلمةُ الحقيقيّةُ معها.
 */
function pickUnknown(q: string): string[] {
  const STOP = new Set(['عندي', 'كندير', 'كنبيع', 'كنخدم', 'ديال', 'ديالي', 'فالحي', 'وكذلك', 'كاين', 'هنا', 'بزاف', 'شوية', 'كنغسل', 'كنصلح', 'محل', 'حانوت']);
  const words = q.split(/[\s،.,؛:!؟"'()]+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (w.length < 4 || STOP.has(w) || !/^[؀-ۿ]+$/.test(w)) continue;
    if ((understand(w) as any).service) continue;   // معروفٌ سلفًا
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

const field: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${K.line}`,
  background: 'rgba(255,255,255,.04)', color: K.ink, fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
};
const btn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '14px 20px', borderRadius: 14, border: 'none', fontSize: 15.5, fontWeight: 900,
  fontFamily: 'inherit', cursor: 'pointer',
};
const bigChoice: React.CSSProperties = {
  padding: '13px 18px', borderRadius: 13, border: `1px solid ${K.line}`, background: 'rgba(255,255,255,.05)',
  color: K.ink, fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
};
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, color: K.ink3, fontSize: 12,
  fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline',
};
