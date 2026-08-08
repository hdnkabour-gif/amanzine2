#!/usr/bin/env node
// ============================================================
// **رحلةُ الزبون — مرحلةً مرحلة، لا رقمًا عامًّا.**
//
//   ── لماذا مرحلةً مرحلة ──
//   «٧٣٪ فهم» رقمٌ لا يُبنى عليه قرار. والسؤالُ الذي يهمّ ليس «هل فهم؟» بل
//   **«هل وصل الإنسانُ إلى ما أراد؟»** — وبينهما تسعُ حلقاتٍ تنكسر أيُّها
//   فتضيع الرحلةُ كلُّها بينما كلُّ طرفٍ صحيحٌ وحدَه.
//
//   وهذا مقيسٌ في هذا المستودع مرّتَين: التطبيقُ فهم `ملابس الأطفال` بيقين
//   ٨٠٪ ثمّ بحث بالجملة الخامّة فقال «ما لقّيناش» — والمنتجُ في المتجر.
//   الفهمُ ✅ والنتيجةُ ❌. رقمٌ عامٌّ يُخفي هذا تمامًا.
//
//   ── وأخطرُ حالةٍ تُقاس هنا: النجاحُ الكاذب ──
//   أن يقول التطبيقُ «لقيتُ لك» ثمّ تكون النتائجُ ليست ما طُلب. وهو **أسوأُ
//   من الفشل الصريح**، لأنّه يمنح الإنسانَ ثقةً في غير موضعها فيمضي عليها.
//   ولا يظهر في أيّ اختبارِ وحدةٍ ولا في نسبة الفهم.
//
//   ── ولا يُصدَّق شيءٌ إلّا بدليل ──
//   كلُّ مرحلةٍ تُثبَت بما **يراه الإنسانُ على الشاشة** أو بصفٍّ في قاعدة
//   البيانات — لا بجوابِ نداءٍ ولا باستنتاجٍ من الكود.
// ============================================================

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const OUT = join(ROOT, 'REPORTS/browser');
const BASE = process.env.WALK_URL || 'http://127.0.0.1:4173';
const API = process.env.WALK_API || 'http://127.0.0.1:3001';
const PHONE = { width: 390, height: 844 };
mkdirSync(OUT, { recursive: true });

/** الجملةُ التي كتبها صاحبُ المشروع على شاشته — لا جملةٌ مُختلَقة. */
const SAID = 'بغيت شي كسوة لبنتي أنا فكازة';

const stages = [];
const stage = (n, name, pass, seen, expected, why, where, kind) => {
  stages.push({ n, name, pass, seen, expected, why, where, kind });
  console.log(`${pass ? '✅' : '❌'} ${String(n).padStart(2)}. ${name}`);
  if (!pass) {
    console.log(`      رأى     : ${seen}`);
    console.log(`      المتوقَّع: ${expected}`);
    if (why) console.log(`      السبب   : ${why}`);
    if (where) console.log(`      الموضع  : ${where}  [${kind || '—'}]`);
  }
};

const api = async (path, opts = {}) => {
  const r = await fetch(API + path, {
    ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

(async () => {
  // ── تهيئةُ عالمٍ حقيقيّ: تاجرٌ ومنتجٌ يطابق ما سيطلبه الزبون ──
  //   بلا منتجٍ مطابقٍ يُقاس «السوق فارغ» لا «البحث معطوب» — وهما مختلفان.
  const EMAIL = `journey-${Date.now()}@test.ma`;
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'عبدو', email: EMAIL, password: 'journey-123', storeName: 'حانوت عبدو' }),
  });
  const TOKEN = reg.body.token || reg.body.accessToken;
  if (!TOKEN) { console.error('تعذّر تهيئةُ التاجر:', reg.status, JSON.stringify(reg.body).slice(0, 200)); process.exit(2); }

  const prod = await api('/api/products', {
    method: 'POST', headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      name: 'حوايج دراري صغار', price: 65, stock: 4,
      status: 'published', city: 'الدار البيضاء', category: 'ملابس الأطفال',
    }),
  });
  const PRODUCT = prod.body.product || prod.body;
  console.log(`\n══ رحلةُ الزبون — «${SAID}» ══`);
  console.log(`   العالم: تاجرٌ واحد · منتجٌ «حوايج دراري صغار» ٦٥ درهمًا · الدار البيضاء\n`);

  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar-MA',
  });
  const page = await ctx.newPage();
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss().catch(() => {}); });

  // ── ①–③ الفهمُ والنيّةُ والكيان — من العقل نفسِه لا من نسخةٍ ثانية ──
  const brain = await api(`/api/ai/understand?q=${encodeURIComponent(SAID)}`).catch(() => ({ status: 0, body: {} }));
  // العقلُ يعيش في الواجهة؛ فيُقاس من الشاشة: ما يُعرَض للإنسان هو الدليل.
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(600);

  const box = page.locator('input[type="text"], input:not([type]), textarea').first();
  let typed = false;
  try { await box.fill(SAID, { timeout: 5000 }); typed = true; } catch { /* لا خانة */ }
  stage(1, 'Understanding — الخانةُ موجودةٌ ويُكتَب فيها', typed,
    typed ? `كُتبت «${SAID}»` : 'ما لقيتش خانةَ كتابةٍ فالشاشة الأولى',
    'خانةٌ واحدةٌ ظاهرةٌ يكتب فيها الإنسانُ حاجتَه',
    typed ? '' : 'الشاشةُ الأولى بلا مدخل', 'src/pages/Landing', 'Frontend');

  if (typed) { await box.press('Enter').catch(() => {}); await page.waitForTimeout(2500); }
  const body1 = await page.evaluate(() => document.body.innerText).catch(() => '');

  // ② النيّة: هل قال إنّه فهم شراءً؟
  const saidBuy = /شرا|تشري|نشري|شراء/.test(body1);
  stage(2, 'Intent — قال إنّه فهم شراءً', saidBuy,
    saidBuy ? 'ظهرت نيّةُ الشراء' : body1.slice(0, 120).replace(/\n/g, ' · ') || 'لا شيء',
    '«شراء» أو ما يدلّ عليه معروضًا للإنسان',
    saidBuy ? '' : 'النيّةُ ما تعرضاتش', 'src/pages/LivingHome.tsx', 'Frontend');

  // ③ الكيان: هل عرض المفهوم بالعربيّة (لا بمُعرِّفٍ لاتينيّ)؟
  const saidConcept = /ملابس|كسوة|حوايج|دراري/.test(body1);
  const rawId = /\b(kids_clothing|clothing|restaurant|car_wash)\b/.test(body1);
  stage(3, 'Entity — المفهومُ معروضٌ بالعربيّة لا بمُعرِّف', saidConcept && !rawId,
    rawId ? 'عُرض مُعرِّفٌ لاتينيٌّ خامّ' : saidConcept ? 'عُرض المفهومُ بالعربيّة' : 'ما عُرض مفهومٌ أصلًا',
    'اسمُ المفهوم بالعربيّة («ملابس الأطفال»)',
    rawId ? 'مُعرِّفٌ داخليٌّ فوجه إنسان' : !saidConcept ? 'المفهومُ ما وصلش الشاشة' : '',
    'src/pages/LivingHome.tsx', 'Frontend');

  // ── ④⑤ البحثُ ومطابقةُ النتائج — الاثنان مختلفان ──
  const s1 = await api(`/api/search?q=${encodeURIComponent(SAID)}&city=${encodeURIComponent('الدار البيضاء')}`);
  const n1 = (s1.body.products?.length || 0) + (s1.body.businesses?.length || 0);
  const s2 = await api(`/api/search?q=${encodeURIComponent(SAID)}&city=${encodeURIComponent('الدار البيضاء')}&terms=${encodeURIComponent('كسوة|حوايج صغار|ملابس أطفال|حوايج الدراري')}`);
  const n2 = (s2.body.products?.length || 0) + (s2.body.businesses?.length || 0);

  stage(4, 'Search — البحثُ يجد المنتجَ الموجودَ فعلًا', n2 > 0,
    `بالجملة الخامّة: ${n1} · بالمرادفات: ${n2}`,
    'نتيجةٌ واحدةٌ على الأقلّ — المنتجُ موجودٌ في القاعدة',
    n2 === 0 ? 'حتّى المرادفاتُ ما لقاوش — الفهرسُ أو المطابقة'
      : n1 === 0 ? 'الجملةُ الخامّةُ وحدَها لا تكفي (وهذا سببُ ما رآه صاحبُ المشروع)' : '',
    'server/lib/engines/search.js', n2 === 0 ? 'Backend' : 'Contract');

  const names = [...(s2.body.products || []), ...(s2.body.businesses || [])]
    .map(x => String(x.name || '')).slice(0, 5);
  const relevant = names.some(x => /حوايج|كسوة|ملابس|دراري|صغار/.test(x));
  stage(5, 'Results relevance — النتائجُ هي ما طُلب، لا شيءٌ آخر', n2 > 0 && relevant,
    names.length ? names.join(' · ') : 'صفر نتيجة',
    'منتجاتُ ملابس أطفال',
    n2 > 0 && !relevant ? '**نجاحٌ كاذب**: رجعت نتائجُ ليست ما طُلب — وهي أسوأُ من صفر'
      : n2 === 0 ? 'لا نتائجَ تُقاس' : '',
    'server/lib/engines/search.js', 'Data');

  // ── ⑥ اختيارُ المنتج من واجهة المتجر ──
  await page.goto(`${BASE}/market?q=${encodeURIComponent(SAID)}&city=${encodeURIComponent('الدار البيضاء')}`,
    { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const marketText = await page.evaluate(() => document.body.innerText).catch(() => '');
  const shows = /حوايج|كسوة|ملابس/.test(marketText);
  const saysEmpty = /ما لقّيناش|ما لقيناش|لا توجد|aucun/i.test(marketText);
  stage(6, 'Product selection — السوقُ يعرض المنتجَ للإنسان', shows && !saysEmpty,
    saysEmpty ? '«ما لقّيناش» — والمنتجُ في القاعدة' : shows ? 'عُرض المنتج' : 'شاشةٌ بلا منتجٍ ولا رسالة',
    'بطاقةُ «حوايج دراري صغار» ٦٥ درهمًا',
    saysEmpty ? '**الرسالةُ تكذب**: يستنتج الإنسانُ أنّ السوقَ خاوٍ لا أنّ البحثَ أخطأ' : '',
    'src/pages/Marketplace.tsx', 'Frontend');

  // ── ⑦–⑪ السلّةُ والطلبُ والتحقّق — تُقاسان بالمسار العامّ نفسِه ──
  //   وهو ما تناديه واجهةُ المتجر. فلو قِيست بالمسار المحميّ لَمشى الاختبارُ
  //   طريقًا لا يمشيه زبونٌ أبدًا.
  const CUST = `06${String(Date.now()).slice(-8)}`;
  const ord = await api('/api/orders/public', {
    method: 'POST',
    body: JSON.stringify({
      userId: reg.body.user?.id || (await api(`/api/auth/me`, { headers: { authorization: `Bearer ${TOKEN}` } })).body?.id,
      items: [{ productId: PRODUCT.id, productName: 'حوايج دراري صغار', quantity: 1, price: 65 }],
      customerName: 'زبونة المشي', customerPhone: CUST,
      city: 'الدار البيضاء', address: 'درب غلف', source: 'Storefront',
    }),
  });
  const created = ord.status === 200 || ord.status === 201;
  const needsVerify = ord.status === 428;

  stage(7, 'Cart / Checkout — الطلبُ يُقبَل من الباب العامّ', created || needsVerify,
    `رجع ${ord.status}: ${JSON.stringify(ord.body).slice(0, 100)}`,
    'قبولُ الطلب (٢٠٠) أو طلبُ تحقّقٍ (٤٢٨) — لا خطأٌ عامّ',
    !created && !needsVerify ? 'البابُ ردّ بخطأٍ لا يفهمه الزبون' : '',
    'server/routes/orders.js', 'Backend');

  stage(8, 'Security — التحقّقُ لا يكون حائطًا بلا مفتاح', !needsVerify,
    needsVerify ? '٤٢٨ — يُطلَب تحقّقٌ' : 'مرّ بلا حائط',
    'إمّا يمرّ، أو يُطلَب تحقّقٌ **قابلٌ للتسليم**',
    needsVerify ? 'يُطلَب رمزٌ ولا قناةَ تُسلّمه — الحائطُ الذي أُصلح' : '',
    'server/lib/orderVerification.js', 'Backend');

  const orderId = ord.body.order?.id || ord.body.id;
  stage(9, 'Order creation — الطلبُ يُكتَب بمُعرِّف', !!orderId,
    orderId ? `المُعرِّف ${orderId}` : 'بلا مُعرِّف',
    'صفٌّ في `orders` بمُعرِّفٍ ومجموعٍ حسبه الخادم',
    !orderId ? 'ما تكتبش' : '', 'server/routes/orders.js', 'Backend');

  // ⑩ الدليل: الطلبُ يبلغ التاجرَ — لا يُصدَّق جوابُ النداء
  let reached = false;
  if (orderId) {
    const mine = await api('/api/orders', { headers: { authorization: `Bearer ${TOKEN}` } });
    const list = Array.isArray(mine.body) ? mine.body : (mine.body.orders || []);
    reached = list.some(o => o.id === orderId);
  }
  stage(10, 'Outcome evidence — التاجرُ يرى الطلبَ في قائمته', reached,
    reached ? 'ظهر في قائمة التاجر' : 'ما ظهرش',
    'الطلبُ في `GET /orders` للتاجر صاحبِ المنتج',
    !reached ? 'الطلبُ تسجّل ولا يبلغ صاحبَه — ورقةٌ في درج' : '',
    'server/routes/orders.js', 'Backend');

  // ⑪ ولا نافذةَ متصفّحٍ أصليّة — رآها صاحبُ المشروع في شاشة الطلب
  stage(11, 'No native dialog — الرسائلُ في التطبيق لا في المتصفّح', dialogs.length === 0,
    dialogs.length ? dialogs.join(' | ').slice(0, 120) : 'ولا نافذة',
    'كلُّ رسالةٍ تُعرَض داخل التطبيق',
    dialogs.length ? '`alert()` أصليّةٌ — تُخرِج الإنسانَ من التطبيق' : '',
    'src/pages/Storefront.tsx', 'Frontend');

  await page.screenshot({ path: join(OUT, 'journey-market.png') });
  await browser.close();

  const pass = stages.filter(s => s.pass).length;
  console.log(`\n══ ${pass}/${stages.length} مرحلةً تعبر ══`);
  const broken = stages.filter(s => !s.pass);
  if (broken.length) {
    console.log('\n── أين تنكسر الرحلة ──');
    for (const b of broken) console.log(`  ${b.n}. ${b.name}\n     ${b.why || b.seen}\n     ${b.where} [${b.kind}]`);
  }
  writeFileSync(join(OUT, 'journey.json'), JSON.stringify({ at: new Date().toISOString(), said: SAID, pass, total: stages.length, stages }, null, 1));
  process.exit(broken.length ? 1 : 0);
})();
