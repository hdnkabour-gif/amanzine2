'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseFilters, money } = require('../lib/searchFilters');
const { applyFilters } = require('../lib/engines/search');

// ============================================================
// المرشِّحاتُ تصل من البابَين — ولا تبتلع النتائجَ صامتة.
//
//   ── ما كشفه القياس ──
//   `/api/discover` هو **الطريقُ الذي تسلكه المحادثة** (`DiscoverSections`).
//   وكان يقرأ `city` و`q` و`terms` ثمّ يُسقط كلَّ ما عداه. والواجهةُ ترسل
//   `category` منذ كُتبت `toSearchParams`: تُرسَل، وتصل، وتُرمى. لا خطأً
//   يظهر ولا نتيجةً تتحسّن.
//
//   ── والصفرُ ليس «بلا حدّ» ──
//   `+qs.priceMax || 0` تجعل كلَّ قيمةٍ فاسدةٍ **سقفًا بصفر**، فتُحجَب كلُّ
//   سلعةٍ لها ثمن. مرشِّحٌ يبتلع النتائجَ بلا سببٍ أسوأُ من غيابه: الإنسانُ
//   يرى فراغًا ولا يعرف أنّ السببَ حرفٌ في الرابط.
// ============================================================

const CODE = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')
  .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

// ── ① المبلغُ الفاسدُ يُهمَل لا يُطبَّق ────────────────────────
test('قيمةٌ فاسدةٌ لا تصير سقفًا بصفر', () => {
  for (const bad of ['abc', 'NaN', '-5', '0', 'null', '  ']) {
    const f = parseFilters({ priceMax: bad });
    assert.equal(f.priceMax, undefined, `«${bad}» صارت سقفًا — تُحجَب كلُّ سلعةٍ لها ثمن`);
  }
  assert.equal(money('1e999'), undefined, 'مبلغٌ خارجُ العقل قُبل');
});

test('والمبلغُ الصحيحُ يمرّ كما هو', () => {
  assert.equal(parseFilters({ priceMax: '200' }).priceMax, 200);
  assert.equal(parseFilters({ priceMax: '10,000' }).priceMax, 10000);
  assert.equal(parseFilters({ priceMin: '50', priceMax: '200' }).priceMin, 50);
});

test('ولا مفتاحَ حيث لا قيمة', () => {
  const f = parseFilters({ city: 'الرباط' });
  assert.equal('priceMax' in f, false);
  assert.equal('priceMin' in f, false);
});

// ── ② السقفُ يُطبَّق فعلًا على المعروض ─────────────────────────
test('السقفُ يحجب ما فوقه ويُبقي ما تحته', () => {
  const rows = [{ id: 'a', price: 150 }, { id: 'b', price: 250 }, { id: 'c', price: 200 }];
  const out = applyFilters(rows, parseFilters({ priceMax: '200' })).map(r => r.id);
  assert.deepEqual(out, ['a', 'c'], 'السقفُ لا يُطبَّق — أو يحجب المساويَ له');
});

// ── ③ البابان يقرآن قارئًا واحدًا ──────────────────────────────
test('**«discover» يمرّر المرشِّحات** — بابُ المحادثة كان يُسقطها', () => {
  const src = CODE('routes/discover.js');
  assert.match(src, /parseFilters/, '«discover» لا يقرأ المرشِّحاتِ أصلًا');
  assert.match(src, /execute\([^)]*filters/s,
    'المرشِّحاتُ تُقرأ ولا تُمرَّر إلى المحرّك — تُرمى بعد قراءتها');
});

test('ولا نسخةَ ثانيةً من قارئ المرشِّحات', () => {
  // نسختان تنحرفان بصمت: تُصلَح واحدةٌ ويبقى البابُ الآخرُ على عطبه.
  for (const p of ['routes/search.js', 'routes/discover.js']) {
    const src = CODE(p);
    assert.match(src, /require\(['"]\.\.\/lib\/searchFilters['"]\)/, `${p} لا يقرأ القارئَ المشترك`);
    assert.doesNotMatch(src, /function\s+parseFilters/, `${p} يحمل نسخةً ثانيةً من القارئ`);
  }
});
