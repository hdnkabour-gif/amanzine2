# دستور AMANZINE — فهرس الوثائق

> المرجع الأعلى للمشروع (Single Source of Truth). قبل أي تعديل على AMANZINE — أيًّا كان من يعدّل — يُعاد إلى هذه الوثائق.
> ترتيب السلطة عند التعارض: **الرؤية ← الدستور ← بقية الوثائق ← الكود.**

## الوثائق

| # | الوثيقة | تجيب | الحالة |
|---|---------|------|--------|
| 00 | [`00_VISION.md`](./00_VISION.md) | **ما هو AMANZINE؟** | ✅ مكتوبة |
| 01 | [`01_CONSTITUTION.md`](./01_CONSTITUTION.md) | القوانين غير القابلة للنقاش + آلية التعديل (Decision Records) | ✅ مكتوبة |
| 02 | `02_ARCHITECTURE.md` | كيف يُبنى؟ (المحرّكات، Facade/Adapters، Event backbone) | ↪︎ قائمة كـ [`AMANZINE_FULL_ARCHITECTURE.md`](../AMANZINE_FULL_ARCHITECTURE.md) — تُنقل لاحقًا |
| 03 | [`03_INTENT_SPEC.md`](./03_INTENT_SPEC.md) | **كيف يفكّر؟** عقد النيّة الرسمي `intent/v1` | ✅ مكتوبة |
| 04 | [`04_KNOWLEDGE_GRAPH.md`](./04_KNOWLEDGE_GRAPH.md) | كيف يفهم لغة المستخدم وينمو من الاستعمال؟ | ✅ مكتوبة |
| 05 | [`05_UX_GUIDELINES.md`](./05_UX_GUIDELINES.md) | **كيف يشعر المستخدم؟** (Intent-first، أول دقيقة) | ✅ مكتوبة |
| 06 | [`06_DEVELOPMENT_RULES.md`](./06_DEVELOPMENT_RULES.md) | كيف نطوّر دون خرق الدستور؟ | ✅ مكتوبة |
| 07 | [`07_API_CONTRACTS.md`](./07_API_CONTRACTS.md) | العقود الثابتة بين الواجهة والخادم | ✅ مكتوبة |
| 08 | [`08_LEARNING_LOOP.md`](./08_LEARNING_LOOP.md) | كيف يتعلّم من كل تفاعل؟ القمع + Learning Score + لوحة العقل | ✅ مكتوبة |

> خارطة الطريق (المراحل الثلاث) تعيش حاليًا في [`SUPERAPP_ROADMAP.md`](../SUPERAPP_ROADMAP.md)، والمعمار التفصيلي في [`AMANZINE_FULL_ARCHITECTURE.md`](../AMANZINE_FULL_ARCHITECTURE.md) — يُنقلان تحت `docs/` لاحقًا.

## قرارات المعمار (Architecture Decision Records)

أي تغيير في الرؤية أو المعمار يوثَّق في [`docs/decisions/`](./decisions/) وفق [`TEMPLATE.md`](./decisions/TEMPLATE.md) (والقالب مذكور أيضًا في `01_CONSTITUTION.md` § التعديل). لا يُدمَج كود يخالف الدستور قبل اعتماد DR يعدّل البند المخالف.

| DR | القرار | الحالة |
|----|--------|--------|
| [DR-0001](./decisions/DR-0001-layered-architecture-by-evolution.md) | اعتماد نموذج الطبقات الخمس بالتطوّر لا بالهدم (رفض إعادة الهيكلة الكبرى) | ✅ معتمَد |
| [DR-0002](./decisions/DR-0002-search-misses.md) | تسجيل عمليات البحث بلا نتيجة (`search_misses`) لتنمية القاموس | ✅ معتمَد |
| [DR-0003](./decisions/DR-0003-continuous-learning-platform.md) | تثبيت هوية «التعلّم المستمر» + خارطة طبقة التعلّم + بوابة خصوصية لتاريخ النيّة | ✅ معتمَد |
| [DR-0004](./decisions/DR-0004-learning-loop.md) | حلقة التعلّم كفلسفة (مشترك على Event Bus) + قانون ١١ اختبار المعرفة + Learning Score | ✅ معتمَد |
| [DR-0005](./decisions/DR-0005-progressive-platform.md) | المنصّة تنمو مع المستخدم + قانون ١٢ + زون «الخطوة التالية» | ✅ معتمَد |

## المراحل الثلاث (من `01_CONSTITUTION`)

1. **تثبيت الرؤية** — هذه الوثائق (الدستور + عقد النيّة + القاموس). *(جارٍ)*
2. **إبهار المستخدم** — أفضل تجربة لأول دقيقة، نتائج موحّدة، رحلة قصيرة.
3. **التوسّع** — Redis · SEO/SSR · CMI · Analytics دائمة · نموّ القاموس من البيانات.

> لا يبدأ كود المرحلة ٢ قبل اعتماد وثائق المرحلة ١.
