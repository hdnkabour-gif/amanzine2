// ============================================================
// Inference + Confidence — «فكّر قبل أن تسأل».
//   قبل السؤال، نستنتج أكبر قدر من الجملة/السياق، ونعطي كل استنتاج نسبة ثقة:
//     ≥ 0.9  → نملؤه بصمت (لا نسأل)         (نعرضه ضمن «افترضنا»)
//     0.5–0.9 → نملؤه ونطلب تأكيدًا خفيفًا     (Prediction Brain)
//     < 0.5  → لا نفترض، نترك السؤال كاملًا
//   قواعد فقط الآن (client)؛ لاحقًا Knowledge Graph + تعلّم من السوق (خادم).
// ============================================================

export interface Inferred { key: string; label: string; value: any; confidence: number; }

// موديل → ماركة (استنتاج الكيان الأب)
const MODEL_BRAND: [RegExp, string][] = [
  [/golf|passat|polo|tiguan|touareg|jetta/, 'Volkswagen'],
  [/clio|megane|symbol|kangoo|captur|duster|logan|sandero/, 'Renault/Dacia'],
  [/corolla|yaris|rav4|hilux|land ?cruiser/, 'Toyota'],
  [/serie|x5|x3|x1|320|520/, 'BMW'],
  [/classe|cla|glc|c200|c220/, 'Mercedes'],
  [/208|308|3008|partner/, 'Peugeot'],
];

// استنتاجات المركبة (أولويّات السوق المغربيّ — ثقة متوسّطة، تُأكَّد)
const DIRECT_BRAND: [RegExp, string][] = [
  [/\bbmw\b|بي ?ام/, 'BMW'], [/toyota|تويوتا/, 'Toyota'], [/mercedes|مرسيدس/, 'Mercedes'],
  [/renault|رونو/, 'Renault'], [/dacia|داسيا/, 'Dacia'], [/peugeot|بيجو/, 'Peugeot'],
  [/audi|اودي|أودي/, 'Audi'], [/hyundai|هيونداي/, 'Hyundai'], [/kia|كيا/, 'Kia'], [/ford|فورد/, 'Ford'], [/volkswagen|فولكس/, 'Volkswagen'],
];
function vehicleInfer(t: string): Inferred[] {
  const out: Inferred[] = [];
  let brand: string | undefined;
  for (const [re, b] of DIRECT_BRAND) if (re.test(t)) { brand = b; break; }              // اسم ماركة مباشر
  if (!brand) for (const [re, b] of MODEL_BRAND) if (re.test(t)) { brand = b; break; }    // موديل → ماركة
  if (brand) out.push({ key: 'brand', label: 'الماركة', value: brand, confidence: 0.97 });
  // أغلب المستعمل في المغرب مازوط + عاديّة (ثقة متوسّطة → تأكيد)
  out.push({ key: 'fuel', label: 'الوقود', value: 'مازوط', confidence: 0.6 });
  out.push({ key: 'gearbox', label: 'ناقل الحركة', value: 'عاديّة', confidence: 0.62 });
  return out;
}

// استنتاجات النشاط المهنيّ (التخصّص من الجملة)
function serviceInfer(t: string): Inferred[] {
  const out: Inferred[] = [];
  const spec = [
    [/ألمنيوم|المنيوم|alu/, 'ألمنيوم'], [/حديد|لحام/, 'حديد'], [/خشب|أثاث|مطابخ/, 'خشب/مطابخ'],
    [/كهربا|كهرباء/, 'كهرباء منزليّة'], [/صحّي|سباك|ماء/, 'صحّي'], [/أسنان/, 'أسنان'],
  ].find(([re]) => (re as RegExp).test(t));
  if (spec) out.push({ key: 'specialties', label: 'التخصّص', value: spec[1] as string, confidence: 0.9 });
  return out;
}

// استخراج أساسيّ من النصّ (لكلّ الكيانات): العنوان/الثمن/السنة/الفئة/الحالة/النوع.
// نُقل من منطق الصفحة إلى هنا حتّى تبقى الصفحة واجهة فقط — والقرار مركزيّ.
const CATMAP: [string, string][] = [['ايفون','إلكترونيات'],['آيفون','إلكترونيات'],['تلفون','إلكترونيات'],['هاتف','إلكترونيات'],['لابطوب','إلكترونيات'],['صباط','أحذية'],['حذاء','أحذية'],['قميص','ملابس'],['لباس','ملابس'],['كنبة','أثاث'],['موبيليا','أثاث']];
const REMAP: [string, string][] = [['شقة','شقة'],['فيلا','فيلا'],['ستوديو','ستوديو'],['دار','دار'],['ارض','أرض'],['محل','محل']];

function baseInfer(raw: string): Inferred[] {
  const t = raw.toLowerCase();
  const out: Inferred[] = [];
  const year = raw.match(/\b(19|20)\d{2}\b/);
  let price: string | undefined;
  const withCur = raw.match(/(\d[\d.,]{2,9})\s*(درهم|dh|dhs|د\.?م)/);
  if (withCur) price = withCur[1].replace(/[.,]$/, '');
  else { const nums = (raw.match(/\d[\d.,]{2,9}/g) || []).map(s => s.replace(/[.,]$/, '')); price = nums.find(n => !(year && n === year[0])); }
  const title = raw.replace(/بغيت|باغي|نبيعو|نبيع|عندي|للبيع|للكراء|نكري|أنا\s/g, '')
    .replace(/(\d[\d.,]{2,9})\s*(درهم|dh|dhs|د\.?م)?/g, '')
    .replace(/(^|\s)(ب|بـ|في|ف)(?=\s|$)/g, ' ')   // إزالة حروف جرّ الثمن المتبقّية
    .replace(/\s+/g, ' ').trim();

  if (title) { out.push({ key: 'title', label: 'العنوان', value: title.slice(0, 60), confidence: 0.85 }); out.push({ key: 'profession', label: 'المهنة', value: title.slice(0, 40), confidence: 0.85 }); }
  if (price) { out.push({ key: 'price', label: 'الثمن', value: price, confidence: 0.9 }); out.push({ key: 'dailyPrice', label: 'الثمن اليوميّ', value: price, confidence: 0.9 }); }
  if (year) out.push({ key: 'year', label: 'السنة', value: year[0], confidence: 0.85 });
  for (const [kw, c] of CATMAP) if (t.includes(kw)) { out.push({ key: 'category', label: 'الفئة', value: c, confidence: 0.8 }); break; }
  if (/جديد/.test(t)) out.push({ key: 'condition', label: 'الحالة', value: 'جديد', confidence: 0.8 });
  else if (/مستعمل|خدام/.test(t)) out.push({ key: 'condition', label: 'الحالة', value: 'مستعمل', confidence: 0.8 });
  for (const [kw, c] of REMAP) if (t.includes(kw)) { out.push({ key: 'kind', label: 'النوع', value: c, confidence: 0.8 }); break; }
  return out;
}

// المدخل: يعطي كل الاستنتاجات مع ثقتها لكيان معيّن (أساسيّ + خاصّ بالكيان).
export function inferValues(entity: string, raw: string): Inferred[] {
  const t = raw.toLowerCase();
  const out = baseInfer(raw);
  if (entity === 'vehicle') out.push(...vehicleInfer(t));
  else if (entity === 'service') out.push(...serviceInfer(t));
  return out;
}

// عتبات الثقة
export const CONF = { auto: 0.9, confirm: 0.5 };
