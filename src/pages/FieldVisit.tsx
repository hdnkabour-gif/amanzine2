import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { resolveConcepts } from '../lib/akg/kb/index';
import { providersAPI, type FieldVisitResult, type MyVouches } from '../services/api';
// التدفّقُ الجديد: جملةٌ واحدةٌ ثمّ تأكيدات — لا استمارةٌ تأخذ نصفَ ساعة.
import VisitFlow, { EMPTY_DRAFT, type VisitDraft } from '../components/VisitFlow';
import { kindOfConcept, ASKS } from '../lib/visitKind';

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

export default function FieldVisit() {
  const [v, setV] = useState<VisitDraft>(() => {
    try { return { ...EMPTY_DRAFT, ...JSON.parse(localStorage.getItem(DRAFT) || '{}') }; } catch { return EMPTY_DRAFT; }
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
  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(v)); } catch {} }, [v]);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // خدماتُه تُقرأ من جملته. لا قائمةَ من ١٨٨ مفهومًا يختار منها — هو يتكلّم،
  // ونحن نعرض ما فهمناه، وهو يشطب الخطأ. هذا عكسُ الاستمارة تمامًا.
  // المفاهيمُ تُقرأ من **جملة التاجر نفسِها** — لا من خانةٍ ثانيةٍ يملؤها
  //   الزائرُ بيده. وكان لها حقلٌ مستقلٌّ (`servicesRaw`) فصار الزائرُ يكتب
  //   الشيءَ مرّتَين: مرّةً كما قاله، ومرّةً «للنظام».
  const found = useMemo(() => resolveConcepts(v.said, 12), [v.said]);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const kind = v.kind || kindOfConcept(v.conceptId);
      // أجوبةُ الصنف تُرسَل بأسئلتها لا بمفاتيحها: مَن يقرؤها بعد سنةٍ يجب
      //   أن يفهمها بلا أن يفتح الكود.
      const asked = kind ? ASKS[kind] : [];
      const lines = asked
        .map(a => ({ a, val: v.answers[a.id] }))
        .filter(x => x.val !== undefined && x.val !== '' && !(Array.isArray(x.val) && !x.val.length))
        .map(x => `${x.a.q} ${Array.isArray(x.val) ? x.val.join(' · ') : x.val === true ? 'إيه' : x.val === false ? 'لا' : x.val}`);
      const hoursAsk = asked.find(a => a.kind === 'hours');
      const yesNo = asked.find(a => a.kind === 'yesno');
      const r = await providersAPI.fieldVisit({
        shop: {
          name: v.name.trim(), phone: v.phone.trim(), city: v.city.trim(),
          // ما قاله التاجرُ كما قاله — هو وصفُ المحلّ، ولا يُعاد صوغُه.
          bio: v.said.trim(),
        },
        servicesRaw: v.said,
        concepts: found.map((c, i) => ({ conceptId: c.id, isPrimary: i === 0 })),
        // السؤالُ الذهبيُّ: لغةُ الحرفة كما ينطقها الزبناء — أثمنُ ما في الزيارة.
        customerLines: v.golden,
        pricingAsks: lines,
        words: v.words.filter(w => w.term && w.conceptId),
        notes: kind ? `صنف: ${kind}` : '',
        profile: {
          kind: kind || undefined,
          hours: hoursAsk ? String(v.answers[hoursAsk.id] || '') || undefined : undefined,
          delivers: yesNo ? (v.answers[yesNo.id] as boolean | undefined) : undefined,
        },
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
        <button onClick={() => { setDone(null); setV(EMPTY_DRAFT); }}
          style={{ padding: '12px', borderRadius: 11, border: 'none', background: GREEN, color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
          زيارة أخرى
        </button>
      </div>
    );
  }

  // شرطُ الحفظ يعيش في `VisitFlow` وحدَه — قائمتان لشرطٍ واحدٍ تفترقان بلا صوت.
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

      {/* ── **التدفّقُ الجديد** — جملةٌ واحدةٌ ثمّ تأكيدات ──────────────
          الاستمارةُ القديمةُ كانت تسأل الزائرَ أن يترجم كلامَ التاجرِ إلى
          خاناتٍ **بينما التاجرُ ينتظر**. وصاحبُ المشروع قالها نصًّا: لا
          يمكن أن تأخذ نصفَ ساعةٍ من وقت رجلٍ يشتغل.
          وما بقي من الصفحة القديمة ثمينٌ ويبقى: المسوّدةُ المحفوظة ·
          الموقعُ · المدّةُ · حصّةُ التزكية · شاشةُ الرمز. ── */}
      <VisitFlow
        draft={v} onChange={setV} onSubmit={save} busy={busy} error={err}
      />
      <div style={{ fontSize: 11, color: INK3, textAlign: 'center' }}>
        المسوّدة كتّحفظ فهاد الجهاز — حتّى إلا طاحت الشبكة.
      </div>
    </div>
  );
}
