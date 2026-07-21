// ============================================================
// Widgets — أنواع عناصر العرض العامّة، وربط FieldType → Widget في مكان واحد.
//   محايد (لا يستورد شيئًا من الـ AKG) حتّى يستعمله Schema و UI Contract معًا
//   بلا دورة استيراد. الـ Renderer هو الوحيد الذي «يرسم» هذه الأنواع.
// ============================================================

import type { FieldType } from '../blueprints';

export type Widget =
  | 'text' | 'number' | 'money' | 'choice' | 'toggle'
  | 'gallery' | 'video' | 'location' | 'phone';

export const WIDGET: Record<FieldType, Widget> = {
  text: 'text', number: 'number', money: 'money', select: 'choice',
  city: 'location', phone: 'phone', toggle: 'toggle', photos: 'gallery', video: 'video',
};
