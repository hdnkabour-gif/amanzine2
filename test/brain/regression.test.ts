import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { abilityFor } from '../../src/lib/abilities';
import { decideExecution } from '../../src/lib/executionPolicy';

// ============================================================
// **مدوّنةُ الانحدار: جملٌ سقطت مرّةً، فلا تسقط ثانيةً بصمت.**
//
//   مدوّنتُنا الأصليّة (`test/corpus.mjs`) **كُتبت عندنا** — فهي تقيس ما نعرف
//   أنّه يُفهَم. وحين كتب صاحبُ المشروع تسعَ عشرةَ جملةً من استعماله الحقيقيّ
//   سقطت **سبعٌ** منها. وذاك حكمٌ على المدوّنة لا على الجمل.
//
//   وهذه المدوّنةُ مختلفةُ الأصل عمدًا: **كلُّ سطرٍ فيها عطبٌ وقع فعلًا** —
//   من لقطات شاشةٍ حيّة، أو من جملِ صاحب المشروع، أو من قياسٍ كشف تناقضًا.
//   لا جملةَ هنا اختُرعت لتنجح.
//
//   وتُكتَب **بالحصيلة لا بالحقول الداخليّة**: القدرةُ والحكمُ والوجهة — أي
//   ما يراه الإنسان. فتبديلُ طبقةٍ داخليّةٍ حرٌّ ما دام ما يصل الإنسانَ
//   واحدًا؛ وهذا هو الفرقُ بين حارسِ سلوكٍ وحارسِ تنفيذ.
// ============================================================

const READ_ENOUGH = 0.5;
const judge = (s: string, lastProduct?: { id: string; name: string }) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  const act = (u.action?.confidence ?? 0) >= READ_ENOUGH ? u.action : null;
  const m = abilityFor({ action: act, intent: r?.intent, stance: u.stance, service: u.service });
  const d = decideExecution(u, m || undefined, false, { raw: s, lastProduct }) as any;
  return { ability: m?.id, verdict: d.verdict, page: d.dest?.page, service: u.service, say: d.say };
};

/** جملةٌ · القدرةُ المنتظَرة · الحكم · وسببُ وجودها هنا. */
type Row = [string, string | undefined, string, string];

const ROWS: Row[] = [
  // ── العقار: كان كراءً وحدَه ──────────────────────────────────
  ['بغيت نكري دار',        'SEEK_LISTING',    'execute', 'المكتري — كان يعمل'],
  ['عندي دار للكراء',      'PUBLISH_LISTING', 'execute', 'المُكري — كان يعمل'],
  ['بغيت نشري دار',        'SEEK_LISTING',    'execute', '**كان `BUY_PRODUCT` ⇒ «شنو محتاج بالضبط؟»**'],
  ['كنقلب على دار',        'SEEK_LISTING',    'execute', '**كان بلا مجالٍ أصلًا**'],
  ['بغيت نبيع دار ديالي',  'PUBLISH_LISTING', 'execute', '**كان `SELL_PRODUCT` ⇒ «أيّ منتوج؟»** — الدارُ سلعةٌ في كتالوج'],
  ['عندي محل للبيع',       'PUBLISH_LISTING', 'execute', '**كان «أيّ منتوج؟»** — والمحلُّ أصلٌ يُعلَن لا بضاعةٌ في رفّ'],

  // ── تتبّعُ الطلب: حرفٌ واحدٌ يفصل ─────────────────────────────
  ['بغيت نشوف في وصلات الكوموند ديال طنجة', 'VIEW_ORDERS', 'execute', 'المرجعُ الذي كان يعمل'],
  ['في وصلات الكوموند ديال طنجة',           'VIEW_ORDERS', 'execute', '**كان «ما فهمتش مزيان»** — سقطت النونُ فسقط الفهم'],

  // ── الأكل: عطبٌ إملائيٌّ لا فهميّ ────────────────────────────
  ['مكرهتش شي سندويش طون بالحرور', 'FIND_PROVIDER', 'execute', '**كان «ما فهمتش»** — «سندويتش» معروفةٌ و«سندويش» لا'],
  ['مكرهتش شي قهوة',               'FIND_PROVIDER', 'execute', 'المرجعُ الذي كان يعمل'],

  // ── الحدُّ الصادق: فُهم ولا باب ───────────────────────────────
  //   والقدرةُ تبقى `FIND_PROVIDER` — مطابقةٌ خشنةٌ من نيّةٍ عامّة. والحكمُ
  //   وحدَه هو ما تغيّر، وهو الصواب: **الحدُّ لا يخترع قدرةً ولا يمحو واحدة**،
  //   يمنع السؤالَ العاجزَ ويقول الصدق. ولو ألغى القدرةَ لَخرج عن حدّه.
  ['بغيت نمشي لطنجة',                   'FIND_PROVIDER', 'soon', '**كان «شنو محتاج بالضبط؟»** — سؤالٌ لا جوابَ له'],
  ['بغيت نمشي الحي عندي غير 10 دراهم',  'FIND_PROVIDER', 'soon', '**كان يُساق إلى إعدادات حسابه** بقراءةٍ ٠٫٣٥'],

  // ── ما كان يعمل ويجب ألّا ينكسر ──────────────────────────────
  ['كنقلب على حداد',                'FIND_PROVIDER',    'execute', 'حارسُ الاتّجاه المعاكس'],
  ['شحال ثمن التوصيل لمكناس',       'VIEW_DELIVERY_PROVIDERS', 'execute', 'بابٌ يعمل — لا يبتلعه حدُّ النقل'],
  ['أنا عندي محل ديال المسمن والحرشة', 'CREATE_WORKSPACE', 'execute', 'صاحبُ محلّ — حرفتُه مقروءةٌ فلا يُسأل عنها'],
  ['بغيت نبدل النمرة ديال المحل',   'CHANGE_PHONE',     'ask',     'فعلٌ إداريٌّ صريح'],
  ['رجعت لدار',                     'BUY_PRODUCT',      'ask',     'بيتُ الرجل لا صفقةٌ عقاريّة'],
];

test('**مدوّنةُ الانحدار — كلُّ سطرٍ عطبٌ وقع فعلًا**', () => {
  const broke: string[] = [];
  for (const [s, ability, verdict, why] of ROWS) {
    const got = judge(s);
    if (got.ability !== ability || got.verdict !== verdict) {
      broke.push(`«${s}»\n      المنتظَر: ${ability} / ${verdict}\n      الواقع:  ${got.ability} / ${got.verdict}\n      لماذا هنا: ${why}`);
    }
  }
  assert.deepEqual(broke, [], `\n  ارتدّ ${broke.length} من ${ROWS.length}:\n    ${broke.join('\n    ')}\n`);
});

test('والإشارةُ تُحَلّ حين يوجد جواب — ولا تُخمَّن حين لا يوجد', () => {
  // «بغيت نصايب تصويرة لهاد المنتوج» قِيست مرّةً فبدت عطبًا («أيّ منتج؟»)،
  //   وكان القياسُ **بلا سياق**. ومع منتوجٍ معلومٍ تعمل تمامًا. فالسؤالُ
  //   هناك صوابٌ لا نقص: **السؤالُ الصادقُ خيرٌ من تخمينِ منتوجٍ يُحذَف**.
  const p = { id: 'p1', name: 'قميجة زرقاء' };
  for (const [s, want] of [['بغيت نصايب تصويرة لهاد المنتوج', 'MANAGE_MEDIA'],
                           ['بغيت نزيد وصف و هاشتاڭ لهاد المنتوج', 'GENERATE_CONTENT']] as const) {
    assert.equal(judge(s, p).ability, want);
    assert.equal(judge(s, p).verdict, 'execute', `«${s}» سُئل وعنده جواب`);
    assert.equal(judge(s).verdict, 'ask', `«${s}» خُمِّن بلا سياق`);
  }
});

test('**والوجهةُ تتبع الاتّجاه** — الطالبُ لا يُساق إلى النشر', () => {
  // أخطرُ ارتدادٍ ممكنٍ في العقار: أن يُنقَل العطبُ لا أن يُزال.
  for (const s of ['بغيت نكري دار', 'بغيت نشري دار', 'كنقلب على دار']) {
    assert.notEqual(judge(s).page, 'publish', `«${s}» سِيق إلى صفحة النشر`);
  }
  for (const s of ['عندي دار للكراء', 'بغيت نبيع دار ديالي', 'عندي محل للبيع']) {
    assert.equal(judge(s).page, 'publish', `«${s}» ما وصلش لصفحة النشر`);
  }
});
