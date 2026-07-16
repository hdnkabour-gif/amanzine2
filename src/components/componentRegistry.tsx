// ============================================================
// Component Registry + ComponentFactory — رابع السجلّات (Schema/Capability/
//   Relation/Component). كلّ مكوّن حقل مُسجَّل باسمه، والـ Factory يبحث عنه
//   ويرسمه — بلا switch حتّى على مستوى الـ widgets. ViewModel يعطي اسمًا،
//   والـ Factory يرسم. لاستبدال مكتبة الواجهة: نغيّر هذا الملفّ وحده.
// ============================================================

const BORDER = 'var(--border2,rgba(255,255,255,.14))';
const INK1 = 'var(--ink1)';
const INK3 = 'var(--ink3)';

export interface FieldComponentProps {
  value: any;
  onChange: (v: any) => void;
  props: Record<string, any>;   // choices/placeholder/currency/required…
  big?: boolean;
  accent: string;
  green: string;
}

type FieldComponent = (p: FieldComponentProps) => React.ReactElement;

// ── المكوّنات ──────────────────────────────────────────────
const TextInput: FieldComponent = ({ value, onChange, props, big, mode }: any) => (
  <input value={value || ''} onChange={e => onChange(e.target.value)} inputMode={mode} autoFocus={big}
    placeholder={props.placeholder || ''} style={{ width: '100%', padding: big ? '13px 14px' : '10px 12px', borderRadius: 11, border: `1px solid ${BORDER}`, background: 'var(--panel,rgba(0,0,0,.15))', color: INK1, fontSize: big ? 16 : 14, fontWeight: 700, fontFamily: 'inherit', direction: 'rtl' }} />
);
const NumericInput: FieldComponent = (p) => <TextInput {...p} {...{ mode: 'numeric' } as any} />;

const MoneyInput: FieldComponent = ({ value, onChange, props, big }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <input value={value || ''} onChange={e => onChange(e.target.value)} inputMode="numeric" autoFocus={big}
      placeholder={props.placeholder || 'بشحال؟'} style={{ flex: 1, padding: big ? '13px 14px' : '10px 12px', borderRadius: 11, border: `1px solid ${BORDER}`, background: 'var(--panel,rgba(0,0,0,.15))', color: INK1, fontSize: big ? 16 : 14, fontWeight: 700, fontFamily: 'inherit', direction: 'rtl' }} />
    <span style={{ fontSize: 12.5, fontWeight: 800, color: INK3 }}>{props.currency || 'MAD'}</span>
  </div>
);

const ChoiceCards: FieldComponent = ({ value, onChange, props, big, accent }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
    {((props.choices as string[]) || []).map(op => (
      <button key={op} type="button" onClick={() => onChange(op)}
        style={{ padding: big ? '10px 16px' : '7px 12px', borderRadius: 11, border: `1px solid ${value === op ? accent : BORDER}`, background: value === op ? `color-mix(in srgb, ${accent} 18%, transparent)` : 'transparent', color: value === op ? accent : 'var(--ink2)', fontSize: big ? 14 : 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{op}</button>
    ))}
  </div>
);

const ToggleField: FieldComponent = ({ value, onChange, big, green }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {[['نعم', true], ['لا', false]].map(([lbl, val]) => (
      <button key={String(val)} type="button" onClick={() => onChange(val)}
        style={{ padding: big ? '10px 20px' : '7px 14px', borderRadius: 11, border: `1px solid ${value === val ? green : BORDER}`, background: value === val ? `color-mix(in srgb, ${green} 18%, transparent)` : 'transparent', color: value === val ? green : INK3, fontSize: big ? 14 : 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>{lbl as string}</button>
    ))}
  </div>
);

const MediaPicker = (label: string): FieldComponent => ({ value, onChange, big, green }) => (
  <button type="button" onClick={() => onChange(value ? undefined : 'أضيفت')}
    style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: big ? '11px 18px' : '9px 14px', borderRadius: 11, border: `1px dashed ${value ? green : BORDER}`, background: 'transparent', color: value ? green : INK3, fontSize: big ? 14 : 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
    {value ? `${label} ✓` : `＋ أضف ${label}`}
  </button>
);

// ── السجلّ ──────────────────────────────────────────────────
const registry: Record<string, FieldComponent> = {
  TextInput,
  NumberInput: NumericInput,
  PhoneInput: NumericInput,
  LocationInput: TextInput,
  MoneyInput,
  ChoiceCards,
  ToggleField,
  GalleryPicker: MediaPicker('صورًا'),
  VideoPicker: MediaPicker('فيديو'),
};

export function registerComponent(name: string, comp: FieldComponent): void {
  registry[name] = comp;
}

// المصنع: بحث في السجلّ ثمّ رسم — بلا switch.
export default function ComponentFactory({ component, ...rest }: { component: string } & FieldComponentProps) {
  const C = registry[component] || TextInput;
  return <C {...rest} />;
}
