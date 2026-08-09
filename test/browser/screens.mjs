#!/usr/bin/env node
// ============================================================
// **ما يراه الإنسان — مرحلةً مرحلة، وبأربعة مقاسات.**
//
//   قبل أن يُغيَّر تصميمٌ واحد: تُصوَّر الرحلةُ كما هي الآن ويُكتَب لكلّ
//   مشهدٍ ما يراه الإنسانُ فعلًا: العنوانُ الأوّل · عددُ الأزرار المتنافسة
//   · النصوصُ الظاهرة · هل ثمّة مُعرِّفٌ داخليّ · هل ثمّة تمريرٌ أفقيّ.
//
//   والمقاساتُ تبدأ من ٣٦٠ لا من سطح المكتب: جمهورُ AMANZINE على الهاتف،
//   وتصميمٌ يُصمَّم كبيرًا ثمّ يُصغَّر يكسر الصغيرَ دائمًا.
//
//   لا يُصلح هذا الملفُّ شيئًا. يقيس فقط — وهذا قصدُه: **قِس قبل أن تغيّر،
//   وقِس بعد، وإلّا صار «أجمل» رأيًا لا قياسًا.**
// ============================================================

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const OUT = join(ROOT, 'REPORTS/screens');
const BASE = process.env.WALK_URL || 'http://127.0.0.1:4173';
mkdirSync(OUT, { recursive: true });

/** المقاساتُ الثلاثةُ الأشيعُ في المغرب، ثمّ سطحُ المكتب. */
const SIZES = [
  { id: '360', w: 360, h: 780, mobile: true },
  { id: '390', w: 390, h: 844, mobile: true },
  { id: '412', w: 412, h: 915, mobile: true },
  { id: 'desktop', w: 1280, h: 900, mobile: false },
];

/** المرحلةُ الأولى وحدَها — أوّلُ انطباعٍ ودخولٌ وكتابة. */
const STAGE_1 = [
  { id: '1-landing', path: '/', act: null,
    ask: 'أوّلُ ثانية: هل يعرف الإنسانُ ما هذا وماذا يفعل؟' },
  { id: '2-typed', path: '/', act: 'type',
    ask: 'كتب حاجتَه: هل ظهر أنّ التطبيقَ فهم قبل أن ينقله؟' },
  { id: '3-login', path: '/login', act: null,
    ask: 'الدخول: كم حقلًا وكم زرًّا قبل أن يدخل؟' },
];

const SAID = 'بغيت شي كسوة لبنتي';

/** ما يُقاس في كلّ مشهد — بالعين لا بالكود. */
async function readScene(page) {
  return page.evaluate(() => {
    const vis = (e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && e.offsetParent !== null;
    };
    const btns = [...document.querySelectorAll('button, a[href], [role="button"]')]
      .filter(vis)
      .map(e => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30))
      .filter(Boolean);
    // الأزرارُ فوق الطيّة وحدَها: ما يراه قبل أن يمرّر.
    const above = [...document.querySelectorAll('button, a[href], [role="button"]')]
      .filter(e => { const r = e.getBoundingClientRect(); return vis(e) && r.top < innerHeight; }).length;
    const heads = [...document.querySelectorAll('h1, h2')].filter(vis)
      .map(e => (e.textContent || '').trim().slice(0, 60));
    const inputs = [...document.querySelectorAll('input, textarea')].filter(vis)
      .map(e => e.getAttribute('placeholder') || e.getAttribute('aria-label') || e.tagName.toLowerCase());
    const text = (document.body.innerText || '').replace(/\n+/g, ' · ').slice(0, 400);
    // مُعرِّفٌ داخليٌّ ظاهر — القانونُ العاشر
    const ids = (text.match(/\b(view|create|update|delete|share|send)\/[a-z_]+|\b[a-z]{3,}_[a-z]{3,}\b/g) || []);
    return {
      heads, inputs, buttons: btns, buttonsAboveFold: above,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      rawIds: [...new Set(ids)],
      text,
    };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const report = [];
  console.log('\n══ ما يراه الإنسان — المرحلةُ الأولى ══\n');

  for (const s of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2,
      isMobile: s.mobile, hasTouch: s.mobile, locale: 'ar-MA',
    });
    const page = await ctx.newPage();
    page.on('dialog', d => d.dismiss().catch(() => {}));

    for (const sc of STAGE_1) {
      try {
        await page.goto(BASE + sc.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(800);
        if (sc.act === 'type') {
          const box = page.locator('input[type="text"], input:not([type]), textarea').first();
          await box.fill(SAID, { timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(1200);   // المرآةُ الحيّة تُقرأ أثناء الكتابة
        }
        const scene = await readScene(page);
        await page.screenshot({ path: join(OUT, `${sc.id}-${s.id}.png`), fullPage: false });
        report.push({ scene: sc.id, size: s.id, ask: sc.ask, ...scene });
        if (s.id === '390') {
          console.log(`── ${sc.id}  (${sc.ask})`);
          console.log(`   العناوين : ${scene.heads.join(' | ') || '—'}`);
          console.log(`   الخانات  : ${scene.inputs.join(' | ') || '—'}`);
          console.log(`   أزرارٌ فوق الطيّة: ${scene.buttonsAboveFold}  (الكلّ: ${scene.buttons.length})`);
          console.log(`   الأزرار  : ${scene.buttons.slice(0, 10).join(' · ') || '—'}`);
          if (scene.rawIds.length) console.log(`   ⚠️ مُعرِّفاتٌ ظاهرة: ${scene.rawIds.join(', ')}`);
          if (scene.overflowX) console.log(`   ⚠️ تمريرٌ أفقيّ`);
          console.log();
        }
      } catch (e) {
        report.push({ scene: sc.id, size: s.id, error: String(e).slice(0, 120) });
        console.log(`❌ ${sc.id}@${s.id}: ${String(e).slice(0, 90)}`);
      }
    }
    await ctx.close();
  }

  // ملخّصٌ عبر المقاسات — العطبُ الذي لا يظهر إلّا على ٣٦٠
  console.log('── عبر المقاسات ──');
  for (const sc of STAGE_1) {
    const rows = report.filter(r => r.scene === sc.id && !r.error);
    const of = rows.filter(r => r.overflowX).map(r => r.size);
    const ab = rows.map(r => `${r.size}:${r.buttonsAboveFold}`).join(' · ');
    console.log(`   ${sc.id}: أزرارٌ فوق الطيّة ${ab}${of.length ? `  ⚠️ تمريرٌ أفقيّ في ${of.join(', ')}` : ''}`);
  }

  writeFileSync(join(OUT, 'stage-1.json'), JSON.stringify({ at: new Date().toISOString(), report }, null, 1));
  console.log(`\nاللقطات: REPORTS/screens/  (${SIZES.length}×${STAGE_1.length})\n`);
  await browser.close();
})();
