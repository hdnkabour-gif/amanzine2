// ============================================================
// Arabizi Layer — تحويل الدارجة المكتوبة بالحروف اللاتينيّة/الأرقام
//   (Arabizi: «bghit», «3andi», «7aja»…) → عربيّة، قبل أن يقرأها المحرّك.
//   ضرورةٌ لا ميزة: نسبةٌ ضخمةٌ من المغاربة يكتبون هكذا. قواعدُ فقط — بلا شبكة،
//   بلا ذكاء، فوريّة، تحترم الـ Freeze (طبقةٌ مكتفيةٌ بذاتها تُطعِم understand).
//   ليست شاملةً لكلّ جملةٍ لاتينيّة (ذاك سقفُ Gemini لاحقًا) — بل تغطّي الأسطح
//   عالية التردّد التي يحتاجها المحرّك: أفعال النيّة + أهمّ الأعراض + مفردات شائعة.
// ============================================================

const AR = /[؀-ۿ]/; // أيّ حرفٍ عربيّ

// خريطة الكلمات الكاملة (الأعلى موثوقيّةً) — سطحٌ لاتينيّ → سطحٌ عربيّ يعرفه المحرّك.
// مرتّبةٌ حسب المعنى لتسهيل الصيانة. المفاتيح كلّها بحروفٍ صغيرة.
const WORD: Record<string, string> = {
  // — أفعال النيّة: طلب/رغبة —
  bghit: 'بغيت', bghyt: 'بغيت', bght: 'بغيت', bghina: 'بغينا', bghi: 'بغي',
  baghi: 'باغي', baghia: 'باغية', kanbghi: 'كنبغي', kanbg: 'كنبغي', nbghi: 'نبغي',
  khass: 'خاص', khassni: 'خاصني', khasni: 'خاصني', khssni: 'خاصني', '5assni': 'خاصني', '5asni': 'خاصني',
  ne7taj: 'نحتاج', n7taj: 'نحتاج', me7taj: 'محتاج', m7taj: 'محتاج', mou7taj: 'محتاج',
  // — بيع —
  nbi3: 'نبيع', nbii3: 'نبيع', nbe3: 'نبيع', kanbi3: 'كنبيع', bi3: 'بيع', biya3: 'بياع', llbi3: 'للبيع',
  // — شراء / بحث —
  nchri: 'نشري', necheri: 'نشري', nchari: 'نشري', nechri: 'نشري', chri: 'شري', chra: 'شرى',
  nqleb: 'نقلب', nqlb: 'نقلب', n9leb: 'نقلب', n9lb: 'نقلب', kanqleb: 'كنقلب', kanqlb: 'كنقلب', kan9leb: 'كنقلب',
  nlqa: 'نلقى', nlqi: 'نلقى', fin: 'فين', win: 'وين', '3la': 'على', '3lik': 'عليك', '3liya': 'عليا',
  // — ملكيّة / وجود —
  '3andi': 'عندي', '3ndi': 'عندي', '3endi': 'عندي', '3and': 'عند', '3ndna': 'عندنا',
  // — أشياء / أغراض —
  '7aja': 'حاجة', '7aaja': 'حاجة', '7ajti': 'حاجتي', '7wayj': 'حوايج', '7wayej': 'حوايج',
  chi: 'شي', chwiya: 'شوية', hadchi: 'هادشي', hadchy: 'هادشي', dyal: 'ديال', dial: 'ديال',
  // — مشكل / عطب —
  mouchkil: 'مشكل', mochkil: 'مشكل', mouchkile: 'مشكل', mchkl: 'مشكل', mchkil: 'مشكل',
  khrban: 'خربان', '5rban': 'خربان', khasr: 'خاسر', '5asr': 'خاسر',
  makhdamch: 'ماخدامش', makhedamch: 'ماخدامش', ma5edamch: 'ماخدامش', ma5damch: 'ماخدامش',
  t3ttel: 'تعطل', t3tel: 'تعطل', '3tel': 'عطل',
  // — أعراض شائعة (ماء/كهرباء/سيّارة) —
  kaytqar: 'كيقطر', kaytqer: 'كيقطر', kaytkar: 'كيقطر', tqar: 'قطر', kaysil: 'كيسيل', kaysiyel: 'كيسيل',
  fad: 'فاض', fadd: 'فاض', ghre9: 'غرق', ghreq: 'غرق',
  dou: 'الضو', daw: 'الضو', daou: 'الضو', kahraba: 'كهرباء', kahrba: 'كهرباء',
  lma: 'الما', l7anout: 'الحانوت', '7anout': 'حانوت',
  // — مهن / مختصّون —
  sbbak: 'سباك', sabbak: 'سباك', sbak: 'سباك', tobib: 'طبيب', tbib: 'طبيب', tabib: 'طبيب',
  kahrbaji: 'كهربائي', kahrabaji: 'كهربائي', najjar: 'نجار', nejjar: 'نجار', najar: 'نجار',
  '7arfi': 'حرفي', '7rayfi': 'حرايفي', '7raifi': 'حرايفي', snay3i: 'صنايعي', sn3i: 'صنايعي',
  mikanik: 'ميكانيكي', mecanicien: 'ميكانيكي', mou7ami: 'محامي', m7ami: 'محامي',
  // — تجارة / زبائن —
  ma7al: 'محل', ma7all: 'محل', ma7l: 'محل', matjar: 'متجر', klian: 'كليان', clian: 'كليان',
  zbon: 'زبون', zbin: 'زبناء', zbana: 'زبناء', mntoj: 'منتوج', mantoj: 'منتوج', montaj: 'منتوج',
  // — أماكن / مدن —
  dar: 'دار', ddar: 'الدار', koujina: 'الكوزينة', kouzina: 'الكوزينة', koozina: 'الكوزينة', '7mam': 'الحمام',
  casa: 'كازا', kaza: 'كازا', rbat: 'الرباط', marrakech: 'مراكش', merrakech: 'مراكش',
  tanja: 'طنجة', tanger: 'طنجة', agadir: 'أكادير', fes: 'فاس', fez: 'فاس', wjda: 'وجدة', wejda: 'وجدة',
  // — ضمائر / روابط / شائعة —
  ana: 'أنا', '7na': 'حنا', nta: 'نتا', nti: 'نتي', huwa: 'هو', hiya: 'هي',
  ghadi: 'غادي', ghady: 'غادي', ila: 'إلا', wla: 'ولا', wella: 'ولا', walakin: 'ولكن',
  bzaf: 'بزاف', bzzaf: 'بزاف', mzyan: 'مزيان', mzian: 'مزيان', mzyana: 'مزيانة',
  daba: 'دابا', bzerba: 'بزربة', '3ajel': 'عاجل', mosta3jel: 'مستعجل',
  wach: 'واش', wa7ed: 'واحد', kayn: 'كاين', kayen: 'كاين', makaynch: 'ماكاينش',
  n3ref: 'نعرف', kan3ref: 'كنعرف', ndir: 'ندير', kandir: 'كندير', ndiro: 'نديرو',
};

// ثنائيّاتٌ صوتيّة تُعالَج قبل الحرف-بحرف (لتفادي أخطاء مثل ch→ش لا c+h).
const DIGRAPHS: [RegExp, string][] = [
  [/ch/g, 'ش'], [/kh/g, 'خ'], [/gh/g, 'غ'], [/ou/g, 'و'], [/aa/g, 'ا'], [/ee/g, 'ي'], [/th/g, 'ث'],
];

// خريطة الحرف الواحد (احتياطيّ لِما لم تغطّه خريطة الكلمات).
const CHAR: Record<string, string> = {
  '2': 'ء', '3': 'ع', '5': 'خ', '7': 'ح', '8': 'غ', '9': 'ق',
  a: 'ا', b: 'ب', c: 'ك', d: 'د', e: '', f: 'ف', g: 'گ', h: 'ه', i: 'ي', j: 'ج',
  k: 'ك', l: 'ل', m: 'م', n: 'ن', o: 'و', p: 'ب', q: 'ق', r: 'ر', s: 'س', t: 'ت',
  u: 'و', v: 'ف', w: 'و', x: 'كس', y: 'ي', z: 'ز',
};

// تحويل حرف-بحرف لِرمزٍ لاتينيّ واحد (احتياطيّ فقط).
function translitChars(low: string): string {
  let s = low;
  for (const [re, rep] of DIGRAPHS) s = s.replace(re, rep);
  let out = '';
  for (const ch of s) out += ch in CHAR ? CHAR[ch] : AR.test(ch) ? ch : '';
  return out;
}

/**
 * deArabizi — يحوّل الأسطح اللاتينيّة في النصّ إلى عربيّة، رمزًا رمزًا.
 * يترك المقاطع العربيّة والأرقام الخالصة (أسعار/كمّيّات) كما هي — فيعمل مع المزيج.
 */
export function deArabizi(text: string): string {
  if (!text) return text;
  return text
    .split(/(\s+)/)
    .map(tok => {
      if (!tok.trim()) return tok;          // فراغات
      if (AR.test(tok)) return tok;         // عربيّةٌ أصلًا — لا نمسّها
      const lead = tok.match(/^[^0-9a-zA-Z]+/)?.[0] ?? '';
      const trail = tok.match(/[^0-9a-zA-Z]+$/)?.[0] ?? '';
      const core = tok.slice(lead.length, tok.length - trail.length);
      if (!core) return tok;                // علامات ترقيم فقط
      const low = core.toLowerCase();
      if (WORD[low]) return lead + WORD[low] + trail;         // كلمةٌ معروفة
      if (/^[0-9]+$/.test(low)) return tok;                    // رقمٌ خالص (سعر/كمّيّة)
      if (!/[a-z0-9]/.test(low)) return tok;                   // ليس لاتينيًّا
      return lead + translitChars(low) + trail;                // احتياطيّ حرف-بحرف
    })
    .join('');
}

/** isArabizi — تقديرٌ سريع: هل النصّ مكتوبٌ باللاتينيّة (لا عربيّة فيه إطلاقًا)؟ */
export function isArabizi(text: string): boolean {
  if (!text || AR.test(text)) return false;
  return /[a-z]/i.test(text);
}
