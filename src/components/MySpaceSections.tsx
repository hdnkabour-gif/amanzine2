import { useState } from 'react';
import { useStore } from '../store';
import { ShoppingBag, Wrench, Plus, ArrowLeft, Sparkles, Store, Megaphone } from 'lucide-react';
import { getCapabilities, getOffers, getProactive } from '../lib/domain';
import type { Page } from '../types';

// ============================================================
// MySpaceSections — «عالمك» داخل فضائي: أعمالك + اقتراحات النموّ + نشر موحّد.
// إضافيّ فوق لوحة فضائي الحالية (لا يحذف شيئًا). يقرأ من طبقة domain،
// فيبقى منظّمًا حسب حياة المستخدم لا حسب نوع البيانات.
// ============================================================

const CARD = 'var(--panel,rgba(255,255,255,0.03))';
const BORDER = '1px solid var(--border,rgba(255,255,255,0.06))';

export default function MySpaceSections() {
  const { settings, products, orders, customers, conversations, setPage } = useStore();
  const input = { products, orders, customers, conversations, settings };
  const caps = getCapabilities(input);
  const offers = getOffers(input);
  const proactive = getProactive(input).slice(0, 3);
  const [publishOpen, setPublishOpen] = useState(false);

  const publish = (action: string, page: Page) => {
    try { localStorage.setItem('pendingFab', action); } catch { /* noop */ }
    setPage(page);
  };

  const productCount = offers.filter(o => o.type === 'product').length;
  const serviceCount = offers.filter(o => o.type === 'service').length;

  const PUBLISH_OPTS: { label: string; icon: any; action: string; page: Page }[] = [
    { label: 'منتج', icon: ShoppingBag, action: 'addProduct', page: 'products' },
    { label: 'خدمة', icon: Wrench, action: 'addService', page: 'services' },
    { label: 'إعلان فالسوق', icon: Megaphone, action: 'addProduct', page: 'products' },
  ];

  return (
    <div style={{ background: CARD, border: BORDER, borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header + Universal Publish */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1,#FAFAFA)' }}>✨ عالمك</span>
        <button onClick={() => setPublishOpen(v => !v)}
          style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, border: 'none', background: 'var(--ember,#FF6A00)', color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
          <Plus size={15} /> نشر جديد
        </button>
      </div>

      {publishOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px', borderRadius: 13, background: 'var(--bg2,rgba(255,255,255,0.02))', border: BORDER }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink2,#B9C0BA)' }}>شنو بغيت تنشر؟</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PUBLISH_OPTS.map(o => (
              <button key={o.label} onClick={() => publish(o.action, o.page)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 11, border: '1px solid var(--border2,rgba(255,255,255,0.14))', background: CARD, color: 'var(--ink1,#FAFAFA)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                <o.icon size={15} /> {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* أعمالي — يظهر للبائع فقط */}
      {caps.sell && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3,#7E877F)', marginBottom: 8 }}>أعمالي</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <BizCard icon={Store} color="#FF6A00" title="متجري" sub={`${productCount} منتج · ${offers.filter(o => o.status === 'published').length} منشور`} onClick={() => setPage('products')} />
            {caps.services
              ? <BizCard icon={Wrench} color="#7C3AED" title="خدماتي" sub={`${serviceCount} خدمة`} onClick={() => setPage('services')} />
              : <BizCard icon={ShoppingBag} color="#3B82F6" title="طلباتي" sub={`${orders.length} طلب`} onClick={() => setPage('orders')} />}
          </div>
        </div>
      )}

      {/* اقتراحات لك — كلٌّ بسببه (Progressive Platform) */}
      {proactive.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3,#7E877F)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} style={{ color: 'var(--ember,#FF6A00)' }} /> اقتراحات لك
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proactive.map(s => (
              <button key={s.id} onClick={() => setPage(s.page)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 13, background: 'var(--bg2,rgba(255,255,255,0.02))', border: BORDER, cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit', width: '100%' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 650, color: 'var(--ink1,#FAFAFA)' }}>{s.text}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink3,#7E877F)', marginTop: 2 }}>ليه كتشوف هادشي؟ {s.why}</span>
                </span>
                <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 800, color: 'var(--ember,#FF6A00)' }}>{s.cta}</span>
                <ArrowLeft size={15} style={{ color: 'var(--ink3,#7E877F)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BizCard({ icon: Icon, color, title, sub, onClick }: { icon: any; color: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 13px', borderRadius: 13, background: 'var(--bg2,rgba(255,255,255,0.02))', border: BORDER, cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit' }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color, background: `${color}22` }}><Icon size={17} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: 'var(--ink1,#FAFAFA)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink3,#7E877F)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
      </span>
    </button>
  );
}
