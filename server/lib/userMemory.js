'use strict';

// ============================================================
// ذاكرةُ المستخدم — ما يعرفه التطبيقُ عن **شخصٍ بعينه**.
//
//   جردٌ كشف أنّ تسعةَ مخازنِ معرفةٍ تعيش في `localStorage` ولا يصل واحدٌ منها
//   الخادمَ: العباراتُ المعتمَدة، الرحلات، رسمُ المستخدم، القرارات، الأماكنُ
//   المتعلَّمة… فمَن يبدّل هاتفَه يفقد كلَّ ما تعلّمه التطبيقُ عنه، ومَن يفتح
//   من حاسوبٍ آخر يجده لا يعرفه.
//
//   ولاحظ الانقسام: المعرفةُ **العامّة** («لافابو ⇒ سبّاك») على الخادم في
//   `custom_concepts` منذ حلقة التعلّم — والمعرفةُ **عن الشخص** في المتصفّح.
//   نصفُ العقل يتذكّر ونصفُه ينسى.
//
//   ── لماذا الدمجُ لا الاستبدال ──
//   هاتفٌ تعلّم «طرطاقة»، وحاسوبٌ تعلّم «اونصومبل». آخرُ كتابةٍ تفوز ⇒ تُمحى
//   إحداهما بلا أثر. ولأنّ الضياعَ صامتٌ لا يشتكي منه أحد، وُضعت الاستراتيجيّةُ
//   **لكلّ مفتاحٍ صراحةً** بدل قاعدةٍ واحدةٍ تُطبَّق على ما لا يناسبها.
//
//   والمفتاحُ غيرُ المُعلَن **يُرفَض**: بلا هذا يصير الجدولُ مكبًّا يكتب فيه
//   العميلُ ما شاء، فتُخزَّن أسرارٌ أو نفاياتٌ بلا حدٍّ ولا مراجعة.
// ============================================================

/**
 * سجلُّ مخازن الذاكرة. `strategy` تصف **كيف** يلتقي جهازان:
 *   merge_object — اتّحادُ المفاتيح؛ الأحدثُ يفوز عند تصادم المفتاح نفسِه.
 *   append_array — اتّحادُ العناصر بلا تكرار، والأحدثُ يبقى عند الامتلاء.
 *   replace      — قيمةٌ واحدةٌ لا معنى لدمجها (آخرُ زيارة، إصدارُ القاعدة).
 */
const MEMORY_KEYS = {
  // العباراتُ التي اعتمدها الإنسان: «عبارة ⇒ مفهوم». أثمنُ ما في الذاكرة.
  amanzine_learned:        { strategy: 'merge_object', max: 2000 },
  // أماكنُ تعلّمها المحرّكُ من كتابة المستخدم (حيّ، معلمة).
  amanzine_learned_places: { strategy: 'merge_object', max: 2000 },
  // رسمُ المستخدم: ما يهمّه، ما زاره، ما تكرّر منه.
  amanzine_user_graph:     { strategy: 'merge_object', max: 5000 },
  // الرحلات: لكلّ واحدةٍ `id` — فالتمييزُ به لا بمقارنة الكائن كلِّه.
  amanzine_journeys:       { strategy: 'append_array', max: 120, dedupeBy: 'id' },
  amanzine_receptions:     { strategy: 'append_array', max: 120, dedupeBy: 'id' },
  amanzine_feedback:       { strategy: 'append_array', max: 200, dedupeBy: 'id' },
  amanzine_xp_log:         { strategy: 'append_array', max: 300, dedupeBy: 'id' },
  // سجلُّ القرارات: عدّاداتٌ متراكمة، تُجمع لا تُستبدل.
  amanzine_decisions:      { strategy: 'merge_object', max: 500 },
  amanzine_snapshots:      { strategy: 'append_array', max: 60, dedupeBy: 'id' },
  amanzine_last_visit:     { strategy: 'replace' },
  amanzine_kb_version:     { strategy: 'replace' },
};

/** هل هذا مفتاحٌ نعرفه؟ */
function isKnownKey(key) {
  return Object.prototype.hasOwnProperty.call(MEMORY_KEYS, key);
}

/** كلُّ المفاتيح المُعلَنة — يقرؤها العميل ليعرف ماذا يُزامن. */
function knownKeys() {
  return Object.keys(MEMORY_KEYS).map(k => ({ key: k, ...MEMORY_KEYS[k] }));
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * يدمج قيمةً واردةً في قيمةٍ مخزَّنة حسب استراتيجيّة المفتاح.
 *
 *   `incoming` هي ما أرسله الجهاز، و`stored` ما على الخادم. الوافدُ يفوز عند
 *   تصادم المفتاح نفسِه لأنّه أحدثُ زمنًا — لكنّه **لا يمحو** ما لا يعرفه.
 *
 * @returns {{value:any, added:number}} القيمةُ الجديدة وكم عنصرًا دخل فعلًا
 */
function mergeValue(key, stored, incoming) {
  const def = MEMORY_KEYS[key];
  if (!def) return { value: stored, added: 0 };

  if (def.strategy === 'replace') {
    const changed = JSON.stringify(stored) !== JSON.stringify(incoming);
    return { value: incoming, added: changed ? 1 : 0 };
  }

  if (def.strategy === 'merge_object') {
    const a = isPlain(stored) ? stored : {};
    const b = isPlain(incoming) ? incoming : {};
    const out = { ...a };
    let added = 0;
    for (const [k, v] of Object.entries(b)) {
      if (!(k in out) || JSON.stringify(out[k]) !== JSON.stringify(v)) added++;
      out[k] = v;
    }
    // السقفُ يحمي من نموٍّ بلا حدّ. الأقدمُ يخرج أوّلًا (ترتيبُ الإدراج محفوظ).
    const keys = Object.keys(out);
    if (def.max && keys.length > def.max) {
      const drop = keys.slice(0, keys.length - def.max);
      for (const k of drop) delete out[k];
    }
    return { value: out, added };
  }

  // append_array
  const a = Array.isArray(stored) ? stored : [];
  const b = Array.isArray(incoming) ? incoming : [];
  const idOf = (x) => (def.dedupeBy && isPlain(x) ? x[def.dedupeBy] : undefined);
  const seen = new Map();
  for (const x of a) {
    const id = idOf(x);
    seen.set(id !== undefined ? `#${id}` : JSON.stringify(x), x);
  }
  let added = 0;
  for (const x of b) {
    const id = idOf(x);
    const k = id !== undefined ? `#${id}` : JSON.stringify(x);
    if (!seen.has(k)) added++;
    // الوافدُ يستبدل نظيرَه: نفسُ الرحلة قد تكون اكتملت بعد أن رُفعت ناقصةً.
    seen.set(k, x);
  }
  let out = [...seen.values()];
  if (def.max && out.length > def.max) out = out.slice(-def.max);   // الأحدثُ يبقى
  return { value: out, added };
}

/** يفحص دفعةً واردةً قبل لمس القاعدة — يُرجع المرفوضَ بسببه. */
function validateBatch(entries) {
  const problems = [];
  if (!isPlain(entries)) return ['الحمولة يجب أن تكون كائنًا {مفتاح: قيمة}'];
  const keys = Object.keys(entries);
  if (!keys.length) return ['لا مفاتيحَ في الحمولة'];
  if (keys.length > 40) problems.push('عددُ المفاتيح أكبرُ من المسموح (40)');
  for (const k of keys) {
    if (!isKnownKey(k)) { problems.push(`مفتاحٌ غيرُ معروف: ${k}`); continue; }
    const size = JSON.stringify(entries[k] ?? null).length;
    // حدٌّ لكلّ مفتاح: ذاكرةُ شخصٍ لا ينبغي أن تُقاس بالميغابايت.
    if (size > 512 * 1024) problems.push(`${k}: الحجم ${Math.round(size / 1024)}KB أكبرُ من 512KB`);
  }
  return problems;
}

module.exports = { MEMORY_KEYS, isKnownKey, knownKeys, mergeValue, validateBatch };
