import { useState, useRef, useEffect } from 'react';
import { decideFor, targetOf } from '../lib/decide';
import { readState, writeState, clearState } from '../lib/clientState';
import { useStore } from '../store';
import { Sparkles, Send, ArrowLeft, Camera } from 'lucide-react';
import { type NeedResult, type NeedOption } from '../lib/needEngine';
import { understandHybrid } from '../lib/understanding';
import { resolveConcept, conceptGraph, stanceOf, type ConceptNode } from '../lib/akg/kb';
import { shrinkImage } from '../lib/imageFile';
import { expandQuery, toSearchParams } from '../lib/searchIntent';
import { buildContext } from '../lib/core/context';
import { playGate } from '../lib/gateTransition';
import { useNavigate } from 'react-router-dom';
import { receptionStart, receptionTurn, receptionUnderstood, receptionEnd, recordDecision } from '../lib/journey';
import { orchestrate, recordExperience } from '../lib/core/orchestrator';
import type { Via } from '../lib/experienceLog';
import type { Page } from '../types';

// ============================================================
// المساعد الذكيّ — نسخة محادثة من «شنو محتاج اليوم؟». يفهم النيّة ويقترح الوجهة.
// نفس محرّك النيّة (parseNeed) — لا عقل ثانٍ. طابع بصريّ: زجاج داكن + توهّج أخضر.
// ============================================================

/**
 * `raw` — **النصُّ الذي بُني عليه هذا الردّ.**
 *
 *   بلا هذا كان `goTo` يسقط إلى `r.page`/`r.url` كلَّما غاب النصُّ — أي في
 *   كلّ محادثةٍ مُستعادةٍ بعد تنقّلٍ أو تحديث، لأنّ `lastRef` يعيش في الذاكرة
 *   وحدَها. فتُلاحَق وجهةٌ **مخبوزةٌ سلفًا** بلا حكمٍ يسندها — وهي بعينها
 *   العائلةُ ⑤ التي أُغلقت في RC-P1، تعود من باب الاستعادة.
 *
 *   والرسالةُ تحمل نصَّها، فيُسأل المالكُ الواحدُ من جديدٍ متى نُقر عليها.
 */
interface Msg { who: 'user' | 'ai'; text: string; raw?: string; result?: NeedResult; node?: ConceptNode | null; }

const GREET = 'السلام 👋 أنا مساعد أمانزين. قول ليا شنو محتاج — نجّار، بيتزا، شقة فالرباط، بغيت نبيع… ونوجّهك.';
const SUGGEST = ['بغيت سبّاك مستعجل', 'فين نلقى طبيب أسنان', 'بغيت نبيع تلفون', 'شقة للكراء فالرباط'];

// يحمل الحاجة المفهومة إلى السوق حتى يُرتّبها محرّك البحث/الترتيب (/api/search) —
// وإلّا هبط المستخدم على سوقٍ عامّ وضاع الفهم.
//
//   وكان يُلحق `q` و`city` **وحدَهما**: لا مرادفاتٍ ولا فئةً ولا سقفَ ثمنٍ
//   ولا حالَ سلعة. فمن سأل المساعدَ عن «بلومبي» ساقه إلى سوقٍ يبحث عن
//   كلمةٍ لا يعرفها أحد. العقدُ الآن هو نفسُه في كلّ الأبواب.
function withNeed(url: string | undefined, q: string, city?: string, concept?: string): string {
  const u = url || '/market';
  if (!u.startsWith('/market')) return u;
  if (/[?&]q=/.test(u) || !q.trim()) return u;
  return u + (u.includes('?') ? '&' : '?') + toSearchParams(expandQuery(q, concept), city).toString();
}

export default function AssistantPage() {
  const store = useStore();
  const { setPage, user } = store;
  const navigate = useNavigate();
  // ── **وحوارُ المساعد يعيش ما دامت الرحلةُ حيّة** ────────────────
  //   نفسُ العطب الذي أُصلح في `LivingHome`، قائمًا هنا: حالةٌ محلّيّةٌ في
  //   المكوّن وحدَه، فكلُّ انتقالٍ إلى صفحةٍ ثمّ عودةٍ يمحو الحوارَ ويعود
  //   الإنسانُ إلى تحيّةٍ لا تذكر ما قاله قبل ثانية. والمساعدُ هو الشاشةُ
  //   التي **تُلاحِق** أكثرَ من غيرها، فالمحوُ فيها أشدُّ وقعًا.
  //   والعلاجُ نفسُه: سجلُّ حالة العميل بنطاق `journey` ومدّةٍ معلَنة.
  const [msgs, setMsgs] = useState<Msg[]>(
    () => readState<Msg[]>('amanzine_assistant') || [{ who: 'ai', text: GREET }]);
  useEffect(() => {
    const meaningful = msgs.length > 1 || msgs[0]?.who === 'user';
    if (meaningful) writeState('amanzine_assistant', msgs.slice(-40));
    else clearState('amanzine_assistant');
  }, [msgs]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // آخر طلبٍ مفهوم — نسجّل التجربة (Experience) لحظة ما ينقر المستخدم فعلًا على وجهة.
  const lastRef = useRef<{ raw: string; intent: string; journey: string; uctx: any } | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // حلقة التعلّم: المساعد قلبُ المنصّة — كلّ حوارٍ فيه يُغذّي نفس القياس الذي يغذّيه
  // «شنو محتاج» (استقبال + قرار + التقاط «ما لم نفهمه»). بلا هذا كان القلبُ أصمَّ عن التعلّم.
  useEffect(() => { receptionStart(); return () => { receptionEnd('idle'); }; }, []);

  // 📷 صوّر المشكلة — يضغط الصورة ويرسلها للفهم (Vision عبر /api/ai/understand).
  const sendImage = async (file: File) => {
    let image: string; try { image = await shrinkImage(file); } catch { return; }
    const uctx = buildContext(store as any, { authed: !!user });
    setMsgs(m => [...m, { who: 'user', text: '📷 صورة المشكلة' }, { who: 'ai', text: 'كنتفرّج فالصورة… 🔎' }]);
    try {
      const prior = msgs.filter(m => m.who === 'user').map(m => m.text);
      const u = await understandHybrid('', { image, city: uctx.place.city || undefined, recentMessages: prior });
      const svc = u.profession || u.problem;
      if (u.source === 'llm' && svc) {
        receptionUnderstood();  // الرؤية فهمت المشكل من صورة → حالةٌ مفهومة
        const node = conceptGraph(svc) || null;
        const res: NeedResult = { intent: 'find_pro', label: svc, color: 'var(--info,#3B82F6)', tags: [], url: withNeed('/market', node?.name || svc, u.city || uctx.place.city || undefined), next: '' };
        // ولا نصَّ كتبه الإنسانُ هنا — الصورةُ هي الطلب. فالنصُّ الذي يُبنى
        //   عليه الحكمُ هو ما قرأته الرؤية، وهو ما يُحمَل مع الرسالة.
        setMsgs(m => [...m, { who: 'ai', text: `أها 👍 باين ${svc}${u.city ? ` ف${u.city}` : ''}. نوصّلك بالأقرب.`, raw: node?.name || svc, result: res, node }]);
      } else {
        setMsgs(m => [...m, { who: 'ai', text: 'ما بانش ليّ مزيان فالصورة — وصّف ليّ المشكل بكلمة وحدة؟' }]);
      }
    } catch {
      setMsgs(m => [...m, { who: 'ai', text: 'تعذّر تحليل الصورة دابا — جرّب تكتب المشكل.' }]);
    }
  };

  const send = (q: string, source: 'text' | 'button' = 'text') => {
    const query = q.trim(); if (!query) return;
    const uctx = buildContext(store as any, { authed: !!user });
    // عقلٌ واحد: نمرّ عبر الـ Orchestrator (لا parseNeed مباشرةً) ليصل الطلب أيضًا إلى
    // تعلّم الخادم (searchAPI.query) — كان المساعد يتجاوزه فيضيع نصف التعلّم.
    const { result: r, journey: jrn } = orchestrate(query, uctx);
    // حلقة التعلّم: نُغذّي القياس بنفس منطق «شنو محتاج» — دورٌ، زمنُ فهم، قرار، والتقاطُ المجهول.
    receptionTurn(query, source);
    if (r.intent !== 'unknown') receptionUnderstood();
    recordDecision('chat', r.intent, source === 'button' ? 'chat_button' : 'chat_text', query);
    // لا «ما فهمناش» أبدًا: دائمًا افتتاحٌ + الخطوة التالية (حتى عند unknown صار حوارًا).
    const reply = (r.open ? r.open + ' ' : '') + r.next;
    // عُقدة الرسم: إن عُرف المفهوم، نرفق أسئلته التوضيحيّة وخدماته المرتبطة.
    const svc = resolveConcept(query)?.id;
    // الاتّجاه يختار الأسئلة: مَن قال «أنا حدّاد» لا يُسأل «شحال الميزانية؟».
    const node = svc ? conceptGraph(svc, stanceOf(query, svc)) : null;
    // احمل الحاجة إلى السوق (إلّا حين تكون الوجهة صفحةً داخليّة) — لا يضيع الفهم.
    // المفهومُ مقروءٌ للتوّ في `svc` — يُمرَّر ولا يُقرأ ثانيةً (القاعدةُ ㉒).
    const rr: NeedResult = (!r.page && r.url) ? { ...r, url: withNeed(r.url, query, uctx.place.city || undefined, svc) } : r;
    lastRef.current = { raw: query, intent: r.intent, journey: String(jrn), uctx };
    setMsgs(m => [...m, { who: 'user', text: query }, { who: 'ai', text: reply, raw: query, result: rr, node }]);
    setText('');

    // آخر طبقة (AI): إن عجزت القواعد (unknown) نستدعي الفهم الهجين — لا يوقف الحوار،
    // يحسّنه. بلا مفتاحٍ على الخادم يسقط للقواعد بلا أثرٍ سلبيّ (source='rules').
    if (r.intent === 'unknown') {
      // ذاكرة المحادثة: نمرّر ما سبق أن كتبه المستخدم في هذه الجلسة (لا الردود)
      // ليفهم الذكاء الجملة الناقصة في سياقها بدل معاملتها كسؤالٍ يتيم.
      const prior = msgs.filter(m => m.who === 'user').map(m => m.text);
      understandHybrid(query, { city: uctx.place.city || undefined, recentMessages: prior })
        .then(u => {
          if (u.source !== 'llm') return;
          const svc = u.profession || u.problem;
          if (!svc) return;
          receptionUnderstood();  // الطبقةُ الأخيرة (AI) أنقذت حالةً كانت مجهولة → صارت مفهومة
          const res: NeedResult = {
            intent: 'find_pro', label: svc, color: 'var(--info,#3B82F6)', tags: [],
            url: withNeed('/market', conceptGraph(svc)?.name || svc, u.city || uctx.place.city || undefined), next: '',
          };
          const line = `أها 👍 فهمت — باين ${svc}${u.city ? ` ف${u.city}` : ''}. نوصّلك بالأقرب ليك.`;
          // النصُّ الأصليُّ لا ما فهمه الذكاء: المالكُ الواحد يُسأل بما قاله
          //   الإنسانُ، ثمّ يُكمَّل الفراغُ بما قرأه الذكاء — لا العكس.
          setMsgs(m => [...m, { who: 'ai', text: line, raw: query, result: res }]);
        })
        .catch(() => { /* شبكة/بلا مفتاح ⇒ نُبقي ردّ القواعد */ });
    }
  };

  // التجربة تُسجَّل عند الفعل لا عند الفهم: هذه أقوى إشارةٍ للتعلّم (نيّة → وجهة فعليّة).
  const logExperience = (dest: string, via: Via = 'type') => {
    const L = lastRef.current; if (!L) return;
    try { recordExperience({ raw: L.raw, intent: L.intent, what: L.raw, dest, via, journey: L.journey, uctx: L.uctx }); }
    catch { /* التسجيل لا يعطّل التنقّل أبدًا */ }
  };

  // ── **المساعدُ يخضع لنفس الحَكَم** ─────────────────────────────
  //   قِيس فتبيّن أنّ هذا الملفَّ لا يستورد `abilityFor` ولا `decideExecution`
  //   ولا `decideInterface` **إطلاقًا**: أربعةُ مساراتٍ تُلاحق مباشرةً من
  //   `r.page`/`r.url`/`opt.page`/`opt.url`. فنفسُ الجملة التي تُسأل عنها في
  //   الشاشة الرئيسيّة تُنفَّذ هنا بلا سؤال، والعكس.
  //
  //   والآن: يُسأل المالكُ الواحد. وما لا وجهةَ له (`ask`/`soon`/`explain`/
  //   `refuse`) **لا يُلاحَق** — يُقال ما قاله الحَكَم ويبقى الإنسانُ مكانَه.
  const goTo = (r: NeedResult, raw?: string) => {
    const text = String(raw || (r as { object?: { raw?: string } })?.object?.raw || lastRef.current?.raw || '').trim();
    // ── **ولا وجهةَ بلا نصٍّ يُحكَم عليه** ──────────────────────────
    //   كان هنا سقوطٌ إلى `r.page`/`r.url` حين يغيب النصّ. وهو يبدو حارسًا
    //   لحالةٍ نادرة، وليس كذلك: `lastRef` يعيش في الذاكرة وحدَها، فكلُّ
    //   محادثةٍ مُستعادةٍ بعد تنقّلٍ أو تحديثٍ **تمرّ منه** — أي أنّ المسارَ
    //   القديمَ كان يعمل في أكثرِ الحالات لا أقلِّها.
    //   والرسائلُ صارت تحمل نصَّها (`Msg.raw`)، فالغيابُ الآن يعني أنّه لا
    //   طلبَ أصلًا — ولا تُخترَع وجهةٌ لطلبٍ غير موجود.
    if (!text) { receptionEnd('idle'); return; }
    const d = decideFor(text, { need: r });
    const t = targetOf(d, text);
    if (!t.page && !t.url) { receptionEnd('idle'); return; }   // حكمٌ بلا وجهة
    if (t.page) { const p = t.page as Page; logExperience(String(p)); playGate(() => setPage(p)); return; }
    logExperience(t.url!); receptionEnd('routed'); playGate(() => navigate(t.url!));
  };

  // نقر على خيارٍ في سؤالٍ موجّه → يقود لوجهته (صفحة أو رابط). التسمية = التنقيح
  // (مثلاً «أسنان») ⇒ نحملها كـ q إلى السوق ليُرتّبها البحث بدل سوقٍ عامّ.
  const goToOption = (opt: NeedOption) => {
    // خيارٌ اختاره الإنسانُ بيدِه: وجهتُه محترَمةٌ ولا تُخمَّن. لكن **إن لم
    //   يحمل وجهةً** فلا تُخترَع له واحدة — يُسأل الحَكَمُ بنصّ الخيار.
    if (opt.page) { const p = opt.page as Page; playGate(() => setPage(p)); return; }
    if (!opt.url) {
      const d = decideFor(opt.label);
      const t = targetOf(d, opt.label);
      if (!t.page && !t.url) { receptionEnd('idle'); return; }
      if (t.page) { const p = t.page as Page; playGate(() => setPage(p)); return; }
      playGate(() => navigate(t.url!)); return;
    }
    const uctx = buildContext(store as any, { authed: !!user });
    receptionTurn(opt.label, 'button');
    const url = withNeed(opt.url || '/market', opt.label, uctx.place.city || undefined);
    logExperience(url, 'guided');
    receptionEnd('routed');
    playGate(() => navigate(url));
  };

  const green = 'var(--amz-emerald,#0a8f6f)';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, minHeight: '70vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: `color-mix(in srgb, ${green} 25%, transparent)`, border: `1px solid ${green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px color-mix(in srgb, ${green} 45%, transparent)` }}>
          <Sparkles size={20} style={{ color: green }} />
        </div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: 'var(--ink1)' }}>المساعد الذكيّ</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>يفهم الدارجة · يوجّهك لحاجتك</div>
        </div>
      </div>

      {/* المحادثة */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 0' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.who === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: '11px 14px', borderRadius: 15, fontSize: 14, lineHeight: 1.6, fontWeight: m.who === 'user' ? 700 : 550,
              background: m.who === 'user' ? green : 'color-mix(in srgb, #fff 5%, transparent)',
              color: m.who === 'user' ? '#fff' : 'var(--ink1)',
              border: m.who === 'user' ? 'none' : '1px solid var(--border,rgba(255,255,255,.09))',
              backdropFilter: m.who === 'ai' ? 'blur(10px)' : undefined }}>
              {m.text}
            </div>
            {m.result && !m.result.steps && (m.result.url || m.result.page) && (
              <button onClick={() => goTo(m.result!, m.raw)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 12, border: 'none', background: 'var(--amz-gold,#D4A017)', color: '#1a1300', fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>
                يالله نمشيو <ArrowLeft size={15} />
              </button>
            )}
            {/* أسئلة موجّهة: خيارات قابلة للنقر — الحوار يقود بدل انتظار صياغةٍ مثاليّة */}
            {m.result?.steps?.map((st, si) => (
              <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 2 }}>
                {st.q && <div style={{ fontSize: 12.5, color: 'var(--ink3)', fontWeight: 800 }}>{st.q}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {st.options.map((opt, oi) => (
                    <button key={oi} onClick={() => goToOption(opt)} style={{ padding: '8px 13px', borderRadius: 11, border: `1px solid color-mix(in srgb, ${green} 40%, transparent)`, background: 'color-mix(in srgb, #fff 4%, transparent)', color: 'var(--ink1)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {/* عُقدة الرسم: أسئلةٌ مفيدةٌ للسؤال عنها + خدماتٌ مرتبطةٌ قابلةٌ للنقر */}
            {m.node && (m.node.questions.length > 0 || m.node.related.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                {m.node.questions.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.7 }}>
                    <span style={{ fontWeight: 800 }}>أسئلةٌ مفيدة:</span> {m.node.questions.slice(0, 3).join(' · ')}
                  </div>
                )}
                {m.node.related.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700 }}>ولا يهمّك:</span>
                    {m.node.related.slice(0, 4).map(rel => (
                      <button key={rel.id} onClick={() => send(rel.name, 'button')} style={{ padding: '6px 11px', borderRadius: 999, border: `1px solid color-mix(in srgb, ${green} 35%, transparent)`, background: 'transparent', color: 'var(--ink2)', fontSize: 12, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>
                        {rel.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* اقتراحات */}
      {msgs.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGEST.map(s => (
            <button key={s} onClick={() => send(s, 'button')} style={{ padding: '8px 13px', borderRadius: 99, border: `1px solid color-mix(in srgb, ${green} 40%, transparent)`, background: 'transparent', color: 'var(--ink2)', fontSize: 12.5, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      )}

      {/* المُدخل */}
      <form onSubmit={e => { e.preventDefault(); send(text); }} style={{ position: 'sticky', bottom: 8, display: 'flex', gap: 9, alignItems: 'center', padding: '10px 12px', borderRadius: 15, background: 'color-mix(in srgb, #fff 6%, var(--void,#07080D))', border: `1px solid color-mix(in srgb, ${green} 30%, transparent)`, backdropFilter: 'blur(12px)' }}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) sendImage(f); e.currentTarget.value = ''; }} />
        <button type="button" aria-label="صوّر المشكلة" onClick={() => fileRef.current?.click()} style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, border: `1px solid color-mix(in srgb, ${green} 35%, transparent)`, background: 'transparent', color: green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Camera size={17} />
        </button>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="كتب هنا… ولا صوّر 📷" autoComplete="off"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink1)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', direction: 'rtl' }} />
        <button type="submit" aria-label="إرسال" style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, border: 'none', background: green, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
