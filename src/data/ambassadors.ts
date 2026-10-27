export interface AmbassadorPrescription {
  packageSlug: string;
  packageSku: string;
  packageName: string;
  packagePrice: number;
  discountedPrice: number;
  discountPercent: number;
  dailyDosage: string;
  consumptionTiming: string;
  synergyTip: string;
  targetConditions: string[];
  expectedTimelineDays: number;
  saturationGoal: string;
}

export interface AmbassadorItem {
  slug: string;
  referralCode: string;
  fullName: string;
  prefix: string;
  specialty: string;
  medicalLicenseNo?: string;
  institution: string;
  city: string;
  badge: "عضو بورد علمی" | "سفیر سطح الماس" | "پزشک ناظر بالینی" | "فیزیولوژیست ارشد";
  avatarColor: string;
  avatarInitial: string;
  heroQuote: string;
  personalStory: {
    headline: string;
    discoveryContext: string;
    beforeCondition: string;
    afterTransformation: string;
    whyMaya: string;
    scientificView: string;
  };
  selfBiomarkerImprovement: {
    marker: string;
    beforeValue: string;
    afterValue: string;
    unit: string;
    durationDays: number;
  }[];
  prescribedProtocol: AmbassadorPrescription;
  metrics: {
    activePatientsCount: number;
    documentedCasesCount: number;
    patientSatisfactionRate: number;
    yearsOfExperience: number;
  };
}

export const AMBASSADORS_DATA: AmbassadorItem[] = [
  {
    slug: "dr-radmanesh",
    referralCode: "MAYA-RAD9",
    fullName: "دکتر سارا رادمنش",
    prefix: "دکتر",
    specialty: "متخصص پزشکی کاربردی و میکرونوترینت‌های بالینی",
    medicalLicenseNo: "ن-۹۸۴۱۵",
    institution: "کلینیک تخصصی متابولیسم و تندرستی نورا",
    city: "تهران",
    badge: "عضو بورد علمی",
    avatarColor: "bg-emerald-600",
    avatarInitial: "س",
    heroQuote:
      "اسپیرولینای مایا تنها مکملی بود که توانست ذخایر فریتین مراجعینم را بدون کوچک‌ترین عارضه گوارشی و یبوست، ظرف ۶۰ روز به محدوده طلایی بازگرداند.",
    personalStory: {
      headline: "تجربه شخصی من: از خستگی مزمن سلولی تا تحول زیستی",
      discoveryContext:
        "در سال‌های نخست طبابت به دلیل شیفت‌های سنگین بیمارستانی، دچار فقر آهن پنهان و افت شدید انرژی روزانه بودم. مکمل‌های شیمیایی معمول آهن به دلیل ایجاد التهاب معده برایم غیرقابل‌تحمل بودند.",
      beforeCondition:
        "فریتین خون زیر ۹ ng/mL، خستگی مداوم از ساعت ۳ عصر به بعد، شکنندگی ناخن‌ها و مه مغزی ناشی از هیپوکسی خفیف سلولی.",
      afterTransformation:
        "پس از ۶۰ روز مصرف مداوم کپسول‌های فشرده سرد مایا، فریتین به ۴۲ رسید؛ سطح هوشیاری ذهنی تثبیت شد و توان فیزیکی من به شکل چشمگیری افزایش یافت.",
      whyMaya:
        "کشت ایزوله در فتوبیوراکتور و حذف فلزات سنگین، فشرده‌سازی سرد بدون دمای مخرب، و غلظت اثبات‌شده بالای ۲۲٪ فیکوسیانین خالص.",
      scientificView:
        "ترکیب فیکوسیانین و آهن زیستی کلات‌شده با پروتئین‌های اسپیرولینا، جذب روده را تا ۴ برابر نسبت به سولفات آهن سنتی افزایش می‌دهد بدون آنکه به مخاط روده آسیب بزند.",
    },
    selfBiomarkerImprovement: [
      { marker: "فریتین سرم (Ferritin)", beforeValue: "۸.۵", afterValue: "۴۲.۰", unit: "ng/mL", durationDays: 60 },
      { marker: "هموگلوبین (Hb)", beforeValue: "۱۰.۸", afterValue: "۱۳.۶", unit: "g/dL", durationDays: 60 },
      { marker: "پروتئین التهابی (hs-CRP)", beforeValue: "۳.۲", afterValue: "۰.۷", unit: "mg/L", durationDays: 60 },
    ],
    prescribedProtocol: {
      packageSlug: "maya-tablets-240",
      packageSku: "MAYA-TAB-240",
      packageName: "بسته ۶۰ روزه طلایی (۲۴۰ کپسول ۵۰۰mg فشرده سرد)",
      packagePrice: 680000,
      discountedPrice: 612000,
      discountPercent: 10,
      dailyDosage: "۴ کپسول در روز (۲ کپسول صبح ناشتا + ۲ کپسول ساعت ۵ عصر)",
      consumptionTiming: "صبح ناشتا ۲۰ دقیقه قبل از صبحانه با یک لیوان آب ولرم و لیموترش تازه",
      synergyTip: "هم‌افزایی با ویتامین C طبیعی باعث حداکثرسازی جذب روده آهن آلی می‌شود.",
      targetConditions: ["فقر آهن و فریتین پایین", "خستگی مزمن بعدازظهر", "ریزش موی ناشی از کمبود ریزمغذی"],
      expectedTimelineDays: 60,
      saturationGoal: "اشباع کامل مخازن آهن سلولی و رفع التهاب میکروسکوپی",
    },
    metrics: {
      activePatientsCount: 142,
      documentedCasesCount: 48,
      patientSatisfactionRate: 98,
      yearsOfExperience: 14,
    },
  },
  {
    slug: "coach-farhad",
    referralCode: "MAYA-COACH",
    fullName: "کاپیتان فرهاد امینی",
    prefix: "استاد",
    specialty: "فیزیولوژیست ورزشی و سرمربی تیم‌های استقامتی",
    institution: "آکادمی تخصصی های‌پرفورمنس و بیوهکینگ ورزشی آریا",
    city: "شیراز",
    badge: "فیزیولوژیست ارشد",
    avatarColor: "bg-sky-600",
    avatarInitial: "ف",
    heroQuote:
      "برای ورزشکاران حرفه‌ای، ریکاوری سریع و کاهش اسید لاکتیک بدون استروئیدها و مواد ممنوعه دوپینگ یک ضرورت است؛ مایا این کار را با فیکوسیانین طبیعی انجام می‌دهد.",
    personalStory: {
      headline: "چگونه مایا زمان بازگشت به تمرین سنگین را نصف کرد",
      discoveryContext:
        "در آماده‌سازی تیم ماراتن و ورزشکاران کراس‌فیت، درد عضلانی تاخیری (DOMS) و استرس اکسیداتیو ریه‌ها بزرگ‌ترین مانع افزایش حجم تمرینی بود.",
      beforeCondition:
        "افزایش شدید آنزیم کراتین کیناز (CK) پس از مسابقات و افت شاخص VO2 Max به دلیل التهاب سیستم تنفسی.",
      afterTransformation:
        "با وارد کردن پودر میکرونیزه مایا به شیک پروتئین پس از تمرین، ریکاوری ضربان قلب ۲۴ ساعت سریع‌تر شد و ورزشکاران توانستند بدون آسیب، ۴ جلسه تمرین سخت در هفته داشته باشند.",
      whyMaya:
        "پودر ۱۰۰٪ حل‌شونده بدون ته‌نشینی ناخالص، پروفایل کامل ۹ اسید آمینه ضروری، و بالاترین خاصیت بافرینگ لاکتیک اسید.",
      scientificView:
        "فیکوسیانین آنزیم COX-2 را مهار می‌کند، دقیقاً مشابه داروهای ضدالتهاب غیرکورتونی اما بدون آسیب به کبد و کلیه.",
    },
    selfBiomarkerImprovement: [
      { marker: "کراتین کیناز عضلانی (CK)", beforeValue: "۶۸۰", afterValue: "۲۱۰", unit: "U/L", durationDays: 30 },
      { marker: "ظرفیت آنتی‌اکسیدانی (TAC)", beforeValue: "۱.۱", afterValue: "۲.۸", unit: "mmol/L", durationDays: 30 },
    ],
    prescribedProtocol: {
      packageSlug: "maya-powder-250",
      packageSku: "MAYA-POW-250",
      packageName: "پودر خالص میکرونیزه ۲۵۰ گرمی مایا (دوره ۶۰ روزه ورزشی)",
      packagePrice: 680000,
      discountedPrice: 612000,
      discountPercent: 10,
      dailyDosage: "۵ گرم (معادل یک اسکوپ سرپر) بلافاصله پس از تمرین ورزشی",
      consumptionTiming: "مخلوط در ۳۰۰ میلی‌لیتر آب سرد، آب پرتقال یا شیک وی پروتئین",
      synergyTip: "ترکیب با کربوهیدرات ساده زمان جذب آمینواسیدها را تا ۴۰٪ تسریع می‌کند.",
      targetConditions: ["کوفتگی و التهاب عضلانی", "افزایش استقامت ریوی", "ریکاوری فوق‌سریع ورزشکاران"],
      expectedTimelineDays: 60,
      saturationGoal: "کاهش ۳۵ درصدی مارکرهای تخریب بافت عضلانی",
    },
    metrics: {
      activePatientsCount: 210,
      documentedCasesCount: 64,
      patientSatisfactionRate: 96,
      yearsOfExperience: 18,
    },
  },
  {
    slug: "dr-maryam-hosseini",
    referralCode: "MAYA-HOSSEINI",
    fullName: "دکتر مریم حسینی",
    prefix: "دکتر",
    specialty: "پزشک عمومی و پژوهشگر ارشد طب تلفیقی و کبد چرب",
    medicalLicenseNo: "ن-۷۴۹۲۰",
    institution: "مرکز خدمات سلامت و سم‌زدایی زیستی پارس",
    city: "اصفهان",
    badge: "پزشک ناظر بالینی",
    avatarColor: "bg-teal-600",
    avatarInitial: "م",
    heroQuote:
      "در درمان مراجعین کبد چرب گرید ۱ و ۲، کلروفیل زیستی و اسید گامالینولنیک (GLA) موجود در مایا اسپیرولینا مکمل پایه پروتکل بالینی من است.",
    personalStory: {
      headline: "پاکسازی آنزیم‌های کبد و غلبه بر سندرم متابولیک مدرن",
      discoveryContext:
        "بیش از ۷۰٪ مراجعین شهری با آنزیم‌های بالای ALT و کبد چرب خاموش مراجعه می‌کنند. تغییر رژیم غذایی به تنهایی برای سم‌زدایی سریع بافت هپاتوسیت‌ها کند پیش می‌رود.",
      beforeCondition:
        "بیماران با تری‌گلیسرید بالای ۲۸۰، آنزیم کبد ALT بالای ۶۵، و احساس سنگینی دائمی در سمت راست شکم پس از غذا.",
      afterTransformation:
        "اضافه شدن پکیج جامع تحول مایا منجر به کاهش میانگین ۴۰ واحدی آنزیم‌های کبد و نرمال شدن سونوگرافی در ۸۴٪ مراجعین شد.",
      whyMaya:
        "تراکم بالای کلروفیل طبیعی که چنگال‌زننده قوی سموم محلول در چربی کبد است و مهار رادیکال‌های آزاد هپاتیک.",
      scientificView:
        "اسید چرب GLA موجود در اسپیرولینا پیش‌ساز پروستاگلاندین‌های سری ۱ بوده و مانع از تجمع قطرات تری‌گلیسرید در هپاتوسیت‌های کبد می‌شود.",
    },
    selfBiomarkerImprovement: [
      { marker: "آنزیم کبد (ALT)", beforeValue: "۶۸", afterValue: "۲۸", unit: "U/L", durationDays: 90 },
      { marker: "تری‌گلیسرید (TG)", beforeValue: "۲۷۰", afterValue: "۱۴۵", unit: "mg/dL", durationDays: 90 },
    ],
    prescribedProtocol: {
      packageSlug: "maya-combo-pack",
      packageSku: "MAYA-COM-120",
      packageName: "پکیج جامع تحول ۱۲۰ روزه (۲۴۰ کپسول + ۲۵۰ گرم پودر خالص)",
      packagePrice: 1250000,
      discountedPrice: 1125000,
      discountPercent: 10,
      dailyDosage: "۲ کپسول صبح ناشتا + ۳ گرم پودر حل‌شده در ماست کم‌چرب عصرانه",
      consumptionTiming: "صبح‌ها قبل از غذا و عصرها ساعت ۶ به عنوان میان‌وعده پاکسازی",
      synergyTip: "پرهیز از مصرف روغن‌های ترانس و قندهای صنعتی در طول دوره جهت تسریع سم‌زدایی",
      targetConditions: ["کبد چرب غیرالکلی گرید ۱ و ۲", "تری‌گلیسرید و کلسترول بالا", "خستگی مزمن متابولیک"],
      expectedTimelineDays: 120,
      saturationGoal: "کاهش انباشت چربی در پارانشیم کبد و تثبیت آنزیم‌ها",
    },
    metrics: {
      activePatientsCount: 185,
      documentedCasesCount: 52,
      patientSatisfactionRate: 97,
      yearsOfExperience: 16,
    },
  },
];

export function getAmbassadorBySlug(slug: string): AmbassadorItem | undefined {
  const cleanSlug = slug.toLowerCase().trim();
  return AMBASSADORS_DATA.find((a) => a.slug === cleanSlug || a.referralCode.toLowerCase() === cleanSlug);
}

export function getAllAmbassadors(): AmbassadorItem[] {
  return AMBASSADORS_DATA;
}
