// ================================================================
// الخريطة الكاملة — إعدادات المنتجات والخدمات حسب الفئات
// كل فئة لها حقول جاهزة تظهر تلقائياً في معالج إضافة المنتج.
// القيم تُحفظ داخل customFields وتظهر للزبون في صفحة المتجر.
// ملاحظة: المقاسات والألوان والسعر والصور والمدة ومنطقة العمل
// لها حقول أساسية خاصة في المعالج — غير مكررة هنا.
// ================================================================
import type { CustomFieldDef } from '../types';

export type CatFieldType = 'select' | 'multiselect' | 'text' | 'textarea' | 'number' | 'boolean';

export interface CatFieldDef {
  id: string;
  label: string;
  type: CatFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
}

// فاصل قيم الاختيار المتعدد عند التخزين كنص
export const MULTI_SEP = '، ';

const SEASONS = ['شتاء', 'ربيع', 'صيف', 'خريف', 'طوال السنة'];

export const CATEGORY_FIELDS: Record<string, CatFieldDef[]> = {

  // ── 👗 ملابس نسائية ──────────────────────────────────────────
  women: [
    { id: 'subtype', label: 'نوع اللباس', type: 'select', required: true,
      options: ['قفطان', 'تكشيطة', 'جلابة', 'فستان', 'بلوزة', 'تنورة', 'بنطلون', 'طقم', 'معطف', 'سترة', 'قميص نوم', 'لانجري'],
      hint: 'يظهر كفلتر في صفحة المتجر' },
    { id: 'fabric', label: 'الخامة الأساسية', type: 'select', required: true,
      options: ['قطن', 'حرير', 'ساتان', 'شيفون', 'كريب', 'جينز', 'صوف', 'كتان', 'مخمل', 'دانتيل', 'جلد', 'فرو', 'نايلون', 'بوليستر', 'فيسكوز', 'ليكرا', 'مخلوط'] },
    { id: 'fabricMix', label: 'نسبة الخامات', type: 'text', placeholder: 'مثال: قطن 80%، بوليستر 20%' },
    { id: 'occasion', label: 'المناسبة', type: 'multiselect',
      options: ['يومي', 'عمل', 'سهرة', 'عرس', 'حفلة', 'عيد', 'رمضان', 'صيف', 'بحر', 'رياضة', 'منزل', 'نوم', 'استقبال', 'خطوبة'] },
    { id: 'season', label: 'الموسم', type: 'multiselect', options: SEASONS },
    { id: 'fit', label: 'القصة / الفيت', type: 'select',
      options: ['واسعة', 'ضيقة', 'مستقيمة', 'متوسطة', 'A-line', 'Empire', 'Wrap'] },
    { id: 'pieceLength', label: 'طول القطعة', type: 'select',
      options: ['قصير', 'متوسط', 'طويل', 'ماكسي', 'ميدي', 'ميني'] },
    { id: 'sleeve', label: 'طول الكم', type: 'select',
      options: ['بدون أكمام', 'كم قصير', 'كم 3/4', 'كم طويل'] },
    { id: 'neckline', label: 'نوع الياقة', type: 'select',
      options: ['V', 'دائري', 'مربع', 'قلب', 'عالي', 'مفتوح'] },
    { id: 'closure', label: 'الإغلاق', type: 'select',
      options: ['سحاب', 'أزرار', 'رباط', 'مطاط', 'بدون'] },
    { id: 'kaftanNo', label: 'رقم القفطان / التكشيطة', type: 'select',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], hint: 'حسب ترقيم الخياط' },
    { id: 'sizeSystem', label: 'جدول المقاسات العالمي', type: 'select',
      options: ['مغربي', 'أوروبي', 'أمريكي', 'آسيوي'] },
    { id: 'hijabMatch', label: 'نوع الحجاب المناسب', type: 'text', placeholder: 'مثال: يناسب حجاب شيفون أو حرير' },
    { id: 'madeInMorocco', label: 'صنع في المغرب 🇲🇦', type: 'boolean' },
    { id: 'care', label: 'إرشادات العناية', type: 'textarea',
      placeholder: 'يُغسل بالماء البارد، لا يُعصر، يُكوى على درجة منخفضة...' },
  ],

  // ── 👕 ملابس رجالية ──────────────────────────────────────────
  men: [
    { id: 'subtype', label: 'نوع اللباس', type: 'select', required: true,
      options: ['جلباب', 'قفطان رجالي', 'بدلة', 'قميص', 'تيشيرت', 'بولو', 'سروال', 'جينز', 'شورت', 'معطف', 'جاكيت', 'سترة', 'بلوفر', 'كارديغان', 'طقم'] },
    { id: 'fabric', label: 'الخامة', type: 'select', required: true,
      options: ['قطن', 'صوف', 'كتان', 'جينز', 'جلد', 'بوليستر', 'حرير', 'مخلوط'] },
    { id: 'occasion', label: 'المناسبة', type: 'multiselect',
      options: ['يومي', 'عمل', 'رسمي', 'كاجوال', 'عرس', 'عيد', 'رمضان', 'رياضي'] },
    { id: 'season', label: 'الموسم', type: 'multiselect', options: SEASONS },
    { id: 'fit', label: 'القصة', type: 'select',
      options: ['عادي', 'سليم', 'نحيف', 'واسع', 'رياضي'] },
    { id: 'neckline', label: 'نوع الياقة', type: 'select',
      options: ['كلاسيك', 'بوتون داون', 'ماندرين', 'V', 'دائري'] },
    { id: 'sleeve', label: 'نوع الكم', type: 'select',
      options: ['قصير', 'طويل', 'بدون أكمام'] },
    { id: 'closure', label: 'الإغلاق', type: 'select',
      options: ['أزرار', 'سحاب', 'رباط', 'مطاط'] },
    { id: 'neckSize', label: 'مقاس الرقبة (سم)', type: 'number', placeholder: '40', hint: 'للقمصان الرسمية' },
    { id: 'madeInMorocco', label: 'صنع في المغرب 🇲🇦', type: 'boolean' },
    { id: 'care', label: 'إرشادات العناية', type: 'textarea', placeholder: 'تعليمات الغسيل والكي...' },
  ],

  // ── 🧒 ملابس أطفال ───────────────────────────────────────────
  kids: [
    { id: 'subtype', label: 'نوع اللباس', type: 'select', required: true,
      options: ['بودي', 'تيشيرت', 'فستان', 'بنطلون', 'شورت', 'بيجاما', 'طقم', 'جلباب صغير', 'معطف', 'سترة', 'بدلة', 'قبعة', 'جوارب'] },
    { id: 'ageRange', label: 'الفئة العمرية', type: 'multiselect', required: true,
      options: ['0-3 شهور', '3-6 شهور', '6-12 شهر', '1-2 سنة', '2-3 سنوات', '3-5 سنوات', '5-7 سنوات', '7-10 سنوات', '10-12 سنة'] },
    { id: 'gender', label: 'الجنس', type: 'select',
      options: ['ولد', 'بنت', 'محايد (للجنسين)'] },
    { id: 'fabric', label: 'الخامة', type: 'select', required: true,
      options: ['قطن 100%', 'قطن عضوي', 'صوف', 'بوليستر', 'مخلوط'] },
    { id: 'season', label: 'الموسم', type: 'multiselect', options: SEASONS },
    { id: 'occasion', label: 'المناسبة', type: 'multiselect',
      options: ['يومي', 'عيد', 'مناسبات', 'حفلات', 'نوم', 'خروج'] },
    { id: 'childHeight', label: 'طول الطفل (سم)', type: 'text', placeholder: 'مثال: يناسب طول 68-74 سم' },
    { id: 'childWeight', label: 'وزن الطفل (كغ)', type: 'text', placeholder: 'مثال: يناسب وزن 6-8 كغ' },
    { id: 'childSafe', label: 'آمن للأطفال 🛡️', type: 'boolean', hint: 'خالي من المواد الضارة والأزرار الصغيرة' },
    { id: 'easyWear', label: 'سهل الارتداء', type: 'boolean', hint: 'أزرار أمامية، سحاب، مطاط' },
    { id: 'stretchy', label: 'قابل للتمدد — ينمو مع الطفل', type: 'boolean' },
    { id: 'care', label: 'إرشادات العناية', type: 'textarea', placeholder: 'تعليمات خاصة بملابس الأطفال...' },
  ],

  // ── 👟 أحذية ─────────────────────────────────────────────────
  shoes: [
    { id: 'subtype', label: 'نوع الحذاء', type: 'select', required: true,
      options: ['رياضي', 'رسمي', 'صندل', 'بوط', 'كعب', 'موكاسان', 'بلغة', 'سبادري'] },
    { id: 'material', label: 'المادة', type: 'select', required: true,
      options: ['جلد طبيعي', 'جلد صناعي', 'قماش', 'شامواه', 'مطاط'] },
    { id: 'usage', label: 'الاستخدام', type: 'multiselect',
      options: ['رياضي', 'رسمي', 'يومي', 'كلاسيكي', 'كاجوال'] },
    { id: 'soleType', label: 'نوع النعل', type: 'select',
      options: ['مطاط', 'جلد', 'إسفنج EVA'] },
    { id: 'waterproof', label: 'مقاوم للماء 💧', type: 'boolean' },
    { id: 'madeInMorocco', label: 'صنع في المغرب 🇲🇦', type: 'boolean' },
    { id: 'care', label: 'إرشادات العناية', type: 'textarea', placeholder: 'طريقة التنظيف والتخزين...' },
  ],

  // ── 💍 إكسسوارات ─────────────────────────────────────────────
  access: [
    { id: 'subtype', label: 'نوع الإكسسوار', type: 'select', required: true,
      options: ['ساعة', 'سوار', 'خاتم', 'قلادة', 'أقراط', 'حزام', 'نظارة شمسية', 'محفظة', 'حقيبة يد', 'حقيبة ظهر', 'وشاح', 'شال', 'ربطة عنق', 'قبعة', 'مسبحة', 'سلسال'] },
    { id: 'material', label: 'المادة الأساسية', type: 'select', required: true,
      options: ['ذهب عيار 18', 'ذهب عيار 21', 'فضة', 'فضة مطلية ذهب', 'فولاذ', 'جلد طبيعي', 'جلد صناعي', 'قماش', 'بلاستيك', 'خشب', 'نحاس', 'سيراميك'] },
    { id: 'gender', label: 'الجنس', type: 'select',
      options: ['رجالي', 'نسائي', 'للجنسين'] },
    { id: 'measure', label: 'القياس', type: 'text',
      placeholder: 'مثال: مقاس الخاتم 16، طول السلسلة 45 سم' },
    { id: 'weightGr', label: 'الوزن بالغرام', type: 'number', placeholder: '15', hint: 'مهم للذهب والفضة' },
    { id: 'suitableFor', label: 'مناسب لـ', type: 'multiselect',
      options: ['هدية عيد', 'هدية عرس', 'هدية خطوبة', 'هدية حب', 'مناسبة خاصة', 'استعمال يومي'] },
    { id: 'hypoallergenic', label: 'الحساسية', type: 'select',
      options: ['لا يسبب حساسية', 'يحتوي على نيكل', 'مناسب للبشرة الحساسة'] },
    { id: 'bagSize', label: 'حجم الحقيبة', type: 'select',
      options: ['صغير (كلاتش)', 'متوسط', 'كبير', 'XL (شنطة سفر)'] },
    { id: 'pockets', label: 'عدد الجيوب', type: 'number', placeholder: '3', hint: 'للحقائب والمحافظ' },
    { id: 'madeIn', label: 'بلد الصنع', type: 'text', placeholder: 'المغرب، تركيا، إيطاليا...' },
    { id: 'giftReady', label: 'قابل للتغليف كهدية 🎁', type: 'boolean' },
    { id: 'giftCard', label: 'بطاقة هدية مع رسالة شخصية', type: 'boolean' },
    { id: 'waterproof', label: 'مقاوم للماء 💧', type: 'boolean', hint: 'مهم للساعات' },
    { id: 'certificate', label: 'مع شهادة أصالة 📜', type: 'boolean', hint: 'للذهب والأحجار الكريمة' },
    { id: 'handmade', label: 'صنع يدوي ✋', type: 'boolean' },
  ],

  // ── 🏠 منزل وديكور ───────────────────────────────────────────
  home: [
    { id: 'subtype', label: 'نوع القطعة', type: 'select', required: true,
      options: ['زربية', 'سجادة', 'وسادة', 'غطاء سرير', 'مفرش طاولة', 'لوحة جدارية', 'إضاءة', 'مزهرية', 'ساعة حائط', 'مرآة', 'أباجورة', 'شمعة', 'مجسم', 'سلة', 'صينية', 'طقم شاي', 'فخار', 'طاجين', 'حامل بخور'] },
    { id: 'dimensions', label: 'الأبعاد', type: 'text', required: true,
      placeholder: 'مثال: 120 × 80 سم، قطر 40 سم' },
    { id: 'material', label: 'الخامة الأساسية', type: 'select', required: true,
      options: ['صوف', 'قطن', 'حرير', 'خشب', 'زجاج', 'معدن', 'سيراميك', 'فخار', 'رخام', 'حجر', 'خيزران', 'بلاستيك', 'ورق', 'شمع'] },
    { id: 'weightKg', label: 'الوزن التقريبي (كغ)', type: 'number', placeholder: '2.5', hint: 'لحساب الشحن' },
    { id: 'style', label: 'النمط / الطراز', type: 'select',
      options: ['تقليدي مغربي', 'عصري', 'ريفي', 'أندلسي', 'بوهيمي', 'مودرن', 'كلاسيك', 'Zen'] },
    { id: 'room', label: 'الغرفة المناسبة', type: 'multiselect',
      options: ['صالون', 'غرفة نوم', 'مطبخ', 'حمام', 'مدخل', 'مكتب', 'حديقة', 'شرفة'] },
    { id: 'craftCity', label: 'مدينة الصانع', type: 'text',
      placeholder: 'مراكش، فاس، تطوان، سلا، آسفي، الصويرة...', hint: 'قيمة تراثية' },
    { id: 'indoorOutdoor', label: 'مكان الاستعمال', type: 'select',
      options: ['داخلي فقط', 'خارجي فقط', 'الإثنين'] },
    { id: 'washable', label: 'قابل للغسل', type: 'select',
      options: ['غسيل يدوي', 'غسيل آلي', 'تنظيف جاف', 'لا يغسل'] },
    { id: 'setCount', label: 'عدد القطع في الطقم', type: 'number', placeholder: '6' },
    { id: 'lightType', label: 'نوع الإضاءة', type: 'select',
      options: ['LED', 'متوهج', 'شموع', 'طاقة شمسية'], hint: 'للأباجورات والإضاءات' },
    { id: 'rugThickness', label: 'سمك الزربية (مم)', type: 'number', placeholder: '12' },
    { id: 'knotType', label: 'نوع العقدة', type: 'text',
      placeholder: 'مثال: عقدة يدوية، 160,000 عقدة/م²', hint: 'للزرابي الفاخرة' },
    { id: 'handmade', label: 'صنع يدوي ✋', type: 'boolean' },
    { id: 'hangable', label: 'قابل للتعليق — يأتي مع خطاف', type: 'boolean' },
    { id: 'waterproof', label: 'مقاوم للماء 💧', type: 'boolean' },
    { id: 'battery', label: 'يحتاج بطارية', type: 'boolean' },
    { id: 'bulbIncluded', label: 'شامل المصباح', type: 'boolean' },
    { id: 'easyInstall', label: 'سهل التركيب — مع دليل', type: 'boolean' },
    { id: 'foldable', label: 'قابل للطي والتخزين', type: 'boolean' },
  ],

  // ── 🛠️ خدمات ─────────────────────────────────────────────────
  service: [
    { id: 'serviceType', label: 'نوع الخدمة', type: 'select', required: true,
      options: ['تصوير', 'تصميم جرافيك', 'تنظيف', 'إصلاح', 'توصيل', 'طبخ', 'تعليم', 'صيانة', 'حلاقة', 'خياطة', 'مونتاج فيديو', 'كتابة', 'استشارة', 'تدليك', 'بناء', 'دهن', 'حدادة', 'كهرباء', 'سباكة', 'نجارة', 'برمجة', 'تسويق', 'أخرى'] },
    { id: 'serviceLocation', label: 'مكان الخدمة', type: 'select', required: true,
      options: ['آتي للزبون', 'الزبون يأتي لمكاني', 'الإثنين', 'عن بُعد'] },
    { id: 'serviceMode', label: 'نمط الخدمة', type: 'select', required: true,
      options: ['استعجالية — متاحة فوراً', 'بموعد مسبق', 'استعجالية وبموعد'],
      hint: 'يحدد شكل الحجز الذي يراه الزبون' },
    { id: 'servicePhone', label: 'هاتف/واتساب الخدمة', type: 'text',
      placeholder: 'مثال: +212 6XX XXX XXX', hint: 'يظهر للزبون للتواصل المباشر — اتركه فارغاً لاستخدام رقم المتجر' },
    { id: 'pricingModel', label: 'طريقة التسعير', type: 'select',
      options: ['سعر ثابت', 'بالساعة', 'باليوم', 'للمشروع الكامل'] },
    { id: 'minBooking', label: 'الحد الأدنى للحجز', type: 'text',
      placeholder: 'مثال: ساعة كحد أدنى، يوم كامل كحد أدنى' },
    { id: 'teamSize', label: 'عدد مقدمي الخدمة', type: 'select',
      options: ['1', '2', '3', 'فريق كامل'] },
    { id: 'equipment', label: 'المعدات', type: 'select',
      options: ['أحضر معداتي', 'الزبون يوفر', 'غير مطلوبة'] },
    { id: 'experience', label: 'سنوات الخبرة', type: 'number', placeholder: '5' },
    { id: 'languages', label: 'اللغات', type: 'multiselect',
      options: ['العربية', 'الفرنسية', 'الأمازيغية', 'الإنجليزية'] },
    { id: 'availableDays', label: 'أيام العمل', type: 'multiselect',
      options: ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'] },
    { id: 'workHours', label: 'ساعات العمل', type: 'text', placeholder: 'مثال: 9:00 - 18:00' },
    { id: 'audience', label: 'للفئة', type: 'select',
      options: ['للجميع', 'رجال فقط', 'نساء فقط', 'أطفال'] },
    { id: 'responseTime', label: 'مدة الاستجابة', type: 'text',
      placeholder: 'مثال: الرد في أقل من 30 دقيقة' },
    { id: 'bonus', label: 'هدية مع الخدمة', type: 'text',
      placeholder: 'مثال: جلسة تجريبية مجانية' },
    // كان اسمُه `deposit` — نفسُ مفتاحِ «الضمانة» في قالب الكراء. مفتاحٌ
    // واحدٌ بمعنيين: عربونُ حجزٍ (نعم/لا) وضمانةُ كراءٍ (مبلغ). أحدُهما يطمس
    // الآخر عند الحفظ.
    { id: 'bookingDeposit', label: 'مطلوب عربون عند الحجز', type: 'boolean' },
    { id: 'freeCancel', label: 'إلغاء مجاني قبل 24 ساعة ↩️', type: 'boolean' },
  ],

  // ── 💻 منتجات رقمية ──────────────────────────────────────────
  digital: [
    { id: 'digitalType', label: 'نوع المنتج الرقمي', type: 'select', required: true,
      options: ['كتاب إلكتروني', 'تصميم', 'فيديو تعليمي', 'قالب', 'دورة', 'استشارة', 'اشتراك', 'تطبيق'] },
    { id: 'delivery', label: 'طريقة التسليم', type: 'select', required: true,
      options: ['رابط تحميل', 'إرسال بالإيميل', 'دخول لمنصة'] },
    { id: 'fileFormat', label: 'صيغة الملف', type: 'select',
      options: ['PDF', 'MP4', 'ZIP', 'PSD', 'AI', 'MP3', 'أخرى'] },
    { id: 'fileSize', label: 'حجم الملف', type: 'text', placeholder: 'مثال: 15 ميغا، 2.3 غيغا' },
    { id: 'accessTime', label: 'مدة الوصول', type: 'text',
      placeholder: 'مثال: فوري بعد الدفع، خلال 24 ساعة' },
    { id: 'language', label: 'اللغة', type: 'select',
      options: ['العربية', 'الفرنسية', 'الإنجليزية', 'دارجة', 'أمازيغية'] },
    { id: 'requirements', label: 'متطلبات', type: 'text',
      placeholder: 'مثال: يحتاج Adobe Reader، يحتاج هاتف Android' },
    { id: 'freeUpdates', label: 'تحديثات مجانية مدى الحياة 🔄', type: 'boolean' },
  ],

  // ── 🏃 رياضة ─────────────────────────────────────────────────
  sport: [
    { id: 'sportType', label: 'نوع المنتج', type: 'select', required: true,
      options: ['تراكسي / سورفيتمو', 'تيشيرت رياضي', 'شورت', 'حذاء رياضي', 'قميص فريق', 'معدات لياقة', 'كرة', 'حقيبة رياضية', 'أخرى'] },
    { id: 'sportKind', label: 'الرياضة', type: 'select',
      options: ['كرة القدم', 'الجري', 'كمال الأجسام', 'اللياقة', 'كرة السلة', 'التنس', 'السباحة', 'عامّ'] },
    { id: 'fabric', label: 'الخامة', type: 'select',
      options: ['بوليستر', 'قطن', 'مخلوط', 'ليكرا', 'شبكي (mesh)'] },
    { id: 'audience', label: 'للفئة', type: 'select', options: ['رجال', 'نساء', 'أطفال', 'للجميع'] },
    { id: 'original', label: 'أصلي (ماركة)', type: 'boolean' },
  ],

  // ── 🚗 سيارات وقطع غيار ──────────────────────────────────────
  //    كان بائعُ قطع الغيار يقع في «أخرى» — وهي **بلا حقلٍ واحد**.
  auto: [
    { id: 'autoType', label: 'نوع المعروض', type: 'select', required: true,
      options: ['قطعة غيار', 'إطارات (بنيو)', 'زيوت وسوائل', 'بطارية', 'إكسسوارات داخلية', 'صوتيات', 'عجلات وجنوط', 'سيارة كاملة', 'دراجة نارية', 'أخرى'] },
    { id: 'partCondition', label: 'حالة القطعة', type: 'select', required: true,
      options: ['جديد', 'مستعمل — حالة ممتازة', 'مستعمل — حالة جيدة', 'مُجدَّد'] },
    { id: 'compatibleMake', label: 'يناسب الماركة', type: 'select',
      options: ['Dacia', 'Renault', 'Peugeot', 'Citroën', 'Volkswagen', 'Toyota', 'Hyundai', 'Kia', 'Ford', 'Fiat', 'Mercedes', 'BMW', 'Audi', 'Nissan', 'Skoda', 'Seat', 'Opel', 'Chevrolet', 'Suzuki', 'Honda', 'يناسب الجميع', 'أخرى'],
      hint: 'أهمُّ حقلٍ عند الزبون — بدونه يسأل قبل أن يشتري' },
    { id: 'compatibleModel', label: 'الموديل والسنة', type: 'text',
      placeholder: 'مثال: Logan 2015-2020' },
    { id: 'partNumber', label: 'مرجع القطعة (référence)', type: 'text',
      placeholder: 'مثال: 8200 123 456', hint: 'يقطع الشكّ — من يعرفه يشتري فورًا' },
    { id: 'fuelType', label: 'نوع الوقود', type: 'select',
      options: ['بنزين', 'ديزل', 'هجين', 'كهربائي', 'لا يهمّ'] },
    { id: 'warranty', label: 'الضمان', type: 'select',
      options: ['بلا ضمان', 'أسبوع', 'شهر', '3 أشهر', '6 أشهر', 'سنة'] },
    { id: 'installAvailable', label: 'التركيب متوفّر عندنا 🔧', type: 'boolean' },
    { id: 'origin', label: 'المنشأ', type: 'select',
      options: ['أصلي (OEM)', 'بديل معتمد', 'تجاري', 'مستورد'] },
  ],

  // ── 🔧 خدمات السيارات ────────────────────────────────────────
  auto_service: [
    { id: 'autoServiceType', label: 'نوع الخدمة', type: 'select', required: true,
      options: ['ميكانيك عام', 'فيدانج (تبديل الزيت)', 'ديانيوستيك إلكتروني', 'كهرباء السيارات', 'صباغة وسمكرة', 'غسل وتلميع', 'إطارات وترصيص', 'تكييف', 'ميكانيك ديزل', 'فرامل وتعليق', 'زجاج', 'ستيكاج (تغليف)', 'مساعدة على الطريق'] },
    { id: 'servicePlace', label: 'مكان الخدمة', type: 'select', required: true,
      options: ['فالميكانيسيان (يأتي الزبون)', 'متنقّل — نجي عندك', 'الاثنان'] },
    { id: 'vehicleTypes', label: 'المركبات المقبولة', type: 'multiselect',
      options: ['سيارات صغيرة', 'سيارات نفعية', 'شاحنات', 'دراجات نارية', 'سيارات فاخرة'] },
    { id: 'brandSpecialty', label: 'تخصّص بماركة', type: 'text',
      placeholder: 'مثال: متخصّص في Dacia و Renault' },
    { id: 'roadAssist', label: 'مساعدة على الطريق 🚨', type: 'boolean' },
    { id: 'partsIncluded', label: 'القطع', type: 'select',
      options: ['السعر بلا قطع', 'السعر شامل القطع', 'حسب الحالة'] },
    { id: 'warrantyWork', label: 'ضمان على العمل', type: 'select',
      options: ['بلا ضمان', 'أسبوع', 'شهر', '3 أشهر'] },
    { id: 'experience', label: 'سنوات الخبرة', type: 'number', placeholder: '10' },
  ],

  // ── 💻 إلكترونيات ومعلوميات ──────────────────────────────────
  tech: [
    { id: 'techType', label: 'نوع المنتج', type: 'select', required: true,
      options: ['هاتف', 'حاسوب محمول', 'حاسوب مكتبي', 'شاشة', 'طابعة', 'قرص/ذاكرة', 'مكوّنات (رام، كارت غرافيك…)', 'كاميرا مراقبة', 'راوتر/شبكة', 'سماعات', 'ساعة ذكية', 'لوحة رقمية', 'إكسسوارات', 'أخرى'] },
    { id: 'deviceCondition', label: 'حالة الجهاز', type: 'select', required: true,
      options: ['جديد مغلق', 'جديد مفتوح', 'مستعمل — كالجديد', 'مستعمل — جيد', 'مُجدَّد (reconditionné)', 'للقطع'] },
    { id: 'brand', label: 'الماركة', type: 'select',
      options: ['Apple', 'Samsung', 'Xiaomi', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Huawei', 'Oppo', 'Infinix', 'Tecno', 'realme', 'LG', 'Sony', 'Canon', 'Epson', 'TP-Link', 'أخرى'] },
    { id: 'model', label: 'الموديل', type: 'text', placeholder: 'مثال: iPhone 13 Pro · HP ProBook 450 G8' },
    { id: 'specs', label: 'المواصفات', type: 'text',
      placeholder: 'مثال: i5 / 8GB RAM / 256GB SSD — أو — 128GB / 6GB',
      hint: 'الزبونُ التقنيّ يقرأ هذا أوّلًا' },
    { id: 'warranty', label: 'الضمان', type: 'select',
      options: ['بلا ضمان', 'أسبوع', 'شهر', '3 أشهر', '6 أشهر', 'سنة', 'ضمان الوكيل'] },
    { id: 'boxAccessories', label: 'ما يأتي معه', type: 'multiselect',
      options: ['العلبة الأصلية', 'الشاحن', 'السماعات', 'الكابل', 'الفاتورة', 'حافظة'] },
    { id: 'batteryHealth', label: 'صحّة البطارية (للهواتف والمحمول)', type: 'text',
      placeholder: 'مثال: 92%' },
    { id: 'unlocked', label: 'غير مقفل على مشغّل (débloqué) 🔓', type: 'boolean' },
  ],

  // ── 🛠️ خدمات تقنية ──────────────────────────────────────────
  tech_service: [
    { id: 'techServiceType', label: 'نوع الخدمة', type: 'select', required: true,
      options: ['إصلاح هواتف', 'إصلاح حواسيب', 'تركيب نظام (ويندوز)', 'استرجاع بيانات', 'تركيب كاميرات مراقبة', 'شبكات وواي-فاي', 'تركيب بارابول/ريسيفر', 'تصميم مواقع', 'تطبيقات', 'تصميم جرافيك', 'دعم تقني للشركات', 'تركيب برامج'] },
    { id: 'techPlace', label: 'مكان الخدمة', type: 'select', required: true,
      options: ['فالمحلّ (يأتي الزبون)', 'متنقّل — نجي عندك', 'عن بُعد', 'الكلّ'] },
    { id: 'devicesHandled', label: 'الأجهزة المقبولة', type: 'multiselect',
      options: ['هواتف Android', 'iPhone', 'حواسيب محمولة', 'حواسيب مكتبية', 'طابعات', 'شاشات', 'خوادم', 'كاميرات'] },
    { id: 'diagnosisFree', label: 'التشخيص مجّاني 🔍', type: 'boolean' },
    { id: 'repairTime', label: 'مدّة الإصلاح المعتادة', type: 'text',
      placeholder: 'مثال: نفس اليوم · 24-48 ساعة' },
    { id: 'warrantyWork', label: 'ضمان على الإصلاح', type: 'select',
      options: ['بلا ضمان', 'أسبوع', 'شهر', '3 أشهر'] },
    { id: 'dataSafety', label: 'نضمن بياناتك 🔒', type: 'boolean',
      hint: 'أكبرُ مخاوف الزبون عند تسليم جهازه' },
    { id: 'experience', label: 'سنوات الخبرة', type: 'number', placeholder: '5' },
  ],

  // ── 📦 أخرى — حقول يدوية فقط ─────────────────────────────────
  other: [],
};

// ── دوال مساعدة ──────────────────────────────────────────────────

// الحقول المطلوبة غير المعبأة (للتنبيه قبل النشر)
export function missingRequiredCatFields(catId: string, values: Record<string, string>): string[] {
  return (CATEGORY_FIELDS[catId] || [])
    .filter(f => f.required && !(values[f.id] || '').trim())
    .map(f => f.label);
}

// تحويل قيم حقول الفئة المعبأة إلى customFields للحفظ
// (القيم الفارغة و"لا" في حقول نعم/لا لا تُحفظ)
export function buildCategoryCustomFields(catId: string, values: Record<string, string>): CustomFieldDef[] {
  return (CATEGORY_FIELDS[catId] || [])
    .filter(f => {
      const v = (values[f.id] || '').trim();
      return f.type === 'boolean' ? v === 'true' : !!v;
    })
    .map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options || [], value: (values[f.id] || '').trim() }));
}

// فصل حقول الفئة عن الحقول اليدوية عند تعديل منتج محفوظ
export function splitCustomFields(catId: string, fields: CustomFieldDef[]): { catValues: Record<string, string>; manual: CustomFieldDef[] } {
  const ids = new Set((CATEGORY_FIELDS[catId] || []).map(f => f.id));
  const catValues: Record<string, string> = {};
  const manual: CustomFieldDef[] = [];
  for (const f of fields || []) {
    if (ids.has(f.id)) catValues[f.id] = f.value;
    else manual.push(f);
  }
  return { catValues, manual };
}
