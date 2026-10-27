export interface ClinicalCaseStudy {
  id: string;
  caseNumber: string;
  patientAnonymousTitle: string; // مثال: خانم ۳۴ ساله، مهندس نرم‌افزار
  gender: "خانم" | "آقا";
  age: number;
  city: string;
  supervisingAmbassador: {
    fullName: string;
    slug: string;
    specialty: string;
    referralCode: string;
  };
  primaryComplaint: string;
  diagnosis: string;
  prescribedMayaPackage: {
    slug: string;
    name: string;
    durationDays: number;
    dosageInstructions: string;
  };
  biomarkers: {
    name: string;
    unit: string;
    baselineValue: number;
    followupValue: number;
    referenceRange: string;
    changePercent: number;
    status: "CRITICAL_IMPROVEMENT" | "NORMALIZED" | "OPTIMAL";
  }[];
  clinicalDoctorNote: string;
  patientVerbatimFeedback: string;
  complianceRatePercent: number; // درصد پایبندی بیمار به دوز
  adverseEffectsReported: string; // عوارض گوارشی گزارش شده (مثلا: "صفر - تحمل گوارشی عالی")
  status: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
  submittedAt: string;
  approvedAt?: string;
  isFeaturedOnLanding: boolean;
}

export const INITIAL_CASE_STUDIES: ClinicalCaseStudy[] = [
  {
    id: "cs-101",
    caseNumber: "CASE-1403-911",
    patientAnonymousTitle: "مراجع خانم ۳۴ ساله (معلم دبیرستان)",
    gender: "خانم",
    age: 34,
    city: "تهران",
    supervisingAmbassador: {
      fullName: "دکتر سارا رادمنش",
      slug: "dr-radmanesh",
      specialty: "متخصص پزشکی کاربردی و میکرونوترینت‌ها",
      referralCode: "MAYA-RAD9",
    },
    primaryComplaint: "کم‌خونی مزمن، عدم تحمل قرص‌های شیمیایی آهن به دلیل ورم شدید معده و خستگی شدید از ساعت ۳ بعدازظهر",
    diagnosis: "آنمی فقر آهن عودکننده (Iron Deficiency Anemia) با فریتین تک‌رقمی",
    prescribedMayaPackage: {
      slug: "maya-tablets-240",
      name: "بسته ۶۰ روزه طلایی (۲۴۰ کپسول ۵۰۰mg فشرده سرد مایا)",
      durationDays: 60,
      dosageInstructions: "روزانه ۴ کپسول (۲ کپسول صبح ناشتا با آب پرتقال تازه + ۲ کپسول عصرانه)",
    },
    biomarkers: [
      {
        name: "فریتین سرم (Ferritin)",
        unit: "ng/mL",
        baselineValue: 7.4,
        followupValue: 38.2,
        referenceRange: "۱۵ - ۱۵۰",
        changePercent: 416,
        status: "NORMALIZED",
      },
      {
        name: "هموگلوبین (Hemoglobin)",
        unit: "g/dL",
        baselineValue: 9.8,
        followupValue: 13.1,
        referenceRange: "۱۲ - ۱۵.۵",
        changePercent: 33,
        status: "OPTIMAL",
      },
      {
        name: "پروتئین واکنش‌گر التهابی (hs-CRP)",
        unit: "mg/L",
        baselineValue: 4.8,
        followupValue: 0.8,
        referenceRange: "زیر ۱.۰",
        changePercent: -83,
        status: "OPTIMAL",
      },
    ],
    clinicalDoctorNote:
      "بیمار به دلیل ریفلاکس و گاستریت شدید، درمان‌های دارویی سنتی آهن را نیمه‌کاره رها می‌کرد. با شروع پروتکل کپسول فشرده سرد مایا، ظرف ۶۰ روز نه تنها فریتین به حد نرمال رسید، بلکه هیچ‌گونه یبوست یا سوزش سردل گزارش نشد.",
    patientVerbatimFeedback:
      "بعد از ۵ سال، این اولین باری بود که آزمایش خونم از وضعیت کم‌خونی شدید قرمز خارج شد و در طول تدریس مدرسه انرژی کم نمی‌آورم.",
    complianceRatePercent: 96,
    adverseEffectsReported: "عدم مشاهده هیچ عارضه گوارشی، یبوست یا حالت تهوع",
    status: "APPROVED",
    submittedAt: "۱۴۰۳/۰۷/۱۰",
    approvedAt: "۱۴۰۳/۰۷/۱۴",
    isFeaturedOnLanding: true,
  },
  {
    id: "cs-102",
    caseNumber: "CASE-1403-884",
    patientAnonymousTitle: "مراجع آقا ۴۸ ساله (مدیر پروژه عمرانی)",
    gender: "آقا",
    age: 48,
    city: "اصفهان",
    supervisingAmbassador: {
      fullName: "دکتر مریم حسینی",
      slug: "dr-maryam-hosseini",
      specialty: "پزشک عمومی و پژوهشگر طب تلفیقی و کبد",
      referralCode: "MAYA-HOSSEINI",
    },
    primaryComplaint: "سنگینی پهلوی راست، خواب‌آلودگی بعد از ناهار و استرس شغلی بالا",
    diagnosis: "کبد چرب گرید ۲ (NAFLD) به همراه اختلال چربی خون و بالا بودن ترانس‌آمینازها",
    prescribedMayaPackage: {
      slug: "maya-combo-pack",
      name: "پکیج جامع تحول ۱۲۰ روزه (۲۴۰ کپسول + ۲۵۰ گرم پودر خالص)",
      durationDays: 120,
      dosageInstructions: "۲ کپسول صبح ناشتا + ۴ گرم پودر در ماست پروبیوتیک بعد از شام",
    },
    biomarkers: [
      {
        name: "آنزیم کبد (ALT / SGPT)",
        unit: "U/L",
        baselineValue: 74,
        followupValue: 26,
        referenceRange: "۱۰ - ۴۰",
        changePercent: -65,
        status: "NORMALIZED",
      },
      {
        name: "آنزیم کبد (AST / SGOT)",
        unit: "U/L",
        baselineValue: 58,
        followupValue: 22,
        referenceRange: "۱۰ - ۳۷",
        changePercent: -62,
        status: "OPTIMAL",
      },
      {
        name: "تری‌گلیسرید (TG)",
        unit: "mg/dL",
        baselineValue: 295,
        followupValue: 152,
        referenceRange: "زیر ۱۵۰",
        changePercent: -48,
        status: "NORMALIZED",
      },
    ],
    clinicalDoctorNote:
      "سونوگرافی کنترل کبد در ماه چهارم، پسرفت واضح تجمع چربی از گرید ۲ به گرید ۱ خفیف را نشان داد. کلروفیل فشرده و فیکوسیانین مایا پروسه فاکتورهای نکروز توموری کبد را به شکل محسوسی مهار کردند.",
    patientVerbatimFeedback:
      "حس سنگینی کبد کاملاً محو شد و در آزمایش دوره‌ای شرکت، دکتر از افت شدید آنزیم‌هایم شگفت‌زده شد.",
    complianceRatePercent: 91,
    adverseEffectsReported: "تنها در ۳ روز اول تغییر رنگ خفیف مدفوع به سبز یشمی طبیعی به دلیل کلروفیل بالا مشاهده شد.",
    status: "APPROVED",
    submittedAt: "۱۴۰۳/۰۶/۲۵",
    approvedAt: "۱۴۰۳/۰۶/۲۸",
    isFeaturedOnLanding: true,
  },
  {
    id: "cs-103",
    caseNumber: "CASE-1403-852",
    patientAnonymousTitle: "ورزشکار حرفه‌ای ۲۹ ساله (دونده نیمه‌ماراتن)",
    gender: "آقا",
    age: 29,
    city: "شیراز",
    supervisingAmbassador: {
      fullName: "کاپیتان فرهاد امینی",
      slug: "coach-farhad",
      specialty: "فیزیولوژیست ورزشی و سرمربی استقامتی",
      referralCode: "MAYA-COACH",
    },
    primaryComplaint: "کوفتگی عضلانی طولانی پس از تمرین، تاخیر در بازتوانی و افت سطح آهن ناشی از ضربه پا (Footstrike Hemolysis)",
    diagnosis: "استرس اکسیداتیو بالای ناشی از تمرین استقامتی سنگین و بالا بودن کراتین کیناز",
    prescribedMayaPackage: {
      slug: "maya-powder-250",
      name: "پودر خالص میکرونیزه ۲۵۰ گرمی مایا (دوره ۶۰ روزه ورزشی)",
      durationDays: 60,
      dosageInstructions: "۵ گرم در ۳۰۰ میلی‌لیتر آب سرد بلافاصله پس از اتمام تمرین سنگین",
    },
    biomarkers: [
      {
        name: "کراتین کیناز (CK - آسیب عضلانی)",
        unit: "U/L",
        baselineValue: 590,
        followupValue: 185,
        referenceRange: "۳۸ - ۱۷۴",
        changePercent: -68,
        status: "OPTIMAL",
      },
      {
        name: "هموگلوبین (Hb)",
        unit: "g/dL",
        baselineValue: 12.8,
        followupValue: 15.2,
        referenceRange: "۱۳.۵ - ۱۷.۵",
        changePercent: 18,
        status: "OPTIMAL",
      },
    ],
    clinicalDoctorNote:
      "استفاده هدفمند از فیکوسیانین خالص مایا به عنوان بازدارنده انتخابی COX-2، فرآیند ریکاوری گلیکوژن و بازسازی فیبرهای تخریب‌شده را ۲۴ تا ۳۶ ساعت تسریع نمود.",
    patientVerbatimFeedback:
      "دردهای تاخیری عضلاتم که قبلاً تا ۳ روز ادامه داشت، ظرف ۱ روز محو می‌شود و در تمرینات هفتگی رکوردم ۳ دقیقه بهبود یافت.",
    complianceRatePercent: 98,
    adverseEffectsReported: "فاقد عارضه - بهبود محسوس گوارش و جذب مواد غذایی",
    status: "APPROVED",
    submittedAt: "۱۴۰3/۰۷/۰۱",
    approvedAt: "۱۴۰۳/۰۷/۰۳",
    isFeaturedOnLanding: false,
  },
  {
    id: "cs-104",
    caseNumber: "CASE-1403-790",
    patientAnonymousTitle: "مراجع خانم ۴۱ ساله (کارمند اداری)",
    gender: "خانم",
    age: 41,
    city: "مشهد",
    supervisingAmbassador: {
      fullName: "دکتر سارا رادمنش",
      slug: "dr-radmanesh",
      specialty: "متخصص پزشکی کاربردی و میکرونوترینت‌ها",
      referralCode: "MAYA-RAD9",
    },
    primaryComplaint: "ریزش موی شدید پس از استرس کاری، خستگی صبحگاهی و ناخن‌های شکننده",
    diagnosis: "کاهش همزمان زینک، آهن کلاته و اسیدهای آمینه گوگرددار مو",
    prescribedMayaPackage: {
      slug: "maya-tablets-120",
      name: "اسپیرولینا مایا - بسته ۳۰ روزه آغازین (کپسول ۵۰۰mg)",
      durationDays: 30,
      dosageInstructions: "۲ کپسول صبح با آب ولرم",
    },
    biomarkers: [
      {
        name: "فریتین سرم (Ferritin)",
        unit: "ng/mL",
        baselineValue: 11.2,
        followupValue: 29.4,
        referenceRange: "۱۵ - ۱۵۰",
        changePercent: 162,
        status: "NORMALIZED",
      },
    ],
    clinicalDoctorNote:
      "پرونده جدید در حال تکمیل آزمایشات دوره دوم (۶۰ روزه). آزمایش ماه اول حاکی از روند صعودی فریتین و توقف ریزش موی فعال است.",
    patientVerbatimFeedback: "استحکام ناخن‌هایم بعد از ۲ هفته به شکل معجزه‌آسایی بهتر شد.",
    complianceRatePercent: 88,
    adverseEffectsReported: "فاقد عارضه",
    status: "PENDING_REVIEW",
    submittedAt: "۱۴۰۳/۰۸/۰۲",
    isFeaturedOnLanding: false,
  },
];

export function getApprovedCaseStudies(): ClinicalCaseStudy[] {
  return INITIAL_CASE_STUDIES.filter((cs) => cs.status === "APPROVED");
}

export function getCaseStudiesByAmbassadorSlug(slug: string): ClinicalCaseStudy[] {
  return INITIAL_CASE_STUDIES.filter(
    (cs) => cs.supervisingAmbassador.slug === slug && cs.status === "APPROVED"
  );
}
