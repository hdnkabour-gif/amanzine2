// ============================================================
// **لفظٌ واحدٌ ⇒ مفهومٌ واحد.**
//
//   قِيس على السجلّ المدموج: ١٢٩ لفظًا كان يملكه أكثرُ من مفهوم. والأثرُ
//   موصوفٌ في `knowledgeExtra.ts` نفسِه: «أوّلُ إصابةٍ تفوز، فالمفهومُ
//   الثاني يصير غيرَ قابلٍ للوصول بتلك الكلمة، بلا أيّ رسالةٍ لأحد».
//   أي أنّ الفهمَ كان عشوائيًّا — والعشوائيُّ لا يُكتشَف بتجربةٍ واحدة.
//
//   ويُقاس هنا على **ما بعد الدمج** (`CONCEPTS` من `concepts.ts`) لا على
//   ملفّات المصدر: `DISOWNED` تُطبَّق عند الدمج، فقياسُ الخام يكذب.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = process.cwd();
import { CONCEPTS } from '../../src/lib/akg/kb/concepts';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';

/**
 * **ويُطبَّع شكلُ الحرف، وإلّا كذب العدد.**
 *
 *   الدارجةُ تكتب الصوتَ الواحدَ بأشكالٍ عدّة: «دروگري» و«دروڭري»
 *   و«دروكري» · «براسينگ» و«براسينڭ» · «پراسينك». و`normArabic` — وهو
 *   ما يُبنى به فهرسُ `resolveConcept` — يَطويها كلَّها إلى الكاف، فيراها
 *   التطبيقُ لفظًا واحدًا.
 *
 *   فقياسٌ يقارن الحروفَ كما كُتبت يُعلن «٤ تنازعات» وفي الواقعِ ٦:
 *   «دروكري» (`hardware_store` ⟷ `hardware_household_supplies`) و
 *   «براسينك» (`laundry` ⟷ `laundry_dry_cleaner`) كانا يختبئان في شكلِ
 *   الحرف. وكان الفائزُ فيهما صحيحًا **بالصدفة**: ترتيبُ الفهرس لا حكمٌ
 *   مكتوب. وهذا هو صنفُ «المقاييسِ التي تكذب» بعينه: الحارسُ أخضرُ
 *   والعطبُ قائم.
 */
const norm = (x: string) => String(x || '').toLowerCase().trim()
  .replace(/[گڭ]/g, 'ك')   // گ · ڭ ⇒ ك
  .replace(/ڤ/g, 'ف')            // ڤ ⇒ ف
  .replace(/پ/g, 'ب');           // پ ⇒ ب

/** كلُّ لفظٍ ⇒ المفاهيمُ التي تدّعيه. */
function clashes(): Map<string, string[]> {
  const owners = new Map<string, string[]>();
  for (const c of CONCEPTS) {
    const terms = new Set<string>();
    for (const list of Object.values(c.variants || {})) for (const t of list || []) {
      const n = norm(t); if (n.length >= 3) terms.add(n);
    }
    for (const t of terms) owners.set(t, [...(owners.get(t) || []), c.id]);
  }
  return new Map([...owners].filter(([, ids]) => ids.length > 1));
}

// العناقيدُ المفضوضة — كلُّ لفظٍ هنا يجب أن يُحسَم لمفهومٍ واحد.
const RESOLVED: Record<string, string> = {
  'ميكانيك': 'mechanic', 'گاراج': 'mechanic', 'garage': 'mechanic',
  'طبيب': 'doctor_gp', 'دكتور': 'doctor_gp', 'جنراليست': 'doctor_gp',
  'جزار': 'butcher', 'قصاب': 'butcher', 'boucher': 'butcher',
  'حانوت': 'grocer', 'بقال': 'grocer', 'بقالة': 'grocer',
  'مقهى': 'cafe', 'قهوة': 'cafe', 'café': 'cafe',
  'صباغ': 'painter', 'مصبغة': 'laundry', 'pressing': 'laundry',
  // تقسيمٌ لا دمج — إنسانٌ ومكان، ودوران، ومنتجان، وصنفان.
  'خباز': 'baker', 'مخبزة': 'bakery',
  'maçon': 'mason', 'مقاول بناء': 'contractor',
  'كيس': 'traditional_hammam', 'حمام بلدي': 'traditional_hammam',
  'سناك': 'snack_bar_restaurant', 'طاكوس': 'snack_bar_restaurant',
  'مطعم': 'restaurant', 'ماكلة': 'restaurant',

  // ── الدفعةُ الثانية: ٤٥ عنقودًا، حكمًا صريحًا لكلِّ لفظ ──────────
  'automobile': 'car',
  'صيانة': 'car_service',
  'révision': 'car_service',
  'car service': 'car_service',
  'grocery store': 'grocer',
  'coffee shop': 'coffee_shop',
  'صباغة طوموبيل': 'car_painting',
  'كنصبغ السيارة': 'car_painting',
  'carrosserie peinture': 'car_painting',
  'دروكري': 'hardware_store',
  'quincaillerie': 'hardware_store',
  'كينكايري': 'hardware_store',
  'بياس': 'auto_parts',
  'بياسات': 'auto_parts',
  'قطع طوموبيلات': 'auto_parts',
  'قطع غيار السيارات': 'auto_parts',
  'مول السوارت': 'key_maker',
  'كيصايب السوارت': 'key_maker',
  'serrurier': 'key_maker',
  'خضار': 'greengrocer',
  'بائع أحذية': 'shoe_store',
  'magasin de chaussures': 'shoe_store',
  'مول الدجاج': 'poultry_seller',
  'مطبعة': 'print_shop',
  'طباعة': 'print_shop',
  'photocopie': 'print_shop',
  'informatique': 'computer_repair',
  'فورماتاج': 'computer_repair',
  'تهيئة': 'computer_repair',
  'formatage': 'computer_repair',
  'formatting': 'computer_repair',
  'ألمنيوم': 'aluminum_fabricator_window_installer',
  'snack bar': 'snack_bar_restaurant',
  'building contractor': 'contractor',
  'لحام': 'blacksmith_welder',
  'مبيض': 'painter',
  'marbre': 'marble_granite_worker',
  'مول البني': 'mason',
  'bistro': 'cafe',
  'فران': 'bakery',
  'فرن': 'bakery',
  'جباس': 'plasterer',
  'كيدير الجبس': 'plasterer',
  'خراز': 'cobbler_shoe_repair',
  'cordonnier': 'cobbler_shoe_repair',
  'مول الصباط': 'shoe_seller',
  'مول الفرش': 'bedding_and_home_textiles_store',
  'كليماتيزور': 'air_conditioning_and_refrigeration_technician',
  'تصليح الثلاجات': 'air_conditioning_and_refrigeration_technician',
  'كليم': 'carpet_and_rug_seller',
  'agence immobilière': 'real_estate_agency',
  'انفورماتيك': 'computer_repair',
  'impression': 'print_shop',
  'كريش': 'daycare',
  'حضانة': 'daycare',
  'crèche': 'daycare',
  'بارابول': 'satellite_receiver',
  'ريسيفر': 'satellite_receiver',
  'parabole': 'satellite_receiver',
  'satellite': 'satellite_receiver',
  'حمام شعبي': 'traditional_hammam',
  'خيمة': 'event_equipment_rental',
  'منجرة': 'carpenter',
  'menuisier / ébéniste': 'carpenter_joiner',
};

test('**كلُّ لفظٍ مفضوضٍ يُحسَم لمفهومٍ واحدٍ بعينه**', () => {
  const cl = clashes();
  const still: string[] = [];
  for (const [term, expected] of Object.entries(RESOLVED)) {
    const owners = CONCEPTS.filter(c =>
      // الطرفان يُطبَّعان: لو طُبِّع أحدُهما وحدَه لصار الحارسُ يبحث عن
      //   مفتاحٍ لا وجودَ له فيمرُّ وهو أعمى — ومن ثمّ شرطُ «اختفى تمامًا».
      Object.values(c.variants || {}).some(l => (l || []).some(t => norm(t) === norm(term)))
    ).map(c => c.id);
    if (owners.length === 0) { still.push(`«${term}» اختفى تمامًا — نُزع من الجميع`); continue; }
    if (owners.length > 1) { still.push(`«${term}» ما زال متنازَعًا: ${owners.join(' ⟷ ')}`); continue; }
    if (owners[0] !== expected) still.push(`«${term}» ⇒ ${owners[0]} بدل ${expected}`);
  }
  assert.deepEqual(still, [], 'ألفاظٌ لم تُفَضّ:\n  ' + still.join('\n  '));
  void cl;
});

test('**والتنازعُ الكلّيُّ لا يزيد** — سقفٌ يَنزل ولا يَصعد', () => {
  // ١٢٩ ⇒ ١٠٥ ⇒ **٤**. وهذه الأربعةُ ليست بقيّةَ عملٍ بل قرارُ منتَجٍ
  //   مؤجَّلٌ لصاحبِه: «سكانير» (فحصُ سيّارةٍ أم ماسحُ وثائق؟) ·
  //   «كنبدل الثوب» (ثوبُ سيّارةٍ أم صالون؟) · «حمام» و«hammam»
  //   (سبا أم بلديّ؟). ولا يُرفَع هذا الرقمُ أبدًا: من أضاف مفردةً
  //   تتنازع مع مالكٍ قائمٍ يُسقِطه هذا الحارسُ قبل الدمج.
  const n = clashes().size;
  assert.ok(n <= 4, `التنازعُ ${n} لفظًا — كان يجب ألّا يتجاوز ٤`);
});

test('**ولا مفهومَ فقد كلَّ ألفاظه** — النزعُ لا يُفرِغ', () => {
  const empty = CONCEPTS.filter(c =>
    Object.values(c.variants || {}).flat().filter(Boolean).length === 0
  ).map(c => c.id);
  assert.deepEqual(empty, [], `مفاهيمُ صارت بلا لفظٍ واحد: ${empty.join(' · ')}`);
});

test('**ولا مفتاحَ مكرّرًا في `DISOWNED`** — الأخيرُ يفوز صامتًا', () => {
  // وقع فعلًا أثناء هذا العمل: أُضيف `mason` وكان له مدخلٌ قائمٌ سلفًا،
  //   فابتلع الثاني الأوّلَ بلا أيّ خطأ — لا من المترجم ولا من الاختبارات.
  //   وأثرُه أنّ نزعًا كُتب ولم يقع، وهو أسوأُ من ألّا يُكتَب.
  const src = readFileSync(join(ROOT, 'src/lib/akg/kb/knowledgeExtra.ts'), 'utf8');
  const body = (src.match(/DISOWNED[^=]*=\s*\{([\s\S]*?)\n\};/) || ['', ''])[1];
  const keys = (body.match(/^ {2}(\w+):/gm) || []).map(k => k.trim().replace(':', ''));
  const dup = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  assert.deepEqual(dup, [], `مفاتيحُ مكرّرة — الأخيرُ يمحو ما قبله: ${dup.join(' · ')}`);
  assert.ok(keys.length > 0, 'لم يُقرأ `DISOWNED` أصلًا — الحارسُ يقيس الفراغ');
});

// ============================================================
// **وقتَ التشغيل، لا في الشكل.**
//
//   الحرّاسُ أعلاه يقرؤون `CONCEPTS` المدموجَ — وهو شكلُ بيانات. والمستخدمُ
//   لا يقرأ `CONCEPTS`: يكتب لفظًا فيمرُّ على `resolveConcept`. وقد قِيس
//   الفرقُ فعلًا: نزعٌ **صحيحٌ** في الشكل قتل حلَّ أربعةِ ألفاظٍ لاتينيّةٍ
//   تمامًا (`marbre` · `ferronnier` · `déménagement` · `informatique`)،
//   لأنّ المالكَ الفائزَ يخزّنها تحت `darija` والفهرسُ اللاتينيُّ لا يبلغها.
//   فلا يكفي أن يَصحَّ المالك: يجب أن **يُجيب**.
// ============================================================
const RUNTIME: Record<string, string> = {
  'automobile': 'car',
  'صيانة': 'car_service',
  'révision': 'car_service',
  'grocery store': 'grocer',
  'coffee shop': 'coffee_shop',
  'صباغة طوموبيل': 'car_painting',
  'كنصبغ السيارة': 'car_painting',
  'carrosserie peinture': 'car_painting',
  'دروكري': 'hardware_store',
  'quincaillerie': 'hardware_store',
  'كينكايري': 'hardware_store',
  'بياس': 'auto_parts',
  'بياسات': 'auto_parts',
  'قطع طوموبيلات': 'auto_parts',
  'قطع غيار السيارات': 'auto_parts',
  'مول السوارت': 'key_maker',
  'كيصايب السوارت': 'key_maker',
  'serrurier': 'key_maker',
  'خضار': 'greengrocer',
  'بائع أحذية': 'shoe_store',
  'magasin de chaussures': 'shoe_store',
  'مول الدجاج': 'poultry_seller',
  'مطبعة': 'print_shop',
  'طباعة': 'print_shop',
  'informatique': 'computer_repair',
  'فورماتاج': 'computer_repair',
  'تهيئة': 'computer_repair',
  'formatage': 'computer_repair',
  'formatting': 'computer_repair',
  'ألمنيوم': 'aluminum_fabricator_window_installer',
  'snack bar': 'snack_bar_restaurant',
  'building contractor': 'contractor',
  'لحام': 'blacksmith_welder',
  'مبيض': 'painter',
  'marbre': 'marble_granite_worker',
  'مول البني': 'mason',
  'bistro': 'cafe',
  'فران': 'bakery',
  'فرن': 'bakery',
  'جباس': 'plasterer',
  'كيدير الجبس': 'plasterer',
  'خراز': 'cobbler_shoe_repair',
  'cordonnier': 'cobbler_shoe_repair',
  'مول الصباط': 'shoe_seller',
  'مول الفرش': 'bedding_and_home_textiles_store',
  'كليماتيزور': 'air_conditioning_and_refrigeration_technician',
  'تصليح الثلاجات': 'air_conditioning_and_refrigeration_technician',
  'كليم': 'carpet_and_rug_seller',
  'agence immobilière': 'real_estate_agency',
  'انفورماتيك': 'computer_repair',
  'impression': 'print_shop',
  'كريش': 'daycare',
  'حضانة': 'daycare',
  'crèche': 'daycare',
  'بارابول': 'satellite_receiver',
  'ريسيفر': 'satellite_receiver',
  'parabole': 'satellite_receiver',
  'satellite': 'satellite_receiver',
  'حمام شعبي': 'traditional_hammam',
  'خيمة': 'event_equipment_rental',
  'منجرة': 'carpenter',
  'menuisier / ébéniste': 'carpenter_joiner',
};

test('**وكلُّ لفظٍ محسومٍ يُجيب بمالكه عبر `resolveConcept`**', () => {
  const bad: string[] = [];
  for (const [term, want] of Object.entries(RUNTIME)) {
    const r = resolveConcept(term) as { id?: string } | null;
    if (!r) { bad.push(`«${term}» لا يُحَلّ إطلاقًا — نُزع من الجميع ولم يُمنَح لأحد`); continue; }
    if (r.id !== want) bad.push(`«${term}» ⇒ ${r.id} بدل ${want}`);
  }
  assert.deepEqual(bad, [], 'ألفاظٌ لا تُجيب بمالكها:\n  ' + bad.join('\n  '));
});

// ولفظان مستثنيان من الحارس أعلاه، وسببُهما **ليس** التنازع:
//   «car service» ⇒ `car` و«photocopie» ⇒ `printing_shop_copy_center`.
//   كلتاهما كلمةٌ فرنسيّةٌ/إنجليزيّةٌ سليمة، يفكُّها `deArabizi` إلى حروفٍ
//   عربيّةٍ («كار سرفيك» · «فوتوكوبي») فيصطدم الفهرسُ العربيُّ — وهو
//   **يسبق** الفهرسَ اللاتينيّ — بلفظٍ قصيرٍ مصادفةً («كار»). فالمسارُ
//   اللاتينيُّ لا يُستشار أصلًا. وهذا عطبُ ترتيبٍ في `resolveConcept`
//   قائمٌ قبل هذا العمل وبعدَه (قِيس: نفسُ الجوابِ قبل النزع وبعده)،
//   ويُصلَح وحدَه لأنّ إصلاحَه يُغيّر مسارَ الفهمِ كلَّه لا جدولَ ملكيّة.

// ============================================================
// **والخادمُ يفهم كما يفهم العميل.**
//
//   الخادمُ لا يقرأ TS، فيقرأ `server/generated/builtin-variants.json` —
//   خريطةً مسطّحةً يُولّدها `knowledge-audit.mjs --emit-index`، ويقرؤها
//   `providers.js` و`conceptLearning.js`.
//
//   وكان المولِّدُ يفهرس **تسمياتِ** المفاهيم (`concept`) إلى جانب
//   متغيّراتها، في مرورٍ واحدٍ والأوّلُ يفوز. و`DISOWNED` ينزع من
//   `variants` ولا يمسّ `concept` — فالخاسرُ يستردُّ اللفظَ عند الخادم
//   بتسميته. قِيس بعد فضِّ العناقيد: **سبعةُ ألفاظٍ** يُحيلها الخادمُ إلى
//   الخاسرِ والعميلُ إلى الفائز، منها «خضار» و«بارابول» و«كريش».
//
//   وأثرُه ليس تجميليًّا: `providers.js` يُطابق مزوّدًا بهذا الفهرس،
//   و`conceptLearning` يرفض تعلُّمَ لفظٍ يراه مملوكًا — فيتعلّم الخادمُ
//   ويبحث على خريطةِ ملكيّةٍ تخالف ما يفهمه المستخدم.
// ============================================================
test('**وفهرسُ الخادم يُحيل كلَّ لفظٍ محسومٍ إلى مالكه نفسِه**', () => {
  // **تطبيعٌ منسوخٌ عن `knowledge-audit.mjs` عمدًا** — هو ما يُبنى به
  //   الفهرسُ، فلا يصلح تطبيعٌ آخر: لو اختلفا لصار الحارسُ يفحص مفاتيحَ
  //   غيرَ موجودةٍ ويمرُّ وهو أعمى. ولذلك يُشترَط أدناه ألّا يغيب مفتاح.
  const norm = (s: string) => String(s || '').toLowerCase().trim()
    .replace(/[ً-ٟ]/g, '').replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\u06AF|\u06AD/g, 'ك').replace(/\u06A4/g, 'ف').replace(/\u067E/g, 'ب')
    .replace(/\s+/g, ' ');
  const map: Record<string, string> =
    JSON.parse(readFileSync(join(ROOT, 'server/generated/builtin-variants.json'), 'utf8'));
  assert.ok(Object.keys(map).length > 1000, 'لم يُقرأ فهرسُ الخادم أصلًا — الحارسُ يقيس الفراغ');

  const bad: string[] = [], missing: string[] = [];
  for (const [term, want] of Object.entries(RESOLVED)) {
    const got = map[norm(term)];
    if (got === undefined) missing.push(term);
    else if (got !== want) bad.push(`«${term}» الخادمُ ⇒ ${got} والمالكُ ${want}`);
  }
  assert.deepEqual(missing, [], 'ألفاظٌ غائبةٌ عن فهرس الخادم — شغّل `npm run gen:variants`:\n  ' + missing.join(' · '));
  assert.deepEqual(bad, [], 'الخادمُ والعميلُ يختلفان على المالك:\n  ' + bad.join('\n  '));
});
