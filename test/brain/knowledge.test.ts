import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand, resolveConcept, resolveCity, knowledgeStats } from '../../src/lib/akg/kb';

// ============================================================
// طبقة المعرفة المغربيّة متعدّدة اللغات — من الملفات المعرفيّة الثلاثة.
// نثبت أنّ AMANZINE يفهم الخدمة مهما كانت اللغة: دارجة/عربيّة/فرنسيّة/إنجليزيّة/Arabizi.
// (حالات المالك الحرفيّة.)
// ============================================================

const svc = (q: string) => resolveConcept(q)?.id || null;

test('القاموس مُحمَّل (مفاهيم + مدن)', () => {
  const s = knowledgeStats();
  assert.ok(s.concepts >= 15, `concepts=${s.concepts}`);
  assert.ok(s.cities >= 20, `cities=${s.cities}`);
});

test('دارجة: «بغيت سباك» ⇒ plumber', () => {
  assert.equal(svc('بغيت سباك'), 'plumber');
});

test('دارجة تركيبيّة: «بغيت شي حد يغسل ليا الطوموبيل» ⇒ car_wash', () => {
  assert.equal(svc('بغيت شي حد يغسل ليا الطوموبيل'), 'car_wash');
});

test('دارجة تركيبيّة: «يصلح ليا الطوموبيل» ⇒ mechanic', () => {
  assert.equal(svc('بغيت شي واحد يصلح ليا الطوموبيل'), 'mechanic');
});

test('Arabizi: «bghit mecanicien f casa» ⇒ mechanic + الدار البيضاء', () => {
  assert.equal(svc('bghit mecanicien f casa'), 'mechanic');
  assert.equal(resolveCity('bghit mecanicien f casa')?.city, 'الدار البيضاء');
});

test('Arabizi مختلط: «ma3ndich frein bghit mecanicien» ⇒ mechanic', () => {
  assert.equal(svc('ma3ndich frein bghit mecanicien'), 'mechanic');
});

test('فرنسيّة: «je cherche un coiffeur» ⇒ barber', () => {
  assert.equal(svc('je cherche un coiffeur'), 'barber');
});

test('إنجليزيّة: «I need a plumber» ⇒ plumber', () => {
  assert.equal(svc('I need a plumber'), 'plumber');
});

test('عربيّة فصحى: «أبحث عن ميكانيكي سيارات» ⇒ mechanic', () => {
  assert.equal(svc('أبحث عن ميكانيكي سيارات'), 'mechanic');
});

test('understand() يُخرج service/category/language (JSON منظّم)', () => {
  const u = understand('bghit mecanicien f casa');
  assert.equal(u.service, 'mechanic');
  assert.equal(u.category, 'automotive');
  assert.equal(u.city, 'الدار البيضاء');
  assert.ok(u.language);
  assert.ok(u.reasoning.length);
});

test('المدن: أسماء بديلة متعدّدة اللغات ⇒ نفس المدينة', () => {
  for (const q of ['casa', 'كازا', 'Casablanca', 'البيضاء']) {
    assert.equal(resolveCity(q)?.city, 'الدار البيضاء', `فشل: ${q}`);
  }
  assert.equal(resolveCity('bghit chi haja f marrakech')?.city, 'مراكش');
});

test('قاموسٌ موسّع (≥100 مفهوم من ملفّ الخدمات الكبير)', () => {
  assert.ok(knowledgeStats().concepts >= 100, `concepts=${knowledgeStats().concepts}`);
});

test('فهم الجملة (لا الكلمة): «كيصلح الماكينة ديال الخياطة» ⇒ sewing_machine_repair', () => {
  assert.equal(svc('واش كاين شي واحد كيصلح الماكينة ديال الخياطة؟'), 'sewing_machine_repair');
});

test('تطبيعٌ متين: صيغٌ مختلفة لنفس الخدمة ⇒ نفس المفهوم', () => {
  assert.equal(svc('lavage auto casa'), 'car_wash');
  assert.equal(svc('غسل طوموبيلات'), 'car_wash');
});

test('مفاهيم جديدة من الملفّ: حدّاد/خرّاز/طبيب أسنان', () => {
  assert.equal(svc('بغيت حداد'), 'blacksmith');
  assert.equal(svc('بغيت خراز'), 'shoemaker');
  assert.equal(svc('بغيت طبيب أسنان'), 'dentist');
});

test('لا يكسر الموجود: الأعراض التقليديّة ما زالت تعمل', () => {
  const u = understand('الما كيقطر فالكوزينة');
  assert.equal(u.profession?.label, 'سبّاك');
});
