# AMANZINE — تقرير دمج المعرفة والفهم المغربيّ (Knowledge Integration)

> الهدف المُنجَز: تحويل AMANZINE إلى **محرّك فهمٍ مغربيّ متعدّد اللغات** يفهم المستخدم مهما
> كتب — دارجة · عربيّة · فرنسيّة · إنجليزيّة · Arabizi — ويُخرج نيّةً منظّمة. **إضافةٌ خالصة، بلا حذف.**

---

## 1) الملفات المعدَّلة / المُضافة
| الملف | النوع | الدور |
|---|---|---|
| `src/lib/akg/kb/knowledgeData.ts` | **جديد (مولّد آليًّا)** | بيانات: ٢٠ مفهومًا (خدمة/مهنة) بمتغيّراتٍ بأربع لغات + Arabizi · ٤٥ مدينة مغربيّة بأحيائها وأسمائها البديلة |
| `src/lib/akg/kb/knowledge.ts` | **جديد** | التطبيع + المطابقة: `normArabic`/`normLatin` · فهرسان (عربيّ/لاتينيّ) · قواعد تركيبيّة · `resolveConcept` · `resolveCity` |
| `src/lib/akg/kb/index.ts` | معدَّل (إضافة) | `understand()` يستدعي القاموس ويُخرج `service/category/language/district` (يملأ الفجوات فقط) |
| `src/lib/needEngine.ts` | معدَّل (إضافة) | قبل السؤال الموجّه: `resolveConcept` يلتقط الخدمة بأيّ لغة ⇒ يصل `/assistant` و`/home` |
| `test/brain/knowledge.test.ts` | **جديد** | ١٢ اختبارًا لحالات المالك |

**لم يُحذف أيّ شيء:** لا صفحات، لا routes، لا functions، لا API contracts. الأعراض/المفردات القديمة تعمل كما هي.

## 2) البنية الجديدة (Architecture)
```
النصّ (أيّ لغة/كتابة)
        │
        ▼
 ┌──────────────────────── knowledge.ts ────────────────────────┐
 │  Normalization:  normArabic (تشكيل/حروف/تكرار/رموز)            │
 │                  normLatin  (accents/تكرار/رموز)              │
 │  Arabizi:        deArabizi  (bghit→بغيت · 3→ع)                │
 │  Match:          فهرس عربيّ  ← ar + darija                     │
 │                  فهرس لاتينيّ ← fr + en + arabizi              │
 │                  قواعد تركيبيّة (فعل+مفعول: غسل+طوموبيل→car_wash) │
 └───────────────┬───────────────────────────┬──────────────────┘
                 ▼                           ▼
          resolveConcept              resolveCity
        {id,category,language}      {city,district}
                 │                           │
     ┌───────────┴─────────┐                 │
     ▼                     ▼                 ▼
 understand()          needEngine        (geo إثراء)
 service/category   fallback الخدمة
 /language/district  (/assistant,/home)
```
**المبدأ:** القاموس **يملأ الفجوات فقط** — لا يُلغي عرَضًا أو مهنةً وجدها المحرّك القديم. مصدرُ فهمٍ إضافيّ، لا بديل.

## 3) الميزات التي أصبحت تعمل
- **فهمٌ متعدّد اللغات لنفس الخدمة:** «بغيت سباك» · «je cherche un plombier» · «I need a plumber» · «bghit plombier» ⇒ **plumber**.
- **قواعد تركيبيّة** تحلّ ترتيب الكلمات: «يغسل ليا الطوموبيل» ⇒ **car_wash** · «يصلح الطوموبيل» ⇒ **mechanic**.
- **مدنٌ بأسماءٍ بديلة:** casa · كازا · Casablanca · البيضاء ⇒ **الدار البيضاء** (+ الأحياء).
- **إخراجٌ منظّم** من `understand()`: `{ service, category, language, city, district, confidence, reasoning[] }`.
- **يصل الحوار:** `/assistant` و`/home` صارا يفهمان الفرنسيّة/الإنجليزيّة/Arabizi عبر `needEngine`.

## 4) نتائج الاختبارات
`node scripts/run-brain-tests.mjs` → **74/74 ناجح** (كانت 62؛ +12). `tsc --noEmit` → **0 أخطاء**. `vite build` → **ناجح**.
حالات المالك كلّها خضراء:
```
بغيت سباك                         → plumber
بغيت شي حد يغسل ليا الطوموبيل      → car_wash
بغيت شي واحد يصلح ليا الطوموبيل    → mechanic
bghit mecanicien f casa           → mechanic + الدار البيضاء
ma3ndich frein bghit mecanicien   → mechanic
je cherche un coiffeur            → barber
I need a plumber                  → plumber
أبحث عن ميكانيكي سيارات            → mechanic
```

## 5) التوسعة (v2) — ردًّا على النقد الصادق
تمّ استخراج **ملفّ الخدمات الكبير (726KB) بالكامل** — لا الكتل النظيفة فقط:
- **١٦٧ مفهومًا** (كان ٢٠) — كلّ نشاطٍ في الملفّ بأسمائه بأربع لغات + خدماته + حقوله + أمثلة كلام الزبون.
- **مطابقةٌ بالكلمات (token-subset)** مع تجريد «ال» ⇒ **فهم الجملة لا الكلمة**:
  «واش كاين شي واحد كيصلح **الماكينة ديال الخياطة**؟» ⇒ `sewing_machine_repair` (لا «machine»).
- **قواعد تركيبيّة موسّعة** (`all` مجموعات): غسل+طوموبيل→lavage · صلح+طوموبيل→mechanic · ماكينة+خياطة→sewing.
- **تطبيعٌ أمتن:** `lavage auto casa` · `غسل طوموبيلات` (جمع) ⇒ نفس المفهوم.
- **رسمُ معرفةٍ جزئيّ (Knowledge Graph):** كلّ مفهومٍ يحمل الآن `{ names×4, variants, services, fields, examples, category }`.

### مقارنةٌ بمعايير النقد (بصراحة):
| # | المطلوب | الحالة |
|---|---|---|
| 1 | ٣٠٠-٦٠٠ مفهوم | **١٦٧** (كلّ ما في الملفّات فعليًّا؛ ٦٠٠ يحتاج بياناتٍ إضافيّة لم تُرسَل) |
| 2 | كلّ المدن/الأحياء | ٤٥ مدينة + أحياؤها (كلّ ما في ملفّ المدن؛ الـ١٥٠٠ جماعة ليست فيه) |
| 3 | تطبيعٌ متين | ✅ (متعدّد اللغات + جمع + ترتيب كلمات) |
| 4 | تصحيح إملائيّ | جزئيّ (تكرار الحروف + توحيد) — **الغامض يحتاج fuzzy/LLM** |
| 5 | فهم الجملة | ✅ (token-subset + تركيبيّة) |
| 6 | Knowledge Graph لا Dictionary | **جزئيّ:** names/variants/services/fields/examples/category ✅ · **ناقص:** related · questions · booking flow · AI-prompt · SEO |

### ما زال ناقصًا (صريح)
- **حقول المزوّد → نماذج تسجيل** (subsystem منفصل، البيانات جاهزة في `fields`).
- **عُقد الرسم الكاملة:** related-services · booking-flow · SEO · recommendations — تُبنى فوق البيانات الحاليّة.
- **الطبقة الذكيّة (Gemini)** للجُمَل الحرّة الطويلة خارج القاموس — البنية جاهزة (`understanding.ts` + `/connections`).
- توسيعٌ مستمرّ من «ما لم نفهمه» (لوحة البيتا).
