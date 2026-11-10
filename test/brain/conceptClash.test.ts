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

const norm = (x: string) => String(x || '').toLowerCase().trim();

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
};

test('**كلُّ لفظٍ مفضوضٍ يُحسَم لمفهومٍ واحدٍ بعينه**', () => {
  const cl = clashes();
  const still: string[] = [];
  for (const [term, expected] of Object.entries(RESOLVED)) {
    const owners = CONCEPTS.filter(c =>
      Object.values(c.variants || {}).some(l => (l || []).some(t => norm(t) === term))
    ).map(c => c.id);
    if (owners.length === 0) { still.push(`«${term}» اختفى تمامًا — نُزع من الجميع`); continue; }
    if (owners.length > 1) { still.push(`«${term}» ما زال متنازَعًا: ${owners.join(' ⟷ ')}`); continue; }
    if (owners[0] !== expected) still.push(`«${term}» ⇒ ${owners[0]} بدل ${expected}`);
  }
  assert.deepEqual(still, [], 'ألفاظٌ لم تُفَضّ:\n  ' + still.join('\n  '));
  void cl;
});

test('**والتنازعُ الكلّيُّ لا يزيد** — سقفٌ يَنزل ولا يَصعد', () => {
  // ١٢٩ كان قبل الفضّ. السقفُ ١٠٥ لأنّ ٤٥ عنقودًا لم تُفحَص بعد؛
  //   ولا يُرفَع هذا الرقمُ أبدًا — يُفَضّ عنقودٌ آخرُ ويُخفَّض.
  const n = clashes().size;
  assert.ok(n <= 105, `التنازعُ ${n} لفظًا — كان يجب ألّا يتجاوز ١٠٥`);
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
