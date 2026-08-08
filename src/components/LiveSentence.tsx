import { useState, useRef, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { LiveSentence as LS, Slot } from '../lib/liveSentence';
import { fillsSlot } from '../lib/liveSentence';

// ============================================================
// **الجملةُ الحيّة** — كلامُ الإنسان نفسُه هو الواجهة.
//
//   لا نافذةَ تنبثق ولا صفحةَ تُفتَح: تُعاد إليه جملتُه ومعها **الشيءُ الذي
//   فُهم** قطعةً مُثبَتة، و**ما نقص** فراغًا في السطر:
//
//       بغيت نبدل الثمن ديال ⟨👗 Ensemble bébé · ١٨٩ درهم⟩ ل [ ___ ] درهم
//
//   ── لماذا لا يُسأل «أيّ منتوج؟» ──
//   لأنّ المنتوجَ **مرئيٌّ مملوءٌ أمامه**. والسؤالُ صار مكانًا لا جملة —
//   وهذا هو الفرقُ الذي يقتل «يعرف ثمّ يسأل» بنيويًّا لا بقاعدةٍ أخرى.
//
//   ── وحدُّها ──
//   لا تقرّر شيئًا. تعرض ما بنته `liveSentence.ts`، وتُعيد القيمةَ إلى
//   المُنادي ليمرّرها على **نفس** الحَكَم (`decideExecution`) ثمّ يحفظ.
//   فلو حُذف هذا الملفُّ بقي التطبيقُ يفهم ويقرّر كما هو.
// ============================================================

const C = {
  chip: 'rgba(10,143,111,.10)', chipBorder: 'rgba(10,143,111,.30)',
  slot: 'rgba(245,158,11,.10)', slotBorder: 'rgba(245,158,11,.45)',
};

export default function LiveSentence({ ls, busy, onFill }: {
  ls: LS;
  busy?: boolean;
  /** تُنادى بالقيمة بعد أن يملأ الإنسانُ الفراغَ ويؤكّد. */
  onFill: (slot: Slot, value: string) => void;
}) {
  const slot = ls.slots[0];
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  // الفراغُ يأخذ المؤشِّرَ من نفسه: من رأى فراغًا ينتظر ألّا يبحث عن مكانِ
  // الكتابة. وعلى الهاتف هذا يفتح لوحةَ المفاتيح فورًا — خطوةٌ أقلّ.
  useEffect(() => { ref.current?.focus(); }, []);

  const ok = !!fillsSlot(slot, v);
  const send = () => { const val = fillsSlot(slot, v); if (val) onFill(slot, val); };

  return (
    <div style={{
      maxWidth: 620, width: '100%', margin: '6px auto 0', padding: '14px 16px',
      borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface,rgba(255,255,255,.03))',
      fontSize: 15, lineHeight: 2.1, fontWeight: 700, color: 'var(--ink1)', direction: 'rtl',
    }}>
      {/* كلامُه كما كتبه — لا يُعاد صوغُه ولا يُترجَم. */}
      <span style={{ opacity: .72 }}>{ls.raw}</span>

      {/* ما فُهم: قطعةٌ مُثبَتةٌ تقول «هذا هو المقصود» بلا أن تسأل. */}
      {ls.subject && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 6px',
          padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap',
          background: C.chip, border: `1px solid ${C.chipBorder}`, fontSize: 13.5,
        }}>
          <span>{ls.subject.icon || '📦'}</span>
          <span>{ls.subject.name}</span>
          {ls.subject.note && <span style={{ opacity: .62, fontWeight: 600 }}>· {ls.subject.note}</span>}
        </span>
      )}

      {/* والفراغُ: سؤالٌ صار مكانًا. */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 4px' }}>
        <span style={{ opacity: .72 }}>ل</span>
        <input
          ref={ref}
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && ok && !busy) send(); }}
          placeholder={slot.ask}
          inputMode="decimal"
          aria-label={slot.ask}
          disabled={busy}
          style={{
            width: 108, padding: '6px 10px', borderRadius: 10, textAlign: 'center',
            background: C.slot, border: `1.5px solid ${C.slotBorder}`,
            color: 'var(--ink1)', fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
          }}
        />
        {slot.unit && <span style={{ opacity: .72 }}>{slot.unit}</span>}
        {/* الزرُّ لا يظهر إلّا حين تصلح القيمة — زرٌّ ميّتٌ يُربك أكثرَ ممّا يرشد. */}
        {ok && (
          <button
            onClick={send}
            disabled={busy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginInlineStart: 4,
              padding: '6px 12px', borderRadius: 10, border: 'none', cursor: busy ? 'wait' : 'pointer',
              background: 'var(--mint,#12A150)', color: '#fff', fontSize: 13.5, fontWeight: 800,
              fontFamily: 'inherit',
            }}
          >
            {busy ? <Loader2 size={14} className="amz-spin" /> : <Check size={14} />}
            حفظ
          </button>
        )}
      </span>
    </div>
  );
}
