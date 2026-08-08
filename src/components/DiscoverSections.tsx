import { useState, useEffect } from 'react';
import { BadgeCheck, Star, MapPin, Store, ArrowLeft } from 'lucide-react';
import { expandQuery, toSearchParams } from '../lib/searchIntent';

// ============================================================
// Discover — الأقسام الجامعة في صفحة /market (Super App)
// يعرض في نتيجة واحدة: منتجات كل المتاجر + مقدّمي الخدمات + المتاجر،
// حسب المدينة والبحث. يختفي أي قسم فارغ. مكتفٍ بذاته — حقنه في
// Marketplace سطر واحد، ولا يمسّ شبكة listings الموجودة.
// ============================================================

interface DProduct { id: string; storeId: string; name: string; price: number; category: string; emoji: string; imageUrl: string; storeName: string; storeCity: string; }
interface DProvider { id: string; storeId: string; name: string; bio: string; city: string; avatarUrl: string; isVerified: boolean; ratingAvg: number; ratingCount: number; serviceLabels: string[]; }
interface DStore { storeId: string; name: string; logo: string; city: string; description: string; productCount: number; }

const CARD: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };
const MUTED = 'rgba(255,255,255,0.5)';
const PURPLE = '#8b5cf6';

/**
 * **ما فُهم، بالاتّجاه لا بالاسم وحدَه.**
 *
 *   كان يُقال «فهمنا: ملابس الأطفال» — الشيءُ بلا ما يُراد به. والشاشةُ
 *   الأولى تقول «كتقلّب على…» ثمّ تنقل الإنسانَ إلى السوق فيسقط الاتّجاهُ
 *   في الطريق. وقُيست الرحلةُ في متصفّحٍ حقيقيّ: الإنسانُ يكتب «بغيت شي
 *   كسوة لبنتي» فيُنقَل إلى صفحةٍ **لا تقول له لماذا جاءته هذه النتائج**.
 *
 *   والكلمةُ تتبع نوعَ الفئة: «تشري جلابة» كلامٌ، و«تشري سبّاك» ليس كلامًا.
 *   ولا مُعرِّفَ داخليٌّ يظهر — القانون العاشر.
 */
function sayUnderstood(i: ReturnType<typeof expandQuery>): string | null {
  const what = i.label && i.label !== i.raw ? i.label : null;
  if (!what) return null;
  if (i.stance === 'offer') return `باغي تعرض ${what}`;
  if (i.stance === 'seek') return i.kind === 'service' ? `كتقلّب على ${what}` : `باغي تشري ${what}`;
  return what;
}

export default function DiscoverSections({ city, q }: { city: string; q: string }) {
  const [data, setData] = useState<{ products: DProduct[]; providers: DProvider[]; stores: DStore[] } | null>(null);
  const [understood, setUnderstood] = useState<string | null>(null);

  useEffect(() => {
    // ── طبقةُ الفهم قبل طبقة البحث ───────────────────────────
    // كان الاستعلامُ يُرسَل خامًّا فيقابله `LIKE '%…%'`. فمن كتب «بلومبي» أو
    // «plombier» أو «tomobil» لا يجد شيئًا ولو كان المطلوبُ أمامه في القاعدة:
    // ١٩٧ مفهومًا بمرادفاتها كانت تخدم التاجرَ وحدَه. الآن يُفهَم الاستعلامُ
    // هنا — في المتصفّح، حيث يسكن الفهم (ADR ③) — ويُرسَل موسَّعًا.
    const intent = expandQuery(q);
    const qs = toSearchParams(intent, city);
    setUnderstood(sayUnderstood(intent));
    const t = setTimeout(() => {
      fetch(`/api/discover?${qs}`).then(r => r.json())
        .then(d => setData({ products: d.products || [], providers: d.providers || [], stores: d.stores || [] }))
        .catch(() => setData(null));
    }, q ? 350 : 0); // debounce أثناء الكتابة
    return () => clearTimeout(t);
  }, [city, q]);

  if (!data || (!data.products.length && !data.providers.length && !data.stores.length)) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 32 }}>
      {/* ما فُهم من كلامك — صدقٌ في الوسيط: الزبونُ يرى لماذا جاءته هذه النتائج */}
      {understood && (
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.35)', color: PURPLE, fontSize: 12, fontWeight: 700 }}>
          فهمنا: {understood}
        </div>
      )}
      {/* 🛍️ منتجات من كل المتاجر */}
      {data.products.length > 0 && (
        <section>
          <SectionTitle icon="🛍️" label="منتجات من المتاجر" count={data.products.length} />
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {data.products.map(p => (
              <a key={p.id} href={`/store/${p.storeId}?p=${p.id}`} style={{ ...CARD, flexShrink: 0, width: 150, textDecoration: 'none', color: 'inherit', overflow: 'hidden', display: 'block' }}>
                <div style={{ height: 110, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 34 }}>{p.emoji}</span>}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: PURPLE, margin: '2px 0' }}>{p.price.toLocaleString()} د.م</div>
                  <div style={{ fontSize: 10, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Store size={9} style={{ verticalAlign: 'middle' }} /> {p.storeName || 'متجر'}{p.storeCity ? ` · ${p.storeCity}` : ''}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 👨‍🔧 مقدّمو الخدمات */}
      {data.providers.length > 0 && (
        <section>
          <SectionTitle icon="👨‍🔧" label="مقدّمو الخدمات" count={data.providers.length} />
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {data.providers.map(p => (
              <a key={p.id} href={`/business/provider/${p.id}`} style={{ ...CARD, flexShrink: 0, width: 190, padding: 12, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👨‍🔧'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      {p.isVerified && <BadgeCheck size={13} color={PURPLE} style={{ flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 10, color: MUTED, display: 'flex', gap: 6 }}>
                      {p.city && <span><MapPin size={9} style={{ verticalAlign: 'middle' }} /> {p.city}</span>}
                      {!!p.ratingCount && <span><Star size={9} style={{ verticalAlign: 'middle', color: '#fbbf24' }} /> {p.ratingAvg}</span>}
                    </div>
                  </div>
                </div>
                {p.serviceLabels.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.serviceLabels.slice(0, 3).map((s, i) => <span key={i} style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 99 }}>{s}</span>)}
                  </div>
                )}
                <span style={{ marginTop: 'auto', fontSize: 10.5, fontWeight: 700, color: PURPLE, display: 'flex', alignItems: 'center', gap: 4 }}>احجز الآن <ArrowLeft size={11} /></span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 🏬 المتاجر */}
      {data.stores.length > 0 && (
        <section>
          <SectionTitle icon="🏬" label="المتاجر" count={data.stores.length} />
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {data.stores.map(s => (
              <a key={s.storeId} href={`/business/store/${s.storeId}`} style={{ ...CARD, flexShrink: 0, width: 170, padding: 12, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {s.logo ? <img src={s.logo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : '🏬'}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{s.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>
                  {s.city ? `📍 ${s.city} · ` : ''}{s.productCount} منتج
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 14.5, fontWeight: 900 }}>{label}</span>
      <span style={{ fontSize: 10.5, color: MUTED, background: 'rgba(255,255,255,0.05)', padding: '2px 9px', borderRadius: 99 }}>{count}</span>
    </div>
  );
}
