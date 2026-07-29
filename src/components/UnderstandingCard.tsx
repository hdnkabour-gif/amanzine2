import { useMemo, useState } from 'react';
import { Brain, ChevronDown, ArrowLeft, Zap } from 'lucide-react';
import { understand, type Understanding } from '../lib/akg/kb';

// ============================================================
// UnderstandingCard — «🧠 فهمنا طلبك». تُظهر ذكاء AMANZINE المخفيّ: بمجرّد
//   أن يكتب المستخدم مشكلته بالدارجة، تعرض ما فهمه العقل (مشكلة/مهنة/موقع/
//   استعجال) + زرّ يقود للحلّ + «لماذا؟» من خطوات الاستدلال.
//   تستهلك understand() فقط (نقطة دخول واحدة، لحظيّة، بلا شبكة). لا تعرض
//   نسبة الثقة للمستخدم — تستعملها لاختيار الصياغة.
// ============================================================

const GREEN = 'var(--amz-emerald,#0a8f6f)';
const GOLD = 'var(--amz-gold,#D4A017)';
const INK1 = 'var(--ink1)';
const INK3 = 'var(--ink3)';

// `mirror`: بعد أن يفهم النظام ويقرّر وجهةً، تبقى البطاقة ظاهرةً كمرآة — بلا
// زرّ فعلٍ (بطاقة الوجهة تملك الفعل) ومعها «صحّح». كانت تُعرَض عند `!result`
// فقط، أي تختفي في اللحظة التي يقرّر فيها المستخدم — وهي اللحظة التي يحتاج
// فيها أن يرى ما فُهم عنه.
export default function UnderstandingCard({ query, onAct, mirror, onCorrect }: {
  query: string; onAct: () => void; mirror?: boolean; onCorrect?: () => void;
}) {
  const u = useMemo<Understanding | null>(() => {
    const q = (query || '').trim();
    return q.length >= 3 ? understand(q) : null;
  }, [query]);
  const [showWhy, setShowWhy] = useState(false);

  if (!u || (!u.problem && !u.profession)) return null;

  const strong = u.confidence >= 0.8;
  const prof = u.profession?.label;
  const headline = prof
    ? (strong ? `فهمنا أنك تبحث عن ${prof}` : `غالبًا تحتاج ${prof}`)
    : 'فهمنا طلبك';

  const Row = ({ label, value, tone }: { label: string; value?: string; tone?: boolean }) =>
    value ? (
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13.5 }}>
        <span style={{ color: INK3, minWidth: 62, fontWeight: 700 }}>{label}</span>
        <span style={{ color: tone ? GREEN : INK1, fontWeight: tone ? 800 : 650 }}>{value}</span>
      </div>
    ) : null;

  return (
    <div style={{ maxWidth: 620, width: '100%', margin: '0 auto',
      background: `color-mix(in srgb, ${GREEN} 7%, var(--panel,rgba(255,255,255,.03)))`,
      border: `1.5px solid ${GREEN}`, borderRadius: 16, padding: 15,
      display: 'flex', flexDirection: 'column', gap: 11, animation: 'amzUCin .25s ease-out' }}>
      <style>{`@keyframes amzUCin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* رأس ديناميكيّ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, background: `color-mix(in srgb, ${GREEN} 16%, transparent)` }}><Brain size={17} /></span>
        <span style={{ fontSize: 14.5, fontWeight: 900, color: INK1 }}>{headline}</span>
        {u.context.urgent && (
          <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: 'var(--red,#F5484A)', background: 'color-mix(in srgb, var(--red,#F5484A) 14%, transparent)', padding: '3px 9px', borderRadius: 99 }}><Zap size={12} /> مستعجل</span>
        )}
      </div>

      {/* ما فهمه العقل */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingInlineStart: 38 }}>
        <Row label="المشكلة" value={u.problem?.name} />
        <Row label="المختصّ" value={prof} tone />
        <Row label="المدينة" value={u.city} />
      </div>

      {/* زرّ الإجراء — البطاقة بداية التدفّق لا مجرّد عرض.
          في وضع المرآة لا فعلَ هنا (بطاقة الوجهة تملكه)، بل تصحيحٌ فقط. */}
      {mirror ? (
        <button onClick={onCorrect} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 99, border: `1px solid ${INK3}`, background: 'transparent', color: INK3, fontSize: 12.5, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer' }}>
          ✏️ ماشي هاكّا — صحّح
        </button>
      ) : (
        <button onClick={onAct} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, border: 'none', background: GOLD, color: '#1a1300', fontSize: 14.5, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>
          {prof ? `لقّى ليا ${prof} قريب` : 'كمّل'} <ArrowLeft size={17} />
        </button>
      )}

      {/* «لماذا؟» — شفافية الاستدلال (Explain-AI) من reasoning[] */}
      {u.reasoning.length > 0 && (
        <div>
          <button onClick={() => setShowWhy(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: INK3, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
            <ChevronDown size={13} style={{ transform: showWhy ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /> لماذا فهمنا هذا؟
          </button>
          {showWhy && (
            <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 4, paddingInlineStart: 18 }}>
              {u.reasoning.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: INK3, lineHeight: 1.5 }}>{r}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
