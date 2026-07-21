import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useStore } from './store';
import AuthPage              from './pages/AuthPage';
import MainLayout            from './pages/MainLayout';
import LandingPage           from './pages/LandingPage';
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

const PAGE_URLS: Record<string, string> = {
  home:          '/home',
  dashboard:     '/dashboard',
  products:      '/products',
  services:      '/services',
  orders:        '/orders',
  conversations: '/messages',
  customers:     '/customers',
  analytics:     '/analytics',
  insights:      '/insights',
  connections:   '/connections',
  delivery:      '/delivery',
  notifications: '/notifications',
  settings:      '/settings',
  banner:        '/studio',
  editor:        '/editor',
  import:        '/import',
  coupons:       '/coupons',
  guide:         '/guide',
  moderation:    '/moderation',
  bookings:      '/bookings',
  knowledge:     '/knowledge-studio',
  // روابط كانت ناقصة — بلا مدخلٍ هنا لا يتزامن العنوان ولا يعمل الرابط المباشر (deep-link)
  wallet:        '/wallet',
  profile:       '/profile',
  assistant:     '/assistant',
  publish:       '/publish',
};

const URL_PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_URLS).map(([k, v]) => [v, k])
);

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

// شعار AMANZINE — يفضّل صورة الشعار الرسميّة إن وُضعت (/brand/amanzine-logo.png)
// ثمّ يتراجع إلى الشعار المتّجه (/amanzine-logo.svg) ثمّ إلى حرف A.
// هكذا: ضع ملفّ شعارك المصقول في public/brand/amanzine-logo.png ويُستعمل تلقائيًّا في كلّ مكان.
function BrandLogo({ size = 46, radius = 14, style }: { size?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      <img src="/brand/amanzine-logo.png" alt="AMANZINE" data-step="0"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={e => {
          const img = e.currentTarget as HTMLImageElement;
          const step = img.getAttribute('data-step');
          if (step === '0') { img.setAttribute('data-step', '1'); img.src = '/brand/amanzine-logo.jpg'; return; } // جرّب JPG
          if (step === '1') { img.setAttribute('data-step', '2'); img.src = '/amanzine-logo.svg'; return; }      // ثمّ المتّجه
          img.style.display = 'none'; (img.parentElement as HTMLElement).innerHTML = `<span style="font-size:${Math.round(size * 0.42)}px;font-weight:900;color:#006233">A</span>`;
        }} />
    </div>
  );
}

// كلمات الخدمات التي تظهر أسفل الشعار في اللقطة الأخيرة (لا ازدحام — بالتتابع)
const GATE_WORDS = ['خدمات', 'متاجر', 'حرفيون', 'مطاعم', 'توصيل', 'طلبات', 'سيارات', 'عقارات', 'وظائف', 'سياحة', 'صحة', 'تعليم', 'ذكاء اصطناعي', 'دفع آمن'];

// المشهد الافتتاحي «البوّابة» — سرد سينمائيّ من ٣ لقطات (≈٧ ثوانٍ):
//   ① فيديو «الظهور من الظلام» — القوس المغربي يتشكّل   (amanzine-portal.mp4)
//   ② فيديو «انفتاح البوّابة» — البوّابة تُفتح ويتشكّل الشعار  (amanzine-gate.mp4)
//   ③ الصورة النهائية — لوحة الشعار الكاملة + الشعار النصّي + كلمات الخدمات
// يُعرض مرّة كلّ جلسة. آمن دائمًا: يتخطّى نفسه، يحترم reduced-motion،
// مؤقّت صارم يكشف التطبيق مهما حدث، ولا يحبس المستخدم أبدًا.
// الصورة النهائيّة الرسميّة (إن وُضعت في public/brand/amanzine-final.jpg) تُعرض كما هي؛
// وإلّا تُركَّب لوحة مكافئة من الشعار + النصوص فوق لقطة البوّابة.
function SplashScreen() {
  const reduce = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  const [phase, setPhase] = useState<'show' | 'fade' | 'done'>(() => {
    try { return sessionStorage.getItem('amanzine_splash') ? 'done' : 'show'; } catch { return 'show'; }
  });
  // اللقطة: 0=الظهور، 1=الانفتاح+الشعار، 2=الصورة النهائية
  const [beat, setBeat] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [finalImg, setFinalImg] = useState<boolean | null>(null); // هل توجد صورة نهائيّة رسميّة؟
  const portalRef = useRef<HTMLVideoElement>(null);
  const gateRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (phase !== 'show') return;
    const finish = () => { try { sessionStorage.setItem('amanzine_splash', '1'); } catch { /* noop */ } setPhase('done'); };
    const fadeOut = () => setPhase('fade');

    // تقليل الحركة: لقطة شعار ثابتة قصيرة ثمّ كشف التطبيق.
    if (reduce) {
      setBeat(1);
      const a = setTimeout(fadeOut, 1500);
      const b = setTimeout(finish, 2200);
      return () => { clearTimeout(a); clearTimeout(b); };
    }

    // ① شغّل فيديو الظهور؛ إن رُفض التشغيل ننتقل فورًا (لا حبس).
    const pv = portalRef.current;
    if (pv) { const p = pv.play?.(); if (p && typeof p.catch === 'function') p.catch(() => setBeat(1)); }

    const tGate  = setTimeout(() => { setBeat(1); const gv = gateRef.current; if (gv) { const p = gv.play?.(); if (p && typeof p.catch === 'function') p.catch(() => {}); } }, 2400); // ② الانفتاح
    const tFinal = setTimeout(() => setBeat(2), 4600);  // ③ الصورة النهائية
    const tFade  = setTimeout(fadeOut, 6600);
    const tDone  = setTimeout(finish, 7300);            // حدّ أقصى صارم
    return () => { [tGate, tFinal, tFade, tDone].forEach(clearTimeout); };
  }, [phase, reduce]);

  // تدوير كلمات الخدمات في اللقطة ③ (فقط حين لا توجد صورة نهائيّة جاهزة بالنصوص)
  useEffect(() => {
    if (beat !== 2 || finalImg === true) return;
    const id = setInterval(() => setWordIdx(i => (i + 1) % GATE_WORDS.length), 380);
    return () => clearInterval(id);
  }, [beat, finalImg]);

  if (phase === 'done') return null;

  const skip = () => { setPhase('fade'); setTimeout(() => { try { sessionStorage.setItem('amanzine_splash', '1'); } catch { /* noop */ } setPhase('done'); }, 350); };
  const showComposed = beat >= 2 && finalImg === false; // لوحة مكافئة حين لا توجد صورة رسميّة

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
        @keyframes gateWord{0%{opacity:0;transform:translateY(8px) scale(.96)}30%,70%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-8px) scale(1.02)}}
        @keyframes gateFade{from{opacity:0}to{opacity:1}}
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

      {/* ② فيديو انفتاح البوّابة — يظهر في اللقطة ١ ثمّ يخفت في اللقطة ٣ */}
      {!reduce && (
        <video
          ref={gateRef} muted playsInline preload="auto"
          poster="/brand/amanzine-gate-poster.jpg"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: beat === 1 ? 1 : beat >= 2 ? 0.16 : 0, transition: 'opacity 1s ease' }}
        >
          <source src="/brand/amanzine-gate.mp4" type="video/mp4" />
        </video>
      )}

      {/* ③ الصورة النهائيّة الرسميّة (إن وُضعت) — تُعرض كاملةً كما صُمّمت.
          تقبل .jpg أو .png تلقائيًّا (لا حاجة للقلق حول الصيغة). */}
      {beat >= 2 && (
        <img
          src="/brand/amanzine-final.jpg" alt="AMANZINE" data-fallback="0"
          onLoad={() => setFinalImg(true)}
          onError={e => { const im = e.currentTarget; if (im.getAttribute('data-fallback') === '0') { im.setAttribute('data-fallback', '1'); im.src = '/brand/amanzine-final.png'; return; } setFinalImg(false); }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2, opacity: finalImg === true ? 1 : 0, transition: 'opacity .8s ease', animation: 'gateFade .8s ease both' }}
        />
      )}

      {/* ② الشعار يتشكّل (اللقطة ١) + لوحة مكافئة للصورة النهائيّة (اللقطة ٣ إن غابت الصورة الرسميّة) */}
      {(beat === 1 || showComposed) && (
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BrandLogo size={132} radius={0} style={{ background: 'transparent', animation: 'gateLogoIn 1s cubic-bezier(.16,1,.3,1) both, gateGlow 2.4s ease infinite .6s' }} />
          <div style={{ textAlign: 'center', animation: 'gateText .8s .35s ease both' }}>
            <div style={{ fontSize: 29, fontWeight: 900, letterSpacing: '.05em', color: '#FAF3E0', fontFamily: 'Tajawal, system-ui, sans-serif' }}>AMANZINE</div>
            <div style={{ fontSize: 14, color: '#D4AF37', marginTop: 6, fontWeight: 800, fontFamily: 'Tajawal, system-ui, sans-serif' }}>البوابة الذكية المغربية</div>
            <div style={{ fontSize: 12.5, color: 'rgba(250,243,224,.66)', marginTop: 7, fontWeight: 600, fontFamily: 'Tajawal, system-ui, sans-serif' }}>كلشي اللي بغيتي… فبلاصة وحدة</div>
          </div>
          <div style={{ height: 24, marginTop: 2 }}>
            {showComposed && (
              <span key={wordIdx} style={{ display: 'inline-block', fontSize: 14, fontWeight: 800, color: '#F0C75E', fontFamily: 'Tajawal, system-ui, sans-serif', animation: 'gateWord .38s ease both' }}>
                {GATE_WORDS[wordIdx]}
              </span>
            )}
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

        {/* ── PUBLIC: Landing page (choose: merchant or customer) ── */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/auth"    element={isAuthed ? <Navigate to="/home" replace /> : <AuthPage />} />
        <Route path="/login"   element={isAuthed ? <Navigate to="/home" replace /> : <AuthPage />} />
        <Route path="/register"element={isAuthed ? <Navigate to="/home" replace /> : <AuthPage />} />

        {/* ── PROTECTED: Merchant dashboard ── */}
        {['/home','/dashboard','/products','/services','/orders','/messages','/customers',
          '/analytics','/insights','/connections','/delivery','/notifications',
          '/settings','/studio','/editor','/import','/coupons','/guide','/moderation','/knowledge-studio',
          '/bookings','/wallet','/profile','/assistant','/publish'].map(path => (
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
