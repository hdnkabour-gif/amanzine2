import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { useStore } from '../store';
import { analyticsAPI } from '../services/api';
import Sparkline from '../components/Sparkline';
import { summarize } from '../lib/orderCosting';
import { Download, TrendingUp, BarChart3 } from 'lucide-react';

// Lazy-load recharts to keep initial bundle small
const RechartsBar = lazy(() => import('recharts').then(m => ({
  default: function RevenueBarChart({ data, currency }: { data: { label: string; revenue: number; count: number }[]; currency: string }) {
    const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } = m;
    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink3,#888)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--ink3,#888)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--panel2,#1C3058)', border: '1px solid var(--border,rgba(255,255,255,.1))', borderRadius: 10, fontSize: 12 }}
            formatter={(v: any) => [`${Number(v).toLocaleString()} ${currency}`, 'الإيراد']}
          />
          {data.map((_, i) => (
            <Cell key={i} fill={`rgba(255,106,0,${0.5 + (i / data.length) * 0.5})`} />
          ))}
          <Bar dataKey="revenue" radius={[6, 6, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    );
  },
})));

const RechartsPie = lazy(() => import('recharts').then(m => ({
  default: function StatusPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
    const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } = m;
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--panel2,#1C3058)', border: '1px solid var(--border,rgba(255,255,255,.1))', borderRadius: 10, fontSize: 12 }}
            formatter={(v: any, name: any) => [v, name]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: 'var(--ink3,#888)' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  },
})));

type Period = 3 | 6 | 12;

const STATUS_COLORS: Record<string, string> = {
  pending:    '#F59E0B',
  approved:   '#3B82F6',
  processing: '#8B5CF6',
  shipped:    '#06B6D4',
  delivered:  '#10B981',
  cancelled:  '#EF4444',
};
const STATUS_AR: Record<string, string> = {
  pending:'بانتظار', approved:'موافقة', processing:'جارٍ',
  shipped:'شُحن', delivered:'وُصّل', cancelled:'ملغي',
};

// Traffic source display labels + icons
const SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  facebook:  { label: 'فيسبوك',    icon: '📘', color: '#1877f2' },
  instagram: { label: 'انستغرام',  icon: '📸', color: '#e1306c' },
  tiktok:    { label: 'تيكتوك',    icon: '🎵', color: '#000000' },
  google:    { label: 'جوجل',      icon: '🔍', color: '#4285F4' },
  whatsapp:  { label: 'واتساب',    icon: '💬', color: '#25D366' },
  youtube:   { label: 'يوتيوب',    icon: '▶️', color: '#FF0000' },
  direct:    { label: 'مباشر',     icon: '🔗', color: '#8B96A8' },
};

export default function AnalyticsPage() {
  const { orders, products, customers, settings, isOnline } = useStore();
  const [months, setMonths] = useState<Period>(6);
  const [serverData, setServerData] = useState<any>(null);
  const [storeStats, setStoreStats] = useState<any>(null);
  const { currency } = settings.brand;

  useEffect(() => {
    if (!isOnline) return;
    Promise.all([analyticsAPI.get(), analyticsAPI.funnel()]).then(([ana, funnel]) => {
      setServerData({ ...ana, funnel });
    }).catch(() => {});
    analyticsAPI.store(30).then(setStoreStats).catch(() => {});
  }, [isOnline]);

  const active    = orders.filter(o => o.status !== 'cancelled');
  // حصيلةٌ واحدةٌ محلّيّة. لا نخلط إيرادَ الخادم بتكلفةِ المتصفّح: إمّا الخادمُ
  // كاملًا (حين يجيب) أو الحسابُ المحلّيُّ كاملًا (حين ينقطع).
  const local     = summarize(active as any, products as any);
  const fromSrv   = serverData && typeof serverData.profit === 'number';
  const revenue   = fromSrv ? serverData.revenue : local.revenue;
  const profit    = fromSrv ? serverData.profit  : local.profit;
  const margin    = fromSrv
    ? (typeof serverData.margin === 'number' ? serverData.margin
       : serverData.revenue > 0 ? Math.round((serverData.profit / serverData.revenue) * 100) : 0)
    : local.margin;
  const shipping  = fromSrv && typeof serverData.shippingCost === 'number' ? serverData.shippingCost : local.shipping;
  const avgOrder  = serverData?.avgOrder  ?? (active.length ? Math.round(revenue / active.length) : 0);
  const dlvRate   = serverData?.dlvRate   ?? (orders.length ? Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100) : 0);

  // M-4: سلاسل شهرية حقيقية (إيراد/تكلفة/ربح/توصيل/زبائن جدد) — لا بيانات مُفبركة
  const monthly = useMemo(() => {
    const ref = new Date();
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(ref.getFullYear(), ref.getMonth() - (months - 1 - i), 1);
      const sameMonth = (dt: string) => { const x = new Date(dt); return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear(); };
      const moAll = orders.filter(o => sameMonth(o.createdAt));
      const moActive = moAll.filter(o => o.status !== 'cancelled');
      const m = summarize(moActive as any, products as any);
      const delivered = moAll.filter(o => o.status === 'delivered').length;
      const newCust = customers.filter(c => (c as any).createdAt && sameMonth((c as any).createdAt)).length;
      return { label: d.toLocaleString('ar', { month: 'short' }), revenue: m.revenue, count: moActive.length, cost: m.cost, profit: m.profit, delivered, total: moAll.length, newCust };
    });
  }, [months, orders, products, customers]);

  const topProds = [...products].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const maxSales = topProds[0]?.sales || 1;

  const sources: Record<string, { orders: number; revenue: number }> = {};
  active.forEach(o => { if (!sources[o.source]) sources[o.source] = { orders: 0, revenue: 0 }; sources[o.source].orders++; sources[o.source].revenue += o.total; });
  const maxSrcRev = Math.max(...Object.values(sources).map(s => s.revenue), 1);

  const statusDist: Record<string, number> = {};
  orders.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });

  const statusPieData = Object.entries(statusDist).map(([name, value]) => ({
    name: STATUS_AR[name] || name, value, color: STATUS_COLORS[name] || '#6B7280',
  }));

  const exportCSV = () => {
    const rows = [['الشهر','الإيرادات','الطلبات'], ...monthly.map(m => [m.label, m.revenue, m.count])];
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  // M-4: كل الـ sparklines الآن من بيانات شهرية حقيقية
  const kpis: { label: string; value: string; color: string; spark: number[]; hint?: string; warn?: boolean }[] = [
    { label: 'الإيرادات',      value: `${revenue.toLocaleString()} ${currency}`,  color: '#10b981', spark: monthly.map(m => m.revenue),
      hint: shipping > 0 ? `شاملًا ${shipping.toLocaleString()} ${currency} رسمَ توصيلٍ محصَّل` : undefined },
    { label: 'صافي الربح',    value: `${profit.toLocaleString()} ${currency}`,   color: '#6366f1', spark: monthly.map(m => m.profit),
      hint: profit < 0 ? 'التكلفةُ تفوق الإيراد — راجع «ثمن الشراء» في بطاقات المنتجات'
                       : 'الإيراد ناقص ثمنِ الشراء ورسمِ التوصيل', warn: profit < 0 },
    { label: 'هامش الربح',    value: `${margin}%`,                               color: '#a855f7', spark: monthly.map(m => m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : 0), warn: margin < 0 },
    { label: 'متوسط الطلب',   value: `${avgOrder} ${currency}`,                  color: '#f97316', spark: monthly.map(m => m.count ? m.revenue / m.count : 0) },
    { label: 'معدل التوصيل',  value: `${dlvRate}%`,                              color: '#06b6d4', spark: monthly.map(m => m.total ? Math.round((m.delivered / m.total) * 100) : 0) },
    { label: 'زبائن متكررون', value: String(customers.filter(c => c.totalOrders >= 3).length), color: '#8b5cf6', spark: monthly.map(m => m.newCust) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">التحليلات</h1>
          <p className="page-sub">من بياناتك الحقيقية</p>
        </div>
        <button onClick={exportCSV} className="btn btn-ghost btn-sm"><Download size={15} /> CSV</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 700 }}>{k.label}</p>
              <div style={{ opacity: .75 }}><Sparkline data={k.spark} color={k.color} height={28} width={60} /></div>
            </div>
            <p style={{ fontSize: 18, fontWeight: 900, color: k.warn ? '#f87171' : 'var(--ink1)' }}>{k.value}</p>
            {k.hint && <p style={{ fontSize: 10.5, lineHeight: 1.5, marginTop: 5, color: k.warn ? '#f87171' : 'var(--ink3)' }}>{k.hint}</p>}
          </div>
        ))}
      </div>

      {/* ── Store traffic & visitors ── */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            👁️ زوّار المتجر <span style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600 }}>(آخر 30 يوم)</span>
          </h2>
        </div>

        {storeStats && (storeStats.totalVisits > 0 || storeStats.totalViews > 0) ? (
          <>
            {/* Visitor KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { l: 'زوّار فريدون', v: storeStats.uniqueVisitors || 0, c: '#00D2B3' },
                { l: 'إجمالي الزيارات', v: storeStats.totalVisits || 0, c: '#FF6A00' },
                { l: 'مشاهدات المنتجات', v: storeStats.totalViews || 0, c: '#a855f7' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '14px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{Number(s.v).toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>{s.l}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Most viewed products */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink2)', marginBottom: 12 }}>👀 الأكثر مشاهدة</h3>
                {storeStats.topViewed?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {storeStats.topViewed.slice(0, 5).map((p: any, i: number) => {
                      const max = storeStats.topViewed[0]?.views || 1;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 12.5, color: 'var(--ink1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{p.name || '—'}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--ink2)' }}>{p.views}</span>
                          </div>
                          <div className="progress-bar" style={{ height: 5 }}>
                            <div className="progress-fill" style={{ width: `${(p.views / max) * 100}%`, background: 'linear-gradient(90deg,#a855f7,#7C3AED)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: 'var(--ink3)', fontSize: 12.5, padding: '14px 0' }}>لا مشاهدات بعد</p>}
              </div>

              {/* Traffic sources */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink2)', marginBottom: 12 }}>🌐 مصدر الزيارة</h3>
                {storeStats.trafficSources?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {storeStats.trafficSources.slice(0, 6).map((s: any, i: number) => {
                      const meta = SOURCE_LABELS[s.source] || { label: s.source, icon: '🔗', color: '#8B96A8' };
                      const max = storeStats.trafficSources[0]?.count || 1;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 12.5, color: 'var(--ink1)', fontWeight: 600 }}>{meta.icon} {meta.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--ink2)' }}>{s.count}</span>
                          </div>
                          <div className="progress-bar" style={{ height: 5 }}>
                            <div className="progress-fill" style={{ width: `${(s.count / max) * 100}%`, background: meta.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: 'var(--ink3)', fontSize: 12.5, padding: '14px 0' }}>لا زيارات بعد</p>}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink3)' }}>
            <span style={{ fontSize: 36, opacity: 0.3, display: 'block', marginBottom: 8 }}>👁️</span>
            <p style={{ fontSize: 13.5 }}>لا بيانات زوّار بعد</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>شارك رابط متجرك — وسيظهر هنا من زار وأي منتج شاهد ومن أي منصة</p>
          </div>
        )}
      </div>

      {/* Revenue Bar Chart (Recharts) */}
      <div className="card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color="var(--clr-ok,#10b981)" /> الإيرادات الشهرية
          </h2>
          <div style={{ display: 'flex', gap: 5 }}>
            {([3,6,12] as Period[]).map(m => (
              <button key={m} onClick={() => setMonths(m)} className={`tab-btn ${months===m?'active':''}`} style={{ padding: '5px 12px', fontSize: 12.5 }}>{m} شهر</button>
            ))}
          </div>
        </div>
        {monthly.some(m => m.revenue > 0) ? (
          <Suspense fallback={<div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)' }}>جارٍ التحميل...</div>}>
            <RechartsBar data={monthly} currency={currency} />
          </Suspense>
        ) : (
          <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)', gap: 8 }}>
            <span style={{ fontSize: 40, opacity: 0.3 }}>📊</span>
            <p style={{ fontSize: 14 }}>لا توجد بيانات بعد</p>
          </div>
        )}
      </div>

      {/* Status Pie Chart + Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Status distribution — Pie chart */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart3 size={14} color="var(--ember)" /> حالات الطلبات
          </h2>
          {statusPieData.length > 0 ? (
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <RechartsPie data={statusPieData} />
            </Suspense>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)', fontSize: 13 }}>لا طلبات بعد</div>
          )}
        </div>

        {/* Top products */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)', marginBottom: 16 }}>🏆 أفضل المنتجات</h2>
          {topProds.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topProds.map((p, i) => (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink3)', width: 16 }}>#{i+1}</span>
                      <span style={{ fontSize: 18 }}>{p.emoji}</span>
                      <span style={{ fontSize: 13, color: 'var(--ink1)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{p.name}</span>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--ink1)' }}>{p.sales} مبيعة</p>
                      <p style={{ fontSize: 10.5, color: 'var(--ink3)', textAlign: 'left' }}>{(p.price * p.sales).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: 5 }}>
                    <div className="progress-fill" style={{ width: `${(p.sales / maxSales) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--ink3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>لا مبيعات بعد</p>}
        </div>
      </div>

      {/* Sources */}
      {Object.keys(sources).length > 0 && (
        <div className="card" style={{ padding: '18px 20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart3 size={15} color="var(--clr-ok,#10b981)" /> مصادر الطلبات
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(sources).sort((a,b)=>b[1].revenue-a[1].revenue).map(([name, data]) => (
              <div key={name}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink1)', fontWeight: 700 }}>{name}</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--ink1)' }}>{data.revenue.toLocaleString()} {currency}</p>
                    <p style={{ fontSize: 10.5, color: 'var(--ink3)', textAlign: 'left' }}>{data.orders} طلب</p>
                  </div>
                </div>
                <div className="progress-bar progress-accent" style={{ height: 5 }}>
                  <div className="progress-fill" style={{ width: `${(data.revenue / maxSrcRev) * 100}%`, background: 'linear-gradient(90deg,#FF6A00,#ef4444)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer stats */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)', marginBottom: 14 }}>إحصائيات الزبائن</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { l: 'إجمالي الزبائن', v: customers.length },
            { l: 'VIP', v: customers.filter(c=>c.vip).length },
            { l: 'متكررون (3+)', v: customers.filter(c=>c.totalOrders>=3).length },
            { l: `إجمالي مشترياتهم`, v: `${customers.reduce((s,c)=>s+c.totalSpent,0).toLocaleString()} ${currency}` },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink1)' }}>{s.v}</p>
              <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
