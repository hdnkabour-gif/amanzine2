import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Sparkles, Send, ArrowLeft } from 'lucide-react';
import { parseNeed, type NeedResult, type NeedOption } from '../lib/needEngine';
import { buildContext } from '../lib/core/context';
import { playGate } from '../lib/gateTransition';
import type { Page } from '../types';

// ============================================================
// المساعد الذكيّ — نسخة محادثة من «شنو محتاج اليوم؟». يفهم النيّة ويقترح الوجهة.
// نفس محرّك النيّة (parseNeed) — لا عقل ثانٍ. طابع بصريّ: زجاج داكن + توهّج أخضر.
// ============================================================

interface Msg { who: 'user' | 'ai'; text: string; result?: NeedResult; }

const GREET = 'السلام 👋 أنا مساعد أمانزين. قول ليا شنو محتاج — نجّار، بيتزا، شقة فالرباط، بغيت نبيع… ونوجّهك.';
const SUGGEST = ['بغيت سبّاك مستعجل', 'فين نلقى طبيب أسنان', 'بغيت نبيع تلفون', 'شقة للكراء فالرباط'];

export default function AssistantPage() {
  const store = useStore();
  const { setPage, user } = store;
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'ai', text: GREET }]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = (q: string) => {
    const query = q.trim(); if (!query) return;
    const uctx = buildContext(store as any, { authed: !!user });
    const r = parseNeed(query, { hour: uctx.time.hour, city: uctx.place.city });
    // لا «ما فهمناش» أبدًا: دائمًا افتتاحٌ + الخطوة التالية (حتى عند unknown صار حوارًا).
    const reply = (r.open ? r.open + ' ' : '') + r.next;
    setMsgs(m => [...m, { who: 'user', text: query }, { who: 'ai', text: reply, result: r }]);
    setText('');
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
        <input value={text} onChange={e => setText(e.target.value)} placeholder="كتب هنا…" autoComplete="off"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink1)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', direction: 'rtl' }} />
        <button type="submit" aria-label="إرسال" style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, border: 'none', background: green, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
