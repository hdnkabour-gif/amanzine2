// ============================================================
// AMANZINE — Knowledge Graph (عُقد المفاهيم). طبقةٌ فوق `knowledgeData`/`knowledge`
//   تُعطي لكلّ مفهومٍ عُقدةً غنيّة: أسئلةٌ توضيحيّة · خدماتٌ مرتبطة · مسارُ حجز.
//   إضافةٌ خالصة — لا تمسّ resolveConcept ولا understand (تُستدعى عند الحاجة فقط).
//   الأسئلة تُشتقّ من أمثلة الملفّ الكبير، وتُكمَّل بطبقةٍ مُنسَّقة لأهمّ المفاهيم.
// ============================================================

import { CONCEPTS } from './concepts';

export interface BookingFlow { steps: string[]; requires_visit: boolean; estimated_duration: number; }
export interface RelatedRef { id: string; name: string; }
export interface ConceptNode {
  id: string; name: string; category: string;
  services: string[];
  questions: string[];              // أسئلةٌ توضيحيّة (خيارات نقرٍ في الحوار)
  related: RelatedRef[];            // خدماتٌ مكمّلة/قريبة
  booking_flow: BookingFlow;
}

// أسئلةٌ مُنسَّقة لأهمّ المفاهيم (بالدارجة، مختصرة). تُغلّب على المشتقّة آليًّا.
const CURATED_Q: Record<string, string[]> = {
  mechanic:     ['واش كتصلح جميع الماركات؟', 'واش عندك خدمة سحب السيارة؟', 'شحال كتاخذ وقت باش تصلح؟'],
  auto_electrician: ['واش المشكل فالبطارية ولا فالكابلاج؟', 'واش الطوموبيل كتشعل؟'],
  car_wash:     ['غسل داخليّ ولا خارجيّ؟', 'واش كتغسل المحرك؟', 'واش عندك خدمة متنقلة؟'],
  car_service:  ['واش بغيتي فيدانج؟', 'آخر مرّة فاش دُرتي الصيانة؟'],
  plumber:      ['واش المشكل فالصنبور ولا فالقنوات؟', 'واش كاين تسريب دابا؟', 'مستعجل ولا عاديّ؟'],
  electrician:  ['واش الضو مقطوع كامل ولا جزء؟', 'واش المشكل فجهاز معيّن؟', 'مستعجل ولا عاديّ؟'],
  carpenter:    ['واش خشب ولا ألمنيوم؟', 'إصلاح ولا صناعة جديدة؟'],
  painter:      ['شحال ديال البيوت؟', 'واش عندك اللون ولا نختارو؟', 'واش قبل مناسبة؟'],
  house_painter:['شحال ديال البيوت؟', 'داخليّ ولا خارجيّ؟'],
  barber:       ['رجال ولا أطفال؟', 'حلاقة عاديّة ولا حلاقة+دقن؟'],
  sewing_machine_repair: ['واش الماكينة ما كتخدمش بالمرّة؟', 'واش الخيط كينقطع؟', 'أيّ ماركة؟'],
  mobile_phone_repair: ['واش المشكل فالشاشة ولا فالبطارية؟', 'أيّ موديل؟'],
  home_appliance_repair: ['أيّ جهاز؟ (ثلاجة/غسّالة/…)', 'واش كيشعل أصلًا؟'],
  hvac_technician: ['تركيب ولا إصلاح؟', 'كليماتيزور ولا ثلاجة؟'],
  locksmith:    ['واش سرقتي المفتاح ولا خربان القفل؟', 'باب ولا خزانة ولا طوموبيل؟'],
  tiler:        ['شحال ديال المتر؟', 'زليج ولا رخام؟'],
  mason:        ['بناء جديد ولا إصلاح؟', 'واش عندك التصميم؟'],
  doctor_gp:    ['واش مستعجل؟', 'كشف فالعيادة ولا فالدار؟'],
  dentist:      ['واش عندك وجيعة دابا؟', 'تنظيف ولا علاج؟'],
  // ── مجالات جديدة (ملابس · تقنية · شبكات) ──
  wifi_internet:      ['واش الإشارة ضعيفة ولا كتقطع بالمرّة؟', 'واي فاي ولا كابل؟', 'شركة أشمن مزوّد؟'],
  satellite_receiver: ['بارابول ولا ريسيفر؟', 'القنوات كامل ولا بعض؟', 'تركيب جديد ولا إصلاح؟'],
  network_technician: ['شركة ولا دار؟', 'كابلاج ولا سيرفر ولا واي فاي؟', 'شحال ديال النقط؟'],
  it_support:         ['حاسوب ولا لابتوب؟', 'فورماتاج ولا إصلاح؟', 'واش كيشعل أصلًا؟'],
  cybersecurity:      ['شبكة شركة ولا شخصيّة؟', 'واش وقع اختراق دابا؟'],
  cctv_security_systems: ['شحال ديال الكاميرات؟', 'واش بغيتي تشوفهم من الهاتف؟', 'داخل ولا برّا؟'],
  computer_repair:    ['واش كيشعل أصلًا؟', 'المشكل فالنظام ولا فالجهاز؟', 'بغيتي فورماتاج؟'],
  kids_clothing:      ['شحال ديال العمر؟', 'ولد ولا بنت؟', 'واش كاين توصيل؟'],
  mens_clothing:      ['أيّ مقاس؟', 'واش كاين التبديل؟'],
  womens_clothing:    ['أيّ مقاس؟', 'واش كاين توصيل؟'],
  used_clothing:      ['أيّ نوع؟', 'واش الجودة مزيانة؟'],
};

// خدماتٌ مرتبطة مُنسَّقة (تُغلّب على «نفس الفئة» الآليّة).
const CURATED_R: Record<string, string[]> = {
  mechanic:    ['auto_electrician', 'car_wash', 'car_service'],
  car_wash:    ['car_polishing', 'car_service', 'mechanic'],
  car_service: ['mechanic', 'auto_electrician'],
  plumber:     ['electrician', 'mason', 'tiler'],
  electrician: ['plumber', 'auto_electrician'],
  painter:     ['mason', 'tiler', 'carpenter'],
  carpenter:   ['painter', 'blacksmith'],
  barber:      ['beauty_salon'],
  dentist:     ['doctor_gp'],
  wifi_internet:      ['network_technician', 'it_support', 'satellite_receiver'],
  network_technician: ['it_support', 'wifi_internet', 'cybersecurity'],
  it_support:         ['computer_repair', 'network_technician', 'cybersecurity'],
  cctv_security_systems: ['network_technician', 'wifi_internet'],
  satellite_receiver: ['wifi_internet', 'tv_and_audio_repair_technician'],
  mobile_phone_repair: ['computer_repair'],
  computer_repair:    ['it_support', 'mobile_phone_repair'],
  kids_clothing:      ['mens_clothing', 'womens_clothing'],
};

const DEFAULT_FLOW: BookingFlow = {
  steps: ['اختيار الخدمة', 'وصف الحاجة', 'تحديد الموعد', 'تأكيد الحجز'],
  requires_visit: false,
  estimated_duration: 60,
};

function genericQuestions(): string[] {
  return ['واش الخدمة مستعجلة؟', 'فين نتلاقاو — عندك ولا عندي؟', 'واش عندك شي تفاصيل زيادة؟'];
}

// conceptGraph — عُقدةٌ غنيّة لمفهوم. تُشتقّ من البيانات + طبقةٍ مُنسَّقة.
// `stance` يختار أسئلة المفهوم المكتوبة (asks): سؤالُ مَن يَعرض ليس سؤالَ مَن يطلب.
export function conceptGraph(id: string, stance?: 'offer' | 'seek' | 'unknown'): ConceptNode | null {
  const c = CONCEPTS.find(x => x.id === id);
  if (!c) return null;

  // أسئلة بأربع طبقات، الأخصّ أوّلًا:
  //   1) asks المكتوبة للمفهوم (من CSV أو من لوحة الأدمن) — حسب الاتّجاه.
  //      بلا هذه الطبقة كان ما يكتبه الأدمن يُحفَظ ولا يُعرَض أبدًا.
  //   2) المُنسَّقة يدويًّا  3) أمثلةُ الملفّ التي فيها سؤال  4) أسئلةٌ عامّة.
  // عند اتّجاهٍ مجهول نُقدّم أسئلة الطالب: أغلبُ مَن يفتح المساعد يطلب لا يَعرض.
  const authored = stance === 'offer'
    ? (c.asks?.offer || [])
    : stance === 'seek'
      ? (c.asks?.seek || [])
      : (c.asks?.seek?.length ? c.asks.seek : (c.asks?.offer || []));
  const derived = (c.examples || []).filter(e => /[؟?]/.test(e)).slice(0, 3);
  const questions = (authored.length ? authored
    : CURATED_Q[id]?.length ? CURATED_Q[id]
      : derived.length ? derived : genericQuestions()).slice(0, 4);

  // مرتبطة: روابطُ المفهوم المكتوبة (links.related) أوّلًا — نفس منطق asks:
  // ما يكتبه الأدمن أدقُّ من الاشتقاق. ثمّ المُنسَّقة، وإلّا خدماتٌ من نفس الفئة.
  const relIds = c.links?.related?.length
    ? c.links.related
    : CURATED_R[id]?.length
      ? CURATED_R[id]
      : CONCEPTS.filter(x => x.id !== id && x.category && x.category === c.category).slice(0, 4).map(x => x.id);
  const related: RelatedRef[] = relIds
    .map(rid => { const rc = CONCEPTS.find(x => x.id === rid); return rc ? { id: rid, name: rc.concept.ar || rid } : null; })
    .filter((r): r is RelatedRef => !!r)
    .slice(0, 5);

  return {
    id, name: c.concept.ar || id, category: c.category || '',
    services: c.services || [],
    questions, related, booking_flow: DEFAULT_FLOW,
  };
}

// عدد المفاهيم التي تملك طبقةً مُنسَّقة (للإحصاء/الاختبار).
export function graphCoverage() {
  return { curatedQuestions: Object.keys(CURATED_Q).length, curatedRelated: Object.keys(CURATED_R).length };
}
