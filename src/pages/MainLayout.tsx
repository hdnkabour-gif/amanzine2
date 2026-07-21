import React from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { useStore } from '../store';
import NavBar from './NavBar';
import GlobalSearch from '../components/GlobalSearch';
import MasterBackground from '../components/MasterBackground';
import FeedbackButton from '../components/FeedbackButton';
import DeferredAuthBanner from '../components/DeferredAuthBanner';
import ErrorBoundary from '../components/ErrorBoundary';

// ── Skeleton fallback ─────────────────────────────
function PageSkeleton() {
  return (
    <div style={{ padding:'20px 0', display:'flex', flexDirection:'column', gap:12, maxWidth:1100, margin:'0 auto' }}>
      <div className="skeleton" style={{ height:100, borderRadius:18 }}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:80, borderRadius:14 }}/>)}
      </div>
      {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:56, borderRadius:12 }}/>)}
    </div>
  );
}

// ── Lazy pages ────────────────────────────────────
const LivingHome        = lazy(() => import('./LivingHome'));
const DashboardPage     = lazy(() => import('./DashboardPage'));
const ProductsPage      = lazy(() => import('./ProductsPage'));
const OrdersPage        = lazy(() => import('./OrdersPage'));
const MessagesPage      = lazy(() => import('./MessagesPage'));
const CustomersPage     = lazy(() => import('./CustomersPage'));
const AnalyticsPage     = lazy(() => import('./AnalyticsPage'));
const ConnectionsPage   = lazy(() => import('./ConnectionsPage'));
const DeliveryPage      = lazy(() => import('./DeliveryPage'));
const NotificationsPage = lazy(() => import('./NotificationsPage'));
const SettingsPage      = lazy(() => import('./SettingsPage'));
const BannerStudioPage  = lazy(() => import('./BannerStudioPage'));
const ImageEditorPage   = lazy(() => import('./ImageEditorPage'));
const ChatImportPage    = lazy(() => import('./ChatImportPage'));
const CouponsPage       = lazy(() => import('./CouponsPage'));
const GuidePage         = lazy(() => import('./GuidePage'));
const ModerationPage    = lazy(() => import('./ModerationPage'));
const BookingsPage      = lazy(() => import('./BookingsPage'));
const ControlCenter     = lazy(() => import('./ControlCenter'));
const WalletPage        = lazy(() => import('./WalletPage'));
const ProfilePage       = lazy(() => import('./ProfilePage'));
const AssistantPage     = lazy(() => import('./AssistantPage'));
const UniversalPublish  = lazy(() => import('./UniversalPublish'));

function PageContent() {
  const { currentPage } = useStore();
  switch (currentPage) {
    case 'home':          return <LivingHome />;
    case 'dashboard':     return <DashboardPage />;
    case 'products':      return <ProductsPage />;
    case 'orders':        return <OrdersPage />;
    case 'conversations': return <MessagesPage />;
    case 'customers':     return <CustomersPage />;
    case 'analytics':     return <AnalyticsPage />;
    case 'connections':   return <ConnectionsPage />;
    case 'delivery':      return <DeliveryPage />;
    case 'notifications': return <NotificationsPage />;
    case 'settings':      return <SettingsPage />;
    case 'banner':        return <BannerStudioPage />;
    case 'editor':        return <ImageEditorPage />;
    case 'import':        return <ChatImportPage />;
    case 'coupons':       return <CouponsPage />;
    case 'guide':         return <GuidePage />;
    case 'insights':      return <AnalyticsPage />;
    case 'services':      return <ProductsPage />;
    case 'moderation':    return <ModerationPage />;
    case 'bookings':      return <BookingsPage />;
    case 'knowledge':     return <ControlCenter />;
    case 'wallet':        return <WalletPage />;
    case 'profile':       return <ProfilePage />;
    case 'assistant':     return <AssistantPage />;
    case 'publish':       return <UniversalPublish />;
    default:              return <DashboardPage />;
  }
}

export default function MainLayout() {
  const { isOnline, currentPage } = useStore();
  const [showSearch, setShowSearch] = React.useState(false);

  // إعادة التمرير للأعلى عند تغيير الصفحة — كانت الصفحة الجديدة تظهر "بالأسفل"
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); }
    const m = document.querySelector('main');
    if (m) m.scrollTop = 0;
  }, [currentPage]);

  // Listen for Ctrl+K
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(v => !v);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Preload critical pages in background
  useEffect(() => {
    const t = setTimeout(() => {
      import('./ProductsPage');
      import('./OrdersPage');
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--void)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* نظام الخلفيّات — طبقة الهوية الأمّ خلف كل المحتوى */}
      <MasterBackground page={currentPage} />
      {/* غلاف المحتوى فوق الخلفيّة (zIndex:1) — يحافظ على تخطيط flex */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <NavBar />
        {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
        {/* Offline banner */}
        {!isOnline && (
          <div style={{
            background: 'rgba(245,158,11,.15)', borderBottom: '1px solid rgba(245,158,11,.3)',
            padding: '8px 16px', textAlign: 'center', fontSize: 12, color: '#f59e0b',
            fontWeight: 700, zIndex: 50,
          }}>
            ⚠️ وضع غير متصل — البيانات محلية فقط
          </div>
        )}
        {/* التسجيل المتأخّر — نداءٌ لطيف للضيف في صفحات الحفظ فقط */}
        <DeferredAuthBanner />
        {/* Main content */}
        <main className="main-with-sidebar" style={{ flex:1, paddingTop:56, paddingBottom:80, overflowX:'hidden', minHeight:'100dvh' }}>
          <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 16px' }}>
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <PageContent />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <FeedbackButton />
    </div>
  );
}
