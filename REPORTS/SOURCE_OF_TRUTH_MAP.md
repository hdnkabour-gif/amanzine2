# AMANZINE — SOURCE OF TRUTH MAP · **TRACE ONLY**

**لا تغييرَ كود · لا إصلاح · لا معماريّةَ مقترَحة.**
هذا التقريرُ يصف **ما هو قائمٌ الآن** فقط.

**وكلُّ سطرٍ موسومٌ بمصدره:**
🟢 **مقيس** — في المتصفّح أو في متن الشبكة · ⚪ **مقروء** — من المصدر وحدَه.
والتمييزُ ليس تزيّدًا: ستَّ مرّاتٍ في هذه الجلسة أعطاني الكودُ صورةً كذّبها
القياس.

---

## ⓪ أوضحُ سطرٍ في الخريطة

> **`intent` يعيش في `sessionStorage` ولا يُنظَّف أبدًا.
> `turns` يعيش في `useState` ويموت عند كلّ انتقال.**
> نصفا رحلةٍ واحدةٍ بعمرَين متعاكسَين.

🟢 مقيس — رحلةٌ كاملةٌ بجملة «بغيت ناكل شي سندويش»:

| المحطّة | الرابط | `intent` | `stance` | `turns` |
|---|---|---|---|---|
| الهبوطُ فارغًا | `/` | — | — | 0 |
| بعد الجملة | `/market` | **restaurant** | seek | 0 |
| الدخول | `/home` | restaurant | seek | 0 |
| المحادثة (جملتان) | `/home` | restaurant | seek | **4** |
| ⇢ المساعد | `/assistant` | restaurant | seek | **0** ❌ |
| ⇢ النشر الموحّد | `/publish` | restaurant | seek | **0** ❌ |
| ⇢ الرئيسيّة | `/home` | restaurant | seek | **0** ❌ |
| ⇢ لوحة التحكّم | `/dashboard` | restaurant | seek | **0** ❌ |
| ⇢ الرئيسيّة | `/home` | restaurant | seek | **0** ❌ |

`intent` بقي **تسعَ محطّاتٍ** بعد أن انتهت مهمّتُه — لا أحدَ ينظّفه ولا أحدَ
يقرؤه بعد `AuthPage`. و`turns` مات **خمسَ مرّات**.

---

## ① جدولُ الحالات السبع

| الحالة | مصدرُ الحقيقة | الكاتبون | القارئون | التخزين | العمر | تضيع عند |
|---|---|---|---|---|---|---|
| **Understanding** | ⚪ **لا مصدرَ واحد** — ثلاثُ دوالّ | `understand` (٨ مواضع) · `parseNeed` (NeedFirst) · `understandHybrid` (Assistant) · `understandRules` (LivingHome) | كلُّ سطحٍ لنفسه | لا شيء — يُعاد حسابُه | لحظةُ النداء | 🟢 كلُّ انتقال |
| **Intent** | ⚪ مشتقٌّ من Understanding، **ويُنسَخ** إلى `sessionStorage` | `NeedFirst` (٤ كتابات) | `AuthPage` (قراءتان) فقط | `sessionStorage: amanzine_need` | 🟢 **حتّى إغلاق التبويب — بلا تنظيف** | لا تضيع؛ **تتقادم** |
| **Needs / Signals** | ⚪ `signals` — **نسختان** | `LivingHome:221` · `NeedFirst:199` | كلٌّ لنفسه | `useState` | عمرُ المكوّن | 🟢 كلُّ انتقال |
| **Intent Snapshot** | ⚪ `LivingHome:115` **وحدَه** | `LivingHome` فقط | `LivingHome` فقط | `useState` (+ قياسٌ تلمتريٌّ إلى `amanzine_snapshots`) | عمرُ المكوّن | 🟢 كلُّ انتقال · **ولا يُفتَح أصلًا في الهبوط ولا المساعد ولا النشر** |
| **Conversation** | ⚪ **ثلاثةُ سجلّاتٍ منفصلة** | `LivingHome.turns` · `AssistantPage.msgs` · `NeedFirst.text/ask` | كلٌّ لنفسه | `useState` | عمرُ المكوّن | 🟢 كلُّ انتقال (٤ ⟵ ٠) |
| **Decision** | ⚪ `decideExecution` + `decideInterface` | **`LivingHome` وحدَها تناديهما** | `LivingHome` | `useState: decision` | عمرُ المكوّن | 🟢 كلُّ انتقال |
| **Execution** | ⚪ `applyVerdict` ⇐ `LivingHome` · و`routeTo`/`resumeNeed` يوجّهان **بلا حَكَم** | `LivingHome` · `NeedFirst` · `AuthPage` | — | — | لحظيّ | — |
| **Auth** | ⚪ `store.tsx` + كوكي HttpOnly | `login`/`register`/`logout` | كلُّ التطبيق | `localStorage: ai_commerce_token` + كوكي | 🟢 **يعيش التحديث** ✔ | — |
| **Person facts** | ⚪ `rememberFacts`/`forgetFact` | **`LivingHome` وحدَها (٨ نداءات)** | `LivingHome` | `localStorage` (مُزامَن) | دائم | — |

---

## ② الأجوبةُ على الأسئلة الاثني عشر

**١ · مصدرُ Understanding**: ⚪ **لا واحد.** أربعُ دوالٍّ مختلفة، ولكلّ سطحٍ
اختيارُه. `NeedFirst` تنادي `parseNeed`+`understand`؛ `LivingHome` تنادي
`orchestrate`(⇐`parseNeed`)+`understand`+`understandRules`؛ `AssistantPage`
تنادي `understandHybrid`. ثلاثةُ طرقٍ لقراءة الجملة نفسِها.

**٢ · مصدرُ Intent**: ⚪ لا كيانَ اسمُه Intent. هو حقلٌ داخل ناتج القراءة،
**ويُنسَخ نصًّا** إلى `sessionStorage.amanzine_need` عند مغادرة الهبوط.

**٣ · مصدرُ Needs**: ⚪ `Signals` — **نسختان مستقلّتان** في `LivingHome`
و`NeedFirst`، تُبنيان بـ`signalsFrom` وتُعدَّلان بـ`applyAnswer` كلٌّ على حدة.
و`enrichSignals` (الذي يملأ من الذاكرة) **تناديه `LivingHome` وحدَها**.

**٤ · مصدرُ Intent Snapshot**: ⚪ `useState` في `LivingHome` **حصرًا**.
🟢 مقيس: يُفقَد عند كلّ انتقال. و**لا يُفتَح إطلاقًا** في الهبوط ولا المساعد
ولا النشر — أي أنّ «عقدَ الطلب» الذي بُني (HU-4) يعمل في سطحٍ واحدٍ من ستّة.

**٥ · مصدرُ Conversation State**: ⚪ **ثلاثةُ سجلّات**:
`LivingHome.turns` · `AssistantPage.msgs` (تبدأ دائمًا بتحيّة ⇒ محادثةٌ جديدة
في كلّ فتح) · `NeedFirst` (نصٌّ وسؤالٌ واحد، بلا سجلّ).

**٦ · مصدرُ Decision**: ⚪ `decideExecution`+`decideInterface` — و**`LivingHome`
هي المُنادي الوحيد**. `NeedFirst` و`AuthPage` يوجّهان بلا استشارتهما.

**٧ · مصدرُ Execution**: ⚪ `applyVerdict` في `LivingHome`؛ وفي الهبوط
`routeTo`، وبعد المصادقة `resumeNeed`. ثلاثةُ مقرّرين للوجهة.

**٨ · أين تُخزَّن**: 🟢 مقيس — `sessionStorage`: `amanzine_need` ·
`amanzine_need_stance` · `amanzine_publish_seed` · `amanzine_need_seed` ·
`amanzine_splash` · `amanzine_sid`. `localStorage`: ١٧ مفتاحًا، أهمُّها
`ai_commerce_token/user`. والباقي كلُّه `useState`.

**٩ · من يكتب** — 🟢 مقيس من المصدر:

| المفتاح | كاتبون | قارئون |
|---|---|---|
| `amanzine_need` | `NeedFirst` ×4 | `AuthPage` ×2 |
| `amanzine_need_stance` | `NeedFirst` ×2 (**دالّتان: `go` و`routeTo`**) | `AuthPage` ×1 |
| `amanzine_publish_seed` | `CreateFlow` · **`LivingHome`** | `CreateFlow` |
| `amanzine_need_seed` | `NeedFirst` ×1 | **لا أحد** ⚠️ مفتاحٌ يُكتَب ولا يُقرَأ |

**١٠ · من يقرأ**: كما فوق. ولا قارئَ لأيٍّ منها في `LivingHome` أو
`AssistantPage` — أي أنّ الحاجةَ المكتوبةَ في الهبوط **لا تصل المحادثةَ أبدًا**.

**١١ · أين تضيع** — 🟢 مقيس:

```
الهبوط ⇢ الدخول    intent: باقٍ ✔   turns: ٠ ⟵ ٠   snapshot: غير موجودٍ أصلًا
الدخول ⇢ الرئيسيّة intent: باقٍ ✔   turns: ٠        وأوّلُ جملةٍ تبدأ من الصفر
الرئيسيّة ⇢ المساعد  turns: ٤ ⟵ ٠ ❌   snapshot: ضاع ❌   signals: ضاعت ❌
المساعد ⇢ النشر      كلُّ شيءٍ من الصفر ❌
النشر ⇢ الرئيسيّة    turns: ٠ ❌
الرئيسيّة ⇢ لوحة التحكّم ⇢ الرئيسيّة   turns: ٤ ⟵ ٠ ❌
```

**١٢ · أين يُعاد تحليلُ الجملة نفسِها** — ⚪ مقروء:
- في `LivingHome.submit`: `orchestrate`(⇐`parseNeed`) ثمّ `understand(q)` ثمّ
  `understandRules(q)` داخل `escalate` ثمّ `readGround`.
- و`UnderstandingCard` تنادي `understand(query)` **مع كلّ ضغطةِ مفتاح**،
  و`correctionOptions(understand(text))` نداءٌ آخر.
- وفي `NeedFirst.go`: `parseNeed` ثمّ `understand` — ثمّ **يُعاد كلُّ ذلك من
  الصفر في `LivingHome`** لو وصل الإنسانُ إليها.

---

## ③ ما لم يُقَس، ويُقال

- `snapshot` و`signals` **لا تُرصَدان من خارج التطبيق** — حكمي عليهما ⚪ مقروء
  ومستنتَجٌ من كونهما `useState` في مكوّنٍ يُفكّ. لم أُثبتهما بقياس.
- شوطُ القياس هذا مرّ **بحسابٍ مُصادَقٍ سلفًا**، فلم يمرّ بنموذج الدخول.
  مسارُ الدخول قيس في `ONE_NEED_MANY_PATHS.md` على حدة.
- لم أقرأ الستّمئة ملفّ. الخريطةُ مبنيّةٌ من **نقاط القرار وإعلانات الحالة**:
  مفاتيحُ التخزين · `useState` في الأسطح الأربعة · مُنادو دوالّ العقل.
  ما خارج ذلك لم يُفحَص.
- «عدّةُ عقولٍ تتناقض» (الحالة التي يقول فيها الفهمُ `restaurant` والتنفيذُ
  شيئًا آخر) — **لم أُثبتها بمثالٍ حيٍّ بعد**. ما أثبتُّه هو **تعدُّدُ
  المصادر**، وهو شرطُ التناقض لا التناقضُ نفسُه.

---

## ④ ما يقوله الجردُ بلا تفسير

| الحالة | عددُ المُلّاك |
|---|---|
| Understanding | **٤ دوالّ · ٣ أسطحٍ تختار بينها** |
| Conversation | **٣ سجلّات** |
| Needs/Signals | **٢** |
| Intent (المنسوخ) | كاتبٌ واحدٌ بدالّتَين · قارئٌ واحد |
| Intent Snapshot | **١** — ولا يعمل إلّا في سطحٍ واحدٍ من ستّة |
| Decision | **١** — ولا يُنادى إلّا من سطحٍ واحد |
| Execution/الوجهة | **٣ مقرّرين** |

`Decision` و`Snapshot` **ليسا مكرَّرَين — بل شبهُ مهجورَين**: بُنيا كاملَين
ولا ينادِيهما إلّا سطحٌ واحد. وهو نمطُ «طبقةٌ صحيحةٌ لا ينادِيها أحد»،
للمرّة التاسعة في هذا المشروع.
