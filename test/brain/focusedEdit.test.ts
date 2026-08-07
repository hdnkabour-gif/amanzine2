import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { decideExecution } from '../../src/lib/executionPolicy';
import { abilityFor } from '../../src/lib/abilities';
import { isFocusable } from '../../src/components/FocusedEdit';

// ============================================================
// **نافذةٌ تفتح الشيءَ المطلوبَ وحدَه.**
//
//   طلبُ صاحب المشروع نصًّا: «نافذة منبثقة تفتح فقط الشيء الذي يطلبه
//   المستخدم — مثلًا رقم الهاتف تفتح فقط خانة لكتابة رقم الهاتف، ليس صفحة
//   الإعدادات بالكامل».
//
//   والعطبُ مقيس: «بدّل اسم المحلّ» و«بدّل العنوان» و«بدّل اللغة» ثلاثةُ
//   أفعالٍ لها بابٌ واحدٌ فيه خمسون حقلًا. فمن طلب حقلًا يُلقى في صفحةٍ
//   ويُترَك يبحث عمّا سمّاه للتوّ.
// ============================================================

const judge = (s: string) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  const match = abilityFor({ action: u.action, intent: r?.intent });
  return decideExecution(u, match || undefined, false);
};

test('من سمّى حقلًا يُرفَق حقلُه بالوجهة', () => {
  for (const [s, page, focus] of [
    ['بغيت نبدل النمرة ديالي', 'settings', 'phone'],
    ['بغيت نبدل إسم المحل ديالي', 'settings', 'shop_name'],
    ['بغيت نبدل اللغة', 'settings', 'language'],
    ['بغيت نبدل وقت الخدمة', 'settings', 'shop_hours'],
  ] as const) {
    const d = judge(s);
    assert.equal(d.dest?.page, page, `«${s}» ⇒ ${d.dest?.page || '—'}`);
    assert.equal(d.dest?.focus, focus,
      `«${s}» ⇒ وجهةٌ بلا حقل — تُفتَح صفحةٌ كاملةٌ لمن طلب خانة`);
  }
});

test('**ومن لم يسمِّ حقلًا لا يُخترَع له** — الصفحةُ كاملةٌ صوابٌ هنا', () => {
  // «بغيت نبيع» نيّةٌ خشنةٌ بلا هدفٍ مقروء. فتحُ حقلٍ لها تخمينٌ، والصفحةُ
  // كاملةً هي الجواب. وهذا حدُّ الآليّة: تُضيف ولا تُخمّن.
  for (const s of ['بغيت نبيع', 'عندي محل']) {
    const d = judge(s);
    assert.ok(d.dest?.page, `«${s}» فقدت وجهتَها`);
    assert.equal(d.dest?.focus, undefined, `«${s}» اختُرع لها حقلٌ لم تسمِّه`);
  }
});

test('والباحثُ لا حقلَ له ولا وجهة — يبقى في نتائجه', () => {
  const d = judge('بغيت شي حداد');
  assert.equal(d.dest, undefined, 'انتُزع الباحثُ من نتائجه');
});

// الاختباراتُ التي تقرأ المصدرَ نصًّا تعيش في `test/architecture.test.mjs`:
// هذا الملفُّ يُجمَّع بـesbuild في مجلّدٍ مؤقّت، فمسارُ المشروع لا يُقرأ منه.
