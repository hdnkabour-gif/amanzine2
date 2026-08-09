#!/usr/bin/env node
// ============================================================
// **بوّابةُ الافتتاح — ما يراه الإنسانُ بالبكسل، لا ما في الشجرة.**
//
//   الدرسُ الذي دفعتُ ثمنَه: عددتُ ١٧ زرًّا في الـDOM وأعلنتُ «صفحةٌ
//   مزدحمة» — واللقطةُ الحقيقيّةُ كانت **أخضرَ فارغًا وزرَّ «تخطّي» وحدَه**.
//   العناصرُ موجودةٌ في الشجرة **تحت طبقةٍ تغطّيها**، و`offsetParent` لا
//   يرى الغطاء.
//
//   فيُقاس هنا بـ`elementFromPoint` عند مركز العنصر: إن رجع العنصرُ نفسُه
//   فهو مرئيٌّ فعلًا؛ وإن رجع غيرُه فهو **مغطًّى** مهما قالت الشجرة.
//
//   ويُقاس معه ما يُحمَّل من الشبكة قبل أن يكتب الإنسانُ حرفًا.
// ============================================================

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const OUT = join(ROOT, 'REPORTS/gate');
const BASE = process.env.WALK_URL || 'http://127.0.0.1:4173';
const TAG = process.argv[2] || 'run';       // 'before' | 'after'
mkdirSync(OUT, { recursive: true });

const SIZES = [
  { id: '390', w: 390, h: 844, mobile: true },
  { id: '412', w: 412, h: 915, mobile: true },
  { id: 'desktop', w: 1280, h: 900, mobile: false },
];

const kb = (n) => Math.round(n / 1024) + 'KB';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const rows = [];
  console.log(`\n══ بوّابةُ الافتتاح — ${TAG} ══\n`);

  for (const s of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2,
      isMobile: s.mobile, hasTouch: s.mobile, locale: 'ar-MA',
    });
    const page = await ctx.newPage();

    // بايتاتُ الشبكة بالنوع — الفيديو وحدَه هو موضوع هذه التجربة.
    const bytes = { video: 0, script: 0, other: 0 };
    const videoUrls = new Set();
    page.on('response', async r => {
      const u = r.url(); const ct = (r.headers()['content-type'] || '');
      let len = +(r.headers()['content-length'] || 0);
      if (!len) { try { len = (await r.body()).length; } catch { len = 0; } }
      if (/\.mp4|video\//.test(u + ct)) { bytes.video += len; videoUrls.add(u.split('/').pop()); }
      else if (/javascript/.test(ct)) bytes.script += len;
      else bytes.other += len;
    });

    const t0 = Date.now();
    await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 30000 }).catch(() => {});

    // ── **متى يراه الإنسان؟** بالبكسل: العنصرُ في مركزِه هو نفسُه ──
    const seenAt = { h1: 0, input: 0, skip: 0 };
    let covered = null;
    for (let i = 0; i < 300; i++) {
      const st = await page.evaluate(() => {
        const vis = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2 || r.top > innerHeight || r.bottom < 0) return false;
          const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
          const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
          const top = document.elementFromPoint(x, y);
          return !!top && (top === el || el.contains(top) || top.contains(el));
        };
        // **السؤالُ أيًّا كان من يرسمه** — البوّابةُ الساكنةُ أو React.
        //   ما يهمّ متى يقرؤه الإنسان، لا أيُّ طبقةٍ كتبته.
        const h1 = document.getElementById('splash-need-q') || document.querySelector('h1');
        const input = document.getElementById('splash-need-box')
          || document.querySelector('input[type="text"], input:not([type]), textarea');
        // ما الذي يغطّي مركزَ الشاشة الآن؟
        const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return {
          h1: vis(h1), input: vis(input),
          skip: !![...document.querySelectorAll('button')].find(b => /تخطّ/.test(b.textContent || '') && vis(b)),
          coverer: mid ? (mid.id || mid.tagName.toLowerCase() + '.' + String(mid.className || '').slice(0, 24)) : null,
        };
      }).catch(() => ({}));
      const t = Date.now() - t0;
      if (st.h1 && !seenAt.h1) seenAt.h1 = t;
      if (st.input && !seenAt.input) seenAt.input = t;
      if (st.skip && !seenAt.skip) seenAt.skip = t;
      if (covered === null && st.coverer) covered = st.coverer;
      if (seenAt.h1 && seenAt.input) break;
      await page.waitForTimeout(100);
    }

    await page.screenshot({ path: join(OUT, `${TAG}-${s.id}.png`) });
    const row = {
      size: s.id, tag: TAG,
      videoBytes: bytes.video, scriptBytes: bytes.script, otherBytes: bytes.other,
      videos: [...videoUrls],
      h1Ms: seenAt.h1 || null, inputMs: seenAt.input || null, skipMs: seenAt.skip || null,
      firstCoverer: covered,
    };
    rows.push(row);
    console.log(`── ${s.id}`);
    console.log(`   فيديو مُحمَّلٌ قبل أيّ تفاعل: ${kb(bytes.video)}  ${row.videos.join(' · ') || '—'}`);
    console.log(`   JS: ${kb(bytes.script)} · باقي: ${kb(bytes.other)}`);
    console.log(`   السؤالُ مرئيٌّ (بالبكسل): ${row.h1Ms ?? 'ما ظهرش'}ms · الخانة: ${row.inputMs ?? 'ما ظهراتش'}ms`);
    console.log(`   «تخطّي» صالحٌ للنقر عند: ${row.skipMs ?? 'ما ظهرش'}ms`);
    console.log(`   ما يغطّي وسطَ الشاشة أوّلًا: ${row.firstCoverer || '—'}\n`);
    await ctx.close();
  }

  writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify({ at: new Date().toISOString(), tag: TAG, rows }, null, 1));
  console.log(`اللقطات: REPORTS/gate/${TAG}-*.png\n`);
  await browser.close();
})();
