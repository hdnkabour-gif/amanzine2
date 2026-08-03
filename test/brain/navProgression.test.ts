import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRevealed, hiddenCount, CORE_PAGES, rememberVisit, type NavEvidence } from '../../src/lib/navProgression';
import { PAGE_IDS, type Page } from '../../src/types';

// ============================================================
// القائمةُ تكبر مع المستخدم — HU-7/HU-5.
//   خطران يحرسهما هذا الملفّ: أن تُخفى أداةٌ يحتاجها صاحبُها الآن، وأن
//   تختفي أداةٌ ظهرت من قبل. كلاهما أسوأُ من القائمة الطويلة.
// ============================================================

const EMPTY: NavEvidence = { products: 0, services: 0, orders: 0, customers: 0 };

test('الوافدُ الجديد يرى البابَ والحوارَ والحساب — لا أدواتِ متجرٍ لا يملكه', () => {
  for (const p of CORE_PAGES) {
    assert.equal(isRevealed(p, EMPTY), true, `${p} يجب أن تُرى من الثانية الأولى`);
  }
  for (const p of ['coupons', 'banner', 'wallet', 'delivery', 'insights'] as Page[]) {
    assert.equal(isRevealed(p, EMPTY), false, `${p} تُعرَض على مَن لا متجرَ له`);
  }
});

test('القسمُ يظهر حين يصير له معنى — لا بمرور الوقت', () => {
  const withProducts: NavEvidence = { ...EMPTY, products: 3 };
  assert.equal(isRevealed('products', withProducts), true);
  assert.equal(isRevealed('coupons', withProducts), true, 'الخصمُ يعني شيئًا حين يوجد ما يُخصَم');
  assert.equal(isRevealed('delivery', withProducts), false, 'ولا توصيلَ بلا طلب');

  const withOrders: NavEvidence = { ...EMPTY, orders: 1 };
  assert.equal(isRevealed('delivery', withOrders), true);
  assert.equal(isRevealed('insights', withOrders), true);
});

test('الخدماتُ تُظهِر الحجوزات، والمنتجاتُ وحدَها لا', () => {
  assert.equal(isRevealed('services', { ...EMPTY, products: 5 }), false, 'منتجاتٌ ليست خدمات');
  assert.equal(isRevealed('services', { ...EMPTY, products: 5, services: 1 }), true);
  assert.equal(isRevealed('bookings', { ...EMPTY, services: 1 }), true);
});

test('ما ظهر لا يختفي — حذفُ منتجاتِك لا يسحب صفحتَها', () => {
  const visited: Page[] = ['products', 'coupons'];
  assert.equal(isRevealed('products', { ...EMPTY, visited }), true);
  assert.equal(isRevealed('coupons', { ...EMPTY, visited }), true);
  assert.equal(isRevealed('wallet', { ...EMPTY, visited }), false, 'ما لم يُزَر يبقى مخفيًّا');
});

test('الزيارةُ تُسجَّل مرّةً ولا تتضخّم', () => {
  const a = rememberVisit('products' as Page, []);
  assert.deepEqual(a, ['products']);
  const b = rememberVisit('products' as Page, a);
  assert.equal(b, a, 'نفسُ المرجع — لا إعادةَ رسمٍ بلا سبب');
});

test('العدّادُ يقول كم بقي مخفيًّا — فلا يبدو الزرُّ زخرفة', () => {
  const all = PAGE_IDS as readonly Page[];
  const n = hiddenCount([...all], EMPTY);
  assert.ok(n > 0, 'الوافدُ الجديد لا بدّ أن يكون عنده مخفيّ');
  assert.equal(hiddenCount([...all], { products: 9, services: 9, orders: 9, customers: 9 }),
    hiddenCount([...all], { products: 9, services: 9, orders: 9, customers: 9 }),
    'الدالّةُ نقيّة');
});

test('لا صفحةَ تُخفى بلا قاعدةٍ صريحة — الافتراضُ الظهور', () => {
  // صفحةٌ لم تُذكر في `REVEALS` ولا في الأساسيّات: تظهر. الإخفاءُ قرارٌ يُكتَب،
  // لا أثرٌ جانبيٌّ لنسيانِ سطر.
  assert.equal(isRevealed('moderation' as Page, EMPTY), true);
  assert.equal(isRevealed('knowledge' as Page, EMPTY), true);
});
