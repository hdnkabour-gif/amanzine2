# ما يستطيع الإنسانُ فعلَه — في الصفحات وفي الكلام

> **مُولَّدٌ آليًّا** بـ`npm run report:page-actions` — لا يُحرَّر بيد.
> يُقرأ من `store.tsx` و`MainLayout.tsx` و`abilities.ts` — نفسِ ما يقرؤه التطبيق.

آخرُ توليد: 2026-08-12

## ① الخلاصة

| ما هو | العدد |
|---|---|
| فعلًا يملكه الإنسان (بلا بنيةٍ داخليّة) | **٣١** |
| منها **يبلغه الكلامُ** | **٢٥** |
| منها لا يبلغه الكلامُ بعد | **٢** |
| فعلًا لا تستعمله أيُّ صفحة | **٤** |
| صفحةً مقروءة | **٢٦** |

## ② كلُّ فعلٍ وأين يعيش وهل يُطلَب بالكلام

| الفعل | الصيغة | الصفحات | يبلغه الكلام؟ |
|---|---|---|---|
| `saveDeliveryProvider` | update | delivery | ✅ تبدّل إعدادات شركة التوصيل |
| `removeDeliveryProvider` | delete | delivery | ✅ تحيّد شركة التوصيل |
| `login` | — | delivery · settings | ❌ **ما كايناش** |
| `register` | — | **لا صفحة** | — |
| `updateSettings` | update | home · connections · delivery · notifications · settings · coupons | ✅ تبدّل معلومات المحلّ |
| `addProduct` | create | dashboard · products · services | ✅ تزيد منتوج |
| `updateProduct` | update | home · products · services | ✅ تبدّل منتوج (الثمن، الستوك، التصويرة) |
| `deleteProduct` | delete | products · services | ✅ تحيّد منتوج |
| `adjustStock` | update | products · services | ✅ تبدّل منتوج (الثمن، الستوك، التصويرة) |
| `addCustomer` | create | customers · import | ✅ تجيب المنتوجات من محادثة ولا ملفّ |
| `updateCustomer` | update | customers · import | ✅ تسيّر نقط الوفاء ديال الزبناء |
| `deleteCustomer` | delete | customers | ✅ تحيّد زبون |
| `addOrder` | create | orders · delivery | ✅ تسجّل طلب |
| `updateOrder` | update | **لا صفحة** | — |
| `approveOrder` | update | orders | ✅ تبدّل حالة ولا عنوان الطلب |
| `rejectOrder` | update | orders | ✅ تبدّل حالة ولا عنوان الطلب |
| `shipOrder` | send | orders | ✅ تصيفط تأكيد الطلب للزبون |
| `deliverOrder` | update | orders | ✅ تبدّل حالة ولا عنوان الطلب |
| `trackOrder` | view | orders | ✅ تشوف الطلبات |
| `sendMessage` | send | conversations | ✅ تهضر مع زبون |
| `addConversation` | create | conversations | ✅ تصيفط رسالة لزبون |
| `updateConversation` | update | conversations | ✅ تثبّت محادثة ولا تحيّد التثبيت |
| `deleteConversation` | delete | conversations | ✅ تحيّد محادثة |
| `addTemplate` | create | settings | ✅ تصايب المحلّ ديالك |
| `updateTemplate` | update | settings | ✅ تبدّل معلومات المحلّ |
| `deleteTemplate` | delete | settings | ✅ تحيّد المحلّ ديالك |
| `exportData` | view | settings | ✅ تشوف الإعدادات |
| `importData` | create | settings | ✅ تصايب المحلّ ديالك |
| `resetToDemo` | — | settings | ❌ **ما كايناش** |
| `refreshData` | — | **لا صفحة** | — |
| `setOnboardingCompleted` | — | **لا صفحة** | — |

## ③ ما لا يبلغه الكلامُ بعد

كلُّ سطرٍ هنا **عملٌ حقيقيّ**: الإنسانُ يفعله بيده في صفحةٍ ولا يستطيع أن يطلبه بالكلام.

· `login` (بلا صيغة) — في: delivery · settings
· `resetToDemo` (بلا صيغة) — في: settings

## ④ أفعالٌ لا تستعملها صفحة

تعيش في المخزن ولا يبلغها مشهد. إمّا بابٌ ناقصٌ أو كودٌ ميّت.

· `register`
· `updateOrder`
· `refreshData`
· `setOnboardingCompleted`
