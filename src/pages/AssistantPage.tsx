import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Sparkles, Send, ArrowLeft, Camera } from 'lucide-react';
import { parseNeed, type NeedResult, type NeedOption } from '../lib/needEngine';
import { understandHybrid } from '../lib/understanding';
import { resolveConcept, conceptGraph, type ConceptNode } from '../lib/akg/kb';
import { buildContext } from '../lib/core/context';
import { playGate } from '../lib/gateTransition';
import type { Page } from '../types';

// ============================================================
// المساعد الذكيّ — نسخة محادثة من «شنو محتاج اليوم؟». يفهم النيّة ويقترح الوجهة.
// نفس محرّك النيّة (parseNeed) — لا عقل ثانٍ. طابع بصريّ: زجاج داكن + توهّج أخضر.
// ============================================================

interface Msg { who: 'user' | 'ai'; text: string; result?: NeedResult; node?: ConceptNode | null; }

const GREET = 'السلام 👋 أنا مساعد أمانزين. قول ليا شنو محتاج — نجّار، بيتزا، شقة فالرباط، بغيت نبيع… ونوجّهك.';
const SUGGEST = ['بغيت سبّاك مستعجل', 'فين نلقى طبيب أسنان', 'بغيت نبيع تلفون', 'شقة للكراء فالرباط'];

// ضغطُ صورةٍ إلى 512px كحدٍّ أقصى (توفير تكلفة الرؤية ~٨٠٪) → data URL (jpeg 0.7).
function shrinkImage(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); if (!cx) return reject(new Error('no ctx'));
      cx.drawImage(img, 0, 0, w, h);
      resolve(cv.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    const fr = new FileReader();
    fr.onload = () => { img.src = String(fr.result); };
    fr.onerror = reject; fr.readAsDataURL(file);
  });
}

export default function AssistantPage() {
  const store = useStore();
  const { setPage, user } = store;
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'ai', text: GREET }]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // 📷 صوّر المشكلة — يضغط الصورة ويرسلها للفهم (Vision عبر /api/ai/understand).
  const sendImage = async (file: File) => {
    let image: string; try { image = await shrinkImage(file); } catch { return; }
    const uctx = buildContext(store as any, { authed: !!user });
    setMsgs(m => [...m, { who: 'user', text: '📷 صورة المشكلة' }, { who: 'ai', text: 'كنتفرّج فالصورة… 🔎' }]);
    try {
      const u = await understandHybrid('', { image, city: uctx.place.city || undefined });
      const svc = u.profession || u.problem;
      if (u.source === 'llm' && svc) {
        const node = conceptGraph(svc) || null;
        const res: NeedResult = { intent: 'find_pro', label: svc, color: 'var(--info,#3B82F6)', tags: [], url: '/market', next: '' };
        setMsgs(m => [...m, { who: 'ai', text: `أها 👍 باين ${svc}${u.city ? ` ف${u.city}` : ''}. نوصّلك بالأقرب.`, result: res, node }]);
      } else {
        setMsgs(m => [...m, { who: 'ai', text: 'ما بانش ليّ مزيان فالصورة — وصّف ليّ المشكل بكلمة وحدة؟' }]);
      }
    } catch {
      setMsgs(m => [...m, { who: 'ai', text: 'تعذّر تحليل الصورة دابا — جرّب تكتب المشكل.' }]);
    }
  };

  const send = (q: string) => {
    const query = q.trim(); if (!query) return;
    const uctx = buildContext(store as any, { authed: !!user });
    const r = parseNeed(query, { hour: uctx.time.hour, city: uctx.place.city });
    // لا «ما فهمناش» أبدًا: دائمًا افتتاحٌ + الخطوة التالية (حتى عند unknown صار حوارًا).
    const reply = (r.open ? r.open + ' ' : '') + r.next;
    // عُقدة الرسم: إن عُرف المفهوم، نرفق أسئلته التوضيحيّة وخدماته المرتبطة.
    const svc = resolveConcept(query)?.id;
    const node = svc ? conceptGraph(svc) : null;
    setMsgs(m => [...m, { who: 'user', text: query }, { who: 'ai', text: reply, result: r, node }]);
    setText('');

    // آخر طبقة (AI): إن عجزت القواعد (unknown) نستدعي الفهم الهجين — لا يوقف الحوار،
    // يحسّنه. بلا مفتاحٍ على الخادم يسقط للقواعد بلا أثرٍ سلبيّ (source='rules').
    if (r.intent === 'unknown') {
      understandHybrid(query, { city: uctx.place.city || undefined })
        .then(u => {
          if (u.source !== 'llm') return;
          const svc = u.profession || u.problem;
          if (!svc) return;
          const res: NeedResult = {
            intent: 'find_pro', label: svc, color: 'var(--info,#3B82F6)', tags: [],
            url: '/market', next: '',
          };
          const line = `أها 👍 فهمت — باين ${svc}${u.city ? ` ف${u.city}` : ''}. نوصّلك بالأقرب ليك.`;
          setMsgs(m => [...m, { who: 'ai', text: line, result: res }]);
        })
        .catch(() => { /* شبكة/بلا مفتاح ⇒ نُبقي ردّ القواعد */ });
    }
  };

  const goTo = (r: NeedResult) => {
    if (r.page) { const p = r.page as Page; playGate(() => setPage(p)); return; }
    const url = r.url || '/market';
    playGate(() => { try { window.location.assign(url); } catch { /* noop */ } });
  };

  // نقر على خيارٍ في سؤالٍ موجّه → يقود لوجهته (صفحة أو رابط).
  const goToOption = (opt: NeedOption) => {
    if (opt.page) { const p = opt.page as Page; playGate(() => setPage(p)); return; }
    const url = opt.url || '/market';
    playGate(() => { try { window.location.assign(url); } catch { /* noop */ } });
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
              <button onClick={() => goTo(m.result!)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 12, border: 'none', background: 'var(--amz-gold,#D4A017)', color: '#1a1300', fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>
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
                      <button key={rel.id} onClick={() => send(rel.name)} style={{ padding: '6px 11px', borderRadius: 999, border: `1px solid color-mix(in srgb, ${green} 35%, transparent)`, background: 'transparent', color: 'var(--ink2)', fontSize: 12, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>
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
            <button key={s} onClick={() => send(s)} style={{ padding: '8px 13px', borderRadius: 99, border: `1px solid color-mix(in srgb, ${green} 40%, transparent)`, background: 'transparent', color: 'var(--ink2)', fontSize: 12.5, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>{s}</button>
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
