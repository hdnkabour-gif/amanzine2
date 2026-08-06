import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { understand, stanceOf } from '../../../lib/akg/kb';
import { parseNeed, signalsFrom, clarificationStep } from '../../../lib/needEngine';
import { clarify, applyAnswer, type Signals } from '../../../lib/clarify';
import { C, apiBase } from '../theme';

// ============================================================
// NeedFirst — الشاشة الأولى. ليست قسمًا تسويقيًّا بل أوّلَ حوارٍ بين
//   الإنسان والعقل: شعار · جملة · خانة · مرآةٌ حيّة · «متابعة».
//   المبدأ: أثبت أنّك تفهم قبل أن تشرح نفسك. لا أسعار ولا FAQ ولا بطاقات
//   في أوّل شاشة — كلّها تصرف الانتباه عن الشيء الوحيد المطلوب: أن يكتب.
// ============================================================

// نداءٌ يتغيّر بالوقت — التطبيق يبدو حيًّا لا قالبًا ثابتًا.
function livePlaceholder(d = new Date()): string {
  const h = d.getHours();
  if (d.getDay() === 5 && h >= 10 && h < 15) return 'الجمعة… كتقلّب على شي خدمة اليوم؟';
  if (h < 6) return 'ساهر؟ شنو اللي مقلقك — نلقاو ليك حلّ';
  if (h < 11) return 'صباح الخير — شنو خاصك اليوم؟';
  if (h < 16) return 'شنو خاصك دابا؟ كتب بلغتك';
  if (h < 21) return 'مسا الخير — واش كاين شي حاجة خاصّك؟';
  return 'باقي محتاج شي حاجة قبل ما ينعس النهار؟';
}

const EXAMPLES = [
  'بغيت سبّاك اليوم', 'عندي محل ملابس', 'كنقلّب على شقة فالرباط',
  'أنا كهربائي', 'بغيت نبيع طوموبيلتي', 'عندي مشكل فالثلاجة',
  'شكون كيصلّح الحواسيب', 'بغيت واحد يصبغ ليا الدار',
];

// حقائقُ المرآة: تظهر واحدةً واحدة كلّما كتب المستخدم أكثر.
//   `label` للاختبار والمنطق · `say` هو ما يقرؤه الإنسان. المرآة تتكلّم
//   بالدارجة لا بمصطلحاتٍ داخليّة: «كتقلّب على سبّاك» لا «الاتّجاه: طلب».
export interface Fact { icon: string; label: string; value: string; say: string; }

export function readFacts(text: string): Fact[] {
  const q = text.trim();
  if (q.length < 2) return [];
  const u: any = understand(q);
  const r: any = parseNeed(q, {});
  const st = stanceOf(q);
  const out: Fact[] = [];

  // تسمياتٌ عامّة لا تُعلِم المستخدم بشيء («فهمت أنّك… طلب»). عرضُها يوهم
  // بفهمٍ لم يقع، فتُحجَب حتّى يتحدّد المجال فعلًا.
  const VAGUE = ['طلب', 'عرض', 'مساعدة', 'نكمّلو', 'اكتشاف', 'حِرفي', 'تعريف'];
  const raw = u.profession?.label || u.problem?.name || (r.intent !== 'unknown' ? r.label : '');
  const what = raw && !VAGUE.includes(raw) ? raw : '';

  // سطرٌ واحد للاتّجاه والحاجة معًا. فصلُهما كان يكرّر الكلمة نفسها مرّتين
  // («كتقلّب على سبّاك» ثمّ «سبّاك») — تكرارٌ يُضعف الثقة لا يزيدها.
  if (what) {
    out.push({
      icon: st === 'offer' ? '🧰' : '🔎', label: 'الحاجة', value: what,
      say: st === 'offer' ? `نتا ${what} وباغي تعلن`
        : st === 'seek' ? `كتقلّب على ${what}`
          : `الموضوع: ${what}`,
    });
  } else if (st !== 'unknown') {
    out.push({
      icon: st === 'offer' ? '🧰' : '🔎', label: 'الاتّجاه', value: st === 'offer' ? 'كتعرض' : 'كتقلّب',
      say: st === 'offer' ? 'باين بلّي كتعرض شي حاجة' : 'باين بلّي كتقلّب على شي حاجة',
    });
  }
  if (u.city) out.push({ icon: '📍', label: 'المدينة', value: u.city, say: `ف${u.city}` });
  if (u.context?.urgent) out.push({ icon: '⚡', label: 'الوقت', value: 'مستعجل', say: 'وخاصّك دابا' });

  // الميزانية تُقرأ من الجملة مباشرةً — «ب 500 درهم».
  const bud = q.match(/(\d[\d.,]*)\s*(درهم|dh|dhs)/i);
  if (bud) out.push({ icon: '💰', label: 'الميزانية', value: `${bud[1]} درهم`, say: `فحدود ${bud[1]} درهم` });
  else if (/رخيص|بلا غلا|شي حاجة رخيصة/.test(q)) out.push({ icon: '💰', label: 'الميزانية', value: 'محدودة', say: 'وبثمنٍ معقول' });

  return out;
}

// نسبةُ الفهم — تُحسَب ممّا عرفناه فعلًا لا من ثقة التوجيه.
// ثقةُ المحرّك ثابتةٌ لكلّ نيّة (سبّاك = ٦٠٪ سواءٌ ذكر المدينة أم لا)، فحلقةٌ
// مبنيّةٌ عليها لا تتحرّك — ورقمٌ لا يتحرّك مع وضوح الجملة رقمٌ كاذب.
// هنا: أربعة أبعاد (الحاجة · الاتّجاه · المكان · الوقت/الميزانية) بأوزانها.
export function understandingScore(text: string): number {
  const f = readFacts(text);
  if (!f.length) return 0;
  const has = (l: string) => f.some(x => x.label === l);
  let s = 20;                                  // كتب شيئًا مفهومًا أصلًا
  if (has('الحاجة')) s += 45;                  // الأهمّ: ماذا يريد
  else if (has('الاتّجاه')) s += 12;           // عرف الاتّجاه دون المجال
  if (has('المدينة')) s += 20;
  if (has('الوقت')) s += 8;
  if (has('الميزانية')) s += 7;
  return Math.min(100, s);
}

export default function NeedFirst() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [exIdx, setExIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ph = useMemo(() => livePlaceholder(), []);

  // أمثلةٌ حيّة: من عمليّات البحث الحقيقيّة إن وُجدت (بعد حرّاس الخصوصيّة
  // على الخادم)، وإلّا القائمةُ الثابتة. في بيتا يومها الأوّل تكون القاعدة
  // فارغةً — فالثابتة ليست زينةً بل الاحتياطُ الذي يمنع صفحةً بلا حياة.
  const [live, setLive] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/needs/trending`)
      .then(r => r.json())
      .then(d => { if (alive && Array.isArray(d.terms) && d.terms.length >= 3) setLive(d.terms); })
      .catch(() => { /* الصفحة تعمل بلا خادم */ });
    return () => { alive = false; };
  }, []);
  const examples = live && live.length >= 3 ? live : EXAMPLES;

  // تتبدّل بهدوء — تعلّم المستخدمَ كيف يكلّم النظام بلا شرح.
  useEffect(() => {
    if (text) return;                       // تتوقّف فور أن يبدأ الكتابة
    const t = setInterval(() => setExIdx(i => (i + 1) % examples.length), 3200);
    return () => clearInterval(t);
  }, [text, examples.length]);

  const facts = useMemo(() => readFacts(text), [text]);
  const result: any = useMemo(() => (text.trim().length >= 2 ? parseNeed(text, {}) : null), [text]);
  // حلقةُ الثقة: تُعلّم المستخدم كيف يكلّم النظام. ترتفع كلّما وضّح أكثر،
  // فيتعلّم وحده أنّ ذكر المدينة والاستعجال يُحسّن النتيجة.
  const conf = useMemo(() => understandingScore(text), [text]);

  // «يفكّر»: العقل يقرأ لحظيًّا، لكن ظهورَ الحقائق بلا مقدّمةٍ يبدو مفاجئًا.
  // ومضةٌ قصيرة عند كلّ تغييرٍ تجعل الصفحة تبدو مُصغيةً لا قافزة.
  const [thinking, setThinking] = useState(false);
  useEffect(() => {
    if (!text.trim()) { setThinking(false); return; }
    setThinking(true);
    const t = setTimeout(() => setThinking(false), 260);
    return () => clearTimeout(t);
  }, [text]);
  // «عندي مشكل» بلا تفصيل: لا نقول «ما فهمناش» — نعرض مداخلَ بنقرة.
  // تظهر ما دام المجال مجهولًا — الاتّجاه وحده ليس فهمًا يكفي للمضيّ.
  const knowsWhat = facts.some(f => f.label === 'الحاجة');
  const chips: { label: string; q: string }[] = useMemo(() => {
    if (!result || knowsWhat) return [];
    if (!/مشكل|مشكلة|عطل|خربان|ما كيخدمش|ما بقاتش/.test(text)) return [];
    return [
      { label: '🏠 فالدار', q: `${text} فالدار` },
      { label: '🚗 فالطوموبيل', q: `${text} فالطوموبيل` },
      { label: '💻 فالحاسوب', q: `${text} فالحاسوب` },
      { label: '📱 فالتيليفون', q: `${text} فالتيليفون` },
    ];
  }, [text, result, knowsWhat]);

  // «الصفحةُ تُصغي»: عند التركيز تتقدّم الخانةُ نحو المستخدم ويتراجع ما حولها.
  // ليس زينةً — هو إعلانٌ بصريٌّ بأنّ الدورَ صار له، فالسطرُ الفارغُ الصامت هو
  // ما جعل الصفحةَ لا تدعو أحدًا للكتابة.
  const [listening, setListening] = useState(false);
  const engaged = listening || text.trim().length > 0;

  // ── يفهم · يسأل · ثمّ يأخذ ─────────────────────────────────
  //   كانت للصفحة وجهتان لا ثالثَ لهما: النشرُ لمن يعرض، و**السوقُ لكلّ من
  //   عداه**. فمَن كتب «عندي مشكل» يُرمى في سوقٍ لا يعرف ما يبحث فيه، ومَن
  //   لم يُفهَم أصلًا يُرمى فيه كذلك. الفهمُ الذي لا يغيّر الوجهةَ ليس فهمًا،
  //   والسوقُ الذي يستقبل الجميعَ ليس وجهةً بل مكبًّا.
  //
  //   المحرّكُ نفسُه الذي يعمل داخل التطبيق (`clarify`) يقرّر هنا أيضًا —
  //   مصدرٌ واحدٌ للقرار في الصفحتين: يقينٌ عالٍ ⇒ نمضي · ناقصٌ ⇒ **نسأل**.
  //   سؤالٌ واحدٌ بشكلٍ واحد، مهما كان مصدرُه: قد يأتي من المحرّك نفسِه
  //   (سؤالٌ خاصٌّ بالمجال: «واش كتقلّب على سبّاك، ولا نتا سبّاك؟») أو من
  //   كتالوج الاستيضاح العامّ. **الأخصُّ يسبق**: تجاهلُ سؤالِ المحرّك وطرحُ
  //   سؤالٍ عامٍّ مكانَه تراجعٌ في الفهم لا تقدّم.
  type Ask = { id?: string; question: string; options: { id: string; label: string; page?: string; url?: string }[] };
  const [ask, setAsk] = useState<Ask | null>(null);
  const [signals, setSignals] = useState<Signals>({});

  const routeTo = (need: string, page?: string, url?: string) => {
    try { sessionStorage.setItem('amanzine_need_seed', need); } catch { /* noop */ }
    const u: any = understand(need);
    // ── الحاجةُ تُحمَل كاملةً إلى صفحة الدخول ────────────────────
    //   `AuthPage` تعرض «فهمت أنّك بغيتي…» من `amanzine_need`، وكان الكاتبُ
    //   الوحيدُ لهذا المفتاح قسمًا **ميّتًا** (`Hero.tsx` لا يستورده شيء).
    //   فبقيت البطاقةُ لا تظهر لأحدٍ منذ أن صارت `NeedFirst` أوّلَ شاشة:
    //   قارئٌ حيٌّ وكاتبٌ ميّت، والحارسُ يراهما زوجًا سليمًا.
    //   والفارقُ للتاجر: نموذجُ تسجيلٍ مقطوعٌ عمّا كتبه قبل ثانية، بدل حوارٍ
    //   يُكمل نفسَه — وهي أوّلُ خمس دقائقَ يُحكَم فيها على التطبيق كلِّه.
    try {
      sessionStorage.setItem('amanzine_need', JSON.stringify({
        text: need,
        service: u?.profession?.label || u?.problem?.name || u?.service || '',
        city: u?.city || '',
        at: Date.now(),   // تقرؤه `AuthPage` وتُسقط ما مضى عليه نصفُ ساعة
      }));
    } catch { /* noop */ }
    const city = u.city ? `&city=${encodeURIComponent(u.city)}` : '';
    if (page) {
      try { sessionStorage.setItem('amanzine_need_stance', page === 'publish' ? 'offer' : 'seek'); } catch { /* noop */ }
      navigate(`/auth?next=${page}&q=${encodeURIComponent(need)}`);
      return;
    }
    const target = url || '/market';
    const sep = target.includes('?') ? '&' : '?';
    navigate(`${target}${sep}q=${encodeURIComponent(need)}${city}`);
  };

  const go = (q?: string) => {
    const need = (q ?? text).trim();
    if (!need) { inputRef.current?.focus(); return; }
    const r: any = parseNeed(need, {});
    const sig = signalsFrom(r);

    // ① سؤالُ المحرّك إن وُجد — أخصُّ وأدقُّ من أيّ سؤالٍ عامّ.
    const own = r.steps?.[0];
    if (own?.options?.length) {
      setSignals(sig);
      setAsk({ id: own.clarifyId, question: own.q, options: own.options.map((o: any, i: number) => ({
        id: o.id || `opt${i}`, label: o.label, page: o.page, url: o.url,
      })) });
      return;
    }

    // ② وإلّا: ينقص شيء؟ نسأل هنا، ولا نُخرجه إلى مكانٍ لا يريده.
    const d = clarify(sig);
    if (d.mode === 'clarify' && d.clarification) {
      setSignals(sig);
      const step = clarificationStep(d.clarification);
      setAsk({ id: d.clarification.id, question: step.q, options: step.options.map(o => ({
        id: o.id!, label: o.label, page: o.page, url: o.url,
      })) });
      return;
    }

    const u: any = understand(need);
    const stance = (() => { try { return stanceOf(need); } catch { return null; } })();
    const wantsToOffer = stance === 'offer' || /^(SELF|SELL)$/.test(String(u.intent || ''));
    try { sessionStorage.setItem('amanzine_need_stance', wantsToOffer ? 'offer' : 'seek'); } catch { /* noop */ }
    if (wantsToOffer) { routeTo(need, 'publish'); return; }
    routeTo(need, undefined, r.url || '/market');
  };

  /** جوابُ المستخدم يُدمَج، ثمّ يُسأل المحرّكُ ثانيةً — لا قفزَ أعمى. */
  const answerAsk = (optionId: string) => {
    if (!ask) return;
    const need = text.trim();
    const opt = ask.options.find(o => o.id === optionId);
    // الجوابُ يُدمَج في الإشارات (يُقاس ويُبنى عليه)، ثمّ تُتَّبع وجهتُه.
    if (ask.id) setSignals(applyAnswer(signals, ask.id as any, optionId));
    setAsk(null);
    routeTo(need, opt?.page, opt?.url);
  };

  return (
    <section style={{ minHeight: 'calc(100dvh - 64px)',   /* 64 = ارتفاع الترويسة: الشعار جزءٌ من الشاشة الأولى، وما عداه تحتها */ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 22, position: 'relative' }}>
      <style>{`
        @keyframes nfIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes nfEx { 0%{opacity:0;transform:translateY(4px)} 12%,88%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-4px)} }
        @keyframes nfPulse { 0%,80%,100%{opacity:.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
        .nfFact { animation: nfIn .28s cubic-bezier(.16,1,.3,1) both; }
        .nfDot { width:6px; height:6px; border-radius:50%; background:currentColor; display:inline-block; animation: nfPulse 1s ease-in-out infinite; }
        /* اهتزازةٌ واحدةٌ عند التركيز — «سمعتك». تُلغى لمن يطلب تقليلَ الحركة. */
        @keyframes nfWake { 0%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(2px)} 100%{transform:translateX(0)} }
        .nfWake { animation: nfWake .42s cubic-bezier(.36,.07,.19,.97) both; }
        @media (prefers-reduced-motion: reduce) { .nfWake { animation: none; } }
      `}</style>

      {/* الشعارُ ثمّ الجملة. يتراجعان حين يبدأ الكلام — لا يختفيان: الاختفاءُ
          يقفز بما تحته، والتراجعُ يبدو إصغاءً. */}
      <div style={{ textAlign: 'center',
        transform: engaged ? 'scale(.72) translateY(-6px)' : 'scale(1)',
        opacity: engaged ? .55 : 1,
        transition: 'transform .5s cubic-bezier(.16,1,.3,1), opacity .4s ease',
        transformOrigin: 'center bottom' }}>
        <img src="/brand/amanzine-logo.png" alt="AMANZINE"
          width={96} height={96}
          style={{ width: 'clamp(64px,17vw,96px)', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ marginTop: 12, fontSize: 'clamp(1.05rem,3.6vw,1.4rem)', fontWeight: 800, color: C.ink2, letterSpacing: '-.01em' }}>
          كلّ كلمة عندها طريق
        </div>
      </div>

      {/* الخانة — بطلةُ الصفحة. تكبر وتتقدّم عند التركيز، وتهتزّ اهتزازةً
          واحدةً قصيرة: إشارةُ «سمعتك» لا حركةٌ زائدة. */}
      <div style={{ width: '100%', maxWidth: 620,
        transform: engaged ? 'scale(1.035)' : 'scale(1)',
        transition: 'transform .45s cubic-bezier(.16,1,.3,1)' }}>
        <form onSubmit={e => { e.preventDefault(); go(); }}>
          <input
            ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onFocus={() => setListening(true)} onBlur={() => setListening(false)}
            className={listening ? 'nfWake' : undefined}
            placeholder={ph} autoFocus aria-label="اكتب حاجتك"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: engaged ? '24px 24px' : '20px 22px', borderRadius: 18,
              border: `1.5px solid ${facts.length ? C.orange : C.border}`, background: C.surface,
              color: C.ink, fontSize: 'clamp(15px,4vw,18px)', fontWeight: 650, fontFamily: 'inherit',
              outline: 'none', direction: 'rtl', boxShadow: facts.length ? C.shadowH : C.shadow,
              transition: 'border-color .2s ease, box-shadow .3s ease, padding .45s cubic-bezier(.16,1,.3,1)',
            }} />
        </form>

        {/* أمثلةٌ حيّة — تذوب تدريجيًّا حين يبدأ الكتابة، لا تُقطَع فجأةً.
            وتبقى في الشجرة حتّى ينتهي الذوبان فلا يقفز ما تحتها. */}
        <div style={{ marginTop: 13, textAlign: 'center', fontSize: 13.5, color: C.ink3, fontWeight: 600,
          opacity: text ? 0 : 1, maxHeight: text ? 0 : 26, overflow: 'hidden',
          transition: 'opacity .45s ease, max-height .45s ease' }}>
          <span key={exIdx} style={{ display: 'inline-block', animation: 'nfEx 3.2s ease-in-out both' }}>
            {live && <span style={{ marginInlineEnd: 5 }}>🔥</span>}
            <button type="button" onClick={() => setText(examples[exIdx])}
              style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }}>
              «{examples[exIdx]}»
            </button>
          </span>
        </div>

        {/* «كيتسنّت ليك» — ومضةٌ قصيرة قبل أن تظهر الحقائق */}
        {thinking && facts.length === 0 && text.trim().length >= 2 && (
          <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: C.ink3, fontSize: 13, fontWeight: 700 }}>
            <span className="nfDot" /><span className="nfDot" style={{ animationDelay: '.15s' }} /><span className="nfDot" style={{ animationDelay: '.3s' }} />
          </div>
        )}

        {/* المرآة الحيّة — تتكلّم بالدارجة لا بمصطلحاتٍ داخليّة */}
        {facts.length > 0 && (
          <div style={{ marginTop: 15, padding: '15px 17px', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.ink3 }}>فهمت هاكّا:</span>
              {/* حلقةُ الثقة — يتعلّم منها أنّ التوضيح يرفع الفهم */}
              <span title={`ثقة الفهم ${conf}%`} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'inline-block',
                  background: `conic-gradient(${conf >= 70 ? C.green : conf >= 45 ? C.purple : C.ink3} ${conf * 3.6}deg, ${C.alt} 0deg)`,
                  transition: 'background .35s ease',
                }} />
                <span style={{ fontSize: 11.5, fontWeight: 800, color: conf >= 70 ? C.green : C.ink3 }}>{conf}%</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {facts.map((f, i) => (
                <div key={f.label} className="nfFact" style={{ animationDelay: `${i * 55}ms`, display: 'flex', alignItems: 'baseline', gap: 9, fontSize: 14.5 }}>
                  <span style={{ fontSize: 15 }}>{f.icon}</span>
                  <span style={{ color: C.ink, fontWeight: 750 }}>{f.say}</span>
                </div>
              ))}
            </div>
            {conf < 45 && (
              <div style={{ marginTop: 10, fontSize: 12, color: C.ink3, lineHeight: 1.7 }}>
                زيد شويّة تفاصيل (المدينة… واش مستعجل) باش نفهمك مزيان.
              </div>
            )}
          </div>
        )}

        {/* ── السؤالُ قبل الوجهة ────────────────────────────────────
            حين ينقص ما يحسم، لا نُخرج الإنسانَ من الصفحة إلى السوق «لعلّه
            يجد». نسأله هنا سؤالًا واحدًا بهويّةٍ ثابتة، وجوابُه هو الذي
            يختار الوجهة. */}
        {ask && (
          <div style={{ marginTop: 15 }} className="nfFact">
            <div style={{ fontSize: 14, color: C.ink, fontWeight: 800, marginBottom: 10, textAlign: 'center' }}>
              {ask.question}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {ask.options.map(o => (
                <button key={o.id} type="button" onClick={() => answerAsk(o.id)}
                  style={{ padding: '10px 16px', borderRadius: 99, border: `1px solid ${C.border}`, background: C.surface, color: C.ink, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                  {o.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setAsk(null)}
              style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: C.ink3, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              نكمّل نكتب بدل الاختيار
            </button>
          </div>
        )}

        {/* «عندي مشكل» وحدها ⇒ مداخلُ بنقرة بدل «ما فهمناش» */}
        {!ask && chips.length > 0 && (
          <div style={{ marginTop: 13 }}>
            <div style={{ fontSize: 12.5, color: C.ink3, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>شنو المشكل بالضبط؟</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {chips.map(c => (
                <button key={c.label} type="button" onClick={() => setText(c.q)}
                  style={{ padding: '9px 14px', borderRadius: 99, border: `1px solid ${C.border}`, background: C.surface, color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* زرٌّ واحد — ولا يظهر قبل أن يكون له معنى */}
        {!ask && text.trim().length >= 2 && (
          <button onClick={() => go()} className="nfFact"
            style={{ width: '100%', marginTop: 14, padding: '15px 20px', borderRadius: 15, border: 'none', background: C.orange, color: '#fff', fontSize: 15.5, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: C.shadow }}>
            متابعة
          </button>
        )}
      </div>
    </section>
  );
}
