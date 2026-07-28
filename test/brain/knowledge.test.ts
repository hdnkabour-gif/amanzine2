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

// حارسُ انحدار: مدينةُ الذكاء قد تعود لاتينيّة («Casablanca»/«Casa») بينما القاعدة
// تخزّن بالعربيّة. لو رجعت خامًا ⇒ /market?city=Casablanca ⇒ نتائج فارغةٌ بصمت.
test('تطبيع مدن الذكاء: الأشكال اللاتينيّة تُردّ إلى الاسم العربيّ', () => {
  assert.equal(resolveCity('Casablanca')?.city, 'الدار البيضاء');
  assert.equal(resolveCity('casa')?.city, 'الدار البيضاء');
  assert.equal(resolveCity('Rabat')?.city, 'الرباط');
  assert.equal(resolveCity('Marrakech')?.city, 'مراكش');
  // الاسم العربيّ يبقى كما هو (لا يُفسده التطبيع)
  assert.equal(resolveCity('الدار البيضاء')?.city, 'الدار البيضاء');
});

// حارسُ الاتّجاه: «أنا حدّاد» كان يُفهَم كطلبٍ لحدّاد فيردّ «نقلبو عليه» على من
// يعرض حدادته. الحرفة تُستخرَج في الحالتين — الفرق في stance وحده.
test('الاتّجاه: يَعرض مقابل يطلب', () => {
  const offer = understand('أنا حداد') as any;
  const seek  = understand('بغيت حداد') as any;
  assert.equal(offer.stance, 'offer');
  assert.equal(seek.stance, 'seek');
  assert.equal(offer.profession?.label, seek.profession?.label); // نفس الحرفة
  for (const q of ['أنا نجار', 'أنا صباغ', 'عندي محل', 'عندي شركة', 'أنا كنخدم'])
    assert.equal((understand(q) as any).stance, 'offer', `فشل: ${q}`);
  for (const q of ['بغيت سباك', 'خاصني كهربائي', 'كنقلب على نجار'])
    assert.equal((understand(q) as any).stance, 'seek', `فشل: ${q}`);
});

// الشكوى طلبٌ لا عرض، رغم أنّها تبدأ بـ«عندي».
test('الشكوى المجرّدة: طلب، وبلا تخمين مجال', () => {
  const u = understand('عندي مشكل') as any;
  assert.equal(u.stance, 'seek');
  // «مشكل» وحدها لا تدلّ على مجال — كانت تقترح «تقني معلوميّات» بلا دليل.
  assert.equal(u.profession, undefined);
  assert.equal(u.problem, undefined);
  // لكنّ الشكوى ذات السياق تبقى مفهومة (لا انحدار).
  assert.ok((understand('عندي مشكل فالحاسوب') as any).problem);
  assert.equal((understand('الما كيقطر') as any).profession?.label, 'سبّاك');
});

// المجالات المضافة عبر مستورد CSV — تُحلّ بكلمتها المميّزة، وباتّجاهٍ صحيح.
test('مجالات جديدة: لباس تقليديّ · تغليف · طابعات', () => {
  assert.equal(resolveConcept('بغيت قفطان للعرس')?.id, 'traditional_clothing');
  assert.equal(resolveConcept('عندي محل قفطان')?.id, 'traditional_clothing');
  assert.equal(resolveConcept('كندير تغليف الطوموبيلات')?.id, 'car_wrapping');
  assert.equal(resolveConcept('الطابعة ديالي خربانة')?.id, 'printer_repair');
  assert.equal((understand('عندي محل قفطان') as any).stance, 'offer');
  assert.equal((understand('بغيت قفطان للعرس') as any).stance, 'seek');
});

// الأخصّ يفوز على العامّ: كان «بغيت نشري حاسوب» يُحلّ إلى computer_repair،
// و«بغيت حوايج للبيبي» إلى clothing. الفهرس مرتَّبٌ بالطول + صيغٌ حقيقيّة.
test('الأخصّ أوّلًا: لا يبتلع العامُّ الخاصَّ', () => {
  assert.equal(resolveConcept('بغيت نشري حاسوب')?.id, 'computer_hardware_store');
  assert.equal(resolveConcept('بغيت حوايج للبيبي')?.id, 'baby_clothing');
  assert.equal(resolveConcept('بغيت حقيبة')?.id, 'fashion_accessories');
  assert.equal(resolveConcept('بغيت نغلف طوموبيلي بالكوير')?.id, 'car_wrapping');
  // انحدار: العامّ يبقى صحيحًا حين لا يوجد أخصّ
  assert.equal(resolveConcept('الحاسوب مليان فيروسات')?.id, 'it_support');
  assert.equal(resolveConcept('بغيت سباك')?.id, 'plumber');
  assert.equal(resolveConcept('بغيت نغسل طوموبيلي')?.id, 'car_wash');
});

// مفاهيمُ الأدمن تُحفَظ في القاعدة، والفهارس تُبنى عند تحميل الوحدة — فبلا
// تسجيلٍ وقتَ التشغيل تبقى محفوظةً بلا أثر. هذا الحارس يمنع تلك الفجوة.
test('تسجيل مفاهيمَ وقتَ التشغيل يؤثّر في الفهم فورًا', async () => {
  const { registerRuntimeConcepts } = await import('../../src/lib/akg/kb/knowledge');
  assert.notEqual(resolveConcept('بغيت مربي دواجن')?.id, 'poultry_farm');
  registerRuntimeConcepts([{
    id: 'poultry_farm', category: 'فلاحة', concept: { ar: 'مربّي دواجن' },
    variants: { ar: ['مربي دواجن'], darija: ['مربي الدجاج'] },
  } as any]);
  assert.equal(resolveConcept('بغيت مربي دواجن')?.id, 'poultry_farm');
  assert.equal(resolveConcept('فين نلقى مربي الدجاج')?.id, 'poultry_farm');
  assert.equal(resolveConcept('بغيت سباك')?.id, 'plumber');   // بلا انحدار
});
