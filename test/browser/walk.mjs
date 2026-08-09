#!/usr/bin/env node
// ============================================================
// **المِشيةُ بالإصبع** — متصفّحٌ حقيقيٌّ على مقاس هاتف.
//
//   ── لماذا وُلدت، وهي أهمُّ أداةٍ في هذا المستودع ──
//   سجلّي في هذه المحادثة يُثبت أنّ «أصلحتُها» لا تعني شيئًا وحدَها:
//
//     · قلتُ «صفحةُ الزيارة أُصلحت» — ولم تكن. كان العطبُ في مكانٍ آخر
//       تمامًا، وثمانَ صفحاتٍ لا واحدة.
//     · قلتُ «الثلاجة غيرُ معروفة» — وكانت معروفةً تمامًا.
//     · ماسحي أعلن ٧٧ ملفًّا يتيمًا — والعددُ ٢.
//     · مِسباري أعلن طبقةَ التحقّق معطوبة — والمعطوبُ مِسباري.
//
//   والنمطُ واحد: **أقرأ الكودَ وأستنتج، ولا أمشي الطريقَ الذي يمشيه إنسان**.
//   و٧٠٠ اختبارِ عقلٍ لم تكشف واحدًا من أعطاب اللقطات الخمس — لأنّها كلَّها
//   تقيس ما تحت الشاشة.
//
//   ── وما تقيسه هذه ──
//   ما **يراه الإنسانُ بعينه** وحدَه: نصٌّ فرنسيٌّ في واجهةٍ عربيّة · اسمٌ
//   مشوَّه · عنصرٌ يغطّي زرًّا · صفحةٌ لا تفتح · تمريرٌ أفقيٌّ على الهاتف.
//   ولا تُصدَّق شاشةٌ لأنّ الكودَ يقول إنّها صحيحة.
//
//   ── والمقاسُ ليس اعتباطًا ──
//   ٣٩٠×٨٤٤ هو مقاسُ الهاتف الذي أرسل منه صاحبُ المشروع لقطاته.
// ============================================================

import { chromium } from 'playwright';
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const OUT = join(ROOT, 'REPORTS/browser');
const BASE = process.env.WALK_URL || 'http://127.0.0.1:4173';
const PHONE = { width: 390, height: 844 };

mkdirSync(OUT, { recursive: true });

const findings = [];
const note = (level, where, what, detail) => {
  findings.push({ level, where, what, detail });
  const mark = level === 'crit' ? '🔴' : level === 'warn' ? '🟠' : '🟡';
  console.log(`${mark} [${where}] ${what}${detail ? '\n     ' + detail : ''}`);
};

/**
 * **كلماتٌ فرنسيّةٌ في واجهةٍ عربيّة.**
 *
 *   رآها صاحبُ المشروع في السوق وفي شاشة الطلب: `Confirmer la commande` ·
 *   `Mode de paiement` · `Je suis humain` · `Publier une annonce`. وهي
 *   الأجزاءُ التي يراها **الزبون** لا التاجر — أي أنّ أضعفَ ما في التطبيق
 *   هو ما يراه مَن نريده أن يشتري.
 *
 *   والكشفُ يُحصر في كلماتٍ فرنسيّةٍ **صريحة**: أسماءُ العلامات ووحداتُ
 *   القياس (`MAD` · `WhatsApp`) ليست عطبًا، وقائمةٌ فضفاضةٌ تُنتج ضجيجًا
 *   يُهمَل معه التقريرُ كلُّه.
 */
const FR = [
  'Confirmer', 'commande', 'paiement', 'livraison', 'Virement', 'Retour',
  'Envoi', 'Publier', 'annonce', 'Produits et services', 'vendeurs locaux',
  'Je suis humain', 'Tout', 'Rechercher', 'Ajouter', 'Connexion', 'Inscription',
  'Bienvenue', 'Boutique', 'Panier', 'Commander', 'Valider', 'Annuler',
];

async function scan(page, where) {
  // ① نصٌّ فرنسيٌّ مرئيّ
  const fr = await page.evaluate((words) => {
    const hits = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const t = (n.textContent || '').trim();
      if (!t || t.length > 120) continue;
      const el = n.parentElement;
      if (!el || !el.offsetParent) continue;           // مخفيّ
      for (const w of words) {
        if (t.includes(w) && !hits.some(h => h.text === t)) hits.push({ text: t, word: w });
      }
    }
    return hits.slice(0, 12);
  }, FR);
  for (const h of fr) note('crit', where, `نصٌّ فرنسيٌّ مرئيّ: «${h.text}»`, `الكلمة: ${h.word}`);

  // ② تمريرٌ أفقيّ — العطبُ الأشيعُ في RTL على الهاتف
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    if (d.scrollWidth <= d.clientWidth + 1) return null;
    const wide = [...document.querySelectorAll('body *')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2); })
      .slice(0, 3)
      .map(e => `${e.tagName.toLowerCase()}.${(e.className || '').toString().slice(0, 30)}`);
    return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, wide };
  });
  if (overflow) note('warn', where, `تمريرٌ أفقيّ: ${overflow.scrollWidth}px فوق ${overflow.clientWidth}px`, overflow.wide.join(' · '));

  // ③ عنصرٌ ثابتٌ يغطّي زرًّا — رآه صاحبُ المشروع: «بلّغ» فوق «يالله نمشيو للسوق»
  //   **والكاشفُ يُضيَّق عمدًا.** نسختُه الأولى أعلنت كلَّ زرٍّ في الصفحة
  //   مغطًّى، لأنّ `elementFromPoint` تُرجع أحيانًا زخرفةً شفّافةً أو طبقةَ
  //   تدرّجٍ لا تمنع اللمس. وتقريرٌ يصرخ على الصواب يُقرأ مرّةً ثمّ يُهمَل —
  //   وهذا الدرسُ دُفع ثمنُه في ماسح الملفّات قبل ساعات.
  //   فالشرطُ: العنصرُ الغطّاءُ **يلتقط اللمس فعلًا** وله لونٌ يحجب.
  const covered = await page.evaluate(() => {
    const out = [];
    const opaque = (el) => {
      const cs = getComputedStyle(el);
      if (cs.pointerEvents === 'none') return false;
      if (+cs.opacity < 0.2) return false;
      const bg = cs.backgroundColor || '';
      const m = bg.match(/rgba?\(([^)]+)\)/);
      if (!m) return false;
      const parts = m[1].split(',').map(x => parseFloat(x));
      return parts.length < 4 || parts[3] > 0.35;      // ليست شفّافة
    };
    for (const b of document.querySelectorAll('button, a[href], [role="button"]')) {
      const r = b.getBoundingClientRect();
      if (r.width < 40 || r.height < 20 || r.top < 0 || r.bottom > innerHeight) continue;
      if (getComputedStyle(b).visibility === 'hidden') continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      if (!top || top === b || b.contains(top) || top.contains(b)) continue;
      if (!opaque(top)) continue;
      const label = (b.textContent || '').trim().slice(0, 40);
      const over = ((top.textContent || '').trim() || top.tagName.toLowerCase()).slice(0, 40);
      if (label) out.push({ label, over });
    }
    return out.slice(0, 6);
  });
  for (const c of covered) note('crit', where, `زرٌّ مغطًّى: «${c.label}»`, `يغطّيه: «${c.over}»`);

  // ④ اتّجاهُ الصفحة
  const dir = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.body).direction);
  if (dir !== 'rtl') note('warn', where, `اتّجاهُ الصفحة «${dir}» لا rtl`);

  // ⑤ أخطاءُ الطرفيّة وفشلُ الشبكة يُلتقطان في المستمعَين أدناه.
  await page.screenshot({ path: join(OUT, `${where}.png`), fullPage: false });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: PHONE, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    locale: 'ar-MA', userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
  });
  const page = await ctx.newPage();

  // ── **الخطوطُ الخارجيّةُ تُقطَع عمدًا** ──────────────────────────
  //   بيئةُ القياس تحجب `fonts.googleapis.com`، وورقةُ الأنماط **تحجب
  //   الرسم**. فصفحةُ الإعدادات احتاجت ١٨٫٦ ثانيةً لتبلغ
  //   `domcontentloaded` — والعطبُ ليس فيها، بل في انتظارِ نطاقٍ لن يجيب.
  //   فلو قِست هكذا لَاتّهمتُ صفحةً بريئة (وهذا خطئي المتكرّر: أقيس بيئتي
  //   وأسمّيها عطبَ التطبيق).
  //
  //   تُقطَع سريعًا ليُقاس التطبيقُ وحدَه — **والاعتمادُ نفسُه يُبلَّغ مرّةً**
  //   أدناه، لأنّه خطرٌ حقيقيٌّ على شبكةٍ بطيئةٍ في المغرب لا حالةَ مختبر.
  const externals = new Set();
  await page.route('**/*', route => {
    const u = route.request().url();
    if (/^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(u)) { externals.add(new URL(u).host); return route.abort(); }
    return route.continue();
  });

  page.on('console', m => {
    if (m.type() === 'error') note('warn', 'console', `خطأٌ في الطرفيّة: ${m.text().slice(0, 140)}`);
  });
  page.on('pageerror', e => note('crit', 'console', `استثناءٌ غيرُ مُلتقَط: ${String(e).slice(0, 140)}`));
  page.on('response', r => {
    if (r.status() >= 500) note('crit', 'network', `${r.status()} على ${r.url().replace(BASE, '')}`);
  });
  // **و`alert()` الأصليّةُ عطبٌ** — رآها صاحبُ المشروع: رسالةُ خطأٍ في نافذة
  //   المتصفّح لا في التطبيق. تُلتقَط ولا تُقبَل صامتة.
  page.on('dialog', async d => {
    note('crit', 'dialog', `نافذةُ متصفّحٍ أصليّة (${d.type()}): «${d.message().slice(0, 120)}»`);
    await d.dismiss().catch(() => {});
  });

  let sessionLost = false, LAST_TOKEN = '', restoreSession = async () => {};

  const go = async (path, where, retried = false) => {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const url = new URL(page.url()).pathname;
      if (path !== '/' && url !== path) {
        // ── **عطبٌ واحدٌ يُقال مرّةً، لا ستَّ مرّات** ──────────────
        //   حين تموت الجلسةُ تسقط كلُّ صفحةٍ بعدها إلى `/login`، فيبدو
        //   التقريرُ ستّةَ أعطاب. وهو **عطبٌ واحد**: الجلسةُ لا تعيش
        //   تحميلًا كاملًا. وتقريرٌ يضخّم يُقرأ مرّةً ثمّ يُهمَل.
        if (url === '/login') {
          const alive = await page.evaluate(async () => {
            try { return (await fetch('/api/auth/me', { credentials: 'include' })).status; } catch { return 0; }
          });
          if (alive !== 200) {
            if (!sessionLost) {
              sessionLost = true;
              note('crit', 'session', 'الجلسةُ ما كتعيشش تحميلًا كاملًا للصفحة',
                `أوّلُ سقوطٍ عند ${path} — كلُّ صفحةٍ بعدها كتردّ للدخول. من كيحدّث الصفحةَ كيتطرد.`);
            }
            // **مرّةً واحدةً لا دورةً**: إن لم تُستعَد الجلسةُ يُسجَّل ويُمضى.
            if (!retried) { await restoreSession(); return go(path, where, true); }
          }
        }
        note('crit', where, `الصفحةُ ما تفتحش: طُلب ${path} وانتهى إلى ${url}`);
      }
      await scan(page, where);
    } catch (e) {
      note('crit', where, `تعذّر فتحُ ${path}`, String(e).slice(0, 120));
    }
  };

  console.log(`\n══ المِشيةُ بالإصبع — ${PHONE.width}×${PHONE.height} · ar-MA ══\n`);
  await go('/', 'landing');

  // ── **الدخولُ أوّلًا — وإلّا مُشيَ طريقٌ لا يمشيه تاجر** ────────────
  //
  //   أوّلُ شوطٍ أعلن ثمانَ صفحاتٍ «لا تفتح» — وكلُّها كانت تُعيد إلى `/login`،
  //   وهو **الصوابُ** لزائرٍ لم يدخل. فالماشي بلا حسابٍ يقيس بابًا مغلقًا
  //   ويظنّه عطبًا. وهذا نفسُ الخطأ الذي وقعتُ فيه حين قرأتُ الكودَ واستنتجت.
  const EMAIL = `walk-${Date.now()}@test.ma`;
  let signedIn = false;
  try {
    // ── **يُسجَّل من داخل المتصفّح لا من هنا** ────────────────────
    //   التطبيقُ يمحو الرمزَ من التخزين عمدًا بعد قراءته (حمايةٌ من XSS)
    //   ويعتمد على كوكي HttpOnly لاستعادة الجلسة بعد كلّ تحديث. فرمزٌ
    //   نحقنه من node يعيش صفحةً واحدةً ثمّ يموت، فتُعيد كلُّ صفحةٍ تالية
    //   إلى `/login` ونظنّها مقفلة. الطلبُ يُرسَل من الصفحة نفسِها كي
    //   يستقرّ الكوكي حيث يستقرّ للإنسان.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const b = await page.evaluate(async ([email]) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'عبدو', email, password: 'walk-pass-123', storeName: 'حانوت المشي' }),
      });
      return { status: res.status, ...(await res.json().catch(() => ({}))) };
    }, [EMAIL]);
    const r = { status: b.status };
    const token = b.token || b.accessToken;
    if (token) {
      // **حيث يقرأ التطبيقُ فعلًا، لا حيث ظننت.** كان الرمزُ يُكتَب في
      // `sessionStorage` — و`services/api` لا يقرؤه من هناك أبدًا. فتُعلَن
      // «دخل بحساب» ولم يدخل، ثمّ تُتَّهم ثمانُ صفحاتٍ بأنّها لا تفتح وهي
      // تصدق: تُعيد زائرًا إلى الدخول. أداةُ القياس كانت هي الكاذبة.
      await page.evaluate(([t, u]) => {
        try {
          localStorage.setItem('ai_commerce_token', t);
          localStorage.setItem('ai_commerce_user', JSON.stringify(u));
        } catch { /* noop */ }
      }, [token, b.user || { name: 'عبدو', email: EMAIL }]);
      // والتحقّقُ من الدخول لا يُفترَض: تُفتَح صفحةٌ محميّةٌ ويُنظَر أين انتهت.
      await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      signedIn = !/\/login/.test(page.url());
      // ── **وتُتخطّى شاشةُ الإعداد** ────────────────────────────
      //   الحسابُ الجديد يهبط على معالج الإعداد، **فيُرسَم فوق كلّ صفحة**.
      //   فمشى الشوطُ على المعالج وظنّ الصفحاتِ سليمةً — وهي التي أبلغ عنها
      //   صاحبُ المشروع ثلاثَ مرّات. أداةٌ تقيس شاشةً واحدةً وتسمّيها الكلّ.
      LAST_TOKEN = token;
      restoreSession = async () => {
        await page.evaluate(t => localStorage.setItem('ai_commerce_token', t), LAST_TOKEN);
      };
      const skip = page.getByText('تخطي والدخول مباشرة', { exact: false }).first();
      if (await skip.count()) { await skip.click().catch(() => {}); await page.waitForTimeout(1500); }
      if (signedIn) console.log('   ↳ دخل بحسابٍ جديد: عبدو\n');
      else note('crit', 'auth', 'الرمزُ كُتب والصفحةُ المحميّةُ ردّت للدخول',
        `انتهى إلى ${page.url()}`);
    } else note('crit', 'auth', `التسجيلُ ما رجّعش رمزًا (${r.status})`, JSON.stringify(b).slice(0, 120));
  } catch (e) {
    note('warn', 'auth', 'تعذّر التسجيلُ — المِشيةُ غادي تبقى ديال زائر', String(e).slice(0, 100));
  }
  if (!signedIn) console.log('   ↳ **بلا حساب** — الصفحاتُ المحميّةُ غادي تعيد للدخول، وهذا صواب\n');

  // ── **كلُّ صفحةٍ لها رابط، لا ثمانٍ اخترتُها بيدي** ──────────────
  //
  //   كانت هنا قائمةٌ من ثمانية مساراتٍ مكتوبةٍ بأصابع — **قائمةٌ ثانيةٌ
  //   بجانب `PAGE_URLS`**، وهي نفسُ العطب الذي تمشي هذه الأداةُ لتكشفه.
  //   وحين أضفتُ `/field-visit` إلى `PAGE_URLS` ونسيتُ مساره في الراوتر،
  //   لم تكن الأداةُ لتراه لو لم يصادف وجودُه في الثمانية.
  //
  //   الآن تُقرأ الأسماءُ من المصدر نفسِه: من يضيف صفحةً تُمشى تلقائيًّا.
  const CONTRACT = join(ROOT, '.walk-pages.mjs');
  await build({
    stdin: { contents: `export { PAGE_URLS } from './src/types';`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: CONTRACT, logLevel: 'silent',
  });
  const { PAGE_URLS } = await import(CONTRACT + `?t=${Date.now()}`);
  rmSync(CONTRACT, { force: true });

  for (const p of Object.values(PAGE_URLS)) {
    await go(p, 'page' + p.replace(/\//g, '-'));
  }

  // **والاعتمادُ الخارجيُّ يُقال**: ما يُحمَّل من نطاقٍ آخرَ يُبطئ أوّلَ رسمٍ
  //   لمن شبكتُه ضعيفة — وهو أغلبُ من نريدهم أن يشتروا.
  for (const host of externals) {
    note('warn', 'external', `اعتمادٌ على نطاقٍ خارجيّ: ${host}`,
      'أوّلُ رسمٍ ينتظره — على شبكةٍ بطيئةٍ يُترجَم إلى شاشةٍ بيضاء');
  }

  writeFileSync(join(OUT, 'findings.json'), JSON.stringify({
    at: new Date().toISOString(), base: BASE, viewport: PHONE,
    counts: {
      crit: findings.filter(f => f.level === 'crit').length,
      warn: findings.filter(f => f.level === 'warn').length,
    },
    findings,
  }, null, 1));

  console.log(`\n══ ${findings.filter(f => f.level === 'crit').length} قاتل · ${findings.filter(f => f.level === 'warn').length} تحذير ══`);
  console.log(`اللقطاتُ والتفاصيل: REPORTS/browser/`);
  await browser.close();
  process.exit(findings.some(f => f.level === 'crit') ? 1 : 0);
})();
