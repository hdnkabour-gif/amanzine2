# F — محرّكُ الحاجة: هل الفكرةُ موصولة؟  (HEAD 5592540)

> دليلٌ من المصدر وحدَه. لم يُقبَل `REPORTS/**` ولا نصُّ اختبارٍ دليلًا.

## قناتا تعلّمٍ متوازيتان — واحدةٌ تصل، وواحدةٌ تنتهي إلى لا شيء

### ① بحثٌ لم يُفهَم ⇒ أدمن ⇒ معرفةٌ حيّة ✅
`search_misses` → `POST /api/knowledge/misses/:id/resolve` (auth+admin)
→ `variants[lang]` تُضاف إلى `custom_concepts` بـ`status:'published'`
→ `concepts.ts` يدمجها اتّحادًا وقتَ التشغيل.
الدليل: `server/routes/knowledge.js:56-95`.

### ② الذكاءُ يفهم ⇒ اقتراح ⇒ اعتماد ⇒ **لا شيء** ❌
```
understandRules يعجز
 → shouldEscalate()        src/lib/understanding.ts:171
 → LLM_CHAIN[RemoteProvider]  :167
 → rememberEscalation()       :228
 → POST /api/ai/suggest-unknown      server/routes/ai.js:947
 → db.suggestForUnknown()            server/database.js:1513
 → إنسانٌ يعتمد: POST /api/ai/judge-unknown
 → db.judgeUnknown()                 server/database.js:1559
 → ✖ انتهى
```

### F-F1 | BLOCKER | UNWIRED
**الادّعاء:** اعتمادُ ما فهمه الذكاءُ لا يُنتج معرفةً تُقرأ.
**الدليل:** جسدُ `judgeUnknown` كلُّه سطرٌ واحد:
`UPDATE learning_unknowns SET status = $2 WHERE text = $1`.
وكلُّ ذكرٍ للجدول في كود الإنتاج (5 مواضع):
`:1424` إدراج · `:1439` قائمةُ عرضٍ للأدمن · `:1513` كتابةُ اقتراح ·
`:1559` تبديلُ حالة. **صفرُ قارئٍ لـ`status='approved'`.**
**الأثر:** يُصعَّد السؤالُ إلى الذكاء، ويُفهَم، ويُخزَّن الفهم، ويضغط
المشغّلُ «اعتمد» — ولا يتغيّر سلوكُ التطبيق. نفسُ الكلمةِ تُصعَّد غدًا
وتستهلك حصّةً ومالًا من جديد. والتعلّمُ الظاهرُ في الشاشة وَهْم.
**الثقة:** CONFIRMED

### F-F2 | MAJOR | DUPLICATE
**الادّعاء:** جدولان وشاشتان للتعلّم لا يعرف أحدُهما الآخر.
**الدليل:** `search_misses` (`routes/knowledge.js:56`) مقابل
`learning_unknowns` (`routes/ai.js:947`).
**الأثر:** يُعتمَد في القناة الخاطئة فيُظنّ أنّ النظامَ تعلّم.
**الثقة:** CONFIRMED

### F-F3 | INFO
**الادّعاء:** العمارةُ المطلوبة مبنيّةٌ أصلًا — الذكاءُ يُستدعى **ليفهم** لا ليجيب.
**الدليل:** `src/lib/understanding.ts:228-238` — المُرسَل:
`[r.profession, r.problem, r.object, r.intent].join(' · ')` أي بنيةُ فهم،
والقواعدُ أرضيّةٌ دائمة: `return base` عند أيّ فشل.
**الثقة:** CONFIRMED
