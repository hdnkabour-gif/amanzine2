import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useStore } from './store';
import AuthPage              from './pages/AuthPage';
import MainLayout            from './pages/MainLayout';
import LandingPage           from './pages/LandingPage';
import TrackOrder            from './pages/TrackOrder';
import Storefront            from './pages/Storefront';
import Marketplace           from './pages/Marketplace';
import Explore               from './pages/Explore';
import ActivityFeed          from './pages/ActivityFeed';
import BusinessProfile       from './pages/BusinessProfile';
import Onboarding            from './pages/Onboarding';
import NotificationToast     from './components/NotificationToast';
import TourGuide             from './components/TourGuide';
import ErrorBoundary         from './components/ErrorBoundary';
import { isRtlLang } from './i18n';

import { PAGE_URLS, URL_TO_PAGE } from './types';

// الخريطةُ تعيش في `types.ts` — يقرؤها هذا الملفُّ والمخزنُ معًا.

// والعكسُ مُشتقٌّ هناك كذلك؛ يُعاد تصديرُه باسمه المحلّيّ.
const URL_PAGES = URL_TO_PAGE;

// رسائل تحميل سياقية — كل صفحة تشرح ماذا يجري فعلاً أثناء جلب بياناتها
const LOADING_MSGS: Record<string, [string, string]> = {
  dashboard:     ['مرحباً بعودتك 👋', 'نجلب طلباتك وإحصائياتك الحية...'],
  products:      ['جاري تحميل منتجاتك وخدماتك...', 'نجهّز الكتالوج والمخزون والحجوزات'],
  services:      ['جاري تحميل خدماتك...', 'نجهّز قائمة الخدمات وتقويم الحجوزات'],
  orders:        ['جاري تحميل الطلبات...', 'نجلب أحدث الطلبات وحالاتها'],
  conversations: ['جاري تحميل المحادثات...', 'نجلب رسائل زبائنك'],
  customers:     ['جاري تحميل الزبائن...', 'نجلب قائمة زبائنك وبياناتهم'],
  analytics:     ['جاري تحميل التحليلات...', 'نحسب الزيارات والمشاهدات والمبيعات'],
  insights:      ['جاري تحميل الأداء...', 'نحلل أرقام متجرك'],
  connections:   ['جاري تحميل الاتصالات...', 'نتحقق من الخدمات المربوطة بمتجرك'],
  delivery:      ['جاري تحميل التوصيل...', 'نجلب شركات الشحن وسجل الشحنات'],
  coupons:       ['جاري تحميل الكوبونات...', 'نجلب أكواد الخصم والعروض'],
  settings:      ['جاري تحميل الإعدادات...', 'نجلب إعدادات متجرك المحفوظة'],
};

// شعار AMANZINE — ملفٌّ واحدٌ مربّعٌ شفّاف: /brand/amanzine-logo.png
// كانت هنا سلسلةُ تراجعٍ إلى .jpg و.svg، وكلاهما غيرُ موجود؛ فالسلسلةُ كانت
// تُجرّب مساراتٍ ميّتةً ثمّ تسقط إلى حرف A. الحرفُ يبقى كأمانٍ أخيرٍ وحده.
function BrandLogo({ size = 46, radius = 14, style }: { size?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      <img src="/brand/amanzine-logo.png" alt="AMANZINE"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={e => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.display = 'none'; (img.parentElement as HTMLElement).innerHTML = `<span style="font-size:${Math.round(size * 0.42)}px;font-weight:900;color:#006233">A</span>`;
        }} />
    </div>
  );
}

// المشهد الافتتاحي «البوّابة» — سرد سينمائيّ من لقطتين (≈٥ ثوانٍ):
//   ① فيديو «الظهور من الظلام» — القوس المغربي يتشكّل   (amanzine-portal.mp4)
//   ② فيديو «انفتاح البوّابة» — البوّابة تُفتح ويتشكّل الشعار  (amanzine-gate.mp4)
// ثمّ يخفت مباشرةً إلى التطبيق (بلا لوحةٍ نهائيّةٍ زائدة).
// يُعرض مرّة كلّ جلسة. آمن دائمًا: يتخطّى نفسه، يحترم reduced-motion،
// مؤقّت صارم يكشف التطبيق مهما حدث، ولا يحبس المستخدم أبدًا.
function SplashScreen() {
  const reduce = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  const [phase, setPhase] = useState<'show' | 'fade' | 'done'>(() => {
    try { return sessionStorage.getItem('amanzine_splash') ? 'done' : 'show'; } catch { return 'show'; }
  });
  // اللقطة: 0=الظهور، 1=الانفتاح+الشعار
  const [beat, setBeat] = useState(0);
  const portalRef = useRef<HTMLVideoElement>(null);
  const gateRef = useRef<HTMLVideoElement>(null);

  // تسليمُ شاشة البدء: لا تُخفى إلّا وقد صار ما يخلفها جاهزًا للعرض، وإلّا
  // ظهرت ومضةً ثمّ فراغًا. تُستدعى مرّةً واحدةً مهما تكرّر المسار.
  const handedOver = useRef(false);
  const handOffSplash = () => {
    if (handedOver.current) return;
    handedOver.current = true;
    try { (window as unknown as { hideSplash?: () => void }).hideSplash?.(); } catch { /* noop */ }
  };

  // البوّابةُ لن تُعرض (شوهدت في هذه الجلسة) ⇒ سلّم فورًا.
  useEffect(() => { if (phase === 'done') handOffSplash(); }, [phase]);

  useEffect(() => {
    if (phase !== 'show') return;
    const finish = () => { try { sessionStorage.setItem('amanzine_splash', '1'); } catch { /* noop */ } setPhase('done'); };
    const fadeOut = () => setPhase('fade');

    // تقليل الحركة: لقطة شعار ثابتة قصيرة ثمّ كشف التطبيق.
    if (reduce) {
      setBeat(1);
      handOffSplash();          // اللقطةُ الثابتة جاهزةٌ فورًا
      const a = setTimeout(fadeOut, 1400);
      const b = setTimeout(finish, 2100);
      return () => { clearTimeout(a); clearTimeout(b); };
    }

    // ① شغّل فيديو الظهور؛ إن رُفض التشغيل ننتقل فورًا (لا حبس).
    const pv = portalRef.current;
    if (pv) {
      // التسليمُ عند أوّل إطارٍ قابلٍ للعرض — لا قبلَه.
      if (pv.readyState >= 2) handOffSplash();
      else pv.addEventListener('loadeddata', handOffSplash, { once: true });
      const p = pv.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => { handOffSplash(); setBeat(1); });
    } else handOffSplash();
    // أمانٌ: مهما تعثّر الفيديو، لا تبقَ شاشةُ البدء أكثر من ثانيةٍ ونصف.
    const tHand = setTimeout(handOffSplash, 1500);

    const tGate  = setTimeout(() => { setBeat(1); const gv = gateRef.current; if (gv) { const p = gv.play?.(); if (p && typeof p.catch === 'function') p.catch(() => {}); } }, 2400); // ② الانفتاح + الشعار
    const tFade  = setTimeout(fadeOut, 4800);           // ثمّ يخفت مباشرةً إلى التطبيق
    const tDone  = setTimeout(finish, 5500);            // حدّ أقصى صارم
    return () => { [tHand, tGate, tFade, tDone].forEach(clearTimeout); };
  }, [phase, reduce]);

  if (phase === 'done') return null;

  const skip = () => { setPhase('fade'); setTimeout(() => { try { sessionStorage.setItem('amanzine_splash', '1'); } catch { /* noop */ } setPhase('done'); }, 350); };

  return (
    <div
      onClick={skip}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'radial-gradient(120% 80% at 50% 12%, #0c3b28 0%, #072117 46%, #04120c 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        opacity: phase === 'fade' ? 0 : 1, transition: 'opacity .7s ease',
        pointerEvents: phase === 'fade' ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes gateLogoIn{0%{transform:scale(.5);opacity:0;filter:blur(6px)}60%{transform:scale(1.06);opacity:1;filter:blur(0)}100%{transform:scale(1)}}
        @keyframes gateGlow{0%,100%{box-shadow:0 0 40px rgba(212,175,55,.28)}50%{box-shadow:0 0 96px rgba(212,175,55,.6)}}
        @keyframes gateText{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ① فيديو الظهور من الظلام — القوس يتشكّل */}
      {!reduce && (
        <video
          ref={portalRef} autoPlay muted playsInline preload="auto"
          onEnded={() => setBeat(b => Math.max(b, 1))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: beat === 0 ? 1 : 0, transition: 'opacity 1s ease' }}
        >
          <source src="/brand/amanzine-portal.mp4" type="video/mp4" />
        </video>
      )}

      {/* ② فيديو انفتاح البوّابة — يظهر في اللقطة ١ */}
      {!reduce && (
        <video
          ref={gateRef} muted playsInline preload="auto"
          poster="/brand/amanzine-gate-poster.jpg"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: beat === 1 ? 1 : 0, transition: 'opacity 1s ease' }}
        >
          <source src="/brand/amanzine-gate.mp4" type="video/mp4" />
        </video>
      )}

      {/* ② الشعار يتشكّل فوق البوّابة المنفتحة (اللقطة ١) */}
      {beat === 1 && (
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BrandLogo size={132} radius={0} style={{ background: 'transparent', animation: 'gateLogoIn 1s cubic-bezier(.16,1,.3,1) both, gateGlow 2.4s ease infinite .6s' }} />
          <div style={{ textAlign: 'center', animation: 'gateText .8s .35s ease both' }}>
            <div style={{ fontSize: 29, fontWeight: 900, letterSpacing: '.05em', color: '#FAF3E0', fontFamily: 'Tajawal, system-ui, sans-serif' }}>AMANZINE</div>
            <div style={{ fontSize: 14, color: '#D4AF37', marginTop: 6, fontWeight: 800, fontFamily: 'Tajawal, system-ui, sans-serif' }}>البوابة المغربية</div>
            <div style={{ fontSize: 12.5, color: 'rgba(250,243,224,.66)', marginTop: 7, fontWeight: 600, fontFamily: 'Tajawal, system-ui, sans-serif' }}>كلشي اللي بغيتي… فبلاصة وحدة</div>
          </div>
        </div>
      )}

      {/* تخطّي — لا نحبس أحدًا */}
      <button
        onClick={(e) => { e.stopPropagation(); skip(); }}
        style={{ position: 'absolute', bottom: 26, insetInline: 0, margin: '0 auto', width: 'fit-content', zIndex: 4, padding: '8px 20px', borderRadius: 999, border: '1px solid rgba(212,175,55,.5)', background: 'rgba(0,0,0,.32)', backdropFilter: 'blur(6px)', color: '#F0C75E', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
      >
        تخطّي ✕
      </button>
    </div>
  );
}

function getSeasonalTheme(): string {
  const m = new Date().getMonth();
  if (m >= 5 && m <= 7) return 'theme-summer';
  if (m === 10) return 'theme-blackfriday';
  return '';
}

function ThemeManager() {
  const { settings } = useStore();
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-ramadan','theme-eid','theme-summer','theme-blackfriday','light-theme');
    const manual = (settings as any).design?.seasonalTheme;
    if (manual && manual !== 'auto' && manual !== 'default') { html.classList.add(`theme-${manual}`); return; }
    if (settings.design?.theme === 'light') html.classList.add('light-theme');
    if (!manual || manual === 'auto') { const s = getSeasonalTheme(); if (s) html.classList.add(s); }
  }, [settings.design?.theme, (settings as any).design?.seasonalTheme]);

  // Global text direction + lang follow the chosen UI language (ar/darija = RTL).
  const lang = (settings.brand as any)?.language || 'ar';
  useEffect(() => {
    const html = document.documentElement;
    html.dir = isRtlLang(lang) ? 'rtl' : 'ltr';
    html.lang = lang;
  }, [lang]);
  return null;
}

function RouterSync() {
  const { currentPage, setPage } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Public routes that RouterSync must NEVER interfere with
  const isPublicRoute = location.pathname.startsWith('/store') ||
    location.pathname.startsWith('/market') ||
    location.pathname.startsWith('/explore') ||
    location.pathname.startsWith('/feed') ||
    location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/landing') ||
    location.pathname === '/';

  useEffect(() => {
    if (isPublicRoute) return; // Never sync from public routes
    const page = URL_PAGES[location.pathname];
    if (page && page !== currentPage) setPage(page as any);
  }, [location.pathname]);

  useEffect(() => {
    if (isPublicRoute) return; // Never push navigation from public routes
    const url = PAGE_URLS[currentPage];
    if (url && location.pathname !== url) navigate(url, { replace: false });
  }, [currentPage]);

  return null;
}

function AppShell() {
  const { token, onboardingCompleted, isLoading } = useStore();
  const location = useLocation();
  const isDemoMode = token === 'demo-token-local';
  const isAuthed   = !!token || isDemoMode;
  // الصفحات العامة (واجهة الزبون) لا تتأثر ببوابة التحميل أو الإعداد الأولي
  const isPublicRoute = location.pathname.startsWith('/store') || location.pathname.startsWith('/market') || location.pathname.startsWith('/explore') || location.pathname.startsWith('/feed') || location.pathname.startsWith('/business') || location.pathname.startsWith('/landing');

  // أثناء أول تحميل للبيانات لا نقرر شيئاً — لا نعرض Onboarding قبل وصول
  // الإعدادات الحقيقية من الخادم، حتى لا يُعاد الإعداد الأولي على جهاز جديد
  // فتُكتب القيم الافتراضية فوق إعدادات المتجر المحفوظة (مسح الإعدادات).
  if (token && !isDemoMode && !isPublicRoute && isLoading) {
    const pageKey = URL_PAGES[location.pathname] || '';
    const [msgTitle, msgSub] = LOADING_MSGS[pageKey] || ['مرحباً بعودتك 👋', 'جاري تحميل متجرك... نجلب بياناتك المحفوظة'];
    return (
      <>
        <ThemeManager />
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
          <style>{`@keyframes logoPulse{0%,100%{transform:scale(1);box-shadow:0 0 18px rgba(255,106,0,.18)}50%{transform:scale(1.06);box-shadow:0 0 34px rgba(255,106,0,.4)}}`}</style>
          <BrandLogo size={48} radius={15} style={{ animation: 'logoPulse 1.8s ease infinite' }} />
          <div className="spin" style={{ width: 26, height: 26, border: '3px solid var(--border2)', borderTopColor: 'var(--ember)', borderRadius: '50%' }} />
          <div style={{ fontSize: 15, color: 'var(--ink1)', fontWeight: 800 }}>{msgTitle}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 600, marginTop: -6 }}>{msgSub}</div>
        </div>
      </>
    );
  }

  if (token && !isDemoMode && !isPublicRoute && !onboardingCompleted) {
    return (
      <>
        <ThemeManager />
        <NotificationToast />
        <Onboarding />
      </>
    );
  }

  return (
    <>
      <ThemeManager />
      {isAuthed && <RouterSync />}
      <NotificationToast />
      {isAuthed && <TourGuide />}
      {/* `NextStepHint` انتقل إلى داخل `main` — يحجز مكانَه في المجرى بدل
          أن يطفو فوق أفعال الصفحة. السبب مقيسٌ في الملفّ نفسِه. */}
      {/* ambient background handled in CSS body */}

      {/* حاجزُ تعطُّلٍ يغطّي كلّ المسارات — العامّة منها (سوق/متجر/اكتشف) لم تكن محميّة */}
      <ErrorBoundary>
      <Routes>
        {/* ── PUBLIC: Storefront for customers ── */}
        <Route path="/store"          element={<Storefront />} />
        <Route path="/store/:userId"  element={<Storefront />} />
        <Route path="/store/*"        element={<Storefront />} />

        {/* ── PUBLIC: Marketplace (unified catalog + quick-seller) ── */}
        <Route path="/explore"        element={<Explore />} />
        <Route path="/feed"           element={<ActivityFeed />} />
        <Route path="/market"         element={<Marketplace />} />
        <Route path="/business/:source/:id" element={<BusinessProfile />} />
        {/* تتبّعُ الطلب — عامٌّ: الزبونُ لا حسابَ له. هويّةُ المتجر في الرابط
            لأنّ المسارَين يشترطانها والزبونُ لا يعرفها ولا يجب أن يعرفها. */}
        <Route path="/track/:userId"  element={<TrackOrder />} />

        {/* ── PUBLIC: Landing page (choose: merchant or customer) ── */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/auth"    element={isAuthed ? <Navigate to="/home" replace /> : <AuthPage />} />
        <Route path="/login"   element={isAuthed ? <Navigate to="/home" replace /> : <AuthPage />} />
        <Route path="/register"element={isAuthed ? <Navigate to="/home" replace /> : <AuthPage />} />

        {/* ── PROTECTED: Merchant dashboard ──────────────────────
            **المساراتُ تُشتقّ من `PAGE_URLS`، ولا تُكتَب ثانيةً.**

            كانت هنا قائمةٌ مكتوبةٌ بأصابعَ، و`PAGE_URLS` قائمةٌ أخرى. فأضفتُ
            سابقًا `'field-visit': '/field-visit'` إلى الأولى — **ونسيتُ
            الثانية**. فصار للصفحة رابطٌ بلا مسار: يُنادى `setPage` فينتقل
            الراوتر إلى `/field-visit`، فلا يطابق شيئًا، فيقع على `*`
            ⇒ `Navigate to="/home"`.

            وهذا بالضبط ما وصفه صاحبُ المشروع ثلاثَ مرّات: **«تظهر وتختفي
            وتعيدني للرئيسيّة»**. الوميضُ هو الصفحةُ تُرسَم لحظةً قبل أن
            يهبط التحويل.

            «قائمتان لشيءٍ واحد» — نفسُ العطب الذي أصلحتُه في خرائط الطرق
            وفي عقد البحث، وقد **أعدتُ أنا نفسي إنتاجَه هنا**. فالاشتقاقُ
            وحدَه يمنعه: من يضيف صفحةً إلى `PAGE_URLS` يأخذ مسارَها معها. */}
        {Object.values(PAGE_URLS).map(path => (
          <Route key={path} path={path}
            element={isAuthed ? <MainLayout /> : <Navigate to="/login" replace />} />
        ))}

        {/* ── ROOT: Show landing page always at / ── */}
        <Route path="/" element={
          isAuthed
            ? <Navigate to="/home" replace />
            : <LandingPage />
        } />

        {/* ── FALLBACK ── */}
        <Route path="*" element={
          isAuthed ? <Navigate to="/home" replace /> : <LandingPage />
        } />
      </Routes>
      </ErrorBoundary>
    </>
  );
}

export default function App() {
  return (
    <>
      <SplashScreen />
      <AppShell />
    </>
  );
}
