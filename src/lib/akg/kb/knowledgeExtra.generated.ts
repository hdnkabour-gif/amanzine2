// مولَّدٌ آليًّا من data/concepts.csv — لا تحرّره يدويًّا.
// أعِد التوليد: node scripts/import-knowledge.mjs data/concepts.csv --write
import type { ConceptData } from './knowledgeData';

export const IMPORTED_CONCEPTS: ConceptData[] = [
  {
    "id": "baby_clothing",
    "category": "ملابس",
    "concept": {
      "ar": "ملابس رضّع",
      "darija": "حوايج البيبي",
      "fr": "Vêtements bébé",
      "en": "Baby clothing"
    },
    "variants": {
      "ar": [
        "ملابس رضع",
        "ملابس مواليد",
        "لباس بيبي"
      ],
      "darija": [
        "حوايج البيبي",
        "حوايج للبيبي",
        "كسوة البيبي",
        "حوايج المولود",
        "حوايج ديال البيبي"
      ],
      "fr": [
        "vetements bebe",
        "layette"
      ],
      "en": [
        "baby clothes",
        "babywear"
      ],
      "arabizi": [
        "hwayj baby",
        "kswa baby"
      ]
    },
    "stance": {
      "offer": [
        "عندي محل حوايج البيبي",
        "كنبيع ملابس رضّع"
      ],
      "seek": [
        "بغيت حوايج للبيبي",
        "خاصني ملابس مواليد"
      ]
    },
    "asks": {
      "offer": [
        "شنو الأعمار اللي عندك؟",
        "واش عندك توصيل؟"
      ],
      "seek": [
        "شحال عمر البيبي؟",
        "واش بغيتي قطن؟"
      ]
    },
    "links": {
      "related": [
        "kids_clothing"
      ],
      "sells": [
        "بدلة بيبي",
        "بيجامة بيبي"
      ]
    },
    "services": [
      "بيع ملابس رضّع"
    ],
    "examples": [
      "بغيت حوايج للمولود"
    ]
  },
  {
    "id": "fashion_accessories",
    "category": "ملابس",
    "concept": {
      "ar": "إكسسوارات الموضة",
      "darija": "أكسسوارات",
      "fr": "Accessoires mode",
      "en": "Fashion accessories"
    },
    "variants": {
      "ar": [
        "إكسسوارات",
        "حقيبة",
        "حقائب يد",
        "أحزمة جلدية"
      ],
      "darija": [
        "أكسسوارات",
        "حقايب",
        "حقيبة يد",
        "حزايم"
      ],
      "fr": [
        "accessoires",
        "sacs a main",
        "ceintures"
      ],
      "en": [
        "handbags",
        "belts",
        "accessories"
      ],
      "arabizi": [
        "aksesswar",
        "hqayb",
        "hzayem"
      ]
    },
    "stance": {
      "offer": [
        "عندي محل إكسسوارات",
        "كنبيع حقايب"
      ],
      "seek": [
        "بغيت حقيبة",
        "كنقلب على إكسسوارات"
      ]
    },
    "asks": {
      "offer": [
        "شنو نوع الإكسسوارات؟",
        "واش عندك ماركات؟"
      ],
      "seek": [
        "شنو بغيتي بالضبط؟",
        "شحال الميزانية؟"
      ]
    },
    "links": {
      "related": [
        "womens_clothing",
        "mens_clothing"
      ],
      "sells": [
        "حقيبة",
        "حزام",
        "نظارة شمسية"
      ]
    },
    "services": [
      "بيع إكسسوارات"
    ],
    "examples": [
      "بغيت حقيبة جلدية"
    ]
  },
  {
    "id": "traditional_clothing",
    "category": "ملابس",
    "concept": {
      "ar": "لباس تقليديّ مغربيّ",
      "darija": "لباس تقليدي",
      "fr": "Vêtements traditionnels",
      "en": "Traditional Moroccan wear"
    },
    "variants": {
      "ar": [
        "قفطان",
        "جلابة",
        "تكشيطة",
        "جابادور"
      ],
      "darija": [
        "قفطان",
        "جلابة",
        "تكشيطة",
        "جابادور",
        "سلهام"
      ],
      "fr": [
        "caftan",
        "djellaba",
        "takchita"
      ],
      "en": [
        "kaftan",
        "djellaba",
        "takchita"
      ],
      "arabizi": [
        "qftan",
        "jlaba",
        "tkchita",
        "jabador"
      ]
    },
    "stance": {
      "offer": [
        "عندي محل قفطان",
        "كنبيع جلابة",
        "كنخيط تكشيطة"
      ],
      "seek": [
        "بغيت قفطان",
        "خاصني جلابة",
        "كنقلب على تكشيطة"
      ]
    },
    "asks": {
      "offer": [
        "واش كتخيط بالمقاس؟",
        "شحال كتاخد؟"
      ],
      "seek": [
        "واش للعرس ولا عادي؟",
        "شنو المقاس؟"
      ]
    },
    "links": {
      "related": [
        "womens_clothing"
      ],
      "needs": [
        "tailor"
      ],
      "sells": [
        "قفطان",
        "جلابة",
        "تكشيطة"
      ]
    },
    "services": [
      "بيع لباس تقليديّ",
      "خياطة بالمقاس"
    ],
    "examples": [
      "بغيت قفطان للعرس"
    ]
  },
  {
    "id": "car_wrapping",
    "category": "سيارات",
    "concept": {
      "ar": "تغليف السيّارات",
      "darija": "تغليف الطوموبيل",
      "fr": "Covering automobile",
      "en": "Car wrapping"
    },
    "variants": {
      "ar": [
        "تغليف السيارات",
        "فينيل",
        "كوفرينغ"
      ],
      "darija": [
        "تغليف الطوموبيل",
        "كوفرينغ",
        "فينيل",
        "كوير",
        "بالكوير",
        "نغلف الطوموبيل",
        "نغلف طوموبيلي",
        "تغليف طوموبيل",
        "غلاف الطوموبيل"
      ],
      "fr": [
        "covering",
        "wrapping",
        "film vinyle"
      ],
      "en": [
        "car wrap",
        "vinyl wrap",
        "ppf"
      ],
      "arabizi": [
        "covering",
        "wrapping",
        "vinyl",
        "kwir"
      ]
    },
    "stance": {
      "offer": [
        "كندير تغليف الطوموبيلات",
        "عندي محل كوفرينغ"
      ],
      "seek": [
        "بغيت نغلف الطوموبيل",
        "كنقلب على كوفرينغ"
      ]
    },
    "asks": {
      "offer": [
        "شنو نوع الفينيل؟",
        "شحال كتاخد الخدمة؟"
      ],
      "seek": [
        "شنو نوع الطوموبيل؟",
        "بغيتي لون ولا حماية؟"
      ]
    },
    "links": {
      "related": [
        "car_polishing",
        "auto_body_paint"
      ],
      "sells": [
        "فينيل",
        "فيلم حماية"
      ]
    },
    "services": [
      "تغليف كامل",
      "تغليف جزئيّ",
      "فيلم حماية"
    ],
    "examples": [
      "بغيت نغلف طوموبيلي بالكوير"
    ]
  },
  {
    "id": "computer_hardware_store",
    "category": "معلوميات",
    "concept": {
      "ar": "بيع معدّات المعلوميات",
      "darija": "بيع معدات الإنفورماتيك",
      "fr": "Matériel informatique",
      "en": "Computer hardware store"
    },
    "variants": {
      "ar": [
        "بيع حواسيب",
        "معدات معلوماتية",
        "قطع غيار حواسيب"
      ],
      "darija": [
        "معدات الإنفورماتيك",
        "بيع بيسي",
        "قطع الحاسوب",
        "نشري حاسوب",
        "شراء حاسوب",
        "نشري لابتوب"
      ],
      "fr": [
        "materiel informatique",
        "vente pc"
      ],
      "en": [
        "computer hardware",
        "pc parts"
      ],
      "arabizi": [
        "matiryel informatik",
        "byi3 pc"
      ]
    },
    "stance": {
      "offer": [
        "عندي محل معدات معلوميات",
        "كنبيع حواسيب"
      ],
      "seek": [
        "بغيت نشري حاسوب",
        "خاصني قطعة للبيسي"
      ]
    },
    "asks": {
      "offer": [
        "شنو كتبيع؟",
        "واش عندك ضمان؟"
      ],
      "seek": [
        "بغيتي جديد ولا مستعمل؟",
        "شحال الميزانية؟"
      ]
    },
    "links": {
      "related": [
        "computer_repair",
        "it_support"
      ],
      "sells": [
        "حاسوب",
        "شاشة",
        "لوحة مفاتيح"
      ]
    },
    "services": [
      "بيع حواسيب",
      "بيع قطع غيار"
    ],
    "examples": [
      "بغيت نشري لابتوب"
    ]
  },
  {
    "id": "printer_repair",
    "category": "معلوميات",
    "concept": {
      "ar": "إصلاح الطابعات",
      "darija": "تصليح الإمبريمانت",
      "fr": "Réparation imprimante",
      "en": "Printer repair"
    },
    "variants": {
      "ar": [
        "إصلاح طابعة",
        "صيانة طابعات",
        "تعبئة حبر"
      ],
      "darija": [
        "تصليح الإمبريمانت",
        "الطابعة خربانة",
        "تعمير الحبر"
      ],
      "fr": [
        "reparation imprimante",
        "toner"
      ],
      "en": [
        "printer repair",
        "toner refill"
      ],
      "arabizi": [
        "imprimante",
        "tonir"
      ]
    },
    "stance": {
      "offer": [
        "كنصلح الطابعات",
        "عندي محل تصليح إمبريمانت"
      ],
      "seek": [
        "الطابعة ديالي خربانة",
        "بغيت نصلح الإمبريمانت"
      ]
    },
    "asks": {
      "offer": [
        "شنو الماركات اللي كتصلح؟",
        "واش كتخرج للمحلّ؟"
      ],
      "seek": [
        "شنو الماركة؟",
        "واش كتطبع ولا ما كتشعلش؟"
      ]
    },
    "links": {
      "related": [
        "computer_repair",
        "it_support"
      ],
      "sells": [
        "حبر",
        "طبنة"
      ]
    },
    "services": [
      "إصلاح طابعات",
      "تعبئة حبر"
    ],
    "examples": [
      "الطابعة ما بقاتش كتطبع"
    ]
  },
  {
    "id": "data_recovery",
    "category": "معلوميات",
    "concept": {
      "ar": "استرجاع البيانات",
      "darija": "استرجاع الداتا",
      "fr": "Récupération de données",
      "en": "Data recovery"
    },
    "variants": {
      "ar": [
        "استرجاع بيانات",
        "استرجاع ملفات",
        "قرص صلب تالف"
      ],
      "darija": [
        "استرجاع الداتا",
        "الديسك خربان",
        "طارو ليا الفيشيات"
      ],
      "fr": [
        "recuperation de donnees",
        "recuperation fichiers"
      ],
      "en": [
        "data recovery",
        "file recovery"
      ],
      "arabizi": [
        "recuperation",
        "data recovery",
        "disk"
      ]
    },
    "stance": {
      "offer": [
        "كندير استرجاع البيانات",
        "عندي مختبر استرجاع داتا"
      ],
      "seek": [
        "طارو ليا الملفات",
        "بغيت نسترجع الداتا"
      ]
    },
    "asks": {
      "offer": [
        "شنو نسبة النجاح عندك؟",
        "شحال كتاخد؟"
      ],
      "seek": [
        "شنو وقع للقرص؟",
        "واش كيتقرا أصلًا؟"
      ]
    },
    "links": {
      "related": [
        "computer_repair",
        "it_support"
      ]
    },
    "services": [
      "استرجاع بيانات",
      "إصلاح أقراص"
    ],
    "examples": [
      "طارت ليا الفيشيات من الديسك"
    ]
  }
];
