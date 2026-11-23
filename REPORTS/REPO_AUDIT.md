# جردُ المستودع الكامل

> **مولَّدٌ آليًّا** — `node scripts/audit.mjs`. لا تُحرَّر بيد؛ البياناتُ الخامُّ في `REPORTS/audit.json`.

مسحٌ لكلّ ملفٍّ يتتبّعه git — لا ما هو موصولٌ وحدَه. الوصولُ يُحسَب **من المداخل الحقيقيّة**
(`src/main.tsx` · `server/index.js` · الاختبارات · النصوص) ويمشي عبر الاستيراد — الساكنِ
والكسولِ (`import()`) و`require`. فملفٌّ يستورده ملفٌّ ميّتٌ ليس موصولًا.

## الأرقام

| القياس | العدد |
|---|--:|
| ملفّاتٌ متتبَّعة | 758 |
| ملفّاتُ كود | 487 |
| أسطرُ كود | 94,511 |
| **يتيمة** (لا يبلغها مدخل) | **2** |
| صادراتٌ ميتةٌ بيقين | 221 |
| صادراتٌ يُنظَر فيها | 70 |
| ملفّاتٌ بلا اختبار | 131 |

## التغطية بالمنطقة

| المنطقة | ملفّ | سطر | يبلغه اختبار |
|---|--:|--:|--:|
| عقلُ التطبيق | 95 | 16,149 | 89٪ |
| الصفحات | 51 | 20,438 | 10٪ |
| المكوّنات | 51 | 8,046 | 8٪ |
| مسارات الخادم | 33 | 6,166 | 36٪ |
| مكتباتُ الخادم | 48 | 4,555 | 94٪ |
| خدماتُ الخادم | 10 | 1,812 | 50٪ |
| الاختبارات | 101 | 15,625 | 100٪ |
| النصوص | 14 | 2,297 | 7٪ |

**الاختلالُ المركزيّ:** العقلُ مغطًّى بـ٨٩٪ والسطحُ بـ٩٪. وكلُّ عطبٍ رآه صاحبُ المشروع
بعينه كان في السطح — المخُّ يعرف والشاشةُ لا تُظهر ما يعرفه.

## اليتيمة

| الملفّ | أسطر | آخرُ لمسة |
|---|--:|--:|
| `build-package.js` | 183 | منذ 143 يومًا |
| `sw.js` | 70 | منذ 162 يومًا |

وما يُحمَّل بمجلَّدٍ (`readdirSync`) **موصولٌ** ولا يُعَدّ يتيمًا: مزوّدو التوصيل ومحوّلاتُهم
وقنواتُ التحقّق. وهو عقدٌ معماريٌّ مقصودٌ يحرسه اختبار.

## أكثرُ الملفّات صادراتٍ ميتة

| الملفّ | ميتة | الأسماء |
|---|--:|---|
| `src/components/icons.tsx` | 21 | IconAmana, IconJibli, IconDress, IconShoes, IconBag … |
| `src/services/api.ts` | 20 | healthCheck, OrderTimelineEvent, CustomerPage, couponsAPI, mediaAPI … |
| `src/types.ts` | 16 | ProductType, OrderItem, SalesGoal, BrandSettings, SocialConnection … |
| `src/lib/abilities.ts` | 10 | AbilityVerb, AbilityEntity, AbilityRisk, abilitiesFor, abilitiesByVerb … |
| `src/utils/sounds.ts` | 7 | playNewOrder, playApproved, playShipped, playDelivered, playMessage … |
| `src/utils/importSchema.ts` | 6 | ProductSchema, CustomerSchema, OrderSchema, ImportFileSchema, ImportFile … |
| `test/corpus.mjs` | 6 | CARWASH, CLOTHING, MUST_NOT_ACT, KNOWN_SPLITS, JUDGED_ONLY … |
| `src/lib/akg/kb/capabilities.ts` | 4 | CapCategory, registerCapability, getCapability, capabilitiesOfProfession |
| `src/lib/akg/kb/geo.ts` | 4 | citiesOf, regionOfCity, districtsOf, postalOf |
| `src/lib/akg/kb/tools.ts` | 4 | registerTool, getTool, allTools, toolsForProfession |
| `src/lib/akg/userGraph.ts` | 4 | getUserProfile, pushUserAttr, userInferencesFrom, userGraphSize |
| `src/lib/akg/workflow.ts` | 4 | WorkflowStage, PHASE_ORDER, registerWorkflow, allWorkflows |

## أكبرُ الملفّات بلا اختبار

| الملفّ | أسطر |
|---|--:|
| `src/pages/ProductsPage.tsx` | 2,363 |
| `src/pages/SettingsPage.tsx` | 1,458 |
| `src/pages/DeliveryPage.tsx` | 1,433 |
| `src/pages/LivingHome.tsx` | 1,097 |
| `src/pages/Storefront.tsx` | 1,073 |
| `src/pages/OrdersPage.tsx` | 919 |
| `src/pages/MessagesPage.tsx` | 840 |
| `src/pages/GuidePage.tsx` | 742 |
| `src/pages/NavBar.tsx` | 716 |
| `src/pages/CouponsPage.tsx` | 705 |
| `server/index.js` | 692 |
| `src/pages/Marketplace.tsx` | 666 |

---

هذا الملفُّ **قياسٌ لا حُكم**. الخلاصةُ وخطّةُ العمل في تقرير الجلسة.
