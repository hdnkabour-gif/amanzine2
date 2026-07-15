import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { businessAPI, feedAPI, recommendAPI, trackAPI, aiSearchAPI, type Business, type SearchFilters, type SearchResult } from '../services/api';
const MapView = lazy(() => import('../components/MapView')); // Leaflet يُحمَّل فقط عند فتح الخريطة
import { Search, MapPin, Star, BadgeCheck, SlidersHorizontal, X, Store, List, Map as MapIcon, Mic } from 'lucide-react';

// ============================================================
// Explore — الواجهة الموحّدة للبحث والاكتشاف (تُلغي فكرة صفحة "سوق" منفصلة)
// Discover = search بلا كلمة · نفس المحرّك/الترتيب/الفلاتر لكل الأنشطة.
// تقرأ من businessAPI.search فقط (لا تعرف مصدر البيانات).
// ============================================================

const CITIES = ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة', 'أكادير', 'مكناس', 'وجدة', 'سلا', 'تطوان', 'القنيطرة', 'الجديدة'];
const BG = '#0a0a0f', CARD = 'rgba(255,255,255,0.04)', BORDER = '1px solid rgba(255,255,255,0.08)';
const PURPLE = '#8b5cf6', MUTED = 'rgba(255,255,255,0.55)', INK = '#f5f5f7';

const TOGGLES: { key: keyof SearchFilters; label: string }[] = [
  { key: 'openNow', label: '🟢 مفتوح الآن' }, { key: 'verified', label: '✔ موثّق' },
  { key: 'delivery', label: '🚚 توصيل' }, { key: 'booking', label: '📅 حجز' },
  { key: 'offers', label: '🎁 عروض' },
];

// نيّات سريعة للدقيقة الأولى — كلٌّ يملأ خانة النيّة ويشغّل الـAI
const INTENTS: { icon: string; label: string; q: string }[] = [
  { icon: '🛠️', label: 'إصلاح', q: 'أحتاج من يصلح' },
  { icon: '🛍️', label: 'شراء', q: 'أريد شراء' },
  { icon: '📅', label: 'حجز', q: 'أريد حجز موعد' },
  { icon: '🍽️', label: 'مطعم', q: 'مطعم قريب' },
  { icon: '👨‍🔧', label: 'حرفي', q: 'أحتاج حرفي' },
  { icon: '🏬', label: 'متجر', q: 'متجر قريب' },
  { icon: '🚚', label: 'توصيل', q: 'خدمة توصيل' },
  { icon: '💊', label: 'صيدلية', q: 'صيدلية قريبة' },
];

export default function Explore() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [view, setView] = useState<'list' | 'map'>('list');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [trending, setTrending] = useState<{ category: string; count: number }[]>([]);
  const [recs, setRecs] = useState<Business[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]); // Next Best Action (شبكة المعرفة)

  // شريط الرائج (من Activity Engine) — يُحمّل مرّة
  useEffect(() => { feedAPI.get({ type: 'trending' }).then(r => setTrending((r.trending || []).map(t => ({ category: t.category, count: t.count })))).catch(() => {}); }, []);
  // "قد يعجبك" (Recommendation فوق Business Graph) عند وجود بحث
  useEffect(() => {
    if (!q.trim()) { setRecs([]); return; }
    const t = setTimeout(() => recommendAPI.forQuery(q.trim(), filters.city).then(r => setRecs(r.businesses || [])).catch(() => setRecs([])), 400);
    return () => clearTimeout(t);
  }, [q, filters.city]);

  const run = useCallback(() => {
    setLoading(true);
    const params: SearchFilters = { ...filters, q: q.trim() || undefined, limit: 40, view };
    if (view === 'map' && coords) { params.lat = coords.lat; params.lng = coords.lng; params.radiusKm = filters.radiusKm || 25; }
    businessAPI.search(params).then(setResult).catch(() => setResult(null)).finally(() => setLoading(false));
  }, [q, filters, view, coords]);

  // debounce أثناء الكتابة
  useEffect(() => { const t = setTimeout(run, q ? 350 : 0); return () => clearTimeout(t); }, [run]);

  const askLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setView('map'); },
      () => alert('تعذّر تحديد موقعك'),
    );
  };

  const [aiNote, setAiNote] = useState('');
  const askAI = async (override?: string) => {
    const query = (override ?? q).trim();
    if (!query) return;
    if (override) setQ(override);
    setAiNote('… أفهم طلبك');
    try {
      const r = await aiSearchAPI.ask(query, coords || undefined);
      const u = r.understood || {};
      // طبّق ما فهمه المحرّك على الفلاتر (فتتحدّث النتائج عبر نفس المسار)
      setFilters(f => ({ ...f, city: r.filters.city || f.city, type: r.filters.type, openNow: r.filters.openNow, availableToday: r.filters.availableToday, verified: r.filters.verified, ratingMin: r.filters.ratingMin }));
      if (r.filters.q) setQ(r.filters.q);
      const parts = [u.category && `الفئة: ${u.category}`, u.city && `المدينة: ${u.city}`, u.availableToday && 'متاح اليوم', u.wantTrust && 'الأعلى تقييماً'].filter(Boolean);
      setAiNote(parts.length ? `✨ فهمت — ${parts.join(' · ')}` : '');
      setSuggestions(r.suggestions || []); // Next Best Action (يبقى يساعد حتى بلا نتيجة)
    } catch { setAiNote(''); setSuggestions([]); }
  };
  // إدخال صوتي (Web Speech API) — يعمل حيث يتوفّر، وإلا يُخفى الزرّ بهدوء
  const [listening, setListening] = useState(false);
  const voiceSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR(); rec.lang = 'ar-MA'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; askAI(t); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true); rec.start();
  };
  const pickIntent = (intentQ: string) => askAI(intentQ);
  const setF = (k: keyof SearchFilters, v: any) => setFilters(f => ({ ...f, [k]: v || undefined }));
  const activeCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== false).length;

  const businesses = result?.businesses || [];
  const products = result?.products || [];

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: 'radial-gradient(130% 80% at 50% -5%, #0d3a2e 0%, #0a2a22 45%, #071B17 100%)', backgroundAttachment: 'fixed', color: INK, fontFamily: 'Tajawal,system-ui,sans-serif', paddingBottom: 60 }}>
      {/* Header + بحث */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(14px)', borderBottom: BORDER, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>🧭</span>
          <div style={{ fontSize: 17, fontWeight: 900 }}>استكشف</div>
          <span style={{ fontSize: 10.5, color: MUTED }}>كل ما حولك في المغرب</span>
          <a href="/market" style={{ marginInlineStart: 'auto', fontSize: 11, color: MUTED, textDecoration: 'none' }}>الإعلانات المبوّبة ↗</a>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: CARD, border: BORDER, borderRadius: 12, padding: '0 12px' }}>
            <Search size={16} color={MUTED} />
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') askAI(); }} placeholder="اكتب بطبيعتك: أريد نجار اليوم في الرباط…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: INK, fontSize: 14, padding: '11px 0', fontFamily: 'inherit' }} />
            {voiceSupported && <button onClick={startVoice} title="بحث صوتي" style={{ ...iconBtn, color: listening ? '#ef4444' : MUTED }}><Mic size={16} /></button>}
            {q && <button onClick={() => askAI()} title="اسأل بالذكاء" style={{ ...iconBtn, color: PURPLE, fontWeight: 800 }}>✨</button>}
            {q && <button onClick={() => { setQ(''); setAiNote(''); setSuggestions([]); }} style={iconBtn}><X size={15} /></button>}
          </div>
          <button onClick={() => setShowFilters(s => !s)} style={{ ...iconBtn, background: activeCount ? PURPLE : CARD, border: BORDER, borderRadius: 12, padding: '0 12px', color: '#fff', position: 'relative' }}>
            <SlidersHorizontal size={16} />{activeCount > 0 && <span style={{ position: 'absolute', top: 4, insetInlineEnd: 4, background: '#fff', color: PURPLE, borderRadius: 99, fontSize: 9, fontWeight: 800, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeCount}</span>}
          </button>
        </div>
        {aiNote && <div style={{ marginTop: 8, fontSize: 12, color: PURPLE, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, padding: '7px 11px' }}>{aiNote}</div>}
        {/* شريط سريع: مدينة + toggles + عرض */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
          <select value={filters.city || ''} onChange={e => setF('city', e.target.value)} style={selStyle}>
            <option value="">كل المدن</option>
            {CITIES.map(c => <option key={c} value={c} style={{ background: BG }}>{c}</option>)}
          </select>
          {TOGGLES.map(t => (
            <button key={t.key} onClick={() => setF(t.key, !filters[t.key])} style={chip(!!filters[t.key])}>{t.label}</button>
          ))}
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 4, background: CARD, borderRadius: 99, padding: 3 }}>
            <button onClick={() => setView('list')} style={viewBtn(view === 'list')}><List size={14} /></button>
            <button onClick={() => coords ? setView('map') : askLocation()} style={viewBtn(view === 'map')}><MapIcon size={14} /></button>
          </div>
        </div>
      </header>

      {/* لوحة الفلاتر الكاملة */}
      {showFilters && (
        <div style={{ padding: '14px 16px', borderBottom: BORDER, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Labeled label="التصنيف"><input value={filters.category || ''} onChange={e => setF('category', e.target.value)} placeholder="مثلاً: نجارة" style={inp} /></Labeled>
          <Labeled label="النوع">
            <select value={filters.type || ''} onChange={e => setF('type', e.target.value)} style={inp}>
              <option value="">الكل</option><option value="store">متاجر ومنتجات</option><option value="service">خدمات</option>
            </select>
          </Labeled>
          <Labeled label="أدنى تقييم">
            <select value={filters.ratingMin ?? ''} onChange={e => setF('ratingMin', e.target.value ? +e.target.value : undefined)} style={inp}>
              <option value="">أي تقييم</option><option value="3">3+ ⭐</option><option value="4">4+ ⭐</option><option value="4.5">4.5+ ⭐</option>
            </select>
          </Labeled>
          <Labeled label="أقصى سعر"><input type="number" value={filters.priceMax ?? ''} onChange={e => setF('priceMax', e.target.value ? +e.target.value : undefined)} placeholder="د.م" style={inp} /></Labeled>
          {view === 'map' && <Labeled label={`نطاق المسافة: ${filters.radiusKm || 25} كم`}><input type="range" min={1} max={100} value={filters.radiusKm || 25} onChange={e => setF('radiusKm', +e.target.value)} style={{ width: '100%' }} /></Labeled>}
          <button onClick={() => setFilters({})} style={{ ...btn(false), gridColumn: '1 / -1' }}>مسح الفلاتر</button>
        </div>
      )}

      {/* النتائج */}
      <div style={{ padding: '16px' }}>
        {/* ✦ الدقيقة الأولى: نيّة واحدة — يظهر فقط بلا بحث */}
        {!q.trim() && (
          <div style={{ textAlign: 'center', padding: '18px 4px 26px' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: INK, marginBottom: 4 }}>ماذا تحتاج اليوم؟</div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>اكتب أو قل ما تريد — نتكفّل بالباقي</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {INTENTS.map(it => (
                <button key={it.label} onClick={() => pickIntent(it.q)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: BORDER, background: CARD, color: INK, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 16 }}>{it.icon}</span>{it.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* 🔥 رائج الآن (من Activity Engine) — يظهر بلا بحث */}
        {!q.trim() && trending.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>🔥 رائج الآن</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {trending.map(t => <button key={t.category} onClick={() => setQ(t.category)} style={chip(false)}>{t.category} · {t.count}</button>)}
            </div>
          </div>
        )}
        {loading && <Center>جارٍ البحث…</Center>}
        {!loading && result && (
          <>
            {view === 'map' && coords && (
              <div style={{ marginBottom: 18 }}>
                <Suspense fallback={<div style={{ height: 460, background: CARD, border: BORDER, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>تحميل الخريطة…</div>}>
                  <MapView
                    markers={(result.markers || []) as any}
                    center={coords}
                    radiusKm={filters.radiusKm || 25}
                    onSearchArea={(b) => { setCoords({ lat: b.lat, lng: b.lng }); setF('radiusKm', b.radiusKm); }}
                  />
                </Suspense>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6, textAlign: 'center' }}>
                  {result.markers?.length || 0} نشاطاً على الخريطة · حرّك الخريطة ثم ستُحدَّث النتائج تلقائياً
                </div>
              </div>
            )}
            {businesses.length === 0 && products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>🧭</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 4 }}>لم نجد ما يطابق طلبك تمامًا بعد</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: suggestions.length ? 18 : 4 }}>
                  {q.trim() ? 'سجّلنا طلبك ونتعلّم منه — وهذه أقرب المسارات المفيدة:' : 'جرّب كلمة أخرى أو وسّع الفلاتر.'}
                </div>
                {suggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {suggestions.map(s => <button key={s} onClick={() => askAI(s)} style={{ ...chip(false), fontSize: 12.5, padding: '9px 14px' }}>{s} ←</button>)}
                  </div>
                )}
              </div>
            )}

            {/* ✦ الخطوة التالية الأفضل — يبقى التطبيق يساعدك (شبكة المعرفة) */}
            {q.trim() && suggestions.length > 0 && (businesses.length > 0 || products.length > 0) && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>✦ قد تحتاج أيضًا</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {suggestions.map(s => <button key={s} onClick={() => askAI(s)} style={chip(false)}>{s} ←</button>)}
                </div>
              </div>
            )}

            {businesses.length > 0 && (
              <Section title={q.trim() ? 'الأنشطة' : 'مقترح لك — الأعلى قربك وتقييماً'} count={businesses.length}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                  {businesses.map(b => <BizCard key={`${b.source}-${b.id}`} b={b} />)}
                </div>
              </Section>
            )}
            {/* ❤️ قد يعجبك — توصيات مكمّلة (Business Graph) */}
            {recs.length > 0 && (
              <Section title="❤️ قد يعجبك أيضاً" count={recs.length}>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {recs.map(b => <div key={`rec-${b.source}-${b.id}`} style={{ flexShrink: 0, width: 210 }}><BizCard b={b} /></div>)}
                </div>
              </Section>
            )}
            {products.length > 0 && (
              <Section title="منتجات" count={products.length}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                  {products.map((p: any) => (
                    <a key={p.id} href={`/store/${p.storeId}?p=${p.id}`} style={{ ...CARDS, textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}>
                      <div style={{ height: 120, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>{p.emoji || '📦'}</span>}
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: PURPLE }}>{(+p.price).toLocaleString()} د.م</div>
                        {p.storeName && <div style={{ fontSize: 10, color: MUTED }}><Store size={9} style={{ verticalAlign: 'middle' }} /> {p.storeName}</div>}
                      </div>
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BizCard({ b }: { b: Business }) {
  const onClick = () => trackAPI.event({ kind: 'business', action: 'clicked', businessId: `${b.source}:${b.id}`, name: b.name, city: b.city, source: 'explore' });
  return (
    <a href={b.href || `/business/${b.source}/${b.id}`} onClick={onClick} style={{ ...CARDS, padding: 13, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {b.image ? <img src={b.image} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>{b.source === 'provider' ? '👨‍🔧' : '🏬'}</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
            {b.verified && <BadgeCheck size={14} color={PURPLE} style={{ flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 10.5, color: MUTED, display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {b.status && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: b.status.color, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: b.status.color, display: 'inline-block' }} />{b.status.label}</span>}
            {b.availability && <span style={{ color: '#22c55e' }}>{b.availability.label}</span>}
            {b.city && <span><MapPin size={9} style={{ verticalAlign: 'middle' }} /> {b.city}</span>}
            {!!b.rating.count && <span><Star size={9} style={{ verticalAlign: 'middle', color: '#fbbf24' }} /> {b.rating.avg}</span>}
            {b.distanceKm != null && <span>{b.distanceKm} كم</span>}
          </div>
        </div>
      </div>
      {b.categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {b.categories.slice(0, 3).map((c, i) => <span key={i} style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 99 }}>{c}</span>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }}>
        {Object.entries(b.capabilities).filter(([, v]) => v).slice(0, 4).map(([k]) => <span key={k} style={{ fontSize: 13 }} title={k}>{CAP_ICON[k] || ''}</span>)}
      </div>
    </a>
  );
}

const CAP_ICON: Record<string, string> = { products: '🛍️', services: '🛠️', booking: '📅', delivery: '🚚', offers: '🎁', chat: '💬', appointments: '⏰', marketplace: '🏷️' };
const CARDS: React.CSSProperties = { background: CARD, border: BORDER, borderRadius: 14 };
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: BORDER, color: INK, fontSize: 13, fontFamily: 'inherit' };
const selStyle: React.CSSProperties = { ...inp, width: 'auto', padding: '7px 12px', borderRadius: 99, flexShrink: 0 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center' };
function chip(active: boolean): React.CSSProperties { return { flexShrink: 0, padding: '7px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', background: active ? PURPLE : CARD, color: active ? '#fff' : MUTED }; }
function viewBtn(active: boolean): React.CSSProperties { return { border: 'none', cursor: 'pointer', borderRadius: 99, padding: '6px 10px', background: active ? PURPLE : 'transparent', color: active ? '#fff' : MUTED, display: 'flex' }; }
function btn(primary: boolean): React.CSSProperties { return { padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: primary ? PURPLE : 'rgba(255,255,255,0.06)', color: INK }; }
function Labeled({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ fontSize: 11.5, color: MUTED, display: 'flex', flexDirection: 'column', gap: 5 }}>{label}{children}</label>; }
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <div style={{ marginBottom: 26 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span style={{ fontSize: 15, fontWeight: 900 }}>{title}</span><span style={{ fontSize: 10.5, color: MUTED, background: CARD, padding: '2px 9px', borderRadius: 99 }}>{count}</span></div>{children}</div>;
}
function Center({ children }: { children: React.ReactNode }) { return <div style={{ textAlign: 'center', padding: '50px 20px', color: MUTED, fontSize: 14 }}>{children}</div>; }
