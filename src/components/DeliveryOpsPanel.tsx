import { useEffect, useState } from 'react';
import { deliveryAPI } from '../services/api';

// ============================================================
// لوحةُ عمليّات التوصيل — ما بُني في الخادم يصير قابلًا للاستعمال بلا SQL.
//
//   ثلاثةُ أشياء يحتاجها التاجرُ ولم تكن متاحةً له إطلاقًا:
//     ① ماذا تستطيع كلُّ شركةٍ فعلًا (القدرات) — لا اسمُها فقط.
//     ② مزامنةُ المدن، **ورؤيةُ ما لم يُطابَق منها**. المدينةُ التي لم يفهمها
//        المحرّكُ يجب أن تظهر الآن لا عند أوّل شحنةٍ فاشلة.
//     ③ كتابةُ قواعد التسعير — «الثمنُ دالّة» تحتاج مَن يكتب الدالّة.
//
//   اللوحةُ لا تعرف اسمَ شركةٍ واحدة: تقرأ القدراتِ من /registry وتبني نفسَها.
// ============================================================

type Provider = { id: string; name: string; logo?: string; apiType?: string; enabled?: boolean };
type RegistryEntry = { id: string; name: string; capabilities: Record<string, any> };
type Rule = {
  id?: string; ruleType: string; cityId?: string | null; region?: string | null;
  weightMin?: number | null; weightMax?: number | null;
  orderMin?: number | null; orderMax?: number | null;
  fee: number; freeShipping?: boolean; priority?: number; enabled?: boolean; label?: string;
};

const RULE_LABEL: Record<string, string> = {
  city: 'حسب المدينة', region: 'حسب الجهة', weight: 'حسب الوزن',
  order_value: 'حسب قيمة الطلب', flat: 'ثابت (لكلّ الطلبات)',
};

const CAP_LABEL: Record<string, string> = {
  cities: 'المدن', pricing: 'التسعير', tracking: 'التتبّع', cod: 'الدفع عند الاستلام', pickup: 'الاستلام',
};

const CAP_MODE: Record<string, string> = {
  api: 'من الشركة', rules: 'بقواعدك', static: 'قائمة ثابتة', webhook: 'إشعار', none: '—',
};

const box: React.CSSProperties = {
  background: 'var(--panel2, rgba(255,255,255,.03))',
  border: '1px solid var(--clr-border, rgba(255,255,255,.08))',
  borderRadius: 12, padding: 14,
};

export default function DeliveryOpsPanel({
  providers, notify,
}: { providers: Provider[]; notify: (t: any, m: string) => void }) {
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; region?: string }[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Record<string, { success: boolean; checks: any[] }>>({});
  const [unmatched, setUnmatched] = useState<Record<string, { externalId: string; externalName: string }[]>>({});
  const [mapCount, setMapCount] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Rule>({ ruleType: 'flat', fee: 30, priority: 0 });
  const [quoteCity, setQuoteCity] = useState('');
  const [quotes, setQuotes] = useState<any[] | null>(null);

  useEffect(() => {
    deliveryAPI.registry().then(r => setRegistry(r.providers || [])).catch(() => {});
    deliveryAPI.canonicalCities().then(r => setCities(r.cities || [])).catch(() => {});
    deliveryAPI.pricingRules().then(r => setRules(r.rules || [])).catch(() => {});
  }, []);

  useEffect(() => {
    providers.forEach(p => {
      deliveryAPI.cityMappings(p.id)
        .then(r => setMapCount(m => ({ ...m, [p.id]: (r.mappings || []).length })))
        .catch(() => {});
    });
  }, [providers.length]);

  const capsOf = (p: Provider) => registry.find(r => r.id === (p.apiType || '').toLowerCase())?.capabilities;

  const sync = async (p: Provider) => {
    setSyncing(p.id);
    try {
      const r = await deliveryAPI.syncCities(p.id);
      setMapCount(m => ({ ...m, [p.id]: r.matched }));
      setUnmatched(u => ({ ...u, [p.id]: r.unmatched || [] }));
      notify(r.unmatched?.length ? 'warning' : 'success',
        `🗺️ ${p.name}: ${r.matched} مدينة مطابقة${r.unmatched?.length ? ` · ${r.unmatched.length} بلا مطابقة` : ''}`);
    } catch (e: any) {
      notify('error', `تعذّرت المزامنة: ${e?.message || 'تحقّق من الاتصال'}`);
    }
    setSyncing(null);
  };

  // تحقّقٌ حقيقيّ: كلُّ سطرٍ فحصٌ نُفِّذ فعلًا، لا مراحلَ تمثيليّة.
  const verify = async (p: Provider) => {
    setVerifying(p.id);
    try {
      const r = await deliveryAPI.verify(p.id);
      setVerdict(v => ({ ...v, [p.id]: { success: r.success, checks: r.checks || [] } }));
      notify(r.success ? 'success' : 'warning',
        r.success ? `✅ ${p.name}: الربط سليم` : `⚠️ ${p.name}: بعض الفحوص لم تنجح`);
    } catch (e: any) {
      notify('error', `تعذّر التحقّق: ${e?.message || 'تحقّق من الاتصال'}`);
    }
    setVerifying(null);
  };

  const addRule = async () => {
    try {
      const r = await deliveryAPI.savePricingRule(draft);
      setRules(r.rules || []);
      setDraft({ ruleType: 'flat', fee: 30, priority: 0 });
      notify('success', 'أُضيفت القاعدة');
    } catch (e: any) { notify('error', e?.message || 'تعذّر الحفظ'); }
  };

  const delRule = async (id: string) => {
    try { setRules((await deliveryAPI.deletePricingRule(id)).rules || []); notify('warning', 'حُذفت القاعدة'); }
    catch (e: any) { notify('error', e?.message || 'تعذّر الحذف'); }
  };

  const preview = async () => {
    if (!quoteCity.trim()) return;
    try { setQuotes((await deliveryAPI.quote(quoteCity)).quotes || []); }
    catch (e: any) { notify('error', e?.message || 'تعذّر الحساب'); setQuotes(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>

      {/* ① القدرات والمزامنة */}
      <div style={box}>
        <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>🔌 قدرات الشركات ومزامنة المدن</h3>
        {providers.length === 0 && <p style={{ fontSize: 12, opacity: .6 }}>أضف شركةً أولاً.</p>}
        {providers.map(p => {
          const caps = capsOf(p);
          const un = unmatched[p.id] || [];
          return (
            <div key={p.id} style={{ padding: '10px 0', borderTop: '1px solid var(--clr-border,rgba(255,255,255,.06))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>{p.logo} {p.name}</span>
                {caps
                  ? Object.entries(caps).filter(([k]) => CAP_LABEL[k]).map(([k, v]) => (
                      <span key={k} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'rgba(99,102,241,.15)' }}>
                        {CAP_LABEL[k]}: {typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : (CAP_MODE[String(v)] || String(v))}
                      </span>
                    ))
                  : <span style={{ fontSize: 10, opacity: .55 }}>بلا مزوّد مسجَّل — تُنفَّذ عبر وسيلة اتصال</span>}
                <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {mapCount[p.id] > 0 && <span style={{ fontSize: 11, opacity: .7 }}>{mapCount[p.id]} مدينة مربوطة</span>}
                  {/* الزرُّ يظهر فقط لمن يُعلن أنّه يُقدّم المدن — الواجهةُ تتبع القدرات لا الأسماء */}
                  <button onClick={() => verify(p)} disabled={verifying === p.id}
                    className="btn btn-ghost btn-sm">
                    {verifying === p.id ? '...' : '🔍 تحقّق كامل'}
                  </button>
                  {caps?.cities === 'api' && (
                    <button onClick={() => sync(p)} disabled={syncing === p.id}
                      className="btn btn-ghost btn-sm">
                      {syncing === p.id ? '...' : '🗺️ زامن المدن'}
                    </button>
                  )}
                </span>
              </div>
              {verdict[p.id] && (
                <div style={{ marginTop: 8, padding: 10, borderRadius: 8,
                  background: verdict[p.id].success ? 'rgba(16,185,129,.08)' : 'rgba(245,158,11,.1)' }}>
                  {verdict[p.id].checks.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, marginBottom: 3 }}>
                      {/* null = غيرُ منطبق: لا نقول «فشل» لفحصٍ لا تدعمه القناة */}
                      <span>{c.ok === true ? '✅' : c.ok === false ? '❌' : '➖'}</span>
                      <span style={{ fontWeight: 700 }}>{c.label}</span>
                      {c.detail && <span style={{ opacity: .7 }}>— {c.detail}</span>}
                    </div>
                  ))}
                </div>
              )}
              {un.length > 0 && (
                <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(245,158,11,.1)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    ⚠️ {un.length} مدينة لدى الشركة لم يفهمها المحرّك — الشحن إليها سيرسل الاسم نصًّا:
                  </p>
                  <p style={{ fontSize: 11, opacity: .8 }}>{un.map(u => u.externalName).join(' · ')}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ② قواعد التسعير */}
      <div style={box}>
        <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>💰 قواعد التسعير</h3>
        <p style={{ fontSize: 11, opacity: .6, marginBottom: 10 }}>
          الأعلى أولويّةً أوّلًا؛ وعند التساوي الأضيقُ نطاقًا. قاعدةُ مدينةٍ تسبق قاعدةً عامّة.
        </p>

        {rules.length === 0 && <p style={{ fontSize: 12, opacity: .6, marginBottom: 10 }}>
          لا قواعد — يُستعمل جدولُ الأثمان في الإعدادات.
        </p>}

        {rules.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontSize: 12, borderTop: '1px solid var(--clr-border,rgba(255,255,255,.06))' }}>
            <span style={{ fontWeight: 700, minWidth: 110 }}>{RULE_LABEL[r.ruleType] || r.ruleType}</span>
            <span style={{ opacity: .75, flex: 1 }}>
              {r.cityId && (cities.find(c => c.id === r.cityId)?.name || r.cityId)}
              {r.region && ` جهة: ${r.region}`}
              {(r.weightMin != null || r.weightMax != null) && ` وزن ${r.weightMin ?? 0}–${r.weightMax ?? '∞'}kg`}
              {(r.orderMin != null || r.orderMax != null) && ` طلب ${r.orderMin ?? 0}–${r.orderMax ?? '∞'}`}
            </span>
            <span style={{ fontWeight: 900 }}>{r.freeShipping ? 'مجّاني' : `${r.fee} د.هـ`}</span>
            <span style={{ fontSize: 10, opacity: .5 }}>أولويّة {r.priority || 0}</span>
            <button onClick={() => r.id && delRule(r.id)} className="btn btn-danger btn-sm" style={{ paddingInline: 8 }}>×</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
          <select className="select" style={{ fontSize: 12 }} value={draft.ruleType}
            onChange={e => setDraft(d => ({ ...d, ruleType: e.target.value, cityId: null, region: null }))}>
            {Object.entries(RULE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {draft.ruleType === 'city' && (
            <select className="select" style={{ fontSize: 12 }} value={draft.cityId || ''}
              onChange={e => setDraft(d => ({ ...d, cityId: e.target.value }))}>
              <option value="">— المدينة —</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {draft.ruleType === 'region' && (
            <select className="select" style={{ fontSize: 12 }} value={draft.region || ''}
              onChange={e => setDraft(d => ({ ...d, region: e.target.value }))}>
              <option value="">— الجهة —</option>
              {Array.from(new Set(cities.map(c => c.region).filter(Boolean))).map(r => <option key={r} value={r!}>{r}</option>)}
            </select>
          )}
          {draft.ruleType === 'weight' && (<>
            <input className="input" style={{ width: 80, fontSize: 12 }} type="number" placeholder="من kg"
              onChange={e => setDraft(d => ({ ...d, weightMin: e.target.value === '' ? null : +e.target.value }))} />
            <input className="input" style={{ width: 80, fontSize: 12 }} type="number" placeholder="إلى kg"
              onChange={e => setDraft(d => ({ ...d, weightMax: e.target.value === '' ? null : +e.target.value }))} />
          </>)}
          {draft.ruleType === 'order_value' && (<>
            <input className="input" style={{ width: 90, fontSize: 12 }} type="number" placeholder="من قيمة"
              onChange={e => setDraft(d => ({ ...d, orderMin: e.target.value === '' ? null : +e.target.value }))} />
            <label style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="checkbox" checked={!!draft.freeShipping}
                onChange={e => setDraft(d => ({ ...d, freeShipping: e.target.checked }))} />
              مجّاني
            </label>
          </>)}

          {!draft.freeShipping && (
            <input className="input" style={{ width: 90, fontSize: 12 }} type="number" placeholder="الثمن" value={draft.fee}
              onChange={e => setDraft(d => ({ ...d, fee: +e.target.value }))} />
          )}
          <input className="input" style={{ width: 80, fontSize: 12 }} type="number" placeholder="أولويّة" value={draft.priority || 0}
            onChange={e => setDraft(d => ({ ...d, priority: +e.target.value }))} />
          <button onClick={addRule} className="btn btn-primary btn-sm">+ أضف قاعدة</button>
        </div>
      </div>

      {/* ③ معاينة — الثمن مشروحًا قبل أيّ طلب حقيقيّ */}
      <div style={box}>
        <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>🧮 جرّب الثمن</h3>
        <p style={{ fontSize: 11, opacity: .6, marginBottom: 10 }}>
          اكتب مدينةً بأيّ صيغة («كازا» · «Casablanca») وانظر ماذا يحسب كلُّ مزوّد ولماذا.
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input" style={{ flex: 1, fontSize: 12 }} placeholder="المدينة" value={quoteCity}
            onChange={e => setQuoteCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && preview()} />
          <button onClick={preview} className="btn btn-ghost btn-sm">احسب</button>
        </div>
        {quotes && quotes.length === 0 && <p style={{ fontSize: 12, opacity: .6, marginTop: 8 }}>لا نتائج.</p>}
        {quotes?.map((q, i) => (
          <div key={i} style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,.03)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 12 }}>{q.providerName}</span>
              <span style={{ marginInlineStart: 'auto', fontWeight: 900 }}>
                {q.supported === false ? '—' : `${q.deliveryFee} ${q.currency || 'د.هـ'}`}
              </span>
            </div>
            {q.reason && <p style={{ fontSize: 11, opacity: .6, marginTop: 3 }}>{q.reason}</p>}
            {/* الشرحُ هو الفارق: التاجرُ يرى أيَّ قاعدةٍ حسمت لا الرقمَ وحده */}
            {q.breakdown?.map((b: any, j: number) => (
              <p key={j} style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>· {b.why} ({b.fee})</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
