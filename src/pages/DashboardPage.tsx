import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  ShoppingBag, MessageCircle, Users, TrendingUp,
  ChevronRight, AlertTriangle, ChevronDown, ChevronUp, Bell,
  Eye, MousePointerClick, Percent, Calendar,
} from 'lucide-react';
import { isPushSupported, getPushPermission, subscribeToPush } from '../lib/pushNotifications';
import { insightsAPI, type MerchantInsights } from '../services/api';
import CommandCenter, { type Nudge } from '../components/CommandCenter';
import ActivityTimeline, { type TimelineItem } from '../components/ActivityTimeline';

// ── نبض حيّ (Shopify-like): مقاييس المتجر من Analytics Engine ──
function LivePulse() {
  const [d, setD] = useState<MerchantInsights | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => insightsAPI.me().then(x => { if (alive) setD(x); }).catch(() => {});
    load(); const t = setInterval(load, 60000); // تحديث كل دقيقة
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!d) return null;
  const cards = [
    { icon: <Eye size={16} />, label: 'مشاهدات', value: d.views, color: '#3b82f6' },
    { icon: <MousePointerClick size={16} />, label: 'نقرات', value: d.clicks, color: '#8b5cf6' },
    { icon: <Percent size={16} />, label: 'نسبة النقر', value: `${Math.round((d.ctr || 0) * 100)}%`, color: '#22c55e' },
    { icon: <Calendar size={16} />, label: 'حجوزات', value: d.bookings, color: '#f97316' },
  ];
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ color: c.color, display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{c.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#FAFAFA' }}>{c.value}</div>
            <div style={{ fontSize: 10, color: '#888' }}>{c.label}</div>
          </div>
        ))}
      </div>
      {d.topItems.length > 0 && (
        <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, marginBottom: 6 }}>🔥 الأكثر مشاهدة</div>
          {d.topItems.slice(0, 4).map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#CFCFCF' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.key}</span>
              <span style={{ color: '#888', flexShrink: 0 }}>{it.count} 👁️</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_AR: Record<string,string> = {
  pending:'بانتظار', approved:'موافقة', processing:'جارٍ',
  shipped:'شُحن', delivered:'وُصّل', cancelled:'ملغي',
};

function DashboardSkeleton() {
  const pulse: React.CSSProperties = { borderRadius: 12, background: 'rgba(255,255,255,0.03)', animation: 'skeletonPulse 1.6s ease-in-out infinite' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes skeletonPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      <div style={{ ...pulse, height: 48 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[1, 2, 3, 4].map(i => <div key={i} style={{ ...pulse, height: 100 }} />)}
      </div>
      <div style={{ ...pulse, height: 200 }} />
    </div>
  );
}

export default function DashboardPage() {
  const { settings, products, orders, customers, conversations, setPage, isLoading, token } = useStore();
  const [showDetails, setShowDetails] = React.useState(false);
  const [pushSupported, setPushSupported] = React.useState(false);
  const [pushPerm, setPushPerm] = React.useState<NotificationPermission>('default');
  const [pushLoading, setPushLoading] = React.useState(false);

  React.useEffect(() => {
    isPushSupported().then(s => { setPushSupported(s); if (s) setPushPerm(getPushPermission()); });
  }, []);

  const handleEnablePush = async () => { setPushLoading(true); const ok = await subscribeToPush(token || ''); setPushLoading(false); if (ok) setPushPerm('granted'); };

  if (isLoading) return <DashboardSkeleton />;

  const { currency } = settings.brand;
  const { goals } = settings;
  const active = orders.filter(o => o.status !== 'cancelled');
  const revenue = active.reduce((s, o) => s + o.total, 0);
  const today = new Date().toISOString().split('T')[0];
  const todayRev = active.filter(o => o.createdAt?.startsWith(today)).reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'pending').length;
  const unread = conversations.reduce((s, c) => s + c.unread, 0);
  const low = products.filter(p => p.stock >= 0 && p.stock <= settings.products.lowStockAlert).length;
  const published = products.filter(p => p.status === 'published').length;
  const goalPct = goals.daily > 0 ? Math.min(100, Math.round((todayRev / goals.daily) * 100)) : 0;

  const kpiCards = [
    { label: 'الإيراد', value: revenue.toLocaleString(), unit: currency, sub: `اليوم: ${todayRev.toLocaleString()} ${currency}`, color: '#22C55E', icon: TrendingUp, page: 'analytics' as const },
    { label: 'الطلبات', value: String(active.length), unit: 'طلب', sub: pending > 0 ? `${pending} بانتظار ⚠` : 'لا معلقة ✅', color: '#F59E0B', icon: ShoppingBag, page: 'orders' as const, alert: pending > 0 },
    { label: 'الرسائل', value: String(unread || conversations.length), unit: unread > 0 ? 'غير مقروء' : 'محادثة', sub: settings.ai.humanSimulation ? 'AI نشط' : 'AI معطّل', color: '#7C3AED', icon: MessageCircle, page: 'conversations' as const, alert: unread > 0 },
    { label: 'الزبائن', value: String(customers.length), unit: 'زبون', sub: `${customers.filter(c => c.vip).length} VIP`, color: '#3B82F6', icon: Users, page: 'customers' as const },
  ];

  const workflowSteps = [
    { label: 'منتج', done: products.length > 0 },
    { label: 'منشور', done: published > 0 },
    { label: 'رسائل', done: conversations.length > 0 },
    { label: 'AI رد', done: conversations.some(c => c.messages.some(m => m.role === 'ai')) },
    { label: 'طلب', done: orders.length > 0, badge: pending },
    { label: 'موافقة', done: orders.some(o => o.status !== 'pending') },
    { label: 'توصيل', done: orders.some(o => ['shipped', 'delivered'].includes(o.status)) },
  ];
  const wfPct = Math.round((workflowSteps.filter(s => s.done).length / workflowSteps.length) * 100);
  const showWorkflow = wfPct < 100;

  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  const lowStockProducts = products.filter(p => p.stock >= 0 && p.stock <= settings.products.lowStockAlert);
  const isCloudConfigured = !!(settings as any).supabaseUrl || !!(settings as any).cloudinaryCloudName;

  // «الخطوة التالية» — الميزة تجيء إلى المستخدم حسب حالته (Progressive Platform, DR-0005)
  const nudges: Nudge[] = [];
  if (products.length === 0) nudges.push({ id: 'first-product', text: 'ابدأ بإضافة أوّل منتج أو خدمة — فضاؤك يبدأ من هنا.', cta: 'أضف الآن', page: 'products' });
  else if (published === 0) nudges.push({ id: 'publish', text: 'لديك منتجات غير منشورة — انشرها لتظهر للزبائن في البحث.', cta: 'انشر', page: 'products' });
  if (!settings.brand.phone) nudges.push({ id: 'phone', text: 'أضف رقم هاتفك ليتواصل معك الزبائن مباشرة.', cta: 'أضف', page: 'settings' });
  if (published > 0 && orders.length === 0) nudges.push({ id: 'share', text: 'متجرك جاهز — شارك رابطه لتصلك أوّل طلباتك.', cta: 'شارك', page: 'settings' });

  // «نشاطي» — Timeline موحّد من بيانات موجودة (طلبات + رسائل). فلتر Inbox داخل المكوّن.
  const timeline: TimelineItem[] = [];
  for (const o of orders) {
    const label = STATUS_AR[o.status] || o.status;
    timeline.push({ id: `o-${o.id}`, kind: 'order', color: '#FF6A00', title: `طلب من ${o.customerName || 'زبون'} · ${Number(o.total || 0).toLocaleString()} ${currency} (${label})`, at: Date.parse(o.createdAt) || 0, needsReply: o.status === 'pending', page: 'orders' });
  }
  for (const c of conversations) {
    const last = c.messages[c.messages.length - 1];
    timeline.push({ id: `c-${c.id}`, kind: 'message', color: '#7C3AED', title: `رسالة من ${c.customerName || 'زبون'}`, at: Date.parse(last?.timestamp || c.createdAt) || 0, needsReply: (c.unread || 0) > 0, page: 'conversations' });
  }
  timeline.sort((a, b) => b.at - a.at);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Cloud Banner */}
      {!isCloudConfigured && !isLoading && (
        <div style={{ background: 'linear-gradient(135deg, rgba(62,207,142,0.06), rgba(26,122,76,0.03))', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>☁️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#3ecf8e', marginBottom: 4 }}>ربط السحابة — احفظ بياناتك بأمان</p>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 10, lineHeight: 1.6 }}>بدون Supabase أو Cloudinary، صورك وبياناتك ستضيع عند كل نشر. ربطها مجاني ويأخذ دقيقتين فقط.</p>
            <button onClick={() => setPage('connections')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.3)', color: '#3ecf8e', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>⚡ ربط السحابة الآن</button>
          </div>
        </div>
      )}

      {/* Push Banner */}
      {pushSupported && pushPerm === 'default' && (
        <div style={{ background: 'linear-gradient(135deg, rgba(255,106,0,0.06), rgba(255,106,0,0.02))', border: '1px solid rgba(255,106,0,0.2)', borderRadius: 16, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={20} color="#FF6A00" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FF6A00', marginBottom: 3 }}>تلقّ إشعارات الطلبات الجديدة</p>
            <p style={{ fontSize: 11, color: '#999', lineHeight: 1.5 }}>احصل على إشعار فوري على هاتفك عند كل طلب جديد.</p>
          </div>
          <button onClick={handleEnablePush} disabled={pushLoading} style={{ padding: '8px 16px', borderRadius: 10, background: '#FF6A00', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: pushLoading ? 0.6 : 1 }}>{pushLoading ? '...' : 'تفعيل'}</button>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && orders.length === 0 && !isLoading && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>مرحباً في AMANZINE!</h2>
          <p style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>ابدأ بإضافة أول منتج وافتح متجرك للزبائن</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => setPage('products')} style={{ padding: '10px 22px', borderRadius: 12, background: '#FF6A00', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📦 أضف أول منتج</button>
            <button onClick={() => setPage('settings')} style={{ padding: '10px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#999', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⚙️ إعداد متجرك</button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => setPage('products')} style={{ padding: '14px', borderRadius: 14, background: '#FF6A00', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>📦 إضافة منتج</button>
        <button onClick={() => setPage('orders')} style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#FAFAFA', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>🛒 الطلبات</button>
      </div>

      {/* My Space — «اليوم / ما يحتاج انتباهك» (مبنيّ على البيانات) */}
      <CommandCenter
        name={settings.brand.name}
        pending={pending}
        unread={unread}
        todayRevenue={todayRev}
        currency={currency}
        lowStock={low}
        aiActive={settings.ai.humanSimulation}
        nudges={nudges}
        onGo={setPage}
      />

      {/* نشاطي — Timeline موحّد + فلتر «ما يحتاج ردًا» (Inbox) */}
      <ActivityTimeline items={timeline} onGo={setPage} />

      {/* لوحة النبض الحيّة — من Analytics Engine (Event Stream) */}
      <LivePulse />

      {/* Revenue Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(255,106,0,0.12), rgba(255,106,0,0.04))', border: '1px solid rgba(255,106,0,0.15)', borderRadius: 20, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .06, pointerEvents: 'none' }} viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(i => (
            <polygon key={i} points={`${i * 24},0 ${i * 24 + 12},12 ${i * 24},24 ${i * 24 - 12},12`} fill="rgba(255,255,255,.6)" />
          ))}
        </svg>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>الإيراد الإجمالي</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 10 }}>
            {revenue.toLocaleString()} <span style={{ fontSize: 18, opacity: 0.6 }}>{currency}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>اليوم: {todayRev.toLocaleString()} {currency}</span>
            {goals.daily > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 99, padding: '3px 10px' }}>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                  <div style={{ width: `${goalPct}%`, height: '100%', background: '#fff', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{goalPct}% من الهدف</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {kpiCards.map(s => (
          <button key={s.label} onClick={() => setPage(s.page)}
            style={{ padding: '14px 12px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', background: s.alert ? 'rgba(255,106,0,0.04)' : 'rgba(255,255,255,0.02)', border: s.alert ? '1px solid rgba(255,106,0,0.2)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: s.alert ? 'rgba(255,106,0,0.08)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={14} color={s.alert ? '#FF6A00' : s.color} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.alert ? '#FF6A00' : '#FAFAFA', marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#999' }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 9, color: s.alert ? 'rgba(255,106,0,0.5)' : '#777', marginTop: 3 }}>{s.sub}</div>}
          </button>
        ))}
      </div>

      {/* Details Section */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
        <button onClick={() => setShowDetails(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', color: '#999', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <span>تفاصيل إضافية</span>
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showDetails && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {showWorkflow && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#999' }}>مسار البيع</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: wfPct === 100 ? '#22C55E' : '#FF6A00' }}>{wfPct}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {workflowSteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < workflowSteps.length - 1 ? 1 : 'auto' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, border: '2px solid', background: step.done ? 'rgba(34,197,94,0.1)' : 'transparent', borderColor: step.done ? '#22C55E' : 'rgba(255,255,255,0.1)', color: step.done ? '#22C55E' : '#777' }}>{step.done ? '✓' : i + 1}</div>
                        <span style={{ fontSize: 7, color: step.done ? '#22C55E' : '#777', whiteSpace: 'nowrap', textAlign: 'center' }}>{step.label}</span>
                      </div>
                      {i < workflowSteps.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: step.done ? '#22C55E' : 'rgba(255,255,255,0.06)', marginTop: -10, marginRight: 2, marginLeft: 2 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>🌅</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#999' }}>ملخص الصباح</span>
              </div>
              {[
                { k: 'طلبات جديدة', v: orders.filter(o => o.createdAt?.startsWith(today)).length, unit: '' },
                { k: 'مخزون منخفض', v: low, unit: 'منتج', warn: low > 0 },
                { k: 'رسائل معلقة', v: unread, unit: '', warn: unread > 0 },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <span style={{ fontSize: 10, color: '#777' }}>{r.k}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.warn ? '#FF6A00' : '#FAFAFA' }}>{r.v} {r.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>آخر الطلبات</span>
            <button onClick={() => setPage('orders')} style={{ background: 'none', border: 'none', color: '#FF6A00', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>عرض الكل <ChevronRight size={13} /></button>
          </div>
          {recentOrders.map((o) => {
            const initials = (o.customerName || '؟').slice(0, 1);
            return (
              <div key={o.id} style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setPage('orders')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,106,0,0.08)', color: '#FF6A00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customerName}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{o.city || '—'} · {o.source || 'مباشر'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{o.total.toLocaleString()} {currency}</div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: o.status === 'pending' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)', color: o.status === 'pending' ? '#F59E0B' : '#22C55E' }}>{STATUS_AR[o.status] || o.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Low Stock */}
      {lowStockProducts.length > 0 && (
        <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={14} color="#F59E0B" />
            <span style={{ fontWeight: 700, color: '#F59E0B', fontSize: 13 }}>{lowStockProducts.length} منتج مخزونه منخفض</span>
          </div>
          {lowStockProducts.slice(0, 3).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: '#999', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
              <span>{p.emoji} {p.name}</span>
              <span style={{ color: p.stock === 0 ? '#EF4444' : '#F59E0B', fontWeight: 700 }}>{p.stock === 0 ? 'نفد' : `${p.stock} قطعة`}</span>
            </div>
          ))}
          {lowStockProducts.length > 3 && <p style={{ fontSize: 11, color: '#777', marginTop: 6 }}>+{lowStockProducts.length - 3} منتج آخر</p>}
          <button onClick={() => setPage('products')} style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>إدارة المخزون</button>
        </div>
      )}
    </div>
  );
}