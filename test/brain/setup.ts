// إعداد اختبارات العقل — يوفّر localStorage في node (يستعمله Applied Memory).
// يُستورد أوّلًا (قبل أيّ وحدة تلمس التخزين).
const store: Record<string, string> = {};
if (typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined') {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
}
export {};
