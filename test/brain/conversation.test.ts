import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { decideExecution } from '../../src/lib/executionPolicy';
import { abilityFor } from '../../src/lib/abilities';
import { readAction } from '../../src/lib/akg/kb/actions';

// ============================================================
// **المحادثةُ كيانٌ يُدار** — من جردِ الصفحات، لا من تخمين.
//
//   سؤالُ صاحب المشروع نصًّا عن سطرَين في `REPORTS/PAGE_ACTIONS.md`:
//   «`updateConversation` · `deleteConversation` (عملٌ حقيقيّ) ??? comment ?!»
//
//   وهما زرّان يضغطهما التاجرُ في `MessagesPage` كلَّ يوم — حذفُ محادثةٍ
//   وتثبيتُها — ولم تكن في اللغة كلمةٌ واحدةٌ تبلغهما. والقياسُ قبلَ العمل:
//
//     «حيد هاد المحادثة»   ⇒ delete/**settings** ⇒ «شنو بغيتي تحيّد؟»
//     «ثبت هاد المحادثة»   ⇒ لا فعلَ إطلاقًا     ⇒ «ما فهمتش مزيان»
//
//   الأولى «يعرف ثمّ يسأل» في أوضح صوره: سمّى ما يريد حذفَه في الجملة
//   نفسِها، فسُئل عنه.
// ============================================================

const judge = (s: string) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  const match = abilityFor({ action: u.action, intent: r?.intent });
  return { u, match, d: decideExecution(u, match || undefined, false) };
};

test('«حيد هاد المحادثة» ⇒ حذفُ محادثةٍ — لا سؤالٌ عمّا قيل للتوّ', () => {
  for (const s of ['حيد هاد المحادثة', 'مسح المحادثة ديال كريم', 'بغيت نمسح هاد الشات']) {
    const { u, match, d } = judge(s);
    assert.equal(u.action?.object, 'conversation', `«${s}» قُرئ هدفُها ${u.action?.object}`);
    assert.equal(match?.id, 'DELETE_CONVERSATION', `«${s}» طابقت ${match?.id}`);
    assert.ok(!/شنو بغيتي تحيّد/.test(d.say || ''), `«${s}» سُئلت عمّا سمّته: «${d.say}»`);
    // والحذفُ لا يُنفَّذ من جملةٍ واحدةٍ مهما وضحت.
    assert.equal(d.verdict, 'confirm', `«${s}» حُكم فيها ${d.verdict}`);
    assert.equal(d.dest?.page, 'conversations');
  }
});

test('«ثبّت» فعلٌ يُقرأ بلا أن يُنطَق — والاتّجاهُ يُفصَل عن نقيضه', () => {
  const pin = judge('ثبت هاد المحادثة');
  assert.equal(pin.u.action?.verb, 'update', 'التثبيتُ تعديلٌ لا إنشاء');
  assert.equal(pin.u.action?.pinned, true);
  assert.equal(pin.match?.id, 'PIN_CONVERSATION');
  assert.equal(pin.d.verdict, 'execute', 'تثبيتٌ يُقلَب بضغطة ولا يُؤكَّد');

  // ── **«حيّد التثبيت» ليست حذفًا** ─────────────────────────────
  //   فعلُها المنطوقُ حذفٌ ومرادُها تعديل. ولو قُرئ الحذفُ حرفيًّا لَمُسحت
  //   المحادثةُ كلُّها لمن أراد نزعَ دبّوسٍ عنها — والدبّوسُ يُعاد بضغطة،
  //   والمحادثةُ لا.
  for (const s of ['حيد التثبيت', 'فك التثبيت ديال هاد المحادثة']) {
    const { u, match, d } = judge(s);
    assert.equal(u.action?.verb, 'update', `«${s}» قُرئت ${u.action?.verb} — تُمحى محادثةٌ بدل رفعِ دبّوس`);
    assert.equal(u.action?.pinned, false, `«${s}» قُرئ اتّجاهُها ${u.action?.pinned}`);
    assert.equal(match?.id, 'PIN_CONVERSATION');
    assert.notEqual(d.verdict, 'confirm', `«${s}» طُلب فيها تأكيدُ حذفٍ لا يقع`);
  }
});

test('ولا تبتلع المحادثةُ ما ليس لها — الأخصُّ قبل الأعمّ يعمل في الاتّجاهَين', () => {
  // ── **الجملةُ التي تُثبِت الترتيب** ───────────────────────────
  //   قِيس هذا الحارسُ بحقنِ العطب (نقلُ `conversation` بعد `customers`)
  //   فمرّ — لأنّ جملتي الأولى كانت «المحادثة ديال **كريم**»، واسمُ العلَم
  //   ليس في قائمة الزبناء أصلًا. أي أنّ الحارسَ كان يحرس دعوى لم يقسها.
  //   وهذه الجملةُ تحمل الكلمتَين معًا، وهي وحدَها تُسقط الترتيبَ الخاطئ —
  //   وأثرُه أن يُحذَف **زبونٌ** لمن طلب حذفَ محادثةٍ معه.
  assert.equal(judge('حيد المحادثة ديال الزبون').match?.id, 'DELETE_CONVERSATION');
  // وحدُّه أن يبقى «حيد هاد الزبون» حذفَ زبونٍ لا حذفَ محادثة.
  assert.equal(judge('حيد هاد الزبون').match?.id, 'DELETE_CUSTOMER');
  assert.equal(judge('مسح هاد المنتوج').match?.id, 'DELETE_PRODUCT');
  assert.equal(judge('بغيت نصيفط رسالة لزبون').u.action?.object, 'customers');
  // و«ثبت» ليست فعلًا عامًّا: «وافق على الطلب» تبقى موافقةً لا تثبيتًا.
  const ok = judge('وافق على الطلب');
  assert.equal(ok.u.action?.object, 'orders');
  assert.equal(ok.u.action?.status, 'approved');
});

test('وقراءةُ التثبيت لا تسري إلّا على محادثة — «ثبت» وحدَها ليست أمرًا', () => {
  // حدُّ القاعدة: لا هدفَ ⇒ لا قراءة. وإلّا صار كلُّ «ثبت» في الدنيا فعلًا.
  assert.equal(readAction('ثبت')?.object, undefined);
  assert.equal(readAction('ثبت الخبر')?.object, undefined);
});

// ============================================================
// **الحقلُ لا يُؤخَذ من قراءةٍ لا تكفي.**
//
//   عطبٌ قاسه الحسابُ الآخرُ في `executionPolicy` — وهو ملفٌّ عملتُ فيه:
//
//     «بغيت نبيع شي حاجة جديدة» ⇒ وجهة `publish` وحقل **`settings`**
//
//   و«جديد» هنا صفةُ سلعةٍ لا أمرَ إنشاء، فتُقرأ فعلًا بلا هدفٍ بثقة ٠٫٣٥.
//   والصفحةُ صحيحةٌ (`SELL_PRODUCT` من النيّة) والحقلُ من قراءةٍ **مرفوضةٍ
//   في نفس الملفّ**: `READ_ENOUGH = 0.5` كان مكتوبًا داخلَ فرعٍ واحدٍ
//   فطُبِّق هناك وحدَه. أي أنّ القراءةَ الضعيفةَ مُنعت أن تُنتج سؤالًا
//   وسُمح لها أن تُنتج حقلًا.
// ============================================================

test('حقلٌ من قراءةٍ ضعيفةٍ لا يُفتَح — والصفحةُ تبقى', () => {
  const { u, d } = judge('بغيت نبيع شي حاجة جديدة');
  assert.ok((u.action?.confidence ?? 0) < 0.5, 'تغيّرت القراءةُ — لم تعد هذه الحالةَ المقيسة');
  assert.equal(d.dest?.page, 'publish', 'ضاعت الوجهةُ الصحيحة');
  assert.equal(d.dest?.focus, undefined, `فُتح حقلُ «${d.dest?.focus}» لمن يريد أن يبيع`);
});

test('والحقلُ من القراءة التي أنتجت البابَ — لا من قراءةٍ أخرى', () => {
  // `abilityFor` تجرّب الفعلَ ثمّ النيّة. فإن جاءت القدرةُ من النيّة كان
  // هدفُ الفعل شيئًا آخرَ — وحقلٌ من قراءةٍ وبابٌ من أخرى تركيبٌ لا أحدَ قاله.
  const { match, d } = judge('كنصايب الحلويات');
  assert.equal(match?.id, 'OFFER_SERVICE');
  assert.equal(d.dest?.focus, undefined, 'حقلٌ من فعلٍ لم يُنتج هذه القدرة');
});

test('ولا يُغلَق البابُ المقصود: الحقلُ المسمّى صراحةً يبقى أخصَّ من الصفحة', () => {
  // هذا هو طلبُ صاحب المشروع نفسُه — «تفتح فقط الشيء الذي يطلبه المستخدم».
  const cases: [string, string][] = [
    ['بغيت نبدل رقم الهاتف', 'phone'],
    ['بدل اسم المحل', 'shop_name'],
    ['بغيت نبدل العنوان', 'address'],
    ['بدل اللغة', 'language'],
    ['بغيت نبدل وقت الخدمة', 'shop_hours'],
  ];
  for (const [s, focus] of cases) {
    const { d } = judge(s);
    assert.equal(d.dest?.focus, focus, `«${s}» فقدت حقلَها — صارت تفتح الصفحةَ كاملةً`);
  }
});
