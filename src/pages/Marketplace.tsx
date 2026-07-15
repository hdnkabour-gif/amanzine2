import { useState, useEffect, useRef } from 'react';
import DiscoverSections from '../components/DiscoverSections'; // Super App — الاكتشاف الموحد
import { type Lang, LANGS, isRtlLang } from '../i18n';
import { pt } from '../i18n/public';

// ════════════════════════════════════════════════════════════
// السوق المغربي الموحّد (Marketplace) — صفحة عامة (بلا حساب):
//  • كتالوج الإعلانات المعتمَدة (منتجات + خدمات) مع فلترة.
//  • زر «انشر إعلانك مجاناً» → نموذج يُرسِل إعلاناً pending للمراجعة.
//  • متعدّد اللغات: الزبون يختار لغته بنفسه (محفوظة في amanzine_lang).
// إضافية بالكامل — لا تمسّ المتجر/المنتجات/الطلبات الحالية.
// ════════════════════════════════════════════════════════════

const C = {
  bg: '#0A0A0F', panel: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  ink1: '#FAFAFA', ink2: 'rgba(255,255,255,0.62)', ink3: 'rgba(255,255,255,0.38)',
  ember: '#FF6A00', emberSoft: 'rgba(255,106,0,0.12)', purple: '#7C3AED',
  mint: '#00D2B3', input: 'rgba(255,255,255,0.05)',
};
const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.input, color: C.ink1, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Tajawal,sans-serif' };

interface Listing {
  id: string; type: 'product' | 'service'; name: string; description: string; price: number;
  category: string; city: string; images: string[]; duration?: string; workArea?: string;
  sellerName: string; sellerPhone: string; ratingAvg?: number; ratingCount?: number;
  details?: ServiceDetails;
}
interface ServiceDetails { specialties?: string[]; serviceModes?: string[]; pricingModel?: string; customFields?: { label: string; value: string }[]; }
interface Review { id: string; rating: number; comment: string; reviewerName: string; createdAt: string; }

// اقتراحات تخصّصات شائعة (قابلة للإضافة) — للنموذج الذكي للخدمة
const SPEC_SUGGEST = ['شبكات', 'كاميرات مراقبة', 'بارابول', 'إصلاح حواسيب', 'برمجة', 'تطبيقات', 'كهرباء', 'سباكة', 'نجارة', 'صباغة', 'تكييف', 'تنظيف', 'حلاقة', 'تصوير', 'تصميم'];

// أسماء المدن أسماء عَلَم — تبقى عربية لأن الخادم يفلتر بها حرفياً
const CITIES = ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة', 'أكادير', 'مكناس', 'وجدة', 'سلا', 'تطوان', 'القنيطرة', 'الجديدة'];

// لغة الزبون المحفوظة (مشتركة مع المتجر) — أو لغة المتصفّح
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('amanzine_lang');
    if (saved && LANGS.some(l => l.code === saved)) return saved as Lang;
    const nav = (navigator.language || 'ar').slice(0, 2);
    if (LANGS.some(l => l.code === nav)) return nav as Lang;
  } catch {}
  return 'ar';
}

// مُبدّل اللغة المُدمج (علم + قائمة منسدلة)
function LangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} aria-label="language" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', borderRadius: 10, background: C.panel, border: `1px solid ${C.border}`, color: C.ink1, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 15 }}>{cur.flag}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '120%', insetInlineEnd: 0, minWidth: 140, background: '#16161E', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', zIndex: 200 }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', background: l.code === lang ? C.emberSoft : 'transparent', border: 'none', color: l.code === lang ? '#FF9A55' : C.ink2, fontSize: 13, fontWeight: l.code === lang ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: isRtlLang(l.code) ? 'right' : 'left' }}>
              <span style={{ fontSize: 16 }}>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Marketplace() {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('amanzine_lang', l); } catch {} };
  const rtl = isRtlLang(lang);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'all' | 'product' | 'service'>('all');
  // يُبذَر من رابط «شنو محتاج اليوم؟» (‎/market?q=…&city=…) فيبحث الخادم مباشرة
  const [city, setCity] = useState(() => { try { return new URLSearchParams(window.location.search).get('city') || ''; } catch { return ''; } });
  const [q, setQ] = useState(() => { try { return new URLSearchParams(window.location.search).get('q') || ''; } catch { return ''; } }); // Discover: بحث موحّد عبر كل شيء
  const [showSell, setShowSell] = useState(false);
  const [detail, setDetail] = useState<Listing | null>(null);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (type !== 'all') qs.set('type', type);
    if (city) qs.set('city', city);
    if (q.trim()) qs.set('q', q.trim());
    fetch(`/api/listings/public/catalog?${qs.toString()}`)
      .then(r => r.json())
      .then(d => setListings(Array.isArray(d.listings) ? d.listings : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  };
  // debounce أثناء الكتابة حتى لا نغرق الخادم بطلب لكل حرف
  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [type, city, q]);

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', background: 'radial-gradient(130% 80% at 50% -5%, #0d3a2e 0%, #0a2a22 45%, #071B17 100%)', backgroundAttachment: 'fixed', color: C.ink1, fontFamily: 'Tajawal,system-ui,sans-serif', paddingBottom: 90 }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 22 }}>🏪</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{pt(lang, 'mk.title')}</div>
            <div style={{ fontSize: 10.5, color: C.ink3 }}>{pt(lang, 'mk.subtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LangPicker lang={lang} setLang={setLang} />
          <button onClick={() => setShowSell(true)} style={{ padding: '9px 16px', borderRadius: 11, background: `linear-gradient(135deg, ${C.ember}, #CC5500)`, border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{pt(lang, 'mk.publish')}</button>
        </div>
      </header>

      {/* Filters */}
      <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 99, padding: 4 }}>
          {([['all', pt(lang, 'mk.all')], ['product', pt(lang, 'mk.products')], ['service', pt(lang, 'mk.services')]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setType(v as any)} style={{ padding: '7px 14px', borderRadius: 99, border: 'none', background: type === v ? C.ember : 'transparent', color: type === v ? '#fff' : C.ink2, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>
        <select value={city} onChange={e => setCity(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 140 }}>
          <option value="">{pt(lang, 'mk.allCities')}</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="🔍 ابحث عن أي شيء: منتج، خدمة، سباك، متجر…"
          style={{ ...inp, flex: 1, minWidth: 200 }}
        />
      </div>

      {/* Catalog */}
      <div style={{ padding: '0 16px' }}>
        {/* Discover: منتجات كل المتاجر + مقدّمو الخدمات + المتاجر — نتيجة واحدة */}
        <DiscoverSections city={city} q={q} />
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.ink3 }}>{pt(lang, 'mk.loading')}</div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: C.ink3 }}>
            <div style={{ fontSize: 46, opacity: 0.3, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{pt(lang, 'mk.emptyTitle')}</div>
            <div style={{ fontSize: 12.5, marginBottom: 18 }}>{pt(lang, 'mk.emptySub')}</div>
            <button onClick={() => setShowSell(true)} style={{ padding: '11px 24px', borderRadius: 12, background: `linear-gradient(135deg, ${C.ember}, #CC5500)`, border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.publish')}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            {listings.map(l => <ListingCard key={l.id} l={l} lang={lang} onOpen={() => setDetail(l)} />)}
          </div>
        )}
      </div>

      {showSell && <SellModal lang={lang} rtl={rtl} onClose={() => setShowSell(false)} onDone={load} />}
      {detail && <DetailModal l={detail} lang={lang} rtl={rtl} onClose={() => setDetail(null)} />}
    </div>
  );
}

// نجوم التقييم (عرض فقط أو تفاعلي)
function Stars({ value, size = 13, onPick }: { value: number; size?: number; onPick?: (n: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, fontSize: size, lineHeight: 1 }} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} onClick={onPick ? () => onPick(i) : undefined}
          style={{ color: i <= Math.round(value) ? '#FFB800' : 'rgba(255,255,255,0.2)', cursor: onPick ? 'pointer' : 'default' }}>★</span>
      ))}
    </span>
  );
}

function ListingCard({ l, lang, onOpen }: { l: Listing; lang: Lang; onOpen: () => void }) {
  const wa = (l.sellerPhone || '').replace(/\D/g, '');
  const isSvc = l.type === 'service';
  const msg = pt(lang, 'mk.waMsg', { name: l.sellerName, emoji: isSvc ? '🔧' : '🛍️', listing: l.name, price: String(l.price) });
  const rc = l.ratingCount || 0;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div onClick={onOpen} style={{ height: 110, background: isSvc ? 'rgba(124,58,237,0.12)' : 'rgba(255,106,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, cursor: 'pointer' }}>
        {l.images && l.images[0] ? <img src={l.images[0]} alt={l.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (isSvc ? '🔧' : '🛍️')}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: isSvc ? '#a78bfa' : '#FF9A55', background: isSvc ? 'rgba(124,58,237,0.14)' : C.emberSoft, borderRadius: 99, padding: '2px 8px' }}>{isSvc ? pt(lang, 'mk.service') : pt(lang, 'mk.product')}</span>
          {l.city && <span style={{ fontSize: 9.5, color: C.ink3 }}>📍 {l.city}</span>}
        </div>
        <div onClick={onOpen} style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{l.name}</div>
        {rc > 0
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Stars value={l.ratingAvg || 0} size={11} /><span style={{ fontSize: 10, color: C.ink3 }}>{(l.ratingAvg || 0).toFixed(1)} ({rc})</span></div>
          : <div style={{ fontSize: 10, color: C.ink3 }}>{pt(lang, 'mk.noReviews')}</div>}
        {l.description && <div style={{ fontSize: 11, color: C.ink3, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{l.description}</div>}
        <div style={{ fontSize: 15, fontWeight: 900, color: C.ember, marginTop: 'auto' }}>{(+l.price).toLocaleString()} <span style={{ fontSize: 10, color: C.ink3 }}>{pt(lang, 'mk.currency')}</span></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onOpen} style={{ flex: 1, padding: '8px', borderRadius: 10, background: C.input, border: `1px solid ${C.border}`, color: C.ink1, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.details')}</button>
          {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>{pt(lang, 'mk.contact')}</a>}
        </div>
      </div>
    </div>
  );
}

// نافذة التفاصيل + التقييمات (عامة — بلا حساب)
function DetailModal({ l, lang, rtl, onClose }: { l: Listing; lang: Lang; rtl: boolean; onClose: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<{ avg: number; count: number }>({ avg: l.ratingAvg || 0, count: l.ratingCount || 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [thanks, setThanks] = useState(false);

  const loadReviews = () => {
    setLoading(true);
    fetch(`/api/listings/${l.id}/reviews`)
      .then(r => r.json())
      .then(d => { setReviews(Array.isArray(d.reviews) ? d.reviews : []); if (d.rating) setRating(d.rating); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(loadReviews, [l.id]);

  const submit = async () => {
    if (reviewerName.trim().length < 2) { setErr(pt(lang, 'mk.errName')); return; }
    setErr(''); setSubmitting(true);
    try {
      const r = await fetch(`/api/listings/${l.id}/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars, comment, reviewerName }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || pt(lang, 'mk.errSend'));
      setShowForm(false); setComment(''); setReviewerName(''); setStars(5); setThanks(true);
      loadReviews();
    } catch (e: any) { setErr(e.message); }
    setSubmitting(false);
  };

  const wa = (l.sellerPhone || '').replace(/\D/g, '');
  const isSvc = l.type === 'service';
  const msg = pt(lang, 'mk.waMsg', { name: l.sellerName, emoji: isSvc ? '🔧' : '🛍️', listing: l.name, price: String(l.price) });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} dir={rtl ? 'rtl' : 'ltr'} style={{ width: '100%', maxWidth: 520, maxHeight: '92dvh', overflowY: 'auto', background: '#12121A', borderRadius: '22px 22px 0 0', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
        {/* الصورة/الرأس */}
        <div style={{ position: 'relative', height: 180, background: isSvc ? 'rgba(124,58,237,0.12)' : 'rgba(255,106,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
          {l.images && l.images[0] ? <img src={l.images[0]} alt={l.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (isSvc ? '🔧' : '🛍️')}
          <button onClick={onClose} style={{ position: 'absolute', top: 12, insetInlineStart: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: isSvc ? '#a78bfa' : '#FF9A55', background: isSvc ? 'rgba(124,58,237,0.14)' : C.emberSoft, borderRadius: 99, padding: '3px 10px' }}>{isSvc ? pt(lang, 'mk.service') : pt(lang, 'mk.product')}</span>
            {l.city && <span style={{ fontSize: 11, color: C.ink3 }}>📍 {l.city}</span>}
            {l.category && <span style={{ fontSize: 11, color: C.ink3 }}>· {l.category}</span>}
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 900, margin: '0 0 6px' }}>{l.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Stars value={rating.avg} size={15} />
            <span style={{ fontSize: 12.5, color: C.ink2, fontWeight: 700 }}>{rating.count > 0 ? pt(lang, 'mk.ratingCount', { avg: rating.avg.toFixed(1), count: String(rating.count) }) : pt(lang, 'mk.noReviews')}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.ember, marginBottom: 12 }}>{(+l.price).toLocaleString()} <span style={{ fontSize: 12, color: C.ink3 }}>{pt(lang, 'mk.currency')}</span></div>
          {l.description && <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.7, marginBottom: 12 }}>{l.description}</p>}
          {isSvc && (l.duration || l.workArea) && (
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.ink2, marginBottom: 12 }}>
              {l.duration && <span>⏱️ {l.duration}</span>}
              {l.workArea && <span>📐 {l.workArea}</span>}
            </div>
          )}
          {isSvc && l.details && (
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!!l.details.specialties?.length && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {l.details.specialties.map(s => <span key={s} style={{ padding: '4px 10px', borderRadius: 99, background: C.emberSoft, border: `1px solid ${C.ember}40`, color: '#FF9A55', fontSize: 11.5, fontWeight: 700 }}>{s}</span>)}
                </div>
              )}
              {!!l.details.serviceModes?.length && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {l.details.serviceModes.map(m => <span key={m} style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(124,58,237,0.14)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 11.5, fontWeight: 700 }}>{m}</span>)}
                </div>
              )}
              {l.details.pricingModel && <div style={{ fontSize: 12.5, color: C.ink2, fontWeight: 700 }}>💰 {l.details.pricingModel}</div>}
              {!!l.details.customFields?.length && (
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {l.details.customFields.map((cf, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                      <span style={{ color: C.ink3, flexShrink: 0 }}>{cf.label}</span>
                      <span style={{ color: C.ink1, fontWeight: 700, textAlign: rtl ? 'left' : 'right' }}>{cf.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 12, background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'none', marginBottom: 8 }}>{pt(lang, 'mk.contactWith', { name: l.sellerName || pt(lang, 'mk.seller') })}</a>}

          {/* قسم التقييمات */}
          <div style={{ height: 1, background: C.border, margin: '16px 0 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>{pt(lang, 'mk.reviewsTitle', { count: String(rating.count) })}</h3>
            {!showForm && <button onClick={() => { setShowForm(true); setThanks(false); }} style={{ padding: '8px 14px', borderRadius: 10, background: C.emberSoft, border: `1px solid ${C.ember}`, color: '#FF9A55', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.addReview')}</button>}
          </div>

          {thanks && !showForm && <div style={{ fontSize: 12.5, color: C.mint, fontWeight: 700, marginBottom: 12 }}>{pt(lang, 'mk.thanks')}</div>}

          {showForm && (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: C.ink2, fontWeight: 700 }}>{pt(lang, 'mk.yourRating')}</span>
                <Stars value={stars} size={24} onPick={setStars} />
              </div>
              <input style={inp} placeholder={pt(lang, 'mk.yourName')} value={reviewerName} onChange={e => setReviewerName(e.target.value)} />
              <textarea style={{ ...inp, resize: 'none' } as any} rows={2} placeholder={pt(lang, 'mk.yourOpinion')} value={comment} onChange={e => setComment(e.target.value)} />
              {err && <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={submit} disabled={submitting} style={{ flex: 1, height: 44, borderRadius: 11, background: submitting ? C.input : `linear-gradient(135deg, ${C.ember}, #CC5500)`, border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit' }}>{submitting ? pt(lang, 'mk.processing') : pt(lang, 'mk.submitReview')}</button>
                <button onClick={() => { setShowForm(false); setErr(''); }} style={{ padding: '0 16px', height: 44, borderRadius: 11, background: C.input, border: `1px solid ${C.border}`, color: C.ink2, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.cancel')}</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: C.ink3, fontSize: 12.5 }}>{pt(lang, 'mk.loading')}</div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: C.ink3, fontSize: 12.5 }}>{pt(lang, 'mk.beFirst')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.map(rv => (
                <div key={rv.id} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800 }}>{rv.reviewerName || pt(lang, 'mk.anon')}</span>
                    <Stars value={rv.rating} size={11} />
                  </div>
                  {rv.comment && <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>{rv.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SellModal({ lang, rtl, onClose, onDone }: { lang: Lang; rtl: boolean; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<'product' | 'service'>('product');
  const [f, setF] = useState({ name: '', description: '', price: '', category: '', city: '', sellerName: '', sellerPhone: '', duration: '', workArea: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [img, setImg] = useState('');
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  // ── النموذج الذكي للخدمة: تخصّصات متعددة + طرق الطلب + تسعير + حقول مخصّصة ──
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState('');
  const [modes, setModes] = useState<string[]>([]);
  const [pricing, setPricing] = useState('');
  const [fields, setFields] = useState<{ label: string; value: string }[]>([]);
  const addSpec = (v: string) => { const s = (v || '').trim(); if (s && !specialties.includes(s) && specialties.length < 12) setSpecialties(a => [...a, s]); setSpecInput(''); };
  const toggleMode = (m: string) => setModes(a => a.includes(m) ? a.filter(x => x !== m) : [...a, m]);
  const setFieldAt = (i: number, k: 'label' | 'value', v: string) => setFields(a => a.map((f, j) => j === i ? { ...f, [k]: v } : f));
  const buildDetails = () => ({ specialties, serviceModes: modes, pricingModel: pricing, customFields: fields.filter(x => x.label.trim() && x.value.trim()) });
  // توليد وصف ذكي محليًا (مجاني، بلا أي تكلفة) من التخصّصات ومنطقة العمل
  const smartDescribe = () => { if (!specialties.length && !f.name) return; set('description', (specialties.length ? specialties.join(' · ') : f.name) + (f.workArea ? `  ·  📍 ${f.workArea}` : '')); };

  // تأكيد رقم الهاتف عبر واتساب (يُفعَّل فقط إن كان مُهيّأً على الخادم)
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  useEffect(() => { fetch('/api/listings/otp/config').then(r => r.json()).then(d => setOtpEnabled(!!d.enabled)).catch(() => {}); }, []);

  // ضغط الصورة على الجهاز إلى base64 صغير (لا حاجة لحساب/رفع مُصادَق)
  const pickImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const i = new Image();
      i.onload = () => {
        const max = 800; let w = i.width, h = i.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); if (!ctx) return;
        ctx.drawImage(i, 0, 0, w, h);
        setImg(c.toDataURL('image/jpeg', 0.7));
      };
      i.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const doSubmit = async (token: string) => {
    setErr(''); setLoading(true);
    try {
      const r = await fetch('/api/listings/public', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, type, price: parseFloat(f.price) || 0, images: img ? [img] : [], otpToken: token, details: type === 'service' ? buildDetails() : {} }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || pt(lang, 'mk.errSend'));
      setDone(true);
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  const requestOtp = async () => {
    setErr(''); setOtpBusy(true);
    try {
      const r = await fetch('/api/listings/otp/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: f.sellerPhone }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || pt(lang, 'mk.errSendCode'));
      setOtpStep(true);
    } catch (e: any) { setErr(e.message); }
    setOtpBusy(false);
  };

  const verifyOtp = async () => {
    if (otpCode.trim().length < 4) { setErr(pt(lang, 'mk.otpEnterCode')); return; }
    setErr(''); setOtpBusy(true);
    try {
      const r = await fetch('/api/listings/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: f.sellerPhone, code: otpCode.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || pt(lang, 'mk.errCodeWrong'));
      setOtpToken(d.otpToken || '');
      setOtpStep(false);
      await doSubmit(d.otpToken || '');
    } catch (e: any) { setErr(e.message); }
    setOtpBusy(false);
  };

  const submit = async () => {
    if (f.name.trim().length < 2) { setErr(pt(lang, 'mk.errAdName')); return; }
    if (!f.sellerName.trim() || f.sellerPhone.replace(/\D/g, '').length < 9) { setErr(pt(lang, 'mk.errContact')); return; }
    // إن كان تأكيد الهاتف مُفعّلاً ولم يُؤكَّد بعد → أرسِل الرمز وانتقل لخطوة التأكيد
    if (otpEnabled && !otpToken) { await requestOtp(); return; }
    await doSubmit(otpToken);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} dir={rtl ? 'rtl' : 'ltr'} style={{ width: '100%', maxWidth: 520, maxHeight: '92dvh', overflowY: 'auto', background: '#12121A', borderRadius: '22px 22px 0 0', border: `1px solid ${C.border}`, borderBottom: 'none', padding: 22 }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ fontSize: 54 }}>✅</div>
            <h2 style={{ fontSize: 19, fontWeight: 900, margin: '12px 0 6px' }}>{pt(lang, 'mk.doneTitle')}</h2>
            <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7, marginBottom: 22 }}>{pt(lang, 'mk.doneSub')}</p>
            <button onClick={() => { onDone(); onClose(); }} style={{ padding: '11px 28px', borderRadius: 12, background: `linear-gradient(135deg, ${C.ember}, #CC5500)`, border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.ok')}</button>
          </div>
        ) : otpStep ? (
          <div style={{ textAlign: 'center', padding: '6px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{pt(lang, 'mk.otpTitle')}</h2>
              <button onClick={() => { setOtpStep(false); setErr(''); }} style={{ width: 34, height: 34, borderRadius: '50%', background: C.input, border: `1px solid ${C.border}`, color: C.ink1, cursor: 'pointer' }}>{rtl ? '‹' : '›'}</button>
            </div>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📲</div>
            <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7, marginBottom: 16 }}>{pt(lang, 'mk.otpSentTo')}<br /><b dir="ltr" style={{ color: C.ink1 }}>{f.sellerPhone}</b></p>
            <input style={{ ...inp, textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: 800 }} placeholder="••••••" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} dir="ltr" inputMode="numeric" maxLength={6} />
            {err && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 12, fontWeight: 600 }}>{err}</div>}
            <button onClick={verifyOtp} disabled={otpBusy || loading} style={{ width: '100%', marginTop: 16, height: 50, borderRadius: 12, background: (otpBusy || loading) ? C.input : `linear-gradient(135deg, ${C.ember}, #CC5500)`, border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: (otpBusy || loading) ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? pt(lang, 'mk.otpPublishing') : otpBusy ? pt(lang, 'mk.otpVerifying') : pt(lang, 'mk.otpConfirm')}
            </button>
            <button onClick={requestOtp} disabled={otpBusy} style={{ marginTop: 10, background: 'none', border: 'none', color: C.ink3, fontSize: 12, fontWeight: 700, cursor: otpBusy ? 'default' : 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>{pt(lang, 'mk.otpResend')}</button>
          </div>
        ) : (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{pt(lang, 'mk.sellTitle')}</h2>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: C.input, border: `1px solid ${C.border}`, color: C.ink1, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {([['product', pt(lang, 'mk.sellProduct')], ['service', pt(lang, 'mk.sellService')]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setType(v as any)} style={{ flex: 1, padding: '11px', borderRadius: 11, border: `1px solid ${type === v ? C.ember : C.border}`, background: type === v ? C.emberSoft : 'transparent', color: type === v ? '#FF9A55' : C.ink2, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <input style={inp} placeholder={type === 'service' ? pt(lang, 'mk.nameService') : pt(lang, 'mk.nameProduct')} value={f.name} onChange={e => set('name', e.target.value)} />
            <textarea style={{ ...inp, resize: 'none' } as any} rows={2} placeholder={pt(lang, 'mk.shortDesc')} value={f.description} onChange={e => set('description', e.target.value)} />
            {type === 'service' && <button onClick={smartDescribe} style={{ alignSelf: 'flex-start', marginTop: -3, padding: '6px 12px', borderRadius: 9, background: 'rgba(124,58,237,0.12)', border: `1px solid ${C.purple}55`, color: '#a78bfa', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.smartDescribe')}</button>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <input style={inp} placeholder={pt(lang, 'mk.priceField')} value={f.price} onChange={e => set('price', e.target.value)} dir="ltr" type="number" />
              <select style={inp} value={f.city} onChange={e => set('city', e.target.value)}>
                <option value="">{pt(lang, 'mk.cityField')}</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <input style={inp} placeholder={pt(lang, 'mk.categoryField')} value={f.category} onChange={e => set('category', e.target.value)} />
            {type === 'service' && (<>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <input style={inp} placeholder={pt(lang, 'mk.durationField')} value={f.duration} onChange={e => set('duration', e.target.value)} />
                <input style={inp} placeholder={pt(lang, 'mk.workAreaField')} value={f.workArea} onChange={e => set('workArea', e.target.value)} />
              </div>

              {/* التخصّصات المتعددة (اختر أو أضِف) */}
              <div>
                <div style={{ fontSize: 11.5, color: C.ink2, fontWeight: 800, marginBottom: 6 }}>{pt(lang, 'mk.specialties')}</div>
                {specialties.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 7 }}>
                    {specialties.map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, background: C.emberSoft, border: `1px solid ${C.ember}55`, color: '#FF9A55', fontSize: 11.5, fontWeight: 700 }}>
                        {s}<button onClick={() => setSpecialties(a => a.filter(x => x !== s))} style={{ background: 'none', border: 'none', color: '#FF9A55', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder={pt(lang, 'mk.specialtiesHint')} value={specInput} onChange={e => setSpecInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSpec(specInput); } }} />
                  <button onClick={() => addSpec(specInput)} style={{ padding: '0 16px', borderRadius: 10, background: C.input, border: `1px solid ${C.border}`, color: C.ink1, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.addChip')}</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                  {SPEC_SUGGEST.filter(s => !specialties.includes(s)).slice(0, 8).map(s => (
                    <button key={s} onClick={() => addSpec(s)} style={{ padding: '4px 10px', borderRadius: 99, background: 'transparent', border: `1px dashed ${C.border}`, color: C.ink3, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ {s}</button>
                  ))}
                </div>
              </div>

              {/* طرق الطلب */}
              <div>
                <div style={{ fontSize: 11.5, color: C.ink2, fontWeight: 800, marginBottom: 6 }}>{pt(lang, 'mk.serviceModes')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(['mk.modeBooking', 'mk.modeRequest', 'mk.modeUrgent', 'mk.modeOnsite', 'mk.modeInshop', 'mk.modeRemote'] as const).map(k => { const label = pt(lang, k); const on = modes.includes(label); return (
                    <button key={k} onClick={() => toggleMode(label)} style={{ padding: '7px 12px', borderRadius: 10, background: on ? C.emberSoft : 'transparent', border: `1px solid ${on ? C.ember : C.border}`, color: on ? '#FF9A55' : C.ink2, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                  ); })}
                </div>
              </div>

              {/* نموذج التسعير */}
              <select style={inp} value={pricing} onChange={e => setPricing(e.target.value)}>
                <option value="">{pt(lang, 'mk.pricingModel')}</option>
                {(['mk.priceFixed', 'mk.priceHourly', 'mk.priceProject', 'mk.priceFrom', 'mk.priceQuote'] as const).map(k => <option key={k} value={pt(lang, k)}>{pt(lang, k)}</option>)}
              </select>

              {/* حقول مخصّصة — أضِف ما تريد */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11.5, color: C.ink2, fontWeight: 800 }}>{pt(lang, 'mk.customFields')}</span>
                  <button onClick={() => setFields(a => a.length < 12 ? [...a, { label: '', value: '' }] : a)} style={{ padding: '5px 10px', borderRadius: 8, background: C.input, border: `1px solid ${C.border}`, color: C.ink1, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{pt(lang, 'mk.addField')}</button>
                </div>
                {fields.map((cf, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input style={{ ...inp, flex: 1 }} placeholder={pt(lang, 'mk.cfLabel')} value={cf.label} onChange={e => setFieldAt(i, 'label', e.target.value)} />
                    <input style={{ ...inp, flex: 1 }} placeholder={pt(lang, 'mk.cfValue')} value={cf.value} onChange={e => setFieldAt(i, 'value', e.target.value)} />
                    <button onClick={() => setFields(a => a.filter((_, j) => j !== i))} style={{ width: 36, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            </>)}
            <div>
              <div style={{ fontSize: 11, color: C.ink3, fontWeight: 700, marginBottom: 6 }}>{pt(lang, 'mk.imageOptional')}</div>
              {img ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={img} alt="" style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                  <button onClick={() => setImg('')} style={{ position: 'absolute', top: -7, insetInlineStart: -7, width: 22, height: 22, borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11 }}>✕</button>
                </div>
              ) : (
                <label style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: C.ink2 }}>
                  {pt(lang, 'mk.pickImage')}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) pickImage(file); }} />
                </label>
              )}
            </div>
            <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
            <input style={inp} placeholder={pt(lang, 'mk.yourName')} value={f.sellerName} onChange={e => set('sellerName', e.target.value)} />
            <input style={inp} placeholder={pt(lang, 'mk.sellerPhone')} value={f.sellerPhone} onChange={e => set('sellerPhone', e.target.value)} dir="ltr" type="tel" />
          </div>
          {err && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 10, fontWeight: 600 }}>{err}</div>}
          <button onClick={submit} disabled={loading || otpBusy} style={{ width: '100%', marginTop: 16, height: 50, borderRadius: 12, background: (loading || otpBusy) ? C.input : `linear-gradient(135deg, ${C.ember}, #CC5500)`, border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: (loading || otpBusy) ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {otpBusy ? pt(lang, 'mk.sendingCode') : loading ? pt(lang, 'mk.sending') : otpEnabled ? pt(lang, 'mk.nextConfirmPhone') : pt(lang, 'mk.sendForReview')}
          </button>
          <p style={{ fontSize: 10.5, color: C.ink3, textAlign: 'center', marginTop: 10 }}>{otpEnabled ? pt(lang, 'mk.noteOtp') : pt(lang, 'mk.noteReview')}</p>
        </>)}
      </div>
    </div>
  );
}
