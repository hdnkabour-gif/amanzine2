// إعداد اختبارات العقل — يوفّر localStorage في node (يستعمله Applied Memory).
// يُستورد أوّلًا (قبل أيّ وحدة تلمس التخزين).
// و`sessionStorage` أيضًا: سجلُّ حالة العميل يفرّق بين المخزنَين بالنطاق —
//   ما يخصّ الرحلةَ في الجلسة، وما يخصّ الحسابَ في المحلّيّ. وبلا الثاني كان
//   نصفُ السجلّ لا يُقاس أصلًا.
function makeStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}
for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (typeof (globalThis as Record<string, unknown>)[name] === 'undefined') {
    (globalThis as Record<string, unknown>)[name] = makeStorage();
  }
}
export {};
