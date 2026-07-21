import '../styles/background-system.css';

// ============================================================
// MasterBackground — الخلفيّة الأمّ + مشتقّ القسم الحاليّ.
// طبقة ثابتة خلف المحتوى (z-index:0)؛ المحتوى فوقها. لا تلمس الصفحات نفسها.
// تُمرَّر لها الصفحة الحاليّة فتختار المشتقّ المناسب (home/market/ai…).
// ============================================================

// خريطة الصفحة الداخليّة → مشتقّ الخلفيّة
const VARIANT: Record<string, string> = {
  home: 'home',
  dashboard: 'dashboard', analytics: 'dashboard', insights: 'dashboard',
  products: 'services', services: 'services', coupons: 'services',
  conversations: 'chat', notifications: 'chat',
  customers: 'profile', settings: 'profile', connections: 'profile',
  knowledge: 'ai', guide: 'ai', assistant: 'ai',
  orders: 'market', delivery: 'market', bookings: 'market', moderation: 'market',
  wallet: 'dashboard', profile: 'profile', publish: 'services',
};

export default function MasterBackground({ page = 'home' }: { page?: string }) {
  const v = VARIANT[page] || 'home';
  return <div className={`amz-bg amz-bg--${v}`} aria-hidden="true" />;
}
