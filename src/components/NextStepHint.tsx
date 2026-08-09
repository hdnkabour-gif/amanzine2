import { useEffect, useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { useStore } from '../store';
import { getInteractions } from '../lib/experienceLog';
import type { Page } from '../types';

// ============================================================
// الخطوة التالية — اكتشافُ الميزات **سياقيًّا** لا يوميًّا.
//
//   المشكلة الحقيقيّة: ٢٥ صفحة وقائمةٌ جانبيّةٌ بـ٢٤ عنصرًا ⇒ ميزاتٌ مكتملةٌ
//   لا يعرفها أحد. الحلّ ليس نافذةً يوميّةً (= نفس «انفجار المعلومات» الذي
//   نحاربه)، بل تلميحًا واحدًا يرتبط بما فعله المستخدم **للتوّ**.
//
//   ثلاث قواعدٍ صارمة:
//   ① لا نقترح إلّا ميزةً **مُتحقَّقًا أنّها تعمل** (القائمة البيضاء أدناه).
//      استُبعدت عمدًا: الدفع الإلكترونيّ · شحن المحفظة · التوصيل التلقائيّ —
//      ثلاثتها بلا مسارٍ فعّالٍ من الواجهة، والوعد بها يكسر الثقة.
//   ② حدٌّ أقصى ٣ تلميحاتٍ للمستخدم مدى الحياة، ثمّ صمتٌ تامّ.
//   ③ يُغلَق فلا يعود أبدًا (لا إلحاح).
// ============================================================

const SEEN_KEY = 'amanzine_hints_seen';
const MAX_HINTS = 3;

interface Hint {
  id: string;
  text: string;
  cta: string;
  page: Page;
  /** يظهر فقط إن تحقّق الشرط — لا تلميح بلا سياق. */
  when: (ctx: { interactions: number; hasBusiness: boolean }) => boolean;
}

// القائمة البيضاء: ميزاتٌ فحصتُ أنّها موصولةٌ من الواجهة إلى الخادم.
const HINTS: Hint[] = [
  {
    id: 'vision',
    text: 'صعيب توصف المشكل؟ صوّرو 📷 — أمانزين كيفهم التصويرة.',
    cta: 'جرّب', page: 'assistant',
    when: ({ interactions }) => interactions >= 1,
  },
  {
    id: 'assistant',
    text: 'كتب حاجتك بالدارجة ولا بالحروف — المساعد كيفهمك ويوجّهك.',
    cta: 'افتح المساعد', page: 'assistant',
    when: ({ interactions }) => interactions === 0,
  },
  {
    id: 'bookings',
    text: 'عندك خدمات؟ الزبناء يقدرو يحجزو معك موعد.',
    cta: 'شوف الحجوزات', page: 'bookings',
    when: ({ hasBusiness }) => hasBusiness,
  },
];

function seen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}
function markSeen(id: string) {
  try {
    const s = seen();
    if (!s.includes(id)) localStorage.setItem(SEEN_KEY, JSON.stringify([...s, id]));
  } catch { /* noop */ }
}

export default function NextStepHint() {
  const { setPage, products } = useStore();
  const [hint, setHint] = useState<Hint | null>(null);

  useEffect(() => {
    const already = seen();
    if (already.length >= MAX_HINTS) return;          // ② الحدّ الأقصى
    let interactions = 0;
    try { interactions = getInteractions().length; } catch { /* noop */ }
    const ctx = { interactions, hasBusiness: (products?.length || 0) > 0 };
    const next = HINTS.find(h => !already.includes(h.id) && h.when(ctx));
    if (next) {
      // تأخيرٌ قصير: لا نقاطع أوّل ثانيةٍ للمستخدم.
      const t = setTimeout(() => setHint(next), 2500);
      return () => clearTimeout(t);
    }
  }, [products]);

  if (!hint) return null;

  const close = () => { markSeen(hint.id); setHint(null); };   // ③ لا يعود

  return (
    // ── **التلميحُ يحجز مكانَه، ولا يطفو فوق فعلٍ** ─────────────────
    //
    //   كان `position:fixed · bottom:76 · zIndex:40`، فيحتلّ الشريطَ
    //   ٦٨٤→٧٦٨ من الشاشة **فوق ما ترسمه الصفحة هناك**. وحجزُ `main`
    //   ثمانون بكسلًا يحمي ٧٦٤→٨٤٤ وحدَها — أي أنّ ثمانين بكسلًا من
    //   منطقةِ المحتوى كانت مغطّاةً على كلّ صفحةٍ لكلّ من دخل.
    //
    //   وقيس أثرُه: «❌ لا، نبدّل» عند ٧٠٨→٧٤٨، و`elementFromPoint` في
    //   وسطه تُرجع زرَّ «افتح المساعد». **فمن يرفض التأكيدَ يفتح المساعد.**
    //   وزيادةُ `paddingBottom` لا تُصلحه — قيست: المحتوى مرساةٌ من الأعلى،
    //   فالحشوُ يُضاف بعده ولا يرفعه.
    //
    //   فيعود إلى مجرى الصفحة: لا يغطّي شيئًا أبدًا، ولا يحتاج أحدٌ أن
    //   يتذكّر حجزَ مكانه في كلّ صفحةٍ تُضاف. ونصيحةٌ تحجب زرًّا ليست نصيحة.
    <div role="status" style={{
      maxWidth: 460, marginInline: 'auto', marginBlock: '0 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 14,
      background: 'color-mix(in srgb, #0a8f6f 14%, var(--void,#0B0D12))',
      border: '1px solid color-mix(in srgb, #0a8f6f 40%, transparent)',
      boxShadow: '0 12px 34px rgba(0,0,0,.38)', backdropFilter: 'blur(10px)',
      animation: 'hintIn .45s cubic-bezier(.16,1,.3,1) both',
    }}>
      <style>{`@keyframes hintIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Lightbulb size={15} style={{ color: '#D4A017', flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink1,#FAFAFA)', fontWeight: 650, lineHeight: 1.6 }}>
        {hint.text}
      </span>
      <button onClick={() => { markSeen(hint.id); setHint(null); setPage(hint.page); }}
        style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 9, border: 'none', background: '#0a8f6f', color: '#fff', fontSize: 12, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
        {hint.cta}
      </button>
      <button onClick={close} aria-label="إغلاق"
        style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--ink3,#7E877F)', cursor: 'pointer', display: 'flex', padding: 2 }}>
        <X size={14} />
      </button>
    </div>
  );
}
