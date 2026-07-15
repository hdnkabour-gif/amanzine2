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

// المدخل: يعطي كل الاستنتاجات مع ثقتها لكيان معيّن.
export function inferValues(entity: string, raw: string): Inferred[] {
  const t = raw.toLowerCase();
  if (entity === 'vehicle') return vehicleInfer(t);
  if (entity === 'service') return serviceInfer(t);
  return [];
}

// عتبات الثقة
export const CONF = { auto: 0.9, confirm: 0.5 };
