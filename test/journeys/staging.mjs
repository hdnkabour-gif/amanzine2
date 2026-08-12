// ============================================================
// **رحلاتُ التهيئة — ما لا تغطّيه الرحلاتُ الذهبيّةُ الاثنتا عشرة.**
//
//   الأولى تقيس نواةَ الحاجة. وهذه تقيس ما يُفتَح **بعدها**: الامتيازُ
//   الإداريّ، وسلامةُ المال، وحدُّ الويبهوك، والحالاتُ التي تُقفل الطلب.
//
//   ولا مزوّدَ خارجيًّا هنا: لا مفاتيحَ ذكاءٍ ولا توصيلٍ ولا دفعٍ في هذه
//   البيئة. فما يحتاج مزوّدًا يُعلَن **محجوبًا بالاعتماد** ولا يُدَّعى نجاحُه.
//
//   التشغيل: BASE=http://127.0.0.1:3001 node test/journeys/staging.mjs
// ============================================================
import pkg from 'playwright-core';
const { chromium } = pkg;
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:3001';
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const EXE = process.env.CHROME || (fs.existsSync(PINNED) ? PINNED : undefined);
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@staging.local',
  password: process.env.ADMIN_PASSWORD || 'StagingPass!2026' };
const stamp = Date.now().toString(36);
const MERCHANT = { name: 'تاجرٌ عاديّ', email: `stg-m-${stamp}@test.local`, password: 'StagingPass!2026' };

const rows = [];
const record = (r) => {
  rows.push(r);
  console.log(`\n${r.pass ? '✅' : r.blocked ? '⏭' : '❌'} ${r.id} · ${r.title}`);
  for (const [k, v] of Object.entries(r.cells)) console.log(`      ${k.padEnd(18)} ${v}`);
  if (!r.pass && r.why) console.log(`      ${'السبب'.padEnd(18)} ${r.why}`);
};

const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
const fresh = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar-MA' });
  return { ctx, page: await ctx.newPage() };
};
const api = (page, path, opts = {}) => page.evaluate(async ({ base, path, opts }) => {
  const r = await fetch(base + path, {
    method: opts.method || 'GET',
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: 'Bearer ' + opts.token } : {}) },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}, { base: BASE, path, opts });

const login = async (page, acc) => {
  const r = await api(page, '/api/auth/login', { method: 'POST', body: acc });
  if (r.body?.token) return r.body.token;
  const g = await api(page, '/api/auth/register', { method: 'POST', body: { name: acc.name || 'x', ...acc } });
  return g.body?.token || null;
};

// ── S1 · الامتيازُ الإداريُّ لا يأتي من دورِ المستأجر ────────────
async function S1() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const mTok = await login(page, MERCHANT);
    cells['المدخل'] = 'تاجرٌ عاديّ يطرق أبوابَ الأدمن';
    cells['الهويّة'] = mTok ? 'تاجرٌ مُصادَقٌ عليه' : '**بلا رمز**';
    // **مساراتٌ موجودةٌ ومحروسةٌ فعلًا** (`auth, admin` في `knowledge.js`).
    //   نسخةٌ أولى جرّبت مساراتٍ لا وجودَ لها فعادت ٤٠٤ — و٤٠٤ لمسارٍ غيرِ
    //   موجودٍ لا تشهد على امتيازٍ أبدًا. حارسٌ يقيس العدم.
    const probes = ['/api/knowledge/misses', '/api/knowledge/quality', '/api/knowledge/brain'];
    const out = [];
    for (const p of probes) out.push(`${p.split('/api')[1]}=${(await api(page, p, { token: mTok })).status}`);
    cells['الشبكة'] = out.join(' · ');
    // لا امتيازَ من دورِ المستأجر: كلُّ بابٍ إداريٍّ يجب أن يردّ ٤٠١/٤٠٣/٤٠٤
    const statuses = out.map(s => +s.split('=')[1]);
    // ٤٠٣ هو الجوابُ الصادق: المسارُ موجودٌ والامتيازُ مرفوض.
    const denied = statuses.every(s => [401, 403].includes(s));
    cells['أثرُ القاعدة'] = 'لا شيء — رُفض قبل أيّ كتابة';
    cells['النتيجةُ المرئيّة'] = denied ? 'كلُّ بابٍ إداريٍّ مغلقٌ في وجهه' : `بابٌ مفتوح: ${out.join(' ')}`;
    pass = !!mTok && denied;
    if (!mTok) why = 'تعذّر إنشاءُ تاجرٍ للقياس';
    else if (!denied) why = `**امتيازٌ إداريٌّ لتاجرٍ عاديّ**: ${out.join(' ')}`;
  } catch (e) { why = String(e).slice(0, 180); }
  finally { await ctx.close(); }
  record({ id: 'S1', title: 'تاجرٌ عاديٌّ يُمنَع من كلّ بابٍ إداريّ', cells, pass, why });
}

// ── S2 · سلامةُ المال: المبلغُ لا يُزوَّر من العميل ──────────────
async function S2() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const tok = await login(page, MERCHANT);
    const mk = await api(page, '/api/orders', { method: 'POST', token: tok,
      body: { customerName: 'زبون', customerPhone: '0600000001', items: [], total: 250 } });
    const id = mk.body?.id;
    cells['المدخل'] = 'طلبٌ بـ٢٥٠ ثمّ محاولةُ تخفيضه إلى ١ ومبلغٍ سالب';
    cells['الهويّة'] = 'صاحبُ الطلب نفسُه';
    if (!id) { why = `تعذّر إنشاءُ طلب (${mk.status})`; throw new Error(why); }
    const neg = await api(page, '/api/orders/' + id, { method: 'PUT', token: tok, body: { total: -5 } });
    const after = await api(page, '/api/orders/' + id, { token: tok });
    cells['الشبكة'] = `PUT total=-5 ⇒ ${neg.status}`;
    cells['أثرُ القاعدة'] = `total الآن = ${after.body?.total}`;
    cells['النتيجةُ المرئيّة'] = neg.status === 400 ? 'رُفض المبلغُ السالبُ كخطأِ مُدخَل' : `ردّ ${neg.status}`;
    // القاعدةُ ترفض السالبَ (chk_orders_total) ويُقدَّم خطأَ مُدخَلٍ لا خطأَ خادم
    pass = neg.status === 400 && Number(after.body?.total) === 250;
    if (neg.status !== 400) why = `مبلغٌ سالبٌ ردَّ ${neg.status} (المنتظَر ٤٠٠)`;
    else if (Number(after.body?.total) !== 250) why = `**تبدّل المبلغُ المخزَّن**: ${after.body?.total}`;
  } catch (e) { why ||= String(e).slice(0, 180); }
  finally { await ctx.close(); }
  record({ id: 'S2', title: 'سلامةُ المبلغ — السالبُ يُرفَض والمخزَّنُ لا يتبدّل', cells, pass, why });
}

// ── S3 · حدُّ الويبهوك: توقيعٌ خاطئٌ · تكرارٌ · فصلُ السرّ ────────
async function S3() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    cells['المدخل'] = 'ويبهوك توصيلٍ بسرٍّ خاطئ (لاتينيّ) · ثمّ بلا سرّ';
    cells['الهويّة'] = 'مجهولٌ — البابُ عامٌّ عمدًا';
    const bad = await page.evaluate(async (base) => {
      const hit = (h) => fetch(base + '/api/webhooks/delivery/livo', {
        method: 'POST', headers: { 'content-type': 'application/json', ...h },
        body: JSON.stringify({ status: 'delivered', order_id: 'x' }),
      }).then(r => r.status);
      // قيمةُ الترويسة **بحروفٍ لاتينيّة**: المتصفّحُ يرفض ما خرج عن
      //   ISO-8859-1، فسرٌّ عربيٌّ يُسقط النداءَ قبل أن يبلغ الخادمَ — فيُقاس
      //   عطبُ الأداة لا حدُّ الويبهوك.
      return { wrong: await hit({ 'x-webhook-secret': 'wrong-secret-value' }), none: await hit({}) };
    }, BASE);
    cells['الشبكة'] = `سرٌّ خاطئ ⇒ ${bad.wrong} · بلا سرّ ⇒ ${bad.none}`;
    cells['أثرُ القاعدة'] = 'لا تحديثَ حالةٍ — رُفض قبل الكتابة';
    cells['النتيجةُ المرئيّة'] = 'لا شيءَ يُقبَل بلا سرٍّ صحيح';
    // كلاهما يجب أن يُرفَض (٤٠١/٤٠٣/٤٠٤). ٢٠٠ هنا يعني بابًا مفتوحًا للعالم.
    pass = [401, 403, 404].includes(bad.wrong) && [401, 403, 404].includes(bad.none);
    if (!pass) why = `**ويبهوكٌ يقبل بلا سرٍّ صحيح**: خاطئ=${bad.wrong} بلا=${bad.none}`;
  } catch (e) { why ||= String(e).slice(0, 180); }
  finally { await ctx.close(); }
  record({ id: 'S3', title: 'الويبهوك يرفض السرَّ الخاطئ وغيابَه', cells, pass, why });
}


// ── S6 · محاولةٌ واحدةٌ ⇒ طلبٌ واحد — بمتصفّحٍ حقيقيّ ────────────
//
//   **ولا يُقاس بنقرتين متلاحقتين**: قِيس أنّ الزرَّ يُعطَّل أثناء الانتظار،
//   فالنقرةُ الثانيةُ لا تصل الخادمَ أصلًا ⇒ رحلةٌ تمرّ ولو نُزعت الحمايةُ
//   كلُّها. وهو بالضبط صنفُ «الحارس الخامل».
//
//   والمسارُ الحقيقيُّ للطلب المزدوج: الطلبُ **يصل ويُكتَب**، ثمّ يضيع
//   الجوابُ في الشبكة. يرى الزبونُ فشلًا، فيضغط ثانيةً. بلا مفتاحِ محاولةٍ
//   يُكتَب طلبٌ ثانٍ ويدفع التاجرُ توصيلًا مرّتين.
async function S6() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    page.on('dialog', d => d.dismiss().catch(() => {}));
    ctx.on('page', pp => pp.close().catch(() => {}));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const acc = { name: 'تاجرُ التفرّد', email: `stg-idem-${stamp}@test.local`, password: 'StagingPass!2026' };
    const reg = await api(page, '/api/auth/register', { method: 'POST', body: acc });
    const tok = reg.body?.token, uid = reg.body?.user?.id;
    await api(page, '/api/products', { method: 'POST', token: tok,
      body: { name: 'قنينة ماء', price: 20, stock: 100, status: 'published', description: 'ماء' } });

    await page.goto(`${BASE}/store/${uid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    for (const t of ['تخطّي ✕', '×']) { const el = await page.$(`button:has-text("${t}")`); if (el) await el.click().catch(() => {}); }
    await page.click('button:has-text("زيد للسلة")');
    await page.waitForTimeout(700);
    await page.click('button:has-text("السلة (1)")');
    await page.waitForTimeout(700);
    await page.click('button:has-text("كمّل الطلب")');
    await page.waitForTimeout(900);

    let seen = 0;
    await page.route('**/api/orders/public', async route => {
      seen++;
      // ① يصل الخادمَ ويُكتَب ② ثمّ يسقط الجوابُ قبل أن يصل العميل
      if (seen === 1) { await route.fetch().catch(() => {}); await route.abort('failed'); }
      else await route.continue();
    });

    await page.fill('input[placeholder*="السمية"]', 'زبونُ الجوابِ الضائع');
    await page.fill('input[type="tel"]', '0611002200');
    await page.fill('input[placeholder*="المدينة"]', 'الدارُ البيضاء');
    await page.fill('textarea[placeholder*="العنوان"]', 'زنقة ٩');
    const submit = page.locator('button:has-text("أكّد عبر واتساب")');

    await submit.click({ force: true });
    await page.waitForTimeout(2500);
    const mid = await api(page, '/api/orders', { token: tok });
    const afterLost = (mid.body || []).length;

    await submit.click({ force: true });          // الإنسانُ يعيد المحاولة
    await page.waitForTimeout(3000);
    const one = await api(page, '/api/orders', { token: tok });
    const afterRetry = (one.body || []).length;

    // ── والشراءُ الثاني المقصودُ يمرّ ────────────────────────────
    //   حمايةٌ تمنعه ليست حمايةً بل خسارةُ بيعة. محاولةٌ جديدةٌ ⇒ مفتاحٌ جديد.
    await page.unroute('**/api/orders/public');
    await page.goto(`${BASE}/store/${uid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    for (const t of ['تخطّي ✕', '×']) { const el = await page.$(`button:has-text("${t}")`); if (el) await el.click().catch(() => {}); }
    await page.click('button:has-text("زيد للسلة")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("السلة (1)")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("كمّل الطلب")');
    await page.waitForTimeout(800);
    await page.fill('input[placeholder*="السمية"]', 'زبونُ الجوابِ الضائع');
    await page.fill('input[type="tel"]', '0611002200');
    await page.fill('input[placeholder*="المدينة"]', 'الدارُ البيضاء');
    await page.fill('textarea[placeholder*="العنوان"]', 'زنقة ٩');
    await page.locator('button:has-text("أكّد عبر واتساب")').click({ force: true });
    await page.waitForTimeout(3000);
    const two = await api(page, '/api/orders', { token: tok });
    const afterSecond = (two.body || []).length;

    cells['المدخل'] = 'سلّةُ متجرٍ حقيقيّة — ضغطٌ بمتصفّحٍ لا نداءُ API';
    cells['الهويّة'] = 'زبونٌ زائرٌ بلا حساب';
    cells['الشبكة'] = `${seen} نداءَ إنشاءٍ بلغ الخادمَ · الأوّلُ ضاع جوابُه`;
    cells['أثرُ القاعدة'] = `بعد الضياع ${afterLost} · بعد الإعادة ${afterRetry} · بعد شراءٍ ثانٍ مقصود ${afterSecond}`;
    cells['النتيجةُ المرئيّة'] = afterRetry === 1
      ? 'الزبونُ رأى طلبَه الأوّلَ لا طلبًا ثانيًا' : '**طلبان لمحاولةٍ واحدة**';
    pass = seen === 2 && afterLost === 1 && afterRetry === 1 && afterSecond === 2;
    if (!pass) why = `نداءات=${seen} · بعد الضياع=${afterLost} · بعد الإعادة=${afterRetry} · بعد الثاني=${afterSecond}`
      + (afterRetry > 1 ? ' — **كُتب طلبٌ مزدوج**' : afterSecond < 2 ? ' — **مُنع شراءٌ ثانٍ مشروع**' : '');
  } catch (e) { why ||= String(e).slice(0, 180); }
  finally { await ctx.close(); }
  record({ id: 'S6', title: 'محاولةٌ واحدةٌ ⇒ طلبٌ واحد · وشراءٌ ثانٍ مقصودٌ يمرّ', cells, pass, why });
}

// ── S4 · دورةُ الطلب الكاملة عبر الواجهة الحقيقيّة ──────────────
async function S4() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const tok = await login(page, MERCHANT);
    const mk = await api(page, '/api/orders', { method: 'POST', token: tok,
      body: { customerName: 'زبونُ الدورة', customerPhone: '0600000002', items: [], total: 100 } });
    const id = mk.body?.id;
    cells['المدخل'] = 'pending ⇒ approved ⇒ shipped ⇒ delivered';
    cells['الهويّة'] = 'التاجرُ صاحبُ الطلب';
    if (!id) { why = `تعذّر إنشاءُ طلب (${mk.status})`; throw new Error(why); }
    const seq = [];
    for (const s of ['approved', 'shipped', 'delivered']) {
      seq.push(`${s}=${(await api(page, '/api/orders/' + id, { method: 'PUT', token: tok, body: { status: s } })).status}`);
    }
    const fin = await api(page, '/api/orders/' + id, { token: tok });
    cells['الشبكة'] = seq.join(' · ');
    cells['أثرُ القاعدة'] = `الحالةُ النهائيّة = ${fin.body?.status}`;
    cells['النتيجةُ المرئيّة'] = 'الطلبُ عبر دورتَه بلا تجميد';
    // العطبُ الذي أُغلق في RC-P5: `approved` كانت تُجمّد الطلبَ أبدًا.
    pass = seq.every(s => s.endsWith('=200')) && fin.body?.status === 'delivered';
    if (!pass) why = `**تجمّدت الدورة**: ${seq.join(' ')} ⇒ ${fin.body?.status}`;
  } catch (e) { why ||= String(e).slice(0, 180); }
  finally { await ctx.close(); }
  record({ id: 'S4', title: 'دورةُ الطلب تكتمل — لا تجميدَ بعد الموافقة', cells, pass, why });
}

// ── S5 · طرقُ الدفع تُعلن نفسَها بصدق ──────────────────────────
async function S5() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const r = await api(page, '/api/payment/methods');
    const ms = r.body?.methods || [];
    cells['المدخل'] = 'GET /api/payment/methods';
    cells['الهويّة'] = '—';
    cells['الشبكة'] = `${r.status} · ${ms.length} طريقة`;
    const impl = ms.filter(m => m.implemented).map(m => m.provider);
    const seats = ms.filter(m => !m.implemented).map(m => m.provider);
    cells['أثرُ القاعدة'] = '—';
    cells['النتيجةُ المرئيّة'] = `مُنفَّذة: ${impl.join(',') || '—'} · مقاعدُ غيرُ مُنفَّذة: ${seats.join(',') || '—'}`;
    // **مقعدٌ غيرُ مُنفَّذٍ لا يصير متاحًا بمتغيّر بيئة.** هذا هو الادّعاءُ المحروس.
    const lying = ms.filter(m => !m.implemented && m.available);
    pass = r.status === 200 && ms.length > 0 && lying.length === 0;
    if (lying.length) why = `**مقعدٌ غيرُ مُنفَّذٍ يُعلن نفسَه متاحًا**: ${lying.map(m => m.provider).join(',')}`;
  } catch (e) { why ||= String(e).slice(0, 180); }
  finally { await ctx.close(); }
  record({ id: 'S5', title: 'طرقُ الدفع لا تدّعي ما لم يُكتَب', cells, pass, why });
}

for (const j of [S1, S2, S3, S4, S5, S6]) {
  try { await j(); } catch (e) { console.log('‼ سقطت رحلةٌ خارج الحساب:', String(e).slice(0, 160)); }
}
await browser.close();
const ok = rows.filter(r => r.pass).length;
console.log(`\n${'═'.repeat(60)}`);
console.log(`رحلاتُ التهيئة: ${ok}/${rows.length} نجحت`);
for (const r of rows.filter(x => !x.pass)) console.log(`  ❌ ${r.id} ${r.title} — ${r.why}`);
process.exitCode = ok === rows.length ? 0 : 1;
