// ============================================================
// UniversalRenderer — العارض. يأخذ UIStep من العقل ويرسمه عبر ViewModel +
//   Component Registry: لا switch على الـ widget إطلاقًا — كلّ حقل يُحوَّل إلى
//   (component + props) ثمّ يرسمه ComponentFactory بالبحث في السجلّ.
//   لو بدّلنا React، نعيد كتابة الـ registry وحده، والعقل كما هو.
// ============================================================

import { toFieldView, type UIStep, type UIField, type UIAssumption } from '../lib/akg';
import ComponentFactory from './componentRegistry';

const INK1 = 'var(--ink1)';
const INK3 = 'var(--ink3)';

interface Props {
  step: UIStep;
  values: Record<string, any>;
  gold?: string;
  green?: string;
  onChange: (key: string, value: any) => void;
  onAction: (id: string) => void;
  onCorrect?: (key: string) => void;
  gate?: React.ReactNode;
}

// خانة حقل واحدة: ViewModel → ComponentFactory (بلا معرفة بالنوع).
function FieldSlot({ field, values, onChange, accent, green, big }: {
  field: UIField; values: Record<string, any>; onChange: (k: string, v: any) => void; accent: string; green: string; big?: boolean;
}) {
  const fv = toFieldView(field);
  return (
    <ComponentFactory
      component={fv.component}
      value={values[field.key]}
      onChange={v => onChange(field.key, v)}
      props={fv.props}
      big={big}
      accent={accent}
      green={green}
    />
  );
}

function Assumptions({ list, values, gold, green, onCorrect }: {
  list: UIAssumption[]; values: Record<string, any>; gold: string; green: string; onCorrect?: (k: string) => void;
}) {
  if (list.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 12, background: `color-mix(in srgb, ${green} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${green} 30%, transparent)` }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: green }}>🔮 فكّرنا قبل ما نسولوك — افترضنا:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {list.map(a => {
          const high = a.confidence === 'high';
          return (
            <button key={a.key} type="button" onClick={() => onCorrect?.(a.key)}
              // **لماذا؟** بلا السبب يبقى القرارُ صندوقًا أسودَ: نعرض «الموسم:
              // شتاء» ولا نقول لماذا، فلا يثق التاجرُ ولا يعرف ما يصحّح.
              title={a.because ? `لأنّك قلت «${a.because}» — اضغط لتصحيحه` : 'اضغط لتصحيحه'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, border: `1px solid ${high ? green : gold}`, background: 'transparent', color: high ? green : gold, fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              {a.label}: {String(values[a.key] ?? a.value)} {high ? '✓' : '~'}
              {a.because && <span style={{ opacity: .65, fontWeight: 600 }}>· «{a.because}»</span>}
            </button>
          );
        })}
      </div>
      {/* كان الرمزُ يحمل المعنى كلَّه بحجم ١٠٫٥px: `✓` مقابل `~`. الكلمةُ
          أوضحُ من الرمز، والتصحيحُ يُقال صراحةً لا يُلمَّح إليه. */}
      <div style={{ fontSize: 11, color: INK3, lineHeight: 1.6 }}>
        <b style={{ color: green }}>✓ متأكّدون</b> · <b style={{ color: gold }}>~ خمّنّا</b> — اضغط أيَّ وحدة باش تبدّلها
      </div>
    </div>
  );
}

export default function UniversalRenderer({ step, values, gold = 'var(--amz-gold,#D4A017)', green = 'var(--amz-emerald,#0a8f6f)', onChange, onAction, onCorrect, gate }: Props) {
  const accent = step.theme?.accent || gold;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* مزاج المجال (Theme-aware) */}
      {step.theme && (
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 99, background: step.theme.soft, border: `1px solid ${accent}`, color: accent, fontSize: 11.5, fontWeight: 800 }}>
          <span>{step.theme.icon}</span> {step.theme.mood}
        </div>
      )}

      <Assumptions list={step.assumptions} values={values} gold={gold} green={green} onCorrect={onCorrect} />

      {/* ما ينقص — بالاسم لا بالنسبة.
          «اكتمل ٠٪» رقمٌ صحيحٌ حسابيًّا وعديمُ المعنى: لا يقول للتاجر ما
          العمل. والمخطّطُ يعرف الأسماءَ أصلًا وكان يختزلها إلى نسبة. */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
          <span style={{ color: step.progress >= 80 ? green : accent }}>
            {step.missing.length === 0
              ? 'كلشي واجد ✓'
              : `ينقصك: ${step.missing.slice(0, 3).join(' · ')}${step.missing.length > 3 ? ` +${step.missing.length - 3}` : ''}`}
          </span>
          <span style={{ color: INK3, whiteSpace: 'nowrap' }}>{step.progress}٪</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--panel2,#132040)', overflow: 'hidden' }}>
          <div style={{ width: `${step.progress}%`, height: '100%', background: `linear-gradient(90deg, ${green}, ${accent})`, transition: 'width .4s ease' }} />
        </div>
      </div>

      {/* وضع السؤال: حقل واحد */}
      {step.mode === 'question' && step.field && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: INK1 }}>{step.headline}{step.field.required && <span style={{ color: accent }}> *</span>}</div>
          {step.hint && <div style={{ fontSize: 12, color: INK3, marginTop: -4 }}>💡 {step.hint}</div>}
          <FieldSlot field={step.field} values={values} onChange={onChange} accent={accent} green={green} big />
          <div style={{ display: 'flex', gap: 9, marginTop: 2 }}>
            {step.actions.map(a => (
              <button key={a.id} onClick={() => onAction(a.id)}
                style={{ marginInlineStart: a.kind === 'secondary' ? 'auto' : undefined, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: gold, fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>{a.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* وضع الجاهزيّة: تنفيذ */}
      {step.mode === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center', padding: '6px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: INK1 }}>{step.headline}</div>
          {gate}
          {step.actions.map(a => (
            <button key={a.id} onClick={() => onAction(a.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: a.kind === 'primary' ? '13px 22px' : '9px 16px', borderRadius: 13, border: a.kind === 'primary' ? 'none' : `1px solid ${gold}`, background: a.kind === 'primary' ? gold : 'transparent', color: a.kind === 'primary' ? '#1a1300' : gold, fontSize: 15, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// عارض النموذج الكامل (وضع «عرض الكل») — نفس ComponentFactory، بلا منطق.
export function FullFormRenderer({ fields, values, gold = 'var(--amz-gold,#D4A017)', green = 'var(--amz-emerald,#0a8f6f)', onChange }: {
  fields: (UIField & { label: string })[]; values: Record<string, any>; gold?: string; green?: string; onChange: (k: string, v: any) => void;
}) {
  return (
    <>
      {fields.map(f => (
        <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11.5, color: INK3, fontWeight: 700 }}>{f.label}{f.required && <span style={{ color: gold }}> *</span>}</span>
          <FieldSlot field={f} values={values} onChange={onChange} accent={gold} green={green} />
        </label>
      ))}
    </>
  );
}
