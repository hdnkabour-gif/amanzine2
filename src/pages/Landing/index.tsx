import ErrorBoundary from '../../components/ErrorBoundary';
import { C } from './theme';
import { useScrollProgress } from './hooks';
import { LandingProvider, useLanding } from './context';
import { BackToTop, Zellige } from './components';
import PromoBanner from './sections/PromoBanner';
import Header from './sections/Header';
import Hero from './sections/Hero';
import LiveMarketplace from './sections/LiveMarketplace';
import Cities from './sections/Cities';
import HowItWorks from './sections/HowItWorks';
import FAQ from './sections/FAQ';
import FinalCTA from './sections/FinalCTA';
import Footer from './sections/Footer';

// نقش زاوية (نجمة مغربية) يظهر على البطاقات عند التحويم — مبنيّ من ألوان الثيم
const NAQSH_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='66' height='66'><g fill='none' stroke='${C.orange}' stroke-width='1.3'><rect x='18' y='18' width='30' height='30'/><rect x='18' y='18' width='30' height='30' transform='rotate(45 33 33)'/></g><circle cx='33' cy='33' r='6' fill='none' stroke='${C.blue}' stroke-width='1.3'/></svg>`;
const NAQSH = `url("data:image/svg+xml,${encodeURIComponent(NAQSH_SVG)}")`;

const GLOBAL_CSS = `
  @keyframes lpIn { from{opacity:0} to{opacity:1} }
  @keyframes lpUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lpShimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes lpFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @keyframes lpFloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(9px)} }
  @keyframes lpBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
  @keyframes lpGrad { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
  @keyframes lpShine { 0%{transform:translateX(-220%) skewX(-18deg)} 60%,100%{transform:translateX(320%) skewX(-18deg)} }
  @keyframes lpFade { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lpCaret { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms!important;animation-iteration-count:1!important} }
  .lpcard { position: relative; transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease, border-color .3s ease; }
  .lpcard::after { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none; opacity:0; transition:opacity .4s ease; background-image:${NAQSH}; background-repeat:no-repeat; background-position:top -7px right -7px; background-size:66px 66px; }
  .lpcard:hover { transform: translateY(-5px); box-shadow: ${C.shadowH}, inset 0 0 0 1.5px ${C.orange}26; border-color: ${C.borderH}; }
  .lpcard:hover::after { opacity:.13; }
  .lpcard:hover .lpico { transform: scale(1.1) rotate(-6deg); }
  .lpico { transition: transform .3s cubic-bezier(.16,1,.3,1); }
  .lpbtn .sh { position:absolute; top:0; bottom:0; width:34%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent); transform:translateX(-220%) skewX(-18deg); animation:lpShine 4.5s ease-in-out infinite; pointer-events:none; }
  .lpmenu::-webkit-scrollbar { width:6px } .lpmenu::-webkit-scrollbar-thumb { background:rgba(0,0,0,.14); border-radius:3px }
  .bento { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
  @media(min-width:780px){ .bento{ grid-template-columns:repeat(4,1fr); grid-auto-rows:1fr } .bento .feat{ grid-column:span 2; grid-row:span 2 } .bento .wide{ grid-column:span 2 } }
  @keyframes lpZellige { to { background-position: 192px 192px } }
  @keyframes lpTicker { to { transform: translateX(-50%) } }
  .osdesk { position:relative }
  @media(min-width:861px){ .osdesk{ height:470px } .oswin{ position:absolute } .osw1{ width:380px; top:0; inset-inline-end:0; z-index:3 } .osw2{ width:330px; top:120px; inset-inline-start:0; z-index:2 } .osw3{ width:330px; top:248px; inset-inline-end:56px; z-index:4 } }
  @media(max-width:860px){ .oswin{ position:relative; margin-bottom:14px } }
  html { scroll-behavior: smooth; }
`;

function Shell() {
  const { isRtl } = useLanding();
  const prog = useScrollProgress();
  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', overflowX: 'hidden', background: C.bg, color: C.ink, fontFamily: 'Tajawal, system-ui, sans-serif' }}>
      <style>{GLOBAL_CSS}</style>
      <Zellige />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'fixed', top: 0, insetInlineStart: 0, height: 3, width: `${Math.round(prog * 100)}%`, background: `linear-gradient(90deg, ${C.orange}, ${C.purple}, ${C.blue})`, zIndex: 60, transition: 'width .1s linear' }} />
        <PromoBanner />
        <Header />
        {/* Landing المحتاج: يبدأ بـ«آش واقع؟» (إثبات الفهم)، ثمّ كيف يعمل، فالمدن، فالسوق.
            حُذف من الواجهة ما يخصّ التاجر/الممنوع (Bento «منظومة تجارة/ذكاء اصطناعيّ» ·
            Pricing على الـLanding · شريط «كن أوّل تاجر») — الميثاق: أثبت لا تشرح، لغة بشر. */}
        <main>
          <Hero />
          <HowItWorks />
          <Cities />
          <LiveMarketplace />
          <FAQ />
          <FinalCTA />
        </main>
        <Footer />
      </div>
      <BackToTop />
    </div>
  );
}

export default function LandingPage() {
  return (
    <ErrorBoundary>
      <LandingProvider>
        <Shell />
      </LandingProvider>
    </ErrorBoundary>
  );
}
