import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useStore } from '../store';
import type { Page } from '../types';

// ============================================================
// DeferredAuthBanner — التسجيل المتأخّر. الضيف (وضع التجربة/Demo) يجرّب بحرّية،
//   والتسجيل يظهر فقط في «لحظة القيمة»: صفحات الحفظ/النشر/الحساب. صياغةٌ إيجابيّة:
//   «بقات خطوة — احفظ بحساب مجّانيّ»، لا حاجزٌ في أوّل ثانية. Law: نداء، لا إجبار.
// ============================================================

// الصفحات التي يهمّ فيها الحفظ/الاستمرار (لا تظهر في الاستقبال «شنو محتاج؟»).
const VALUE_PAGES: Page[] = ['publish', 'settings', 'profile', 'wallet', 'products', 'orders', 'bookings', 'services'];

export default function DeferredAuthBanner() {
  const { token, currentPage } = useStore();
  const isGuest = token === 'demo-token-local';
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('amz_defer_auth_dismissed') === '1'; } catch { return false; }
  });

  if (!isGuest || dismissed || !VALUE_PAGES.includes(currentPage)) return null;

  const close = () => {
    setDismissed(true);
    try { sessionStorage.setItem('amz_defer_auth_dismissed', '1'); } catch { /* noop */ }
  };

  return (
    <div dir="rtl" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'color-mix(in srgb, var(--amz-emerald,#0a8f6f) 12%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--amz-emerald,#0a8f6f) 30%, transparent)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink1,#FAFAFA)', zIndex: 40 }}>
      <UserPlus size={15} style={{ color: 'var(--amz-emerald,#0a8f6f)', flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.5 }}>
        أنت كتجرّب دابا — <b>سجّل بحساب مجّانيّ</b> باش يتحفظ اللي كتدير وتتواصل مع الناس.
      </span>
      <a href="/register" style={{ flexShrink: 0, padding: '6px 13px', borderRadius: 9, background: 'var(--amz-emerald,#0a8f6f)', color: '#fff', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>سجّل</a>
      <button onClick={close} aria-label="إغلاق" style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--ink3,#7E877F)', cursor: 'pointer', display: 'flex' }}><X size={15} /></button>
    </div>
  );
}
