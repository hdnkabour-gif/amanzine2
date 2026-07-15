# 🎨 AMANZINE — UI Master System (Design Bible)

> **القاعدة الذهبية:** من الآن فصاعدًا، أيّ صفحة أو مكوّن جديد داخل AMANZINE
> **يجب** أن يتبع هذا النظام. لا نخترع أسلوبًا آخر. كل شيء ينتمي لنفس العالم.
> جودة مستهدفة: **Apple / Airbnb / Stripe / Linear** بهويّة مغربيّة فاخرة.

هذه الوثيقة هي المرجع الدائم. أشِر إليها عند بناء أي واجهة.

---

## 1) BRAND — الهوية
**AMANZINE** — البوّابة الذكية المغربية.
Luxury · Minimal · Timeless · Elegant · Trustworthy · Premium.
الاستعارة المركزية: **البوّابة** (القوس المغربي) — تنفتح على ما يحتاجه الإنسان.

## 2) COLOR SYSTEM — الألوان
| الدور | الاسم | القيمة | متغيّر CSS |
|------|------|--------|-----------|
| الأخضر الزمرّدي | Emerald | `#006D5B` | `--amz-emerald` |
| الأحمر الفاخر | Luxury Red | `#C8102E` | `--amz-red` |
| الذهبي الملكي | Royal Gold | `#D4A017` | `--amz-gold` |
| الداكن | Dark | `#071B17` | `--amz-dark` |
| السطح | Surface | `#0F2C25` | `--amz-surface` |
| الكريمي | Cream | `#F8F4ED` | — |
| الأبيض | White | `#FFFFFF` | — |

> الأخضر = الهوية · الذهبي = الفخامة/الإضاءة · الأحمر = اللمسة المغربية (نادر، للتأكيد).
> متغيّرات الخلفيّة معرّفة في `src/styles/background-system.css`.

## 3) TYPOGRAPHY — الخطوط
- العربية: **Tajawal** · اللاتينية: **Inter**.
- العناوين: كبيرة، SemiBold/Black. النصّ: Regular.
- تباعد أحرف وسطور مضبوط. لا نصّ مزدحم.

## 4) LOGO — الشعار
- استعمل دائمًا شعار AMANZINE الرسميّ. **لا تعدّله. لا تمطّطه.** احترم مساحة الفراغ حوله.
- الملفّات: `public/brand/amanzine-logo.png` (الرسميّ، يُفضّل) → `public/amanzine-logo.svg` (متّجه احتياطيّ).
- الأيقونة: `public/brand/amanzine-icon.png`.

## 5) BACKGROUND SYSTEM — نظام الخلفيّات ⭐
**خلفيّة أمّ واحدة (الهوية) → ١٠ مشتقّات خفيفة لكل قسم.** المستخدم داخل نفس العالم.
- الأمّ: تدرّج أخضر زمرّدي داكن + زليج مغربي خفيف (< 5%) + Vignette + إضاءة ذهبيّة ناعمة. **لا ضجيج.**
- التنفيذ: `src/styles/background-system.css` + `src/components/MasterBackground.tsx`.
- كل قسم يأخذ **تنويعًا خفيفًا فقط** (لا خلفيّة مختلفة كليًّا):

| القسم | المشتقّ (class) | الطابع |
|------|------------------|--------|
| Splash | (فيديو البوّابة) | أفخم مشهد، مرّة واحدة |
| Home | `.amz-bg--home` | هادئ، زليج أخفت، مساحات واسعة |
| Marketplace | `.amz-bg--market` | خطوط ذهبيّة رفيعة تربط البطاقات |
| Store | `.amz-bg--store` | أغمق قليلًا، إضاءة أعلى الصورة |
| Services | `.amz-bg--services` | معيّنات زليج صغيرة، أهدأ |
| AI Assistant | `.amz-bg--ai` | داكن، توهّج أخضر، إحساس Particles |
| Maps | `.amz-bg--maps` | شبكة خطوط رفيعة، توهّج أخضر |
| Chat | `.amz-bg--chat` | أفتح، نقش بسيط (الفقاعات هي البطلة) |
| Profile | `.amz-bg--profile` | بسيط جدًّا، التركيز على المستخدم |
| Dashboard | `.amz-bg--dashboard` | Dark Luxury + إضاءة ذهبيّة |

> إضافة صفحة جديدة: أضِف اسمها إلى خريطة `VARIANT` في `MasterBackground.tsx`.

## 6) BUTTONS — الأزرار
كبيرة · Radius **16px** · ظلّ ناعم · خلفيّة خضراء · نصّ أبيض.
Hover: توهّج ذهبيّ. Pressed: `scale(.97)`. المدّة **220ms**.

## 7) CARDS — البطاقات
Glassmorphism · Blur **18px** · Opacity ~85% · Radius **20px** ·
Shadow `0 10px 40px rgba(0,0,0,.15)` · حدّ ذهبيّ رفيع.

## 8) ICONS — الأيقونات
Lucide · Stroke **2px** · Rounded · Minimal · بلمسة مغربيّة عند الحاجة.

## 9) MOTION — الحركة
Fade / Scale / Slide / Spring · **60 FPS** · جودة Apple · **لا مبالغة**.
انتقال الصفحات: Fade + Blur + Scale · **250ms**.
**البوّابة الحيّة:** عند التوجيه من نيّة → `playGate()` (`src/lib/gateTransition.ts`).

## 10) STATES — الحالات
- **Loading:** Skeleton + Shimmer + توهّج ناعم.
- **Empty:** رسمة بسيطة + خلفيّة هندسيّة مغربيّة + رسالة مفيدة + زرّ CTA.

## 11) SHADOWS & LIGHTING
ظلال ناعمة جدًّا، أبدًا حادّة. إضاءة محيطة ناعمة + لمعات ذهبيّة. **بلا Neon.**

## 12) LAYOUT
شبكة **8px** · النسبة الذهبيّة · محاذاة مثاليّة · مساحات بيضاء واسعة · Pixel Perfect · Responsive · Accessible.

## 13) QUALITY BAR
Apple · Awwwards / Behance · Production Ready · Consistent. كلّ شيء يبدو منظومة واحدة.

---

### كيف نستعمل هذه الوثيقة
1. قبل بناء أي واجهة → اقرأ القسم المعنيّ هنا.
2. استعمل متغيّرات الألوان والخلفيّات الموجودة، لا قيمًا عشوائيّة.
3. صفحة جديدة → سجّلها في `MasterBackground.tsx`.
4. حدّث هذه الوثيقة إن أضفنا نمطًا جديدًا — تبقى **مصدر الحقيقة الوحيد** للتصميم.
