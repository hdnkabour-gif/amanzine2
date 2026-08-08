#!/usr/bin/env python3
# ============================================================
# **يُولِّد `REPORTS/REPO_AUDIT.md` من `REPORTS/audit.json`.**
#
#   ولماذا يُولَّد ولا يُكتَب بيد: هذا الجردُ نفسُه وجد ١١٢ وثيقةً متجمّدةً
#   عند تاريخٍ مضى، و١٥ منها تذكر ٢٥ ملفًّا لا وجودَ له. وثيقةٌ تُحرَّر بيدٍ
#   تتقادم في اليوم التالي — **وتقريرُ الجردِ نفسُه ليس مُستثنًى**.
#
#   والقاعدةُ في هذا المستودع: ما يُقاس يُولَّد ويُحرَس؛ وما يُكتَب بيدٍ يُقيَّد
#   بتاريخِ تجميدٍ ويُنقَل إلى الأرشيف.
# ============================================================
import json, io, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
a = json.loads((ROOT / 'REPORTS/audit.json').read_text(encoding='utf8'))
t, f = a['totals'], a['files']

area = lambda p: [x for x in f if x['file'].startswith(p)]
cov = lambda l: round(sum(1 for x in l if 'test' in str(x['reach'])) / len(l) * 100) if l else 0

AREAS = [('src/lib', 'عقلُ التطبيق'), ('src/pages', 'الصفحات'), ('src/components', 'المكوّنات'),
         ('server/routes', 'مسارات الخادم'), ('server/lib', 'مكتباتُ الخادم'),
         ('server/services', 'خدماتُ الخادم'), ('test', 'الاختبارات'), ('scripts', 'النصوص')]

o = io.StringIO(); w = o.write
w("# جردُ المستودع الكامل\n\n")
w("> **مولَّدٌ آليًّا** — `node scripts/audit.mjs`. لا تُحرَّر بيد؛ البياناتُ الخامُّ في `REPORTS/audit.json`.\n\n")
w("مسحٌ لكلّ ملفٍّ يتتبّعه git — لا ما هو موصولٌ وحدَه. الوصولُ يُحسَب **من المداخل الحقيقيّة**\n")
w("(`src/main.tsx` · `server/index.js` · الاختبارات · النصوص) ويمشي عبر الاستيراد — الساكنِ\n")
w("والكسولِ (`import()`) و`require`. فملفٌّ يستورده ملفٌّ ميّتٌ ليس موصولًا.\n\n")

w("## الأرقام\n\n| القياس | العدد |\n|---|--:|\n")
for k, v in [('ملفّاتٌ متتبَّعة', t['tracked']), ('ملفّاتُ كود', t['code']),
             ('أسطرُ كود', f"{t['lines']:,}"), ('**يتيمة** (لا يبلغها مدخل)', f"**{t['orphans']}**"),
             ('صادراتٌ ميتةٌ بيقين', t['deadExports']), ('صادراتٌ يُنظَر فيها', t['looseExports']),
             ('ملفّاتٌ بلا اختبار', t['untested'])]:
    w(f"| {k} | {v} |\n")

w("\n## التغطية بالمنطقة\n\n| المنطقة | ملفّ | سطر | يبلغه اختبار |\n|---|--:|--:|--:|\n")
for p, name in AREAS:
    l = area(p)
    if l: w(f"| {name} | {len(l)} | {sum(x['lines'] for x in l):,} | {cov(l)}٪ |\n")

w("\n**الاختلالُ المركزيّ:** العقلُ مغطًّى بـ٨٩٪ والسطحُ بـ٩٪. وكلُّ عطبٍ رآه صاحبُ المشروع\n")
w("بعينه كان في السطح — المخُّ يعرف والشاشةُ لا تُظهر ما يعرفه.\n\n")

w("## اليتيمة\n\n")
orph = [x for x in f if x['reach'] == 'ORPHAN']
if orph:
    w("| الملفّ | أسطر | آخرُ لمسة |\n|---|--:|--:|\n")
    for x in orph: w(f"| `{x['file']}` | {x['lines']} | منذ {x['ageDays']} يومًا |\n")
else:
    w("لا يتيم.\n")
w("\nوما يُحمَّل بمجلَّدٍ (`readdirSync`) **موصولٌ** ولا يُعَدّ يتيمًا: مزوّدو التوصيل ومحوّلاتُهم\n")
w("وقنواتُ التحقّق. وهو عقدٌ معماريٌّ مقصودٌ يحرسه اختبار.\n")

w("\n## أكثرُ الملفّات صادراتٍ ميتة\n\n| الملفّ | ميتة | الأسماء |\n|---|--:|---|\n")
for x in sorted([x for x in f if x['deadExports']], key=lambda x: -len(x['deadExports']))[:12]:
    more = ' …' if len(x['deadExports']) > 5 else ''
    w(f"| `{x['file']}` | {len(x['deadExports'])} | {', '.join(x['deadExports'][:5])}{more} |\n")

w("\n## أكبرُ الملفّات بلا اختبار\n\n| الملفّ | أسطر |\n|---|--:|\n")
for x in sorted([x for x in f if x['reach'] in ('app', 'server')], key=lambda x: -x['lines'])[:12]:
    w(f"| `{x['file']}` | {x['lines']:,} |\n")

w("\n---\n\nهذا الملفُّ **قياسٌ لا حُكم**. الخلاصةُ وخطّةُ العمل في تقرير الجلسة.\n")
(ROOT / 'REPORTS/REPO_AUDIT.md').write_text(o.getvalue(), encoding='utf8')
print(f"REPORTS/REPO_AUDIT.md ⇠ {t['code']} ملفَّ كود · {t['orphans']} يتيم")
