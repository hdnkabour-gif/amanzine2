import { useEffect, useState } from 'react';
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
};

const URL_PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_URLS).map(([k, v]) => [v, k])
);

// رسائل تحميل سياقية — كل صفحة تشرح ماذا يجري فعلاً أثناء جلب بياناتها
const LOADING_MSGS: Record<string, [string, string]> = {
  home:          ['مرحباً بعودتك 👋', 'نجهّز صفحتك الرئيسية...'],
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

// شعار AMANZINE الرسمي (amanzine-logo.svg) — مع تراجع تلقائي
// إلى حرف A إن تعذّر تحميل الصورة
function BrandLogo({ size = 46, radius = 14, style }: { size?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      <img src="/amanzine-logo.svg" alt="AMANZINE"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={e => {
          const img = e.currentTarget as HTMLImageElement;
          img.style.display = 'none'; (img.parentElement as HTMLElement).innerHTML = `<span style="font-size:${Math.round(size * 0.42)}px;font-weight:900;color:#006233">A</span>`;
        }} />
    </div>
  );
}

// سبلاش الشعار — يظهر مرة واحدة في الجلسة ثم يختفي ويكشف التطبيق
function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'done'>(() => {
    try { return sessionStorage.getItem('amanzine_splash') ? 'done' : 'show'; } catch { return 'show'; }
  });
  useEffect(() => {
    if (phase !== 'show') return;
    const t1 = setTimeout(() => setPhase('fade'), 2400);
    const t2 = setTimeout(() => { try { sessionStorage.setItem('amanzine_splash', '1'); } catch {} setPhase('done'); }, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);
  if (phase === 'done') return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#0A0A0F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, opacity: phase === 'fade' ? 0 : 1, transition: 'opacity 0.7s ease', pointerEvents: 'none' }}>
      <style>{`@keyframes splashLogo{0%{transform:scale(.55);opacity:0}55%{transform:scale(1.07);opacity:1}100%{transform:scale(1)}}@keyframes splashGlow{0%,100%{box-shadow:0 0 36px rgba(255,106,0,.18)}50%{box-shadow:0 0 54px rgba(255,106,0,.36)}}@keyframes splashText{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}`}</style>
      <BrandLogo size={108} radius={28} style={{ border: '2px solid rgba(255,106,0,0.4)', animation: 'splashLogo 1.1s cubic-bezier(.16,1,.3,1) both, splashGlow 2.2s ease infinite' }} />
      <div style={{ textAlign: 'center', animation: 'splashText .8s .45s ease both' }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', color: '#FAFAFA', fontFamily: 'Tajawal, system-ui, sans-serif' }}><span style={{ color: '#FF6A00' }}>AMANZINE</span></div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 7, fontWeight: 600, fontFamily: 'Tajawal, system-ui, sans-serif' }}>منصة المغرب الذكية للبيع والشراء</div>
      </div>
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
  const isPublicRoute = location.pathname.startsWith('/store') || location.pathname.startsWith('/market') || location.pathname.startsWith('/explore') || location.pathname.startsWith('/feed') || location.pathname.startsWith('/business') || location.pathname.startsWith('/landing') || location.pathname === '/';

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
          '/settings','/studio','/editor','/import','/coupons','/guide','/moderation','/bookings'].map(path => (
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
