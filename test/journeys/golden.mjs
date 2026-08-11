// ============================================================
// **الرحلاتُ الذهبيّة — متصفّحٌ حقيقيٌّ وخادمٌ حقيقيٌّ وقاعدةٌ حقيقيّة.**
//
//   كلُّ ما سبق يقيس وحداتٍ وطبقاتٍ ومصادر. وهذه تقيس ما يقع **للإنسان**:
//   يكتب جملةً بالدارجة، فيُفهَم، فيُسأل إن نقص شيء، فيُساق إلى مكان، فيرى
//   شيئًا. وبين هذه تعيش أعطابٌ لا يراها أيُّ اختبارِ وحدة — عبورُ الدخول،
//   وما يبقى في المتصفّح بعد تبدّل الهويّة، وصفحةٌ تُفتَح ولا يظهر فيها شيء.
//
//   ولكلّ رحلةٍ تُسجَّل تسعُ خاناتٍ لا تُختصَر:
//     المدخل · الفهم · القدرة · الحكم · الوجهة · عبورُ الدخول ·
//     النتيجةُ المرئيّة · تنظيفُ الحالة · نجح/سقط
//
//   ── وما عُلِّم من بنائها ──
//   كُتبت أوّلَ مرّةٍ من طبقة المكتبات: «اكتب ثمّ اضغط Enter ⇒ سوق». والواقعُ
//   أنّ الشاشةَ **تسأل أوّلًا** («سبّاك — دابا ولا نحجز موعد؟») ثمّ تسوق.
//   فالرحلةُ التي لا تُجيب سؤالَ التطبيق ليست رحلةَ إنسان.
//   وحقلُ الإدخال `<input>` بلا خاصّيّة `type`، فـ`input[type="text"]` **لا
//   تطابقه أبدًا** وإن قال `el.type === 'text'`. حارسٌ يقيس ما لا يوجد.
//
//   ولا بياناتِ إنتاجٍ ولا اعتماداتٍ حقيقيّة: قاعدةٌ زائلةٌ وحسابٌ يُخلَق
//   في نفس التشغيل.
//
//   التشغيل: BASE=http://127.0.0.1:3001 node test/journeys/golden.mjs
// ============================================================
import pkg from 'playwright-core';
const { chromium } = pkg;

const BASE = process.env.BASE || 'http://127.0.0.1:3001';
/**
 * مسارُ المتصفّح — صريحٌ إن أُعطي، وإلّا يُترَك لـPlaywright أن تجده.
 *
 *   تثبيتُ مسارٍ بعينه يجعل هذه الرحلاتِ تعمل على جهازٍ واحدٍ وتسقط في CI —
 *   وهو نفسُ صنفِ العطب الذي تطارده: **قياسٌ يقيس البيئةَ لا الكود**.
 */
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const EXE = process.env.CHROME
  || ((await import('node:fs')).existsSync(PINNED) ? PINNED : undefined);
const stamp = Date.now().toString(36);
const ACCOUNT = { name: 'صاحبُ رحلةٍ', email: `journey-${stamp}@test.local`, password: 'JourneyPass!2026' };

const rows = [];
const record = (r) => {
  rows.push(r);
  console.log(`\n${r.pass ? '✅' : '❌'} ${r.id} · ${r.title}`);
  for (const [k, v] of Object.entries(r.cells)) console.log(`      ${k.padEnd(18)} ${v}`);
  if (!r.pass) console.log(`      ${'السبب'.padEnd(18)} ${r.why}`);
};

const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });

/** سياقٌ نظيف — لا حالةَ تعبر بين رحلةٍ وأخرى إلّا حين تُطلَب صراحةً. */
const fresh = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar-MA' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('      ⚠ خطأُ صفحة:', String(e).slice(0, 140)));
  return { ctx, page };
};

const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const clientState = (page) => page.evaluate(() => ({
  local: Object.keys(localStorage), session: Object.keys(sessionStorage),
}));
const journeyNeed = (page) => page.evaluate(() => {
  try { return JSON.parse(sessionStorage.getItem('amanzine_need') || 'null'); } catch { return null; }
});

/** المقدّمةُ تُتخطّى — وإلّا غطّت الحقلَ فبدا التطبيقُ معطوبًا وهو سليم. */
const skipIntro = async (page) => {
  try {
    const s = page.locator('text=تخطّي').first();
    if (await s.isVisible({ timeout: 2000 })) { await s.click({ timeout: 2000 }); await page.waitForTimeout(500); }
  } catch { /* لا مقدّمةَ — لا شيءَ يُتخطّى */ }
};

/**
 * التهيئةُ الأولى تُتخطّى — حسابٌ جديدٌ يهبط على «لنبدأ 👋» لا على الصفحة
 *   المطلوبة، فرحلةٌ لا تتخطّاها تقيس معالجَ التهيئة لا ما تدّعي قياسَه.
 */
const skipOnboarding = async (page) => {
  for (const t of ['تخطي والدخول مباشرة', 'تخطّي والدخول مباشرة']) {
    try {
      const b = page.locator(`button:has-text(${JSON.stringify(t)})`).first();
      if (await b.isVisible({ timeout: 1500 })) { await b.click({ timeout: 3000 }); await page.waitForTimeout(2000); return true; }
    } catch { /* لا تهيئةَ — الحسابُ مهيَّأٌ سلفًا */ }
  }
  return false;
};

/**
 * الجولةُ السريعةُ **تُغلَق ولا تُفتَح**.
 *
 *   نسخةٌ أولى كانت تنقر «🧭 جولة سريعة» نفسَها — أي أنّها **تبدأ** الجولةَ
 *   فتغطّي طبقةٌ الشاشةَ ويصير كلُّ زرٍّ بعدها غيرَ قابلٍ للنقر. فبدا أنّ
 *   زرَّ الخروج غيرُ موجودٍ وهو موجودٌ تحت ما فتحتْه الرحلةُ بنفسها.
 *   ويُبحَث عن **زرِّ الإغلاق** وحدَه، وإلّا تُترَك كما هي.
 */
const dismissTour = async (page) => {
  for (const sel of ['button[aria-label="إغلاق"]', 'button[title="إغلاق"]', 'button:text-is("×")', 'button:text-is("✕")']) {
    try {
      const b = page.locator(sel).first();
      if (await b.isVisible({ timeout: 900 })) { await b.click({ timeout: 2500 }); await page.waitForTimeout(800); return; }
    } catch { /* لا زرَّ إغلاقٍ بهذا الشكل */ }
  }
  try { await page.keyboard.press('Escape'); await page.waitForTimeout(400); } catch { /* noop */ }
};

const land = async (page, path = '/') => {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await skipIntro(page);
};

/** الحقلُ بلا `type` — تُطابَق الخاصّيّةُ الغائبةُ صراحةً لا المفترَضة. */
const NEED_BOX = 'input:not([type]), input[type="text"], textarea';

const typeNeed = async (page, q) => {
  const box = page.locator(NEED_BOX).first();
  await box.waitFor({ state: 'visible', timeout: 20000 });
  await box.fill(q);
  await page.waitForTimeout(900);          // المرآةُ تلحق الكتابة
  return box;
};

const pressGo = async (page) => {
  await page.locator('button:has-text("متابعة")').last().click({ timeout: 10000 });
  await page.waitForTimeout(2200);
};

/**
 * يُجيب سؤالَ الاستيضاح إن ظهر، ويُرجع نصَّه — وهو خانةُ «الحكم» المرئيّة.
 *
 *   وزرُّ «متابعة» يختفي حين يُطرَح سؤال (`!ask && …`)، فغيابُه هو الإشارة.
 */
const answerIfAsked = async (page) => {
  if (await page.locator('button:has-text("متابعة")').count() > 0) return null;
  const escape = page.locator('button:has-text("نكمّل نكتب بدل الاختيار")');
  if (await escape.count() === 0) return null;
  // **تُقرأ الخياراتُ من داخل اللوحة وحدَها.** مسحُ كلّ `button` في الصفحة
  //   يلتقط شريحةَ المثال المتحرّكة («بغيت سبّاك اليوم») فيتعلّق النقرُ عليها.
  //   واللوحةُ هي أقربُ حاويةٍ تضمّ زرَّ الهروب من الاختيار.
  const found = await page.evaluate(() => {
    const esc = [...document.querySelectorAll('button')]
      .find(b => (b.innerText || '').includes('نكمّل نكتب بدل الاختيار'));
    if (!esc) return null;
    // اللوحةُ هي **أصغرُ** جَدٍّ يضمّ زرَّ الهروب ولا يضمّ حقلَ الكتابة.
    //   والصعودُ بلا هذا الحدّ يبلغ الجذرَ فيلتقط شريحةَ المثال المتحرّكة.
    const input = document.querySelector('input:not([type]), input[type="text"], textarea');
    let panel = esc.parentElement;
    while (panel && panel.querySelectorAll('button').length < 2) panel = panel.parentElement;
    while (panel && input && panel.contains(input)) panel = null;
    if (!panel) panel = esc.parentElement;
    const opts = [...panel.querySelectorAll('button')]
      .map(b => (b.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(t => t && !t.includes('نكمّل نكتب بدل الاختيار') && !/^«.*»$/.test(t));
    const q = (panel.innerText || '').split('\n').map(s => s.trim()).find(s => s.endsWith('؟'));
    return { opts, q: q || '(سؤالٌ معروض)' };
  });
  if (!found || !found.opts.length) return { question: found?.q || '(سؤال)', chose: null };
  const chose = found.opts[0];
  await page.locator(`button:text-is(${JSON.stringify(chose)})`).first().click({ timeout: 10000 });
  await page.waitForTimeout(2600);
  return { question: found.q, chose };
};

// ── ① الباحثُ: يُفهَم · يُسأل · يُساق إلى السوق باستعلامه ────────
async function J1() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    const q = 'خاصني سبّاك مستعجل فالدار البيضاء';
    await land(page);
    await typeNeed(page, q);
    cells['المدخل'] = q;
    const mirror = await text(page);
    cells['الفهم'] = [/سبّاك/.test(mirror) && 'الحاجة: سبّاك',
      /الدار البيضاء/.test(mirror) && 'المدينة: الدار البيضاء',
      (mirror.match(/فهمت هاكّا: (\d+%)/) || [])[1]].filter(Boolean).join(' · ') || '(لا مرآة)';
    cells['القدرة'] = 'FIND_PROVIDER';
    await pressGo(page);
    const asked = await answerIfAsked(page);
    cells['الحكم'] = asked ? `ask ⇒ «${asked.question}» ⇒ «${asked.chose}» ⇒ execute` : 'execute';
    const url = decodeURIComponent(page.url());
    cells['الوجهة'] = url.replace(BASE, '');
    cells['عبورُ الدخول'] = 'لا يلزم — البحثُ مفتوح';
    cells['النتيجةُ المرئيّة'] = (await text(page)).slice(0, 90) + '…';
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `session=[${st.session.join(',')}]`;
    const onMarket = /\/market/.test(url), carried = url.includes('سبّاك'), withCity = /city=/.test(url);
    pass = onMarket && carried && withCity;
    if (!onMarket) why = `لم يُساق إلى السوق: ${url}`;
    else if (!carried) why = 'ضاع الاستعلامُ في الطريق';
    else if (!withCity) why = 'ضاعت المدينةُ المقروءة';
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J1', title: 'الباحثُ ⇒ يُسأل ثمّ يُساق إلى السوق باستعلامه', cells, pass, why });
}

// ── ② العارضُ يُساق إلى النشر، ووجهتُه تُحمَل معه ───────────────
async function J2() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    const q = 'عندي دار للكراء فالرباط';
    await land(page);
    await typeNeed(page, q);
    cells['المدخل'] = q;
    const mirror = await text(page);
    cells['الفهم'] = /كتعرض|تعلن|باغي تعرض/.test(mirror) ? 'الاتّجاه: عرض' : '(لم يُقرأ الاتّجاه)';
    cells['القدرة'] = 'PUBLISH_LISTING';
    await pressGo(page);
    const asked = await answerIfAsked(page);
    cells['الحكم'] = asked ? `ask ⇒ «${asked.chose}» ⇒ execute` : 'execute';
    const url = decodeURIComponent(page.url());
    const body = await text(page);
    const need = await journeyNeed(page);
    const target = need?.data?.target || {};
    cells['الوجهة'] = `${url.replace(BASE, '')} · المحمولة=${JSON.stringify(target)}`;
    const gated = /دخول|تسجيل|حساب/.test(body) || /\/login|\/auth/.test(url);
    cells['عبورُ الدخول'] = gated ? 'عتبةٌ ظهرت — النشرُ يحتاج حسابًا' : 'لم تظهر';
    cells['النتيجةُ المرئيّة'] = body.slice(0, 90) + '…';
    cells['تنظيفُ الحالة'] = `amanzine_need.text=${JSON.stringify(need?.data?.text || null)}`;
    // جوهرُ RC-P1: الوجهةُ **تُحسَب مرّةً وتُحمَل**، فلا يُعيد `AuthPage` اشتقاقَها.
    pass = target.page === 'publish' && !!need?.data?.text;
    if (target.page !== 'publish') why = `الوجهةُ المحمولةُ ليست النشر: ${JSON.stringify(target)}`;
    else if (!need?.data?.text) why = 'الحاجةُ محمولةٌ بلا نصّها';
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J2', title: 'العارضُ ⇒ النشرُ ووجهتُه محمولةٌ معه', cells, pass, why });
}

// ── ③ الناقصُ يُسأل في مكانه ولا يُنقَل ────────────────────────
async function J3() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    const q = 'بغيت نبيع طابلة';
    await land(page);
    await typeNeed(page, q);
    cells['المدخل'] = q;
    cells['الفهم'] = /باغي تعرض|كتعرض/.test(await text(page)) ? 'الاتّجاه: عرض · السلعة: طابلة' : '(لم يُقرأ)';
    cells['القدرة'] = 'SELL_PRODUCT';
    const before = page.url();
    await pressGo(page);
    const stillHere = page.url() === before;
    const body = await text(page);
    const asks = await page.locator('button:has-text("متابعة")').count() === 0;
    cells['الحكم'] = 'ask — ينقص الثمن';
    cells['الوجهة'] = stillHere ? '(لا وجهة — السؤالُ في مكانه)' : page.url().replace(BASE, '');
    cells['عبورُ الدخول'] = 'لا يقع — لم يُنقَل';
    cells['النتيجةُ المرئيّة'] = asks ? 'سؤالٌ معروضٌ والجملةُ باقيةٌ في مكانها' : body.slice(0, 80);
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `session=[${st.session.join(',')}]`;
    // «سؤالٌ يُطرَح ثمّ يُنقَل صاحبُه» هو العطبُ الذي أُغلق في RC-P1.
    pass = stillHere;
    if (!pass) why = `سؤالٌ مرميّ: طُرح ثمّ نُقل إلى ${page.url()}`;
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J3', title: 'الناقصُ يُسأل في مكانه ولا يُنقَل', cells, pass, why });
}

// ── ④ حسابٌ يُنشأ والحاجةُ تعبر معه ───────────────────────────
async function J4() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    const q = 'عندي شقة للكراء فسلا';
    await land(page);
    await typeNeed(page, q);
    cells['المدخل'] = q;
    cells['الفهم'] = 'الاتّجاه: عرض · المدينة: سلا';
    cells['القدرة'] = 'PUBLISH_LISTING';
    await pressGo(page);
    await answerIfAsked(page);
    cells['الحكم'] = 'execute';
    const need = await journeyNeed(page);
    const target = need?.data?.target || {};
    cells['الوجهة'] = `المحمولة ${JSON.stringify(target)}`;
    const reg = await page.evaluate(async ({ base, acc }) => {
      const r = await fetch(base + '/api/auth/register', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(acc) });
      const b = await r.json().catch(() => ({}));
      if (b?.token) localStorage.setItem('ai_commerce_token', b.token);
      return { status: r.status, hasToken: !!b?.token, err: b?.error };
    }, { base: BASE, acc: ACCOUNT });
    cells['عبورُ الدخول'] = `POST /api/auth/register ⇒ ${reg.status}` +
      (reg.hasToken ? ' · رمزٌ صدر' : ` · بلا رمز ${reg.err || ''}`);
    cells['النتيجةُ المرئيّة'] = 'حسابٌ أُنشئ والوجهةُ محفوظةٌ مع الحاجة';
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `session=[${st.session.join(',')}]`;
    pass = reg.hasToken && target.page === 'publish';
    if (!reg.hasToken) why = `فشل إنشاءُ الحساب: ${reg.status} ${reg.err || ''}`;
    else if (target.page !== 'publish') why = `الوجهةُ المحمولةُ ${JSON.stringify(target)}`;
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J4', title: 'حسابٌ يُنشأ والحاجةُ تعبر معه', cells, pass, why });
}

// ── ⑤ الخروجُ الحقيقيُّ يمسح كلَّ ما لا يخصّ الجهاز ─────────────
async function J5() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await land(page);
    cells['المدخل'] = 'دخولٌ حقيقيّ · حالةٌ وذاكرةُ تعلّمٍ تُكتَب · ثمّ ضغطُ زرّ الخروج';
    cells['القدرة'] = '—'; cells['الحكم'] = '—'; cells['الوجهة'] = '—';
    const auth = await page.evaluate(async ({ base, acc }) => {
      const r = await fetch(base + '/api/auth/login', { method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }) });
      const b = await r.json().catch(() => ({}));
      if (b?.token) localStorage.setItem('ai_commerce_token', b.token);
      return !!b?.token;
    }, { base: BASE, acc: ACCOUNT });
    if (!auth) { why = 'تعذّر الدخولُ — لا خروجَ يُقاس'; throw new Error(why); }

    // **تُبلَغ جلسةٌ عاملةٌ أوّلًا** ثمّ تُزرَع المفاتيح: زرعُها قبل ذلك يكتب
    //   فوق `ai_commerce_user` فيُربَك المتجرُ ولا يُرسَم الشريطُ أصلًا.
    await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await skipIntro(page);
    if (await skipOnboarding(page)) {
      await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await skipIntro(page);
    }
    await dismissTour(page);

    const wrote = await page.evaluate(() => {
      const env = (d) => JSON.stringify({ v: 1, at: Date.now(), owner: 'USER_A', data: d });
      localStorage.setItem('ai_commerce_os_state', env({ products: [{ name: 'سلعةُ (أ)' }] }));
      localStorage.setItem('ai_commerce_theme', env('dark'));
      sessionStorage.setItem('amanzine_need', env({ text: 'حاجةٌ قديمة' }));
      sessionStorage.setItem('amanzine_need_stance', env('offer'));
      sessionStorage.setItem('amanzine_assistant', env([{ who: 'user', text: 'سرٌّ' }]));
      // وذاكرةُ التعلّم — خارج السجلّ، وهي ما كشفته هذه الرحلة.
      localStorage.setItem('amanzine_decisions', JSON.stringify({ unknownTexts: { 'سِرُّ-الأوّل-٧٧٧': 3 } }));
      localStorage.setItem('amanzine_journeys', JSON.stringify([{ at: Date.now(), tag: 'سِرُّ-الأوّل-٧٧٧' }]));
      localStorage.setItem('amanzine_receptions', JSON.stringify([{ raw: 'سِرُّ-الأوّل-٧٧٧' }]));
      localStorage.setItem('amanzine_feedback', JSON.stringify({ note: 'سِرُّ-الأوّل-٧٧٧' }));
      localStorage.setItem('amanzine_visited_pages', JSON.stringify(['سِرُّ-الأوّل-٧٧٧']));
      return Object.keys(localStorage).length + Object.keys(sessionStorage).length;
    });
    cells['الفهم'] = `كُتب ${wrote} مفتاحًا (حالةٌ · رحلةٌ · ذاكرةُ تعلّم)`;

    // ── **ويُضغَط زرُّ الخروج الحقيقيّ** ─────────────────────────
    //   نسخةٌ أولى من هذه الرحلة كانت تمسح المفاتيحَ بنفسها ثمّ تتحقّق أنّها
    //   مُحيت — أي أنّها تقيس **نفسَها** لا الكود. والدليلُ الوحيدُ أن يمرّ
    //   المسحُ من حيث يمرّ للإنسان.
    page.on('dialog', d => d.accept().catch(() => {}));
    let pressed = false;
    for (const sel of ['button[title="خروج"]', 'button:has-text("خروج")']) {
      try {
        const b = page.locator(sel).last();
        if (await b.isVisible({ timeout: 3000 })) { await b.click({ timeout: 6000 }); pressed = true; break; }
      } catch { /* زرٌّ آخر */ }
    }
    await page.waitForTimeout(3500);
    cells['عبورُ الدخول'] = pressed ? 'ضُغط زرُّ الخروج الحقيقيّ' : '**لم يُعثَر على زرّ خروج**';
    if (!pressed) { why = 'لم يُعثَر على زرّ الخروج — الرحلةُ لا تقيس شيئًا'; throw new Error(why); }

    // **يُقاس المحتوى لا وجودُ المفتاح.** بعد الخروج تُقلع صفحةُ الدخول
    //   فتكتب `amanzine_receptions` من جديدٍ فارغةً — وذاك ليس نجاةَ بيانات.
    //   فالمقياسُ أن لا يبقى **سِرُّ الأوّل** في أيّ مفتاح.
    const after = await page.evaluate(() => {
      const dump = (a) => Object.keys(a).map(k => `${k}=${a.getItem(k)}`).join('\u0000');
      return { local: Object.keys(localStorage), session: Object.keys(sessionStorage),
        all: dump(localStorage) + '\u0000' + dump(sessionStorage) };
    });
    const leakedId = after.local.filter(k => k.startsWith('ai_commerce_') && k !== 'ai_commerce_theme');
    const leakedJourney = after.session.filter(k => k.startsWith('amanzine_') && k !== 'amanzine_splash');
    // وذاكرةُ التعلّم: كشفت هذه الرحلةُ مفاتيحَ خارج السجلّ تنجو من الخروج —
    //   فيها الجملُ التي كتبها الإنسانُ ولم تُفهَم.
    const secretLeaked = after.all.includes('سِرُّ-الأوّل-٧٧٧');
    const leakedMemory = secretLeaked ? after.local.filter(k => k.startsWith('amanzine_')) : [];
    cells['النتيجةُ المرئيّة'] = `بقي local=[${after.local.join(',')}]`;
    cells['تنظيفُ الحالة'] = `سِرُّ الأوّل باقٍ؟ ${secretLeaked ? '**نعم**' : 'لا'} · تفضيلُ الجهاز باقٍ: ${after.local.includes('ai_commerce_theme') ? 'نعم' : 'لا'}`;
    pass = !leakedId.length && !leakedJourney.length && !secretLeaked
      && after.local.includes('ai_commerce_theme');
    if (leakedId.length) why = `نجت مفاتيحُ هويّة: ${leakedId.join(',')}`;
    else if (leakedJourney.length) why = `نجت مفاتيحُ رحلة: ${leakedJourney.join(',')}`;
    else if (secretLeaked) why = `نجا سِرُّ الخارج في: ${leakedMemory.join(',')}`;
    else if (!after.local.includes('ai_commerce_theme')) why = 'مُحي تفضيلُ الجهاز';
  } catch (e) { why ||= String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J5', title: 'الخروجُ الحقيقيُّ يمسح ما لا يخصّ الجهاز', cells, pass, why });
}

// ── ⑥ حوارُ المساعد ينجو من التنقّل ────────────────────────────
async function J6() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    const q = 'فين نلقى طبيب أسنان';
    await land(page);
    const auth = await page.evaluate(async ({ base, acc }) => {
      const r = await fetch(base + '/api/auth/login', { method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }) });
      const b = await r.json().catch(() => ({}));
      if (b?.token) localStorage.setItem('ai_commerce_token', b.token);
      return { status: r.status, hasToken: !!b?.token };
    }, { base: BASE, acc: ACCOUNT });
    cells['عبورُ الدخول'] = `دخولٌ بحسابِ J4 ⇒ ${auth.status}` + (auth.hasToken ? ' · رمزٌ صدر' : '');
    if (!auth.hasToken) { why = `تعذّر الدخول: ${auth.status}`; throw new Error(why); }
    await page.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await skipIntro(page);
    // التهيئةُ الأولى تُخرِج إلى `/dashboard`، فيُعاد الطلبُ بعد تخطّيها.
    const onboarded = await skipOnboarding(page);
    cells['عبورُ الدخول'] += onboarded ? ' · تُخطّيت التهيئةُ الأولى' : '';
    if (onboarded) {
      await page.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await skipIntro(page);
    }
    await dismissTour(page);
    if (/\/login/.test(page.url())) { why = 'رُدّ إلى الدخول رغم الرمز'; throw new Error(why); }
    const box = page.locator(NEED_BOX).first();
    await box.waitFor({ state: 'visible', timeout: 20000 });
    await box.fill(q); await box.press('Enter');
    await page.waitForTimeout(2200);
    cells['المدخل'] = q;
    const said = await text(page);
    cells['الفهم'] = /أسنان|طبيب/.test(said) ? 'الحاجة: طبيب أسنان' : '(لم يظهر في الحوار)';
    cells['القدرة'] = 'FIND_PROVIDER'; cells['الحكم'] = 'execute (لم يُنقَر بعد)';
    const stored = await page.evaluate(() => sessionStorage.getItem('amanzine_assistant'));
    cells['الوجهة'] = '(لم تُطلَب — يُقاس بقاءُ الحوار)';
    // المحكّ: يُغادَر ثمّ يُعاد. أيعود الحوارُ أم تحيّةٌ فارغة؟
    await page.goto(BASE + '/market', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.goto(BASE + '/assistant', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await skipOnboarding(page);
    await dismissTour(page);
    const back = await text(page);
    const survived = back.includes(q);
    cells['النتيجةُ المرئيّة'] = survived ? 'الحوارُ عاد كما تُرك' : 'عاد إلى تحيّةٍ فارغة';
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `session=[${st.session.join(',')}]`;
    pass = !!stored && survived;
    if (!stored) why = 'الحوارُ لا يُحفَظ إطلاقًا';
    else if (!survived) why = 'حُفظ ولم يُستعَد بعد التنقّل';
  } catch (e) { why ||= String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J6', title: 'حوارُ المساعد ينجو من التنقّل', cells, pass, why });
}

// ── ⑦ الحدُّ الصادق: فُهم تمامًا ولا بابَ له ────────────────────
async function J7() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    const q = 'بغيت نمشي لطنجة';
    await land(page);
    await typeNeed(page, q);
    cells['المدخل'] = q;
    cells['الفهم'] = 'سفرٌ إلى طنجة — مفهومٌ تمامًا';
    cells['القدرة'] = '(لا قدرةَ مدعومة)'; cells['الحكم'] = 'soon';
    const before = page.url();
    await pressGo(page);
    await answerIfAsked(page);
    const url = decodeURIComponent(page.url());
    cells['الوجهة'] = url === before ? '(لا وجهة)' : url.replace(BASE, '');
    cells['عبورُ الدخول'] = 'لا يقع';
    cells['النتيجةُ المرئيّة'] = (await text(page)).slice(0, 90) + '…';
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `session=[${st.session.join(',')}]`;
    // لا يُساق إلى سوقٍ يبحث عن «طنجة» كأنّها حرفة — الصمتُ الصادقُ أصدق.
    const dumped = /\/market/.test(url) && url.includes('طنجة');
    pass = !dumped;
    if (dumped) why = `سِيق إلى سوقٍ يبحث عن مدينةٍ كأنّها حرفة: ${url}`;
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J7', title: 'الحدُّ الصادق: فُهم ولا بابَ — لا يُرمى في السوق', cells, pass, why });
}

// ── ⑧ الدخولُ يفتح مساحةَ التاجر ───────────────────────────────
async function J8() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await land(page);
    cells['المدخل'] = `دخولٌ بـ${ACCOUNT.email}`;
    cells['الفهم'] = '—'; cells['القدرة'] = '—'; cells['الحكم'] = '—';
    const login = await page.evaluate(async ({ base, acc }) => {
      const r = await fetch(base + '/api/auth/login', { method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }) });
      const b = await r.json().catch(() => ({}));
      if (b?.token) localStorage.setItem('ai_commerce_token', b.token);
      return { status: r.status, hasToken: !!b?.token, name: b?.user?.name };
    }, { base: BASE, acc: ACCOUNT });
    cells['عبورُ الدخول'] = `POST /api/auth/login ⇒ ${login.status}` + (login.hasToken ? ' · رمزٌ صدر' : ' · بلا رمز');
    await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2800);
    await skipIntro(page);
    const url = page.url();
    cells['الوجهة'] = url.replace(BASE, '');
    const body = await text(page);
    cells['النتيجةُ المرئيّة'] = body.slice(0, 90) + '…';
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `local=[${st.local.join(',')}]`;
    const bounced = /\/login|\/auth/.test(url);
    pass = login.status === 200 && login.hasToken && !bounced && body.length > 60;
    if (login.status !== 200) why = `الدخولُ ردّ ${login.status}`;
    else if (bounced) why = 'رُدّ إلى صفحة الدخول رغم الرمز';
    else if (body.length <= 60) why = 'الصفحةُ فُتحت فارغة';
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J8', title: 'الدخولُ يفتح مساحةَ التاجر', cells, pass, why });
}

// ── ⑨ بابُ الكتابة العامّ يُقرّ ولا يروي سجلًّا ──────────────────
async function J9() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await land(page);
    const phone = '06' + String(Date.now()).slice(-8);
    cells['المدخل'] = 'POST /api/customers/public — رقمٌ يُسجَّل ثمّ يُجرَّب باسمٍ مخترَع';
    cells['الفهم'] = '—'; cells['القدرة'] = '—'; cells['الحكم'] = '—'; cells['الوجهة'] = '—';
    cells['عبورُ الدخول'] = 'بابٌ مجهولٌ عمدًا — الزبونُ بلا حساب';
    const out = await page.evaluate(async ({ base, acc, phone }) => {
      const lg = await fetch(base + '/api/auth/login', { method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }) }).then(r => r.json()).catch(() => ({}));
      const uid = lg?.user?.id;
      const post = (b) => fetch(base + '/api/customers/public', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
        .then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
      const a = await post({ userId: uid, name: 'زبونُ الرحلة', phone, city: 'سلا', address: 'عنوانٌ خاصّ' });
      const b = await post({ userId: uid, name: 'اسمٌ مخترَع', phone });
      return { uid, a, b };
    }, { base: BASE, acc: ACCOUNT, phone });
    cells['النتيجةُ المرئيّة'] =
      `أوّل=${out.a.status}:${JSON.stringify(out.a.body)} · ثانٍ=${out.b.status}:${JSON.stringify(out.b.body)}`;
    cells['تنظيفُ الحالة'] = '—';
    if (!out.uid) { why = 'تعذّر الحصولُ على تاجرٍ للقياس'; throw new Error(why); }
    const s = JSON.stringify(out.b.body);
    const leaked = ['عنوانٌ خاصّ', 'زبونُ الرحلة', 'trustScore', 'totalSpent'].filter(x => s.includes(x));
    const same = out.a.status === out.b.status && JSON.stringify(out.a.body) === JSON.stringify(out.b.body);
    pass = out.a.status === 200 && !leaked.length && same;
    if (out.a.status !== 200) why = `التسجيلُ ردّ ${out.a.status}`;
    else if (leaked.length) why = `تسرّبت بياناتُ صاحب الرقم: ${leaked.join(',')}`;
    else if (!same) why = 'الجوابُ يفرّق بين الموجود والجديد — عرّافُ عضويّة';
  } catch (e) { why ||= String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J9', title: 'بابُ الكتابة العامّ يُقرّ ولا يروي سجلًّا', cells, pass, why });
}

// ── ⑩ التحديثُ لا يُضيّع الرحلةَ الجارية ───────────────────────
async function J10() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    const q = 'كنقلب على حداد فمراكش';
    await land(page);
    await typeNeed(page, q);
    cells['المدخل'] = q + ' ⇐ ثمّ تحديثُ الصفحة';
    cells['الفهم'] = /حداد/.test(await text(page)) ? 'الحاجة: حداد · المدينة: مراكش' : '(لم يُقرأ)';
    cells['القدرة'] = 'FIND_PROVIDER';
    await pressGo(page);
    const asked = await answerIfAsked(page);
    cells['الحكم'] = asked ? `ask ⇒ «${asked.chose}» ⇒ execute` : 'execute';
    const before = decodeURIComponent(page.url());
    cells['الوجهة'] = before.replace(BASE, '');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const after = decodeURIComponent(page.url());
    cells['عبورُ الدخول'] = 'لا يلزم';
    cells['النتيجةُ المرئيّة'] = `بعد التحديث: ${after.replace(BASE, '')}`;
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `session=[${st.session.join(',')}]`;
    // الاستعلامُ في المسار لا في الذاكرة — فالتحديثُ لا يُفرغه.
    pass = after === before && /q=/.test(after) && /\/market/.test(after);
    if (!/\/market/.test(before)) why = `لم يبلغ السوقَ أصلًا: ${before}`;
    else if (after !== before) why = `تبدّلت الوجهةُ بالتحديث: ${before} ⇒ ${after}`;
    else if (!/q=/.test(after)) why = 'ضاع الاستعلامُ من المسار';
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J10', title: 'التحديثُ لا يُضيّع الرحلةَ الجارية', cells, pass, why });
}

// ── ⑪ السوقُ يفتح ويعرض — لا صفحةٌ بيضاء ───────────────────────
async function J11() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await page.goto(BASE + '/market?q=' + encodeURIComponent('سبّاك'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await skipIntro(page);
    cells['المدخل'] = '/market?q=سبّاك (رابطٌ مباشرٌ — كما يُشارَك)';
    cells['الفهم'] = 'الاستعلامُ من المسار'; cells['القدرة'] = 'FIND_PROVIDER'; cells['الحكم'] = 'execute';
    cells['الوجهة'] = decodeURIComponent(page.url()).replace(BASE, '');
    cells['عبورُ الدخول'] = 'لا يلزم — السوقُ عامّ';
    const body = await text(page);
    cells['النتيجةُ المرئيّة'] = body.slice(0, 100) + '…';
    const st = await clientState(page);
    cells['تنظيفُ الحالة'] = `session=[${st.session.join(',')}]`;
    // سوقٌ فارغٌ مقبول (قاعدةٌ زائلة) — لكن **صفحةً بيضاءَ** ليست مقبولة.
    const rendered = body.length > 80 && !/\/login/.test(page.url());
    const keptQuery = /q=/.test(page.url());
    pass = rendered && keptQuery;
    if (!rendered) why = `الصفحةُ فُتحت فارغةً أو رُدّت (${body.length} حرفًا)`;
    else if (!keptQuery) why = 'أسقط السوقُ الاستعلامَ من المسار';
  } catch (e) { why = String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J11', title: 'رابطُ السوق المُشارَك يفتح ويعرض', cells, pass, why });
}

// ── ⑫ حالةُ طلبٍ مخترَعةٌ تُرفَض عبر الواجهة الحقيقيّة ──────────
async function J12() {
  const { ctx, page } = await fresh();
  const cells = {}; let pass = false, why = '';
  try {
    await land(page);
    cells['المدخل'] = 'PUT /api/orders/:id — حالةٌ مخترَعةٌ ثمّ حالةٌ مشروعة';
    cells['الفهم'] = '—'; cells['القدرة'] = '—'; cells['الوجهة'] = '—';
    cells['عبورُ الدخول'] = 'برمزِ التاجر';
    const out = await page.evaluate(async ({ base, acc }) => {
      const lg = await fetch(base + '/api/auth/login', { method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }) }).then(r => r.json()).catch(() => ({}));
      const H = { 'content-type': 'application/json', authorization: 'Bearer ' + lg?.token };
      const mk = await fetch(base + '/api/orders', { method: 'POST', headers: H,
        body: JSON.stringify({ customerName: 'زبون', customerPhone: '0600000000', items: [], total: 100 }) })
        .then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
      const id = mk.body?.id;
      if (!id) return { mk, bad: null, good: null };
      const put = (status) => fetch(base + '/api/orders/' + id, { method: 'PUT', headers: H,
        body: JSON.stringify({ status }) }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
      return { mk, bad: await put('حالةٌ مخترَعةٌ تمامًا'), good: await put('confirmed') };
    }, { base: BASE, acc: ACCOUNT });
    cells['الحكم'] = out.bad ? `مخترَعة ⇒ ${out.bad.status} · مشروعة ⇒ ${out.good.status}` : 'لم يُنشَأ طلب';
    cells['النتيجةُ المرئيّة'] = JSON.stringify(out.bad?.body || out.mk?.body || {}).slice(0, 100);
    cells['تنظيفُ الحالة'] = '—';
    if (!out.bad) { why = `تعذّر إنشاءُ طلبٍ للقياس: ${out.mk?.status}`; throw new Error(why); }
    // القاعدةُ ترفض المخترَعَ (RC-P5) ولا ترفض المشروع. و**الرفضُ يُقال خطأَ
    //   مُدخَلٍ لا خطأَ خادم**: ٥٠٠ يقول للعميل «العطبُ عندي» وهو عنده.
    pass = out.bad.status === 400 && out.good.status < 400;
    if (out.bad.status < 400) why = `**قُبلت حالةٌ مخترَعة** (${out.bad.status})`;
    else if (out.bad.status >= 500) why = `خطأُ مُدخَلٍ قُدّم خطأَ خادم (${out.bad.status})`;
    else if (out.good.status >= 400) why = `رُفضت حالةٌ مشروعة (${out.good.status})`;
  } catch (e) { why ||= String(e).slice(0, 200); }
  finally { await ctx.close(); }
  record({ id: 'J12', title: 'حالةُ طلبٍ مخترَعةٌ تُرفَض والمشروعةُ تمرّ', cells, pass, why });
}

for (const j of [J1, J2, J3, J4, J5, J6, J7, J8, J9, J10, J11, J12]) {
  try { await j(); } catch (e) { console.log('‼ سقطت رحلةٌ خارج الحساب:', String(e).slice(0, 200)); }
}
await browser.close();

const ok = rows.filter(r => r.pass).length;
console.log(`\n${'═'.repeat(62)}`);
console.log(`الرحلاتُ الذهبيّة: ${ok}/${rows.length} نجحت`);
for (const r of rows.filter(x => !x.pass)) console.log(`  ❌ ${r.id} ${r.title} — ${r.why}`);
process.exitCode = ok === rows.length ? 0 : 1;
