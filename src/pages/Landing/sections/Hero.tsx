import { useState, useEffect } from 'react';
import { Brain, Zap, Check, ChevronDown, Shield, MapPin, Sparkles } from 'lucide-react';
import { C } from '../theme';
import { useLanding } from '../context';
import { useMagnetic } from '../hooks';
import { CountUp } from '../components';

// ============================================================
// Hero (Need OS) — «شنو محتاج؟». الصفحة الأولى تعرض قلب المنتج: يكتب المستخدم
//   حاجته بالدارجة، فيُظهر العقل ما فهمه (مشكلة/مختصّ/مدينة) — عرضٌ حيّ يتبدّل.
//   لا تسويق «متجر»؛ بل «اكتب حاجتك ← نفهمك ← نلقّي الحلّ».
// ============================================================

// أمثلة حقيقيّة يفهمها العقل فعلًا (من سجلّ الأعطال المعرفيّ).
const DEMOS = [
  { q: 'الما كيقطر فالدار البيضاء بزربة', problem: 'تسرّب ماء', pro: 'سبّاك', city: 'الدار البيضاء', urgent: true },
  { q: 'الماطور كيدير دخان أبيض', problem: 'عطل محرّك', pro: 'ميكانيكي', city: '', urgent: false },
  { q: 'الضو مقطوع فالدار', problem: 'انقطاع الكهرباء', pro: 'كهربائي', city: '', urgent: false },
  { q: 'الفريكو ما بقاش كيبرّد', problem: 'عطل تبريد', pro: 'فنّي أجهزة', city: '', urgent: false },
];

type LangCopy = { h1: string; h2: string; sub: string; try: string; login: string; note: string; understood: string; problem: string; pro: string; city: string; urgent: string; act: string; ph: string };
const COPY: Record<string, LangCopy> = {
  ar: { h1: 'شنو محتاج', h2: 'اليوم؟', sub: 'اكتب حاجتك بالدارجة، والعقل يفهمك ويلقّي ليك الحلّ — في أيّ مدينة بالمغرب.', try: 'جرّب دابا', login: 'دخول', note: 'بلا تسجيل — جرّبها الآن', understood: 'فهمنا طلبك', problem: 'المشكلة', pro: 'المختصّ', city: 'المدينة', urgent: 'مستعجل', act: 'لقّى ليّ', ph: 'اكتب حاجتك هنا…' },
  darija: { h1: 'شنو محتاج', h2: 'اليوم؟', sub: 'كتب اللي محتاج بالدارجة، والعقل يفهمك ويلقّى ليك الحلّ — فأيّ مدينة فالمغرب.', try: 'جرّب دابا', login: 'دخول', note: 'بلا تسجيل — جرّبها دابا', understood: 'فهمنا طلبك', problem: 'المشكل', pro: 'المختصّ', city: 'المدينة', urgent: 'مستعجل', act: 'لقّى ليّ', ph: 'كتب اللي محتاج…' },
  fr: { h1: 'De quoi', h2: 'avez-vous besoin ?', sub: 'Écrivez votre besoin en darija — le cerveau comprend et trouve la solution, partout au Maroc.', try: 'Essayer', login: 'Connexion', note: 'Sans inscription — essayez maintenant', understood: 'Compris', problem: 'Problème', pro: 'Spécialiste', city: 'Ville', urgent: 'Urgent', act: 'Trouver un', ph: 'Écrivez votre besoin…' },
  en: { h1: 'What do you', h2: 'need today?', sub: 'Write your need in Darija — the brain understands and finds the solution, anywhere in Morocco.', try: 'Try it now', login: 'Sign in', note: 'No sign-up — try it now', understood: 'We understood', problem: 'Problem', pro: 'Specialist', city: 'City', urgent: 'Urgent', act: 'Find a', ph: 'Write your need…' },
  zh: { h1: '你今天', h2: '需要什么？', sub: '用达里贾语写下你的需求，大脑理解并找到解决方案 — 遍及摩洛哥。', try: '立即试用', login: '登录', note: '无需注册 — 立即试用', understood: '已理解', problem: '问题', pro: '专家', city: '城市', urgent: '紧急', act: '找一位', ph: '写下你的需求…' },
};

export default function Hero() {
  const { lang, isRtl, tx, isAuthed, stats, established, Arrow, startDemo, scrollTo } = useLanding();
  const magRef = useMagnetic<HTMLButtonElement>(0.3);
  const cp = COPY[lang] ?? COPY.ar;

  const [i, setI] = useState(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI(v => (v + 1) % DEMOS.length), 3600);
    return () => clearInterval(id);
  }, []);
  const d = DEMOS[i];

  const btnPrimary: React.CSSProperties = { position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 9, padding: '15px 30px', borderRadius: 14, background: `linear-gradient(135deg, ${C.purple}, #b9860f)`, color: '#231800', fontSize: 15.5, fontWeight: 900, textDecoration: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 14px 30px ${C.purple}44`, transition: 'transform .15s ease, box-shadow .3s ease' };
  const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 9, padding: '15px 26px', borderRadius: 14, background: C.surface, color: C.ink, fontSize: 15.5, fontWeight: 800, textDecoration: 'none', border: `1px solid ${C.borderH}`, cursor: 'pointer', fontFamily: 'inherit' };

  const Row = ({ label, value, tone }: { label: string; value: string; tone?: boolean }) => value ? (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13.5 }}>
      <span style={{ color: C.ink3, minWidth: 58, fontWeight: 700 }}>{label}</span>
      <span style={{ color: tone ? C.orange : C.ink, fontWeight: tone ? 900 : 700 }}>{value}</span>
    </div>
  ) : null;

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(38px,7vh,74px) clamp(16px,5vw,40px) clamp(26px,5vh,52px)' }}>
      {/* خلفية فيديو صامتة + حجاب زمرّديّ كريميّ */}
      <video autoPlay muted loop playsInline preload="auto" aria-hidden="true" ref={el => { if (el) el.muted = true; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }}>
        <source src="/amanzine-intro.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(250,248,242,0.86), rgba(250,248,242,0.93))', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '-18%', insetInlineEnd: '-8%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${C.orange}22, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-26%', insetInlineStart: '-10%', width: 440, height: 440, borderRadius: '50%', background: `radial-gradient(circle, ${C.purple}1c, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,360px), 1fr))', gap: 'clamp(28px,5vw,56px)', alignItems: 'center' }}>
        {/* نصّ */}
        <div style={{ textAlign: isRtl ? 'right' : 'left', animation: 'lpUp .6s .05s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 15px', borderRadius: 99, background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.orange, boxShadow: `0 0 0 4px ${C.orange}2e`, animation: 'lpShimmer 2s ease infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.ink2 }}>{tx('osBadge')}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6.2vw, 62px)', fontWeight: 900, lineHeight: 1.05, margin: '18px 0 0', letterSpacing: '-0.03em', color: C.ink }}>
            {cp.h1}
            <span style={{ display: 'block', background: `linear-gradient(90deg, ${C.orange}, ${C.purple}, ${C.orange})`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'lpGrad 6s linear infinite' }}>{cp.h2}</span>
          </h1>
          <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: C.ink2, lineHeight: 1.7, margin: '18px 0 0', maxWidth: 540 }}>{cp.sub}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
            <button ref={magRef} onClick={startDemo} className="lpbtn" style={btnPrimary}><span className="sh" /><Zap size={17} /> {cp.try} <Arrow size={17} /></button>
            <a href={isAuthed ? '/dashboard' : '/login'} style={btnGhost}>{cp.login}</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, fontSize: 12.5, color: C.ink3, fontWeight: 600 }}>
            <Check size={14} color={C.green} /> {cp.note}
          </div>
        </div>

        {/* عرض حيّ للعقل — «فهمنا طلبك» */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', animation: 'lpUp .7s .2s ease both' }}>
          <div style={{ animation: 'lpFloat 6s ease-in-out infinite', width: '100%', maxWidth: 420 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.shadowH, overflow: 'hidden', borderRadius: 22 }}>
              {/* شريط الإدخال */}
              <div style={{ padding: '15px 16px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(${C.alt}, ${C.surface})` }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: C.ink3, marginBottom: 8, letterSpacing: '.02em' }}>{cp.h1} {cp.h2}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 12, background: C.bg, border: `1.5px solid ${C.orange}44` }}>
                  <Sparkles size={15} color={C.orange} style={{ flexShrink: 0 }} />
                  <span key={i} style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, animation: 'lpFade .5s ease both' }}>{d.q}</span>
                  <span style={{ width: 2, height: 15, background: C.orange, marginInlineStart: 'auto', animation: 'lpCaret 1s step-end infinite', flexShrink: 0 }} />
                </div>
              </div>
              {/* بطاقة الفهم */}
              <div key={`u${i}`} style={{ padding: 16, animation: 'lpFade .5s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.orange, background: `${C.orange}1c` }}><Brain size={17} /></span>
                  <span style={{ fontSize: 14.5, fontWeight: 900, color: C.ink }}>{cp.understood}</span>
                  {d.urgent && <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: '#c0392b', background: '#c0392b18', padding: '3px 9px', borderRadius: 99 }}><Zap size={11} /> {cp.urgent}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingInlineStart: 38 }}>
                  <Row label={cp.problem} value={d.problem} />
                  <Row label={cp.pro} value={d.pro} tone />
                  <Row label={cp.city} value={d.city} />
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, background: `linear-gradient(135deg, ${C.purple}, #b9860f)`, color: '#231800', fontSize: 14, fontWeight: 900 }}>
                  <MapPin size={16} /> {cp.act} {d.pro} {isRtl ? 'قريب' : ''}
                </div>
              </div>
            </div>
          </div>
          {/* شريحة صغيرة عائمة */}
          <div style={{ position: 'absolute', top: 14, insetInlineStart: -8, animation: 'lpFloat2 5s ease-in-out infinite', background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.shadow, borderRadius: 13, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: `${C.green}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✅</span>
            <div><div style={{ fontSize: 11, fontWeight: 900, color: C.ink }}>{isRtl ? 'فهمك' : 'Understood'}</div><div style={{ fontSize: 8.5, color: C.ink3, fontWeight: 700 }}>{isRtl ? 'بالدارجة' : 'in Darija'}</div></div>
          </div>
        </div>
      </div>

      {/* شريط الأرقام / Early-stage */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1000, margin: 'clamp(28px,4vh,46px) auto 0', animation: 'lpUp .7s .3s ease both' }}>
        {established && stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 14, padding: '22px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: C.shadow }}>
            {[
              { n: stats.merchants, l: tx('statMerchants') || 'مزوّدون' },
              { n: stats.products, l: tx('statProducts') || 'خدمات' },
              { n: stats.orders, l: tx('statOrders') || 'طلبات' },
              { n: stats.listings, l: tx('statListings') },
            ].map((s, k) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(22px,3.4vw,32px)', fontWeight: 900, color: C.ink }}><CountUp to={s.n} /></div>
                <div style={{ fontSize: 11.5, color: C.ink3, fontWeight: 700, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '18px 24px', background: `linear-gradient(135deg, ${C.orange}0e, ${C.purple}0e)`, border: `1px solid ${C.orange}2a`, borderRadius: 20 }}>
            {[
              { Icon: Brain, t: isRtl ? 'يفهم الدارجة' : 'Understands Darija' },
              { Icon: Shield, t: isRtl ? 'مزوّدون موثوقون' : 'Verified providers' },
              { Icon: MapPin, t: isRtl ? 'كل مدن المغرب' : 'All Morocco' },
            ].map(({ Icon, t }, k) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 800, color: C.ink2 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: `${C.orange}16`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={C.orange} /></span>{t}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginTop: 'clamp(18px,3vh,32px)' }}>
        <button onClick={() => scrollTo('live')} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: C.ink3, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700 }}>{tx('scrollHint')} <ChevronDown size={18} style={{ animation: 'lpBounce 1.8s ease infinite' }} /></button>
      </div>
    </section>
  );
}
