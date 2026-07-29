import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { understand, stanceOf } from '../../../lib/akg/kb';
import { parseNeed } from '../../../lib/needEngine';
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

  const go = (q?: string) => {
    const need = (q ?? text).trim();
    if (!need) { inputRef.current?.focus(); return; }
    // نحمل الحاجة معنا — لا يُعاد شرحُها في الصفحة التالية.
    try { sessionStorage.setItem('amanzine_need_seed', need); } catch { /* noop */ }
    const u: any = understand(need);
    const city = u.city ? `&city=${encodeURIComponent(u.city)}` : '';
    navigate(`/market?q=${encodeURIComponent(need)}${city}`);
  };

  return (
    <section style={{ minHeight: 'calc(100dvh - 64px)',   /* 64 = ارتفاع الترويسة: الشعار جزءٌ من الشاشة الأولى، وما عداه تحتها */ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 22, position: 'relative' }}>
      <style>{`
        @keyframes nfIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes nfEx { 0%{opacity:0;transform:translateY(4px)} 12%,88%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-4px)} }
        @keyframes nfPulse { 0%,80%,100%{opacity:.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
        .nfFact { animation: nfIn .28s cubic-bezier(.16,1,.3,1) both; }
        .nfDot { width:6px; height:6px; border-radius:50%; background:currentColor; display:inline-block; animation: nfPulse 1s ease-in-out infinite; }
      `}</style>

      {/* الشعار + جملةٌ واحدة. لا أكثر. */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'clamp(1.9rem,7vw,3rem)', fontWeight: 900, letterSpacing: '-.02em', color: C.ink, lineHeight: 1.1 }}>
          AMANZINE
        </div>
        <div style={{ marginTop: 10, fontSize: 'clamp(1rem,3.4vw,1.35rem)', fontWeight: 700, color: C.ink2 }}>
          قول غير أش خاصّك.
        </div>
      </div>

      {/* الخانة — بطلةُ الصفحة */}
      <div style={{ width: '100%', maxWidth: 620 }}>
        <form onSubmit={e => { e.preventDefault(); go(); }}>
          <input
            ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            placeholder={ph} autoFocus aria-label="اكتب حاجتك"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '20px 22px', borderRadius: 18,
              border: `1.5px solid ${facts.length ? C.orange : C.border}`, background: C.surface,
              color: C.ink, fontSize: 'clamp(15px,4vw,18px)', fontWeight: 650, fontFamily: 'inherit',
              outline: 'none', direction: 'rtl', boxShadow: facts.length ? C.shadowH : C.shadow,
              transition: 'border-color .2s ease, box-shadow .3s ease',
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

        {/* «عندي مشكل» وحدها ⇒ مداخلُ بنقرة بدل «ما فهمناش» */}
        {chips.length > 0 && (
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
        {text.trim().length >= 2 && (
          <button onClick={() => go()} className="nfFact"
            style={{ width: '100%', marginTop: 14, padding: '15px 20px', borderRadius: 15, border: 'none', background: C.orange, color: '#fff', fontSize: 15.5, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', boxShadow: C.shadow }}>
            متابعة
          </button>
        )}
      </div>
    </section>
  );
}
