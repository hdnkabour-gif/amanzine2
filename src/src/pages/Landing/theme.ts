// نظام الألوان — هويّة Need OS (زمرّد + ذهب على كريم مغربيّ دافئ). الأسماء
// الدلالية محفوظة لتوافق الأقسام، لكن قيمها الجديدة: orange=زمرّد (أساسي) ·
// purple=ذهب (لمسة/إجراء) · blue=زمرّد غامق (ثانوي) · green=نجاح.
export const C = {
  bg: '#FAF8F2', surface: '#FFFFFF', alt: '#F1EEE6',
  ink: '#0F1A15', ink2: '#586B61', ink3: '#95A09A',
  border: 'rgba(15,26,21,0.10)', borderH: 'rgba(15,26,21,0.18)',
  shadow: '0 14px 44px rgba(10,143,111,0.10)', shadowH: '0 26px 64px rgba(10,143,111,0.16)',
  orange: '#0A8F6F', orangeD: '#077A5E', blue: '#0F766E', green: '#12A150', purple: '#D4A017',
} as const;

// نفس منطق كشف العنوان في services/api.ts (يعمل في dev والإنتاج)
export function apiBase(): string {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173' || window.location.port === '4173') return 'http://localhost:3001/api';
    return `${window.location.origin}/api`;
  }
  return '/api';
}
