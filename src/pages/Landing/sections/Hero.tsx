import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { C } from '../theme';
import { useLanding } from '../context';
import { understand } from '../../../lib/akg/kb';
import { receptionStart, receptionTurn, receptionUnderstood, receptionEnd } from '../../../lib/journey';

// ============================================================
// Hero — «آش واقع؟». ليست إعلانًا؛ إثبات فهم. المستخدم يكتب حالته بالدارجة،
//   فالصفحة تُريه أنّها فهمته (المشكل → المختصّ → أوّل خطوة) قبل أيّ تسجيل.
//   البوّابة تتنفّس · ردٌّ متواضع «أها… كنظن فهمت عليك» · إيقاعٌ إنسانيّ (تمهّل
//   350ms) · صمتٌ نبيل · ذاكرة بصلاحيّة. لغةُ بشر. يُغذّي لوحة البيتا.
// ============================================================

const HINTS = [
  'الما كيقطر فالكوزينة…',
  'الطوموبيل ما بقاتش كتخدم…',
  'بغيت نبيع شي حاجة…',
  'ما عرفت منين نبدا…',
  'خاصني طبيب…',
  'الضو مقطوع فالدار…',
  'واش تقدر تعاوني؟',
];

const MEM_KEY = 'amz_last_need';
const MEM_TTL = 3 * 24 * 60 * 60 * 1000; // ٣ أيّام — بعدها لا نُذكّر بحاجةٍ قديمة
const IDLE_MS = 10000;                    // صمتٌ نبيل بعد ١٠ ثوانٍ
const HINT_IDLE_MS = 4000;                // الأمثلة تبدأ التبدّل بعد ٤ ثوانٍ خمول
const THINK_MS = 350;                     // إيقاعٌ إنسانيّ قبل إظهار الفهم

export default function Hero() {
  const { isRtl } = useLanding();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');   // النصّ بعد تمهّلٍ قصير (إيقاع)
  const [hintIdx, setHintIdx] = useState(0);         // مثالٌ ثابت يتبدّل بعد خمول
  const [showHints, setShowHints] = useState(false); // هل بدأ تبدّل الأمثلة؟
  const [idle, setIdle] = useState(false);           // صمتٌ نبيل
  const [returning, setReturning] = useState('');    // آخر حاجة (ذاكرة بصلاحيّة)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measured = useRef(false);

  // فهمٌ حيّ — يُحسب مرّةً واحدة على النصّ المتمهّل (إيقاع + بلا وميض لكلّ حرف).
  useEffect(() => { const id = setTimeout(() => setDebounced(text), THINK_MS); return () => clearTimeout(id); }, [text]);
  const u = useMemo(() => (debounced.trim().length >= 3 ? understand(debounced) : null), [debounced]);
  const understood = !!(u && (u.problem || u.profession));

  // بداية القياس + ذاكرة العودة (بصلاحيّة).
  useEffect(() => {
    receptionStart();
    try {
      const raw = localStorage.getItem(MEM_KEY);
      if (raw) { const m = JSON.parse(raw); if (m?.t && Date.now() - (m.at || 0) < MEM_TTL) setReturning(m.t); else localStorage.removeItem(MEM_KEY); }
    } catch { /* noop */ }
    return () => receptionEnd('idle');
  }, []);

  // قياس (نفس لوحة البيتا): دورٌ واحد عند أوّل إدخالٍ ذي معنى + «فُهم» حين يُحلّ.
  useEffect(() => {
    if (debounced.trim().length >= 3 && !measured.current) { measured.current = true; receptionTurn(debounced, 'text'); }
    if (u && (u.problem || u.profession)) receptionUnderstood();
  }, [debounced, u]);

  // الأمثلة: ثابتةٌ أوّلًا (لا تنافس بداية المستخدم)، تتبدّل بلطفٍ بعد خمولٍ فقط.
  useEffect(() => {
    if (text) { setShowHints(false); return; }
    const start = setTimeout(() => setShowHints(true), HINT_IDLE_MS);
    return () => clearTimeout(start);
  }, [text]);
  useEffect(() => {
    if (!showHints || text) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setHintIdx(v => (v + 1) % HINTS.length), 3000);
    return () => clearInterval(id);
  }, [showHints, text]);

  // صمتٌ نبيل بعد خمول.
  const armIdle = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  };
  useEffect(() => { armIdle(); return () => { if (idleTimer.current) clearTimeout(idleTimer.current); }; }, []);

  const go = () => {
    const q = text.trim(); if (!q) return;
    try { localStorage.setItem(MEM_KEY, JSON.stringify({ t: q, at: Date.now() })); } catch { /* noop */ }
    receptionEnd('routed');
    const city = u?.city ? `&city=${encodeURIComponent(u.city)}` : '';
    navigate(`/market?q=${encodeURIComponent(q)}${city}`);
  };

  const pro = u?.profession?.label || '';
  const problem = u?.problem?.name || '';
  const placeholder = (!text && showHints) ? HINTS[hintIdx] : 'كتب هنا… آش واقع؟';

  return (
    <section style={{ position: 'relative', overflow: 'hidden', minHeight: '82vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px,8vh,90px) clamp(16px,5vw,40px)' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, background: `radial-gradient(ellipse 70% 55% at 50% 38%, ${C.orange}14, transparent 70%)`, animation: 'breathe 6s ease-in-out infinite' }} />
      <style>{`@keyframes breathe{0%,100%{opacity:.55}50%{opacity:1}} @keyframes gatePulse{0%,100%{opacity:.35;filter:drop-shadow(0 0 0 ${C.purple}00)}50%{opacity:1;filter:drop-shadow(0 0 22px ${C.purple}66)}} @keyframes trailIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 640, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <svg width="46" height="54" viewBox="0 0 46 54" style={{ animation: 'gatePulse 3.4s ease-in-out infinite' }} aria-hidden="true">
            <path d="M6 52 V26 C6 12 13 5 23 3 C33 5 40 12 40 26 V52" fill="none" stroke={C.purple} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M6 52 V26 C6 12 13 5 23 3 C33 5 40 12 40 26 V52" fill="none" stroke={C.orange} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>

        <h1 style={{ fontSize: 'clamp(30px,6vw,50px)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, color: C.ink, lineHeight: 1.1 }}>
          {returning ? 'مرحبا بعودتك 👋' : 'آش واقع؟'}
        </h1>
        <p style={{ fontSize: 'clamp(14px,1.9vw,17px)', color: C.ink2, margin: '12px 0 0', lineHeight: 1.65 }}>
          {returning
            ? <>آخر مرّة وقفنا عند «<b style={{ color: C.ink }}>{returning}</b>» — نكمّلو؟</>
            : 'قول ليا كيف جاتك… حتى إلى كانت كلمة وحدة بالدارجة. أنا معاك.'}
        </p>

        <div style={{ margin: '26px auto 0', maxWidth: 560, display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderRadius: 16, background: C.surface, border: `1.5px solid ${understood ? C.orange : C.borderH}`, boxShadow: C.shadowH, transition: 'border-color .3s ease' }}>
          <input
            value={text}
            onChange={e => { setText(e.target.value); armIdle(); }}
            onKeyDown={e => { if (e.key === 'Enter' && understood) go(); }}
            placeholder={placeholder}
            autoComplete="off"
            dir="rtl"
            aria-label="آش واقع"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.ink, fontSize: 'clamp(15px,2vw,18px)', fontWeight: 600, fontFamily: 'inherit', textAlign: isRtl ? 'right' : 'left' }}
          />
          {understood && (
            <button onClick={go} aria-label="كمّل" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 11, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeD})`, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={19} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
            </button>
          )}
        </div>

        <div style={{ minHeight: 96, marginTop: 18 }}>
          {understood ? (
            <div key={problem + pro} style={{ animation: 'trailIn .4s ease both', maxWidth: 560, margin: '0 auto', textAlign: isRtl ? 'right' : 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, boxShadow: C.shadow }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', fontSize: 12.5, fontWeight: 800, color: C.ink3, marginBottom: 10 }}>
                {[problem, pro && `🔧 ${pro}`, u?.city].filter(Boolean).map((s, i, a) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ color: C.ink2 }}>{s}</span>
                    {i < a.length - 1 && <span style={{ color: C.orange }}>←</span>}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, lineHeight: 1.7 }}>
                أها… كنظن فهمت عليك.{problem ? <> باين {problem}،</> : null} وأوّل خطوة هي تلقى <b style={{ color: C.orangeD }}>{pro || 'المختصّ المناسب'}</b> قريب منك.
              </div>
              <button onClick={go} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeD})`, color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>
                نبدأو بالأقرب ليك <ArrowLeft size={16} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
              </button>
            </div>
          ) : text.trim().length >= 3 ? (
            <div style={{ fontSize: 13.5, color: C.ink3, fontWeight: 600, animation: 'trailIn .3s ease both' }}>
              كنقلّب معاك… زيد شويّة باش نفهمك مزيان.
            </div>
          ) : idle ? (
            <div style={{ fontSize: 13.5, color: C.ink3, fontWeight: 600, animation: 'trailIn .5s ease both' }}>
              ما مستعجلينش… خُذ وقتك. 🌿
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, color: C.ink3, fontWeight: 600 }}>
              <Check size={14} color={C.green} /> بلا تسجيل — غير كتب وأنا نفهمك.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
