import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, X, MessageCircle, Share2, Plus, Minus, Check,
  Package, Heart, Send, Bot, ArrowRight,
  Flame, Clock, MapPin,
  Camera, Gift, Sparkles, Star, Zap, ShoppingBag,
} from 'lucide-react';
import { type Lang, LANGS, isRtlLang } from '../i18n';
import { pt, initialPublicLang } from '../i18n/public';
import ProvidersBooking from '../components/ProvidersBooking'; // alloservix — حجز الخدمات للزبون

// لغة الزبون مضبوطة على مستوى الوحدة ليستعملها كل المكوّنات دون تمرير props.
// تُضبط في مكوّن Storefront الرئيسي قبل أن تُرسَم العناصر الأبناء.
let CURRENT_LANG: Lang = 'ar';
const T = (k: string, vars?: Record<string, string>) => pt(CURRENT_LANG, k, vars);

// مُبدّل لغة الزبون (علم + قائمة) — بألوان نظام تصميم المتجر
function StoreLangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} aria-label="language" style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '6px 9px', borderRadius: 999, background: DS.bgGlass, border: DS.glassBorder, color: DS.textSecondary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        <span style={{ fontSize: 14 }}>{cur.flag}</span><span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '120%', insetInlineEnd: 0, minWidth: 140, background: '#16161E', border: `1px solid ${DS.border}`, borderRadius: DS.radiusMd, overflow: 'hidden', boxShadow: DS.glassShadowHover, zIndex: 300 }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', background: l.code === lang ? DS.purpleSoft : 'transparent', border: 'none', color: l.code === lang ? DS.purpleLight : DS.textSecondary, fontSize: 13, fontWeight: l.code === lang ? 800 : 500, cursor: 'pointer', textAlign: isRtlLang(l.code) ? 'right' : 'left', fontFamily: 'Tajawal,sans-serif' }}>
              <span style={{ fontSize: 15 }}>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ TYPES
interface CustomField { id:string; label:string; type:string; options:string[]; value:string; }
interface SProduct {
  id:string; name:string; description:string; price:number; cost?:number;
  stock:number; category:string; sizes:string[]; colors:string[];
  status:string; emoji:string; imageUrl:string; images:string[]; videoUrl?:string; sku?:string;
  sales:number; views?:number; colorImages?:Record<string,string>; createdAt?:string;
  type?:'product'|'service'|'digital'; duration?:string; workArea?:string; portfolio?:string[];
  customFields?:CustomField[];
}
interface CartItem {
  product:SProduct; quantity:number; size:string; color:string;
  giftWrap?:boolean; giftMessage?:string;
}
interface StoreInfo {
  brand:{name:string;phone:string;currency:string;logo?:string;description?:string;
         instagram?:string;facebook?:string;whatsapp?:string;email?:string;
         workStart?:string;workEnd?:string;address?:string};
  deliveryCosts?:Record<string,number>;
  promotions?:{
    freeShippingThreshold:number;
    bundle:{enabled:boolean;minItems:number;percent:number};
    wheel:{enabled:boolean;minOrder:number};
  };
  hcaptchaSiteKey?:string; // حماية البوتات — يظهر الودجت في الدفع إن وُجد
}
interface ChatSuggestion { id:string; name:string; price:number; emoji?:string; imageUrl?:string; type?:string; }
interface ChatMsg { role:'user'|'ai'; content:string; product?:SProduct; products?:ChatSuggestion[]; }

// ═══════════════════════════════════════════════════════════════ CONSTANTS
const MOROCCAN_CITIES = [
  'الدار البيضاء','الرباط','فاس','مراكش','طنجة','أكادير','مكناس','وجدة',
  'سلا','تطوان','القنيطرة','الجديدة','بني ملال','خريبكة','تازة','نادور',
  'الحسيمة','برشيد','سطات','آسفي','الرحامنة','قلعة السراغنة','خنيفرة',
  'إفران','ورزازات','زاكورة','الراشيدية','فييكيك','طاطا','ميدلت',
];

const DEFAULT_COSTS: Record<string,number> = {
  'الدار البيضاء':20,'الرباط':25,'فاس':30,'مراكش':30,'طنجة':35,
  'أكادير':35,'مكناس':30,'وجدة':40,'سلا':25,'تطوان':35,
  'القنيطرة':30,'الجديدة':35,'بني ملال':40,
};

function getDeliveryCost(city:string, costs?:Record<string,number>):number {
  const allCosts = { ...DEFAULT_COSTS, ...(costs||{}) };
  for (const [k,v] of Object.entries(allCosts)) {
    if (city.includes(k)||k.includes(city)) return v;
  }
  return allCosts['default']||40;
}

function storeOpenStatus(workStart?:string,workEnd?:string):{open:boolean;workStart:string;workEnd:string}|null {
  if(!workStart||!workEnd) return null;
  const now=new Date();const cur=now.getHours()*60+now.getMinutes();
  const [sh,sm]=workStart.split(':').map(Number);const [eh,em]=workEnd.split(':').map(Number);
  if(isNaN(sh)||isNaN(eh)) return null;
  const start=sh*60+(sm||0);const end=eh*60+(em||0);
  const open=cur>=start&&cur<=end;
  return {open,workStart,workEnd};
}
// تسمية حالة المتجر باللغة الحالية
function storeStatusLabel(st:{open:boolean;workStart:string;workEnd:string}):string {
  return st.open?T('sf.openUntil',{time:st.workEnd}):T('sf.closedFrom',{time:st.workStart});
}

// ═══════════════════════════════════════════════════════════════ ANALYTICS
function detectSource():string {
  try {
    const p=new URLSearchParams(window.location.search);
    const utm=p.get('utm_source')||p.get('source');
    if(utm) return utm.toLowerCase();
    const ref=document.referrer||'';
    if(!ref) return 'direct';
    const h=new URL(ref).hostname.replace('www.','');
    if(h.includes('facebook')||h.includes('fb.')) return 'facebook';
    if(h.includes('instagram')) return 'instagram';
    if(h.includes('tiktok')) return 'tiktok';
    if(h.includes('google')) return 'google';
    if(h.includes('wa.me')||h.includes('whatsapp')) return 'whatsapp';
    return h||'direct';
  } catch { return 'direct'; }
}

function storeSessionId():string {
  try {
    let s=sessionStorage.getItem('amanzine_sid');
    if(!s){s=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem('amanzine_sid',s);}
    return s;
  } catch { return 'anon'; }
}

function trackStoreEvent(userId:string,type:'visit'|'view',product?:{id?:string;name?:string}) {
  if(!userId) return;
  try {
    fetch('/api/analytics/track',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userId,type,productId:product?.id||'',productName:product?.name||'',source:detectSource(),sessionId:storeSessionId()}),
      keepalive:true,
    }).catch(()=>{});
  } catch {}
}

// ═══════════════════════════════════════════════════════════════ HOOKS
function useStorefront(userId:string) {
  const [products,setProducts]=useState<SProduct[]>([]);
  const [storeInfo,setStoreInfo]=useState<StoreInfo|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!userId){setError(T('sf.errBadLink'));setLoading(false);return;}
    fetch(`/api/products/public/catalog?userId=${userId}`).then(r=>r.json())
      .then(c=>{setProducts(c.products||[]);setStoreInfo({brand:c.brand||{},deliveryCosts:c.deliveryCosts,promotions:c.promotions,hcaptchaSiteKey:c.hcaptchaSiteKey});setLoading(false);})
      .catch(()=>{setError(T('sf.errLoad'));setLoading(false);});
    try{const k=`amanzine_visit_${userId}`;if(!sessionStorage.getItem(k)){trackStoreEvent(userId,'visit');sessionStorage.setItem(k,'1');}}catch{}
  },[userId]);

  return {products,storeInfo,loading,error};
}

function useCart() {
  const [items,setItems]=useState<CartItem[]>(()=>{
    try{const s=localStorage.getItem('amanzine_cart');return s?JSON.parse(s):[];}catch{return [];}
  });

  useEffect(()=>{try{localStorage.setItem('amanzine_cart',JSON.stringify(items));}catch{}},[items]);

  const add=(product:SProduct,size:string,color:string,giftWrap?:boolean,giftMessage?:string)=>setItems(prev=>{
    const ex=prev.find(i=>i.product.id===product.id&&i.size===size&&i.color===color);
    if(ex) return prev.map(i=>i===ex?{...i,quantity:i.quantity+1}:i);
    return [...prev,{product,quantity:1,size,color,giftWrap,giftMessage}];
  });

  const remove=(pid:string,size:string,color:string)=>setItems(p=>p.filter(i=>!(i.product.id===pid&&i.size===size&&i.color===color)));

  const update=(pid:string,size:string,color:string,qty:number)=>setItems(p=>qty<=0?p.filter(i=>!(i.product.id===pid&&i.size===size&&i.color===color)):p.map(i=>(i.product.id===pid&&i.size===size&&i.color===color)?{...i,quantity:qty}:i));

  const toggleGift=(pid:string,size:string,color:string)=>setItems(p=>p.map(i=>(i.product.id===pid&&i.size===size&&i.color===color)?{...i,giftWrap:!i.giftWrap}:i));

  const setGiftMsg=(pid:string,size:string,color:string,msg:string)=>setItems(p=>p.map(i=>(i.product.id===pid&&i.size===size&&i.color===color)?{...i,giftMessage:msg}:i));

  const total=items.reduce((s,i)=>s+i.product.price*i.quantity+(i.giftWrap?15:0),0);
  const count=items.reduce((s,i)=>s+i.quantity,0);
  const clear=()=>setItems([]);

  return {items,add,remove,update,total,count,clear,toggleGift,setGiftMsg};
}

// ═══════════════════════════════════════════════════════════════ DESIGN SYSTEM
const DS = {
  purple: '#7C3AED',
  purpleLight: '#A855F7',
  purpleGlow: 'rgba(124,58,237,0.25)',
  purpleSoft: 'rgba(124,58,237,0.12)',
  orange: '#FF7A00',
  orangeLight: '#FFB347',
  orangeGlow: 'rgba(255,122,0,0.25)',
  orangeSoft: 'rgba(255,122,0,0.12)',
  bg: '#0A0A14',
  bgCard: 'rgba(255,255,255,0.06)',
  bgCardHover: 'rgba(255,255,255,0.10)',
  bgGlass: 'rgba(255,255,255,0.07)',
  bgInput: 'rgba(255,255,255,0.05)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  textTertiary: 'rgba(255,255,255,0.45)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.14)',
  borderPurple: 'rgba(124,58,237,0.3)',
  borderOrange: 'rgba(255,122,0,0.3)',
  glassBg: 'rgba(255,255,255,0.08)',
  glassBlur: 'blur(24px)',
  glassBorder: '1px solid rgba(255,255,255,0.08)',
  glassShadow: '0 8px 40px rgba(0,0,0,0.25)',
  glassShadowHover: '0 16px 56px rgba(0,0,0,0.35)',
  radiusXs: 8,
  radiusSm: 12,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 24,
  radiusFull: 9999,
  transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
  transitionFast: 'all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
};

// ═══════════════════════════════════════════════════════════════ ANIMATED BACKGROUND
function AnimatedBackground() {
  return (
    <div style={{position:'fixed',inset:0,zIndex:0,overflow:'hidden',pointerEvents:'none'}}>
      <div style={{
        position:'absolute',top:'-20%',right:'-10%',width:'60vw',height:'60vw',maxWidth:600,maxHeight:600,
        borderRadius:'50%',background:'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        animation:'bgFloat1 12s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute',bottom:'-15%',left:'-5%',width:'50vw',height:'50vw',maxWidth:500,maxHeight:500,
        borderRadius:'50%',background:'radial-gradient(circle, rgba(255,122,0,0.12) 0%, transparent 70%)',
        animation:'bgFloat2 15s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute',top:'40%',left:'-8%',width:'30vw',height:'30vw',maxWidth:350,maxHeight:350,
        borderRadius:'50%',background:'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        animation:'bgFloat3 18s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute',inset:0,opacity:0.03,
        backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
        backgroundSize:'40px 40px',
      }}/>
      <style>{`
        @keyframes bgFloat1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-30px) scale(1.05)}66%{transform:translate(-20px,20px) scale(0.95)}}
        @keyframes bgFloat2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-25px,-20px) scale(1.08)}66%{transform:translate(20px,25px) scale(0.92)}}
        @keyframes bgFloat3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(15px,-25px) scale(1.06)}}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ SKELETON
function PageSkeleton() {
  return (
    <div style={{minHeight:'100dvh',background:DS.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,gap:24,position:'relative',zIndex:1}}>
      <div style={{width:56,height:56,borderRadius:16,overflow:'hidden',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',animation:'logoGlow 1.8s ease infinite'}}>
        <img src="/brand/amanzine-logo.png" alt="AMANZINE" style={{width:'100%',height:'100%',objectFit:'contain'}}
          onError={e=>{const img=e.currentTarget as HTMLImageElement;img.style.display='none';(img.parentElement as HTMLElement).innerHTML='<span style="font-size:24px;font-weight:900;color:#006233">A</span>';}}/>
      </div>
      <style>{`@keyframes logoGlow{0%,100%{transform:scale(1);box-shadow:0 0 20px rgba(0,98,51,.18)}50%{transform:scale(1.05);box-shadow:0 0 40px rgba(0,98,51,.42)}}`}</style>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:16,fontWeight:900,color:DS.textPrimary}}>{T('sf.welcome')}</div>
        <div style={{fontSize:12,color:DS.textTertiary,marginTop:8,lineHeight:1.8,fontWeight:600}}>{T('sf.loading1')}<br/>{T('sf.loading2')}</div>
      </div>
      <div style={{width:160,height:10,borderRadius:DS.radiusFull,background:DS.bgGlass,animation:'skeletonPulse 1.5s ease infinite'}}/>
      <style>{`@keyframes skeletonPulse{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ LIVE TICKER
function LiveTicker({orders}:{orders:{name:string;city:string;product:string;time:string}[]}) {
  if(!orders.length) return null;
  return (
    <div style={{position:'fixed',bottom:100,left:16,right:16,zIndex:180,pointerEvents:'none',display:'flex',justifyContent:'center'}}>
      <div style={{
        background:DS.glassBg,backdropFilter:DS.glassBlur,WebkitBackdropFilter:DS.glassBlur,
        border:DS.glassBorder,borderRadius:DS.radiusFull,padding:'10px 20px',
        color:DS.textPrimary,fontSize:12,fontWeight:500,display:'flex',alignItems:'center',gap:8,
        boxShadow:DS.glassShadow,animation:'tickerIn 0.4s ease, tickerOut 0.4s ease 4.6s forwards',
        maxWidth:'90%',overflow:'hidden',whiteSpace:'nowrap',
      }}>
        <span style={{width:8,height:8,borderRadius:'50%',background:DS.orange,flexShrink:0,animation:'livePulse 1.5s ease infinite',boxShadow:`0 0 8px ${DS.orangeGlow}`}}/>
        <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>
          <strong style={{color:DS.orangeLight}}>{orders[0].name}</strong> {T('sf.tickerInfo',{city:orders[0].city,product:orders[0].product,time:orders[0].time})}
        </span>
      </div>
      <style>{`
        @keyframes tickerIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tickerOut{to{opacity:0;transform:translateY(-8px)}}
        @keyframes livePulse{0%,100%{box-shadow:0 0 0 0 ${DS.orangeGlow}}50%{box-shadow:0 0 0 8px rgba(255,122,0,0)}}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ PRODUCT CARD
function ProductCard({p,onAdd,onView,currency}:{p:SProduct;onAdd:(p:SProduct)=>void;onView:(p:SProduct)=>void;currency:string}) {
  const [hover,setHover]=useState(false);
  const [imgIdx,setImgIdx]=useState(0);
  const [liked,setLiked]=useState(()=>{try{return JSON.parse(localStorage.getItem('amanzine_wishlist')||'[]').includes(p.id);}catch{return false;}});
  const [addedFlash,setAddedFlash]=useState(false);
  const imgs=[p.imageUrl,...(p.images||[])].filter(Boolean);
  const isNew=p.createdAt&&(Date.now()-new Date(p.createdAt).getTime()<7*24*60*60*1000);
  const discount=p.cost&&p.cost>p.price?Math.round((1-p.price/p.cost)*100):0;
  const rating=p.sales>20?5:p.sales>10?4:p.sales>3?4:3;
  const madeInMA=p.customFields?.some(f=>f.type==='boolean'&&f.value==='true'&&f.label.includes('صنع في المغرب'));

  const toggleLike=(e:React.MouseEvent)=>{e.stopPropagation();const wl:string[]=JSON.parse(localStorage.getItem('amanzine_wishlist')||'[]');localStorage.setItem('amanzine_wishlist',JSON.stringify(liked?wl.filter(x=>x!==p.id):[...wl,p.id]));setLiked(!liked);};
  const quickAdd=(e:React.MouseEvent)=>{e.stopPropagation();if(p.stock>0||p.type==='service'||p.type==='digital'){onAdd(p);setAddedFlash(true);setTimeout(()=>setAddedFlash(false),900);}};

  return (
    <div onClick={()=>onView(p)} onMouseEnter={()=>{setHover(true);if(imgs.length>1)setImgIdx(1);}} onMouseLeave={()=>{setHover(false);setImgIdx(0);}}
      style={{background:DS.glassBg,backdropFilter:DS.glassBlur,WebkitBackdropFilter:DS.glassBlur,border:DS.glassBorder,borderRadius:DS.radiusLg,overflow:'hidden',cursor:'pointer',boxShadow:hover?DS.glassShadowHover:DS.glassShadow,transform:hover?'translateY(-4px)':'none',transition:DS.transition,position:'relative'}}>
      <div style={{aspectRatio:'3/4',position:'relative',background:DS.bgGlass,overflow:'hidden'}}>
        {imgs.length>0?<img src={imgs[imgIdx]} alt={p.name} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.5s ease',transform:hover?'scale(1.06)':'scale(1)'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,color:DS.textTertiary}}>{p.emoji||'📦'}</div>}
        <div style={{position:'absolute',top:0,left:0,right:0,height:'30%',background:'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'50%',background:'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',opacity:hover?1:0,transition:'opacity 0.3s',display:'flex',alignItems:'flex-end',padding:14}}>
          <button onClick={e=>{e.stopPropagation();quickAdd(e);}} style={{width:'100%',padding:'12px',borderRadius:DS.radiusFull,background:addedFlash?`linear-gradient(135deg, #10B981, #059669)`:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:addedFlash?'0 4px 20px rgba(16,185,129,0.3)':`0 4px 20px ${DS.purpleGlow}`,transition:DS.transitionFast}}>
            {addedFlash?<><Check size={15}/> {T('sf.added')}</>:<><ShoppingCart size={15}/> {T('sf.addToCart')}</>}
          </button>
        </div>
        <div style={{position:'absolute',top:12,left:12,display:'flex',gap:6,flexWrap:'wrap'}}>
          {isNew&&<span style={{background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,color:'#fff',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:DS.radiusFull,boxShadow:`0 2px 8px ${DS.purpleGlow}`}}>{T('sf.new')}</span>}
          {discount>0&&<span style={{background:'rgba(239,68,68,0.2)',backdropFilter:'blur(8px)',color:'#EF4444',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:DS.radiusFull,border:'1px solid rgba(239,68,68,0.3)'}}>-{discount}%</span>}
          {p.stock<=3&&p.stock>0&&<span style={{background:DS.orangeSoft,backdropFilter:'blur(8px)',color:DS.orangeLight,fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:DS.radiusFull,border:`1px solid ${DS.borderOrange}`}}>{T('sf.lastN',{n:String(p.stock)})}</span>}
          {p.stock===0&&<span style={{background:'rgba(255,255,255,0.06)',backdropFilter:'blur(8px)',color:DS.textTertiary,fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:DS.radiusFull,border:DS.glassBorder}}>{T('sf.soldOut')}</span>}
          {madeInMA&&<span style={{background:'rgba(34,197,94,0.2)',backdropFilter:'blur(8px)',color:'#22C55E',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:DS.radiusFull,border:'1px solid rgba(34,197,94,0.3)'}}>{T('sf.madeInMA')}</span>}
        </div>
        <button onClick={toggleLike} style={{position:'absolute',top:12,right:12,width:34,height:34,borderRadius:'50%',background:'rgba(0,0,0,0.4)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2,transition:DS.transitionFast,boxShadow:liked?'0 0 12px rgba(239,68,68,0.3)':'none'}}>
          <Heart size={14} fill={liked?'#EF4444':'none'} color={liked?'#EF4444':'#fff'}/>
        </button>
        {imgs.length>1&&<div style={{position:'absolute',bottom:12,right:12,display:'flex',gap:4}}>{imgs.map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:'50%',background:i===imgIdx?'#fff':'rgba(255,255,255,0.4)',transition:'background 0.3s',boxShadow:i===imgIdx?'0 0 6px rgba(255,255,255,0.5)':'none'}}/>)}</div>}
      </div>
      <div style={{padding:'14px 15px 16px'}}>
        <div style={{fontSize:10,color:DS.textTertiary,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:5}}>{p.category||'—'}</div>
        <div style={{fontSize:13,fontWeight:700,color:DS.textPrimary,marginBottom:6,lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical'}}>{p.name}</div>
        {p.sales>0&&<div style={{display:'flex',alignItems:'center',gap:4,marginBottom:6}}><div style={{display:'flex',gap:1}}>{Array.from({length:5},(_,i)=><Star key={i} size={9} fill={i<rating?'#F59E0B':'none'} color={i<rating?'#F59E0B':'rgba(255,255,255,0.15)'}/>)}</div><span style={{fontSize:10,color:DS.textTertiary}}>({Math.min(p.sales*2,120)})</span></div>}
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}><span style={{fontSize:18,fontWeight:900,color:DS.textPrimary,letterSpacing:'-0.02em'}}>{p.price.toLocaleString()}</span><span style={{fontSize:11,fontWeight:400,color:DS.textTertiary}}>{currency}</span></div>
          {p.cost&&p.cost>p.price&&<span style={{fontSize:12,color:DS.textTertiary,textDecoration:'line-through'}}>{p.cost.toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ SERVICE CARD
function serviceIconFor(p:SProduct,sz=22) {
  const icons:Record<string,React.JSX.Element> = {
    'تصوير':<Camera size={sz}/>,
    'تصميم':<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
    'تنظيف':<Sparkles size={sz}/>,
    'توصيل':<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  };
  for(const [k,icon] of Object.entries(icons)){if(p.name.includes(k)||p.category?.includes(k)) return icon;}
  return <Zap size={sz}/>;
}

const cfv=(p:SProduct,id:string)=>p.customFields?.find(f=>f.id===id)?.value||'';

function ServiceCard({p,onView,currency}:{p:SProduct;onView:(p:SProduct)=>void;currency:string}) {
  const [hover,setHover]=useState(false);
  return (
    <div onClick={()=>onView(p)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{flexShrink:0,width:280,background:DS.glassBg,backdropFilter:DS.glassBlur,WebkitBackdropFilter:DS.glassBlur,border:`1px solid ${hover?DS.borderPurple:DS.border}`,borderRadius:DS.radiusLg,padding:20,cursor:'pointer',boxShadow:hover?DS.glassShadowHover:DS.glassShadow,transform:hover?'translateY(-2px)':'none',transition:DS.transition}}>
      <div style={{width:56,height:56,borderRadius:DS.radiusMd,background:hover?`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`:DS.bgGlass,border:`1px solid ${hover?'transparent':DS.border}`,display:'flex',alignItems:'center',justifyContent:'center',color:hover?'#fff':DS.purpleLight,marginBottom:16,transition:DS.transition,boxShadow:hover?`0 8px 24px ${DS.purpleGlow}`:'none'}}>
        {serviceIconFor(p,22)}
      </div>
      <div style={{fontSize:14,fontWeight:700,color:DS.textPrimary,marginBottom:4}}>{p.name}</div>
      {p.description&&<div style={{fontSize:11,color:DS.textSecondary,lineHeight:1.5,marginBottom:12,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.description}</div>}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {p.duration&&<span style={{fontSize:10,color:DS.textSecondary,background:DS.bgGlass,border:DS.glassBorder,borderRadius:DS.radiusFull,padding:'4px 10px',display:'flex',alignItems:'center',gap:4}}><Clock size={9}/> {p.duration}</span>}
        {p.workArea&&<span style={{fontSize:10,color:DS.textSecondary,background:DS.bgGlass,border:DS.glassBorder,borderRadius:DS.radiusFull,padding:'4px 10px',display:'flex',alignItems:'center',gap:4}}><MapPin size={9}/> {p.workArea}</span>}
        {(()=>{const m=cfv(p,'serviceMode');if(!m)return null;const u=m.includes('استعجال');return <span style={{fontSize:10,fontWeight:700,color:u?'#FCD34D':DS.purpleLight,background:u?'rgba(245,158,11,0.12)':DS.purpleSoft,border:`1px solid ${u?'rgba(245,158,11,0.3)':DS.borderPurple}`,borderRadius:DS.radiusFull,padding:'4px 10px'}}>{u?T('sf.urgent'):T('sf.byAppt')}</span>;})()}
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><span style={{fontSize:18,fontWeight:900,color:DS.textPrimary}}>{p.price.toLocaleString()}</span><span style={{fontSize:10,color:DS.textTertiary,marginRight:4}}>{currency}</span></div>
        <span style={{fontSize:11,fontWeight:600,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,color:'#fff',padding:'6px 16px',borderRadius:DS.radiusFull,boxShadow:`0 4px 12px ${DS.purpleGlow}`}}>{T('sf.book')}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ HERO
// شريط المعلومات المهمة — يُبرز للزبون أهم الإشارات بطريقة عصرية لافتة
// (توصيل مجاني، الدفع عند الاستلام، حالة المتجر، العروض) قبل المنتجات.
function InfoHighlights({brand,storeInfo,cur}:{brand:any;storeInfo:any;cur:string}) {
  const promo=storeInfo?.promotions||{};
  const thr=promo.freeShippingThreshold??400;
  const bundle=promo.bundle;
  const st=storeOpenStatus((brand as any).workStart,(brand as any).workEnd);
  const chips:{icon:string;title:string;sub:string;accent:string}[]=[];
  if(st) chips.push({icon:st.open?'🟢':'🔴',title:st.open?T('sf.openShort'):T('sf.closedShort'),sub:storeStatusLabel(st),accent:st.open?'#10B981':'#EF4444'});
  if(bundle?.enabled) chips.push({icon:'🎁',title:T('sf.save',{pct:String(bundle.percent)}),sub:T('sf.bundleSub',{n:String(bundle.minItems)}),accent:DS.orange});
  if(promo.wheel?.enabled!==false) chips.push({icon:'🎡',title:T('sf.wheelTitle'),sub:T('sf.wheelSub'),accent:DS.orange});
  chips.push({icon:'🔒',title:T('sf.secureTitle'),sub:T('sf.secureSub'),accent:DS.purpleLight});
  return (
    <div style={{margin:'0 14px 18px',position:'relative',zIndex:1}}>
      <style>{`@keyframes shineX{0%{transform:translateX(-130%)}100%{transform:translateX(240%)}}`}</style>
      <div style={{position:'relative',overflow:'hidden',borderRadius:DS.radiusLg,padding:'14px 16px',background:`linear-gradient(120deg, ${DS.purple}, ${DS.orange})`,boxShadow:`0 10px 34px ${DS.purpleGlow}`,display:'flex',alignItems:'center',gap:14}}>
        <div style={{position:'absolute',top:0,bottom:0,width:80,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent)',animation:'shineX 3.4s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{fontSize:30,flexShrink:0}}>🚚</div>
        <div style={{position:'relative',flex:1}}>
          <div style={{fontSize:15,fontWeight:900,color:'#fff',lineHeight:1.3}}>{T('sf.freeShipOver',{amount:(+thr).toLocaleString(),cur})}</div>
          <div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,0.92)',marginTop:2}}>{T('sf.codLocal')}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:10,overflowX:'auto',marginTop:10,paddingBottom:4,scrollbarWidth:'none'} as any}>
        {chips.map((c,i)=>(
          <div key={i} style={{flex:'0 0 auto',minWidth:134,display:'flex',alignItems:'center',gap:9,padding:'10px 13px',borderRadius:DS.radiusMd,background:DS.glassBg,backdropFilter:DS.glassBlur,border:`1px solid ${c.accent}40`,boxShadow:'0 4px 18px rgba(0,0,0,0.18)'}}>
            <span style={{fontSize:19}}>{c.icon}</span>
            <div><div style={{fontSize:12,fontWeight:800,color:DS.textPrimary,lineHeight:1.2}}>{c.title}</div><div style={{fontSize:9.5,color:DS.textTertiary,marginTop:1}}>{c.sub}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSection({brand,onShop}:{brand:StoreInfo['brand'];onShop:()=>void}) {
  return (
    <div style={{position:'relative',zIndex:1,padding:'40px 20px 32px',textAlign:'center'}}>
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle, ${DS.purpleGlow}, transparent 70%)`,pointerEvents:'none'}}/>
      {brand.logo&&<div style={{width:80,height:80,borderRadius:DS.radiusLg,margin:'0 auto 16px',background:DS.glassBg,backdropFilter:DS.glassBlur,border:DS.glassBorder,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:DS.glassShadow,position:'relative'}}><img src={brand.logo} alt={brand.name} style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>}
      {!brand.logo&&<div style={{width:80,height:80,borderRadius:DS.radiusLg,margin:'0 auto 16px',background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:900,color:'#fff',boxShadow:`0 8px 32px ${DS.purpleGlow}`}}>{brand.name?.[0]?.toUpperCase()||'S'}</div>}
      <h1 style={{fontSize:'clamp(24px,6vw,40px)',fontWeight:900,color:DS.textPrimary,margin:'0 0 8px',letterSpacing:'-0.03em',lineHeight:1.1,background:`linear-gradient(135deg, ${DS.textPrimary}, ${DS.purpleLight})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{brand.name||T('sf.store')}</h1>
      {brand.description&&<p style={{fontSize:14,color:DS.textSecondary,margin:'0 auto 20px',maxWidth:400,lineHeight:1.7}}>{brand.description}</p>}
      <button onClick={onShop} style={{padding:'14px 36px',borderRadius:DS.radiusFull,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:`0 8px 32px ${DS.purpleGlow}`,transition:DS.transitionFast,position:'relative'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 12px 40px ${DS.purpleGlow}`;}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 32px ${DS.purpleGlow}`;}}>{T('sf.explore')} <ArrowRight size={16}/></button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ BACK TO CLOSE
function useBackToClose(open:boolean,onClose:()=>void){
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    if(!open)return;
    let popped=false;
    const onPop=()=>{popped=true;closeRef.current();};
    window.history.pushState({sfModal:true},'');
    window.addEventListener('popstate',onPop);
    return ()=>{window.removeEventListener('popstate',onPop);if(!popped)window.history.back();};
  },[open]);
}

// ═══════════════════════════════════════════════════════════════ PRODUCT MODAL
function ProductModal({p,cart,onClose,currency,userId}:{p:SProduct;cart:ReturnType<typeof useCart>;onClose:()=>void;currency:string;userId:string}) {
  const [size,setSize]=useState(p.sizes?.[0]||'');
  const [color,setColor]=useState(p.colors?.[0]||'');
  const [added,setAdded]=useState(false);
  const [giftWrap,setGiftWrap]=useState(false);
  const [giftMsg,setGiftMsgLocal]=useState('');
  const [lightboxIdx,setLightboxIdx]=useState<number|null>(null);
  const [variantRows,setVariantRows]=useState<{size:string;color:string;qty:number}[]>([{size:p.sizes?.[0]||'',color:p.colors?.[0]||'',qty:1}]);
  const firstColorImg=p.colors?.[0]&&p.colorImages?.[p.colors[0]];
  const [activeImage,setActiveImage]=useState(firstColorImg||p.imageUrl||'');
  const galleryImgs=[p.imageUrl,...(p.images||[])].filter((x,i,a)=>x&&a.indexOf(x)===i);
  const rating=p.sales>20?5:p.sales>10?4:p.sales>3?4:3;
  void userId;
  useBackToClose(true,onClose);
  useBackToClose(lightboxIdx!==null,()=>setLightboxIdx(null));

  const handleAddAll=()=>{variantRows.forEach(row=>{cart.add(p,row.size,row.color,giftWrap,giftMsg);for(let i=1;i<row.qty;i++)cart.add(p,row.size,row.color,giftWrap,giftMsg);});setAdded(true);setTimeout(()=>{setAdded(false);onClose();},900);};
  const share=()=>{const url=window.location.origin+window.location.pathname+'?p='+p.id;navigator.share?.({title:p.name,url}).catch(()=>{})||navigator.clipboard?.writeText(url);};

  return (<>
    {lightboxIdx!==null&&galleryImgs.length>0&&(
      <div style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.96)',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setLightboxIdx(null)}>
        <button onClick={()=>setLightboxIdx(null)} style={{position:'absolute',top:16,left:16,width:40,height:40,borderRadius:'50%',background:DS.glassBg,backdropFilter:DS.glassBlur,border:DS.glassBorder,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3}}><X size={20}/></button>
        <img src={galleryImgs[lightboxIdx]} alt="" style={{maxWidth:'90%',maxHeight:'90%',objectFit:'contain',borderRadius:DS.radiusMd}}/>
        {galleryImgs.length>1&&<div style={{position:'absolute',bottom:20,left:0,right:0,display:'flex',gap:8,justifyContent:'center'}}>{galleryImgs.map((img,i)=><button key={i} onClick={e=>{e.stopPropagation();setLightboxIdx(i);}} style={{width:48,height:48,borderRadius:DS.radiusSm,overflow:'hidden',border:`2px solid ${i===lightboxIdx?DS.purpleLight:'rgba(255,255,255,0.2)'}`,cursor:'pointer',padding:0}}><img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></button>)}</div>}
      </div>
    )}

    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(180deg, rgba(20,20,40,0.98), rgba(10,10,20,0.98))`,backdropFilter:DS.glassBlur,border:`1px solid ${DS.border}`,borderRadius:`${DS.radiusXl}px ${DS.radiusXl}px 0 0`,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 -16px 64px rgba(0,0,0,0.5)',color:DS.textPrimary}}>
        <div style={{aspectRatio:'4/3',maxHeight:380,position:'relative',background:DS.bgGlass,overflow:'hidden'}}>
          {activeImage?<img src={activeImage} alt={p.name} onClick={()=>{const i=galleryImgs.indexOf(activeImage);setLightboxIdx(i>=0?i:0);}} style={{width:'100%',height:'100%',objectFit:'cover',cursor:'zoom-in'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:80,color:DS.textTertiary}}>{p.emoji||'📦'}</div>}
          <button onClick={onClose} style={{position:'absolute',top:14,left:14,width:38,height:38,borderRadius:'50%',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}><X size={18}/></button>
          <button onClick={share} style={{position:'absolute',top:14,right:14,width:38,height:38,borderRadius:'50%',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}><Share2 size={16}/></button>
          {p.sales>0&&<div style={{position:'absolute',bottom:14,right:14,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:11,fontWeight:600,padding:'5px 12px',borderRadius:DS.radiusFull}}>{T('sf.salesN',{n:String(p.sales)})}</div>}
        </div>
        {galleryImgs.length>1&&<div style={{display:'flex',gap:6,overflowX:'auto',padding:'10px 16px',background:DS.bgGlass,borderBottom:`1px solid ${DS.border}`}}>{galleryImgs.map((img,i)=><button key={i} onClick={()=>setActiveImage(img)} style={{flexShrink:0,width:52,height:52,borderRadius:DS.radiusSm,overflow:'hidden',border:`2px solid ${activeImage===img?DS.purpleLight:'rgba(255,255,255,0.1)'}`,cursor:'pointer',padding:0,background:DS.bgGlass}}><img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></button>)}</div>}
        <div style={{padding:'20px'}}>
          <div style={{fontSize:10,color:DS.textTertiary,fontWeight:600,letterSpacing:'0.06em',marginBottom:4}}>{p.category}{p.sku?` · #${p.sku}`:''}</div>
          <h2 style={{fontSize:22,fontWeight:900,color:DS.textPrimary,margin:'0 0 10px',lineHeight:1.3}}>{p.name}</h2>
          {p.sales>0&&<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}><div style={{display:'flex',gap:1}}>{Array.from({length:5},(_,i)=><Star key={i} size={13} fill={i<rating?'#F59E0B':'none'} color={i<rating?'#F59E0B':'rgba(255,255,255,0.15)'}/>)}</div><span style={{fontSize:11,color:DS.textTertiary}}>({Math.min(p.sales*2,120)})</span></div>}
          <div style={{display:'flex',alignItems:'flex-end',gap:10,marginBottom:18}}><span style={{fontSize:34,fontWeight:900,color:DS.textPrimary,letterSpacing:'-0.03em'}}>{p.price.toLocaleString()}</span><span style={{fontSize:14,color:DS.textTertiary,fontWeight:400,marginBottom:4}}>{currency}</span>{p.cost&&p.cost>p.price&&<span style={{fontSize:16,color:DS.textTertiary,textDecoration:'line-through',marginBottom:4}}>{p.cost.toLocaleString()}</span>}</div>
          {(!p.type||p.type==='product')&&p.stock>0&&p.stock<=5&&<div style={{fontSize:12,color:'#EF4444',fontWeight:600,marginBottom:14,display:'flex',alignItems:'center',gap:6}}><Flame size={14}/> {T('pm.lowStock',{n:String(p.stock)})}</div>}
          {p.description&&<p style={{fontSize:13,color:DS.textSecondary,lineHeight:1.7,marginBottom:20}}>{p.description}</p>}

          {p.colors?.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:11,fontWeight:700,color:DS.textTertiary,marginBottom:10}}>{T('pm.color')}</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{p.colors.map(clr=>{const CM:Record<string,string>={'أسود':'#1a1a1a','أبيض':'#f5f5f5','أحمر':'#ef4444','أزرق':'#3b82f6','أخضر':'#22c55e','رمادي':'#6b7280','بيج':'#d4b896','وردي':'#f472b6','بني':'#92400e','كحلي':'#1e3a5f','بنفسجي':'#a855f7','برتقالي':'#f97316'};return <button key={clr} onClick={()=>setColor(clr)} style={{width:36,height:36,borderRadius:'50%',background:CM[clr]||'#ccc',border:`3px solid ${color===clr?DS.purpleLight:'rgba(255,255,255,0.15)'}`,cursor:'pointer',transition:DS.transitionFast,boxShadow:color===clr?`0 0 16px ${DS.purpleGlow}`:'inset 0 0 0 1px rgba(0,0,0,0.1)'}} title={clr}/>;})}</div></div>}
          {p.sizes?.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:11,fontWeight:700,color:DS.textTertiary,marginBottom:10}}>{T('pm.size')}</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{p.sizes.map(s=><button key={s} onClick={()=>setSize(s)} style={{padding:'10px 20px',borderRadius:DS.radiusFull,border:`1px solid ${size===s?DS.purpleLight:DS.border}`,background:size===s?DS.purpleSoft:DS.bgGlass,color:size===s?DS.purpleLight:DS.textSecondary,fontSize:13,fontWeight:600,cursor:'pointer',transition:DS.transitionFast,boxShadow:size===s?`0 0 12px ${DS.purpleGlow}`:'none'}}>{s}</button>)}</div></div>}

                    <div style={{marginBottom:14}}>
            {variantRows.map((row,i)=>(
              <div key={i} style={{
                display:'flex',alignItems:'center',gap:10,marginBottom:8,
                padding:'12px 14px',background:DS.glassBg,
                borderRadius:DS.radiusMd,border:DS.glassBorder,
              }}>
                <span style={{fontSize:12,color:DS.textSecondary,minWidth:60}}>{row.color||'—'} / {row.size||'—'}</span>
                <div style={{display:'flex',alignItems:'center',gap:6,marginRight:'auto'}}>
                  <button onClick={()=>setVariantRows(prev=>prev.map((r,j)=>j===i?{...r,qty:Math.max(1,r.qty-1)}:r))} style={{width:28,height:28,borderRadius:'50%',background:DS.bgGlass,border:DS.glassBorder,color:DS.textSecondary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={10}/></button>
                  <span style={{fontSize:14,fontWeight:700,color:DS.textPrimary,minWidth:20,textAlign:'center'}}>{row.qty}</span>
                  <button onClick={()=>setVariantRows(prev=>prev.map((r,j)=>j===i?{...r,qty:r.qty+1}:r))} style={{width:28,height:28,borderRadius:'50%',background:DS.bgGlass,border:DS.glassBorder,color:DS.textSecondary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={10}/></button>
                </div>
                <span style={{fontSize:14,fontWeight:700,color:DS.textPrimary,minWidth:50,textAlign:'right'}}>{(p.price*row.qty).toLocaleString()} {currency}</span>
                {variantRows.length>1&&(
                  <button onClick={()=>setVariantRows(prev=>prev.filter((_,j)=>j!==i))} style={{width:24,height:24,borderRadius:'50%',background:'rgba(239,68,68,0.15)',border:'none',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={10}/></button>
                )}
              </div>
            ))}
          </div>
          {(p.sizes?.length>0||p.colors?.length>0)&&<button onClick={()=>setVariantRows(prev=>[...prev,{size:p.sizes?.[0]||'',color:p.colors?.[0]||'',qty:1}])} style={{padding:'10px 18px',borderRadius:DS.radiusFull,background:DS.bgGlass,border:`1px dashed ${DS.border}`,color:DS.textSecondary,fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:6,marginBottom:16,transition:DS.transitionFast}}><Plus size={12}/> {T('pm.addVariant')}</button>}

          <div style={{marginBottom:16,padding:'14px',background:DS.glassBg,borderRadius:DS.radiusMd,border:DS.glassBorder}}><button onClick={()=>setGiftWrap(!giftWrap)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:DS.textPrimary,fontSize:13,fontWeight:600,cursor:'pointer',padding:0}}><Gift size={16} color={giftWrap?'#10B981':DS.textTertiary}/>{giftWrap?T('pm.giftOn',{n:'15'}):T('pm.giftOff',{n:'15'})}</button>{giftWrap&&<input placeholder={T('pm.giftMsg')} value={giftMsg} onChange={e=>setGiftMsgLocal(e.target.value)} style={{marginTop:10,width:'100%',padding:'10px 14px',borderRadius:DS.radiusSm,border:DS.glassBorder,background:DS.bgInput,color:DS.textPrimary,fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'Tajawal,sans-serif'}}/>}</div>

          {(()=>{const cfs=(p.customFields||[]).filter(f=>f.value&&!(f.type==='boolean'&&f.value!=='true'));if(!cfs.length)return null;const badges=cfs.filter(f=>f.type==='boolean');const longs=cfs.filter(f=>f.type==='textarea');const specs=cfs.filter(f=>f.type!=='boolean'&&f.type!=='textarea');return (<div style={{marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>{badges.length>0&&<div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{badges.map(f=><span key={f.id} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#22C55E',background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',padding:'5px 12px',borderRadius:DS.radiusFull}}><Check size={10}/>{f.label}</span>)}</div>}{specs.length>0&&<div style={{padding:'12px 14px',background:DS.glassBg,borderRadius:DS.radiusMd,border:DS.glassBorder}}><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,letterSpacing:'.06em',marginBottom:8}}>{p.type==='service'?T('pm.svcDetails'):T('pm.prodDetails')}</div><div style={{display:'flex',flexDirection:'column',gap:6}}>{specs.map(f=><div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,fontSize:12}}><span style={{color:DS.textTertiary,flexShrink:0}}>{f.label}</span>{f.type==='multiselect'?<span style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'flex-end'}}>{f.value.split('، ').filter(Boolean).map((v,i)=><span key={i} style={{fontSize:10,color:DS.textSecondary,background:DS.bgGlass,padding:'2px 9px',borderRadius:DS.radiusFull}}>{v}</span>)}</span>:<span style={{color:DS.textPrimary,fontWeight:600,textAlign:'left'}}>{f.value}</span>}</div>)}</div></div>}{longs.map(f=><div key={f.id} style={{padding:'12px 14px',background:DS.glassBg,borderRadius:DS.radiusMd,border:DS.glassBorder}}><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,letterSpacing:'.06em',marginBottom:6}}>{f.label}</div><p style={{fontSize:12,color:DS.textSecondary,lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>{f.value}</p></div>)}</div>);})()}

          {p.type==='service'&&(p.duration||p.workArea)&&<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>{p.duration&&<span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:DS.purpleLight,background:DS.purpleSoft,border:`1px solid ${DS.borderPurple}`,borderRadius:DS.radiusFull,padding:'6px 14px'}}><Clock size={11}/> {p.duration}</span>}{p.workArea&&<span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:DS.purpleLight,background:DS.purpleSoft,border:`1px solid ${DS.borderPurple}`,borderRadius:DS.radiusFull,padding:'6px 14px'}}><MapPin size={11}/> {p.workArea}</span>}</div>}
          {p.type==='digital'&&<div style={{marginBottom:16,padding:'12px',background:DS.purpleSoft,borderRadius:DS.radiusMd,border:`1px solid ${DS.borderPurple}`,fontSize:12,color:DS.purpleLight}}>{T('pm.digital')}</div>}

          {p.category&&(window as any).__sfProducts?.filter((rp:any)=>rp.id!==p.id&&rp.category===p.category).length>0&&<div style={{marginBottom:20}}><div style={{fontSize:11,fontWeight:700,color:DS.textTertiary,marginBottom:10}}>{T('pm.youMayLike')}</div><div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>{(window as any).__sfProducts.filter((rp:any)=>rp.id!==p.id&&rp.category===p.category).slice(0,4).map((rp:any)=><div key={rp.id} onClick={()=>{onClose();setTimeout(()=>document.dispatchEvent(new CustomEvent('viewProduct',{detail:rp})),50);}} style={{flexShrink:0,width:85,borderRadius:DS.radiusSm,overflow:'hidden',cursor:'pointer',background:DS.glassBg,border:DS.glassBorder}}><div style={{height:85,background:DS.bgGlass,overflow:'hidden'}}>{rp.imageUrl?<img src={rp.imageUrl} alt={rp.name} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy"/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{rp.emoji||'📦'}</div>}</div><div style={{padding:'6px 8px'}}><div style={{fontSize:10,fontWeight:500,color:DS.textPrimary,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{rp.name}</div><div style={{fontSize:11,fontWeight:700,color:DS.textSecondary}}>{rp.price.toLocaleString()}</div></div></div>)}</div></div>}
        </div>
        <div style={{padding:'14px 20px 24px',position:'sticky',bottom:0,background:`linear-gradient(180deg, transparent, rgba(10,10,20,0.98) 20%)`,backdropFilter:DS.glassBlur,borderTop:`1px solid ${DS.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:12,color:DS.textSecondary}}><span>{T('pm.pieces',{n:String(variantRows.reduce((s,r)=>s+r.qty,0))})}</span><span>{T('pm.totalColon',{x:(p.price*variantRows.reduce((s,r)=>s+r.qty,0)+(giftWrap?15:0)).toLocaleString(),cur:currency})}</span></div>
          <button onClick={handleAddAll} style={{width:'100%',height:54,background:added?`linear-gradient(135deg, #10B981, #059669)`:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',transition:DS.transitionFast,display:'flex',alignItems:'center',justifyContent:'center',gap:8,borderRadius:DS.radiusFull,boxShadow:added?'0 4px 24px rgba(16,185,129,0.3)':`0 8px 32px ${DS.purpleGlow}`}}>
            {added?<><Check size={18}/>{T('pm.added')}</>:<><ShoppingCart size={16}/>{T('pm.addToCart')}</>}
          </button>
        </div>
      </div>
    </div>
  </>);
}

// ═══════════════════════════════════════════════════════════════ SERVICE MODAL
function ServiceModal({p,onClose,currency,storeInfo,userId}:{p:SProduct;onClose:()=>void;currency:string;storeInfo:StoreInfo;userId:string}) {
  // نوع الطلب الذي يختاره الزبون: حجز موعد / طلب الخدمة / طلب عاجل
  const [action,setAction]=useState<'booking'|'request'|'urgent'|''>('');
  const [bkDate,setBkDate]=useState(''); const [bkTime,setBkTime]=useState(''); const [bkNotes,setBkNotes]=useState('');
  const [reqDetails,setReqDetails]=useState(''); const [reqPlace,setReqPlace]=useState(''); const [reqBudget,setReqBudget]=useState('');
  const [urPhone,setUrPhone]=useState(''); const [urNotes,setUrNotes]=useState('');
  // سلة الخدمة: معلومات الزبون (منفصلة تماماً عن سلة المنتجات)
  const [cName,setCName]=useState(''); const [cPhone,setCPhone]=useState(''); const [cCity,setCCity]=useState(''); const [cAddr,setCAddr]=useState('');
  const [loading,setLoading]=useState(false);
  useBackToClose(true,onClose);
  const gallery=[p.imageUrl,...(p.portfolio||[]),...(p.images||[])].filter((x,i,a)=>x&&a.indexOf(x)===i);
  const svcPhone=(cfv(p,'servicePhone')||storeInfo.brand.phone||'').replace(/[^\d+]/g,'');
  const fld:React.CSSProperties={width:'100%',padding:'11px 13px',borderRadius:DS.radiusSm,border:DS.glassBorder,background:DS.bgInput,color:DS.textPrimary,fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'Tajawal,sans-serif'};

  const actionLabel=action==='booking'?T('svc.book'):action==='request'?T('svc.request'):action==='urgent'?T('svc.urgent'):'';
  const summary=action==='booking'
    ? ['📅 حجز موعد',bkDate?`اليوم: ${bkDate}${bkTime?` ⏰ ${bkTime}`:''}`:'',bkNotes?`📝 ${bkNotes}`:''].filter(Boolean).join('\n')
    : action==='request'
    ? ['🧾 طلب الخدمة',reqDetails?`التفاصيل: ${reqDetails}`:'',reqPlace?`📍 المكان: ${reqPlace}`:'',reqBudget?`💰 الميزانية: ${reqBudget} ${currency}`:''].filter(Boolean).join('\n')
    : action==='urgent'
    ? ['⚡ طلب عاجل — في أقرب وقت',urPhone?`📞 هاتف مؤكد: ${urPhone}`:'',urNotes?`📝 ${urNotes}`:''].filter(Boolean).join('\n')
    : '';
  const stepValid=action==='booking'?!!bkDate:action==='request'?reqDetails.trim().length>2:action==='urgent'?urPhone.replace(/\D/g,'').length>=9:false;
  const phoneForOrder=(action==='urgent'&&urPhone?urPhone:cPhone).trim();
  const canSubmit=!!action&&stepValid&&cName.trim().length>=2&&phoneForOrder.replace(/\D/g,'').length>=9&&!loading;

  const bookWA=()=>{const phone=svcPhone.replace(/\D/g,'');const msg=`مرحباً ${storeInfo.brand.name}! 👋\n\nأريد خدمة:\n🔧 ${p.name}\n💰 ${p.price.toLocaleString()} ${currency}${p.duration?`\n⏱️ ${p.duration}`:''}${p.workArea?`\n📍 ${p.workArea}`:''}${summary?`\n\n${summary}`:''}\n\nأرجو التأكيد 🙏`;if(phone)window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');else navigator.clipboard?.writeText(msg);};

  const submit=async()=>{
    if(!canSubmit){alert(T('svc.fillAll'));return;}
    setLoading(true);
    try{
      const r=await fetch('/api/orders/public',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        userId,source:'Service',
        items:[{productId:p.id,productName:p.name,price:p.price,quantity:1,serviceType:action}],
        customerName:cName.trim(),customerPhone:phoneForOrder,city:cCity.trim(),address:cAddr.trim(),
        total:p.price,notes:`[طلب خدمة: ${p.name}]\n${summary}`,
      })});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||T('svc.sendFail'));
      const ph=svcPhone.replace(/\D/g,'');
      if(ph){const msg=`مرحباً ${storeInfo.brand.name}! 👋\n\nطلب خدمة جديد:\n🔧 ${p.name}\n${summary}\n\n👤 ${cName}\n📱 ${phoneForOrder}${cCity?`\n📍 ${cCity}`:''}`;setTimeout(()=>window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`,'_blank'),400);}
      alert(T('svc.sentOk',{store:storeInfo.brand.name}));
      onClose();
    }catch(e:any){alert(T('svc.errPrefix',{e:e.message}));}
    setLoading(false);
  };

  const cfs=(p.customFields||[]).filter(f=>f.id!=='serviceMode'&&f.id!=='servicePhone'&&f.value&&!(f.type==='boolean'&&f.value!=='true'));

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(180deg, rgba(20,20,40,0.99), rgba(10,10,20,0.99))`,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 -16px 64px rgba(0,0,0,0.6)',color:DS.textPrimary,border:`1px solid ${DS.border}`,borderBottom:'none'}}>
        <div style={{position:'relative',padding:'28px 22px 22px',background:`linear-gradient(135deg, ${DS.purpleSoft}, transparent 70%)`,borderBottom:`1px solid ${DS.border}`}}>
          <button onClick={onClose} style={{position:'absolute',top:14,left:14,width:36,height:36,borderRadius:'50%',background:DS.glassBg,border:DS.glassBorder,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={17}/></button>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:68,height:68,borderRadius:DS.radiusLg,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',boxShadow:`0 10px 30px ${DS.purpleGlow}`,flexShrink:0}}>{serviceIconFor(p,30)}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:10,color:DS.purpleLight,fontWeight:700,letterSpacing:'.08em',marginBottom:4}}>{T('svc.tag')}{p.category?` · ${p.category}`:''}</div>
              <h2 style={{fontSize:20,fontWeight:900,margin:0,lineHeight:1.3}}>{p.name}</h2>
              <div style={{marginTop:6}}><span style={{fontSize:22,fontWeight:900}}>{p.price.toLocaleString()}</span><span style={{fontSize:11,color:DS.textTertiary,marginRight:5}}>{currency}</span></div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
            {p.duration&&<span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:DS.purpleLight,background:DS.purpleSoft,border:`1px solid ${DS.borderPurple}`,borderRadius:DS.radiusFull,padding:'6px 14px'}}><Clock size={11}/> {p.duration}</span>}
            {p.workArea&&<span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:DS.purpleLight,background:DS.purpleSoft,border:`1px solid ${DS.borderPurple}`,borderRadius:DS.radiusFull,padding:'6px 14px'}}><MapPin size={11}/> {p.workArea}</span>}
            {p.sales>0&&<span style={{fontSize:11,fontWeight:600,color:DS.textSecondary,background:DS.bgGlass,border:DS.glassBorder,borderRadius:DS.radiusFull,padding:'6px 14px'}}>{T('svc.done',{n:String(p.sales)})}</span>}
          </div>
        </div>
        <div style={{padding:'18px 22px'}}>
          {p.description&&<p style={{fontSize:13,color:DS.textSecondary,lineHeight:1.8,margin:'0 0 18px'}}>{p.description}</p>}
          {cfs.length>0&&<div style={{marginBottom:18,padding:'14px 16px',background:DS.glassBg,borderRadius:DS.radiusMd,border:DS.glassBorder}}><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,letterSpacing:'.06em',marginBottom:10}}>{T('svc.details')}</div><div style={{display:'flex',flexDirection:'column',gap:7}}>{cfs.map(f=><div key={f.id} style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12}}><span style={{color:DS.textTertiary,flexShrink:0}}>{f.label}</span><span style={{color:DS.textPrimary,fontWeight:600,textAlign:'left'}}>{f.type==='boolean'?'✓':f.value}</span></div>)}</div></div>}
          {gallery.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,letterSpacing:'.06em',marginBottom:10}}>{T('svc.gallery')}</div><div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>{gallery.map((img,i)=><img key={i} src={img} alt="" loading="lazy" style={{width:110,height:110,objectFit:'cover',borderRadius:DS.radiusSm,flexShrink:0,border:DS.glassBorder}}/>)}</div></div>}
          {/* اختيار نوع الطلب — كل زر بنموذجه الخاص (منفصل عن سلة المنتجات) */}
          <div style={{fontSize:12,fontWeight:800,color:DS.purpleLight,marginBottom:10}}>{T('svc.howOrder')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
            {([['booking','📅','svc.book'],['request','🧾','svc.request'],['urgent','⚡','svc.urgent']] as const).map(([a,ic,k])=>(
              <button key={a} onClick={()=>setAction(a)} style={{padding:'12px 6px',borderRadius:DS.radiusMd,border:`1px solid ${action===a?DS.purpleLight:DS.border}`,background:action===a?DS.purpleSoft:DS.glassBg,color:action===a?DS.purpleLight:DS.textSecondary,cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:5,transition:DS.transitionFast}}>
                <span style={{fontSize:20}}>{ic}</span><span style={{fontSize:11,fontWeight:800}}>{T(k).replace(/^\S+\s/,'')}</span>
              </button>
            ))}
          </div>
          {svcPhone&&(
            <div style={{display:'flex',gap:6,marginBottom:14}}>
              <a href={`tel:${svcPhone}`} style={{fontSize:11,fontWeight:700,color:'#fff',background:DS.glassBg,border:DS.glassBorder,borderRadius:DS.radiusFull,padding:'6px 14px',textDecoration:'none'}}>{T('svc.call')}</a>
              <a href={`https://wa.me/${svcPhone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{fontSize:11,fontWeight:700,color:'#fff',background:'#25D366',borderRadius:DS.radiusFull,padding:'6px 14px',textDecoration:'none'}}>{T('svc.waDirect')}</a>
            </div>
          )}
          {action&&<div style={{padding:'14px 16px',background:DS.purpleSoft,borderRadius:DS.radiusMd,border:`1px solid ${DS.borderPurple}`,marginBottom:14}}>
            {action==='booking'&&<>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <div><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.day')}</div><input type="date" value={bkDate} onChange={e=>setBkDate(e.target.value)} style={fld}/></div>
                <div><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.time')}</div><input type="time" value={bkTime} onChange={e=>setBkTime(e.target.value)} style={fld}/></div>
              </div>
              <div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.notes')}</div><textarea rows={2} value={bkNotes} onChange={e=>setBkNotes(e.target.value)} placeholder={T('svc.bkNotesPh')} style={{...fld,resize:'none'} as any}/>
            </>}
            {action==='request'&&<>
              <div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.reqDetails')}</div><textarea rows={3} value={reqDetails} onChange={e=>setReqDetails(e.target.value)} placeholder={T('svc.reqDetailsPh')} style={{...fld,resize:'none',marginBottom:8} as any}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.place')}</div><input value={reqPlace} onChange={e=>setReqPlace(e.target.value)} placeholder={T('svc.placePh')} style={fld}/></div>
                <div><div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.budget',{cur:currency})}</div><input value={reqBudget} onChange={e=>setReqBudget(e.target.value)} placeholder={T('svc.budgetPh')} dir="ltr" style={fld}/></div>
              </div>
            </>}
            {action==='urgent'&&<>
              <div style={{fontSize:11,fontWeight:700,color:'#FCD34D',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:DS.radiusSm,padding:'8px 12px',marginBottom:10}}>{T('svc.urgentNote')}</div>
              <div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.urgentPhone')}</div><input value={urPhone} onChange={e=>setUrPhone(e.target.value)} placeholder="0612345678" dir="ltr" type="tel" style={{...fld,marginBottom:8}}/>
              <div style={{fontSize:10,color:DS.textTertiary,fontWeight:700,marginBottom:4}}>{T('svc.notes')}</div><textarea rows={2} value={urNotes} onChange={e=>setUrNotes(e.target.value)} placeholder={T('svc.urgentNotesPh')} style={{...fld,resize:'none'} as any}/>
            </>}
          </div>}
          {/* سلة الخدمة — معلومات الزبون لإتمام الطلب (مستقلة عن سلة المنتجات) */}
          {action&&<div style={{padding:'14px 16px',background:DS.glassBg,borderRadius:DS.radiusMd,border:DS.glassBorder}}>
            <div style={{fontSize:11,fontWeight:800,color:DS.textPrimary,marginBottom:10}}>{T('svc.basket')}</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <input value={cName} onChange={e=>setCName(e.target.value)} placeholder={T('svc.fullName')} style={fld}/>
              <input value={cPhone} onChange={e=>setCPhone(e.target.value)} placeholder={action==='urgent'?T('svc.phoneSame'):T('svc.phone')} dir="ltr" type="tel" style={fld}/>
              <input value={cCity} onChange={e=>setCCity(e.target.value)} placeholder={T('svc.city')} style={fld}/>
              <input value={cAddr} onChange={e=>setCAddr(e.target.value)} placeholder={T('svc.addrOpt')} style={fld}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,paddingTop:10,borderTop:`1px solid ${DS.border}`,fontSize:13}}>
              <span style={{color:DS.textTertiary,fontWeight:600}}>{actionLabel} · {p.name}</span>
              <span style={{fontWeight:900}}>{p.price.toLocaleString()} {currency}</span>
            </div>
          </div>}
        </div>
        <div style={{padding:'14px 22px 26px',position:'sticky',bottom:0,background:'rgba(10,10,20,0.97)',backdropFilter:DS.glassBlur,borderTop:`1px solid ${DS.border}`,display:'flex',gap:10}}>
          <button onClick={bookWA} style={{flex:1,height:52,borderRadius:DS.radiusFull,background:'#25D366',border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><MessageCircle size={16}/> {T('svc.whatsapp')}</button>
          <button onClick={submit} disabled={!canSubmit} style={{flex:1.6,height:52,borderRadius:DS.radiusFull,background:canSubmit?`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`:DS.glassBg,border:canSubmit?'none':`1px solid ${DS.border}`,color:canSubmit?'#fff':DS.textTertiary,fontSize:14,fontWeight:700,cursor:canSubmit?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:canSubmit?`0 8px 24px ${DS.purpleGlow}`:'none'}}>{loading?T('svc.sending'):<><Check size={16}/> {T('svc.confirm')}</>}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ LUCKY WHEEL
const WHEEL_SEGMENTS=['خصم 5%','حظ أوفر 🍀','خصم 8%','توصيل مجاني 🚚','خصم 10%','خصم 15% 🎉'];
const WHEEL_COLORS=['#7C3AED','#1E293B','#A855F7','#0E7490','#6D28D9','#BE185D'];

function LuckyWheel({userId,open,onClose}:{userId:string;open:boolean;onClose:()=>void}) {
  const [spinning,setSpinning]=useState(false);
  const [rotation,setRotation]=useState(0);
  const [result,setResult]=useState<{label:string;code:string|null;minOrder?:number}|null>(null);
  const [error,setError]=useState('');
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const [spunToday,setSpunToday]=useState(()=>{try{return localStorage.getItem(`amanzine_wheel_day_${userId}`)===todayKey();}catch{return false;}});
  useBackToClose(open,onClose);

  const spin=async()=>{if(spinning||spunToday)return;setError('');setSpinning(true);try{const r=await fetch('/api/coupons/public/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId})});const d=await r.json();if(!r.ok)throw new Error(d.error||T('wh.spinFail'));const target=360*5+(360-(d.index*60+30));setRotation(target);setTimeout(()=>{setResult({label:d.label,code:d.code,minOrder:d.minOrder});if(d.code){try{localStorage.setItem('amanzine_wheel_code',d.code);}catch{}}try{localStorage.setItem(`amanzine_wheel_day_${userId}`,todayKey());}catch{}setSpunToday(true);setSpinning(false);},4300);}catch(e:any){setError(e.message);setSpinning(false);}};

  if(!open)return null;
  return (
    <div onClick={()=>!spinning&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(10px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:360,background:`linear-gradient(180deg, rgba(25,25,50,0.99), rgba(12,12,25,0.99))`,border:`1px solid ${DS.borderPurple}`,borderRadius:DS.radiusXl,padding:'26px 22px',textAlign:'center',color:DS.textPrimary,boxShadow:`0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${DS.purpleGlow}`}}>
        <div style={{fontSize:20,fontWeight:900,marginBottom:4}}>{T('wh.title')}</div>
        <div style={{fontSize:12,color:DS.textSecondary,marginBottom:20}}>{T('wh.sub')}</div>
        <div style={{position:'relative',width:260,height:260,margin:'0 auto 22px'}}>
          <div style={{position:'absolute',top:-6,left:'50%',transform:'translateX(-50%)',zIndex:3,width:0,height:0,borderLeft:'12px solid transparent',borderRight:'12px solid transparent',borderTop:`20px solid ${DS.orange}`,filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.5))'}}/>
          <div style={{width:'100%',height:'100%',borderRadius:'50%',position:'relative',overflow:'hidden',border:`5px solid rgba(255,255,255,0.12)`,boxShadow:`inset 0 0 30px rgba(0,0,0,0.4), 0 10px 40px rgba(0,0,0,0.5)`,background:`conic-gradient(${WHEEL_SEGMENTS.map((_,i)=>`${WHEEL_COLORS[i]} ${i*60}deg ${(i+1)*60}deg`).join(', ')})`,transform:`rotate(${rotation}deg)`,transition:spinning?'transform 4.2s cubic-bezier(0.15, 0.9, 0.18, 1)':'none'}}>
            {[T('wh.s1'),T('wh.s2'),T('wh.s3'),T('wh.s4'),T('wh.s5'),T('wh.s6')].map((label,i)=><div key={i} style={{position:'absolute',top:'50%',left:'50%',transformOrigin:'0 0',transform:`rotate(${i*60+30}deg)`,width:0,height:0}}><span style={{position:'absolute',top:-105,left:0,transform:'translateX(-50%) rotate(0deg)',fontSize:10,fontWeight:800,color:'#fff',whiteSpace:'nowrap',textShadow:'0 1px 3px rgba(0,0,0,0.6)'}}>{label}</span></div>)}
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:48,height:48,borderRadius:'50%',background:'rgba(10,10,20,0.95)',border:'3px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,zIndex:2}}>🎁</div>
          </div>
        </div>
        {error&&<div style={{fontSize:12,color:'#EF4444',fontWeight:600,marginBottom:12}}>{error}</div>}
        {result?(
          <div style={{marginBottom:6}}>
            <div style={{fontSize:17,fontWeight:900,marginBottom:8}}>{result.code?T('wh.won',{label:result.label}):T('wh.lost')}</div>
            {result.code&&<><div onClick={()=>{navigator.clipboard?.writeText(result.code!);}} style={{fontSize:18,fontWeight:900,letterSpacing:'.1em',color:DS.orangeLight,background:DS.glassBg,border:`1.5px dashed ${DS.borderOrange}`,borderRadius:DS.radiusSm,padding:'12px',marginBottom:8,cursor:'pointer',direction:'ltr'}}>{result.code}</div><div style={{fontSize:10,color:DS.textTertiary,marginBottom:12}}>{T('wh.validity',{min:result.minOrder?T('wh.minOrder',{n:String(result.minOrder)}):''})}</div></>}
            <button onClick={onClose} style={{width:'100%',height:46,borderRadius:DS.radiusFull,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:`0 6px 24px ${DS.purpleGlow}`}}>{result.code?T('wh.shopUse'):T('wh.continue')}</button>
          </div>
        ):(
          <button onClick={spin} disabled={spinning||spunToday} style={{width:'100%',height:50,borderRadius:DS.radiusFull,background:spunToday?DS.glassBg:`linear-gradient(135deg, ${DS.orange}, ${DS.orangeLight})`,border:'none',color:spunToday?DS.textTertiary:'#fff',fontSize:15,fontWeight:800,cursor:spunToday?'default':'pointer',boxShadow:spunToday?'none':`0 8px 28px ${DS.orangeGlow}`,opacity:spinning?0.7:1}}>
            {spinning?T('wh.spinning'):spunToday?T('wh.doneToday'):T('wh.spin')}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ CART SIDEBAR
function CartSidebar({cart,storeInfo,userId,onClose,onOrderSuccess}:{cart:ReturnType<typeof useCart>;storeInfo:StoreInfo;userId:string;onClose:()=>void;onOrderSuccess:(id:string)=>void}) {
  const [step,setStep]=useState<'cart'|'checkout'|'success'>('cart');
  const [form,setForm]=useState({name:'',phone:'',city:'',address:'',email:'',notes:'',subscribe:true,paymentMethod:'cod' as 'cod'|'virement'});
  const [couponCode,setCouponCode]=useState(()=>{try{return localStorage.getItem('amanzine_wheel_code')||'';}catch{return '';}});
  const [couponDiscount,setCouponDiscount]=useState(0);
  const [couponShipping,setCouponShipping]=useState(false);
  const [couponMsg,setCouponMsg]=useState('');
  const [citySearch,setCitySearch]=useState('');
  const [showCities,setShowCities]=useState(false);
  const [loading,setLoading]=useState(false);
  const [orderId,setOrderId]=useState('');
  const cur=storeInfo.brand.currency||'MAD';
  useBackToClose(true,onClose);
  const hcapKey=storeInfo.hcaptchaSiteKey||'';
  // **مربّعُ التحقّق: يُحمَّل مرّةً، ويُرسَم كلَّ مرّة.**
  //
  //   العطبُ الأوّل: نطاقُ hCaptcha كان محجوبًا في سياسة الأمان بالإنتاج، فلا
  //   يُحمَّل السكربتُ أصلًا ويبقى المربّعُ فارغًا — ثمّ يُقال للزبون «أكمل
  //   التحقّق الأمنيّ أولًا» عن شيءٍ لا يراه. (أُصلح في `server/index.js`.)
  //
  //   والثاني هنا: hCaptcha يمسح الصفحةَ **عند تحميل سكربته فقط**. فمن أغلق
  //   السلّةَ وفتحها ثانيةً يجد الخانةَ فارغةً أبدًا، لأنّ السكربتَ محمَّلٌ
  //   سلفًا ولا يمسح من جديد. الرسمُ الصريحُ يعالجه.
  useEffect(()=>{
    if(step!=='checkout'||!hcapKey)return;
    let alive=true;
    const draw=()=>{
      if(!alive)return;
      const api=(window as any).hcaptcha;
      const box=document.getElementById('hcap-box');
      if(!api?.render||!box||box.childElementCount>0)return;
      try{api.render('hcap-box',{sitekey:hcapKey,theme:'dark'});}catch{/* مرسومٌ سلفًا */}
    };
    if(!document.getElementById('hcap-script')){
      const sc=document.createElement('script');sc.id='hcap-script';
      sc.src='https://js.hcaptcha.com/1/api.js?render=explicit';sc.async=true;
      sc.onload=draw;document.head.appendChild(sc);
    } else draw();
    // السكربتُ قد يكون قيد التحميل — نحاول مرّاتٍ قليلةً ثمّ نتوقّف.
    const t=setInterval(draw,400);
    const stop=setTimeout(()=>clearInterval(t),6000);
    return()=>{alive=false;clearInterval(t);clearTimeout(stop);};
  },[step,hcapKey]);

  const promo=storeInfo.promotions;
  const bundleCfg=promo?.bundle;
  const bundleDiscount=(bundleCfg?.enabled&&cart.count>=bundleCfg.minItems)?Math.round(cart.total*bundleCfg.percent/100):0;
  const bestDiscount=Math.max(bundleDiscount,couponDiscount);
  const discountLabel=bestDiscount===0?'':(bundleDiscount>=couponDiscount?T('ct.bundleLabel',{n:String(bundleCfg!.minItems),pct:String(bundleCfg!.percent)}):T('ct.couponLabel',{code:couponCode}));
  const freeShipThreshold=promo?.freeShippingThreshold??400;
  const afterDiscount=Math.max(0,cart.total-bestDiscount);
  const freeShipping=couponShipping||afterDiscount>=freeShipThreshold;
  const cityCost=getDeliveryCost(form.city,storeInfo.deliveryCosts);
  const deliveryCost=freeShipping?0:cityCost;
  const grandTotal=afterDiscount+deliveryCost;
  const remainingForFreeShip=Math.max(0,freeShipThreshold-afterDiscount);
  const remainingForBundle=bundleCfg?.enabled?Math.max(0,bundleCfg.minItems-cart.count):0;
  const filteredCities=MOROCCAN_CITIES.filter(c=>c.includes(citySearch)||citySearch==='');

  const applyCoupon=async()=>{if(!couponCode.trim())return;try{const r=await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}&userId=${userId}&total=${cart.total}`);const d=await r.json().catch(()=>({}));if(r.ok&&d.valid){setCouponDiscount(d.discount||0);setCouponShipping(!!d.freeShipping);setCouponMsg(d.freeShipping?T('ct.couponFreeShip'):T('ct.couponDiscount',{x:String(d.discount),cur}));}else{setCouponDiscount(0);setCouponShipping(false);setCouponMsg(`❌ ${d.message||T('ct.couponInvalid')}`);}}catch{setCouponDiscount(0);setCouponShipping(false);setCouponMsg(T('ct.couponFail'));}};
  const shareCart=()=>{const itemsText=cart.items.map(i=>`• ${i.product.name} (${i.size} ${i.color}) x${i.quantity} — ${i.product.price*i.quantity} ${cur}`).join('\n');const msg=`🛒 سلتي من ${storeInfo.brand.name}:\n\n${itemsText}\n\n💰 المجموع: ${cart.total} ${cur}`;navigator.share?.({title:`سلتي من ${storeInfo.brand.name}`,text:msg}).catch(()=>{})||navigator.clipboard?.writeText(msg);};

  const handleOrder=async()=>{if(!form.name||!form.phone||!form.city){alert(T('ct.fillRequired'));return;}
    const captchaToken=hcapKey?(((window as any).hcaptcha?.getResponse?.())||''):'';
    if(hcapKey&&!captchaToken){alert(T('ct.captchaFirst'));return;}
    setLoading(true);try{const items=cart.items.map(i=>({productId:i.product.id,productName:i.product.name,price:i.product.price,quantity:i.quantity,size:i.size,color:i.color,giftWrap:i.giftWrap,giftMessage:i.giftMessage}));const r=await fetch('/api/orders/public',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,items,customerName:form.name,customerPhone:form.phone,city:form.city,address:form.address,total:grandTotal,deliveryCost:cityCost,couponCode:(couponDiscount>0||couponShipping)?couponCode:'',captchaToken,customerEmail:form.email.trim(),source:'Storefront',notes:`${form.notes}${form.subscribe?T('ct.subscribeNote'):''}`})});const data=await r.json();if(!r.ok)throw new Error(data.error);setOrderId(data.order.id);const finalTotal=data.applied?.total??grandTotal;try{localStorage.removeItem('amanzine_wheel_code');}catch{}try{const recent=JSON.parse(localStorage.getItem('amanzine_recent_orders')||'[]');localStorage.setItem('amanzine_recent_orders',JSON.stringify([{name:form.name,city:form.city,product:cart.items[0]?.product?.name||'منتج',time:new Date().toISOString()},...recent].slice(0,20)));}catch{}const phone=storeInfo.brand.phone?.replace(/\D/g,'');const itemsText=cart.items.map(i=>`• ${i.product.name} (${i.size} ${i.color}) x${i.quantity} — ${i.product.price*i.quantity} ${cur}`).join('\n');const promoText=[data.applied?.discount>0?`🏷️ ${data.applied.discountSource}: -${data.applied.discount} ${cur}`:'',data.applied?.freeShipping?'🚚 توصيل مجاني':''].filter(Boolean).join('\n');const msg=`مرحباً ${storeInfo.brand.name}! 👋\n\nأريد تأكيد طلبي:\n\n${itemsText}\n${promoText?promoText+'\n':''}\n💰 الإجمالي: ${finalTotal} ${cur}\n\n👤 ${form.name}\n📱 ${form.phone}\n📍 ${form.city}\n🏠 ${form.address||'—'}`;if(phone)setTimeout(()=>window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank'),500);cart.clear();try{localStorage.removeItem('amanzine_cart');}catch{}setStep('success');onOrderSuccess(data.order.id);}catch(e:any){alert(T('ct.errPrefix',{e:e.message}));}setLoading(false);};

  const inpStyle:React.CSSProperties={width:'100%',padding:'12px 15px',borderRadius:DS.radiusSm,border:DS.glassBorder,background:DS.bgInput,color:DS.textPrimary,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'Tajawal,sans-serif'};

  return (
    <div style={{position:'fixed',inset:0,zIndex:400,display:'flex'}}>
      <div onClick={onClose} style={{flex:1,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}/>
      <div style={{width:'min(420px,100vw)',background:`linear-gradient(180deg, rgba(20,20,40,0.98), rgba(10,10,20,0.98))`,backdropFilter:DS.glassBlur,display:'flex',flexDirection:'column',overflowY:'auto',boxShadow:'-16px 0 64px rgba(0,0,0,0.5)',borderLeft:`1px solid ${DS.border}`,color:DS.textPrimary}}>
        <div style={{padding:'18px 20px',borderBottom:`1px solid ${DS.border}`,display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:2,background:`rgba(20,20,40,0.95)`,backdropFilter:DS.glassBlur}}>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:'50%',background:DS.glassBg,border:DS.glassBorder,color:DS.textSecondary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button>
          <div style={{flex:1,fontSize:16,fontWeight:700}}>{step==='cart'?T('ct.yourCart',{n:String(cart.count)}):step==='checkout'?T('ct.confirmOrder'):T('ct.done')}</div>
          {step==='cart'&&<button onClick={shareCart} style={{width:36,height:36,borderRadius:'50%',background:DS.glassBg,border:DS.glassBorder,color:DS.textSecondary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Share2 size={16}/></button>}
        </div>

        {step==='cart'&&(
          <div style={{flex:1,overflow:'auto',padding:18}}>
            {cart.items.length===0?(
              <div style={{textAlign:'center',padding:'80px 20px',color:DS.textTertiary}}><ShoppingBag size={48} style={{margin:'0 auto 16px',opacity:0.15}}/><div style={{fontSize:15,fontWeight:600,marginBottom:6}}>{T('ct.empty')}</div><button onClick={onClose} style={{marginTop:14,padding:'10px 28px',borderRadius:DS.radiusFull,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer',boxShadow:`0 4px 20px ${DS.purpleGlow}`}}>{T('ct.browse')}</button></div>
            ):(
              <>
                {cart.items.map((item,i)=><div key={i} style={{display:'flex',gap:12,padding:'16px 0',borderBottom:`1px solid ${DS.border}`}}><div style={{width:64,height:64,borderRadius:DS.radiusSm,background:DS.bgGlass,overflow:'hidden',flexShrink:0,border:DS.glassBorder}}>{item.product.imageUrl?<img src={item.product.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,color:DS.textTertiary}}>{item.product.emoji||'📦'}</div>}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{item.product.name}{item.giftWrap?' 🎁':''}</div><div style={{fontSize:10,color:DS.textTertiary,marginTop:2}}>{item.size} · {item.color}</div>{item.giftMessage&&<div style={{fontSize:10,color:DS.textTertiary,marginTop:2}}>💬 {item.giftMessage}</div>}<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}><div style={{display:'flex',alignItems:'center',gap:6,background:DS.bgGlass,borderRadius:DS.radiusSm,padding:'4px 8px',border:DS.glassBorder}}><button onClick={()=>cart.update(item.product.id,item.size,item.color,item.quantity-1)} style={{width:24,height:24,borderRadius:6,background:'transparent',border:'none',color:DS.textSecondary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={10}/></button><span style={{fontSize:13,fontWeight:600,minWidth:20,textAlign:'center'}}>{item.quantity}</span><button onClick={()=>cart.update(item.product.id,item.size,item.color,item.quantity+1)} style={{width:24,height:24,borderRadius:6,background:'transparent',border:'none',color:DS.textSecondary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={10}/></button></div><span style={{fontSize:14,fontWeight:700}}>{(item.product.price*item.quantity+(item.giftWrap?15:0)).toLocaleString()} {cur}</span></div></div><button onClick={()=>cart.remove(item.product.id,item.size,item.color)} style={{width:28,height:28,borderRadius:'50%',background:'rgba(239,68,68,0.1)',border:'none',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><X size={12}/></button></div>)}
                {(remainingForFreeShip>0||remainingForBundle>0||bestDiscount>0||freeShipping)&&<div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:14}}>{freeShipping&&<div style={{fontSize:12,fontWeight:700,color:'#10B981',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:DS.radiusSm,padding:'10px 14px'}}>{T('ct.freeShipDone')}</div>}{!freeShipping&&remainingForFreeShip>0&&remainingForFreeShip<freeShipThreshold&&<div style={{background:DS.glassBg,border:DS.glassBorder,borderRadius:DS.radiusSm,padding:'10px 14px'}}><div style={{fontSize:11,fontWeight:600,color:DS.textSecondary,marginBottom:6}}>{T('ct.addForFree',{x:`${remainingForFreeShip.toLocaleString()} ${cur}`})}</div><div style={{height:5,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,Math.round(afterDiscount/freeShipThreshold*100))}%`,background:`linear-gradient(90deg, ${DS.purple}, ${DS.purpleLight})`,borderRadius:99,transition:'width .4s'}}/></div></div>}{bundleDiscount>0&&<div style={{fontSize:12,fontWeight:700,color:DS.purpleLight,background:DS.purpleSoft,border:`1px solid ${DS.borderPurple}`,borderRadius:DS.radiusSm,padding:'10px 14px'}}>{T('ct.bundleOn',{x:bundleDiscount.toLocaleString(),cur,pct:String(bundleCfg!.percent)})}</div>}{remainingForBundle>0&&bundleCfg&&<div style={{fontSize:11,fontWeight:600,color:DS.textSecondary,background:DS.glassBg,border:DS.glassBorder,borderRadius:DS.radiusSm,padding:'10px 14px'}}>{T('ct.addMore',{n:String(remainingForBundle),unit:remainingForBundle===1?T('ct.pieceOne'):T('ct.pieceMany'),pct:String(bundleCfg.percent)})}</div>}</div>}
                <div style={{padding:'18px 0'}}><button onClick={()=>setStep('checkout')} style={{width:'100%',height:52,borderRadius:DS.radiusFull,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 8px 32px ${DS.purpleGlow}`}}>{T('ct.continueOrder')} <ArrowRight size={16}/></button></div>
              </>
            )}
          </div>
        )}

        {step==='checkout'&&(
          <div style={{flex:1,overflow:'auto',padding:'18px 20px',display:'flex',flexDirection:'column',gap:12}}>
            <input style={inpStyle} placeholder={T('svc.fullName')} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            <input style={inpStyle} placeholder={T('svc.phone')} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} dir="ltr" type="tel"/>
            <input style={inpStyle} placeholder={T('ct.email')} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} dir="ltr" type="email"/>
            <div style={{position:'relative'}}><input style={inpStyle} placeholder={T('ct.cityReq')} value={citySearch||form.city} onChange={e=>{setCitySearch(e.target.value);setShowCities(true);setForm(f=>({...f,city:e.target.value}));}} onFocus={()=>setShowCities(true)} onBlur={()=>setTimeout(()=>setShowCities(false),200)}/>{showCities&&filteredCities.length>0&&<div style={{position:'absolute',top:'100%',right:0,left:0,background:'rgba(20,20,40,0.98)',backdropFilter:DS.glassBlur,border:`1px solid ${DS.border}`,borderRadius:DS.radiusSm,maxHeight:180,overflowY:'auto',zIndex:10,marginTop:4,boxShadow:DS.glassShadow}}>{filteredCities.map(city=><div key={city} onClick={()=>{setForm(f=>({...f,city}));setCitySearch(city);setShowCities(false);}} style={{padding:'10px 15px',fontSize:13,cursor:'pointer',borderBottom:`1px solid ${DS.border}`,color:DS.textSecondary}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background=DS.bgGlass}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background=''}}>{city}</div>)}</div>}</div>
            <textarea style={{...inpStyle,resize:'none'} as any} placeholder={T('ct.addressFull')} rows={2} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/>
            <textarea style={{...inpStyle,resize:'none'} as any} placeholder={T('ct.noteOpt')} rows={1} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            <div><div style={{fontSize:12,fontWeight:700,color:DS.textTertiary,marginBottom:8}}>{T('ct.payMethod')}</div><div style={{display:'flex',gap:8}}>{[['cod',T('ct.cod')],['virement',T('ct.virement')]].map(([v,l])=><button key={v} onClick={()=>setForm(f=>({...f,paymentMethod:v as any}))} style={{flex:1,padding:'12px',borderRadius:DS.radiusSm,border:`1px solid ${form.paymentMethod===v?DS.purpleLight:DS.border}`,background:form.paymentMethod===v?DS.purpleSoft:'transparent',color:form.paymentMethod===v?DS.purpleLight:DS.textSecondary,fontSize:12,fontWeight:600,cursor:'pointer',transition:DS.transitionFast}}>{l}</button>)}</div></div>
            <div><div style={{fontSize:12,fontWeight:700,color:DS.textTertiary,marginBottom:8}}>{T('ct.discountCode')}</div><div style={{display:'flex',gap:8}}><input style={{...inpStyle,flex:1,textTransform:'uppercase'}} placeholder={T('ct.enterCode')} value={couponCode} onChange={e=>{setCouponCode(e.target.value.toUpperCase());setCouponMsg('');}} dir="ltr"/><button onClick={applyCoupon} style={{padding:'0 16px',borderRadius:DS.radiusSm,background:DS.glassBg,border:DS.glassBorder,color:DS.textSecondary,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('ct.apply')}</button></div>{couponMsg&&<div style={{fontSize:11,marginTop:6,color:couponDiscount>0?'#10B981':'#EF4444',fontWeight:600}}>{couponMsg}</div>}</div>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,color:DS.textSecondary}}><input type="checkbox" checked={form.subscribe} onChange={e=>setForm(f=>({...f,subscribe:e.target.checked}))} style={{accentColor:DS.purple,width:14,height:14}}/>{T('ct.wantOffers')}</label>
            <div style={{background:DS.glassBg,borderRadius:DS.radiusMd,padding:'16px',border:DS.glassBorder}}><div style={{fontSize:12,fontWeight:700,color:DS.textTertiary,marginBottom:10}}>{T('ct.orderSummary')}</div>{cart.items.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:DS.textSecondary,marginBottom:5}}><span>{item.product.name} ×{item.quantity}</span><span>{(item.product.price*item.quantity+(item.giftWrap?15:0)).toLocaleString()} {cur}</span></div>)}<div style={{paddingTop:10,borderTop:`1px solid ${DS.border}`,marginTop:10,display:'flex',flexDirection:'column',gap:5}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:DS.textSecondary}}><span>{T('ct.subtotal')}</span><span>{cart.total.toLocaleString()} {cur}</span></div>{bestDiscount>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#10B981',fontWeight:600}}><span>{discountLabel}</span><span>-{bestDiscount.toLocaleString()} {cur}</span></div>}<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:freeShipping?'#10B981':DS.textSecondary,fontWeight:freeShipping?700:400}}><span>{T('ct.delivery')}</span><span>{freeShipping?T('ct.freeMark'):form.city?`${deliveryCost} ${cur}`:'—'}</span></div><div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:900,paddingTop:8,borderTop:`1px solid ${DS.border}`}}><span>{T('ct.total')}</span><span style={{color:DS.orangeLight}}>{grandTotal.toLocaleString()} {cur}</span></div></div></div>
            {hcapKey&&<div style={{display:'flex',justifyContent:'center'}}><div id="hcap-box"/></div>}
            <button onClick={handleOrder} disabled={loading} style={{width:'100%',height:52,borderRadius:DS.radiusFull,background:'#25D366',border:'none',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?T('svc.sending'):<><MessageCircle size={16}/> {T('ct.confirmWA')}</>}</button>
            <button onClick={()=>setStep('cart')} style={{background:'none',border:'none',color:DS.textTertiary,cursor:'pointer',fontSize:12,padding:6}}>{T('ct.back')}</button>
          </div>
        )}

        {step==='success'&&(
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 24px',textAlign:'center'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(16,185,129,0.1)',border:'2px solid #10B981',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24,boxShadow:'0 0 40px rgba(16,185,129,0.2)'}}><Check size={40} color="#10B981"/></div>
            <h2 style={{fontSize:22,fontWeight:900,marginBottom:8}}>{T('ct.orderDone')}</h2>
            <p style={{fontSize:13,color:DS.textSecondary,lineHeight:1.7,marginBottom:24}}>{T('ct.sellerContact')}</p>
            {orderId&&<div style={{fontSize:11,color:DS.textTertiary,background:DS.glassBg,borderRadius:DS.radiusSm,padding:'8px 18px',marginBottom:20,border:DS.glassBorder}}>{orderId}</div>}
            <button onClick={onClose} style={{padding:'12px 32px',borderRadius:DS.radiusFull,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',boxShadow:`0 4px 20px ${DS.purpleGlow}`}}>{T('wh.continue')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ TRACKING MODAL
function TrackingModal({userId,storeInfo,onClose}:{userId:string;storeInfo:StoreInfo;onClose:()=>void}) {
  const [query,setQuery]=useState('');
  const [mode,setMode]=useState<'phone'|'code'>('code');
  const [orders,setOrders]=useState<any[]>([]);
  const [singleOrder,setSingleOrder]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const cur=storeInfo.brand.currency||'MAD';
  useBackToClose(true,onClose);
  const STATUS_AR:Record<string,string>={pending:T('tr.stPending'),approved:T('tr.stApproved'),processing:T('tr.stProcessing'),shipped:T('tr.stShipped'),delivered:T('tr.stDelivered'),cancelled:T('tr.stCancelled')};
  const STATUS_COLOR:Record<string,string>={pending:'#F59E0B',approved:'#10B981',processing:'#F59E0B',shipped:'#10B981',delivered:'#10B981',cancelled:'#EF4444'};

  const search=async()=>{if(!query.trim())return;setLoading(true);setSingleOrder(null);setOrders([]);try{if(mode==='code'){const r=await fetch(`/api/orders/track-code/${encodeURIComponent(query.trim().toUpperCase())}?userId=${userId}`);const d=await r.json();if(r.ok)setSingleOrder(d);}else{const r=await fetch(`/api/orders/track/${encodeURIComponent(query.trim())}?userId=${userId}`);const d=await r.json();setOrders(Array.isArray(d)?d:[]);}}catch{}setSearched(true);setLoading(false);};

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',zIndex:350,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(180deg, rgba(20,20,40,0.98), rgba(10,10,20,0.98))`,backdropFilter:DS.glassBlur,border:`1px solid ${DS.border}`,borderRadius:DS.radiusXl,width:'100%',maxWidth:440,padding:28,boxShadow:DS.glassShadowHover,color:DS.textPrimary}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}><h2 style={{fontSize:18,fontWeight:900}}>{T('tr.title')}</h2><button onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:DS.glassBg,border:DS.glassBorder,color:DS.textSecondary,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14}/></button></div>
        <div style={{display:'flex',gap:8,marginBottom:14}}>{[['code',T('tr.byCode')],['phone',T('tr.byPhone')]].map(([m,l])=><button key={m} onClick={()=>{setMode(m as any);setQuery('');setSearched(false);setSingleOrder(null);setOrders([]);}} style={{flex:1,padding:'10px',borderRadius:DS.radiusSm,border:`1px solid ${mode===m?DS.purpleLight:DS.border}`,background:mode===m?DS.purpleSoft:'transparent',color:mode===m?DS.purpleLight:DS.textSecondary,fontSize:12,fontWeight:600,cursor:'pointer',transition:DS.transitionFast}}>{l}</button>)}</div>
        <div style={{display:'flex',gap:8,marginBottom:18}}><input placeholder={mode==='code'?T('tr.enterCode'):T('tr.enterPhone')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} dir="ltr" style={{flex:1,padding:'12px 15px',borderRadius:DS.radiusSm,border:DS.glassBorder,background:DS.bgInput,color:DS.textPrimary,fontSize:13,outline:'none',textTransform:mode==='code'?'uppercase':'none',fontFamily:'Tajawal,sans-serif'}}/><button onClick={search} disabled={loading} style={{padding:'8px 20px',borderRadius:DS.radiusSm,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14}}>{loading?'⟳':T('tr.search')}</button></div>
        {searched&&!singleOrder&&orders.length===0&&<p style={{color:DS.textTertiary,textAlign:'center',fontSize:13,padding:'16px 0'}}>{T('tr.notFound')}</p>}
        {singleOrder&&<div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:DS.radiusMd,padding:'16px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:14,fontWeight:700}}>{T('tr.yourOrder')}</span><span style={{fontSize:12,fontWeight:700,color:STATUS_COLOR[singleOrder.status]||DS.textSecondary}}>{STATUS_AR[singleOrder.status]||singleOrder.status}</span></div>{(singleOrder.items||[]).map((item:any,i:number)=><div key={i} style={{fontSize:12,color:DS.textSecondary,marginBottom:3}}>• {item.productName} × {item.quantity}</div>)}{singleOrder.deliveryStatus&&<div style={{fontSize:11,color:DS.textTertiary,marginTop:2}}>🚚 {singleOrder.deliveryStatus}</div>}<div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:10,borderTop:'1px solid rgba(16,185,129,0.15)'}}><span style={{fontSize:11,color:DS.textTertiary}}>{singleOrder.city}</span><span style={{fontSize:14,fontWeight:700}}>{singleOrder.total} {cur}</span></div></div>}
        {orders.map((o:any)=><div key={o.id} style={{background:DS.glassBg,borderRadius:DS.radiusMd,padding:'14px',marginBottom:8,border:DS.glassBorder}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><span style={{fontSize:10,color:DS.textTertiary,fontFamily:'monospace'}}>{o.id}</span><span style={{fontSize:11,fontWeight:600,color:STATUS_COLOR[o.status]||DS.textSecondary}}>{STATUS_AR[o.status]||o.status}</span></div>{(o.items||[]).map((item:any,i:number)=><div key={i} style={{fontSize:11,color:DS.textSecondary,marginBottom:2}}>• {item.productName} x{item.quantity}</div>)}{o.deliveryStatus&&<div style={{fontSize:10.5,color:DS.textTertiary,marginTop:2}}>🚚 {o.deliveryStatus}</div>}<div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11}}><span style={{color:DS.textTertiary}}>{new Date(o.createdAt).toLocaleDateString('ar-MA')}</span><span style={{fontWeight:700}}>{o.total} {cur}</span></div></div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════ FLOATING CHAT
function FloatingChat({userId,storeInfo,allProducts,onAddToCart,onView}:{userId:string;storeInfo:StoreInfo;allProducts:SProduct[];onAddToCart:(p:SProduct)=>void;onView:(p:SProduct)=>void}) {
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState<ChatMsg[]>([{role:'ai',content:T('fc.greeting',{store:storeInfo.brand.name||T('sf.store')})}]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [unread,setUnread]=useState(0);
  const endRef=useRef<HTMLDivElement>(null);
  useBackToClose(open,()=>setOpen(false));

  useEffect(()=>{if(open){setUnread(0);endRef.current?.scrollIntoView();}},[msgs,open]);

  const send=async(msg?:string)=>{const text=msg||input.trim();if(!text)return;setInput('');setMsgs(m=>[...m,{role:'user',content:text}]);setLoading(true);try{const r=await fetch('/api/ai/public-reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:msgs.slice(-8).map(m=>({role:m.role,content:m.content})),userId})});const d=await r.json();setMsgs(m=>[...m,{role:'ai',content:d.reply,product:d.product,products:d.products}]);if(!open)setUnread(n=>n+1);}catch{setMsgs(m=>[...m,{role:'ai',content:T('fc.error')}]);}setLoading(false);};

  // بطاقة منتج/خدمة مقترَح داخل المحادثة — «سلة جاهزة بضغطة»
  const SuggCard=({s}:{s:ChatSuggestion})=>{
    const full=allProducts.find(p=>p.id===s.id);
    const isSvc=s.type==='service';
    return (
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 9px',borderRadius:DS.radiusSm,background:'rgba(255,255,255,0.04)',border:DS.glassBorder,marginTop:6}}>
        {s.imageUrl
          ? <img src={s.imageUrl} alt={s.name} style={{width:34,height:34,borderRadius:8,objectFit:'cover',flexShrink:0}}/>
          : <div style={{width:34,height:34,borderRadius:8,background:DS.bgGlass,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.emoji||(isSvc?'🛠️':'📦')}</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontWeight:800,color:DS.textPrimary,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
          <div style={{fontSize:10,color:DS.orange,fontWeight:700}}>{s.price} {storeInfo.brand.currency||'MAD'}</div>
        </div>
        {full&&(
          <button onClick={()=>{setOpen(false);isSvc?onView(full):onAddToCart(full);}}
            style={{flexShrink:0,padding:'5px 10px',borderRadius:DS.radiusFull,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',fontSize:9.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
            {isSvc?T('sf.suggBook'):T('sf.suggAdd')}
          </button>
        )}
      </div>
    );
  };

  return (<>
    <button onClick={()=>setOpen(v=>!v)} style={{width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 8px 32px ${DS.purpleGlow}`,position:'fixed',bottom:28,left:20,zIndex:150,color:'#fff',transition:DS.transitionFast}}>
      {open?<X size={20}/>:<Bot size={20}/>}
      {unread>0&&!open&&<div style={{position:'absolute',top:-4,right:-4,width:18,height:18,background:'#EF4444',borderRadius:'50%',fontSize:10,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #0A0A14',color:'#fff'}}>{unread}</div>}
    </button>
    {open&&(
      <div style={{position:'fixed',bottom:92,left:16,right:16,maxWidth:380,marginLeft:'auto',background:`linear-gradient(180deg, rgba(20,20,40,0.98), rgba(10,10,20,0.98))`,backdropFilter:DS.glassBlur,border:`1px solid ${DS.border}`,borderRadius:DS.radiusLg,boxShadow:DS.glassShadowHover,zIndex:200,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:440}}>
        <div style={{padding:'14px 16px',background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,display:'flex',alignItems:'center',gap:10}}><div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={14}/></div><div><div style={{fontSize:12,fontWeight:700}}>{T('fc.assistant',{store:storeInfo.brand.name})}</div><div style={{fontSize:9,opacity:0.7}}>{T('fc.available')}</div></div><button onClick={()=>setOpen(false)} style={{marginRight:'auto',background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer'}}><X size={14}/></button></div>
        <div style={{flex:1,overflow:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:8}}>{msgs.map((m,i)=><div key={i} style={{maxWidth:'85%',alignSelf:m.role==='user'?'flex-end':'flex-start'}}><div style={{padding:'8px 12px',borderRadius:DS.radiusSm,background:m.role==='user'?`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`:DS.glassBg,border:m.role==='user'?'none':DS.glassBorder,color:'#fff',fontSize:11,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{m.content}</div>{m.products?.map(s=><SuggCard key={s.id} s={s}/>)}</div>)}{loading&&<div style={{padding:'8px 12px',borderRadius:DS.radiusSm,background:DS.glassBg,color:DS.textTertiary,fontSize:11,alignSelf:'flex-start'}}>{T('fc.typing')}</div>}<div ref={endRef}/></div>
        <div style={{padding:'6px 10px',display:'flex',gap:4,flexWrap:'wrap',borderTop:`1px solid ${DS.border}`}}>{[T('fc.qProducts'),T('fc.qServices'),T('fc.qTrack'),T('fc.qDelivery')].map(q=><button key={q} onClick={()=>send(q)} style={{fontSize:9,padding:'4px 10px',borderRadius:DS.radiusFull,background:DS.bgGlass,border:DS.glassBorder,color:DS.textSecondary,cursor:'pointer'}}>{q}</button>)}</div>
        <div style={{padding:'8px 10px',borderTop:`1px solid ${DS.border}`,display:'flex',gap:8}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder={T('fc.inputPh')} style={{flex:1,padding:'8px 12px',fontSize:11,borderRadius:DS.radiusFull,border:DS.glassBorder,background:DS.bgInput,color:DS.textPrimary,outline:'none',fontFamily:'Tajawal,sans-serif'}}/><button onClick={()=>send()} disabled={!input.trim()||loading} style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:(!input.trim()||loading)?0.5:1}}><Send size={11}/></button></div>
      </div>
    )}
  </>);
}

// ═══════════════════════════════════════════════════════════════ MAIN STOREFRONT
export default function Storefront() {
  const userId=(()=>{const path=window.location.pathname;const m=path.match(/\/store\/([^\/\?]+)/);if(m)return m[1];const p=new URLSearchParams(window.location.search);const q=p.get('userId')||p.get('user')||p.get('id');if(q)return q;const h=window.location.hash.replace('#','');if(h&&h.length>5)return h;return '';})();
  const {products,storeInfo,loading,error}=useStorefront(userId);
  const cart=useCart();
  const [viewProduct,setViewProduct]=useState<SProduct|null>(null);
  const [showCart,setShowCart]=useState(false);
  const [showTrack,setShowTrack]=useState(false);
  const [showWheel,setShowWheel]=useState(false);
  const [tab,setTab]=useState<'all'|'products'|'services'|'digital'>('all');
  const [liveTicker,setLiveTicker]=useState<{name:string;city:string;product:string;time:string}[]>([]);
  const [successOrderId,setSuccessOrderId]=useState('');
  const [cartAnim,setCartAnim]=useState(false);
  const [lang,setLangState]=useState<Lang>(initialPublicLang);
  const setLang=(l:Lang)=>{setLangState(l);try{localStorage.setItem('amanzine_lang',l);}catch{}};
  const rtl=isRtlLang(lang);
  CURRENT_LANG=lang; // ضبط لغة الوحدة قبل رسم الأبناء
  void successOrderId;

  useEffect(()=>{const recentOrders=JSON.parse(localStorage.getItem('amanzine_recent_orders')||'[]');if(recentOrders.length){const o=recentOrders[Math.floor(Math.random()*recentOrders.length)];const mins=Math.floor(Math.random()*12)+2;setLiveTicker([{name:o.name,city:o.city,product:o.product,time:T('sf.min',{n:String(mins)})}]);const tid=setTimeout(()=>setLiveTicker([]),5000);return()=>clearTimeout(tid);}},[cart.items.length]);
  const handleAddToCart=(p:SProduct,size?:string,color?:string)=>{cart.add(p,size||p.sizes?.[0]||'',color||p.colors?.[0]||'');setCartAnim(true);setTimeout(()=>setCartAnim(false),600);};
  useEffect(()=>{(window as any).__sfProducts=products;},[products]);
  useEffect(()=>{if(!products.length)return;const pid=new URLSearchParams(window.location.search).get('p');if(pid){const f=products.find(x=>x.id===pid);if(f)setViewProduct(f);}},[products]);
  useEffect(()=>{if(viewProduct)trackStoreEvent(userId,'view',{id:viewProduct.id,name:viewProduct.name});},[viewProduct?.id]);
  useEffect(()=>{const h=(e:any)=>{if(e.detail)setViewProduct(e.detail);};document.addEventListener('viewProduct',h);return()=>document.removeEventListener('viewProduct',h);},[]);

  const allProducts=products.filter(p=>(!p.type||p.type==='product'));
  const allServices=products.filter(p=>p.type==='service');
  const allDigital=products.filter(p=>p.type==='digital');
  const showProducts=tab==='all'||tab==='products';
  const showServices=tab==='all'||tab==='services';
  const showDigital=tab==='all'||tab==='digital';

  if(loading) return <PageSkeleton/>;

  if(!userId) return (<div dir={rtl?'rtl':'ltr'} style={{minHeight:'100dvh',background:DS.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center',gap:16,fontFamily:'Tajawal,system-ui,sans-serif',color:DS.textPrimary}}><div style={{fontSize:48,opacity:0.3}}>🏪</div><div style={{fontSize:20,fontWeight:900}}>{T('sf.storeTitle')}</div><div style={{fontSize:13,color:DS.textTertiary,maxWidth:280,lineHeight:1.7}}>{T('sf.askMerchant')}</div><a href="/" style={{padding:'10px 24px',borderRadius:DS.radiusFull,background:`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`,color:'#fff',fontWeight:700,fontSize:13,textDecoration:'none',marginTop:4,boxShadow:`0 4px 20px ${DS.purpleGlow}`}}>{T('sf.home')}</a></div>);

  if(error||(!loading&&!storeInfo)) return (<div dir={rtl?'rtl':'ltr'} style={{minHeight:'100dvh',background:DS.bg,display:'flex',alignItems:'center',justifyContent:'center',color:DS.textPrimary,textAlign:'center',padding:32,fontFamily:'Tajawal,system-ui,sans-serif'}}><div><div style={{fontSize:36,marginBottom:12,opacity:0.3}}>🏪</div><div style={{fontSize:16,fontWeight:700,marginBottom:6}}>{T('sf.notFound')}</div><div style={{fontSize:13,color:DS.textTertiary}}>{error||T('sf.checkLink')}</div></div></div>);

  const brand=storeInfo!.brand;
  const cur=brand.currency||'MAD';

  if(!loading&&!error&&storeInfo&&products.length===0) return (<div dir={rtl?'rtl':'ltr'} style={{minHeight:'100dvh',background:DS.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',textAlign:'center',fontFamily:'Tajawal,system-ui,sans-serif',color:DS.textPrimary}}><div style={{width:80,height:80,borderRadius:DS.radiusLg,background:DS.glassBg,backdropFilter:DS.glassBlur,border:DS.glassBorder,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,boxShadow:DS.glassShadow}}>{brand.logo?<img src={brand.logo} alt="logo" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:32}}>🏪</span>}</div><h1 style={{fontSize:24,fontWeight:900,marginBottom:8}}>{brand.name||T('sf.store')}</h1><div style={{fontSize:60,margin:'20px 0 14px',opacity:0.1}}>📦</div><h2 style={{fontSize:18,fontWeight:600,marginBottom:8}}>{T('sf.preparing')}</h2><p style={{fontSize:14,color:DS.textTertiary,maxWidth:300,lineHeight:1.8,marginBottom:28}}>{T('sf.comingSoon')}</p>{brand.phone&&<a href={`https://wa.me/${brand.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{padding:'12px 28px',borderRadius:DS.radiusFull,background:'#25D366',color:'#fff',fontSize:14,fontWeight:700,textDecoration:'none'}}>{T('sf.contactUs')}</a>}</div>);

  return (
    <div dir={rtl?'rtl':'ltr'} style={{minHeight:'100dvh',background:DS.bg,color:DS.textPrimary,fontFamily:'Tajawal,system-ui,sans-serif',paddingBottom:80,position:'relative'}}>
      <style>{`body{background:${DS.bg}!important;margin:0;padding:0}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${DS.border};border-radius:99px}`}</style>
      <AnimatedBackground/>
      <header style={{position:'sticky',top:12,zIndex:100,margin:'12px 14px 0',background:DS.glassBg,backdropFilter:DS.glassBlur,WebkitBackdropFilter:DS.glassBlur,border:DS.glassBorder,borderRadius:DS.radiusXl,padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,height:56,boxShadow:DS.glassShadow}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>{brand.logo&&<img src={brand.logo} alt={brand.name} style={{width:30,height:30,borderRadius:'50%',objectFit:'contain'}}/>}<div style={{fontSize:13,fontWeight:700}}>{brand.name}</div>{(()=>{const st=storeOpenStatus((brand as any).workStart,(brand as any).workEnd);return st?<span style={{fontSize:9,fontWeight:700,color:st.open?'#10B981':'#EF4444',background:st.open?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)',border:'1px solid '+(st.open?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'),borderRadius:DS.radiusFull,padding:'3px 8px',whiteSpace:'nowrap'}}>{(st.open?'🟢 ':'🔴 ')+storeStatusLabel(st)}</span>:null;})()}</div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}><StoreLangPicker lang={lang} setLang={setLang}/><button onClick={()=>setShowTrack(true)} style={{padding:'6px 12px',borderRadius:DS.radiusFull,background:DS.bgGlass,border:DS.glassBorder,color:DS.textSecondary,fontSize:10,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><Package size={11}/> {T('sf.track')}</button>{brand.phone&&<a href={`https://wa.me/${brand.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{padding:'6px 12px',borderRadius:DS.radiusFull,background:'rgba(37,211,102,0.1)',border:'1px solid rgba(37,211,102,0.2)',color:'#25D366',fontSize:10,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:4}}><MessageCircle size={11}/> {T('sf.whatsapp')}</a>}<button onClick={()=>setShowCart(true)} style={{position:'relative',padding:'6px 12px',borderRadius:DS.radiusFull,background:cartAnim?`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`:DS.bgGlass,border:`1px solid ${cartAnim?'transparent':DS.border}`,color:cartAnim?'#fff':DS.textSecondary,fontSize:10,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4,transition:DS.transitionFast,boxShadow:cartAnim?`0 4px 16px ${DS.purpleGlow}`:'none'}}><ShoppingCart size={13}/>{cart.count>0&&<span>({cart.count})</span>}</button></div>
      </header>
      <HeroSection brand={brand} onShop={()=>setTab('products')}/>
      <InfoHighlights brand={brand} storeInfo={storeInfo} cur={cur}/>
      <div style={{display:'flex',gap:6,padding:'6px',margin:'0 14px 24px',background:DS.glassBg,backdropFilter:DS.glassBlur,border:DS.glassBorder,borderRadius:DS.radiusFull}}>{[['all',T('sf.tabAll')],['products',T('sf.tabProducts')],['services',T('sf.tabServices')],['digital',T('sf.tabDigital')]].map(([v,l])=><button key={v} onClick={()=>setTab(v as any)} style={{flex:1,padding:'10px',borderRadius:DS.radiusFull,border:'none',background:tab===v?`linear-gradient(135deg, ${DS.purple}, ${DS.purpleLight})`:'transparent',color:tab===v?'#fff':DS.textSecondary,fontSize:11,fontWeight:700,cursor:'pointer',transition:DS.transitionFast,boxShadow:tab===v?`0 4px 16px ${DS.purpleGlow}`:'none'}}>{l}</button>)}</div>
      <div style={{padding:'0 14px',position:'relative',zIndex:1}}>
        {showProducts&&allProducts.length>0&&<div style={{marginBottom:48}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:14}}>{allProducts.map(p=><ProductCard key={p.id} p={p} currency={cur} onAdd={handleAddToCart} onView={p=>setViewProduct(p)}/>)}</div></div>}
        {showServices&&allServices.length>0&&<div style={{marginBottom:48}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}><div style={{width:4,height:24,background:`linear-gradient(180deg, ${DS.purple}, ${DS.purpleLight})`,borderRadius:DS.radiusFull,boxShadow:`0 0 12px ${DS.purpleGlow}`}}/><span style={{fontSize:16,fontWeight:900}}>{T('sf.ourServices')}</span><span style={{fontSize:11,color:DS.textTertiary,background:DS.glassBg,border:DS.glassBorder,padding:'3px 10px',borderRadius:DS.radiusFull}}>{allServices.length}</span></div><div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:8,scrollbarWidth:'none'}}>{allServices.map(p=><ServiceCard key={p.id} p={p} currency={cur} onView={p=>setViewProduct(p)}/>)}</div></div>}
        {showDigital&&allDigital.length>0&&<div style={{marginBottom:48}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:14}}>{allDigital.map(p=><ProductCard key={p.id} p={p} currency={cur} onAdd={handleAddToCart} onView={p=>setViewProduct(p)}/>)}</div></div>}
        {showServices&&<ProvidersBooking userId={userId} currency={cur}/>}
        {allProducts.length===0&&allServices.length===0&&allDigital.length===0&&<div style={{textAlign:'center',padding:'80px 20px',color:DS.textTertiary}}><ShoppingBag size={48} style={{marginBottom:16,opacity:0.15}}/><div style={{fontSize:15,fontWeight:600}}>{T('sf.noProducts')}</div></div>}
        <div style={{marginTop:48,paddingTop:24,borderTop:`1px solid ${DS.border}`,textAlign:'center',paddingBottom:20}}><div style={{fontSize:12,color:DS.textTertiary,marginBottom:8,fontWeight:700}}>{brand.name}</div><div style={{display:'flex',justifyContent:'center',gap:16}}>{brand.phone&&<a href={`https://wa.me/${brand.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#25D366',textDecoration:'none',fontWeight:600}}>واتساب</a>}{brand.instagram&&<a href={`https://instagram.com/${brand.instagram}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:DS.textTertiary,textDecoration:'none',fontWeight:600}}>Instagram</a>}{brand.facebook&&<a href={`https://facebook.com/${brand.facebook}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:DS.textTertiary,textDecoration:'none',fontWeight:600}}>Facebook</a>}</div><a href="/market" style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:14,padding:'8px 18px',borderRadius:DS.radiusFull,background:'rgba(255,106,0,0.08)',border:'1px solid rgba(255,106,0,0.2)',color:'#FF9A55',fontSize:11.5,fontWeight:700,textDecoration:'none'}}>{T('sf.discoverMarket')}</a><div style={{fontSize:9,color:DS.textTertiary,opacity:0.4,marginTop:10}}>Powered by AMANZINE 🇲🇦</div></div>
      </div>
      <LiveTicker orders={liveTicker}/>
      {cart.count>0&&!showCart&&<div style={{position:'fixed',bottom:20,right:14,left:14,zIndex:150}}><button onClick={()=>setShowCart(true)} style={{width:'100%',height:54,background:DS.glassBg,backdropFilter:DS.glassBlur,border:`1px solid ${DS.borderPurple}`,borderRadius:DS.radiusFull,color:DS.textPrimary,fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow:`0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${DS.borderPurple}`}}><ShoppingCart size={18}/>{T('sf.cartN',{count:String(cart.count)})}<span style={{background:DS.purpleSoft,borderRadius:DS.radiusFull,padding:'4px 14px',fontSize:13,fontWeight:700,color:DS.purpleLight}}>{cart.total.toLocaleString()} {cur}</span></button></div>}
      {viewProduct&&(viewProduct.type==='service'?<ServiceModal p={viewProduct} onClose={()=>setViewProduct(null)} currency={cur} storeInfo={storeInfo!} userId={userId}/>:<ProductModal p={viewProduct} cart={cart} onClose={()=>setViewProduct(null)} currency={cur} userId={userId}/>)}
      {storeInfo?.promotions?.wheel?.enabled!==false&&<button onClick={()=>setShowWheel(true)} aria-label="عجلة الحظ" style={{position:'fixed',bottom:88,left:20,zIndex:150,width:50,height:50,borderRadius:'50%',background:`linear-gradient(135deg, ${DS.orange}, ${DS.orangeLight})`,border:'none',cursor:'pointer',fontSize:23,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 8px 28px ${DS.orangeGlow}`}}>🎡</button>}
      <LuckyWheel userId={userId} open={showWheel} onClose={()=>setShowWheel(false)}/>
      {showCart&&<CartSidebar cart={cart} storeInfo={storeInfo!} userId={userId} onClose={()=>setShowCart(false)} onOrderSuccess={id=>{setSuccessOrderId(id);setShowCart(false);}}/>}
      {showTrack&&<TrackingModal userId={userId} storeInfo={storeInfo!} onClose={()=>setShowTrack(false)}/>}
      <FloatingChat userId={userId} storeInfo={storeInfo!} allProducts={products}
        onAddToCart={p=>{cart.add(p,'','');setShowCart(true);}}
        onView={p=>setViewProduct(p)}/>
    </div>
  );
}