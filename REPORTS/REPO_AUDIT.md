# جردُ المستودع الكامل

> **مولَّدٌ آليًّا** — `node scripts/audit.mjs`. لا تُحرَّر بيد؛ البياناتُ الخامُّ في `REPORTS/audit.json`.

مسحٌ لكلّ ملفٍّ يتتبّعه git — لا ما هو موصولٌ وحدَه. الوصولُ يُحسَب **من المداخل الحقيقيّة**
(`src/main.tsx` · `server/index.js` · الاختبارات · النصوص) ويمشي عبر الاستيراد — الساكنِ
والكسولِ (`import()`) و`require`. فملفٌّ يستورده ملفٌّ ميّتٌ ليس موصولًا.

## الأرقام

| القياس | العدد |
|---|--:|
| ملفّاتٌ متتبَّعة | 721 |
| ملفّاتُ كود | 457 |
| أسطرُ كود | 86,205 |
| **يتيمة** (لا يبلغها مدخل) | **2** |
| صادراتٌ ميتةٌ بيقين | 213 |
| صادراتٌ يُنظَر فيها | 70 |
| ملفّاتٌ بلا اختبار | 135 |

## التغطية بالمنطقة

| المنطقة | ملفّ | سطر | يبلغه اختبار |
|---|--:|--:|--:|
| عقلُ التطبيق | 91 | 15,234 | 89٪ |
| الصفحات | 51 | 20,096 | 10٪ |
| المكوّنات | 51 | 7,944 | 8٪ |
| مسارات الخادم | 33 | 5,889 | 30٪ |
| مكتباتُ الخادم | 43 | 3,965 | 91٪ |
| خدماتُ الخادم | 10 | 1,731 | 50٪ |
| الاختبارات | 93 | 13,524 | 100٪ |
| النصوص | 12 | 1,783 | 8٪ |

**الاختلالُ المركزيّ:** العقلُ مغطًّى بـ٨٩٪ والسطحُ بـ٩٪. وكلُّ عطبٍ رآه صاحبُ المشروع
بعينه كان في السطح — المخُّ يعرف والشاشةُ لا تُظهر ما يعرفه.

## اليتيمة

| الملفّ | أسطر | آخرُ لمسة |
|---|--:|--:|
| `build-package.js` | 183 | منذ 11 يومًا |
| `sw.js` | 70 | منذ 11 يومًا |

وما يُحمَّل بمجلَّدٍ (`readdirSync`) **موصولٌ** ولا يُعَدّ يتيمًا: مزوّدو التوصيل ومحوّلاتُهم
وقنواتُ التحقّق. وهو عقدٌ معماريٌّ مقصودٌ يحرسه اختبار.

## أكثرُ الملفّات صادراتٍ ميتة

| الملفّ | ميتة | الأسماء |
|---|--:|---|
| `src/components/icons.tsx` | 21 | IconAmana, IconJibli, IconDress, IconShoes, IconBag … |
| `src/services/api.ts` | 19 | healthCheck, CustomerPage, couponsAPI, mediaAPI, AvailabilityTemplate … |
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
| `src/pages/DeliveryPage.tsx` | 1,393 |
| `src/pages/LivingHome.tsx` | 1,088 |
| `src/pages/Storefront.tsx` | 1,067 |
| `server/migrate.js` | 944 |
| `src/pages/MessagesPage.tsx` | 840 |
| `src/pages/OrdersPage.tsx` | 825 |
| `src/pages/GuidePage.tsx` | 742 |
| `src/pages/NavBar.tsx` | 716 |
| `src/pages/CouponsPage.tsx` | 705 |
| `server/index.js` | 678 |

---

هذا الملفُّ **قياسٌ لا حُكم**. الخلاصةُ وخطّةُ العمل في تقرير الجلسة.
