import { useMemo } from 'react';
import { useStore } from '../store';
import { ShieldCheck, Package, Star, Heart, Settings as Cog, Store, ArrowLeft } from 'lucide-react';
import { getInteractions } from '../lib/experienceLog';
import { playGate } from '../lib/gateTransition';
import type { Page } from '../types';

// ============================================================
// ملفّي — حساب المستخدم نفسه (لا الملف العموميّ BusinessProfile).
// بياناتي · درجة الثقة · نشاطي · مفضّلتي · وصول سريع للمتجر والإعدادات.
// ============================================================

export default function ProfilePage() {
  const { user, settings, products, orders, setPage } = useStore();
  const name = (user as any)?.name || (settings.brand as any)?.name || 'مستخدم أمانزين';
  const city = (settings.brand as any)?.city || (user as any)?.city || 'المغرب';
  const initial = name.trim().charAt(0) || 'A';

  const xp = useMemo(() => getInteractions(), []);
  // درجة ثقة بسيطة: من اكتمال البيانات + النشاط (تقدير محلّي، تتحوّل لاحقًا لنظام سمعة على الخادم).
  const trust = useMemo(() => {
    let s = 40;
    if ((settings.brand as any)?.name) s += 12;
    if ((settings.brand as any)?.logo) s += 8;
    if (products.length) s += 15;
    if (orders.length) s += 15;
    if (xp.length) s += Math.min(10, xp.length);
    return Math.min(100, s);
  }, [settings, products, orders, xp]);

  const green = 'var(--amz-emerald,#0a8f6f)';
  const gold = 'var(--amz-gold,#D4A017)';

  let favs: any[] = [];
  try { favs = JSON.parse(localStorage.getItem('amanzine_favorites') || '[]'); } catch { /* noop */ }

  const stats = [
    { i: Package, l: 'منتجاتي', v: products.length, page: 'products' as Page },
    { i: Star, l: 'طلباتي', v: orders.length, page: 'orders' as Page },
    { i: Heart, l: 'مفضّلتي', v: favs.length, page: undefined },
  ];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* الترويسة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, background: `linear-gradient(135deg, color-mix(in srgb, ${green} 16%, var(--panel,rgba(255,255,255,.03))), var(--panel,rgba(255,255,255,.03)))`, border: `1px solid color-mix(in srgb, ${gold} 30%, transparent)` }}>
        <div style={{ width: 62, height: 62, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', background: `linear-gradient(135deg, ${green}, #073c22)`, border: `2px solid ${gold}` }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink1)' }}>{name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>{city}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 9px', borderRadius: 99, background: `color-mix(in srgb, ${green} 15%, transparent)`, border: `1px solid ${green}`, fontSize: 11.5, fontWeight: 800, color: green }}>
            <ShieldCheck size={13} /> الثقة {trust}٪
          </div>
        </div>
      </div>

      {/* شريط الثقة */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700, marginBottom: 6 }}>
          <span>درجة الثقة</span><span>كمّل بياناتك باش ترتفع</span>
        </div>
        <div style={{ height: 9, borderRadius: 99, background: 'var(--panel2,#132040)', overflow: 'hidden' }}>
          <div style={{ width: `${trust}%`, height: '100%', background: `linear-gradient(90deg, ${green}, ${gold})`, transition: 'width .5s ease' }} />
        </div>
      </div>

      {/* إحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {stats.map(s => (
          <button key={s.l} onClick={() => s.page && playGate(() => setPage(s.page!))} style={{ padding: '14px 10px', borderRadius: 14, background: 'var(--panel,rgba(255,255,255,.03))', border: '1px solid var(--border,rgba(255,255,255,.08))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: s.page ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            <s.i size={19} style={{ color: green }} />
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink1)' }}>{s.v}</span>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700 }}>{s.l}</span>
          </button>
        ))}
      </div>

      {/* روابط سريعة */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[
          { i: Store, l: 'عرض متجري كما يراه الزبناء', act: () => { try { const uid = (user as any)?.id || 'me'; window.location.assign(`/store/${uid}`); } catch { /* noop */ } } },
          { i: Cog, l: 'الإعدادات والبيانات', act: () => playGate(() => setPage('settings')) },
        ].map(r => (
          <button key={r.l} onClick={r.act} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderRadius: 13, background: 'var(--panel,rgba(255,255,255,.03))', border: '1px solid var(--border,rgba(255,255,255,.08))', color: 'var(--ink1)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'start' }}>
            <r.i size={18} style={{ color: gold, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{r.l}</span>
            <ArrowLeft size={16} style={{ color: 'var(--ink3)' }} />
          </button>
        ))}
      </div>

      {/* المفضّلة */}
      {favs.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: 'var(--ink2)', marginBottom: 9 }}><Heart size={15} /> مفضّلتي</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {favs.slice(0, 8).map((f, i) => (
              <span key={i} style={{ padding: '7px 12px', borderRadius: 99, background: 'var(--panel,rgba(255,255,255,.03))', border: '1px solid var(--border,rgba(255,255,255,.08))', fontSize: 12.5, color: 'var(--ink2)', fontWeight: 650 }}>{typeof f === 'string' ? f : (f?.name || 'عنصر')}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
