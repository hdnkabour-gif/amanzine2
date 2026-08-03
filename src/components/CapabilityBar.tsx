// ============================================================
// CapabilityBar — شريط القدرات القابل لإعادة الاستعمال. أيّ صفحة تعرض
//   قدراتها (Services) من الـ AKG لا من كود مكرّر: زرّ لكلّ قدرة، مُفعّل إن
//   استوفت مدخلاتها، ومُعطّل مع سبب واضح («يحتاج: صور») إن نقص شيء.
//   الاستعمال: <CapabilityBar page="products" values={form} handlers={{...}} />
//
//   **قاعدةٌ في التصميم:** لا يُعرَض زرٌّ لا مُشغِّلَ له. كان `onRun` اختياريًّا،
//   فمن يُركّب المكوّنَ بلا معالجاتٍ يملأ صفحتَه أزرارًا لا تفعل شيئًا — وهو
//   عينُ العطب الذي يُفترض بهذا المكوّن أن يمنعه. المعالجاتُ الآن هي القائمة:
//   تُعرَض القدرةُ إن وُجد لها معالج، ولا تُعرَض إن لم يوجد.
// ============================================================

import { capabilitiesForPage, getPageCapability, type CapabilityState } from '../lib/akg';
import type { Page } from '../types';

const BORDER = '1px solid var(--line,rgba(255,255,255,.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const EMBER = 'var(--ember,#FF6A00)';
const EMBER_SOFT = 'var(--ember-soft,rgba(255,106,0,.12))';

interface Props {
  page: Page;
  values?: Record<string, unknown>;
  /** مُعرِّفُ القدرة → ما يُنفَّذ. ما ليس هنا لا يُعرَض. */
  handlers: Record<string, () => void>;
  title?: string;
}

export default function CapabilityBar({ page, values = {}, handlers, title = 'قدرات هذه الصفحة' }: Props) {
  const states = capabilitiesForPage(page, values).filter(s => !!handlers[s.service.id]);
  if (states.length === 0) return null;

  // خريطة مفتاح الحقل → عنوانه بالعربية (لسبب الانتظار).
  const fieldLabel = new Map<string, string>(
    (getPageCapability(page)?.fields ?? []).map(f => [f.key, f.label]),
  );
  const missLabel = (keys: string[]) => keys.map(k => fieldLabel.get(k) || k).join('، ');

  const ready = states.filter(s => s.available).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: INK1 }}>{title}</span>
        <span style={{ fontSize: 11, color: INK3 }}>{ready}/{states.length} جاهزة</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {states.map((s: CapabilityState) => {
          const disabled = !s.available;
          return (
            <button
              key={s.service.id}
              type="button"
              disabled={disabled}
              onClick={() => { if (!disabled) handlers[s.service.id](); }}
              title={disabled ? `يحتاج: ${missLabel(s.missing)}` : s.service.outcome}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                padding: '9px 12px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
                border: disabled ? BORDER : `1px solid ${EMBER}`,
                background: disabled ? 'transparent' : EMBER_SOFT,
                color: disabled ? INK3 : INK1, opacity: disabled ? 0.6 : 1,
                textAlign: 'right', minWidth: 0,
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 800, color: disabled ? INK3 : EMBER }}>{s.service.label}</span>
              <span style={{ fontSize: 10.5, color: INK3, lineHeight: 1.3 }}>
                {disabled ? `يحتاج: ${missLabel(s.missing)}` : s.service.outcome}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
