
function QuickOrderModal({ onClose, products, settings, addOrder, notify }: any) {
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', city: '', address: '',
    notes: '', items: [{ productId: '', productName: '', price: 0, quantity: 1, size: '', color: '' }]
  });
  const [loading, setLoading] = useState(false);
  const cur = settings.brand?.currency || 'MAD';
  const pubProducts = products.filter((p: any) => p.status === 'published');
  const total = form.items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', productName: '', price: 0, quantity: 1, size: '', color: '' }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => setForm(f => ({ ...f, items: f.items.map((item: any, i: number) => i === idx ? { ...item, [field]: value } : item) }));
  const selectProduct = (idx: number, productId: string) => {
    const p = pubProducts.find((x: any) => x.id === productId);
    if (p) updateItem(idx, 'productId', productId);
    if (p) updateItem(idx, 'productName', p.name);
    if (p) updateItem(idx, 'price', p.price);
  };

  const submit = async () => {
    if (!form.customerName || !form.customerPhone) { notify('error', 'الاسم والهاتف مطلوبان'); return; }
    if (form.items.some((i: any) => !i.productName)) { notify('error', 'أدخل منتجاً واحداً على الأقل'); return; }
    setLoading(true);
    try {
      await addOrder({ ...form, total, source: 'Manual', status: 'pending' });
      notify('success', '✅ تم إنشاء الطلب');
      onClose();
    } catch (e: any) { notify('error', e.message); }
    setLoading(false);
  };

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(6px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--panel)',borderRadius:'var(--r-xl)',width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',padding:22 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18 }}>
          <h2 style={{ fontSize:17,fontWeight:900,color:'var(--ink1)' }}>📞 طلب جديد (يدوي)</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--ink3)',cursor:'pointer',fontSize:18 }}>×</button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            <input className="input" placeholder="اسم الزبون *" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} />
            <input className="input" placeholder="رقم الهاتف *" value={form.customerPhone} onChange={e=>setForm(f=>({...f,customerPhone:e.target.value}))} dir="ltr" />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            <input className="input" placeholder="المدينة" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} />
            <input className="input" placeholder="العنوان" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
          </div>
          <div style={{ fontSize:12,fontWeight:700,color:'var(--ink3)',marginTop:6 }}>المنتجات</div>
          {form.items.map((item: any, idx: number) => (
            <div key={idx} style={{ display:'flex',gap:6,alignItems:'center' }}>
              <select value={item.productId} onChange={e=>selectProduct(idx,e.target.value)} style={{ flex:2,padding:'8px',borderRadius:8,background:'var(--void2)',border:'1px solid var(--border)',color:'var(--ink1)',fontSize:12 }}>
                <option value="">اختر منتج</option>
                {pubProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.price} {cur}</option>)}
              </select>
              <input type="number" min="1" value={item.quantity} onChange={e=>updateItem(idx,'quantity',+e.target.value)} style={{ width:56,padding:'8px',borderRadius:8,background:'var(--void2)',border:'1px solid var(--border)',color:'var(--ink1)',textAlign:'center',fontSize:12 }} />
              <input placeholder="مقاس" value={item.size} onChange={e=>updateItem(idx,'size',e.target.value)} style={{ width:64,padding:'8px',borderRadius:8,background:'var(--void2)',border:'1px solid var(--border)',color:'var(--ink2)',fontSize:11 }} />
              {form.items.length > 1 && <button onClick={()=>removeItem(idx)} style={{ width:28,height:28,borderRadius:7,background:'rgba(255,106,0,.1)',border:'none',cursor:'pointer',color:'var(--ember)',fontSize:14 }}>×</button>}
            </div>
          ))}
          <button onClick={addItem} style={{ padding:'7px',borderRadius:8,background:'var(--panel2)',border:'1px dashed var(--border2)',color:'var(--ink3)',cursor:'pointer',fontSize:12 }}>+ إضافة منتج آخر</button>
          <textarea className="textarea" rows={2} placeholder="ملاحظات..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ resize:'none' }} />
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--void2)',borderRadius:10 }}>
            <span style={{ fontSize:13,color:'var(--ink2)' }}>الإجمالي</span>
            <span style={{ fontSize:18,fontWeight:900,color:'var(--ember)' }}>{total.toLocaleString()} {cur}</span>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex:1 }}>إلغاء</button>
            <button onClick={submit} disabled={loading} className="btn btn-primary" style={{ flex:2,justifyContent:'center',gap:8 }}>
              {loading ? '...' : '💾 حفظ الطلب'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import React from 'react';
import { useStore } from '../store';
import { Search, ChevronDown, ChevronUp, CheckCircle, XCircle, Package, AlertTriangle, Bot, Loader2 } from 'lucide-react';

const STATUS_AR: Record<string, string> = { pending: 'بانتظار', pending_confirmation: 'تأكيد واتساب', approved: 'موافقة', processing: 'جارٍ', shipped: 'شُحن', delivered: 'وُصّل', cancelled: 'ملغي' };

function printOrder(order: any, settings: any, currency: string) {
  const brandName = settings.brand?.name || 'AMANZINE';
  const brandPhone = settings.brand?.phone || '';
  const brandLogo = settings.brand?.logo || '/brand/amanzine-logo.png';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>فاتورة — ${order.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; background: #f8f8f8; padding: 20px; color: #1a1a2e; }
  .invoice { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.1); }
  .header { background: linear-gradient(135deg, #FF6A00, #ff6b42); padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; }
  .header-logo { width: 60px; height: 60px; background: rgba(255,255,255,.15); border-radius: 14px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .header-logo img { width: 100%; height: 100%; object-fit: contain; }
  .header-info h1 { color: #fff; font-size: 24px; font-weight: 900; }
  .header-info p { color: rgba(255,255,255,.8); font-size: 13px; margin-top: 2px; }
  .header-badge { background: rgba(255,255,255,.2); color: #fff; padding: 8px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; text-align: center; }
  .body { padding: 28px 32px; }
  .section-title { font-size: 11px; font-weight: 700; color: #999; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .info-box { background: #f8f8f8; border-radius: 10px; padding: 12px 14px; }
  .info-box label { font-size: 11px; color: #999; display: block; margin-bottom: 3px; }
  .info-box span { font-size: 14px; font-weight: 700; color: #1a1a2e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #f0f0f0; }
  th { padding: 10px 12px; text-align: right; font-size: 12px; color: #666; font-weight: 700; }
  td { padding: 12px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  tr:last-child td { border-bottom: none; }
  .totals { background: #f8f8f8; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .total-final { border-top: 2px solid #FF6A00; margin-top: 8px; padding-top: 10px; }
  .total-final span { font-size: 20px; font-weight: 900; color: #FF6A00; }
  .code-box { background: linear-gradient(135deg, #fff8f5, #fff3ee); border: 2px dashed #FF6A00; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px; }
  .code-box .code { font-size: 28px; font-weight: 900; letter-spacing: .15em; color: #FF6A00; font-family: monospace; }
  .code-box p { font-size: 11px; color: #999; margin-top: 4px; }
  .footer { background: #1a1a2e; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; }
  .footer span { color: rgba(255,255,255,.4); font-size: 11px; }
  .footer strong { color: #FF6A00; }
  @media print {
    body { padding: 0; background: #fff; }
    .invoice { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div style="display:flex;align-items:center;gap:14px">
      <div class="header-logo"><img src="${brandLogo}" alt="logo" onerror="this.style.display='none'"/></div>
      <div class="header-info">
        <h1>${brandName}</h1>
        <p>${brandPhone}</p>
      </div>
    </div>
    <div class="header-badge">
      فاتورة رقم<br/><strong style="font-size:16px">${order.id}</strong>
    </div>
  </div>

  <div class="body">
    <div class="section-title">معلومات الزبون</div>
    <div class="info-grid">
      <div class="info-box"><label>الاسم</label><span>${order.customerName}</span></div>
      <div class="info-box"><label>الهاتف</label><span dir="ltr">${order.customerPhone}</span></div>
      <div class="info-box"><label>المدينة</label><span>${order.city || '—'}</span></div>
      <div class="info-box"><label>العنوان</label><span>${order.address || '—'}</span></div>
    </div>

    ${(order as any).customerCode ? `
    <div class="code-box">
      <p>كود تتبع الطلب</p>
      <div class="code">${(order as any).customerCode}</div>
      <p>يمكن للزبون استخدام هذا الكود لمتابعة طلبه</p>
    </div>
    ` : ''}

    <div class="section-title">المنتجات</div>
    <table>
      <thead><tr><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>المبلغ</th></tr></thead>
      <tbody>
        ${(order.items || []).map((i: any) => `
          <tr>
            <td>${i.productName}</td>
            <td>${i.size || '—'}</td>
            <td>${i.color || '—'}</td>
            <td style="text-align:center">${i.quantity}</td>
            <td style="font-weight:700">${(i.price * i.quantity).toLocaleString()} ${currency}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>المجموع الفرعي</span><span>${order.total} ${currency}</span></div>
      <div class="total-row"><span>التوصيل</span><span>${order.deliveryProvider || 'مجاني'}</span></div>
      ${order.trackingNumber ? `<div class="total-row"><span>رقم التتبع</span><span dir="ltr">${order.trackingNumber}</span></div>` : ''}
      <div class="total-row total-final"><span style="font-weight:700;font-size:15px">الإجمالي</span><span>${order.total} ${currency}</span></div>
    </div>

    <div class="info-box" style="text-align:center;padding:14px">
      <label>تاريخ الطلب</label>
      <span>${new Date(order.createdAt).toLocaleDateString('ar-MA', {year:'numeric',month:'long',day:'numeric'})}</span>
    </div>
  </div>

  <div class="footer">
    <span>شكراً لثقتك في <strong>${brandName}</strong> 💛</span>
    <span>AMANZINE — كل كلمة عندها طريق</span>
  </div>
</div>
<script>setTimeout(()=>window.print(),500);</script>
</body>
</html>`;
  const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
}

function sendReceiptWhatsApp(order: any, settings: any, currency: string) {
  const brandName = settings.brand?.name || 'AMANZINE';
  const items = (order.items || []).map((i: any) =>
    `• ${i.productName} × ${i.quantity} = ${(i.price * i.quantity).toLocaleString()} ${currency}`
  ).join('\n');
  const msg = `🧾 *وصل طلبك — ${brandName}*\n\n`
    + `📦 رقم الطلب: *${order.id}*\n`
    + `👤 الاسم: ${order.customerName}\n`
    + `📍 المدينة: ${order.city || '—'}\n\n`
    + `*المنتجات:*\n${items}\n\n`
    + `💰 *الإجمالي: ${order.total} ${currency}*\n\n`
    + `شكراً لثقتك في ${brandName} 💛`;
  const phone = (order.customerPhone || '').replace(/\D/g, '');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function OrdersSkeleton() {
  const pulse: React.CSSProperties = { borderRadius: 10, background: 'var(--panel2)', animation: 'pulse-ember 1.6s ease-in-out infinite' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...pulse, height: 44 }} />
      <div style={{ ...pulse, height: 40 }} />
      {[1,2,3,4].map(i => <div key={i} style={{ ...pulse, height: 78 }} />)}
    </div>
  );
}

export default function OrdersPage() {
  const { orders, approveOrder, rejectOrder, shipOrder, deliverOrder, trackOrder, settings, notify, customers, products, addOrder, isLoading } = useStore();

  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [autoShipState, setAutoShipState] = useState<{id: string, step: number, msg: string, steps?: {label:string; ok:boolean; detail?:string; error?:string}[], real?: boolean} | null>(null);
  const [manualTrk, setManualTrk] = useState('');
  const [mainTab, setMainTab] = React.useState<'orders'|'customers'>('orders');
  const [showQuickOrder, setShowQuickOrder] = useState(false);

  // C-4: العائد الشرطي بعد تنفيذ كل الـ hooks — لتفادي مخالفة Rules of Hooks (كراش عند تبدّل isLoading)
  if (isLoading) return <OrdersSkeleton />;
  const { currency } = settings.brand;

  const trustByPhone = orders.reduce((acc, o) => {
    const ph = o.customerPhone;
    if (!acc[ph]) acc[ph] = { d: 0, c: 0 };
    if (o.status === 'delivered') acc[ph].d++;
    if (o.status === 'cancelled') acc[ph].c++;
    return acc;
  }, {} as Record<string, { d: number; c: number }>);

  const getTrust = (phone: string) => {
    const s = trustByPhone[phone];
    if (!s) return null;
    const total = s.d + s.c;
    if (total < 2) return null;
    return Math.round((s.d / total) * 100);
  };

  const filtered = orders.filter(o => (filter === 'all' || o.status === filter) && (!search || o.customerName.includes(search) || o.id.includes(search) || o.city.includes(search)));
  const counts: Record<string, number> = { all: orders.length };
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  const pending = counts.pending || 0;

  // 🚚 الشحن عبر قناة الربط الحقيقية — كل خطوة معروضة تقابل حدثاً وقع فعلاً
  // على الخادم (API/Webhook)، ولا توجد أي خطوات تمثيلية.
  const runAutoDeliveryBot = async (order: any) => {
    setExpanded(order.id);
    setAutoShipState({ id: order.id, step: 1, msg: '📡 إرسال الطلب لقناة الربط الحقيقية (API/Webhook)...' });
    const r = await shipOrder(order.id);
    if (!r) { setAutoShipState(null); return; }
    if (r.real) {
      setAutoShipState({ id: order.id, step: 4, real: true, steps: r.steps,
        msg: `✅ شحنة حقيقية لدى ${r.provider} — رقم التتبع من الشركة: ${r.tracking}` });
    } else {
      setAutoShipState({ id: order.id, step: 4, real: false, steps: r.steps,
        msg: `⚠️ لم تُرسل فعلياً لشركة التوصيل — ${r.apiError || 'لا قناة ربط مهيأة'}. سُجّل تتبع داخلي ${r.tracking}. استخدم «الإدخال اليدوي» بالأسفل لإيصالها للشركة.` });
    }
  };

  // 📋 الإدخال اليدوي الصادق: نسخ بيانات الشحنة لإدخالها في موقع شركة بدون API
  const copyShipmentData = async (order: any) => {
    const text = [
      `الاسم: ${order.customerName}`,
      `الهاتف: ${order.customerPhone}`,
      `المدينة: ${order.city}`,
      `العنوان: ${order.address}`,
      `المنتجات: ${(order.items || []).map((i: any) => `${i.productName} ×${i.quantity}`).join('، ')}`,
      `المبلغ عند الاستلام (COD): ${order.total} ${currency}`,
      `مرجع الطلب: ${order.customerCode || order.id}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notify('success', '📋 نُسخت بيانات الشحنة — ألصقها في استمارة موقع شركة التوصيل');
    } catch {
      notify('error', '⚠️ تعذر النسخ التلقائي — انسخ البيانات من بطاقة الطلب يدوياً');
    }
  };

  const colDefs = [
    { key: 'pending', label: 'بانتظار', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
    { key: 'pending_confirmation', label: 'تأكيد واتساب', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
    { key: 'approved', label: 'موافقة', color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
    { key: 'processing', label: 'جارٍ', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' },
    { key: 'shipped', label: 'شُحن', color: '#22d3ee', bg: 'rgba(6,182,212,0.1)' },
    { key: 'delivered', label: 'وُصّل', color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── MAIN TAB SWITCHER ── */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--panel2)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
        <button
          onClick={() => setMainTab('orders')}
          style={{
            flex: 1, padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: mainTab === 'orders' ? 'var(--panel3)' : 'transparent',
            color: mainTab === 'orders' ? 'var(--ink1)' : 'var(--ink3)',
            boxShadow: mainTab === 'orders' ? 'var(--shadow-xs)' : 'none',
            transition: 'all .15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          🛒 الطلبات
          {pending > 0 && (
            <span style={{ background: 'var(--ember)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '1px 6px', borderRadius: 99 }}>
              {pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab('customers')}
          style={{
            flex: 1, padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: mainTab === 'customers' ? 'var(--panel3)' : 'transparent',
            color: mainTab === 'customers' ? 'var(--ink1)' : 'var(--ink3)',
            boxShadow: mainTab === 'customers' ? 'var(--shadow-xs)' : 'none',
            transition: 'all .15s',
          }}
        >
          👥 الزبائن ({customers.length})
        </button>
      </div>

      {/* ── ORDERS TAB ── */}
      {mainTab === 'orders' && (
      <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">الطلبات</h1>
          <p className="page-sub">{pending > 0 ? `${pending} طلب ينتظر موافقتك` : 'لا طلبات معلقة'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowQuickOrder(true)} className="btn btn-ghost btn-sm">📞 طلب يدوي</button>
          <button onClick={() => setView(view === 'list' ? 'kanban' : 'list')} className="btn btn-ghost btn-sm">
            {view === 'list' ? '⊞ Kanban' : '☰ قائمة'}
          </button>
        </div>
      </div>

      {/* Alert */}
      {pending > 0 && (
        <button onClick={() => setFilter('pending')} className="card card-accent card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', width: '100%', textAlign: 'right', cursor: 'pointer' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} color="#fbbf24" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24' }}>بوابة الموافقة — {pending} طلب ينتظرك</p>
            <p style={{ fontSize: 12.5, color: 'rgba(251,191,36,0.55)', marginTop: 2 }}>AI جمع البيانات وأنشأ الطلبات — القرار النهائي لك</p>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 800, padding: '6px 14px', borderRadius: 20, background: '#f59e0b', color: '#000' }}>مراجعة الآن</span>
        </button>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="kanban-wrap">
          {colDefs.map(col => (
            <div key={col.key} className="kanban-col" style={{ borderTop: `3px solid ${col.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'block' }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: col.color }}>{col.label}</span>
                <span style={{ marginRight: 'auto', fontSize: 11, color: 'var(--txt-3)', fontWeight: 700 }}>{orders.filter(o => o.status === col.key).length}</span>
              </div>
              {orders.filter(o => o.status === col.key).map(o => (
                <div key={o.id} className="kanban-card">
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 4 }}>{o.customerName}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginBottom: 8 }}>{o.city} · {o.source}</p>
                  <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1)', marginBottom: 10 }}>{o.total} {currency}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {o.status === 'pending' && (<><button onClick={() => approveOrder(o.id)} className="btn btn-success btn-sm" style={{ flex: 1, justifyContent: 'center' }}>✅</button><button onClick={() => rejectOrder(o.id)} className="btn btn-danger btn-sm" style={{ paddingInline: 10 }}>✕</button></>)}
                    {o.status === 'approved' && <button onClick={() => runAutoDeliveryBot(o)} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}>🚚 إنشاء الشحنة</button>}
                    {o.status === 'shipped' && <button onClick={() => deliverOrder(o.id)} className="btn btn-success btn-sm" style={{ flex: 1, justifyContent: 'center' }}>📦 وُصّل</button>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (<>
        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)', pointerEvents: 'none' }} />
            <input className="input" style={{ paddingRight: 38 }} placeholder="بحث بالاسم، رقم الطلب، المدينة..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="tabs scroll-x">
            {([['all','الكل'],['pending','بانتظار'],['pending_confirmation','تأكيد واتساب'],['approved','موافقة'],['processing','جارٍ'],['shipped','شُحن'],['delivered','وُصّل'],['cancelled','ملغي']] as const).map(([f, l]) => (
              <button key={f} onClick={() => setFilter(f)} className={`tab-btn ${filter === f ? 'active' : ''}`} style={{ fontSize: 12.5 }}>
                {l} {counts[f] > 0 && <span style={{ opacity: .6 }}>{counts[f]}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(order => (
            <div key={order.id} className={`order-row ${order.status === 'pending' || order.status === 'pending_confirmation' ? 'pending' : ''} ${expanded === order.id ? 'expanded' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <span className={`status status-${order.status}`} style={{ flexShrink: 0 }}>{STATUS_AR[order.status]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customerName}</p>
                    {order.needsReview && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#f87171', flexShrink: 0 }}>⚠ مراجعة</span>}
                    {/* Delivery Trust Score Badge — computed from history */}
                    {(() => {
                      const trust = getTrust(order.customerPhone);
                      if (trust === null) return null;
                      const color = trust >= 80 ? '#34d399' : trust >= 50 ? '#fbbf24' : '#f87171';
                      const bg    = trust >= 80 ? 'rgba(16,185,129,0.1)' : trust >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(248,113,113,0.1)';
                      return <span style={{ fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 4, background: bg, color, border: `1px solid ${color}33` }}>🛡️ TRUST: {trust}%</span>;
                    })()}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--txt-3)' }}>{order.customerPhone} · {order.city} · {order.source}</p>
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1)' }}>{order.total} {currency}</p>
                  <p style={{ fontSize: 11, color: 'var(--txt-3)', textAlign: 'left' }}>{order.items.length} منتج</p>
                </div>
                {expanded === order.id ? <ChevronUp size={16} color="var(--txt-3)" /> : <ChevronDown size={16} color="var(--txt-3)" />}
              </div>

              {expanded === order.id && (
                <div className="anim-fade-in" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--clr-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  
                  {/* 🚚 معالج الشحن الصادق — خطوات حقيقية من الخادم، لا تمثيل */}
                  {autoShipState?.id === order.id && (
                    <div style={{ padding: 18, borderRadius: 16, background: autoShipState.real === false ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.1)', border: `1px solid ${autoShipState.real === false ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: autoShipState.real === false ? '#fbbf24' : '#a5b4fc', fontSize: 13.5, fontWeight: 700, marginBottom: 10, lineHeight: 1.6 }}>
                        {autoShipState.step < 4 ? <Loader2 className="spin" size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : autoShipState.real ? <CheckCircle size={18} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} /> : <span style={{ flexShrink: 0 }}>⚠️</span>}
                        <span>{autoShipState.msg}</span>
                      </div>
                      {/* كل سطر هنا حدث وقع فعلاً على الخادم — ✓ نجح أو ✗ فشل بسببه */}
                      {!!autoShipState.steps?.length && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.25)' }}>
                          {autoShipState.steps.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.6 }}>
                              <span style={{ color: s.ok ? '#34d399' : '#f87171', fontWeight: 900, flexShrink: 0 }}>{s.ok ? '✓' : '✗'}</span>
                              <span style={{ color: 'var(--txt-1)' }}>
                                {s.label}
                                {s.detail && <span style={{ color: '#34d399', fontWeight: 700 }}> — {s.detail}</span>}
                                {s.error && <span style={{ color: '#f87171' }}> — {s.error}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
                        <div style={{ height: '100%', background: autoShipState.real === false ? '#f59e0b' : '#6366f1', width: `${(autoShipState.step / 4) * 100}%`, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )}

                  {/* 📋 الإدخال اليدوي — للشركات بدون ربط API: انسخ، أدخل في موقعها، ألصق رقم التتبع الحقيقي */}
                  {(order.status === 'approved' || (autoShipState?.id === order.id && autoShipState.real === false)) && (
                    <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--clr-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--txt-1)' }}>📋 الإدخال اليدوي لدى شركة بدون ربط API</p>
                      <p style={{ fontSize: 11.5, color: 'var(--txt-3)', lineHeight: 1.7 }}>انسخ بيانات الشحنة، أدخلها في موقع شركة التوصيل بنفسك، ثم ألصق هنا <b>رقم التتبع الحقيقي</b> الذي أعطتك إياه الشركة — يُحفظ في الطلب ويظهر للزبون في صفحة التتبع.</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => copyShipmentData(order)} className="btn btn-ghost btn-sm" style={{ flex: 1, minWidth: 150, justifyContent: 'center' }}>📋 نسخ بيانات الشحنة</button>
                        <input
                          value={expanded === order.id ? manualTrk : ''}
                          onChange={e => setManualTrk(e.target.value)}
                          placeholder="ألصق رقم التتبع الحقيقي هنا..."
                          className="input"
                          style={{ flex: 2, minWidth: 170, fontSize: 12 }}
                          dir="ltr"
                        />
                        <button
                          onClick={async () => { const t = manualTrk.trim(); if (!t) return; await shipOrder(order.id, order.deliveryProvider || settings.delivery?.defaultProvider, t); setManualTrk(''); setAutoShipState(null); setExpanded(null); }}
                          disabled={!manualTrk.trim()}
                          className="btn btn-success btn-sm"
                          style={{ minWidth: 130, justifyContent: 'center', opacity: manualTrk.trim() ? 1 : 0.5 }}
                        >✅ حفظ الشحن بالرقم الحقيقي</button>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {order.items.map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--clr-border)' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)' }}>{item.productName}</p>
                          <p style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>الكمية: {item.quantity} {item.size ? `· مقاس ${item.size}` : ''} {item.color ? `· لون ${item.color}` : ''}</p>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--txt-1)' }}>{item.price * item.quantity} {currency}</p>
                      </div>
                    ))}
                  </div>

                  {/* Address + Tracking */}
                  <div style={{ display: 'grid', gridTemplateColumns: order.trackingNumber ? '1fr 1fr' : '1fr', gap: 10 }}>
                    <div style={{ padding: '10px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--clr-border)' }}>
                      <p style={{ fontSize: 11, color: 'var(--txt-3)', fontWeight: 700, marginBottom: 4 }}>العنوان</p>
                      <p style={{ fontSize: 13, color: 'var(--txt-1)' }}>{order.address}, {order.city}</p>
                      <p style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{order.customerPhone}</p>
                    </div>
                    {order.trackingNumber && (
                      <div style={{ padding: '10px 13px', borderRadius: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.22)' }}>
                        <p style={{ fontSize: 11, color: '#34d399', fontWeight: 700, marginBottom: 4 }}>رقم التتبع</p>
                        <p style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: '#34d399' }}>{order.trackingNumber}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 2 }}>{order.deliveryProvider}</p>
                        {order.livoOrderId && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => trackOrder(order.id)}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11, padding: '4px 10px' }}
                            >🔄 تحديث حالة الشحن</button>
                            {order.deliveryStatus && (
                              <span style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
                                {order.deliveryStatus}
                                {order.deliverySyncedAt && ` · ${new Date(order.deliverySyncedAt).toLocaleTimeString('ar')}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {order.status === 'pending_confirmation' && (
                      <button onClick={() => { approveOrder(order.id); setExpanded(null); }} className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }}>
                        <CheckCircle size={15} /> تأكيد موافقة الزبون (جاءت عبر واتساب)
                      </button>
                    )}
                    {order.status === 'pending' && (<>
                      <button onClick={() => { approveOrder(order.id); setExpanded(null); }} className="btn btn-success" style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
                        <CheckCircle size={15} /> موافقة مباشرة
                      </button>
                      <button onClick={() => { rejectOrder(order.id); setExpanded(null); }} className="btn btn-danger" style={{ paddingInline: 16 }}>
                        <XCircle size={15} />
                      </button>
                    </>)}
                    {order.status === 'approved' && (
                      <button onClick={() => runAutoDeliveryBot(order)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}>
                        <Bot size={15} /> إنشاء الشحنة عبر الربط الحقيقي (API/Webhook)
                      </button>
                    )}
                    {order.status === 'shipped' && <button onClick={() => { deliverOrder(order.id); setExpanded(null); }} className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }}><Package size={15} /> تأكيد التوصيل</button>}
                    <button onClick={() => printOrder(order, settings, currency)} className="btn btn-ghost btn-sm" style={{ paddingInline: 14 }}>🖨️ طباعة</button>
                    {order.customerPhone && (
                      <button onClick={() => sendReceiptWhatsApp(order, settings, currency)} className="btn btn-ghost btn-sm" style={{ paddingInline: 14, color: '#25D366', borderColor: 'rgba(37,211,102,.3)' }}>
                        💬 إرسال الوصل للزبون
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <img src="/icons/orders.svg" onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display='block'; }} alt="" />
                  <span style={{ display: 'none', fontSize: 44 }}>🛒</span>
                </div>
                <div>
                  <p className="empty-state-title">لا توجد طلبات بعد</p>
                  <p className="empty-state-sub">شارك رابط متجرك مع زبائنك لاستقبال أول طلب</p>
                </div>
              </div>
            </div>
          )}
        </div>
      {showQuickOrder && (
        <QuickOrderModal
          onClose={() => setShowQuickOrder(false)}
          products={products}
          settings={settings}
          addOrder={addOrder}
          notify={notify}
        />
      )}
      </>)}
      </>
      )}

      {/* ── CUSTOMERS TAB ── */}
      {mainTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: 'إجمالي الزبائن', value: customers.length, icon: '👥' },
              { label: 'VIP', value: customers.filter((c:any) => c.vip).length, icon: '⭐' },
              { label: 'متكررون', value: customers.filter((c:any) => c.totalOrders >= 3).length, icon: '🔁' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink1)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Customer List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customers.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <p className="empty-state-title">لا يوجد زبائن بعد</p>
                  <p className="empty-state-sub">سيظهر الزبائن تلقائياً عند ورود الطلبات</p>
                </div>
              </div>
            ) : customers.map((c: any) => (
              <div key={c.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: c.vip ? 'linear-gradient(135deg,var(--gold),var(--gold2))' : 'var(--panel3)',
                  border: `1px solid ${c.vip ? 'var(--border-gold)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900,
                  color: c.vip ? '#1a1200' : 'var(--ink2)',
                }}>
                  {c.name?.slice(0, 1) || '؟'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink1)' }}>{c.name}</span>
                    {c.vip && <span className="badge badge-gold" style={{ fontSize: 9 }}>VIP ⭐</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                    {c.city} · {c.source} · {c.totalOrders} طلب
                  </div>
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink1)' }}>
                    {c.totalSpent?.toLocaleString() || 0} {currency}
                  </div>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g,'')}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: 'var(--mint)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      💬 واتساب
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
