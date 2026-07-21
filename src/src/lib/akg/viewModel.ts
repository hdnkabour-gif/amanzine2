// ============================================================
// ViewModel Builder — الطبقة التي تفصل «نوع الحقل» عن «كيف يُرسَم». العقل لا
//   يُصدّر widget يفهمه الـ Renderer، بل ViewModel محايد: اسم مكوّن + props.
//   الـ Renderer يصبح registry.render(component) بلا switch ولا معرفة بـ
//   money/city/vehicle. لو بدّلنا مكتبة المكوّنات، نغيّر الـ registry وحده.
// ============================================================

import type { UIField } from './uiContract';
import type { Widget } from './widgets';

export interface FieldView {
  key: string;
  component: string;                 // اسم المكوّن في Component Registry
  props: Record<string, unknown>;    // خصائص المكوّن (choices/placeholder/currency…)
}

// widget → اسم مكوّن (خريطة، لا switch). المكان الوحيد لهذا الربط.
const COMPONENT: Record<Widget, string> = {
  text: 'TextInput',
  number: 'NumberInput',
  money: 'MoneyInput',
  choice: 'ChoiceCards',
  toggle: 'ToggleField',
  gallery: 'GalleryPicker',
  video: 'VideoPicker',
  location: 'LocationInput',
  phone: 'PhoneInput',
};

export function toFieldView(field: UIField): FieldView {
  const props: Record<string, unknown> = {
    placeholder: field.placeholder,
    required: field.required,
  };
  if (field.choices) props.choices = field.choices;
  if (field.widget === 'money') props.currency = 'MAD';
  return { key: field.key, component: COMPONENT[field.widget], props };
}
