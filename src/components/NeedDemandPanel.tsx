import { useEffect, useState } from 'react';
import { Users, Phone, Mail, Check, X, RefreshCw } from 'lucide-react';
import { needsAPI, type NeedDemandRow } from '../services/api';

// ============================================================
// لوحة الطلب — ما يقوله السوقُ الفارغ.
//   كلُّ صفٍّ هنا إنسانٌ كتب حاجته ولم نجد له شيئًا. مجموعةً: «١٧ زبونًا
//   كيقلّبو على سبّاك فسلا» — وهي أقوى جملةٍ تُقنع حرفيًّا بالتسجيل.
//   كانت البيانات تُجمَع منذ إضافة NeedCapture ولا أحد يراها: نفسُ العطب
//   الذي بُنيت القاعدة ⑦ لمنعه.
// ============================================================

const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const LINE = '1px solid var(--line,rgba(255,255,255,.10))';
const CARD = 'color-mix(in srgb, #fff 3%, transparent)';
const GREEN = '#0a8f6f';
const AMBER = '#D4A017';

interface Req {
  id: string; raw: string; concept: string | null; city: string | null;
  contact: string | null; contact_kind: string | null; status: string;
  matched_business: string | null; created_at: string;
}

const since = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'دابا';
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `من ${h} ساعة`;
  return `من ${Math.floor(h / 24)} يوم`;
};

export default function NeedDemandPanel() {
  const [demand, setDemand] = useState<NeedDemandRow[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setBusy(true); setErr(null);
    try {
      const [d, r] = await Promise.all([needsAPI.demand(days), needsAPI.list('open')]);
      setDemand(d.demand || []);
      setReqs((r.requests || []) as Req[]);
    } catch (e: any) {
      setErr(e?.message || 'تعذّر تحميل الطلب');
    }
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const act = async (id: string, status: 'matched' | 'closed') => {
    setActing(id);
    // لا نُخفي الصفّ قبل نجاح الخادم — القاعدة ①: لا نجاحَ قبل نجاحٍ حقيقيّ.
    try { await needsAPI.update(id, { status }); await load(); }
    catch (e: any) { setErr(e?.message || 'تعذّر التحديث'); }
    setActing(null);
  };

  const totalPeople = demand.reduce((s, d) => s + d.count, 0);
  const totalReach = demand.reduce((s, d) => s + d.reachable, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 900, color: INK1 }}>الطلب غير الملبّى</div>
          <div style={{ fontSize: 11, color: INK3 }}>ناسٌ كتبوا حاجتهم وما لقّيناش ليهم — هادي مادّة استقطاب الحرفيّين</div>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '6px 10px', borderRadius: 9, border: LINE, background: 'rgba(255,255,255,.03)', color: INK1, fontSize: 12, fontFamily: 'inherit' }}>
          <option value={7}>٧ أيّام</option><option value={30}>٣٠ يومًا</option><option value={90}>٩٠ يومًا</option>
        </select>
        <button onClick={load} disabled={busy} aria-label="تحديث"
          style={{ padding: '6px 9px', borderRadius: 9, border: LINE, background: 'transparent', color: INK3, cursor: busy ? 'progress' : 'pointer', display: 'flex' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {err && (
        <div style={{ padding: '10px 13px', borderRadius: 11, border: '1px solid rgba(239,68,68,.35)', background: 'rgba(239,68,68,.07)', color: '#FCA5A5', fontSize: 12.5, fontWeight: 650 }}>
          {err}
        </div>
      )}

      {/* الخلاصة — رقمان فقط، وكلاهما من القاعدة لا مُخترَع */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { n: totalPeople, l: 'طلبٌ بلا جواب', c: AMBER, i: Users },
          { n: totalReach, l: 'منهم نقدرو نعيّطو ليهم', c: GREEN, i: Phone },
        ].map(s => (
          <div key={s.l} style={{ flex: '1 1 150px', padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: s.c }}>
              <s.i size={15} /><span style={{ fontSize: 22, fontWeight: 900 }}>{s.n}</span>
            </div>
            <div style={{ fontSize: 11.5, color: INK3, marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* مجمَّعًا: المفهوم × المدينة — الجملة التي تُقنع الحرفيّ */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 10 }}>وين الطلب؟</div>
        {busy && !demand.length ? <div style={{ fontSize: 12, color: INK3 }}>كنجمعو…</div>
          : demand.length === 0 ? <div style={{ fontSize: 12, color: INK3, lineHeight: 1.8 }}>
              ما كاين حتّى طلبٍ بلا جواب فهاد المدّة. إمّا السوق كيلبّي، ولا
              مازال ما وصلوش ناس — شوف «نبض المنصّة».
            </div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {demand.map(d => (
                <div key={`${d.concept}|${d.city}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: 'rgba(255,255,255,.02)' }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: AMBER, minWidth: 30 }}>{d.count}</span>
                  <span style={{ flex: 1, fontSize: 13, color: INK1, fontWeight: 700 }}>
                    كيقلّبو على «{d.concept}»{d.city !== '—' ? ` ف${d.city}` : ''}
                  </span>
                  {d.reachable > 0 && (
                    <span title="عدد من ترك اتّصالًا" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: GREEN, background: 'rgba(34,197,94,.12)', padding: '3px 9px', borderRadius: 99 }}>
                      <Phone size={11} /> {d.reachable}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>

      {/* الطلبات المفتوحة — كلٌّ منها إنسان */}
      <div style={{ padding: '13px 15px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 4 }}>
          الطلبات المفتوحة {reqs.length > 0 && <span style={{ color: AMBER }}>· {reqs.length}</span>}
        </div>
        <div style={{ fontSize: 11, color: INK3, marginBottom: 10 }}>
          «ربطتُه» = لقّيتي ليه حدًّا · «سالا» = ما بقاش محتاج
        </div>
        {reqs.length === 0
          ? <div style={{ fontSize: 12, color: INK3 }}>ما كاين حتّى طلبٍ مفتوح.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reqs.map(q => (
                <div key={q.id} style={{ padding: '10px 12px', borderRadius: 11, background: 'rgba(255,255,255,.02)', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 750, color: INK1 }}>«{q.raw}»</span>
                    {q.city && <span style={{ fontSize: 11, color: INK3 }}>📍 {q.city}</span>}
                    <span style={{ fontSize: 10.5, color: INK3, marginInlineStart: 'auto' }}>{since(q.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {q.contact ? (
                      <a href={q.contact_kind === 'email' ? `mailto:${q.contact}` : `tel:${q.contact.replace(/\s/g, '')}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 750, color: GREEN, textDecoration: 'none', background: 'rgba(34,197,94,.10)', padding: '5px 11px', borderRadius: 99 }}>
                        {q.contact_kind === 'email' ? <Mail size={12} /> : <Phone size={12} />} {q.contact}
                      </a>
                    ) : (
                      <span style={{ fontSize: 11.5, color: INK3 }}>بلا اتّصال — الإشارة محسوبة فقط</span>
                    )}
                    <button onClick={() => act(q.id, 'matched')} disabled={acting === q.id}
                      style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, border: `1px solid ${GREEN}`, background: 'transparent', color: GREEN, fontSize: 12, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer' }}>
                      <Check size={12} /> ربطتُه
                    </button>
                    <button onClick={() => act(q.id, 'closed')} disabled={acting === q.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, border: LINE, background: 'transparent', color: INK3, fontSize: 12, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer' }}>
                      <X size={12} /> سالا
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
