export interface SampleKitDispatch {
  id: string;
  dispatchNumber: string;
  partnerName: string;
  partnerRole: "پزشک متخصص" | "کلینیک تغذیه" | "مربی ورزشی" | "مرکز سلامت";
  location: string;
  sachetsCount: number; // تعداد ساشه‌های ۳ روزه ارسال‌شده
  dispatchDate: string;
  trackingNumber: string;
  status: "DELIVERED" | "IN_TRANSIT" | "PENDING_DISPATCH";
  distributedToPatientsCount: number;
  convertedOrdersCount: number;
}

export interface PatientSampleTrial {
  id: string;
  trialCode: string;
  patientName: string;
  patientPhone: string;
  partnerName: string;
  partnerSlug: string;
  partnerReferralCode: string;
  healthTarget: "فقر آهن و کم‌خونی" | "رفع خستگی بعدازظهر" | "پاکسازی کبد چرب" | "ریکاوری ورزشی" | "تقویت عمومی";
  sachetFormat: "کپسول فشرده سرد (۶ عددی)" | "پودر خالص (۱۵ گرمی)";
  trialGivenDate: string;
  daysPassed: number; // چند روز از دریافت گذشته (۱، ۲، ۳، یا بیشتر)
  followupStatus: "DAY_1_ACTIVE" | "DAY_2_ACTIVE" | "DAY_3_DUE" | "SMS_SENT" | "CONVERTED" | "LOST";
  smsSentAt?: string;
  convertedOrderNumber?: string;
  convertedOrderAmountToman?: number;
  notes: string;
}

export const INITIAL_SAMPLE_DISPATCHES: SampleKitDispatch[] = [
  {
    id: "disp-101",
    dispatchNumber: "SMP-1403-501",
    partnerName: "دکتر سارا رادمنش (کلینیک نورا)",
    partnerRole: "پزشک متخصص",
    location: "تهران - سعادت‌آباد",
    sachetsCount: 60,
    dispatchDate: "۱۴۰۳/۰۷/۲۰",
    trackingNumber: "POST-982144701234",
    status: "DELIVERED",
    distributedToPatientsCount: 48,
    convertedOrdersCount: 21,
  },
  {
    id: "disp-102",
    dispatchNumber: "SMP-1403-502",
    partnerName: "کاپیتان فرهاد امینی (آکادمی آریا)",
    partnerRole: "مربی ورزشی",
    location: "شیراز - معالی‌آباد",
    sachetsCount: 50,
    dispatchDate: "۱۴۰۳/۰۷/۲۵",
    trackingNumber: "POST-982144705591",
    status: "DELIVERED",
    distributedToPatientsCount: 38,
    convertedOrdersCount: 15,
  },
  {
    id: "disp-103",
    dispatchNumber: "SMP-1403-503",
    partnerName: "دکتر مریم حسینی (مرکز پارس)",
    partnerRole: "کلینیک تغذیه",
    location: "اصفهان - چهارباغ بالا",
    sachetsCount: 40,
    dispatchDate: "۱۴۰۳/۰۸/۰۱",
    trackingNumber: "POST-982144708912",
    status: "DELIVERED",
    distributedToPatientsCount: 22,
    convertedOrdersCount: 8,
  },
  {
    id: "disp-104",
    dispatchNumber: "SMP-1403-504",
    partnerName: "دکتر کیانوش مهرآرا (کلینیک ارتوپدی)",
    partnerRole: "پزشک متخصص",
    location: "مشهد - احمدآباد",
    sachetsCount: 50,
    dispatchDate: "۱۴۰۳/۰۸/۱۰",
    trackingNumber: "POST-982144709941",
    status: "IN_TRANSIT",
    distributedToPatientsCount: 0,
    convertedOrdersCount: 0,
  },
];

export const INITIAL_PATIENT_TRIALS: PatientSampleTrial[] = [
  {
    id: "trial-201",
    trialCode: "TRL-9041",
    patientName: "مهناز قادری",
    patientPhone: "09124455667",
    partnerName: "دکتر سارا رادمنش",
    partnerSlug: "dr-radmanesh",
    partnerReferralCode: "MAYA-RAD9",
    healthTarget: "فقر آهن و کم‌خونی",
    sachetFormat: "کپسول فشرده سرد (۶ عددی)",
    trialGivenDate: "۱۴۰۳/۰۸/۲۲",
    daysPassed: 3,
    followupStatus: "DAY_3_DUE",
    notes: "سابقه عدم تحمل قرص آهن شیمیایی؛ سمپل ۳ روزه برای تست راحتی معده تحویل شد.",
  },
  {
    id: "trial-202",
    trialCode: "TRL-9042",
    patientName: "امیرحسین رضایی",
    patientPhone: "09358899112",
    partnerName: "کاپیتان فرهاد امینی",
    partnerSlug: "coach-farhad",
    partnerReferralCode: "MAYA-COACH",
    healthTarget: "ریکاوری ورزشی",
    sachetFormat: "پودر خالص (۱۵ گرمی)",
    trialGivenDate: "۱۴۰۳/۰۸/۲۲",
    daysPassed: 3,
    followupStatus: "DAY_3_DUE",
    notes: "ورزشکار کراس‌فیت؛ سمپل پودر جهت شیک بعد از تمرین داده شد.",
  },
  {
    id: "trial-203",
    trialCode: "TRL-9043",
    patientName: "شیدا فرخزاد",
    patientPhone: "09193344556",
    partnerName: "دکتر مریم حسینی",
    partnerSlug: "dr-maryam-hosseini",
    partnerReferralCode: "MAYA-HOSSEINI",
    healthTarget: "پاکسازی کبد چرب",
    sachetFormat: "کپسول فشرده سرد (۶ عددی)",
    trialGivenDate: "۱۴۰۳/۰۸/۲۳",
    daysPassed: 2,
    followupStatus: "DAY_2_ACTIVE",
    notes: "آنزیم‌های کبد بالا؛ روز دوم مصرف سمپل کپسول ناشتا.",
  },
  {
    id: "trial-204",
    trialCode: "TRL-9044",
    patientName: "بهنام انصاری",
    patientPhone: "09172233445",
    partnerName: "دکتر سارا رادمنش",
    partnerSlug: "dr-radmanesh",
    partnerReferralCode: "MAYA-RAD9",
    healthTarget: "رفع خستگی بعدازظهر",
    sachetFormat: "کپسول فشرده سرد (۶ عددی)",
    trialGivenDate: "۱۴۰۳/۰۸/۱۸",
    daysPassed: 7,
    followupStatus: "CONVERTED",
    smsSentAt: "۱۴۰۳/۰۸/۲۱",
    convertedOrderNumber: "ORD-140308-5921",
    convertedOrderAmountToman: 612000,
    notes: "پیامک روز سوم ارسال شد و بیمار در همان روز دوره ۶۰ روزه طلایی را سفارش داد.",
  },
  {
    id: "trial-205",
    trialCode: "TRL-9045",
    patientName: "زهرا سلیمانی",
    patientPhone: "09301122334",
    partnerName: "دکتر مریم حسینی",
    partnerSlug: "dr-maryam-hosseini",
    partnerReferralCode: "MAYA-HOSSEINI",
    healthTarget: "فقر آهن و کم‌خونی",
    sachetFormat: "کپسول فشرده سرد (۶ عددی)",
    trialGivenDate: "۱۴۰۳/۰۸/۱۶",
    daysPassed: 9,
    followupStatus: "CONVERTED",
    smsSentAt: "۱۴۰۳/۰۸/۱۹",
    convertedOrderNumber: "ORD-140308-5810",
    convertedOrderAmountToman: 1125000,
    notes: "خرید بسته تحول ۱۲۰ روزه پس از اطمینان از عدم ایجاد سوزش معده در روزهای تست.",
  },
  {
    id: "trial-206",
    trialCode: "TRL-9046",
    patientName: "نیما شریفی",
    patientPhone: "09127788990",
    partnerName: "کاپیتان فرهاد امینی",
    partnerSlug: "coach-farhad",
    partnerReferralCode: "MAYA-COACH",
    healthTarget: "ریکاوری ورزشی",
    sachetFormat: "پودر خالص (۱۵ گرمی)",
    trialGivenDate: "۱۴۰۳/۰۸/۲۴",
    daysPassed: 1,
    followupStatus: "DAY_1_ACTIVE",
    notes: "روز اول تست پودر در تمرین هوازی.",
  },
];
