'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../database');

// POST /api/analytics/track — PUBLIC: record a storefront visit or product view
router.post('/track', async (req, res) => {
  try {
    const { userId, type, productId, productName, source, sessionId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const ev = {
      userId,
      type: type === 'view' ? 'view' : 'visit',
      productId: productId || '',
      productName: productName || '',
      source: (source || 'direct').slice(0, 40),
      sessionId: (sessionId || '').slice(0, 60),
    };
    await db.addStoreEvent(ev);
    // H-6: لا تُضخَّم مشاهدات منتج إلا إذا كان فعلاً ضمن هذا المتجر
    if (ev.type === 'view' && ev.productId) {
      const p = await db.getProduct(ev.productId).catch(() => null);
      if (p && p.userId === ev.userId) await db.incrementProductViews(ev.productId);
      // جسرٌ إلى الناقل: مشاهداتُ المنتجات كانت تُخزَّن في `store_events` وحدها
      // ولا تصل حلقةَ التعلّم، فبقيت مرحلةُ `view` في القمع صفرًا رغم امتلاء
      // الجدول. مسارُ قياسٍ واحدٌ لا اثنان.
      try {
        require('../lib/engines/activity').emit({
          businessId: `store:${ev.userId}`, actor: 'visitor',
          type: 'product.viewed', category: 'product', visibility: 'private',
          payload: { productId: ev.productId, name: ev.productName || undefined, source: ev.source },
        });
      } catch { /* القياسُ لا يُسقط زيارة */ }
    }
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false }); }
});

// GET /api/analytics/store — visitor & view analytics for the merchant
router.get('/store', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
    const events = await db.getStoreEvents(uid, days);

    const visits = events.filter(e => e.type === 'visit');
    const views  = events.filter(e => e.type === 'view');
    const sessions = new Set(events.map(e => e.session_id).filter(Boolean));

    // Traffic sources (from visits)
    const sourceMap = {};
    visits.forEach(v => { const s = v.source || 'direct'; sourceMap[s] = (sourceMap[s] || 0) + 1; });
    const trafficSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count }));

    // Most viewed products
    const viewMap = {};
    views.forEach(v => {
      const key = v.product_id || v.product_name;
      if (!key) return;
      if (!viewMap[key]) viewMap[key] = { id: v.product_id, name: v.product_name || v.product_id, views: 0 };
      viewMap[key].views++;
    });
    const topViewed = Object.values(viewMap).sort((a, b) => b.views - a.views).slice(0, 8);

    // Visits over last 14 days
    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayVisits = visits.filter(v => new Date(v.created_at).toISOString().startsWith(dateStr));
      const daySessions = new Set(dayVisits.map(v => v.session_id).filter(Boolean));
      return { date: dateStr, visits: dayVisits.length, visitors: daySessions.size };
    });

    res.json({
      totalVisits: visits.length,
      uniqueVisitors: sessions.size,
      totalViews: views.length,
      trafficSources,
      topViewed,
      daily,
      rangeDays: days,
    });
  } catch (e) { console.error('[analytics/store]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const uid      = req.user.id;
    const products = await db.getProducts(uid);
    const orders   = await db.getOrders(uid);
    const customers= await db.getCustomers(uid);
    const settings = await db.getSettings(uid) || {};
    const currency = settings.brand?.currency || 'MAD';

    const active  = orders.filter(o => o.status !== 'cancelled');
    const revenue = active.reduce((s, o) => s + (o.total || 0), 0);
    const cost    = active.reduce((s, o) => s + (o.items || []).reduce((sum, item) => {
      const p = products.find(x => x.id === item.productId);
      return sum + (p?.cost || 0) * (item.quantity || 1);
    }, 0), 0);

    // Last 12 months
    const now = new Date();
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = d.toLocaleString('ar', { month: 'short' });
      const mo = active.filter(o => {
        const od = new Date(o.createdAt);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });
      return { label, revenue: mo.reduce((s,o) => s + (o.total||0), 0), count: mo.length };
    });

    // Top products by sales
    const topProducts = [...products].sort((a,b) => b.sales - a.sales).slice(0, 5);

    // Source distribution
    const sources = {};
    active.forEach(o => {
      if (!sources[o.source]) sources[o.source] = { orders: 0, revenue: 0 };
      sources[o.source].orders++;
      sources[o.source].revenue += (o.total || 0);
    });

    // Status distribution
    const statusDist = {};
    orders.forEach(o => { statusDist[o.status] = (statusDist[o.status] || 0) + 1; });

    // City distribution
    const cities = {};
    orders.forEach(o => {
      if (o.city) cities[o.city] = (cities[o.city] || 0) + 1;
    });
    const topCities = Object.entries(cities).sort(([,a],[,b]) => b-a).slice(0,5).map(([city,count]) => ({ city, count }));

    // Daily last 30 days
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayOrders = active.filter(o => o.createdAt?.startsWith(dateStr));
      return { date: dateStr, revenue: dayOrders.reduce((s,o) => s+(o.total||0),0), count: dayOrders.length };
    });

    res.json({
      revenue, cost, profit: revenue - cost,
      totalOrders: orders.length, activeOrders: active.length,
      avgOrder: active.length ? Math.round(revenue / active.length) : 0,
      deliveryRate: orders.length ? Math.round((orders.filter(o=>o.status==='delivered').length / orders.length) * 100) : 0,
      totalCustomers: customers.length,
      vipCustomers: customers.filter(c=>c.vip).length,
      repeatCustomers: customers.filter(c=>c.totalOrders>=3).length,
      publishedProducts: products.filter(p=>p.status==='published').length,
      lowStock: products.filter(p=>p.stock>0 && p.stock<=5).length,
      outOfStock: products.filter(p=>p.stock===0).length,
      monthly, daily, topProducts, sources, statusDist, topCities, currency,
    });
  } catch (e) { console.error('[analytics]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/analytics/funnel — conversion funnel
router.get('/funnel', auth, async (req, res) => {
  try {
    const orders = await db.getOrders(req.user.id);
    const products = await db.getProducts(req.user.id);

    const totalOrders = orders.length;
    const approved = orders.filter(o => ['approved','processing','shipped','delivered'].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total||0), 0);
    const avgOrder = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;

    // City distribution
    const cityMap = {};
    orders.forEach(o => { if (o.city) cityMap[o.city] = (cityMap[o.city]||0) + 1; });
    const cities = Object.entries(cityMap).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([city,count])=>({city,count}));

    // Product performance
    const productSales = {};
    orders.forEach(o => {
      (o.items||[]).forEach((item) => {
        if (!productSales[item.productId||item.productName]) {
          productSales[item.productId||item.productName] = { name:item.productName, sales:0, revenue:0 };
        }
        productSales[item.productId||item.productName].sales += item.quantity||1;
        productSales[item.productId||item.productName].revenue += (item.price||0)*(item.quantity||1);
      });
    });
    const topProducts = Object.values(productSales).sort((a,b)=>b.sales-a.sales).slice(0,5);

    res.json({
      funnel: {
        total: totalOrders,
        approved, delivered, cancelled,
        conversionRate: totalOrders > 0 ? Math.round((delivered/totalOrders)*100) : 0,
        approvalRate: totalOrders > 0 ? Math.round((approved/totalOrders)*100) : 0,
      },
      revenue: { total: revenue, avgOrder },
      cities, topProducts,
      lowStock: products.filter(p => p.status==='published' && p.stock <= 3).length,
      outOfStock: products.filter(p => p.status==='published' && p.stock === 0).length,
    });
  } catch (e) { console.error('[analytics/funnel]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
