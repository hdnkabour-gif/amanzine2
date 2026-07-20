import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Search, Package, ShoppingCart, Users, MessageCircle, X, Settings, Zap } from 'lucide-react';
import type { Page } from '../types';
import { MES } from '../lib/mes';

interface Result {
  type: 'product'|'order'|'customer'|'conversation'|'page';
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  page: Page;
  action?: () => void;
}

const PAGES: {q:string[];label:string;page:Page;icon:any;desc:string}[] = [
  { q:['dashboard','الرئيسية','لوحة'],label:'لوحة التحكم',page:'dashboard',icon:Zap,desc:'الإحصائيات والتقارير' },
  { q:['products','منتجات','إضافة منتج'],label:'المنتجات',page:'products',icon:Package,desc:'إدارة المنتجات والمخزون' },
  { q:['orders','طلبات','kanban'],label:'الطلبات',page:'orders',icon:ShoppingCart,desc:'إدارة وتتبع الطلبات' },
  { q:['messages','رسائل','محادثات'],label:'الرسائل',page:'conversations',icon:MessageCircle,desc:'محادثات الزبائن + AI' },
  { q:['customers','زبائن','clients'],label:'الزبائن',page:'customers',icon:Users,desc:'CRM وإدارة الزبائن' },
  { q:['settings','إعدادات'],label:'الإعدادات',page:'settings',icon:Settings,desc:'إعدادات المتجر' },
];

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { products, orders, customers, conversations, settings, setPage } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cur = settings.brand?.currency || 'MAD';

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) { setResults([]); setSelected(0); return; }
    const res: Result[] = [];

    // Pages
    PAGES.filter(p => p.q.some(kw => kw.includes(q) || q.includes(kw))).forEach(p => {
      res.push({ type:'page', id:p.page, title:p.label, subtitle:p.desc, page:p.page });
    });

    // Products — search name, category, SKU, description, color
    products.filter(p =>
      p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) ||
      (p.colors||[]).some((c:string) => c.toLowerCase().includes(q))
    ).slice(0,5).forEach(p => {
      res.push({
        type:'product', id:p.id,
        title:`${p.emoji||'📦'} ${p.name}`,
        subtitle:`${p.price.toLocaleString()} ${cur} · ${p.category||'—'}`,
        meta: p.stock <= 3 ? '⚠️ مخزون منخفض' : p.status === 'published' ? '✅ منشور' : '📝 مسودة',
        page:'products'
      });
    });

    // Orders — search ID, name, phone, city, status
    orders.filter(o =>
      o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) ||
      o.customerPhone?.includes(q) || o.city?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q) || (o as any).customerCode?.toLowerCase().includes(q)
    ).slice(0,5).forEach(o => {
      const STATUS: Record<string,string> = { pending:'⏳', approved:'✅', shipped:'🚚', delivered:'📦', cancelled:'❌' };
      res.push({
        type:'order', id:o.id,
        title:`${STATUS[o.status]||'🔖'} ${o.id} — ${o.customerName}`,
        subtitle:`${o.total?.toLocaleString()} ${cur} · ${o.city||'—'}`,
        meta: o.customerPhone,
        page:'orders'
      });
    });

    // Customers — name, phone, city, email
    customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone?.includes(q) ||
      c.city?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    ).slice(0,4).forEach(c => {
      res.push({
        type:'customer', id:c.id,
        title:`${c.vip?'⭐':'👤'} ${c.name}`,
        subtitle:`${c.phone||'—'} · ${c.city||'—'}`,
        meta: `${c.totalOrders||0} طلب`,
        page:'customers'
      });
    });

    // Conversations — name, phone, last message
    conversations.filter((cv:any) =>
      cv.customerName?.toLowerCase().includes(q) || cv.customerPhone?.includes(q) ||
      cv.lastMessage?.toLowerCase().includes(q)
    ).slice(0,3).forEach((cv:any) => {
      res.push({
        type:'conversation', id:cv.id,
        title:`💬 ${cv.customerName}`,
        subtitle:cv.lastMessage?.slice(0,60)||'—',
        meta:cv.source,
        page:'conversations'
      });
    });

    setResults(res.slice(0,12));
    setSelected(0);
  }, [query, products, orders, customers, conversations, cur]);

  const go = (r: Result) => { r.action?.(); setPage(r.page); onClose(); };

  const TYPE_ICON: Record<string,any> = { product:Package, order:ShoppingCart, customer:Users, conversation:MessageCircle, page:Zap };
  const TYPE_COLOR: Record<string,string> = { product:'#a78bfa', order:'#60a5fa', customer:'#34d399', conversation:'#fbbf24', page:'#FF6A00' };
  const TYPE_LABEL: Record<string,string> = { product:'منتج', order:'طلب', customer:'زبون', conversation:'رسالة', page:'صفحة' };

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(8px)',zIndex:500,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'10vh 16px 0' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%',maxWidth:580,borderRadius:20,overflow:'hidden',background:'var(--panel)',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 24px 80px rgba(0,0,0,.6)' }}>

        {/* Search input */}
        <div style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid var(--border)' }}>
          <Search size={18} style={{ color:'var(--ink3)',flexShrink:0 }}/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="ابحث عن منتج، طلب، زبون، رقم هاتف..."
            style={{ flex:1,background:'transparent',border:'none',color:'var(--ink1)',fontSize:15,outline:'none',direction:'rtl' }}
            onKeyDown={e => {
              if (e.key==='Escape') onClose();
              if (e.key==='ArrowDown') { e.preventDefault(); setSelected(s=>Math.min(s+1,results.length-1)); }
              if (e.key==='ArrowUp') { e.preventDefault(); setSelected(s=>Math.max(s-1,0)); }
              if (e.key==='Enter' && results[selected]) go(results[selected]);
            }}
          />
          {query && <button onClick={()=>setQuery('')} style={{ background:'none',border:'none',color:'var(--ink3)',cursor:'pointer',display:'flex' }}><X size={15}/></button>}
          <button onClick={onClose} style={{ background:'var(--void2)',border:'1px solid var(--border)',borderRadius:7,color:'var(--ink3)',cursor:'pointer',fontSize:11,padding:'3px 8px' }}>ESC</button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div style={{ maxHeight:'60vh',overflowY:'auto' }}>
            {results.map((r, i) => {
              const Icon = TYPE_ICON[r.type];
              const color = TYPE_COLOR[r.type];
              return (
                <button key={`${r.type}-${r.id}`} onClick={()=>go(r)}
                  style={{ width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 16px',border:'none',background:selected===i?'rgba(255,255,255,.06)':'transparent',cursor:'pointer',borderBottom:'1px solid var(--border)',textAlign:'right',transition:'background .1s' }}
                  onMouseEnter={()=>setSelected(i)}>
                  <div style={{ width:32,height:32,borderRadius:9,background:`${color}18`,border:`1px solid ${color}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color }}>
                    <Icon size={15}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'var(--ink1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{r.title}</div>
                    <div style={{ fontSize:11,color:'var(--ink3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{r.subtitle}</div>
                  </div>
                  <div style={{ display:'flex',gap:6,alignItems:'center',flexShrink:0 }}>
                    {r.meta && <span style={{ fontSize:10,color:'var(--ink3)' }} dir="ltr">{r.meta}</span>}
                    <span style={{ fontSize:10,padding:'2px 7px',borderRadius:99,background:`${color}18`,color,fontWeight:700,border:`1px solid ${color}30` }}>
                      {TYPE_LABEL[r.type]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : query.trim() ? (
          <div style={{ padding:'32px 16px',textAlign:'center',color:'var(--ink3)',fontSize:14,lineHeight:1.7 }}>
            <div style={{ fontSize:30,opacity:.4,marginBottom:8 }}>🔎</div>
            <div style={{ color:'var(--ink1)',fontWeight:700 }}>{MES.noResults(query)}</div>
            <div style={{ fontSize:12.5,marginTop:5 }}>{MES.tryWider}</div>
          </div>
        ) : (
          <div style={{ padding:'16px' }}>
            <div style={{ fontSize:11,color:'var(--ink3)',fontWeight:700,marginBottom:10,letterSpacing:'.06em' }}>البحث السريع</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:7 }}>
              {[
                { label:'📦 المنتجات', page:'products' as Page },
                { label:'🛒 الطلبات', page:'orders' as Page },
                { label:'👥 الزبائن', page:'customers' as Page },
                { label:'💬 الرسائل', page:'conversations' as Page },
                { label:'📊 التحليلات', page:'analytics' as Page },
              ].map(s => (
                <button key={s.page} onClick={()=>{setPage(s.page);onClose();}}
                  style={{ padding:'6px 14px',borderRadius:99,background:'var(--void2)',border:'1px solid var(--border)',color:'var(--ink2)',fontSize:12,fontWeight:600,cursor:'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop:14,fontSize:11,color:'var(--ink3)',textAlign:'center' }}>
              ⬆⬇ للتنقل · Enter للاختيار · ESC للإغلاق
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
