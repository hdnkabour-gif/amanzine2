import { useEffect, useMemo, useState } from 'react';
import { Save, Plus, X, Check, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { resolveConcepts } from '../lib/akg/kb/index';
import { providersAPI, type FieldVisitResult, type MyVouches } from '../services/api';

// ============================================================
// الزيارةُ الميدانيّة — «نمشي للمحلّ، نسجّلو، ونجمع كلّ شيء».
//
//   ثلاثةُ قراراتٍ تُخالف الاستمارةَ المعتادة:
//
//   ① **مقابلةٌ لا استمارة، وشاشةٌ واحدة.** الحرفيُّ واقفٌ في محلّه ووراءه
//      زبون. عشرُ شاشاتٍ تعني أنّه سيقول «سير دابا نشوفوها من بعد». ما لا
//      يُلتقَط في ثلاث دقائقَ لا يُلتقَط أبدًا.
//
//   ② **الكلماتُ والجملُ حقولٌ أولى، لا ملاحظاتٌ في الأخير.** المحصولُ
//      الحقيقيُّ ليس صفَّ المحلّ — صفُّ المحلّ يُكتب في دقيقة. أمّا «برييون»
//      و«دريساج» فلا يعرفها قاموسٌ في الأرض.
//
//   ③ **يُحفَظ محلّيًّا قبل الشبكة.** أنت في درب غلف والإشارةُ تقطع. زيارةٌ
//      تضيع لأنّ الشبكة سقطت أسوأُ من زيارةٍ لم تحدث: أخذتَ وقتَ الرجل مرّتين.
// ============================================================

const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const LINE = '1px solid var(--line,rgba(255,255,255,.12))';
const CARD = 'color-mix(in srgb, #fff 3%, transparent)';
const GREEN = '#0a8f6f';
const AMBER = '#D4A017';
const DRAFT = 'amz_field_draft';

interface Draft {
  name: string; phone: string; email: string; city: string;
  servicesRaw: string; removed: string[];
  lines: string[]; asks: string[]; words: { term: string; conceptId: string }[];
  notes: string;
}
const EMPTY: Draft = { name: '', phone: '', email: '', city: '', servicesRaw: '', removed: [], lines: [], asks: [], words: [], notes: '' };

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: LINE,
  background: 'rgba(255,255,255,.03)', color: INK1, fontSize: 14, fontFamily: 'inherit',
};

function Lines({ label, hint, value, onChange }: {
  label: string; hint: string; value: string[]; onChange: (v: string[]) => void;
}) {
  const [t, setT] = useState('');
  const add = () => { const v = t.trim(); if (!v) return; onChange([...value, v]); setT(''); };
  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: INK1 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: INK3, margin: '2px 0 7px' }}>{hint}</div>
      <div style={{ display: 'flex', gap: 7 }}>
        <input style={inp} value={t} onChange={e => setT(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="اكتب كما قالها هو، ثمّ Enter" />
        <button onClick={add} style={{ padding: '0 13px', borderRadius: 10, border: LINE, background: 'transparent', color: INK1, cursor: 'pointer' }}>
          <Plus size={16} />
        </button>
      </div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 7 }}>
          {value.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 11px', borderRadius: 9, background: 'rgba(255,255,255,.03)' }}>
              <span style={{ flex: 1, fontSize: 13, color: INK1 }}>«{v}»</span>
              <button onClick={() => onChange(value.filter((_, k) => k !== i))}
                style={{ background: 'none', border: 'none', color: INK3, cursor: 'pointer', display: 'flex' }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FieldVisit() {
  const [d, setD] = useState<Draft>(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT) || '{}') }; } catch { return EMPTY; }
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<FieldVisitResult | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  // الحرفيُّ المعتمَد يرى حصّتَه قبل أن يبدأ، لا بعد أن يملأ كلَّ شيءٍ ويُرفَض.
  // الرفضُ بعد العمل يُغضِب مرّتين: ضاع الوقتُ، وضاع أمام صاحب المحلّ.
  const [vouch, setVouch] = useState<MyVouches | null>(null);
  useEffect(() => { providersAPI.myVouches().then(setVouch).catch(() => setVouch(null)); }, []);

  // الزيارةُ كيانٌ قائم: تُعاد وتُقارَن. الموقعُ والمدّةُ يُلتقطان **بلا أن
  // يكتبهما أحد** — ما يحتاج جهدًا في الميدان لا يُجمَع. والموقعُ اختياريٌّ
  // عمدًا: رفضُ الإذن لا يجوز أن يمنع تسجيلَ المحلّ.
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [startedAt] = useState(() => Date.now());
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}, { timeout: 8000, maximumAge: 60000 });
  }, []);

  // المسوّدةُ تُحفظ عند كلّ حرف. الشبكةُ تقطع، والمتصفّحُ يُقتَل، والرجلُ
  // ينادي زبونًا — ولا شيءَ من ذلك يجوز أن يُضيّع ما قاله.
  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch {} }, [d]);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // خدماتُه تُقرأ من جملته. لا قائمةَ من ١٨٨ مفهومًا يختار منها — هو يتكلّم،
  // ونحن نعرض ما فهمناه، وهو يشطب الخطأ. هذا عكسُ الاستمارة تمامًا.
  const found = useMemo(() => {
    if (!d.servicesRaw.trim()) return [];
    return resolveConcepts(d.servicesRaw, 12)
      .filter(c => !d.removed.includes(c.id))
      .map(c => ({ id: c.id, name: c.concept?.ar || c.id }));
  }, [d.servicesRaw, d.removed]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(p => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await providersAPI.fieldVisit({
        shop: { name: d.name.trim(), phone: d.phone.trim(), email: d.email.trim() || undefined, city: d.city.trim() },
        servicesRaw: d.servicesRaw,
        concepts: found.map((c, i) => ({ conceptId: c.id, isPrimary: i === 0 })),
        customerLines: d.lines, pricingAsks: d.asks, words: d.words, notes: d.notes,
        gpsLat: gps?.lat, gpsLng: gps?.lng,
        durationSec: Math.round((Date.now() - startedAt) / 1000),
      });
      setDone(r);
      try { localStorage.removeItem(DRAFT); } catch {}
    } catch (e: any) {
      // لا نمسح المسوّدة عند الفشل: هي كلُّ ما بقي من الزيارة.
      setErr(e?.message || 'تعذّر الحفظ — المسوّدةُ محفوظةٌ، عاود من بعد');
    }
    setBusy(false);
  };

  if (done) {
    const L = done.learned;
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: INK1 }}>✅ تسجَّل «{done.provider.name}»</div>
        {/* لا نَعِد بما لا نملك: التزكيةُ ليست اعتمادًا، والمزكِّي يجب أن
            يقولها لصاحب المحلّ بنفسه قبل أن يظنّها. */}
        {done.provider.status === 'vouched' && (
          <div style={{ padding: '10px 13px', borderRadius: 11, border: `1px solid ${AMBER}44`, background: 'rgba(212,160,23,.07)', fontSize: 12.5, color: AMBER, fontWeight: 650 }}>
            مُزكًّى من «{done.provider.vouchedBy}» — الاعتمادُ كيجي من بعد ما نزوروه.
          </div>
        )}
        {done.loginCode ? (
          <div style={{ padding: '13px 15px', borderRadius: 12, border: `1px solid ${AMBER}55`, background: 'rgba(212,160,23,.08)' }}>
            <div style={{ fontSize: 12.5, color: INK3 }}>رمزُ الدخول — أعطِه له الآن، ولن يظهر مرّةً أخرى</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: AMBER, letterSpacing: 4, margin: '5px 0' }}>{done.loginCode}</div>
            <div style={{ fontSize: 12, color: INK1 }}>الحساب: <b dir="ltr">{done.email}</b></div>
            <div style={{ fontSize: 11.5, color: INK3, marginTop: 4 }}>غادي يُطلَب منّو يبدّلو أوّل ما يدخل.</div>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: INK3 }}>الحسابُ موجودٌ من قبل — ما صدرش رمزٌ جديد.</div>
        )}

        <div style={{ padding: '13px 15px', borderRadius: 12, background: CARD, border: LINE }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: INK1, marginBottom: 8 }}>شنو تعلَّمنا من هاد المحلّ</div>
          {[['خدمات مربوطة', L.concepts], ['كلمات دخلات للمعرفة', L.words],
            ['جُمل ديال الزبناء', L.customerLines], ['أسئلة ديال الثمن', L.pricingAsks]].map(([k, v]) => (
            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: INK1, padding: '3px 0' }}>
              <span style={{ color: INK3 }}>{k}</span><b>{v as number}</b>
            </div>
          ))}
          {L.needsReview > 0 && (
            <div style={{ marginTop: 9, padding: '9px 11px', borderRadius: 9, background: 'rgba(212,160,23,.10)', color: AMBER, fontSize: 12.5, display: 'flex', gap: 7 }}>
              <AlertTriangle size={15} />
              <span>{L.needsReview} كلمة ما دخلاتش — كاينة عند مفهومٍ آخر. راجعها فـ«عقل AMANZINE».</span>
            </div>
          )}
        </div>
        <button onClick={() => { setDone(null); setD(EMPTY); }}
          style={{ padding: '12px', borderRadius: 11, border: 'none', background: GREEN, color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
          زيارة أخرى
        </button>
      </div>
    );
  }

  const ready = d.name.trim().length > 1 && /^(\+212|0)[5-7]\d{8}$/.test(d.phone.replace(/\s/g, ''));

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: INK1 }}>زيارة محلّ</div>
          <div style={{ fontSize: 11.5, color: INK3 }}>خلّيه هو يتكلّم — وأنت كتب كما قال</div>
        </div>
        {gps && <span title="الموقع مُلتقَط" style={{ color: GREEN, fontSize: 11, fontWeight: 700 }}>📍</span>}
        <span title={online ? 'متّصل' : 'بلا شبكة — المسوّدة محفوظة'}
          style={{ color: online ? GREEN : AMBER, display: 'flex' }}>
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        </span>
      </div>

      {vouch?.me && !vouch.me.verified && (
        <div style={{ padding: '10px 13px', borderRadius: 11, border: `1px solid ${AMBER}44`, background: 'rgba(212,160,23,.07)', color: AMBER, fontSize: 12.5, fontWeight: 650 }}>
          محلُّك مُزكًّى ولمّا يتعتمد بعد — ما تقدرش تسجّل محلّاتٍ أخرى دابا.
        </div>
      )}
      {vouch?.me?.verified && (
        <div style={{ padding: '10px 13px', borderRadius: 11, background: CARD, border: LINE, fontSize: 12.5, color: INK1 }}>
          بقى ليك <b style={{ color: vouch.left ? GREEN : AMBER }}>{vouch.left}</b> من {vouch.quota} محلّات تقدر تسجّلهم.
          {!vouch.left && <span style={{ color: INK3 }}> — سالات الحصّة.</span>}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        <input style={inp} value={d.name} onChange={e => set('name', e.target.value)} placeholder="اسم المحلّ *" />
        <input style={inp} value={d.phone} onChange={e => set('phone', e.target.value)} placeholder="الهاتف * (0600000000)" inputMode="tel" dir="ltr" />
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={inp} value={d.city} onChange={e => set('city', e.target.value)} placeholder="المدينة" />
          <input style={inp} value={d.email} onChange={e => set('email', e.target.value)} placeholder="البريد (اختياريّ)" dir="ltr" />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: INK1 }}>شنو كتدير؟</div>
        <div style={{ fontSize: 11.5, color: INK3, margin: '2px 0 7px' }}>خلّيه يعدّد بلسانو — ما تختارش من لائحة</div>
        <textarea style={{ ...inp, minHeight: 74, resize: 'vertical' }} value={d.servicesRaw}
          onChange={e => set('servicesRaw', e.target.value)}
          placeholder="عندي لافاج، طولوري، صباغة، كنغسل الزرابي…" />
        {found.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11.5, color: INK3, marginBottom: 5 }}>فهمنا هادو — شطّب اللي ماشي صحيح:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {found.map((c, i) => (
                <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, background: i === 0 ? 'rgba(10,143,111,.16)' : 'rgba(255,255,255,.05)', border: i === 0 ? `1px solid ${GREEN}` : LINE, fontSize: 12.5, color: INK1, fontWeight: 700 }}>
                  {i === 0 && <Check size={12} color={GREEN} />}{c.name}
                  <button onClick={() => set('removed', [...d.removed, c.id])}
                    style={{ background: 'none', border: 'none', color: INK3, cursor: 'pointer', display: 'flex', padding: 0 }}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: INK3, marginTop: 5 }}>الأخضر = النشاط الأساسيّ</div>
          </div>
        )}
      </div>

      <Lines label="شنو كيقولو لك الزبناء ملّي كيدخلو؟"
        hint="هادي أثمنُ حاجة — كلُّ جملةٍ تصير اختبارًا دائمًا للمحرّك"
        value={d.lines} onChange={v => set('lines', v)} />

      <Lines label="شنو كتسول قبل ما تعطي الثمن؟"
        hint="الثمنُ عندك دالّةٌ لا رقم — هاد الأسئلة غادي يسولهم التطبيق نيابةً عليك"
        value={d.asks} onChange={v => set('asks', v)} />

      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: INK1 }}>كلمات كيستعملوها الناس</div>
        <div style={{ fontSize: 11.5, color: INK3, margin: '2px 0 7px' }}>
          «برييون» · «دريساج» · «ليزان» — ما كتلقاهمش فحتّى قاموس
        </div>
        {d.words.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
            <input style={{ ...inp, flex: 1 }} value={w.term} placeholder="الكلمة"
              onChange={e => set('words', d.words.map((x, k) => k === i ? { ...x, term: e.target.value } : x))} />
            <select style={{ ...inp, flex: 1 }} value={w.conceptId}
              onChange={e => set('words', d.words.map((x, k) => k === i ? { ...x, conceptId: e.target.value } : x))}>
              <option value="">تعني…</option>
              {found.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => set('words', d.words.filter((_, k) => k !== i))}
              style={{ padding: '0 11px', borderRadius: 10, border: LINE, background: 'transparent', color: INK3, cursor: 'pointer' }}><X size={14} /></button>
          </div>
        ))}
        <button onClick={() => set('words', [...d.words, { term: '', conceptId: found[0]?.id || '' }])}
          disabled={!found.length}
          style={{ padding: '8px 13px', borderRadius: 10, border: LINE, background: 'transparent', color: found.length ? INK1 : INK3, fontSize: 12.5, fontFamily: 'inherit', cursor: found.length ? 'pointer' : 'default' }}>
          <Plus size={13} /> زيد كلمة {!found.length && '— كتب الخدمات أوّلًا'}
        </button>
      </div>

      <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={d.notes}
        onChange={e => set('notes', e.target.value)} placeholder="ملاحظات (ساعات العمل، الموقع…)" />

      {err && (
        <div style={{ padding: '10px 13px', borderRadius: 11, border: '1px solid rgba(239,68,68,.35)', background: 'rgba(239,68,68,.07)', color: '#FCA5A5', fontSize: 12.5, fontWeight: 650 }}>
          {err}
        </div>
      )}

      <button onClick={save} disabled={!ready || busy}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 12, border: 'none', background: ready ? GREEN : 'rgba(255,255,255,.10)', color: '#fff', fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: ready && !busy ? 'pointer' : 'default' }}>
        <Save size={17} /> {busy ? 'كنسجّل…' : 'سجّل المحلّ'}
      </button>
      <div style={{ fontSize: 11, color: INK3, textAlign: 'center' }}>
        المسوّدة كتّحفظ فهاد الجهاز — حتّى إلا طاحت الشبكة.
      </div>
    </div>
  );
}
