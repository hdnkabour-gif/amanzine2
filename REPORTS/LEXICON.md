# لغةُ أمانزين وما يستطيع فعلَه

> **مُولَّدٌ آليًّا** بـ`npm run report:lexicon` — لا يُحرَّر بيد.
> يُقرأ من نفس المصادر التي يقرؤها التطبيقُ في التشغيل، فلا يكذب بعد تعديل.

آخرُ توليد: 2026-08-07

## ① الخلاصةُ بالأرقام

| ما هو | العدد |
|---|---|
| مفهومًا يفهمه التطبيق | **٢٠٧** |
| مصطلحًا مميَّزًا (كلَّ اللغات) | **٢٩٦٢** |
| قدرةً يستطيع تنفيذها | **٨٩** |
| زوجَ فعلٍ×هدفٍ مقروءًا | **١٠٨** |
| غايةَ حياةٍ تُقرأ | **٧** |
| مدينةً كبرى بأحيائها | **٤٥** |
| مكانًا مغربيًّا (جماعاتٌ ومراكز) | **٤٠٩** |

## ② ما يستطيع التطبيقُ تنفيذَه

كلُّ سطرٍ **عقد**: فعلٌ وكيانٌ وما يحتاجه قبل التنفيذ وخطورتُه وأين يعيش.
و«الخطورة» تحدّد العتبة: `low` يُنفَّذ بثقةٍ أقلّ، و`high` **يُؤكَّد دائمًا**.

| ما يقوله للإنسان | الفعل | الكيان | يحتاج | الخطورة | الصفحة | المسار |
|---|---|---|---|---|---|---|
| تبيع منتوج | offer | product | أيّ منتوج؟ · بشحال؟ | medium | publish | /api/products |
| تقدّم خدمة | offer | service | شنو نوع النشاط ولا الخدمة؟ | medium | publish | /api/providers |
| تنشر إعلان | offer | listing | شنو محتاج بالضبط؟ | medium | publish | /api/listings |
| تشري شي حاجة | seek | product | شنو محتاج بالضبط؟ | low | home | /api/search |
| تقلّب على حرفي ولا مختصّ | seek | provider | شنو محتاج بالضبط؟ | low | home | /api/business |
| تكتب اللي محتاج ونقلّبو ليك | seek | need | شنو محتاج بالضبط؟ | low | home | /api/needs |
| تاخد موعد | book | booking | مع من؟ · إمتا؟ | medium | bookings | /api/bookings |
| تصايب المحلّ ديالك | create | workspace | شنو نوع النشاط ولا الخدمة؟ | medium | settings | /api/settings |
| تبدّل معلومات المحلّ | update | workspace | — | medium | settings | /api/settings |
| تحيّد المحلّ ديالك | delete | workspace | أيّ محلّ؟ | high | settings | /api/providers |
| تزيد منتوج | create | product | أيّ منتوج؟ · بشحال؟ | medium | products | /api/products |
| تبدّل منتوج (الثمن، الستوك، التصويرة) | update | product | أيّ منتوج؟ | medium | products | /api/products |
| تحيّد منتوج | delete | product | أيّ منتوج؟ | high | products | /api/products |
| تصايب تخفيض ولا كوبون | create | coupon | — | medium | coupons | /api/coupons |
| تسيّر نقط الوفاء ديال الزبناء | update | customer | — | medium | customers | /api/loyalty |
| تصيفط رسالة لكل الزبناء | send | message | شنو تبغي تقول؟ · لمن؟ | high | notifications | /api/broadcast |
| تزيد تصاور للمنتوج | create | media | — | low | products | /api/media |
| تربط الواتساب ولا قناة أخرى بالحساب | create | channel | — | medium | connections | /api/settings |
| تصايب وصف ولا هاشتاگ للمنتوج | create | content | أيّ منتوج؟ | low | products | /api/ai |
| تعدّل تصويرة (نصّ، شعار، خلفيّة) | update | media | — | low | editor | — |
| تصايب بانير ولا إعلان | create | media | — | low | banner | — |
| تجيب المنتوجات من محادثة ولا ملفّ | create | product | — | medium | import | /api/products |
| تشوف الطلبات | view | order | — | low | orders | /api/orders |
| تبدّل حالة ولا عنوان الطلب | update | order | أيّ طلب؟ | medium | orders | /api/orders |
| تشوف فين وصل الطلب | view | shipment | أيّ طلب؟ | low | بلا صفحةٍ **عمدًا** ⁽¹⁾ | /api/orders |
| تصيفط الطلب مع شركة التوصيل | send | shipment | أيّ طلب؟ · أيّ شركة؟ | high | delivery | /api/delivery |
| تصيفط الطلب لشركة ما عندهاش API | send | shipment | أيّ طلب؟ | high | delivery | /api/delivery-auto |
| تربط شركة التوصيل ديالك | create | delivery_provider | أيّ شركة؟ · التوكن ديال الشركة؟ | high | connections | /api/delivery |
| تشوف الزبناء ديالك | view | customer | — | low | customers | /api/customers |
| تهضر مع زبون | send | message | مع من؟ | medium | conversations | /api/conversations |
| تشوف الرصيد ديالك | view | wallet | — | low | wallet | /api/wallet |
| تسجّل خلاص ولا تأكّد أنّه وصل | send | payment | شحال؟ · بأشنو؟ | high | wallet | /api/payment |
| تأكّد نمرتك ولا بريدك | view | account | — | low | بلا صفحةٍ **عمدًا** ⁽¹⁾ | /api/verify |
| تدخل ولا تصايب حساب | create | account | شنو النمرة؟ | medium | profile | /api/auth |
| تبدّل النمرة ديالك | update | phone | شنو النمرة؟ | high | profile | /api/auth |
| تبدّل العنوان | update | address | شنو العنوان؟ | medium | settings | /api/settings |
| تبدّل اللغة | update | language | — | low | settings | — |
| تبدّل الإعدادات | update | settings | — | medium | settings | /api/settings |
| تسيّر التنبيهات | update | settings | — | low | notifications | /api/push |
| الذاكرة ديالك تبقى معاك ف كل جهاز | update | settings | — | low | بلا صفحةٍ **عمدًا** ⁽¹⁾ | /api/memory |
| تشوف اللي جديد قربك | view | listing | — | low | home | /api/feed |
| تكتشف اللي كاين ف المدينة ديالك | view | provider | — | low | home | /api/discover |
| نقترح عليك اللي يناسبك | view | listing | — | low | home | /api/recommend |
| تسوّل ونجاوبك | view | knowledge | شنو تبغي تقول؟ | low | assistant | /api/ai |
| تشوف شحال بعتي وشنو كيمشي | view | report | — | low | analytics | /api/analytics |
| تشوف النصائح ديال النشاط ديالك | view | report | — | low | insights | /api/insights |
| تشوف كلشي ف صفحة وحدة | view | report | — | low | dashboard | — |
| تقرا كيفاش تستعمل التطبيق | view | knowledge | — | low | guide | — |
| تسيّر الخدمات ديالك | update | service | — | medium | services | /api/providers |
| تراجع وتقبل الإعلانات | update | listing | — | high | moderation | /api/listings |
| تزيد وتصحّح المعرفة | update | knowledge | — | high | knowledge | /api/knowledge |
| تسجّل زيارة ميدانية | create | provider | — | medium | field-visit | /api/providers |
| تشوف المنتوجات ديالك | view | product | — | low | products | /api/products |
| تشوف الخدمات ديالك | view | service | — | low | services | /api/providers |
| تشوف التخفيضات ديالك | view | coupon | — | low | coupons | /api/coupons |
| تشوف المواعيد | view | booking | — | low | bookings | /api/bookings |
| تشوف الرسائل | view | message | — | low | conversations | /api/conversations |
| تشوف شركات التوصيل | view | delivery_provider | — | low | delivery | /api/delivery |
| تشوف الإعدادات | view | settings | — | low | settings | /api/settings |
| تشوف معلومات المحلّ | view | workspace | — | low | settings | /api/settings |
| تشوف النمرة ديالك | view | phone | — | low | settings | /api/settings |
| تشوف العنوان | view | address | — | low | settings | /api/settings |
| تشوف اللغة | view | language | — | low | settings | /api/settings |
| تشوف التصاور ديالك | view | media | — | low | products | /api/media |
| تشوف الأداءات | view | payment | — | low | wallet | /api/payment |
| تشوف الطلبات اللي كتبو الناس | view | need | — | low | home | /api/needs |
| تزيد زبون | create | customer | مع من؟ | medium | customers | /api/customers |
| تسجّل طلب | create | order | أيّ منتوج؟ | medium | orders | /api/orders |
| تزيد خدمة | create | service | شنو نوع النشاط ولا الخدمة؟ | medium | services | /api/providers |
| تزيد إعلان | create | listing | شنو محتاج بالضبط؟ | medium | publish | /api/listings |
| تسجّل موعد | create | booking | مع من؟ · إمتا؟ | medium | bookings | /api/bookings |
| تصيفط رسالة لزبون | create | message | مع من؟ · شنو تبغي تقول؟ | medium | conversations | /api/conversations |
| تكتب حاجة باش نقلّبو ليك | create | need | شنو محتاج بالضبط؟ | low | home | /api/needs |
| تعلّم التطبيق مفهوم جديد | create | knowledge | شنو محتاج بالضبط؟ | medium | knowledge | /api/knowledge |
| تبدّل تخفيض | update | coupon | — | medium | coupons | /api/coupons |
| تبدّل موعد | update | booking | — | medium | bookings | /api/bookings |
| تبدّل إعدادات شركة التوصيل | update | delivery_provider | أيّ شركة؟ | medium | delivery | /api/delivery |
| تحيّد تخفيض | delete | coupon | — | high | coupons | /api/coupons |
| تحيّد زبون | delete | customer | مع من؟ | high | customers | /api/customers |
| تحيّد خدمة | delete | service | شنو نوع النشاط ولا الخدمة؟ | high | services | /api/providers |
| تحيّد شركة التوصيل | delete | delivery_provider | أيّ شركة؟ | high | delivery | /api/delivery |
| تشارك رابط محلّك | send | workspace | — | low | settings | /api/settings |
| تشارك رابط منتوج | send | product | أيّ منتوج؟ | low | products | /api/products |
| تصيفط تأكيد الطلب للزبون | send | order | أيّ طلب؟ | medium | orders | /api/orders |
| تصيفط تخفيض للزبناء | send | coupon | لمن؟ | high | coupons | /api/coupons |
| تصيفط رسالة لزبناءك | send | customer | لمن؟ · شنو تبغي تقول؟ | high | customers | /api/customers |
| تقلّب على خدمة | seek | service | شنو محتاج بالضبط؟ | low | home | /api/providers |
| تقلّب على إعلان | seek | listing | شنو محتاج بالضبط؟ | low | home | /api/listings |
| تسجّل نشاطك باش يلقاوك الناس | offer | provider | شنو نوع النشاط ولا الخدمة؟ | medium | publish | /api/providers |

⁽¹⁾ **بلا صفحةٍ عمدًا** — ولكلٍّ سببٌ مكتوبٌ ومحروسٌ في `test/abilities.test.mjs`:
· `TRACK_ORDER` — بابُه يعمل (`/track/:userId`) وهو خارج `PAGE_IDS` لأنّ تلك صفحاتُ التاجر، وهذا بابُ الزبون.
· `VERIFY_IDENTITY` — يظهر **داخل** الفعل الذي طلبه (تأكيدُ طلبٍ · تبديلُ نمرة)، وصفحةٌ له بابٌ يُتحقَّق فيه من لا شيء.
· `SYNC_MEMORY` — يقع من نفسه عند الدخول والتبدّل. قيمتُه كلُّها في أنّه لا يُطلَب.

**ولا ثغرةَ باقية:** كلُّ قدرةٍ إمّا لها صفحةٌ أو سببٌ مكتوبٌ لغيابها.

### الأفعالُ التي يقبلها كلُّ كيان

ما ليس هنا يُقابَل بـ«هادشي ما كايتديرش أصلًا» — صدقًا لا اعتذارًا.

| الكيان | الأفعالُ المقبولة |
|---|---|
| product | offer · seek · create · update · delete · view · send |
| service | offer · seek · create · update · delete · view |
| listing | offer · seek · create · update · delete · view |
| workspace | create · update · delete · view · send |
| order | create · update · view · send |
| shipment | send · view |
| customer | create · update · delete · view · send |
| booking | book · create · update · delete · view |
| coupon | create · update · delete · view · send |
| wallet | view |
| payment | send · view |
| message | create · view · send |
| account | create · view |
| phone | update · view |
| address | update · view |
| language | update · view |
| settings | update · view |
| delivery_provider | create · update · delete · view |
| content | create |
| channel | create |
| media | create · update · delete · view |
| knowledge | create · update · view |
| report | view |
| need | seek · create · view |
| provider | offer · seek · create · view |

## ③ الأوامرُ الإداريّةُ المقروءة

«شنو بغيتي **ندير**» لا «شنو بغيتي **تشري**». الجملةُ تُفصَل: فعلٌ + هدفٌ + نطاق.

| مثالٌ يُقرأ | الفعل | الهدف | ما ينقص بعده |
|---|---|---|---|
| وريني رقم الهاتف | view | phone | — |
| وريني كلمة السر | view | password | — |
| وريني اللغة | view | language | — |
| وريني حسابي | view | account | — |
| وريني المحل | view | workspace | — |
| وريني وقت الخدمة | view | shop_hours | — |
| وريني التوصيل | view | delivery | — |
| وريني الواتساب | view | channel | — |
| وريني الثمن | view | price | أيّ منتج؟ · بشحال؟ |
| وريني المخزون | view | stock | أيّ منتج؟ |
| وريني التصويرة | view | photo | أيّ منتج؟ |
| وريني الوصف | view | content | أيّ منتج؟ |
| وريني المنتوج | view | product | — |
| وريني الطلبات | view | orders | — |
| وريني الزبناء | view | customers | — |
| وريني كوبون | view | coupon | — |
| وريني المحفظة | view | wallet | — |
| وريني الاعدادات | view | settings | — |
| زيد رقم الهاتف | create | phone | — |
| زيد كلمة السر | create | password | — |
| زيد اللغة | create | language | — |
| زيد حسابي | create | account | — |
| زيد المحل | create | workspace | — |
| زيد وقت الخدمة | create | shop_hours | — |
| زيد التوصيل | create | delivery | — |
| زيد الواتساب | create | channel | — |
| زيد الثمن | create | price | أيّ منتج؟ · بشحال؟ |
| زيد المخزون | create | stock | أيّ منتج؟ |
| زيد التصويرة | create | photo | أيّ منتج؟ |
| زيد الوصف | create | content | أيّ منتج؟ |
| زيد المنتوج | create | product | — |
| زيد الطلبات | create | orders | — |
| زيد الزبناء | create | customers | — |
| زيد كوبون | create | coupon | — |
| زيد المحفظة | create | wallet | — |
| زيد الاعدادات | create | settings | — |
| بدل رقم الهاتف | update | phone | — |
| بدل كلمة السر | update | password | — |
| بدل اللغة | update | language | — |
| بدل حسابي | update | account | — |
| بدل المحل | update | workspace | — |
| بدل وقت الخدمة | update | shop_hours | — |
| بدل التوصيل | update | delivery | — |
| بدل الواتساب | update | channel | — |
| بدل الثمن | update | price | أيّ منتج؟ · بشحال؟ |
| بدل المخزون | update | stock | أيّ منتج؟ |
| بدل التصويرة | update | photo | أيّ منتج؟ |
| بدل الوصف | update | content | أيّ منتج؟ |
| بدل المنتوج | update | product | — |
| بدل الطلبات | update | orders | — |
| بدل الزبناء | update | customers | — |
| بدل كوبون | update | coupon | — |
| بدل المحفظة | update | wallet | — |
| بدل الاعدادات | update | settings | — |
| حيد رقم الهاتف | delete | phone | تأكيد: هذا لا يُسترجَع |
| حيد كلمة السر | delete | password | تأكيد: هذا لا يُسترجَع |
| حيد اللغة | delete | language | تأكيد: هذا لا يُسترجَع |
| حيد حسابي | delete | account | تأكيد: هذا لا يُسترجَع |
| حيد المحل | delete | workspace | تأكيد: هذا لا يُسترجَع |
| حيد وقت الخدمة | delete | shop_hours | تأكيد: هذا لا يُسترجَع |
| حيد التوصيل | delete | delivery | تأكيد: هذا لا يُسترجَع |
| حيد الواتساب | delete | channel | تأكيد: هذا لا يُسترجَع |
| حيد الثمن | delete | price | أيّ منتج؟ · تأكيد: هذا لا يُسترجَع · بشحال؟ |
| حيد المخزون | delete | stock | أيّ منتج؟ · تأكيد: هذا لا يُسترجَع |
| حيد التصويرة | delete | photo | أيّ منتج؟ · تأكيد: هذا لا يُسترجَع |
| حيد الوصف | delete | content | أيّ منتج؟ · تأكيد: هذا لا يُسترجَع |
| حيد المنتوج | delete | product | تأكيد: هذا لا يُسترجَع |
| حيد الطلبات | delete | orders | تأكيد: هذا لا يُسترجَع |
| حيد الزبناء | delete | customers | تأكيد: هذا لا يُسترجَع |
| حيد كوبون | delete | coupon | تأكيد: هذا لا يُسترجَع |
| حيد المحفظة | delete | wallet | تأكيد: هذا لا يُسترجَع |
| حيد الاعدادات | delete | settings | تأكيد: هذا لا يُسترجَع |
| شارك رقم الهاتف | share | phone | — |
| شارك كلمة السر | share | password | — |
| شارك اللغة | share | language | — |
| شارك حسابي | share | account | — |
| شارك المحل | share | workspace | — |
| شارك وقت الخدمة | share | shop_hours | — |
| شارك التوصيل | share | delivery | — |
| شارك الواتساب | share | channel | — |
| شارك الثمن | share | price | أيّ منتج؟ · بشحال؟ |
| شارك المخزون | share | stock | أيّ منتج؟ |
| شارك التصويرة | share | photo | أيّ منتج؟ |
| شارك الوصف | share | content | أيّ منتج؟ |
| شارك المنتوج | share | product | — |
| شارك الطلبات | share | orders | — |
| شارك الزبناء | share | customers | — |
| شارك كوبون | share | coupon | — |
| شارك المحفظة | share | wallet | — |
| شارك الاعدادات | share | settings | — |
| صيفط رقم الهاتف | send | phone | — |
| صيفط كلمة السر | send | password | — |
| صيفط اللغة | send | language | — |
| صيفط حسابي | send | account | — |
| صيفط المحل | send | workspace | — |
| صيفط وقت الخدمة | send | shop_hours | — |
| صيفط التوصيل | send | delivery | — |
| صيفط الواتساب | send | channel | — |
| صيفط الثمن | send | price | أيّ منتج؟ · بشحال؟ |
| صيفط المخزون | send | stock | أيّ منتج؟ |
| صيفط التصويرة | send | photo | أيّ منتج؟ |
| صيفط الوصف | send | content | أيّ منتج؟ |
| صيفط المنتوج | send | product | — |
| صيفط الطلبات | send | orders | — |
| صيفط الزبناء | send | customers | — |
| صيفط كوبون | send | coupon | — |
| صيفط المحفظة | send | wallet | — |
| صيفط الاعدادات | send | settings | — |

## ④ غاياتُ الحياة — ما وراء الطلب

«بنتي داخلة للمدرسة» ليست طلبَ شراء: هي حالٌ يُشتقّ منها ما يليق.

| الغاية | ما يُسأل عنها |
|---|---|
| الدخول المدرسيّ | مبروك 👏 شنو خاصّها دابا — حوايج، أدوات القراية، ولا نقل مدرسيّ؟ |
| العرس | مبروك ❤️ من أين نبداو — القفطان، القاعة، التصوير، ولا الحلويات؟ |
| مولودٌ جديد | الله يجعلو من الصالحين 🤍 شنو خاصّك — حوايج الصغير، حفاضات، سرير، ولا طبيب أطفال؟ |
| دارٌ جديدة | بالمبروك 🏡 شنو خاصّك أوّلًا — نقل الأثاث، صباغة، كهرباء، ولا أثاث؟ |
| سفر | تسافر بالسلامة ✈️ شنو خاصّك — تذكرة، كراء طوموبيل، ولا شي حوايج؟ |
| العيد | عواشر مبروكة 🌙 شنو كتقلّب عليه — حوايج، حلويات، ولا حلاقة؟ |
| رمضان | رمضان مبارك 🌙 شنو خاصّك — حلويات، ماكلة، ولا شي حاجة أخرى؟ |

## ⑤ اللغةُ التي يفهمها

خمسةُ أسطحٍ لكلّ مفهوم: الدارجة · العربيّة · الفرنسيّة · الإنجليزيّة · **اللاتينيّة**
(Arabizi — «bghit» · «3andi» · «7aja»)، وكلُّها تصل إلى نفس المفهوم.

| الفئة | المفاهيم | مصطلحات |
|---|---|---|
| (بلا فئة) | ١٠٤ | ١٥٤٦ |
| fashion | ٢٠ | ٧١٦ |
| automotive | ١١ | ٣٧٨ |
| electronics | ٦ | ١٩١ |
| تجارة / غذاء | ٣ | ٤٦ |
| digital | ٣ | ٧٥ |
| home | ٣ | ١٠١ |
| معلوميات | ٣ | ٥٢ |
| home_services | ٢ | ٧٨ |
| مأكولات ومشروبات | ٢ | ٢٠٤ |
| food | ٢ | ٦١ |
| vehicle | ١ | ٣٩ |
| حرف يدوية / خشب | ١ | ٢٧ |
| دارجة: بناء / زليج | ١ | ٣٠ |
| حرف يدوية / معادن | ١ | ١٠ |
| سيارات / تجميل | ١ | ٢٧ |
| سيارات | ١ | ١٢ |
| سيارات / تنجيد | ١ | ١١ |
| سيارات / كاروسوري | ١ | ١٠ |
| سيارات / زجاج | ١ | ١٢ |
| تجارة / أدوات منزلية | ١ | ١٣ |
| حرف / منزل | ١ | ١١ |
| خدمات / إلكترونيات ميكانيكية | ١ | ١١ |
| تجارة / غذاء وصحة | ١ | ١١ |
| خدمات / تصوير | ١ | ١٠ |
| تجارة / سيارات | ١ | ١١ |
| حرف / جلديات | ١ | ١٠ |
| خدمات / أمان | ١ | ١٢ |
| تجارة / أزياء | ١ | ٦٧ |
| دارجة: سفر / وكالة | ١ | ١٩ |
| دارجة: تصليحات / إعلاميات | ١ | ٦٥ |
| دارجة: سيارات / كراء | ١ | ١٥ |
| دارجة: سيارات / ديباناج | ١ | ١٥ |
| دارجة: سيارات / فيزيت تكنيك | ١ | ١١ |
| دارجة: خدمات / أصورونس | ١ | ١١ |
| دارجة: عقار / سمسار | ١ | ١٤ |
| دارجة: سياحة / أوطيل | ١ | ١٨ |
| دارجة: خدمات / سيبير | ١ | ١٦ |
| دارجة: تصليحات / أجهزة الدار | ١ | ١١ |
| دارجة: خدمات منزلية / كليم | ١ | ١٢ |
| دارجة: إلكترونيات / بارابول | ١ | ١٢ |
| دارجة: بناء / رخام | ١ | ١٢ |
| دارجة: خدمات منزلية / جردة | ١ | ١٤ |
| دارجة: خدمات منزلية / حشرات | ١ | ١٤ |
| دارجة: أمان / كاميرات | ١ | ٣٥ |
| دارجة: جمال / عناية | ١ | ١٥ |
| دارجة: جمال / أظافر | ١ | ١٤ |
| دارجة: جمال / مكياج | ١ | ١٢ |
| دارجة: راحة / حمام | ١ | ١٤ |
| دارجة: رياضة / جيم | ١ | ١٥ |
| دارجة: صحة / نظارات | ١ | ١٣ |
| دارجة: صحة / كيني | ١ | ١٢ |
| دارجة: صحة / أمبولانس | ١ | ١٤ |
| دارجة: تعليم / حضانة | ١ | ١٥ |
| دارجة: تعليم / لغات | ١ | ١٢ |
| دارجة: حفلات / ماكلة | ١ | ١١ |
| دارجة: حفلات / كراء | ١ | ١٢ |
| تم دمج المكررات وتصحيح الأخطاء وإضافة مرادفات وأمثلة جديدة لتكون مرجعاً كاملاً للتطبيقات والمحركات الذكية. | ١ | ٧ |
| transport | ١ | ٣١ |

### كلُّ مفهومٍ وما يُكتب به

<details><summary>افتح القائمة الكاملة</summary>

| المفهوم | بالدارجة | ما يُكتب به |
|---|---|---|
| `air_conditioning_and_refrigeration_technician` | تبريد | فني تبريد وتكييف · تبريد · Technicien en froid et climatisation · Air conditioning and refrigeration technician · تبريد · كليماتيزور · فني كليم · تصليح الثلاجات · مكيفات · climatisation · froid · فني تبريد وتكييف · مصلح مكيفات · technicien en froid et climatisation … (+٢) |
| `air_conditioning_service` | كليماتيزور | تركيب وصيانة المكيفات · كليماتيزور · Installation et entretien climatisation · Air Conditioning Service · كليماتيزور · كليم · clim · تركيب التكييف · صيانة الكليم · تركيب وصيانة المكيفات · installation et entretien climatisation · air conditioning service |
| `aluminum_fabricator_window_installer` | ألمنيوم | صانع ومُركّب الألمنيوم · ألمنيوم · Menuisier aluminium · Aluminum fabricator/window installer · ألمنيوم · كيصايب الشبابيك · تركيب الألمنيوم · menuisier aluminium · نجار الألمنيوم · صانع ومُركّب الألمنيوم · نجار ألمنيوم · menuisier aluminium · fabricant de fenêtres · aluminum fabricator/window installer |
| `aluminum_pvc_windows` | ألمنيوم | نجارة ألمنيوم و PVC · ألمنيوم · Menuiserie aluminium et PVC · Aluminum & PVC Windows · ألمنيوم · ألومنيوم · PVC · نوافذ · شبابيك · أبواب ألمنيوم · فينترات · نجارة ألمنيوم و PVC · menuiserie aluminium et pvc · aluminum & pvc windows |
| `animal_feed_store` | بياع العلف | بائع أعلاف · بياع العلف · Marchand d'aliments pour bétail · Animal feed store · بياع العلف · العلف · فول · شعير · نخالة · كيسابة · أعلاف البهايم · بائع أعلاف · متجر مواد علفية · marchand d'aliments pour bétail … (+٢) |
| `antique_dealer` | بياع التحف | بائع تحف قديمة · بياع التحف · Antiquaire · Antique dealer · بياع التحف · أنتيكا · antiquités · تحف قديمة · antiquaire · بائع تحف قديمة · antiquaire · brocanteur · antique dealer |
| `appliance_repair_technician` | كيصلح لوازم الدار | مصلح الأجهزة المنزلية · كيصلح لوازم الدار · Réparateur électroménager · Appliance repair technician · كيصلح لوازم الدار · تصليح الثلاجات · تصليح الماكينات · réparateur électroménager · مصلح الأجهزة المنزلية · réparateur électroménager · appliance repair technician |
| `architect` | مهندس معماري | مهندس معماري · مهندس معماري · Architecte · Architect · مهندس معماري · مكتب دراسات · architecture · تصميم الدار · رخصة البناء · مهندس معماري · مكتب دراسات معمارية · architecte · bureau d’études architecturales · architect … (+١) |
| `artificial_grass_installation` | عشب اصطناعي | تركيب عشب صناعي · عشب اصطناعي · Pose de gazon synthétique · Artificial grass installation · عشب اصطناعي · gazon · نجيل صناعي · جردة · تركيب العشب · تركيب عشب صناعي · pose de gazon synthétique · artificial grass installation |
| `artisanat_et_m_tiers_manuels` | `crafts` | الحرف والصنائع · `crafts` · الحرف اليدوية والمهن الحرفية · Artisanat et métiers manuels · الحرف اليدوية والمهن الحرفية · الحرف والصنائع · artisanat et métiers manuels |
| `auto_body_paint` | طولي | سمكرة وطلاء السيارات · طولي · Carrosserie peinture · Auto Body & Paint · طولي · صباغة طوموبيل · كنصبغ السيارة · سمكرة وطلاء السيارات · carrosserie peinture · auto body & paint |
| `auto_electrician` | كهربائي طوموبيلات | كهربائي سيارات · كهربائي طوموبيلات · Électricien automobile · Auto electrician · كهربائي طوموبيلات · كهرباء السيارات · إلكتريك السيارات · كصلح الضو ديال الطوموبيل · إليكتريسيان ديال طوموبيلات · تريسيتي لوطو · كيصلح الضو ديال الطوموبيل · إليكتريسيان طوموبيل · كهربائي سيارات · électricien automobile … (+١) |
| `auto_glass` | زاج طوموبيلات | زجاج السيارات · زاج طوموبيلات · Vitrage automobile · Auto Glass · زاج طوموبيلات · باربريز · فيتر · كنبدل الزاج · زجاج السيارات · vitrage automobile · pare-brise · auto glass |
| `auto_mechanic` | ميكانيك | ميكانيكي سيارات · ميكانيك · Mécanicien automobile · Auto Mechanic · ميكانيك · ميكانيسيان · مصلح طوموبيلات · گاراج · garage · ميكانيكي سيارات · mécanicien automobile · auto mechanic |
| `auto_parts` | بياس | قطع غيار السيارات · بياس · Pièces automobiles · Auto Parts · بياس · بياسات · قطع طوموبيلات · pièces · قطع غيار السيارات · pièces automobiles · auto parts |
| `auto_spare_parts` | بياس | قطع غيار السيارات · بياس · Pièces auto · Auto Spare Parts · بياس · بياسات · قطع طوموبيلات · pièces auto · قطع غيار السيارات · pièces auto · auto spare parts |
| `automatic_gate_repairer` | مصلح الأبواب الأوتوماتيك | مصلح بوابات كهربائية · مصلح الأبواب الأوتوماتيك · Réparateur de portails automatiques · Automatic gate repairer · مصلح الأبواب الأوتوماتيك · portail automatique · باب الكراج · moteur portail · مصلح بوابات كهربائية · réparateur de portails automatiques · automatic gate repairer |
| `automobile` | `automotive` | الطوموبيلات · `automotive` · السيارات والمركبات · Automobile · السيارات والمركبات · الطوموبيلات · automobile |
| `baby_clothing` | حوايج ديال البيبي | ملابس رضّع · حوايج ديال البيبي · Vêtements bébé · Baby clothing · حوايج ديال البيبي · بيبي · البيبي · حوايج المواليد · حوايج البيبي · حوايج للبيبي · كسوة البيبي · حوايج المولود · mawalid · hwayj baby … (+١٨) |
| `baby_onesies` | طرطاقة | ملابس داخلية للرضّع · طرطاقة · Body bébé · Baby onesie · طرطاقة · طرطاقات · طرطاقت · الطرطاقت · بودي ديال الدراري · بودي رضيع · ملابس داخلية للرضع · بودي أطفال · لباس داخلي للرضع · body bebe … (+٣) |
| `baker` | فران | خباز · فران · Boulanger · Baker · فران · خباز · بولونجري · كيبيع الخبز · مخبزة · خباز · فرن · boulanger · four · baker … (+١) |
| `bakery` | مخبزة | مخبز · مخبزة · Boulangerie · Bakery · مخبزة · بولونجري · فران · كيباع الخبز · محل الخبز · خباز · الخبز · boulangerie · مخبز · فرن … (+٥) |
| `barber` | حلاق | حلاق · حلاق · Barbier · Barber · حلاق · حجام · باربير · كوافور رجال · حلاگ · coiffeur · barbier · 7la9 · hl9 · halak … (+١٧) |
| `beauty_salon` | صالون تجميل | صالون تجميل · صالون تجميل · Institut de beauté · Beauty Salon · صالون تجميل · soins visage · إستيتيسيان · épilation · تنظيف البشرة · صالون تجميل · خبيرة تجميل · institut de beauté · esthéticienne · beauty salon … (+١) |
| `bedding_and_home_textiles_store` | بياع الفرش | بائع أفرشة ومنسوجات منزلية · بياع الفرش · Magasin de linge de maison · Bedding and home textiles store · بياع الفرش · مول الفرش · أفرشة · درابيه · مفروشات · linge de maison · فراش · الفراش · فرش · مطرح … (+٢٥) |
| `beekeeper` | بياع العسل | بائع عسل · بياع العسل · Apiculteur · Beekeeper · بياع العسل · مول العسل · عسل طبيعي · نحال · عسل حر · بائع عسل · نحال · منتجات الخلية · apiculteur · vendeur de miel … (+٢) |
| `bicycle` | بيكالا | درّاجة هوائيّة · بيكالا · Vélo · Bicycle · بيكالا · البيكالا · بيكالات · بشكليطة · البشكليطة · بشكليط · دراجة هوائية · الدراجة الهوائية · تروتينيت · التروتينيت … (+١٥) |
| `bicycle_repairer` | كيصلح البيكالات | تصليح الدراجات الهوائية · كيصلح البيكالات · Réparateur de vélos · Bicycle Repairer · كيصلح البيكالات · مصلح الدراجات · réparateur vélo · ميكانيك بيكالات · تصليح الدراجات الهوائية · réparateur de vélos · bicycle repairer |
| `blacksmith` | حداد | حداد · حداد · Ferronnier · Blacksmith · حداد · حداد · ferronnier · forgeron · blacksmith · metal worker |
| `blacksmith_welder` | حداد | حداد / لحام معادن · حداد · Ferronnier / Soudeur · Blacksmith / Welder · حداد · لحام · حديد · soudeur · ferronnier · حداد / لحام معادن · ferronnier / soudeur · blacksmith / welder |
| `bookstore` | مكتبة | مكتبة · مكتبة · Librairie · Bookstore · مكتبة · مول الكتب · كيباع الكرارس · papier · قرطاسية · مكتبة · بائع كتب وقرطاسية · librairie · papeterie · bookstore … (+١) |
| `bookstore_stationery` | مكتبة | مكتبة وقرطاسية · مكتبة · Librairie / Papeterie · Bookstore / Stationery · مكتبة · مول الكرارس · قرطاسية · papeterie · librairie · مكتبة وقرطاسية · librairie / papeterie · bookstore / stationery |
| `building_contractor` | مقاول | مقاول بناء · مقاول · Entrepreneur en bâtiment · Building Contractor · مقاول · صاحب شركة البني · entrepreneur bâtiment · كيخدم فالبني · مول البني · كيبني البيوت · مصايب البني · مقاول بناء · شركة بناء · entrepreneur en bâtiment … (+٣) |
| `building_materials_store` | كينكايري | محل مواد بناء · كينكايري · Magasin de matériaux de construction · Building materials store · كينكايري · محل مواد البناء · quincaillerie · الإسمنت · الحديد · محل مواد بناء · magasin de matériaux de construction · building materials store |
| `butcher` | ڭزار | جزار · ڭزار · Boucher · Butcher · ڭزار · كزار · جزار · قصاب · مول اللحم · الڭزار · gzar · kzar · 9sab · boucher … (+١١) |
| `butcher_butcher_shop` | ڭزار | جزار / محل لحوم · ڭزار · Boucher / Boucherie · Butcher / Butcher Shop · ڭزار · كزار · جزار · مول اللحم · قصاب · boucher · جزار / محل لحوم · boucher / boucherie · butcher / butcher shop |
| `caf_coffee_shop` | قهوة | مقهى · قهوة · Café · Café / Coffee Shop · قهوة · كافي · مقهى · café · مقهى · café · café / coffee shop |
| `cafe` | قهوة | مقهى · قهوة · Café · Café · قهوة · كافي · مقهى · قهاوي · تيران · صالون شاي · qahwa · cafe · kawi · coffee … (+١٣) |
| `car` | طوموبيل | سيارة · طوموبيل · Voiture · Car · طوموبيل · طموبيل · توموبيل · لوطو · كار · الكار · اللوطو · طونوبيل · tomobil · tomobile … (+٢٥) |
| `car_body_repair` | طولري | إصلاح هيكل السيّارة · طولري · Carrosserie · Body repair · طولوري · طوليري · تولوري · طولري · سمكرة · سمكري · مول الطولوري · كنصلح الهيكل · دريساج · ادريساج … (+٢٤) |
| `car_diagnostics` | دياڭنوستيك | تشخيص السيارات · دياڭنوستيك · Diagnostic automobile · Car Diagnostics · دياڭنوستيك · سكانير · كنفحص طوموبيل بالكمبيوتر · دياگنوستيك · valise · OBD · ديانيوستيك · فحص إلكتروني · الفحص ديال الطوموبيل · فاليز الفحص … (+١٥) |
| `car_interior_cleaning` | غسل لداخل | تنظيف داخل السيّارة · غسل لداخل · Nettoyage intérieur · Interior cleaning · غسل لداخل · نغسل لداخل · غسيل لداخل · تنظيف لداخل · نسبيري لداخل · سبيري لداخل · غسل الكوسانات · نغسل الكوسانات · تنظيف الكوسان · غسل الكوسان … (+٢٠) |
| `car_maintenance` | صيانة | صيانة السيارات · صيانة · Entretien automobile · Car Maintenance · صيانة · صيانة طوموبيل · révision · صيانة السيارات · entretien automobile · révision · car maintenance · car service |
| `car_painting` | صباغة طوموبيل | إعادة طلاء السيارات · صباغة طوموبيل · Peinture automobile · Car painting · صباغة طوموبيل · peinture auto · كنصبغ السيارة · لون السيارة · إعادة الطلاء · صباغة السيارات · صباغة سيارات · كنصبغ الطوموبيل · نصبغ الطوموبيل · نصبغ السيارة … (+٢٨) |
| `car_polishing` | بوليش | تلميع السيارات · بوليش · Polissage automobile · Car Polishing · بوليش · تلميع · كنلمع السيارات · تلميع طوموبيل · نلمع الطوموبيل · نلمّع الطوموبيل · كنلمّع · بغيت نلمع · بوليش الطوموبيل · بوليساج … (+١٣) |
| `car_rental` | كراء طوموبيلات | تأجير السيارات · كراء طوموبيلات · Location de voitures · Car rental · كراء طوموبيلات · لوكاسيون · location voiture · كرا السيارات · كراء السيارات · لوكيشن · وكالة كراء طوموبيلات · تأجير السيارات · كراء السيارات · location de voitures … (+١) |
| `car_service` | ريفيزيون | صيانة سيارات · ريفيزيون · Entretien auto · Car Service · ريفيزيون · صيانة · فيدانج · vidange · تبديل الزيت · سيرفيس · الفيدانج · نبدل الزيت · الزيت · فيلطر … (+٢٩) |
| `car_upholstery` | طاپيسي | تنجيد السيارات · طاپيسي · Sellerie automobile · Car Upholstery · طاپيسي · تابيسي · صالون طوموبيل · كنبدل الثوب · تنجيد السيارات · sellerie automobile · car upholstery |
| `car_wash` | لاڤاج | مغسلة سيارات · لاڤاج · Lavage auto · Car Wash · لاڤاج · لافاج · لوفاج · غسل الطوموبيل · غسيل السيارات · نضافة الطوموبيل · غسل طوموبيلات · غسل السيارات · كنغسل طوموبيل · lavage … (+١٩) |
| `car_wrapping` | ستيكاج | ستيكاج وتغليف السيّارات · ستيكاج · Stickage / Covering · Car wrapping · ستيكاج · سطيكاج · الستيكاج · ستيكرز · لصق الزجاج · تغليف الطوموبيل · كوفرينغ · فيلم واقي · تفميم · الفيمي … (+٢٩) |
| `carpenter` | نجار | نجار · نجار · Menuisier · Carpenter · نجار · خدام الخشب · مجرة · نجار الدار · مول الخشب · njar · menuisier · carpentier · khadam lkhchb · نجار … (+١٣) |
| `carpenter_joiner` | نجار | نجار · نجار · Menuisier / Ébéniste · Carpenter / Joiner · نجار · خدام الخشب · منجرة · menuisier · نجار · menuisier / ébéniste · carpenter / joiner |
| `carpenter_woodworker` | نجار | نجار وصانع أثاث خشبي · نجار · Menuisier / Ébéniste · Carpenter / Woodworker · نجار · منجرة · خدام الخشب · menuizier · نجار الدار · نجار وصانع أثاث خشبي · menuisier / ébéniste · carpenter / woodworker |
| `carpet_and_rug_seller` | بياع الزربية | بائع سجاد وزرابي · بياع الزربية · Marchand de tapis · Carpet and rug seller · بياع الزربية · مول الزرابي · سجاد · زربية · حنبل · كليم · بائع سجاد وزرابي · متجر السجاد · marchand de tapis · tapissier … (+١) |
| `carpet_cleaning` | غسل الزرابي | غسل الزرابي والسجّاد · غسل الزرابي · Nettoyage de tapis · Carpet cleaning · غسل الزرابي · غسيل الزرابي · تنظيف الزرابي · كنغسل الزرابي · غسل الزربية · الزربية موسخة · تنظيف السجاد · غسل السجاد · تنظيف الموكيت · غسل الموكيت … (+١٨) |
| `caterer` | تريتور | ممون حفلات · تريتور · Traiteur · Caterer · تريتور · traiteur · كيصايب ماكلة للحفلات · ممون الأعراس · ممون حفلات · traiteur · caterer |
| `cctv_security_systems` | كاميرات | تركيب كاميرات وأنظمة أمان · كاميرات · Caméras de surveillance · CCTV & Security Systems · كاميرات · كاميرات المراقبة · alarm · alarme · système sécurité · كاميرا · مراقبة · رؤية ليلية · انذار · كشف الحركة … (+٢١) |
| `charcoal_and_firewood_seller` | مول الفحم | بائع فحم وحطب · مول الفحم · Marchand de charbon et de bois · Charcoal and firewood seller · مول الفحم · بياع الفحم · فحم · حطب · شواية · bois · بائع فحم وحطب · marchand de charbon et de bois · charcoal and firewood seller |
| `cleaning_and_hygiene_supplies_store` | محل مواد التنظيف | بيع مستلزمات النظافة · محل مواد التنظيف · Magasin de produits d'hygiène et de nettoyage · Cleaning and hygiene supplies store · محل مواد التنظيف · منتجات النضافة · جافيل · صابون · désinfectant · بيع مستلزمات النظافة · magasin de produits d'hygiène et de nettoyage · cleaning and hygiene supplies store |
| `cleaning_company` | شركة تنظيف | شركة تنظيف منازل · شركة تنظيف · Société de nettoyage · Cleaning Company · شركة تنظيف · كنظافة ديال البيوت · شركة ديال النضافة · كينقّيو الشقة · société nettoyage · شركة تنظيف منازل · خدمة نظافة · société de nettoyage · nettoyage résidentiel · cleaning company … (+١) |
| `clothing` | حوايج | ملابس · حوايج · Vêtements · Clothing · حوايج · ملابس · لباس · حويج · حويجات · كسوة · الكسوة · لبسة · اللبسة · اللباس … (+٥٣) |
| `clothing_sets` | اونصومبل | أطقم ملابس · اونصومبل · Ensembles · Clothing sets · اونصومبل · اونصومبلات · انصومبل · انصومبلات · طقم · أطقم · طقم ملابس · أطقم ملابس · ensemble · ensembles … (+٢) |
| `cobbler_shoe_repair` | خراز | إسكافي / مصلح أحذية · خراز · Cordonnier · Cobbler / Shoe Repair · خراز · مول الصباط · كيصلح الصبابط · cordonnier · إسكافي / مصلح أحذية · cordonnier · cobbler / shoe repair |
| `coffee_shop` | قهوة | مقهى · قهوة · Café · Coffee Shop · قهوة · كافي · مقهى · مقهى · café · coffee shop · café |
| `computer_hardware_store` | بيع معدات الإنفورماتيك | بيع معدّات المعلوميات · بيع معدات الإنفورماتيك · Matériel informatique · Computer hardware store · بيع حواسيب · معدات معلوماتية · قطع غيار حواسيب · معدات الإنفورماتيك · بيع بيسي · قطع الحاسوب · نشري حاسوب · شراء حاسوب · نشري لابتوب · materiel informatique … (+٥) |
| `computer_repair` | كيصلح الكمبيوتر | صيانة كمبيوتر · كيصلح الكمبيوتر · Réparateur d'ordinateurs · Computer repair · كيصلح الكمبيوتر · تصليح اللابتوب · PC · informatique · réparation ordinateur · تصليح البيسي · تصليح PC · ordinateur · فورماتاج · بيسي … (+٥١) |
| `computer_repair_technician_it_technician` | كيصلح البيسي | فني حاسوب وشبكات · كيصلح البيسي · Réparateur informatique / Technicien réseau · Computer repair technician / IT technician · كيصلح البيسي · انفورماتيك · تصليح الحاسوب · informatique · technicien réseau · فني حاسوب وشبكات · réparateur informatique / technicien réseau · computer repair technician / it technician |
| `contractor` | مقاول | مقاول · مقاول · Entrepreneur · Contractor · مقاول · مول البني · شركة البني · ريبور · مقاول البناء · mo9awil · mokawil · contracteur · rabi3a · chef de chantier … (+١٢) |
| `curtain_installer` | كيركب الستائر | فني تركيب الستائر · كيركب الستائر · Installateur de rideaux · Curtain installer · كيركب الستائر · البرادي · ستائر · rideaux · تركيب الستائر · فني تركيب الستائر · installateur de rideaux · curtain installer |
| `cybercafe` | سيبير | مركز إنترنت وطباعة وتصوير · سيبير · Cybercafé · Cybercafe · سيبير · cyber · photocopie · impression · سكانير · طباعة · مركز إنترنت وطباعة وتصوير · cybercafé · photocopie · impression … (+٢) |
| `cybercafe_copy_print` | سيبير | مركز إنترنت وطباعة · سيبير · Cybercafé / Photocopie / Impression · Cybercafe / Copy & Print · سيبير · cyber · photocopie · impression · سكانير · مركز إنترنت وطباعة · cybercafé / photocopie / impression · cybercafe / copy & print |
| `cybersecurity` | أمان سيبراني | أمن سيبرانيّ · أمان سيبراني · Cybersécurité · Cybersecurity · أمان سيبراني · الامن السيبراني · حماية · اختراق · firewall · جدار ناري · cybersecurite · securite · firewall · hack … (+١٢) |
| `dairy_shop_juice_bar` | محلبة | محلبة / محل ألبان وعصائر · محلبة · Laiterie / Bar à jus · Dairy Shop / Juice Bar · محلبة · مول الحليب · رايب · عصير · مهلبية · laiterie · محلبة / محل ألبان وعصائر · laiterie / bar à jus · dairy shop / juice bar |
| `data_recovery` | استرجاع الداتا | استرجاع البيانات · استرجاع الداتا · Récupération de données · Data recovery · استرجاع بيانات · استرجاع ملفات · قرص صلب تالف · استرجاع الداتا · الديسك خربان · طارو ليا الفيشيات · recuperation de donnees · recuperation fichiers · data recovery · file recovery … (+٣) |
| `dates_and_dried_fruits_seller` | مول التمر | بائع تمور وفواكه جافة · مول التمر · Marchand de dattes et fruits secs · Dates and dried fruits seller · مول التمر · بياع التمر · قيسارية · فواكه جافة · مكسرات · fruits secs · بائع تمور وفواكه جافة · marchand de dattes et fruits secs · dates and dried fruits seller |
| `daycare` | حضانة | حضانة وروضة أطفال · حضانة · Crèche · Daycare · حضانة · روضة · كريش · crèche · garderie · حضانة وروضة أطفال · crèche · garderie · maternelle · daycare … (+١) |
| `decorative_plasterer` | جباس | فني أسقف جبسية مزخرفة · جباس · Plâtrier décorateur · Decorative plasterer · جباس · كيدير الجبس · قبب · أسقف · plafond décoratif · gypserie · فني أسقف جبسية مزخرفة · plâtrier décorateur · decorative plasterer |
| `dentist` | دكتور الضراسة | طبيب أسنان · دكتور الضراسة · Dentiste · Dentist · دكتور السنان · طبيب السنان · دنتيست · مقلع الضروس · دكتور الضراسة · طبيب الأسنان · كيقلع الضروس · dentiste · dental · dentiste … (+١٣) |
| `doctor_gp` | طبيب | طبيب · طبيب · Médecin · Doctor · طبيب · دكتور · جنراليست · دوك · الدوك · الطبيب · tbib · doktor · docteur · medecin … (+١٦) |
| `driving_school` | أوطو إيكول | مدرسة تعليم السياقة · أوطو إيكول · Auto-école · Driving School · أوطو إيكول · مدرسة السياقة · تعليم الكود · تعليم لكوندوي · مدرسة تعليم السياقة · auto-école · driving school |
| `eid_clothing` | كسوة العيد | كسوة العيد · كسوة العيد · Habits de fête · Eid clothing · كسوة العيد · حوايج العيد · لباس العيد · كسوة لعيد · لبسة العيد · كسوة ديال العيد · لبسة ديال العيد · حويج العيد · kiswat l3id · tenue aid … (+١٣) |
| `electrician` | تريسيتي | كهربائي · تريسيتي · Électricien · Electrician · تريسيتي · إليكتريسيان · كهربائي · كيصلح الضو · مصلح كهرباء · الكتروسيان · إليكتريك · كنصايب الليكتريسيتي · électricien · trisiti … (+١٦) |
| `engine_cleaning` | تنظيف الموطور | تنظيف محرّك السيّارة · تنظيف الموطور · Nettoyage moteur · Engine cleaning · تنظيف الموطور · غسل الموطور · تنظيف المحرك · غسل المحرك · الموطور عامر بالزيت · المحرك عامر بالزيت · نضافة الموطور · nettoyage moteur · lavage moteur · تنظيف المحرك … (+٨) |
| `event_equipment_rental` | كراء الكراسي | كراء معدات الحفلات · كراء الكراسي · Location matériel événementiel · Event Equipment Rental · كراء الكراسي · كراء الطاولات · خيمة · tentes · matériel de fête · كراء معدات الحفلات · location matériel événementiel · event equipment rental |
| `event_planner_wedding_planner` | منظم الحفلات | منظم مناسبات وحفلات · منظم الحفلات · Organisateur d’événements · Event planner / Wedding planner · منظم الحفلات · كيدير الأعراس · ديكور الأعراس · event planner · تنظيم المناسبات · منظم مناسبات وحفلات · organisateur d’événements · event planner / wedding planner |
| `fabric_shop` | الطوب والخياطة | أقمشة وخياطة · الطوب والخياطة · Tissus · Fabric · طوب · الطوب · قماش · اقمشة · خيط · الخيط · زواق · سفيفة · عقاد · تسوارت … (+٣٤) |
| `fashion_accessories` | كاسكيطة وصاك | إكسسوارات الأزياء · كاسكيطة وصاك · Accessoires · Fashion accessories · كاسكيطة · شابو · شاش · حزام · سنطورة · صاك · ساك · محفظة · بورطفاي · لنيط … (+٣٦) |
| `fishmonger` | بياسري | بائع سمك · بياسري · Poissonnier · Fishmonger · بياسري · مول الحوت · كيباع الحوت · سوق الحوت · بائع سمك · poissonnier · fishmonger |
| `fishmonger_fish_shop` | مول الحوت | بائع سمك · مول الحوت · Poissonnier / Poissonnerie · Fishmonger / Fish Shop · مول الحوت · حوات · بياسري · poissonnerie · بائع سمك · poissonnier / poissonnerie · fishmonger / fish shop |
| `florist` | مول الورد | بائع زهور · مول الورد · Fleuriste · Florist · مول الورد · كيباع الزهور · بيّاع الورد · floriste · بياع الزهور · محل الورد · fleuriste · تنسيق الزهور · بائع زهور · محل ورود … (+٥) |
| `food_and_grocery` | الماكلة والشرا | الأغذية والتجارة الغذائية · الماكلة والشرا · Alimentation · Food and Grocery · الماكلة والشرا · الأغذية والتجارة الغذائية · alimentation · food and grocery |
| `food_courier` | دليفري | موصِّل طلبات · دليفري · Livreur · Delivery courier · دليفري · ليفرور · موصل · كنوصل · نوصل الطلبات · كنوصل الطلبات · موصل طلبات · بغيت نخدم دليفري · خدمة ديال التوصيل · كنخدم دليفري … (+١٧) |
| `furniture_store` | موبيليا | محل أثاث · موبيليا · Magasin de meubles · Furniture store · موبيليا · الموبيليا · كنبة · الكنبة · كنبات · صالون · الصالون · مبل · mobilia · kanaba … (+١٦) |
| `furniture_upholsterer` | كيصايب الصالون | تنجيد الأثاث المنزلي · كيصايب الصالون · Tapissier d’ameublement · Furniture Upholsterer · كيصايب الصالون · كنخيط الأثاث · كنبدل الثوب · كيصيب الصالونات · تنجيد الأثاث المنزلي · tapissier d’ameublement · furniture upholsterer |
| `gardener` | جنايني | بستاني · جنايني · Jardinier · Gardener · جنايني · بستاني · مول الجردة · jardinier · بستاني · منسق حدائق · jardinier · paysagiste · gardener · landscaper |
| `garment_bottom` | سروال | سراويل · سروال · Pantalons · Pants · سروال · سراويل · جينز · دجين · بنطلون · شورط · شورت · سروال قصير · كارغو · السروال … (+٢٨) |
| `garment_dress` | روب وبلوزة | فساتين وبلوزات نسائية · روب وبلوزة · Robes · Dresses · روب · فستان · بلوزة · بلايز · جيب · تنورة · روب سواريه · الروب · الفستان · روب ديال العرس … (+٢٤) |
| `garment_outerwear` | فيست وكبوط | جواكت ومعاطف · فيست وكبوط · Vestes & manteaux · Jackets & coats · فيست · جاكيط · جاكيت · كبوط · معطف · بلوزون · كوستيم · بدلة · جيليه · دوديون … (+٣٦) |
| `garment_top` | قميجة وتيشيرت | قمصان وتيشيرتات · قميجة وتيشيرت · Hauts / T-shirts · Tops & shirts · قميجة · قميص · تيشيرت · تي شيرت · مايوه · بولو · سويتشيرت · سويت شيرت · كنزة · تريكو … (+٤٤) |
| `general_practitioner` | طبيب | طبيب عام · طبيب · Médecin généraliste · General practitioner · طبيب · دكتور · جنراليست · médecin généraliste · طبيب عام · médecin généraliste · general practitioner · gp |
| `greengrocer` | خضار | بائع خضر وفواكه · خضار · Primeur / Marchand de fruits et légumes · Greengrocer · خضار · مول الخضرة · خضر وفواكه · primeur · بائع خضر وفواكه · primeur / marchand de fruits et légumes · greengrocer |
| `grocer` | حانوتي | بقال · حانوتي · Épicier · Grocer · حانوت · بقال · مول الحانوت · تبقالت · هري · حانوتي · دكان · صبي · hanout · 7anot … (+١٧) |
| `grocery_store` | الحانوت | بقالة · الحانوت · Épicerie · Grocery Store · الحانوت · البقال · مول الحانوت · تابقالت · هري · بقالة · épicerie · grocery store |
| `grocery_store_convenience_store` | حانوت | بقالة / محل مواد غذائية · حانوت · Épicerie / Alimentation générale · Grocery Store / Convenience Store · حانوت · بقال · مول الحانوت · تبقالت · مواد غذائية · épicerie · بقالة · تبقالة · دكان · هري … (+٤) |
| `gym` | جيم | قاعة رياضة · جيم · Salle de sport · Gym · جيم · salle de sport · قاعة الرياضة · كوتش · coach sportif · قاعة رياضة · مدرب لياقة · salle de sport · coach sportif · gym … (+١) |
| `hammam` | حمام | حمام وسبا · حمام · Hammam · Hammam · حمام · حمام بلدي · spa · massage · كيس · حمام وسبا · hammam · spa · hammam · spa |
| `hardware_household_supplies` | دروگري | متجر أدوات ومواد منزلية · دروگري · Droguerie / Quincaillerie · Hardware & Household Supplies · دروگري · دروكري · كينكايري · مواد التنظيف · quincaillerie · متجر أدوات ومواد منزلية · droguerie / quincaillerie · hardware & household supplies |
| `hardware_store` | دروڭري | متجر أدوات منزلية · دروڭري · Droguerie · Hardware Store · دروڭري · دروكري · محل دروڭري · متجر أدوات منزلية · أجهزة وأواني · droguerie · quincaillerie · hardware store · household supplies |
| `herbalist` | عطار | عطار · عطار · Herboriste · Herbalist · عطار · عطار · متجر أعشاب وتوابل · herboriste · épices · herbalist · spice shop |
| `home_appliance_repair` | تصليح الثلاجة | إصلاح الأجهزة المنزلية · تصليح الثلاجة · Réparation électroménager · Home Appliance Repair · تصليح الثلاجة · تصليح الغسالة · إلكتروميناجي · électroménager · إصلاح الأجهزة المنزلية · réparation électroménager · home appliance repair |
| `home_appliance_repair_technician` | كيصلح الآلات | مصلح أجهزة منزلية · كيصلح الآلات · Réparateur d'électroménager · Home appliance repair technician · كيصلح الآلات · تصليح الغسالات · كيصلح الثلاجة · مصلح électroménager · مصلح أجهزة منزلية · تصليح الغسالات والثلاجات · réparateur d'électroménager · dépanneur · home appliance repair technician |
| `home_kitchen` | الطبخ فالدار | مطبخ منزلي · الطبخ فالدار · Cuisine à domicile · Home kitchen · طباخة · طباخ · مولات الطبخة · كنطبخ فالدار · نطبخ فالدار · الطبخ فالدار · ماكلة ديال الدار · ماكلة بيتية · طبخ منزلي · كنطيب فالدار … (+٢٠) |
| `home_nurse` | ممرض | ممرض · ممرض · Infirmier à domicile · Home nurse · ممرض · infirmier · لافيرمي · كيدير الإبر · ممرض · ممرض منزلي · infirmier à domicile · home nurse |
| `hotel` | أوطيل | فندق · أوطيل · Hôtel · Hotel · أوطيل · رياض · دار الضيافة · auberge · hotel · فندق · رياض · دار ضيافة · hôtel · riad … (+٤) |
| `house_cleaner` | خدامة | عاملة تنظيف المنازل · خدامة · Femme/Homme de ménage · House cleaner · خدامة · femme de ménage · كتنظف البيوت · خدم بيوت · تسيق · كتسيق · نسيق · تسيّق · سيق ليا · تسيق ليا … (+١٧) |
| `house_painter` | مبيض | دهان منازل · مبيض · Peintre en bâtiment · House Painter · مبيض · صباغ ديال البيوت · كيدهن البيوت · كنبيض الحيوط · صباغ · كيصبغ البيوت · peinture · دهان منازل · طلاء الجدران · peintre en bâtiment … (+١) |
| `hvac_technician_air_conditioning_technician` | فريݣو | فني تكييف وتبريد · فريݣو · Technicien climatisation et réfrigération · HVAC technician / Air-conditioning technician · فريݣو · كليماتيزار · تقني الكليم · كيصلح الكليم · froid industriel · فني تكييف وتبريد · technicien climatisation et réfrigération · hvac technician / air-conditioning technician |
| `ice_cream_shop` | گلاص | محل مثلجات · گلاص · Glacier · Ice cream shop · گلاص · الگلاص · كلاص · جيلاطي · جيلاتي · مثلجات · ايس كريم · ايسكريم · glace · glass … (+١٣) |
| `insurance_agency` | أصورونس | وكالة تأمين · أصورونس · Agence d’assurance · Insurance Agency · أصورونس · تأمين · assurance · مول التأمين · وكالة تأمين · agence d’assurance · insurance agency |
| `interior_designer_decorator` | ديزاينور | مصمم داخلي / منسق ديكور · ديزاينور · Décorateur d’intérieur / Architecte d’intérieur · Interior designer / Decorator · ديزاينور · ديكوراسيون · كيدير الديكور · مهندس ديكور · décorateur · مصمم داخلي / منسق ديكور · décorateur d’intérieur / architecte d’intérieur · interior designer / decorator |
| `it_support` | تركيب ويندوز | تركيب نظام التشغيل · تركيب ويندوز · Installation système · OS install · نركب ويندوز · ويندوز · تنصيب النظام · نصبت النظام · لينكس · اوفيس · تقني معلوميات · معلوميات · انفورماتيك · مساعدة تقنية … (+٣٠) |
| `jeweler` | صايغ | صائغ · صايغ · Bijoutier · Jeweler · صايغ · بياع الدهب · مجوهراتي · كيصلح الدهب · صائغ · بائع مجوهرات · bijoutier · joaillier · jeweler · goldsmith |
| `key_maker` | مول السوارت | صانع مفاتيح · مول السوارت · Serrurier · Key Maker · مول السوارت · كيصايب السوارت · صانع المفاتيح · صانع مفاتيح · serrurier · fabricant de clés · key maker · locksmith |
| `kids_clothing` | حوايج ديال الدراري | ملابس الأطفال · حوايج ديال الدراري · Vêtements enfant · Kids clothing · حوايج ديال الدراري · دراري · الدراري · كسوة ديال الدراري · حوايج الصغار · حوايج الدراري · كسوة الدراري · لباس الاطفال · حوايج صغار · drari … (+١٣) |
| `kitchenware_store` | محل الأواني | متجر أواني منزلية · محل الأواني · Magasin d'articles ménagers · Kitchenware store · محل الأواني · أواني المطبخ · كيباع الطناجر · أواني · كيسريات · أدوات الطبخ · متجر أواني منزلية · أدوات مطبخ · magasin d'articles ménagers · ustensiles de cuisine … (+٢) |
| `language_training_center` | سنتر ديال اللغات | مركز لغات وتكوين · سنتر ديال اللغات · Centre de langues et formation · Language & Training Center · سنتر ديال اللغات · formation · كورسات · anglais · français · مركز لغات وتكوين · centre de langues et formation · language & training center |
| `laundry` | براسينڭ | مغسلة ملابس · براسينڭ · Pressing · Laundry · براسينڭ · مغسلة الحوايج · كيغسل الملابس · pressing · lavage habits · مصبغة · كيغسل الحوايج · غسيل الملابس · النشافة · مغسلة ملابس … (+٩) |
| `laundry_dry_cleaner` | براسينگ | مغسلة ملابس / مصبغة · براسينگ · Pressing / Blanchisserie / Laverie · Laundry / Dry Cleaner · براسينگ · مصبغة · مغسلة الحوايج · pressing · laverie · مغسلة ملابس / مصبغة · pressing / blanchisserie / laverie · laundry / dry cleaner |
| `lavage_automobile_station_de_lavage` | لافاج السيارات | محل لافاج · لافاج السيارات · غسل السيارات / مغسلة سيارات · Lavage automobile / Station de lavage · لافاج السيارات · غسل السيارات / مغسلة سيارات · محل لافاج · غسل الطوموبيلات · لافاج طوموبيلات · lavage automobile / station de lavage |
| `lawyer` | محامي | محامٍ · محامي · Avocat · Lawyer · محامي · أفوكا · avocat · محامٍ · avocat · lawyer · attorney |
| `locksmith_key_maker` | مول السوارت | صانع مفاتيح / أقفال · مول السوارت · Serrurier / Reproduction de clés · Locksmith / Key Maker · مول السوارت · كيصايب السوارت · ساروت · مفاتيح · serrurier · صانع مفاتيح / أقفال · serrurier / reproduction de clés · locksmith / key maker |
| `luxury_car_rental` | كراء طوموبيلات فخمة | تأجير السيارات الفاخرة · كراء طوموبيلات فخمة · Location de voitures de luxe · Luxury car rental · كراء طوموبيلات فخمة · location voiture de luxe · سيارات فاخرة · تأجير السيارات الفاخرة · location de voitures de luxe · luxury car rental |
| `makeup_artist` | ماكييرة | خبيرة مكياج · ماكييرة · Maquilleuse · Makeup Artist · ماكييرة · مكياج · ميكاب · makeup · maquilleuse · خبيرة مكياج · maquilleuse · makeup artist |
| `marble_granite_worker` | رخامي | عامل رخام وجرانيت · رخامي · Marbrier · Marble & Granite Worker · رخامي · مرمري · رخام · گرانيت · marbre · عامل رخام وجرانيت · marbrier · marble & granite worker |
| `mason` | معلم | بناء · معلم · Maçon · Mason · معلم · بناء · مول البني · ماكون · شيخ البناء · معلم ديال البني · كيبني الديور · معلم البني · maçon · m3allem … (+١٦) |
| `mechanic` | ميكانيك | ميكانيكي سيارات · ميكانيك · Mécanicien · Mechanic · ميكانيك · ميكانيسيان · مصلح طوموبيلات · مول ميكانيك · گاراج · كراج · مصلح سيارات · mecanik · mikanik · mekanik … (+٢٢) |
| `medical_laboratory` | لابو | مختبر تحاليل طبية · لابو · Laboratoire d’analyses médicales · Medical Laboratory · لابو · تحاليل · analyses · laboratoire · تحليل الدم · مختبر تحاليل طبية · laboratoire d’analyses médicales · medical laboratory |
| `mens_clothing` | حوايج ديال الرجال | ملابس رجالية · حوايج ديال الرجال · Vêtements homme · Menswear · حوايج ديال الرجال · كسوة ديال الرجال · حوايج رجالية · حوايج الرجال · كسوة الرجال · لباس رجال · rjal · ملابس رجالية · ملابس للرجال · أزياء رجالية … (+٩) |
| `mobile_phone` | تلفون | هاتف محمول · تلفون · Téléphone · Mobile phone · تلفون · التلفون · سمارتفون · السمارتفون · telefone · smartphone · هاتف محمول · هاتف ذكي · smartphone · mobile phone … (+١) |
| `mobile_phone_repair` | تصليح البورطابل | إصلاح الهواتف · تصليح البورطابل · Réparation téléphones · Mobile Phone Repair · تصليح البورطابل · مصلح التيليفونات · réparation téléphone · كيصلح البورطابل · تصليح الشاشة · تيليفون · بورطابل · الشاشة مهرسة · البطارية كتفرغ · ما كيشارجيش … (+٢١) |
| `mobile_phone_repair_technician` | كيصلح التيليفونات | تصليح الهواتف · كيصلح التيليفونات · Réparateur téléphones portables · Mobile Phone Repair Technician · كيصلح التيليفونات · تصليح البورطابل · مصلح الهواتف · réparation téléphone · تصليح الهواتف · صيانة جوالات · réparateur téléphones portables · mobile phone repair technician |
| `modest_wear` | حجاب | ملابس محتشمة وحجاب · حجاب · Voile et mode modeste · Modest wear · حجاب · الحجاب · خمار · الخمار · سبنية · إيشارب · طرحة · بوني · حوايج محتشمة · hijab … (+٢٢) |
| `money_transfer_bill_payment` | كاش بلوس | خدمات تحويل الأموال والأداء · كاش بلوس · Transfert d’argent / Paiement de factures · Money Transfer / Bill Payment · كاش بلوس · وفاكاش · تحويل فلوس · أداء الفواتير · transfert d’argent · خدمات تحويل الأموال والأداء · transfert d’argent / paiement de factures · money transfer / bill payment |
| `motorcycle` | موطور | درّاجة ناريّة · موطور · Moto · Motorcycle · موطور · الموطور · موتور · دراجة نارية · الدراجة النارية · سكوتر · تريبورتور · moto · scooter · دراجة نارية … (+٨) |
| `motorcycle_mechanic` | ميكانيك موطور | ميكانيكي دراجات نارية · ميكانيك موطور · Mécanicien moto · Motorcycle Mechanic · ميكانيك موطور · ميكانيك موطورات · كيصلح الموتورات · موطورات · ميكانيكي دراجات نارية · mécanicien moto · motorcycle mechanic |
| `moving_company` | ديميناجور | نقل الأثاث · ديميناجور · Société de déménagement · Moving Company · ديميناجور · شركة نقل الفرش · نقل الأثاث · déménagement · كيهزو الفرش · نقل الأثاث · شركة نقل عفش · société de déménagement · déménageur · moving company … (+١) |
| `moving_company_furniture_transport` | ترحيل | نقل الأثاث · ترحيل · Déménagement · Moving company / Furniture transport · ترحيل · déménagement · كينقل العفش · كيهز الأثاث · نقل الأثاث · شركة ترحيل · déménagement · moving company / furniture transport |
| `nail_salon` | أونگل | صالون أظافر · أونگل · Onglerie · Nail Salon · أونگل · ongles · manicure · pédicure · صالون أظافر · صالون أظافر · onglerie · manucure · nail salon · nail technician |
| `network_technician` | تقني شبكات | تقني شبكات · تقني شبكات · Technicien réseau · Network technician · تقني شبكات · كابلاج · الكابلاج · سيرفر · السيرفر · سويتش · الشبكة الداخلية · فيبر · شبكة · reseau … (+٢٣) |
| `notary_legal_notary` | نوتير | موثق / عدل · نوتير · Notaire / Adoul · Notary / Legal notary · نوتير · موثق · عدول · توثيق العقود · notaire · موثق / عدل · notaire / adoul · notary / legal notary |
| `nursery_daycare_preschool` | كريش | حضانة وروض أطفال · كريش · Crèche / Jardin d’enfants · Nursery / Daycare / Preschool · كريش · حضانة · روض · ماتيرنيل · crèche · jardin d’enfants · حضانة وروض أطفال · crèche / jardin d’enfants · nursery / daycare / preschool |
| `optician` | أوبتيكيان | محل نظارات · أوبتيكيان · Opticien · Optician · أوبتيكيان · opticien · نظارات · عدسات · lunettes · محل نظارات · أخصائي بصريات · opticien · optician |
| `optician_optical_store` | أوبتيك | محل نظارات / أخصائي بصريات · أوبتيك · Opticien / Lunetterie · Optician / Optical store · أوبتيك · محل النظاضر · نظارات · lunetterie · opticien · محل نظارات / أخصائي بصريات · opticien / lunetterie · optician / optical store |
| `oriental_perfumes_and_incense_seller` | بياع العطور | بائع عطور شرقية وبخور · بياع العطور · Marchand de parfums orientaux et d'encens · Oriental perfumes and incense seller · بياع العطور · عطور شرقية · عود · بخور · عود كمبودي · مسك · بائع عطور شرقية وبخور · marchand de parfums orientaux et d'encens · oriental perfumes and incense seller |
| `painter` | صباغ | دهان · صباغ · Peintre · Painter · صباغ · مبيض · كيصبغ · كيدهن · صباغ ديال البيوت · مطلي · sbagh · mbiyad · peintre · sbagha … (+١٥) |
| `pastry_chef` | حلواني | حلواني · حلواني · Pâtissier · Pastry Chef · حلواني · مول الحلويات · كيصايب الحلوى · معلم الحلويات · محنبة · حلواني · صانع حلويات · pâtissier · confiseur · pastry chef … (+١) |
| `pest_control` | حشرات | مكافحة الحشرات والقوارض · حشرات · Désinsectisation · Pest Control · حشرات · صراصير · فئران · ناموس · désinsectisation · dératisation · مكافحة الحشرات والقوارض · désinsectisation · dératisation · pest control |
| `pharmacy` | صيدلية | صيدلية · صيدلية · Pharmacie · Pharmacy · صيدلية · فارماسيان · مول الدوا · فارماسي · دوا · كيباع الدواء · pharmacie · sidlaya · pharmacie · farmacy … (+١١) |
| `photographer` | مصور | مصور · مصور · Photographe · Photographer · مصور · فوتوغراف · photographe · مصور · photographe · photographer |
| `physiotherapist` | كيني | أخصائي علاج طبيعي · كيني · Kinésithérapeute · Physiotherapist · كيني · kiné · ترويض طبي · kinésithérapie · rééducation · أخصائي علاج طبيعي · kinésithérapeute · physiotherapist |
| `physiotherapist_physical_therapist` | فيزيو | أخصائي علاج طبيعي وتأهيل · فيزيو · Kinésithérapeute / Physiothérapeute · Physiotherapist / Physical therapist · فيزيو · كينيزيتيرابي · علاج طبيعي · كيدير الماساج الطبي · أخصائي علاج طبيعي وتأهيل · kinésithérapeute / physiothérapeute · physiotherapist / physical therapist |
| `plasterer` | مبيض | مبيض محارة · مبيض · Plâtrier · Plasterer · مبيض · جباس · plâtrier · كيدير الجبس · محارة · مبيض محارة · جصاص · plâtrier · plasterer |
| `plumber` | بلومبي | سباك · بلومبي · Plombier · Plumber · بلومبي · سباك · صحي · كيصلح الماء · مصلح الصرف · مصلح المواسير · كيصلح الصرف · كنصلح الماء · plomberie · روبيني … (+٣٣) |
| `pottery_and_traditional_cookware_seller` | بياع الفخار | بائع أواني فخارية وتقليدية · بياع الفخار · Marchand de poteries · Pottery and traditional cookware seller · بياع الفخار · براد · خزف · بائع أواني فخارية وتقليدية · marchand de poteries · pottery and traditional cookware seller |
| `poultry_seller` | قصابة ديال الدجاج | بائع دواجن · قصابة ديال الدجاج · Volailler · Poultry Seller · قصابة ديال الدجاج · مول الدجاج · بياع الدجاج · كيباع الدجاج بالتفصيل · بائع دواجن · قصابة دواجن · volailler · marchand de volailles · poultry seller |
| `poultry_shop` | مول الدجاج | محل دواجن · مول الدجاج · Volailler / Marchand de volailles · Poultry Shop · مول الدجاج · قصابة الدجاج · volailles · محل دواجن · volailler / marchand de volailles · poultry shop |
| `print_shop` | مطبعة | مطبعة · مطبعة · Imprimerie · Print shop · مطبعة · طباعة · تصوير ورق · imprimerie · photocopie · فلاش · بانر · مطبعة · خدمات طباعة وتصوير · imprimerie … (+٤) |
| `printer_repair` | تصليح الإمبريمانت | إصلاح الطابعات · تصليح الإمبريمانت · Réparation imprimante · Printer repair · إصلاح طابعة · صيانة طابعات · تعبئة حبر · تصليح الإمبريمانت · الطابعة خربانة · تعمير الحبر · reparation imprimante · toner · printer repair · toner refill … (+٢) |
| `printing_shop_copy_center` | مطبعة | مطبعة وخدمات نسخ · مطبعة · Imprimerie / Photocopie · Printing shop / Copy center · مطبعة · طباعة · فوتوكوبي · كيطبع · impression · photocopie · مطبعة وخدمات نسخ · imprimerie / photocopie · printing shop / copy center |
| `private_ambulance` | أمبولانس | سيارة إسعاف خاصة · أمبولانس · Ambulance privée · Private Ambulance · أمبولانس · ambulance · نقل المرضى · سيارة إسعاف · سيارة إسعاف خاصة · نقل صحي · ambulance privée · transport sanitaire · private ambulance · medical transport |
| `private_tutor` | أستاذ | مدرس خصوصي · أستاذ · Enseignant · Private tutor · أستاذ · مدرس خصوصي · soutien scolaire · كيعطي الدروس · أستاذ خصوصي · soutien · دروس الدعم · مدرس خصوصي · دعم مدرسي · enseignant … (+٣) |
| `real_estate_agency` | سمسار | سمسار عقاري · سمسار · Agence immobilière · Real Estate Agency · سمسار · وكالة عقارية · كراء · immobilier · سمسار عقاري · وكالة عقارية · agence immobilière · courtier immobilier · real estate agency · broker |
| `real_estate_agent` | سيمان | وكيل عقاري / وسيط عقارات · سيمان · Agent immobilier / Agence immobilière · Real estate agent · سيمان · أجان عقاري · كيقلب على الديور · وسيط العقار · agence immobilière · وكيل عقاري / وسيط عقارات · agent immobilier / agence immobilière · real estate agent |
| `restaurant` | ماكلة | مطعم · ماكلة · Restaurant · Restaurant · ماكلة · سناك · مطعم · وجبات · الماكلة · بوفية · طاكوس · سندويتش · واش كاين · المأكولات … (+١٧٩) |
| `satellite_receiver` | البارابول | البارابول والريسيفر · البارابول · Parabole · Satellite · بارابول · البارابول · ريسيفر · الريسيفر · ديمو · التلفزة ما شاعلاش · القنوات تقطعات · دمو · قنوات · parabole … (+١٥) |
| `satellite_tv_installer` | بارابول | تركيب وصيانة الأقمار الصناعية · بارابول · Installateur parabole et satellite · Satellite TV Installer · بارابول · ريسيفر · parabole · satellite · تركيب القنوات · تركيب وصيانة الأقمار الصناعية · installateur parabole et satellite · satellite tv installer |
| `sewing_machine_repair` | كنصلح الماكينة | إصلاح ماكينات الخياطة · كنصلح الماكينة · Réparation de machines à coudre · Sewing Machine Repair · كنصلح الماكينة · كنصلح ماكينة الخياطة · ماكينات · ماكن · إصلاح ماكينات الخياطة · réparation de machines à coudre · sewing machine repair |
| `shoe_seller` | مول الصباط | بائع أحذية · مول الصباط · Chausseur · Shoe Seller · مول الصباط · كيباع الصبط · بيّاع السبابط · chausseur · بائع أحذية · محل أحذية · chausseur · magasin de chaussures · shoe seller · shoe shop |
| `shoe_store` | بياع الصبطات | بائع أحذية · بياع الصبطات · Marchand de chaussures · Shoe Store · بياع الصبطات · مول الصبابط · محل الأحذية · صبابط · بوتيي · صباط · بلغة · بابوش · سباردينة · سبرديلة … (+٢٩) |
| `shoemaker` | خراز | إسكافي · خراز · Cordonnier · Shoemaker · خراز · إسكافي · صانع أحذية جلدية · cordonnier · shoemaker · cobbler |
| `sleepwear` | بيجامة | ملابس النوم · بيجامة · Pyjamas · Sleepwear · بيجامة · البيجامة · بيجاما · حوايج النعاس · لبسة النعاس · روب دو شامبر · pyjama · pijama · bijama · بيجامة … (+١٢) |
| `snack_bar_restaurant` | سناك | مطعم / وجبات سريعة · سناك · Snack / Restaurant · Snack Bar / Restaurant · سناك · مطعم · ماكلة · سندويتش · طاكوس · snack · مطعم / وجبات سريعة · snack / restaurant · snack bar / restaurant |
| `sportswear` | تراكسي | ملابس رياضية · تراكسي · Vêtements de sport · Sportswear · تراكسي · طراكسي · سورفيتمو · جوغينغ · حوايج الرياضة · لباس رياضي · مايو الرياضة · التراكسي · ترينينغ · الترينينغ … (+٢٥) |
| `tailor` | خياط | خياط · خياط · Tailleur · Tailor · خياط · ترزي · كيخيط · مصمم · خياط الحوايج · موديست · كيخيط الحوايج · كيصايب القشاشة · تفصيل حسب الطلب · couture … (+١٩) |
| `tea_and_herbs_wholesaler` | بياع أتاي | بائع الشاي والأعشاب · بياع أتاي · Marchand de thé et de plantes · Tea and herbs wholesaler · بياع أتاي · مول الشاي · أتاي · أعشاب · thé · tisane · بائع الشاي والأعشاب · marchand de thé et de plantes · tea and herbs wholesaler |
| `telecom_mobile_recharge` | تعبئة | محل اتصالات وتعبئة · تعبئة · Téléboutique / Recharge mobile · Telecom & Mobile Recharge · تعبئة · ريشارج · تليكوم · إنوي · أورنج · recharge · téléboutique · محل اتصالات وتعبئة · téléboutique / recharge mobile · telecom & mobile recharge |
| `tiler` | زلايجي | مبلط · زلايجي · Carreleur · Tiler · زلايجي · زليجي · كيركب السيراميك · مول الزليج · كارلاج · سيراميك · زليج · كيخدم الزليج · zlayji · zellige … (+١٦) |
| `tire_shop` | مول الرويضات | محل إطارات السيارات · مول الرويضات · Pneumatique · Tire Shop · مول الرويضات · پنو · بنو · عجلات · كريڤيزون · vulcanisateur · بنيو · بنوات · البنيو · عجلة … (+٢٦) |
| `towing` | ديباناج | خدمة جر السيارات والمساعدة على الطريق · ديباناج · Dépannage auto · Towing · ديباناج · ديپاناج · dépanneuse · جر السيارة · سحب السيارة · سطافيط · خدمة جر السيارات والمساعدة على الطريق · dépannage auto · remorquage · towing … (+١) |
| `traditional_clothing` | جلابة وقفطان | اللباس التقليدي المغربي · جلابة وقفطان · Habit traditionnel · Traditional wear · جلابة · جلابه · الجلابة · قفطان · القفطان · طاكشيطة · تاكشيطة · قندورة · سلهام · برنوس … (+٤٧) |
| `traditional_hammam` | حمام | حمام بلدي · حمام · Hammam traditionnel · Traditional Hammam · حمام · حمام بلدي · كيس · حمام شعبي · hammam · حمام بلدي · hammam traditionnel · traditional hammam |
| `traditional_moroccan_bath_hammam` | حمّام | حمّام تقليدي / حمّام مغربي · حمّام · Hammam traditionnel / Hammam marocain · Traditional Moroccan bath / Hammam · حمّام · الحمّام البلدي · حمام شعبي · كندوش · الحمّام المغربي · حمّام تقليدي / حمّام مغربي · hammam traditionnel / hammam marocain · traditional moroccan bath / hammam |
| `traditional_tent_maker` | خياط الخيام | صانع الخيام التقليدية · خياط الخيام · Fabricant de tentes traditionnelles · Traditional tent maker · خياط الخيام · كيصايب الخيام · خيام تقليدية · قبة · خيمة · صانع الخيام التقليدية · fabricant de tentes traditionnelles · traditional tent maker |
| `travel_agency` | وكالة الأسفار | وكالة سفر · وكالة الأسفار · Agence de voyages · Travel agency · وكالة الأسفار · كيباع الرحلات · voyage · سياحة · حجز الطيارة · أجونس ديال السفر · billet · visa · وكالة سفر · وكالة سياحة … (+٥) |
| `tv_and_audio_repair_technician` | مصلح التلفزة | مصلح أجهزة سمعية بصرية · مصلح التلفزة · Réparateur TV · TV and audio repair technician · مصلح التلفزة · كيصلح الـ TV · تصليح الشاشات · réparateur TV · مصلح أجهزة سمعية بصرية · réparateur tv · audio · vidéo · tv and audio repair technician |
| `underwear_socks` | سلاوي وتريكو | ملابس داخلية وجوارب · سلاوي وتريكو · Sous-vêtements · Underwear & socks · تقاشر · سلاوي · ملابس داخلية · كيلوط · مايوه دياخل · chaussettes · sous vetement · slip · جوارب · ملابس داخلية … (+٤) |
| `used_clothing` | جوطية | سوق الملابس المستعملة · جوطية · Marché aux puces · Flea market · جوطية · الجوطية · جوطيه · سوق البالي · فريب · فريپ · حوايج بالية · بالة · البالة · الفريب … (+٢٦) |
| `used_furniture_seller` | بائع الأثاث المستعمل | بائع أثاث مستعمل · بائع الأثاث المستعمل · Vendeur de meubles d'occasion · Used Furniture Seller · بائع الأثاث المستعمل · كيباع الفرش القدام · marché aux puces · مول الفرش · بائع أثاث مستعمل · سوق الأثاث المستعمل · vendeur de meubles d'occasion · brocante · used furniture seller · secondhand furniture |
| `vegetable_fruit_seller` | خضار | بائع الخضر والفواكه · خضار · Marchand de légumes · Vegetable & Fruit Seller · خضار · مول الخضر · بائع الخضر والفواكه · marchand de légumes · vegetable & fruit seller |
| `vehicle_inspection_center` | فيزيت تكنيك | مركز الفحص التقني للسيارات · فيزيت تكنيك · Centre de visite technique · Vehicle Inspection Center · فيزيت تكنيك · visite technique · كونترول تقني · فحص تقني · مركز الفحص التقني للسيارات · centre de visite technique · vehicle inspection center |
| `veterinarian` | طبيب الحيوانات | طبيب بيطري · طبيب الحيوانات · Vétérinaire · Veterinarian · طبيب الحيوانات · بيطري · دكتور ديال البهائم · فيتيرينير · vétérinaire · دكتور البهايم · طبيب بيطري · vétérinaire · veterinarian |
| `video_game_store` | محل الألعاب | متجر ألعاب فيديو · محل الألعاب · Magasin de jeux vidéo · Video game store · محل الألعاب · jeux vidéo · PlayStation · Xbox · Nintendo · متجر ألعاب فيديو · magasin de jeux vidéo · video game store |
| `watchmaker` | مصلح الساعات | مصلح ساعات · مصلح الساعات · Horloger · Watchmaker · مصلح الساعات · كيصلح الماكانة · ساعاتي · horloger · montres · مصلح ساعات · ساعاتي · horloger · réparateur de montres · watchmaker … (+١) |
| `web_development` | صناعة المواقع | تصميم المواقع والتطبيقات · صناعة المواقع · Création de sites · Web development · موقع · ديري ليا موقع · يدير ليا موقع · ويب سايت · تطبيق · ابليكاسيون · متجر إلكتروني · سايت · site · website … (+١٣) |
| `wifi_internet` | الواي فاي | إنترنت وواي-فاي · الواي فاي · Internet · Internet · واي فاي · الواي فاي · انترنت · الانترنت · انطرنيت · الانطرنيت · أنترنيت · انترنيت · كونيكسيون · الاشارة ضعيفة … (+٢٧) |
| `women_s_hair_salon` | كوافورة | صالون حلاقة وتجميل نسائي · كوافورة · Salon de coiffure femme · Women’s Hair Salon · كوافورة · صالون نساء · coiffeuse · brushing · صباغة الشعر · صالون حلاقة وتجميل نسائي · salon de coiffure femme · women’s hair salon |
| `womens_clothing` | حوايج ديال العيالات | ملابس نسائية · حوايج ديال العيالات · Vêtements femme · Womenswear · حوايج ديال العيالات · حوايج نسائية · كسوة ديال العيالات · حوايج النسا · كسوة النسا · لباس نساء · لباس النسا · nssa · 3yalat · ملابس نسائية … (+١١) |

</details>

## ⑥ الطريقُ اللاتينيّ (Arabizi)

يُحوَّل قبل الفهم، فيصل المحرِّكَ عربيًّا. أمثلةٌ مقيسةٌ الآن:

| ما يكتبه | ما يُقرأ |
|---|---|
| `bghit sbat` | بغيت سباط |
| `khassni hallaq` | خاصني حلاق |
| `bghit nakol` | بغيت ناكل |
| `lavage` | لافاج |
| `Fin wesselat lcomonde deyali` | فين وصلات الكوموند ديالي |
| `3andi mouchkil f dou` | عندي مشكل ف الضو |
| `bghit chi lbessa zewina lbenti ana f casa` | بغيت شي لبسة زوينة لبنتي أنا ف كازا |

## ⑦ الجغرافيا

٤٥ مدينةً كبرى بأحيائها ومرادفاتها، و٤٠٩ مكانًا مغربيًّا.
والمدينةُ تُطابَق **كلمةً كاملة**: «Fin wesselat» لا تُنتج «سلا».

| المدينة | كما تُكتب |
|---|---|
| الدار البيضاء | كازا · كازة · الكازا · البيضاء · دار البيضاء · دارلبيضا · casa · casablanca · kaza · dar lbayda |
| الرباط | الرباط · رباط · rabat · rbat |
| سلا | سلا · sale · sla |
| مراكش | مراكش · marrakech · marrakesh · marakech |
| فاس | فاس · fes · fez |
| مكناس | مكناس · meknes · meknass |
| طنجة | طنجة · طنجه · tanger · tanja · tangier |
| تطوان | تطوان · tetouan · titouan |
| أكادير | أكادير · اكادير · agadir · agadr |
| وجدة | وجدة · وجده · oujda · wjda · wejda |
| العيون | العيون · laayoune · layoune |
| الجديدة | الجديدة · jadida · eljadida |
| المحمدية | المحمدية · mohammedia |
| القنيطرة | القنيطرة · قنيطرة · kenitra · 9nitra |
| آسفي | آسفي · اسفي · safi |
| الصويرة | الصويرة · essaouira · sawira |
| الناظور | الناظور · ناظور · nador |
| بني ملال | بني ملال · beni mellal · bnimellal |
