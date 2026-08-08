import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { readGround, isUnread, type Ground } from '../../src/lib/evidence';

// ============================================================
// **الدليل — التطبيقُ يعرف متى لم يفهم.**
//
//   العطبُ المقيس: `needEngine` تُرجع `find_pro` حين لا تجد شيئًا، و`journey`
//   تسجّل «ما لم نفهمه» بشرط `intent === 'unknown'` — التي لا تقع. فالقناةُ
//   مبنيّةٌ من طرفَيها ولا يمرّ فيها شيء، و`learning_unknowns` تبقى فارغةً
//   بينما سبعٌ من اثنتَي عشرة جملةً تسقط.
//
//   وصاحبُ المشروع في طورِ جمعِ «أين يتوقّف وأين يخطئ». فمصرفٌ صامتٌ لا
//   يُخفي عطبًا فحسب — **يجعل قراره يُبنى على بياناتٍ تقول إنّ كلَّ شيءٍ بخير**.
// ============================================================

const g = (s: string): Ground => {
  const u = understand(s) as any;
  let r: any = null;
  try { r = parseNeed(s, {} as any); } catch { /* المقياسُ لا يسقط بسقوطها */ }
  return readGround(s, u, r?.intent).ground;
};

test('① **السؤالُ عن التطبيق يُعرَف** — وهو أوّلُ ما يسأله كلُّ مغربيٍّ يفتحه', () => {
  // وجوابُه اليومَ، مقيسًا: «شنو محتاج بالضبط؟». أي أنّ أوّلَ ثلاثِ لحظاتٍ
  //   في حياة المستخدم الجديد كلُّها إخفاق.
  assert.equal(g('شكون نتا ولا نتي'), 'about_self');
  assert.equal(g('شكون نتا'), 'about_self');
  assert.equal(g('شنو هو أمانزين'), 'about_self');
  assert.equal(g('فاش غادي تعاوني'), 'about_self');
  assert.equal(g('شنو كتدير'), 'about_self');
});

test('② **و«شكون» وحدَها لا تكفي** — «شكون هاد المعلم» سؤالٌ عن حرفيٍّ لا عنّا', () => {
  // نمطُ «العامُّ يبتلع الخاصّ» يُطارَد هنا منذ «شق» في «شقة». والشرطُ
  //   **ضميرُ المخاطَبِ مع أداة السؤال** — بلا ذلك تبتلع القاعدةُ كلَّ سؤالٍ
  //   عن إنسان.
  assert.notEqual(g('شكون هاد المعلم اللي زرتيه'), 'about_self');
  assert.notEqual(g('شكون كيصلح الثلاجة فحي المحمدي'), 'about_self');
});

test('③ **«مافهمتش» توقّفٌ لا سؤال** — ومَن ردّ عليها بمعلومةٍ زاد الطينَ بلّة', () => {
  assert.equal(g('مافهمتش'), 'stuck');
  assert.equal(g('ما فهمتش'), 'stuck');
  // وبموضوعٍ تبقى توقّفًا: «مافهمتش الثمن» ليست سؤالًا عن ثمن.
  assert.equal(g('مافهمتش الثمن ديال هاد المنتوج'), 'stuck');
  assert.equal(g('كيفاش ، أشنو ، مافهمتش'), 'stuck');
});

test('④ **وكلماتُ الحَيرة عاريةً فقط** — «كيفاش نبيع» سؤالٌ مشروعٌ لا حَيرة', () => {
  assert.equal(g('كيفاش'), 'stuck');
  assert.equal(g('أشنو'), 'stuck');
  // وهذا هو الضابط: بموضوعٍ تصير نيّةً كاملةً ولا تُبتلَع.
  assert.equal(g('كيفاش نبيع'), 'grounded');
  assert.equal(g('كيفاش نبدل النمرة ديالي'), 'grounded');
  assert.equal(g('فين كاين شي سباك'), 'grounded');
});

test('⑤ **`find_pro` بلا شاهدٍ صدًى** — وهذا السطرُ وحدَه يفتح قناةً ميتة', () => {
  // بلا هذا الحكم يُسجَّل كلُّ إخفاقٍ **نجاحًا** في `d.intents.find_pro`،
  //   ولا يبلغ `learning_unknowns` شيءٌ أبدًا.
  assert.equal(g('بغيت نزيد شركة توصيل'), 'echo');
  assert.ok(isUnread('echo'), 'الصدى ما كيتسجّلش — القناةُ كتبقا ميّتة');
  // والمعروفُ لا يُسجَّل مجهولًا: وإلّا امتلأ المجهولُ بأسئلةٍ نعرفها.
  assert.ok(!isUnread('about_self'), 'سؤالٌ معروفٌ كيتسجّل فخانة المجهول');
  assert.ok(!isUnread('stuck'), 'توقّفٌ معروفٌ كيتسجّل فخانة المجهول');
  assert.ok(!isUnread('grounded'));
});

test('⑥ **وبشاهدٍ يُصدَّق** — مفهومٌ أو مهنةٌ أو مشكلة', () => {
  assert.equal(g('شي لافاج قريب ليا هنا'), 'grounded');
  assert.equal(g('بغيت سباك فالرباط'), 'grounded');
  assert.equal(g('عندي مشكل فالثلاجة بغيت شي معلم'), 'grounded');
});

test('⑦ **والمدينةُ وحدَها ليست شاهدًا** — وإلّا أُعيد بناءُ المصرف بشكلٍ آخر', () => {
  // «أنا فالدار البيضاء» تُقرأ فيها مدينةٌ ولا حاجةَ فيها. ومَن عدّها دليلًا
  //   جعل كلَّ جملةٍ فيها اسمُ مدينةٍ «مفهومةً» — وهو المصرفُ نفسُه بثوبٍ آخر.
  const u = understand('انا فالدار البيضاء') as any;
  assert.ok(u.city, 'المدينةُ ما تقرّاتش — الاختبارُ كيحرس فراغًا');
  assert.equal(readGround('انا فالدار البيضاء', u, 'find_pro').ground, 'echo');
});

test('⑧ **والنيّةُ الصريحةُ دليلُ نفسِها** — لا تُقال بالصدفة', () => {
  // `buy` · `sell` · `create_store` تحتاج كلماتٍ صريحةً لتُقال، فوجودُها هو
  //   شاهدُها. والمصرفُ واحدٌ لا غير: `find_pro`.
  assert.equal(g('بغيت نشري كسوة لبنتي عندها 8 سنين انا فالدار البيضاء'), 'grounded');
  assert.equal(g('كيفاش نبيع'), 'grounded');
  const u = understand('حاجة ما') as any;
  for (const i of ['buy', 'sell', 'book', 'rent', 'create_store', 'manage']) {
    assert.equal(readGround('حاجة ما', u, i).ground, 'grounded', `نيّةُ «${i}» تبلعات`);
  }
});

test('⑨ **والترتيبُ هو الحارس** — المعروفُ يُقرأ قبل أن يسقط في المصرف', () => {
  // «شكون نتا» و«مافهمتش» ترجعان `find_pro` بلا شاهدٍ من `parseNeed`. فلو
  //   سبق حكمُ `echo` قراءتَهما لَسُجّل سؤالان **نعرفهما تمامًا** في خانة
  //   المجهول — فيمتلئ العدّادُ بما نعرف، ويضيع فيه ما لا نعرف.
  const u1 = understand('شكون نتا') as any;
  const u2 = understand('مافهمتش') as any;
  assert.equal(readGround('شكون نتا', u1, 'find_pro').ground, 'about_self');
  assert.equal(readGround('مافهمتش', u2, 'find_pro').ground, 'stuck');
  // وسببُ الحكم يُكتَب: يُقرأ في السجلّ بعد شهرٍ بلا فتح الكود.
  assert.ok(readGround('شكون نتا', u1, 'find_pro').why.length > 3, 'حكمٌ بلا سبب');
});

test('⑩ **والطبقةُ لا تنازع التوجيه** — لو حُذفت بقي كلُّ شيءٍ كما هو', () => {
  // شرطُ ألّا تصير طبقةً سادسةً تنازع الخمسَ القائمة: تقرأ ولا تُقرّر وجهةً.
  //
  //   **وكلُّ مسارِ رجوعٍ يُفحَص لا واحدٌ منها.** كُتب هذا الحارسُ أوّلًا على
  //   جملةٍ واحدةٍ فنجح على حقنه: أُضيف حقلُ وجهةٍ إلى مسارِ `echo` والاختبارُ
  //   يمرّ بمسار `grounded`. وحارسٌ يفحص طريقًا من ثمانيةٍ يحرس ثُمنَ القاعدة.
  const paths: Array<[string, string | undefined]> = [
    ['بغيت سباك فالرباط', 'find_pro'],      // grounded بشاهد
    ['حاجة ما', 'buy'],                      // grounded بنيّةٍ صريحة
    ['شكون نتا', 'find_pro'],                // about_self
    ['مافهمتش', 'find_pro'],                 // stuck
    ['كيفاش', 'find_pro'],                   // stuck عارية
    ['انا فالدار البيضاء', 'find_pro'],      // echo
    ['', 'find_pro'],                        // فارغة
  ];
  const seen = new Set<string>();
  for (const [s, i] of paths) {
    const r = readGround(s, understand(s || 'x') as any, i);
    seen.add(r.ground);
    assert.deepEqual(Object.keys(r).sort(), ['ground', 'why'],
      `«${s}» رجعات حقلًا زائدًا — الطبقةُ ولّات حَكَمًا سادسًا`);
  }
  // ولا يُحرَس ثُمنٌ ويُظَنّ كلًّا: الأرضيّاتُ الأربعُ كلُّها مرّت من هنا.
  assert.deepEqual([...seen].sort(), ['about_self', 'echo', 'grounded', 'stuck'],
    `ما مرّاتش كلُّ الأرضيّات: ${[...seen].join(' · ')}`);
});
