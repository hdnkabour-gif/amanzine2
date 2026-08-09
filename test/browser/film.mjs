#!/usr/bin/env node
// ============================================================
// **الشريط — تسلسلُ ما يراه الإنسان، لا لقطةٌ من وسطه.**
//
//   بُني بعد خطأَين في جلسةٍ واحدة، كلاهما من السبب نفسِه:
//     · صوّرتُ عند ٦٠٠ms فرأيتُ أخضرَ فارغًا فقلتُ «الشاشةُ الأولى فراغ».
//     · صوّرتُ عند ١٧ث فرأيتُ الأخضرَ نفسَه فقلتُ «الفراغُ ما زال».
//   والحقيقةُ التي قالها صاحبُ المشروع في سطر: **ذاك هو الفيديو الأوّل،
//   يعمل كما صُمِّم.** كنتُ ألتقط مشهدًا متحرّكًا بلقطةٍ ساكنةٍ وأحكم.
//
//   فيُسجَّل هنا **شريطٌ متّصل** عبر `Page.startScreencast` (CDP): كلُّ
//   إطارٍ بتوقيته. ثمّ تُجمَّع الإطاراتُ المتشابهةُ في «مشاهد»، فيخرج
//   جدولٌ يقول: **من الثانية كذا إلى كذا كان الإنسانُ يرى هذا.**
//
//   والتشابهُ يُقاس بتوقيعٍ رخيص: متوسّطُ اللون في شبكة ٤×٦. يكفي تمامًا
//   للتفريق بين شاشةِ تحميلٍ وفيديو وبوّابةٍ وصفحةِ هبوط، ولا يحتاج مكتبة.
//
//   لا يحكم هذا الملفُّ على شيء. يصف فقط — وهذا كلُّ ما كان ينقصني.
// ============================================================

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const BASE = process.env.WALK_URL || 'http://127.0.0.1:4173';
const TAG  = process.argv[2] || 'film';
const SECS = +(process.argv[3] || 26);
const OUT  = join(ROOT, 'REPORTS/film', TAG);
mkdirSync(OUT, { recursive: true });

/** توقيعٌ رخيصٌ للإطار: متوسّطُ اللون في شبكة — بلا أيّ مكتبة. */
const GRID_X = 6, GRID_Y = 4;

/** فرقٌ محسوس: عتبةٌ مضبوطةٌ لتفرّق بين مشهدٍ ومشهدٍ لا بين إطارٍ وإطار. */
const DIFF = 26;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true, locale: 'ar-MA',
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  const frames = [];
  const t0 = Date.now();
  cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
    frames.push({ t: Date.now() - t0, data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch { /* أُغلق */ }
  });

  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 55, everyNthFrame: 1 });
  page.goto(BASE + '/', { waitUntil: 'commit' }).catch(() => {});
  await page.waitForTimeout(SECS * 1000);
  try { await cdp.send('Page.stopScreencast'); } catch {}

  console.log(`\n══ الشريط — ${TAG} · ${frames.length} إطارًا في ${SECS}ث ══\n`);
  if (!frames.length) { console.log('⚠️ ما تسجّل ولا إطار'); await browser.close(); process.exit(1); }

  // ── توقيعُ كلّ إطارٍ: يُرسَم في canvas داخل الصفحة (لا مكتبةَ صور) ──
  const sigs = [];
  for (const f of frames) {
    const sig = await page.evaluate(async ([d, gx, gy]) => {
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + d;
      await img.decode().catch(() => {});
      const c = document.createElement('canvas');
      c.width = gx; c.height = gy;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, gx, gy);
      return [...g.getImageData(0, 0, gx, gy).data];
    }, [f.data, GRID_X, GRID_Y]).catch(() => null);
    sigs.push(sig);
  }

  const dist = (a, b) => {
    if (!a || !b) return 999;
    let s = 0, n = 0;
    for (let i = 0; i < a.length; i += 4) { s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3; }
    return s / n;
  };

  // ── تجميعُ المشاهد ──
  const scenes = [];
  let cur = { from: frames[0].t, sig: sigs[0], idx: 0, frames: 1 };
  for (let i = 1; i < frames.length; i++) {
    if (dist(cur.sig, sigs[i]) > DIFF) {
      cur.to = frames[i].t;
      scenes.push(cur);
      cur = { from: frames[i].t, sig: sigs[i], idx: i, frames: 1 };
    } else cur.frames++;
  }
  cur.to = frames[frames.length - 1].t;
  scenes.push(cur);

  // ── الوصف: لونٌ غالبٌ + هل فيه نصٌّ فاتحٌ على داكنٍ أو العكس ──
  const named = [];
  for (const [i, sc] of scenes.entries()) {
    const px = sc.sig;
    let r = 0, g = 0, b = 0, n = 0;
    for (let k = 0; k < px.length; k += 4) { r += px[k]; g += px[k + 1]; b += px[k + 2]; n++; }
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const tone = lum > 170 ? 'فاتح' : lum > 70 ? 'متوسّط' : 'داكن';
    const file = `${String(i + 1).padStart(2, '0')}-${sc.from}ms.jpg`;
    writeFileSync(join(OUT, file), Buffer.from(frames[sc.idx].data, 'base64'));
    named.push({ n: i + 1, from: sc.from, to: sc.to, ms: sc.to - sc.from, rgb: [r, g, b], lum, tone, file });
    console.log(`  ${String(i + 1).padStart(2)}. ${String(sc.from).padStart(6)}ms → ${String(sc.to).padStart(6)}ms  (${String(sc.to - sc.from).padStart(6)}ms)  rgb(${r},${g},${b}) · ${tone}  → ${file}`);
  }

  // ── القفزاتُ الحادّةُ في السطوع: انكسارُ هويّةٍ يُرى ولا يُوصَف ──
  console.log('\n── قفزاتُ السطوع بين مشهدٍ وتاليه ──');
  for (let i = 1; i < named.length; i++) {
    const d = named[i].lum - named[i - 1].lum;
    if (Math.abs(d) >= 60) console.log(`  ⚠️ ${named[i - 1].n} → ${named[i].n} عند ${named[i].from}ms: ${named[i - 1].tone} ⟵ ${named[i].tone}  (فرقُ سطوعٍ ${d > 0 ? '+' : ''}${d})`);
  }

  writeFileSync(join(OUT, 'timeline.json'), JSON.stringify({ at: new Date().toISOString(), tag: TAG, secs: SECS, scenes: named }, null, 1));
  console.log(`\nالمشاهد: REPORTS/film/${TAG}/\n`);
  await browser.close();
})();
