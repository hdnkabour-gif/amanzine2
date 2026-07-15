# 🧠 AMANZINE — Scenario Engine (محرّك السيناريوهات)

> **القاعدة:** لا نخزّن ملايين السيناريوهات — نخزّن **Blueprints** (قوالب).
> أيّ جملة يكتبها المستخدم تتحوّل إلى سيناريو ذكيّ يجمع المعلومات المناسبة،
> ينفّذ العملية، ويتعلّم منها. هذا **قلب** AMANZINE — لا Marketplace ولا Store.

## المبدأ
```
المستخدم يتحدّث بطبيعته
        ↓
Intent Engine   →  ماذا يريد؟ (بيع / كراء / إنشاء نشاط / شراء…)
        ↓
Entity Engine   →  عن ماذا؟ (سيّارة / عقار / مهنة / منتج…)
        ↓
Blueprint Engine →  يحمّل القالب المناسب (حقول مطلوبة/اختياريّة/دليل)
        ↓
يبني السيناريو دفعة واحدة  →  نسبة اكتمال  →  ينفّذ
```
لا نموذج ثابت لكل حالة. تظهر مهنة جديدة غدًا؟ نضيف Blueprint، لا نعيد البناء.

## سلسلة العقول الكاملة (الرؤية)
```
Natural Language → Intent → Entity → Context Brain → Knowledge Graph →
Blueprint Resolver → Scenario Builder → Question Planner → Completeness →
Action Planner → Execution → Learning → Blueprint Evolution → Market Intelligence
```

## ما هو مبنيّ الآن (Client) ✅
| المحرّك | الملفّ | الحالة |
|--------|--------|--------|
| Intent Engine | `src/lib/needEngine.ts` | ✅ نيّات بالدارجة |
| Entity Engine | `blueprints.ts` → `classifyEntity()` | ✅ سيّارة/عقار/مهنة/منتج |
| Context Brain | `core/context.ts` + دمج في Publish | ✅ هويّة/مكان/وقت → يملأ المعروف (المدينة) |
| Blueprint Engine | `blueprints.ts` → `resolveBlueprint()` + وراثة | ✅ قوالب ترث بعضها |
| Question Planner | `blueprints.ts` → `planNext()` | ✅ محادثة: يسأل الأنسب التالي (لا نموذج) |
| Completeness Score | `blueprints.ts` → `completeness()` | ✅ نسبة + أفضل حقل ناقص +٪ |
| Evidence Collector | حقول `evidence:true` (صور/وثائق) | ✅ ضمن القالب |
| Universal Action | `UniversalPublish.tsx` | ✅ محادثة + «عرض الكل» |

## الطبقات التالية (خادم + بيانات) 🔜
| المحرّك | الفكرة |
|--------|--------|
| Action Planner | من جملة واحدة يقرّر سلسلة إجراءات (نشر + إرسال للمشترين + اقتراح سعر + QR…) |
| Blueprint Evolution | كل قالب له نسخ (v1…v12)؛ الذكاء يعتمد الأفضل أداءً تلقائيًّا |
| Market Intelligence | يتعلّم من السوق المغربيّ ويؤثّر في القرارات (Dacia رائجة → يقترحها) |
| Learning Brain | يتعلّم أفضل ترتيب للأسئلة (٩٥٪ يضيفون VIN بعد السؤال الثالث) |

**القوالب الحاليّة:** base ← product · vehicle · realEstate · rental · service.
كلٌّ يرث `base` (العنوان/الثمن/المدينة/الصور) ويضيف حقوله.

**مثال حيّ (مُتحقَّق):**
- «بغيت نبيع Golf 2018» → قالب **سيّارة** (ماركة، موديل، سنة، كيلومترات، وقود، ناقل حركة…)
- «أنا نجّار» → قالب **نشاط مهنيّ** (المهنة، التخصّصات، الخبرة، التنقّل، صور الأعمال…)
- «عندي شقة للكراء» → قالب **كراء** (الثمن اليوميّ، الضمانة، التأمين…)

## الطبقات القادمة (تحتاج خادمًا + بيانات) 🔜
هذه هي القيمة التي يصعب نسخها — تُبنى تدريجيًّا بعد Beta:
1. **Custom Fields** — المستخدم يضيف أيّ حقل (PDF/فيديو/GPS/جدول…). القالب = Blueprint + حقول مخصّصة.
2. **Missing-Info Detector** — يسأل فقط الناقص («Golf 7 2018 130k» → يبقى الثمن والصور والمدينة).
3. **Progressive Questions** — الأسئلة تتفرّع حسب الجواب (أوتوماتيك؟ → DSG/CVT…).
4. **Living Blueprint** — كل قالب يحمل: حقول أساسيّة + مقترحة (من السوق) + ذكيّة + مخصّصة + إحصاءات استخدام + أثر كل حقل على النجاح.
5. **Learning / Market Brain** — «٩٨٪ ممّن باعوا سيّارة أضافوا عدد المالكين» → يقترح إضافته للقالب بضغطة.
6. **Reverse Marketplace** — لم نجد ما تبحث عنه؟ أنشئ «طلب شراء» → كل بائع مطابق يتوصّل بإشعار. (البائع يأتي للمشتري.)
7. **Knowledge Graph** — Car → BMW → X5 → Diesel → Automatic؛ العقل يعرف المطلوب دون سيناريو خاصّ بـ X5.
8. **عقول متعدّدة** — Intent · Blueprint · Question · Extraction · Validation · Market · Recommendation · Learning · Knowledge.

## كيف نوسّع (بلا لمس المنطق)
- **مجال جديد؟** أضِف Blueprint إلى `RAW` في `blueprints.ts` (+ كلمات للكيان في المصنّف).
- **حقل جديد؟** أضِف `BField` بوزن `weight` (يغذّي نسبة الاكتمال) و`evidence` إن كان دليلًا.
- **نيّة جديدة؟** في `needEngine.ts`، ووجّهها `page:'publish'` ليلتقطها المحرّك.

> الشعار فوق كل قرار: **ابدأ من الحاجة.** إن كانت الميزة تعيد المستخدم للقوائم لا لحاجته — لا تُضَف.
