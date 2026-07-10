# 03 — عقد النيّة (Intent Specification)

> العقد الرسمي الذي يحوّل **جملة إنسان** إلى **نيّة منظَّمة** تفهمها المنصّة.
> هذا هو «كيف يفكّر AMANZINE». يخضع للقانون ٩ (العقود ثابتة، ومنسوخة الإصدار).
>
> **إصدار العقد الحالي: `intent/v1`.**

---

## ١. المكان في المسار

```
"الباب لا يغلق"                     ← Input: جملة إنسان بلغته
      │
   Normalize            تطبيع (حروف/مسافات/لهجة)
      │
   Interpret (AI)       ← تفسير النيّة  →  Intent JSON  (هذا العقد)
      │
   Decide               ← اختيار المحرّك المناسب من الـ Intent
      │
   Execute (Search)     ← تنفيذ على المحرّك المختار
      │
   نتائج موحّدة
```

- **Interpret** مسؤولية `AI Engine` (القانون ٢: يفسّر لا يجيب).
- **Decide** تختار `engine` بناءً على النيّة.
- **Execute** تنفّذ فقط.

> المرحلة الحالية: `Decide` و`Execute` مدموجتان في `server/lib/engines/search.js` تبسيطًا (القانون ٣، ملاحظة تنفيذية). العقد أدناه هو الملزِم بصرف النظر عن التقسيم الفيزيائي للملفّات.

---

## ٢. المُدخَل (Input)

```jsonc
{
  "q":        "الباب لا يغلق",   // جملة المستخدم — إلزامي
  "lat":      33.57,             // اختياري (سياق الموقع)
  "lng":      -7.58,             // اختياري
  "radiusKm": 10                 // اختياري
}
```

المُدخَل الوحيد الإلزامي هو `q`. الباقي **سياق** يرفع الدقّة، لا شرطًا.

---

## ٣. المُخرَج الرسمي (Intent JSON — `intent/v1`)

```jsonc
{
  "version":    "intent/v1",

  "need":       "إصلاح باب",        // الحاجة الإنسانية كما فُهمت (نص قصير)
  "raw":        "الباب لا يغلق",     // الجملة الأصلية كما كتبها المستخدم

  "category":   "نجار",             // الفئة المستنتَجة | null
  "city":       "الدار البيضاء",    // المدينة | null
  "urgency":    "today",            // now | today | soon | any
  "capabilities": ["bookable"],     // القدرات المطلوبة (انظر §5)

  "engine":     "service",          // المحرّك المختار (انظر §6)
  "confidence": 0.82,               // ثقة التفسير 0..1 (انظر §7)

  "signals": {                      // إشارات خام للترتيب/التتبّع (اختياري)
    "wantTrust": true,
    "nearby":    true
  }
}
```

### تعريف الحقول

| الحقل | النوع | الوصف |
|------|------|-------|
| `version` | string | إصدار العقد. يتغيّر عند أي كسر توافق. |
| `need` | string | الحاجة الإنسانية بصياغة قصيرة مفهومة. |
| `raw` | string | جملة المستخدم حرفيًا (للتتبّع وتغذية القاموس). |
| `category` | string \| null | فئة من قاموس المعرفة، أو `null` إن لم تُفهَم. |
| `city` | string \| null | مدينة معروفة، أو `null`. |
| `urgency` | enum | `now`=الآن، `today`=اليوم، `soon`=قريبًا، `any`=غير محدّد. |
| `capabilities` | string[] | القدرات المطلوبة (تقود المحرّك والفلاتر). |
| `engine` | enum | المحرّك الذي قرّرت طبقة `Decide` توجيه الطلب إليه. |
| `confidence` | number | 0..1؛ دون العتبة → مسار احتياطي (§7). |
| `signals` | object | إشارات مساعدة للترتيب؛ ليست جزءًا من القرار. |

---

## ٤. القيم المسموحة — `engine`

القيم في `intent/v1` (تتوسّع فقط عبر Decision Record — القانون ٤):

`service` · `product` · `store` · `booking` · `job` · `general`

`general` هو الاحتياطي حين تكون النيّة غامضة أو `confidence` منخفضًا.

---

## ٥. القدرات (Capabilities)

القدرات تصف **ما يمكن فعله بالنتيجة**، لا نوعها (القانون ٦). أمثلة `intent/v1`:

`bookable` · `purchasable` · `deliverable` · `contactable` · `locatable` · `hireable`

القاعدة: النيّة تطلب قدرة، والمحرّك يرشّح الأنشطة التي تملكها. «أريد حجز طبيب» → `capabilities:["bookable"]`.

---

## ٦. قواعد القرار (Decision Rules) — `intent/v1`

طبقة `Decide` تختار `engine` بهذا الترتيب (أول تطابق يفوز):

1. إشارة حجز صريحة (`bookable` / موعد / «حجز») → `booking`.
2. إشارة عمل (`hireable` / «شغل» / «وظيفة») → `job`.
3. فئة خدمة معروفة (نجار/سباك/كهربائي…) → `service`.
4. نيّة شراء منتج (`purchasable` / اسم سلعة) → `product`.
5. اسم/فئة متجر → `store`.
6. غير ذلك أو `confidence < 0.4` → `general`.

> القرار **قابل للتفسير**: كل نتيجة يجب أن تُرجِع سبب اختيار المحرّك (للتتبّع ولوحة الإدارة).

---

## ٧. الثقة والمسار الاحتياطي (Confidence & Fallback)

- `confidence ≥ 0.7` → توجيه مباشر للمحرّك المختار.
- `0.4 ≤ confidence < 0.7` → توجيه + عرض بدائل («هل تقصد؟»).
- `confidence < 0.4` → `engine:"general"` + **تسجيل الجملة في `search_misses`** (انظر `04_KNOWLEDGE_GRAPH.md`).

> القانون ٢: عند الغموض لا يخمّن AI — يُرجع ثقة منخفضة ويترك المسار الاحتياطي يعمل. كل جملة لم تُفهَم = **فرصة تعلُّم** للقاموس، لا خطأ يُبتَلع.

---

## ٨. أمثلة

| جملة المستخدم | need | category | urgency | engine | capabilities |
|---|---|---|---|---|---|
| الباب لا يغلق | إصلاح باب | نجار | any | service | bookable |
| صنبور كيقطر دابا | تسريب ماء | سباك | now | service | bookable |
| بغيت نشري تلاجة | شراء ثلاجة | — | any | product | purchasable |
| بغيت نحجز طبيب غدا | حجز طبيب | طبيب | soon | booking | bookable |
| كنقلب على خدمة | بحث عمل | — | any | job | hireable |
| فين نلقى قاعة أفراح فمراكش | قاعة أفراح | قاعات | any | store | locatable,contactable |
| بغيت هدية | هدية | — | any | general | — |

> «بغيت هدية» غامضة عمدًا → `general` + احتمال سؤال توضيحي، لا تخمين.

---

## ٩. الحالة الحالية مقابل العقد (Honesty Gap)

التنفيذ الحالي (`server/lib/engines/ai.js` → `ruleAdapter`) يُنتج اليوم:
`{ understood: { category, city, availableToday, wantTrust, kind, nearby }, filters }`.

الفجوة نحو `intent/v1`:
- ✅ موجود فعلًا: `category`, `city`, تمييز `service/general`, إشارات (`wantTrust`→verified, `availableToday`→openNow).
- ⬜ يجب إضافته: حقول `version`, `need`, `urgency` (enum بدل boolean)، `capabilities[]`, `engine` صريح, `confidence`, وتسجيل `search_misses`.

هذه الفجوة **مقصودة ومعلنة**: العقد هو الهدف، والتنفيذ يتقدّم نحوه دون كسر المستهلكين (القانون ٩). أي إضافة حقل غير كاسرة تبقى ضمن `intent/v1`؛ أي حذف/تغيير دلالة حقل ⇒ `intent/v2` + Decision Record.

---

## ١٠. نقطة الاستبدال بنموذج لغوي (LLM Seam)

`AI Engine` يعرّف `setAdapter(fn)`. المحلّل الافتراضي قائم على قواعد (يعمل بلا مفتاح).
أي نموذج (Claude/OpenAI/Gemini/محلّي) يُسجَّل عبر `setAdapter` **بشرط أن يُرجع نفس عقد `intent/v1`**. المستهلكون لا يتغيّرون. هذا تطبيق مباشر للقانونين ٢ و٩.
