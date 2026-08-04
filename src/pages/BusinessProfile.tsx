import { useState, useEffect, lazy, Suspense, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { businessAPI, bookingsAPI, recommendAPI, feedAPI, trackAPI, type Business, type BusinessProfileData, type BusinessSource, type Activity } from '../services/api';
// الخريطةُ تُحمَّل كسولًا — مكتبةُ Leaflet ثقيلةٌ ولا يحتاجها كلُّ زائر.
const MapView = lazy(() => import('../components/MapView'));
import { BadgeCheck, Star, MapPin, Phone, MessageCircle, Calendar, X, Clock, ArrowLeft } from 'lucide-react';

// ============================================================
// Business Platform — صفحة نشاط ديناميكية واحدة لكل الأنشطة
// لا تعتمد على `type` إطلاقاً — الأقسام يقودها business.capabilities
// عبر الأقسام التي يعيدها الخادم (sections)، وتُرسَم من Section Registry.
// إضافة قدرة جديدة (events/courses/rentals/auctions) = مكوّن + سطر في الـ Registry.
// كل البيانات تأتي من عقد واحد: businessAPI (Business API Contract).
// ============================================================

const BG = '#0a0a0f', CARD = 'rgba(255,255,255,0.04)', BORDER = '1px solid rgba(255,255,255,0.08)';
const PURPLE = '#8b5cf6', MUTED = 'rgba(255,255,255,0.55)', INK = '#f5f5f7';

const SECTION_LABELS: Record<string, string> = {
  about: 'نبذة', products: 'المنتجات', services: 'الخدمات', offers: 'العروض',
  booking: 'الحجز', gallery: 'المعرض', reviews: 'التقييمات', location: 'الموقع', contact: 'اتصال',
  related: 'أنشطة ذات صلة', activity: 'آخر النشاط',
};

export default function BusinessProfile() {
  const { source, id } = useParams<{ source: BusinessSource; id: string }>();
  const [profile, setProfile] = useState<BusinessProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('');

  useEffect(() => {
    if (!source || !id) return;
    setLoading(true);
    businessAPI.getProfile(source, id)
      .then(p => {
        setProfile(p); setTab(visibleSections(p)[0] || 'about');
        // تتبّع مشاهدة النشاط (لوحة التاجر + التوصيات)
        trackAPI.event({ kind: 'business', action: 'viewed', businessId: `${source}:${id}`, name: p.business.name, city: p.business.city, source: 'profile' });
      })
      .catch(e => setError(e.message || 'تعذّر تحميل النشاط'))
      .finally(() => setLoading(false));
  }, [source, id]);

  if (loading) return <Center>جارٍ التحميل…</Center>;
  if (error || !profile) return <Center>{error || 'النشاط غير موجود'}</Center>;

  const { business } = profile;
  // أقسام القدرات + قسمان ديناميكيان دائمان (ذات صلة / آخر النشاط) من محرّكات أخرى
  const tabs = [...visibleSections(profile), 'related', 'activity'];

  const markContact = () => trackAPI.event({
    kind: 'business', action: 'contact', businessId: `${source}:${id}`,
    name: business.name, city: business.city, source: 'profile',
  });

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: BG, color: INK, fontFamily: 'Tajawal,system-ui,sans-serif', paddingBottom: 60 }}>
      {/* ── Hero ── */}
      <div style={{ position: 'relative', background: `linear-gradient(135deg, rgba(139,92,246,0.25), rgba(10,10,15,0.9))`, padding: '28px 18px 20px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {business.image ? <img src={business.image} alt={business.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 34 }}>{business.source === 'provider' ? '👨‍🔧' : '🏬'}</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{business.name}</h1>
              {business.verified && <BadgeCheck size={18} color={PURPLE} />}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12.5, color: MUTED, flexWrap: 'wrap', alignItems: 'center' }}>
              {business.status && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: business.status.color, fontWeight: 800 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: business.status.color, display: 'inline-block' }} />{business.status.label}</span>}
              {business.availability && <span style={{ color: '#22c55e', fontWeight: 700 }}>{business.availability.label}</span>}
              {business.city && <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {business.city}</span>}
              {!!business.rating.count && <span><Star size={12} style={{ verticalAlign: 'middle', color: '#fbbf24' }} /> {business.rating.avg} ({business.rating.count})</span>}
              {business.categories.slice(0, 2).map((c, i) => <span key={i} style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 9px', borderRadius: 99 }}>{c}</span>)}
            </div>
          </div>
        </div>
        {/* أزرار سريعة حسب القدرات */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {/* لحظةُ الاتّصال هي أهمُّ خطوةٍ في القمع — إنسانٌ وصل إنسانًا. كانت
              الأزرارُ تفتح واتساب/الهاتف بلا أن يعرف النظامُ أنّ ذلك حدث،
              فبقي `business.contact` صفرًا في حلقة التعلّم إلى الأبد. */}
          {business.contact.whatsapp && <QuickBtn onClick={markContact} href={`https://wa.me/${business.contact.whatsapp.replace(/\D/g, '')}`} icon={<MessageCircle size={14} />} label="واتساب" color="#25D366" />}
          {business.contact.phone && <QuickBtn onClick={markContact} href={`tel:${business.contact.phone}`} icon={<Phone size={14} />} label="اتصال" />}
          {business.capabilities.booking && <button onClick={() => setTab('booking')} style={btnStyle(true)}><Calendar size={14} /> احجز</button>}
        </div>
      </div>

      {/* ── Tabs (ديناميكية من الأقسام) ── */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 14px', overflowX: 'auto', scrollbarWidth: 'none', position: 'sticky', top: 0, background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)', zIndex: 10, borderBottom: BORDER }}>
        {tabs.map(s => (
          <button key={s} onClick={() => setTab(s)} style={{ padding: '8px 16px', borderRadius: 99, border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', background: tab === s ? PURPLE : 'rgba(255,255,255,0.05)', color: tab === s ? '#fff' : MUTED }}>
            {SECTION_LABELS[s] || s}
          </button>
        ))}
      </div>

      {/* ── Section (من Registry حسب التبويب) ── */}
      <div style={{ padding: '18px 16px' }}>
        {(() => {
          const Section = REGISTRY[tab];
          return Section ? <Section profile={profile} /> : null;
        })()}
      </div>
    </div>
  );
}

// أي الأقسام تُعرض: تقاطع أقسام الخادم مع ما نملك مكوّناً له + محتوى فعلي
function visibleSections(p: BusinessProfileData): string[] {
  return (p.sections || []).filter(s => REGISTRY[s] && hasContent(s, p));
}
function hasContent(s: string, p: BusinessProfileData): boolean {
  const b = p.business, d = p.data || {};
  switch (s) {
    case 'about':    return !!b.description || true;
    case 'products': return !!(d.products && d.products.length);
    case 'services': return !!(d.services && d.services.length);
    case 'gallery':  return !!(b.gallery && b.gallery.length);
    case 'booking':  return !!b.capabilities.booking;
    case 'location': return !!b.location;
    case 'contact':  return !!(b.contact.phone || b.contact.whatsapp);
    case 'reviews':  return true;
    case 'offers':   return false; // لا بيانات عروض بعد — يُفعَّل عند توفّرها
    default:         return true;
  }
}

// ─────────────────────────────────────────────────────────────
// Section Registry — إضافة قسم جديد = مكوّن + سطر هنا (بلا if-chains)
// ─────────────────────────────────────────────────────────────
type SectionProps = { profile: BusinessProfileData };
const REGISTRY: Record<string, (p: SectionProps) => ReactElement | null> = {
  about:    AboutSection,
  products: ProductsSection,
  services: ServicesSection,
  gallery:  GallerySection,
  booking:  BookingSection,
  location: LocationSection,
  contact:  ContactSection,
  reviews:  ReviewsSection,
  related:  RelatedSection,
  activity: ActivitySection,
};

function AboutSection({ profile }: SectionProps) {
  const b = profile.business, oh = profile.data.openingHours;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{b.description || 'لا يوجد وصف بعد.'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(b.capabilities).filter(([, v]) => v).map(([k]) => (
          <span key={k} style={{ fontSize: 11, color: PURPLE, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', padding: '4px 11px', borderRadius: 99 }}>{CAP_AR[k] || k}</span>
        ))}
      </div>
      {oh && (oh.start || oh.end) && <div style={{ fontSize: 13, color: MUTED }}><Clock size={13} style={{ verticalAlign: 'middle' }} /> ساعات العمل: {oh.start} — {oh.end}</div>}
    </div>
  );
}

function ProductsSection({ profile }: SectionProps) {
  const products = profile.data.products || [];
  if (!products.length) return <Empty>لا منتجات.</Empty>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
      {products.map(p => (
        <div key={p.id} style={{ background: CARD, border: BORDER, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ height: 120, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 34 }}>{p.emoji || '📦'}</span>}
          </div>
          <div style={{ padding: '9px 11px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: PURPLE, marginTop: 2 }}>{p.price.toLocaleString()} د.م</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServicesSection({ profile }: SectionProps) {
  const services = profile.data.services || [];
  if (!services.length) return <Empty>لا خدمات.</Empty>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {services.map(s => (
        <div key={s.id} style={{ background: CARD, border: BORDER, borderRadius: 12, padding: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{s.serviceLabel}</div>
            {s.description && <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{s.description}</div>}
          </div>
          {!!s.priceMin && <div style={{ fontSize: 13, fontWeight: 800, color: PURPLE, whiteSpace: 'nowrap' }}>{s.priceMin}{s.priceMax && s.priceMax !== s.priceMin ? `–${s.priceMax}` : ''} د.م</div>}
        </div>
      ))}
    </div>
  );
}

function GallerySection({ profile }: SectionProps) {
  const imgs = profile.business.gallery || [];
  if (!imgs.length) return <Empty>لا صور.</Empty>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
      {imgs.map((src, i) => <img key={i} src={src} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12, border: BORDER }} />)}
    </div>
  );
}

function BookingSection({ profile }: SectionProps) {
  const b = profile.business;
  const providers = profile.data.providers || [];
  const [show, setShow] = useState(false);
  // متجر لديه عدة مقدّمين → قائمة؛ مقدّم مفرد → حجز مباشر
  if (b.source === 'store' && providers.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {providers.map(p => (
          <a key={p.id} href={`/business/provider/${p.id}`} style={{ background: CARD, border: BORDER, borderRadius: 12, padding: 13, textDecoration: 'none', color: INK, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>{p.name}{p.verified && <BadgeCheck size={14} color={PURPLE} />}</div>
            <span style={{ fontSize: 12, color: PURPLE, display: 'flex', alignItems: 'center', gap: 4 }}>احجز <ArrowLeft size={12} /></span>
          </a>
        ))}
      </div>
    );
  }
  return (
    <div>
      <p style={{ fontSize: 13.5, color: MUTED, marginTop: 0 }}>احجز موعداً مع {b.name}. سيؤكّد النشاط الموعد بعد الطلب.</p>
      <button onClick={() => setShow(true)} style={btnStyle(true)}><Calendar size={15} /> احجز موعداً</button>
      {show && <BookingModal business={b} onClose={() => setShow(false)} />}
    </div>
  );
}

function LocationSection({ profile }: SectionProps) {
  const loc = profile.business.location, city = profile.business.city;
  if (!loc) return <Empty>الموقع غير محدّد. {city && `المدينة: ${city}`}</Empty>;
  const osm = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;

  // **الخريطةُ داخل التطبيق لا خارجَه.**
  //
  //   كان هنا رابطٌ وحدَه: «افتح في الخريطة» يُخرج الزبونَ إلى موقعٍ آخر —
  //   وأغلبُهم لا يعود. والمكوّنُ `MapView` (Leaflet + OpenStreetMap) مبنيٌّ
  //   منذ زمن ويعمل، **ولا يستعمله إلّا `Explore`**: قدرةٌ كاملةٌ لا تصل
  //   إلى الصفحة التي يُقرَّر فيها الشراء فعلًا.
  //
  //   ويُحمَّل كسولًا كما في `Explore`: مكتبةُ الخرائط ثقيلةٌ ولا تُنزَّل إلّا
  //   لمن فتح القسم.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {city && <div style={{ fontSize: 14 }}><MapPin size={14} style={{ verticalAlign: 'middle', color: PURPLE }} /> {city}</div>}
      <Suspense fallback={<div style={{ height: 240, borderRadius: 12, background: 'rgba(255,255,255,.04)' }} />}>
        <MapView
          height={240}
          center={{ lat: loc.lat, lng: loc.lng }}
          markers={[{
            id: profile.business.id, source: 'business', name: profile.business.name,
            lat: loc.lat, lng: loc.lng, type: 'store',
            verified: !!profile.business.verified, href: '#',
          }]}
        />
      </Suspense>
      <a href={osm} target="_blank" rel="noreferrer" style={{ ...btnStyle(false), textDecoration: 'none', width: 'fit-content' }}>🧭 خذني للمحلّ</a>
    </div>
  );
}

function ContactSection({ profile }: SectionProps) {
  const c = profile.business.contact;
  const b = profile.business;
  // نفسُ الحدث في القسم الكامل كما في الأزرار السريعة — القمعُ لا يفرّق
  // بين مكانِ الضغطة، بل بين حدوث الاتّصال وعدمه.
  const markContact = () => trackAPI.event({
    kind: 'business', action: 'contact', businessId: `${b.source}:${b.id}`,
    name: b.name, city: b.city, source: 'contact-section',
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={markContact} style={{ ...btnStyle(false), background: 'rgba(37,211,102,0.12)', color: '#25D366', textDecoration: 'none' }}><MessageCircle size={15} /> واتساب: {c.whatsapp}</a>}
      {c.phone && <a href={`tel:${c.phone}`} onClick={markContact} style={{ ...btnStyle(false), textDecoration: 'none' }}><Phone size={15} /> {c.phone}</a>}
      {!c.phone && !c.whatsapp && <Empty>لا توجد وسيلة تواصل.</Empty>}
    </div>
  );
}

function ReviewsSection({ profile }: SectionProps) {
  const r = profile.business.rating;
  return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: MUTED }}>
      {r.count ? (
        <div><div style={{ fontSize: 34, fontWeight: 900, color: INK }}>{r.avg} <Star size={22} style={{ verticalAlign: 'middle', color: '#fbbf24' }} /></div><div style={{ fontSize: 13, marginTop: 4 }}>من {r.count} تقييم</div></div>
      ) : <Empty>لا تقييمات بعد.</Empty>}
    </div>
  );
}

// ── أنشطة ذات صلة (Recommendation Engine فوق Business Graph) ──
function RelatedSection({ profile }: SectionProps) {
  const b = profile.business;
  const [items, setItems] = useState<Business[] | null>(null);
  useEffect(() => { recommendAPI.forBusiness(b.source, b.id).then(r => setItems(r.businesses || [])).catch(() => setItems([])); }, [b.source, b.id]);
  if (items === null) return <Empty>جارٍ التحميل…</Empty>;
  if (!items.length) return <Empty>لا توجد أنشطة ذات صلة بعد.</Empty>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
      {items.map(x => (
        <a key={`${x.source}-${x.id}`} href={x.href || `/business/${x.source}/${x.id}`} style={{ background: CARD, border: BORDER, borderRadius: 12, padding: 12, textDecoration: 'none', color: INK, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</span>
            {x.verified && <BadgeCheck size={13} color={PURPLE} />}
          </div>
          <div style={{ fontSize: 11, color: MUTED, display: 'flex', gap: 8 }}>
            {x.city && <span><MapPin size={9} style={{ verticalAlign: 'middle' }} /> {x.city}</span>}
            {!!x.rating.count && <span><Star size={9} style={{ verticalAlign: 'middle', color: '#fbbf24' }} /> {x.rating.avg}</span>}
          </div>
          {x.categories[0] && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 99, width: 'fit-content' }}>{x.categories[0]}</span>}
        </a>
      ))}
    </div>
  );
}

// ── آخر النشاط (Activity Feed لهذا النشاط) ───────────────────
const ACT_ICON: Record<string, string> = { offer: '🎁', product: '🛍️', service: '🛠️', listing: '🏷️', booking: '📅', business: '✅', review: '⭐' };
function ActivitySection({ profile }: SectionProps) {
  const b = profile.business;
  const [items, setItems] = useState<Activity[] | null>(null);
  useEffect(() => {
    const bid = b.source === 'store' ? `store:${b.id}` : `${b.source}:${b.id}`;
    feedAPI.get({ type: 'following', ids: bid, limit: 20 }).then(r => setItems(r.items || [])).catch(() => setItems([]));
  }, [b.source, b.id]);
  if (items === null) return <Empty>جارٍ التحميل…</Empty>;
  if (!items.length) return <Empty>لا نشاط منشور بعد.</Empty>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(a => (
        <div key={a.id} style={{ background: CARD, border: BORDER, borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{ACT_ICON[a.category] || '📢'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{activityLabel(a)}</div>
            <div style={{ fontSize: 10.5, color: MUTED }}>{new Date(a.createdAt).toLocaleString('ar-MA')}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function activityLabel(a: Activity): string {
  const p = a.payload || {};
  switch (a.type) {
    case 'offer.created':     return `عرض جديد${p.code ? `: ${p.code}` : ''}`;
    case 'listing.approved':  return `${p.name || 'إعلان'} — أصبح متاحاً`;
    case 'business.verified': return 'تم اعتماد النشاط ✅';
    case 'booking.created':   return 'حجز جديد';
    case 'review.created':    return 'تقييم جديد';
    default:                  return a.type;
  }
}

// ── نافذة الحجز (تعتمد على عقد bookingsAPI) ──────────────────
function BookingModal({ business, onClose }: { business: BusinessProfileData['business']; onClose: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', when: '', notes: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [msg, setMsg] = useState('');
  const submit = async () => {
    if (!f.name.trim() || !f.phone.trim() || !f.when) { setMsg('الاسم والهاتف والموعد مطلوبة'); return; }
    setState('loading'); setMsg('');
    try {
      await bookingsAPI.book({ userId: business.ownerId, providerId: business.id, customerName: f.name.trim(), customerPhone: f.phone.trim(), scheduledAt: new Date(f.when).toISOString(), notes: f.notes.trim() });
      setState('done');
    } catch (e: any) {
      setState('idle');
      setMsg(String(e.message || '').includes('محجوز') || String(e.message || '').includes('409') ? 'الموعد محجوز — اختر وقتاً آخر' : (e.message || 'تعذّر الحجز'));
    }
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#141018', border: BORDER, borderRadius: 18, padding: 20, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800 }}>حجز موعد</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        {state === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}><div style={{ fontSize: 40 }}>✅</div><div style={{ fontWeight: 800, marginTop: 8 }}>تم إرسال طلب الحجز!</div><button onClick={onClose} style={{ ...btnStyle(true), marginTop: 14 }}>تمام</button></div>
        ) : (
          <>
            <input placeholder="الاسم *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} style={inp} />
            <input placeholder="الهاتف *" dir="ltr" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} style={inp} />
            <input type="datetime-local" value={f.when} onChange={e => setF({ ...f, when: e.target.value })} style={inp} />
            <textarea placeholder="ملاحظات" rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} style={{ ...inp, resize: 'vertical' }} />
            {msg && <div style={{ fontSize: 12, color: '#f59e0b' }}>{msg}</div>}
            <button onClick={submit} disabled={state === 'loading'} style={btnStyle(true)}>{state === 'loading' ? '…' : 'تأكيد الحجز'}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── ذرّات مشتركة ──────────────────────────────────────────────
const CAP_AR: Record<string, string> = { products: '🛍️ منتجات', services: '🛠️ خدمات', booking: '📅 حجز', delivery: '🚚 توصيل', offers: '🎁 عروض', chat: '💬 محادثة', appointments: '⏰ مواعيد', marketplace: '🏷️ سوق' };
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: BORDER, color: INK, fontSize: 13, fontFamily: 'inherit' };
function btnStyle(primary: boolean): React.CSSProperties {
  return { padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: primary ? PURPLE : 'rgba(255,255,255,0.06)', color: primary ? '#fff' : INK };
}
function QuickBtn({ href, icon, label, color, onClick }: { href: string; icon: ReactElement; label: string; color?: string; onClick?: () => void }) {
  return <a href={href} target="_blank" rel="noreferrer" onClick={onClick} style={{ ...btnStyle(false), textDecoration: 'none', ...(color ? { background: `${color}22`, color } : {}) }}>{icon} {label}</a>;
}
function Empty({ children }: { children: React.ReactNode }) { return <div style={{ textAlign: 'center', padding: '30px 0', color: MUTED, fontSize: 13.5 }}>{children}</div>; }
function Center({ children }: { children: React.ReactNode }) { return <div dir="rtl" style={{ minHeight: '100dvh', background: BG, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Tajawal,system-ui,sans-serif', fontSize: 15 }}>{children}</div>; }
