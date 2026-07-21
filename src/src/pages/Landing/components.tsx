import { useState, useEffect, useRef } from 'react';
import { Star, ChevronUp } from 'lucide-react';
import { C } from './theme';
import { useLanding } from './context';
import type { Listing } from './data';

// كشف الظهور عند التمرير
export function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); o.disconnect(); } }, { threshold: 0.12 });
    o.observe(el); return () => o.disconnect();
  }, []);
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(24px)', transition: `opacity .7s ease ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`, ...style }}>{children}</div>;
}

// عدّاد متحرك يبدأ عند ظهوره
export function CountUp({ to, suffix = '', dur = 1600 }: { to: number; suffix?: string; dur?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true; const t0 = performance.now();
        const tick = (now: number) => { const p = Math.min(1, (now - t0) / dur); setVal(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    o.observe(el); return () => o.disconnect();
  }, [to, dur]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// غلاف قسم + عنوان قسم
export function Section({ children, id, alt }: { children: React.ReactNode; id?: string; alt?: boolean }) {
  return <section id={id} style={{ padding: 'clamp(34px,5.5vh,62px) clamp(16px,5vw,40px)', background: alt ? `${C.alt}cc` : 'transparent' }}><div style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div></section>;
}

export function SecHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 'clamp(22px,3.6vw,34px)', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2, color: C.ink }}>{title}</h2>
      {sub && <p style={{ fontSize: 'clamp(13px,1.6vw,16px)', color: C.ink2, maxWidth: 580, margin: '12px auto 0', lineHeight: 1.7 }}>{sub}</p>}
    </div>
  );
}

// بطاقة منتج/خدمة — صورة حقيقية إن وُجدت، وإلا رمز تعبيري
export function ProductCard({ it, big }: { it: Listing; big?: boolean }) {
  const { tx } = useLanding();
  const [imgOk, setImgOk] = useState(true);
  const img = it.images && it.images[0];
  const emoji = it.emoji || (it.type === 'service' ? '🛠️' : '🛍️');
  return (
    <div className="lpcard" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: big ? 150 : 110, background: C.alt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: big ? 52 : 40 }}>
        {img && imgOk
          ? <img src={img} alt={it.name} loading="lazy" onError={() => setImgOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{emoji}</span>}
        {it.sample && <span style={{ position: 'absolute', top: 8, insetInlineStart: 8, fontSize: 9.5, fontWeight: 800, color: '#fff', background: 'rgba(15,23,42,0.55)', borderRadius: 99, padding: '3px 9px' } as any}>{tx('sample')}</span>}
        {it.ratingAvg ? <span style={{ position: 'absolute', top: 8, insetInlineEnd: 8, fontSize: 10, fontWeight: 800, color: '#B45309', background: 'rgba(255,255,255,0.92)', borderRadius: 99, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 } as any}><Star size={9} fill="#F59E0B" color="#F59E0B" />{it.ratingAvg.toFixed(1)}</span> : null}
      </div>
      <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
        <div style={{ fontSize: 10.5, color: C.ink3, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx('byStore')} {it.sellerName || 'AMANZINE'}{it.city ? ` · ${it.city}` : ''}</div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
          <span style={{ fontWeight: 900, color: C.orange, fontSize: big ? 17 : 15 }}>{it.price} {tx('dh')}</span>
          <span style={{ fontSize: 14 }}>🛒</span>
        </div>
      </div>
    </div>
  );
}

// زر العودة للأعلى (يظهر بعد التمرير)
export function BackToTop() {
  const { tx } = useLanding();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const f = () => setShow((document.documentElement.scrollTop || window.scrollY) > 600);
    window.addEventListener('scroll', f, { passive: true }); f();
    return () => window.removeEventListener('scroll', f);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={tx('backTop')}
      style={{ position: 'fixed', bottom: 22, insetInlineEnd: 22, width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeD})`, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 25px ${C.orange}55`, zIndex: 70 } as any}>
      <ChevronUp size={22} />
    </button>
  );
}

// زليج غني — بلاطة نجمة ثمانية مغربية (مربّعان متقاطعان + نجمة داخلية) كـSVG حقيقي
const ZELLIGE_TILE =
  `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>` +
  `<g fill='none' stroke='${C.orange}' stroke-width='1.1'>` +
  `<rect x='16' y='16' width='64' height='64'/>` +
  `<rect x='16' y='16' width='64' height='64' transform='rotate(45 48 48)'/></g>` +
  `<g fill='none' stroke='${C.blue}' stroke-width='1'>` +
  `<circle cx='48' cy='48' r='13'/>` +
  `<rect x='35' y='35' width='26' height='26' transform='rotate(45 48 48)'/></g>` +
  `<g fill='${C.purple}'><circle cx='16' cy='16' r='1.6'/><circle cx='80' cy='16' r='1.6'/>` +
  `<circle cx='16' cy='80' r='1.6'/><circle cx='80' cy='80' r='1.6'/></g></svg>`;

// خلفية زليج مغربية متحرّكة (العنصر التوقيعي) — نقش هندسي راقٍ خلف كل الصفحة
export function Zellige() {
  const url = `url("data:image/svg+xml,${encodeURIComponent(ZELLIGE_TILE)}")`;
  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 0, opacity: 0.09, pointerEvents: 'none',
      backgroundImage: url, backgroundSize: '96px 96px',
      animation: 'lpZellige 60s linear infinite',
    }} />
  );
}
