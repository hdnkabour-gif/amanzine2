import { useEffect, useState } from 'react';
import { ABILITIES } from '../lib/abilities';
import { CONCEPTS } from '../lib/akg/kb/concepts';
import type { Ground } from '../lib/evidence';

// ============================================================
// **المرآة — التطبيقُ لا يصف نفسَه، يُري ما فعله.**
//
//   ── العطبُ الذي وُلدت منه، مقيسًا ──
//   أوّلُ ثلاثةِ أسئلةٍ يسألها أيُّ مغربيٍّ يفتح تطبيقًا:
//
//       «شكون نتا ولا نتي»  ⇒  اليومَ: «شنو محتاج بالضبط؟»
//       «شنو هو أمانزين»    ⇒  اليومَ: «شنو محتاج بالضبط؟»
//       «فاش غادي تعاوني»   ⇒  اليومَ: «شنو محتاج بالضبط؟»
//
//   ثلاثةٌ من ثلاثة. فأوّلُ ثلاثِ لحظاتٍ في حياة المستخدم الجديد **كلُّها
//   إخفاق**، والسببُ أنّ `find_pro` مصرفٌ يبتلع كلَّ ما لا يُفهَم.
//
//   ── والفكرةُ: الجوابُ أرقامٌ لا شعارات ──
//   «منصّةٌ ذكيّةٌ تربط المغاربة بمزوّدي الخدمات» جملةٌ **لا يمكن تكذيبُها**،
//   ولذلك لا يصدّقها أحد. أمّا «١٢ حرفيّ · ٣ مدن · ٢٠٨ خدمة كنفهمها» فرقمٌ
//   **يُكذَّب إن كان كاذبًا** — ومَن قال رقمًا يمكن فحصُه يُصدَّق.
//
//   ── وشرطُ صاحب المشروع، حرفيًّا ──
//   «لا أريد الكذب أريد الحقيقة… أعرف أنّ عدّة أشياء ستكون فارغة بسبب عدم
//   وجود مزوّدين ومستخدمين، لكن لا أريد أن أعرض شيئًا لا يجعل المستخدمين
//   يعرفون بأنّ الفكرة قويّة لكن ليست كاملة ١٠٠٪».
//
//   فالصفرُ **يُقال صفرًا** — ويُقال معه ما هو حقيقيٌّ الآن: أنّ الفهمَ مبنيٌّ
//   والشبكةَ لم تُبنَ بعد. وشتّان بين «شاشةٍ خاويةٍ» و«**عددٍ يساوي صفرًا
//   مكتوبًا بثقة**»: الأولى تبدو عطبًا، والثانية تبدو بدايةً معلنة.
// ============================================================

interface Stats {
  merchants: number; products: number; services: number;
  orders: number; listings: number;
  cities: { city: string; count: number }[];
}

export default function Mirror({ ground, understood, onPick, onWrong }: {
  ground: Ground;
  /** ما فُهم من كلامه السابق — تُعرَض حين يقول «مافهمتش». */
  understood?: { label: string; value: string }[];
  /** لمس قدرةً: يُكتَب نصُّها في الخانة فتبدأ بلا انتقال. */
  onPick?: (say: string) => void;
  /** «كلشي غالط» — يفتح بابَ التصحيح. */
  onWrong?: () => void;
}) {
  const [s, setS] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ground !== 'about_self') return;
    // المسارُ **عامٌّ ومبنيٌّ منذ زمنٍ ولا يقرؤه أحد** — نمطُ «طبقةٌ بُنيت ولم
    //   تُنادَ» الذي يتكرّر في هذا المستودع. وهنا مكانُه الصحيح.
    fetch('/api/listings/public/stats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setS).catch(() => setFailed(true));
  }, [ground]);

  if (ground === 'stuck') return <Stuck understood={understood} onWrong={onWrong} />;
  if (ground !== 'about_self') return null;

  // **القدراتُ تُقرأ من `abilities.ts` لا تُكتَب هنا.** قائمةٌ ثانيةٌ تفترق عن
  //   الأولى بلا صوت — نمطُ عطبٍ يتكرّر هنا. وما لا بابَ له (`page === null`)
  //   لا يُعرَض: وعدٌ بلا باب أسوأُ من صمت.
  const doable = ABILITIES.filter(a => a.page && !a.auth).slice(0, 6);

  return (
    <div style={box}>
      <div style={{ fontSize: 19, fontWeight: 900, color: K.ink, marginBottom: 5 }}>أنا AMANZINE.</div>
      <div style={{ fontSize: 14, color: K.ink2, fontWeight: 650, lineHeight: 1.95 }}>
        ماشي محرّك بحث وماشي سوق. كنفهم اللي محتاجو بالدارجة كما كتقولو،
        ونمشي بيك نيشان للّي كيقدر يديرو.
      </div>

      {/* ── ما هو واقعٌ الآن — أرقامٌ لا شعارات ─────────────────── */}
      <div style={{ marginTop: 14, paddingTop: 13, borderTop: `1px solid ${K.line}` }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: K.ink3, marginBottom: 9 }}>
          هادشي اللي واقع دابا بالضبط:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {/* **رقمٌ صادقٌ دائمًا**: الفهمُ مبنيٌّ ولا يحتاج مستخدمًا واحدًا.
              وهو الجوابُ على «الفكرة قويّة والشبكةُ مازال» — يُقاس ولا يُدَّعى. */}
          <Num n={(CONCEPTS as any[]).length} what="خدمة كنفهمها" tone="green" />
          {s && <Num n={s.merchants} what="واحد مسجّل" />}
          {s && <Num n={s.products} what="حاجة معروضة" />}
          {s && <Num n={s.cities.length} what="مدينة فيها شي حاجة" />}
        </div>

        {/* **والصفرُ يُقال صفرًا.** شاشةٌ خاويةٌ تبدو عطبًا؛ صفرٌ مكتوبٌ بثقةٍ
            ومعه سببُه يبدو بدايةً معلنة. وهذا هو الفرقُ كلُّه. */}
        {s && s.merchants === 0 && (
          <div style={note}>
            مازال حتّى واحد ما تسجّل. <b>وهادي الحقيقة، ماشي عطب.</b> الفهم اللي كتشوف
            دابا مبنيّ وكيخدم — الشبكة ديال الناس هي اللي مازال كنبنيوها. كون نتا اللّول.
          </div>
        )}
        {s && s.merchants > 0 && s.products === 0 && (
          <div style={note}>
            كاين ناس مسجّلين ولكن مازال ما عرضو والو. كنقولها ليك كما هي.
          </div>
        )}
        {failed && (
          <div style={note}>
            ما قدرناش نجيبو الأرقام دابا (الشبكة). <b>ماغاديش نخترع ليك أرقام.</b>
          </div>
        )}
      </div>

      {/* ── وما يقدر يديرو الآن — من `abilities.ts` مباشرةً ──────── */}
      <div style={{ marginTop: 14, paddingTop: 13, borderTop: `1px solid ${K.line}` }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: K.ink3, marginBottom: 9 }}>
          واش تقدر دير معايا دابا — قيّس على وحدة وغادي نبداو:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {doable.map(a => (
            <button key={a.id} onClick={() => onPick?.(a.say)} style={chipBtn}>{a.say}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * **«مافهمتش» — الجوابُ أن نُري ما فهمنا، لا أن نشرح أكثر.**
 *
 *   من قال «ما فهمتش» فزدتَه شرحًا زدتَ الطينَ بلّة: هو لا ينقصه كلام، ينقصه
 *   أن يعرف **أين انفصل الفهمُ عن قصده**. فيُعاد عرضُ ما قُرئ من كلامه،
 *   ويُلمَس الخطأُ بيده. وطبقةُ `correction` مبنيّةٌ لهذا وشبهُ مهجورة.
 */
function Stuck({ understood, onWrong }: {
  understood?: { label: string; value: string }[];
  onWrong?: () => void;
}) {
  const has = (understood || []).length > 0;
  return (
    <div style={box}>
      <div style={{ fontSize: 16, fontWeight: 900, color: K.ink }}>واخّا — نرجعو للوراء.</div>
      {has ? (
        <>
          <div style={{ fontSize: 13.5, color: K.ink2, fontWeight: 650, margin: '7px 0 11px' }}>
            هاك اللي فهمت من الكلام ديالك. شنو اللي ماشي مزيان فيه؟
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {understood!.map((x, i) => (
              <span key={i} style={{ ...chipBtn, cursor: 'default' }}>
                <b style={{ color: K.ink3, fontWeight: 700 }}>{x.label}:</b>&nbsp;{x.value}
              </span>
            ))}
          </div>
        </>
      ) : (
        // **ولا نخترع فهمًا لم يقع.** إن لم يسبق كلامٌ فلا شيءَ يُعرَض،
        //   ويُقال ذلك بدل عرضِ قطعٍ فارغة.
        <div style={{ fontSize: 13.5, color: K.ink2, fontWeight: 650, margin: '7px 0 0' }}>
          مازال ما قلتي ليا حتّى حاجة نقدر نرجع ليها. قول ليا بجملة وحدة شنو باغي —
          بكلامك نتا، ماشي بكلام رسميّ.
        </div>
      )}
      {has && onWrong && (
        <button onClick={onWrong} style={{ ...chipBtn, marginTop: 11, color: K.amber, borderColor: `${K.amber}55` }}>
          كلشي غالط — نعاود من اللّول
        </button>
      )}
    </div>
  );
}

function Num({ n, what, tone }: { n: number; what: string; tone?: 'green' }) {
  const c = tone === 'green' ? K.green : K.ink;
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 6, padding: '9px 13px', borderRadius: 12,
      background: 'rgba(255,255,255,.04)', border: `1px solid ${K.line}`,
    }}>
      <b style={{ fontSize: 20, fontWeight: 900, color: c, letterSpacing: -0.5 }}>{n}</b>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: K.ink3 }}>{what}</span>
    </div>
  );
}

const K = {
  ink: 'var(--ink1,#F0F4FF)', ink2: 'var(--ink2,#8B96A8)', ink3: 'var(--ink2,#8B96A8)',
  line: 'var(--border2,rgba(255,255,255,.10))', panel: 'var(--panel,#0F1A32)',
  green: 'var(--mint,#00D2B3)', amber: 'var(--gold,#F6C453)',
};
const box: React.CSSProperties = {
  maxWidth: 620, margin: '10px auto 0', padding: '16px 18px', borderRadius: 17,
  background: K.panel, border: `1px solid ${K.line}`, direction: 'rtl',
  boxShadow: 'var(--depth-sm,0 2px 8px rgba(0,0,0,.5))',
};
const note: React.CSSProperties = {
  marginTop: 10, padding: '10px 13px', borderRadius: 11,
  background: 'var(--gold-soft,rgba(246,196,83,.07))',
  border: '1px solid var(--border-gold,rgba(246,196,83,.22))',
  fontSize: 12.5, fontWeight: 650, color: 'var(--gold,#F6C453)', lineHeight: 1.9,
};
const chipBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '8px 14px', borderRadius: 99,
  background: 'rgba(255,255,255,.05)', border: `1px solid ${K.line}`, color: K.ink,
  fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
};
