export interface BiomarkerDefinition {
  id: string;
  nameFa: string;
  nameEn: string;
  category: "hematology" | "liver" | "lipid" | "inflammation" | "vitality";
  categoryFa: string;
  unit: string;
  normalMin: number;
  normalMax: number;
  defaultValue: number;
  step: number;
  description: string;
  spirulinaMechanism: string;
  pubmedRef: string;
  expectedImprovement: string;
}

export const BIOMARKERS_LIST: BiomarkerDefinition[] = [
  {
    id: "ferritin",
    nameFa: "فریتین سرم (ذخایر آهن بدن)",
    nameEn: "Serum Ferritin",
    category: "hematology",
    categoryFa: "هماتولوژی و خونسازی",
    unit: "ng/mL",
    normalMin: 30,
    normalMax: 200,
    defaultValue: 18,
    step: 1,
    description: "شاخص اصلی ذخایر آهن در کبد و مغز استخوان. مقادیر زیر ۳۰ نشان‌دهنده فقر آهن پنهان، ریزش مو و خستگی مزمن است.",
    spirulinaMechanism: "آهن ارگانیک کلاته‌شده در پروتئین‌های اسپیرولینا بدون ایجاد یبوست و با زیست‌فراهمی ۳ برابر سولفات فروس جذب می‌شود.",
    pubmedRef: "PMID: 21278762 (Cell Mol Immunol)",
    expectedImprovement: "افزایش ۱۸ تا ۳۰ نانوگرم بر میلی‌لیتر در دوره ۶۰ روزه",
  },
  {
    id: "hemoglobin",
    nameFa: "هموگلوبین خون (Hb)",
    nameEn: "Hemoglobin",
    category: "hematology",
    categoryFa: "هماتولوژی و خونسازی",
    unit: "g/dL",
    normalMin: 12.5,
    normalMax: 16.5,
    defaultValue: 11.2,
    step: 0.1,
    description: "پروتئین ناقل اکسیژن در گلبول‌های قرمز. افت آن منجر به تنگی نفس، خستگی و سرگیجه می‌شود.",
    spirulinaMechanism: "کلروفیل متراکم مایا ساختاری شبه‌پورفیرینی داشته و همراه با اسید فولیک، سرعت بیوسنتز هموگلوبین را بالا می‌برد.",
    pubmedRef: "PMID: 9839840 (Plant Foods Hum Nutr)",
    expectedImprovement: "افزایش ۱.۲ تا ۱.۸ واحدی ظرف ۶۰ تا ۹۰ روز",
  },
  {
    id: "alt",
    nameFa: "آنزیم کبدی ALT (SGPT)",
    nameEn: "Alanine Aminotransferase",
    category: "liver",
    categoryFa: "کبد و سم‌زدایی",
    unit: "U/L",
    normalMin: 7,
    normalMax: 35,
    defaultValue: 48,
    step: 1,
    description: "حساس‌ترین نشانگر التهاب هپاتوسیت‌های کبد ناشی از کبد چرب گرید ۱ یا ۲، داروها یا استرس اکسیداتیو.",
    spirulinaMechanism: "فیکوسیانین خالص با تحریک ترانس‌کریپشن Nrf2 و سنتز گلوتاتیون، التهاب و آسیب سلول‌های کبدی را فرو می‌نشاند.",
    pubmedRef: "PMID: 24716167 (Ann Gastroenterol)",
    expectedImprovement: "افت ۳۰ تا ۴۰ درصدی آنزیم ALT در آزمایش مجدد ۳ ماهه",
  },
  {
    id: "ast",
    nameFa: "آنزیم کبدی AST (SGOT)",
    nameEn: "Aspartate Aminotransferase",
    category: "liver",
    categoryFa: "کبد و سم‌زدایی",
    unit: "U/L",
    normalMin: 10,
    normalMax: 40,
    defaultValue: 45,
    step: 1,
    description: "آنزیم سلولی کبد و بافت‌های متابولیک که در زمان آسیب حاد یا کبد چرب وارد جریان گردش خون می‌شود.",
    spirulinaMechanism: "ترکیبات پلی‌فنولی و فیکوسیانین از پراکسیداسیون چربی‌های غشای کبد ممانعت به عمل می‌آورند.",
    pubmedRef: "PMID: 24716167 (Ann Gastroenterol)",
    expectedImprovement: "کاهش ۲۵ تا ۳۵ درصدی به محدوده ایمن آزمایشگاهی",
  },
  {
    id: "triglycerides",
    nameFa: "تری‌گلیسرید سرم (TG)",
    nameEn: "Serum Triglycerides",
    category: "lipid",
    categoryFa: "چربی و متابولیسم",
    unit: "mg/dL",
    normalMin: 50,
    normalMax: 150,
    defaultValue: 210,
    step: 5,
    description: "چربی‌های آزاد در خون که خطر کبد چرب، بیماری‌های عروقی و سندرم متابولیک را به شدت تشدید می‌کنند.",
    spirulinaMechanism: "اسید چرب گاما لینولنیک (GLA) موجود در مایا سبب فعال‌سازی لیپوپروتئین لیپاز و کاتابولیسم اسیدهای چرب آزاد می‌گردد.",
    pubmedRef: "PMID: 18714150 (Lipids Health Dis)",
    expectedImprovement: "کاهش ۲۴ تا ۳۳ درصدی سطح تری‌گلیسرید در ۱۲ هفته",
  },
  {
    id: "crp",
    nameFa: "پروتئین التهابی (hs-CRP)",
    nameEn: "High-Sensitivity CRP",
    category: "inflammation",
    categoryFa: "التهاب سیستمیک و ایمنی",
    unit: "mg/L",
    normalMin: 0.1,
    normalMax: 1.0,
    defaultValue: 2.8,
    step: 0.1,
    description: "حساس‌ترین نشانگر بار التهاب سیستمیک در عروق خونی، بافت‌های مفصلی و سندرم‌های خستگی مزمن.",
    spirulinaMechanism: "مهار هدفمند مسیر NF-kB و بلوکه کردن ترشح سایتوکاین‌های پیش‌التهابی TNF-alpha و IL-6 توسط فیکوسیانین.",
    pubmedRef: "PMID: 30424538 (Int J Mol Sci)",
    expectedImprovement: "فروکش ۴۵ درصدی شاخص hs-CRP پس از ۶۰ روز",
  },
  {
    id: "fbs",
    nameFa: "قند خون ناشتا (FBS)",
    nameEn: "Fasting Blood Sugar",
    category: "lipid",
    categoryFa: "چربی و متابولیسم",
    unit: "mg/dL",
    normalMin: 70,
    normalMax: 99,
    defaultValue: 114,
    step: 1,
    description: "نشانگر سطح گلوکز ناشتا و میزان حساسیت گیرنده‌های محیطی انسولین.",
    spirulinaMechanism: "پپتیدهای فیکوسیانین بازجذب گلوکز در سلول‌های عضلانی را تحریک کرده و مقاومت به انسولین را کاهش می‌دهند.",
    pubmedRef: "PMID: 29775562 (Nutr Metab Cardiovasc Dis)",
    expectedImprovement: "کاهش ۱۰ تا ۲۰ واحدی قند خون ناشتا و ثبات انرژی روزانه",
  },
];

export interface LabAnalysisResult {
  overallScore: number; // 0 to 100
  riskLevel: "optimal" | "mild" | "moderate" | "severe";
  riskLabelFa: string;
  primaryDeficiencyFa: string;
  abnormalCount: number;
  recommendedPlanId: number;
  recommendedPlanName: string;
  recommendedPlanFormat: "tablets" | "powder";
  recommendedDays: number;
  dailyDosageMg: number;
  capsuleCount: number;
  spoonCount: number;
  timingAdvice: string;
  synergyTip: string;
  recheckWeeks: number;
  packagePrice: number;
  details: {
    biomarkerId: string;
    nameFa: string;
    currentValue: number;
    unit: string;
    status: "optimal" | "low" | "high";
    statusFa: string;
    insight: string;
  }[];
}

export function analyzeBiomarkers(values: Record<string, number>): LabAnalysisResult {
  let penalty = 0;
  let abnormalCount = 0;
  const details: LabAnalysisResult["details"] = [];

  let hasAnemia = false;
  let hasLiverIssue = false;
  let hasMetabolicIssue = false;
  let hasInflammation = false;

  BIOMARKERS_LIST.forEach((bio) => {
    const val = values[bio.id] !== undefined ? values[bio.id] : bio.defaultValue;
    let status: "optimal" | "low" | "high" = "optimal";
    let statusFa = "طبیعی و بهینه";
    let insight = "در محدوده سلامت بیولوژیک قرار دارد.";

    if (val < bio.normalMin) {
      status = "low";
      statusFa = "کمتر از حد طبیعی (پایین)";
      abnormalCount++;
      const deviation = (bio.normalMin - val) / bio.normalMin;
      penalty += Math.min(25, deviation * 35);
      insight = `نشان‌دهنده کمبود یا کاهش ذخایر بیوشیمیایی است. (${bio.spirulinaMechanism})`;

      if (bio.category === "hematology") hasAnemia = true;
    } else if (val > bio.normalMax) {
      status = "high";
      statusFa = "بیشتر از حد طبیعی (بالا)";
      abnormalCount++;
      const deviation = (val - bio.normalMax) / bio.normalMax;
      penalty += Math.min(25, deviation * 35);
      insight = `نشانگر فشار التهابی یا متابولیک بر اندام هدف است. (${bio.spirulinaMechanism})`;

      if (bio.category === "liver") hasLiverIssue = true;
      if (bio.category === "lipid") hasMetabolicIssue = true;
      if (bio.category === "inflammation") hasInflammation = true;
    }

    details.push({
      biomarkerId: bio.id,
      nameFa: bio.nameFa,
      currentValue: val,
      unit: bio.unit,
      status,
      statusFa,
      insight,
    });
  });

  const overallScore = Math.max(25, Math.min(100, Math.round(100 - penalty)));

  let riskLevel: LabAnalysisResult["riskLevel"] = "optimal";
  let riskLabelFa = "مطلوب و بهینه";

  if (overallScore < 50) {
    riskLevel = "severe";
    riskLabelFa = "نیاز فوری به ترمیم بیوشیمیایی و سم‌زدایی";
  } else if (overallScore < 70) {
    riskLevel = "moderate";
    riskLabelFa = "عدم تعادل متابولیک و التهابی متوسط";
  } else if (overallScore < 85) {
    riskLevel = "mild";
    riskLabelFa = "انحراف جزئی از محدوده بهینه زیستی";
  }

  // Determine Primary Deficiency & Targeted Plan
  let primaryDeficiencyFa = "حفظ و بهینه‌سازی سلامت سلولی";
  let recommendedPlanId = 2; // Default: 60-day plan
  let recommendedPlanName = "پکیج ۶۰ روزه طلایی مایا (دوره ترمیمی فیکوسیانین)";
  let recommendedPlanFormat: "tablets" | "powder" = "tablets";
  let recommendedDays = 60;
  let dailyDosageMg = 2000; // 4 capsules
  let capsuleCount = 4;
  let spoonCount = 1;
  let timingAdvice = "۲ کپسول صبح نیم ساعت پیش از صبحانه + ۲ کپسول عصر همراه با آب ولرم.";
  let synergyTip = "همراه با نصف لیموترش تازه میل فرمایید تا ویتامین C جذب آهن و فیکوسیانین را تا دو برابر تقویت کند.";
  let recheckWeeks = 8;
  let packagePrice = 680000;

  if (hasLiverIssue && (hasMetabolicIssue || hasInflammation)) {
    primaryDeficiencyFa = "کبد چرب و استرس اکسیداتیو ترکیبی هپاتوسیت‌ها";
    recommendedPlanId = 3;
    recommendedPlanName = "پکیج ۱۲۰ روزه کامل دتوکس و بازسازی کبد + شیکر دوجداره";
    recommendedPlanFormat = "tablets";
    recommendedDays = 120;
    dailyDosageMg = 2500;
    capsuleCount = 5;
    spoonCount = 1.5;
    timingAdvice = "۳ کپسول صبح ناشتا + ۲ کپسول قبل از خواب شبانه با یک لیوان پر آب.";
    synergyTip = "از مصرف غذاهای سرخ‌کردنی و قندهای صنعتی حین دوره پرهیز فرمایید.";
    recheckWeeks = 12;
    packagePrice = 1290000;
  } else if (hasAnemia) {
    primaryDeficiencyFa = "فقر آهن سلولی و افت هموگلوبین خون (Anemia)";
    recommendedPlanId = 2;
    recommendedPlanName = "پکیج ۶۰ روزه طلایی مایا (دوره اشباع فریتین)";
    recommendedPlanFormat = "tablets";
    recommendedDays = 60;
    dailyDosageMg = 2000;
    capsuleCount = 4;
    spoonCount = 1;
    timingAdvice = "۲ کپسول صبح ناشتا و ۲ کپسول ظهر همراه با نوشیدنی مرکبات.";
    synergyTip = "تا یک ساعت قبل و بعد از مصرف کپسول، از نوشیدن چای پررنگ یا قهوه خودداری فرمایید.";
    recheckWeeks = 8;
    packagePrice = 680000;
  } else if (hasMetabolicIssue) {
    primaryDeficiencyFa = "افزایش چربی و تری‌گلیسرید متابولیک";
    recommendedPlanId = 2;
    recommendedPlanName = "بسته ۶۰ روزه طلایی (پودر خالص یا کپسول)";
    recommendedPlanFormat = "powder";
    recommendedDays = 60;
    dailyDosageMg = 3000;
    capsuleCount = 6;
    spoonCount = 1.5;
    timingAdvice = "یک اسکوپ پودر در ۲۰۰ سی‌سی آب ولرم یا آب گریپ‌فروت نیم ساعت قبل از ناهار.";
    synergyTip = "فیبر طبیعی و GLA اشتها را مهار کرده و پاکسازی لیپیدها را تسریع می‌کند.";
    recheckWeeks = 8;
    packagePrice = 680000;
  } else if (abnormalCount === 0) {
    primaryDeficiencyFa = "پایداری انرژی و پیشگیری از پیری سلولی";
    recommendedPlanId = 1;
    recommendedPlanName = "بسته ۳۰ روزه آغاز مصرف مایا (دوره نگهداری)";
    recommendedPlanFormat = "tablets";
    recommendedDays = 30;
    dailyDosageMg = 1000;
    capsuleCount = 2;
    spoonCount = 0.5;
    timingAdvice = "۲ کپسول صبحگاهی برای شادابی و تمرکز روزانه.";
    synergyTip = "جهت تداوم ایمنی عالی بدن و تامین تمامی املاح و ویتامین‌ها.";
    recheckWeeks = 16;
    packagePrice = 345000;
  }

  return {
    overallScore,
    riskLevel,
    riskLabelFa,
    primaryDeficiencyFa,
    abnormalCount,
    recommendedPlanId,
    recommendedPlanName,
    recommendedPlanFormat,
    recommendedDays,
    dailyDosageMg,
    capsuleCount,
    spoonCount,
    timingAdvice,
    synergyTip,
    recheckWeeks,
    packagePrice,
    details,
  };
}
