import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLES, SUPER_ADMIN_ROLE, CUSTOMER_ROLE, AMBASSADOR_ROLE } from "../src/lib/rbac/permissions";
import { SETTING_DEFAULTS } from "../src/lib/settings-defaults";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

async function seedSettings() {
  for (const [key, { value, description }] of Object.entries(SETTING_DEFAULTS)) {
    // مقادیری که مدیر تغییر داده بازنویسی نمی‌شوند
    await prisma.setting.upsert({ where: { key }, update: { description }, create: { key, value, description } });
  }
}

async function seedRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { key: role.key },
      // مدیر ارشد همیشه همه مجوزها (از جمله مجوزهای تازه) را دارد؛
      // دسترسی بقیه نقش‌ها فقط بار اول ساخته می‌شود و بعد در دست مدیر ارشد است
      update:
        role.key === SUPER_ADMIN_ROLE
          ? { name: role.name, description: role.description, isSystem: true, permissions: role.permissions }
          : { isSystem: role.isSystem },
      create: role,
    });
  }
}

// مجوزهای تازه برای نقش‌های پیش‌فرض موجود، فقط یک‌بار (اگر مدیر بعداً برداشت، دوباره اضافه نمی‌شود)
const PERMISSION_GRANTS: { marker: string; grants: Record<string, string[]> }[] = [
  { marker: "2026-10-livechat-crm", grants: { admin: ["livechat.answer", "crm.followup"], support: ["livechat.answer", "crm.followup"] } },
  // نظرات خریداران برای پشتیبان (بخش «نظرات و رضایت خریداران»)
  { marker: "2026-10-reviews", grants: { support: ["tickets.manage"] } },
];

async function seedPermissionGrants() {
  for (const g of PERMISSION_GRANTS) {
    const done = await prisma.auditLog.findFirst({ where: { action: "seed.permission_grant", target: g.marker } });
    if (done) continue;
    for (const [key, perms] of Object.entries(g.grants)) {
      const role = await prisma.role.findUnique({ where: { key } });
      if (!role) continue;
      const missing = perms.filter((p) => !role.permissions.includes(p));
      if (missing.length) await prisma.role.update({ where: { key }, data: { permissions: [...role.permissions, ...missing] } });
    }
    await prisma.auditLog.create({ data: { action: "seed.permission_grant", target: g.marker, details: g.grants } });
  }
}

// چند انبار: انبار مرکزی و (فقط یک‌بار) موجودی فیزیکی آن =
// موجودی قابل فروش + اقلام سفارش‌هایی که رزرو شده‌اند ولی هنوز ارسال نشده‌اند
async function seedWarehouses() {
  const main = (await prisma.warehouse.findFirst({ where: { isDefault: true } })) ??
    (await prisma.warehouse.upsert({ where: { name: "انبار مرکزی" }, update: { isDefault: true }, create: { name: "انبار مرکزی", isDefault: true } }));
  await prisma.inventoryBatch.updateMany({ where: { warehouseId: null }, data: { warehouseId: main.id } });
  if ((await prisma.warehouseStock.count()) > 0) return;
  const variants = await prisma.productVariant.findMany({ select: { id: true, stock: true } });
  const reserved = await prisma.orderItem.groupBy({
    by: ["variantId"],
    where: { order: { status: { in: ["PENDING", "PAID", "PROCESSING"] } } },
    _sum: { quantity: true },
  });
  for (const v of variants) {
    const quantity = v.stock + (reserved.find((r) => r.variantId === v.id)?._sum.quantity ?? 0);
    if (quantity > 0) await prisma.warehouseStock.create({ data: { warehouseId: main.id, variantId: v.id, quantity } });
  }
}

async function upsertUserWithRoles(phone: string, name: string, referralCode: string, roleKeys: string[], extra: object = {}) {
  // اگر شماره مدیر بعداً عوض شود، کد معرف قبلی دست کاربر قدیمی است
  const codeTaken = await prisma.user.findFirst({ where: { referralCode, NOT: { phone } }, select: { id: true } });
  if (codeTaken) referralCode = `${referralCode}-${phone.slice(-4)}`;
  const user = await prisma.user.upsert({
    where: { phone },
    update: { name, ...extra },
    create: {
      phone,
      name,
      referralCode,
      isPhoneVerified: true,
      wallet: { create: { balance: 0 } },
      ...extra,
    },
  });
  for (const key of roleKeys) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
  return user;
}

async function seedProducts() {
  const product = await prisma.product.upsert({
    where: { slug: "maya-spirulina" },
    update: {},
    create: {
      slug: "maya-spirulina",
      title: "اسپیرولینا مایا",
      subtitle: "سوپرفود خالص بیوتکنولوژی، فرآوری سرد در مزرعه ایزوله",
      shortDescription: "کپسول ۵۰۰ میلی‌گرمی فشرده سرد و پودر میکرونیزه خالص اسپیرولینا پلاتنسیس",
      description:
        "اسپیرولینای مایا بدون ماده نگه‌دارنده یا چسباننده شیمیایی، با جذب گوارشی بالا و غنی از فیکوسیانین، آهن طبیعی و پروتئین گیاهی کامل.",
      images: ["/images/maya-spirulina-bottle-prime.png"],
      benefits: [
        "افزایش انرژی سلولی بدون افت خستگی",
        "تأمین آهن ارگانیک",
        "۶۵٪ پروتئین گیاهی با همه اسیدهای آمینه ضروری",
      ],
      dosageInstructions: "روزانه ۲ تا ۴ کپسول یا ۱ قاشق چای‌خوری پودر، صبح ناشتا همراه با آب.",
      isFeatured: true,
      isActive: true,
    },
  });

  const variants = [
    { sku: "MAYA-TAB-120", title: "بسته ۳۰ روزه (آغاز مصرف)", format: "CAPSULE", durationDays: 30, packDescription: "۱ قوطی حاوی ۱۲۰ کپسول ۵۰۰ میلی‌گرمی خالص", price: 345000, compareAtPrice: 390000, costPrice: 160000, stock: 150, weightGrams: 150, sortOrder: 1 },
    { sku: "MAYA-TAB-240", title: "بسته ۶۰ روزه طلایی", format: "CAPSULE", durationDays: 60, packDescription: "۲ قوطی ۱۲۰ عددی (مجموعاً ۲۴۰ کپسول ۵۰۰mg)", badge: "پرفروش‌ترین", price: 680000, compareAtPrice: 780000, costPrice: 310000, stock: 320, weightGrams: 300, sortOrder: 2 },
    { sku: "MAYA-TAB-480", title: "بسته ۱۲۰ روزه کامل خانوادگی + هدیه شیکر", format: "CAPSULE", durationDays: 120, packDescription: "۴ قوطی ۱۲۰ عددی کپسول + ۱ عدد شیکر دوجداره مایا", badge: "به‌صرفه‌ترین", price: 1290000, compareAtPrice: 1560000, costPrice: 640000, stock: 60, weightGrams: 750, sortOrder: 3 },
    { sku: "MAYA-POW-100", title: "بسته ۳۰ روزه (آغاز مصرف)", format: "POWDER", durationDays: 30, packDescription: "۱ بسته ۱۰۰ گرمی پودر میکرونیزه زیپ‌کیپ", price: 345000, compareAtPrice: 390000, costPrice: 150000, stock: 90, weightGrams: 120, sortOrder: 4 },
    { sku: "MAYA-POW-250", title: "بسته ۶۰ روزه طلایی", format: "POWDER", durationDays: 60, packDescription: "۱ بسته ۲۵۰ گرمی متالایز ضد رطوبت و نور", badge: "پرفروش‌ترین", price: 680000, compareAtPrice: 780000, costPrice: 300000, stock: 140, weightGrams: 280, sortOrder: 5 },
    { sku: "MAYA-POW-500", title: "بسته ۱۲۰ روزه کامل خانوادگی + هدیه شیکر", format: "POWDER", durationDays: 120, packDescription: "۲ بسته ۲۵۰ گرمی پودر خالص + ۱ عدد شیکر دوجداره", badge: "به‌صرفه‌ترین", price: 1290000, compareAtPrice: 1560000, costPrice: 620000, stock: 45, weightGrams: 650, sortOrder: 6 },
  ] as const;

  for (const v of variants) {
    const variant = await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: { ...v, productId: product.id },
    });
    const batchCode = `B1405-${v.sku.slice(5)}`;
    await prisma.inventoryBatch.upsert({
      where: { batchCode },
      update: {},
      create: {
        variantId: variant.id,
        batchCode,
        quantity: v.stock,
        productionDate: new Date(Date.now() - 60 * DAY),
        expiryDate: new Date(Date.now() + 640 * DAY),
      },
    });
  }
}

async function seedCoupons() {
  await prisma.coupon.upsert({
    where: { code: "MAYA10" },
    update: {},
    create: { code: "MAYA10", description: "۱۰٪ تخفیف ویژه خرید اسپیرولینا مایا", type: "PERCENT", value: 10, maxDiscount: 200000 },
  });
  await prisma.coupon.upsert({
    where: { code: "HEALTH50" },
    update: {},
    create: { code: "HEALTH50", description: "۵۰,۰۰۰ تومان تخفیف هدیه عضویت باشگاه سلامت مایا", type: "FIXED", value: 50000, minAmount: 300000 },
  });
}

const TEMPLATES: { event: string; channel: "SMS" | "TELEGRAM" | "EMAIL"; subject?: string; body: string }[] = [
  { event: "order.paid", channel: "SMS", body: "{{name}} عزیز، سفارش {{orderNumber}} به مبلغ {{amount}} تومان ثبت شد. مایا اسپیرولینا" },
  { event: "order.paid", channel: "EMAIL", subject: "فاکتور سفارش {{orderNumber}}", body: "{{name}} عزیز،\nسفارش {{orderNumber}} به مبلغ {{amount}} تومان با موفقیت پرداخت شد و در حال آماده‌سازی است." },
  { event: "order.shipped", channel: "SMS", body: "سفارش {{orderNumber}} با {{carrier}} ارسال شد. کد رهگیری: {{trackingCode}} - مایا اسپیرولینا" },
  { event: "order.shipped", channel: "TELEGRAM", body: "📦 سفارش {{orderNumber}} ارسال شد.\nکد رهگیری: {{trackingCode}}" },
  { event: "order.delivered", channel: "SMS", body: "{{name}} عزیز، سفارش {{orderNumber}} تحویل شد. نوش جان!" },
  { event: "order.cancelled", channel: "SMS", body: "سفارش {{orderNumber}} لغو شد. در صورت پرداخت، مبلغ به کیف پول شما بازگشت." },
  { event: "admin.new_user", channel: "SMS", body: "کاربر جدید با شماره {{phone}} به عنوان مشتری ثبت‌نام کرد. مایا اسپیرولینا" },
  { event: "admin.new_user", channel: "TELEGRAM", body: "👤 ثبت‌نام جدید\nشماره: {{phone}}\nزمان: {{date}}\nنقش: مشتری" },
  { event: "admin.new_order", channel: "TELEGRAM", body: "🛒 سفارش جدید {{orderNumber}}\nمبلغ: {{amount}} تومان\nمشتری: {{customer}}" },
  { event: "ambassador.commission", channel: "SMS", body: "{{name}} عزیز، پورسانت {{commission}} تومان بابت سفارش {{orderNumber}} ثبت شد." },
  { event: "ambassador.commission", channel: "TELEGRAM", body: "💰 پورسانت {{commission}} تومان بابت سفارش {{orderNumber}} ثبت شد." },
  { event: "settlement.requested", channel: "TELEGRAM", body: "🏦 درخواست تسویه جدید\n{{name}} — {{amount}} تومان" },
  { event: "settlement.paid", channel: "SMS", body: "{{name}} عزیز، تسویه {{amount}} تومان واریز شد. شماره پیگیری: {{receipt}}" },
  { event: "settlement.rejected", channel: "SMS", body: "{{name}} عزیز، درخواست تسویه {{amount}} تومان رد شد. علت: {{reason}}" },
  { event: "ambassador.application", channel: "TELEGRAM", body: "🤝 درخواست سفیر جدید\n{{name}} — {{profession}} ({{city}})" },
  { event: "ambassador.approved", channel: "SMS", body: "{{name}} عزیز، درخواست سفیری شما تأیید شد. پنل سفیر در حساب شما فعال است." },
  { event: "samplekit.followup", channel: "TELEGRAM", body: "⏰ پیگیری روز سوم کیت سمپل\n{{recipient}} — {{phone}}" },
  { event: "samplekit.followup", channel: "SMS", body: "{{name}} عزیز، امروز روز پیگیری کیت سمپل {{recipient}} است." },
  { event: "ticket.created", channel: "TELEGRAM", body: "🎫 تیکت جدید: {{subject}}\nمشتری: {{customer}}" },
  { event: "ticket.answered", channel: "SMS", body: "{{name}} عزیز، به تیکت «{{subject}}» پاسخ داده شد." },
  { event: "inventory.low_stock", channel: "TELEGRAM", body: "⚠️ موجودی {{sku}} به {{stock}} عدد رسید." },
  { event: "inventory.expiring", channel: "TELEGRAM", body: "⌛ بچ {{batchCode}} ({{sku}}) در {{date}} منقضی می‌شود." },
  { event: "consult.created", channel: "TELEGRAM", body: "🥗 درخواست مشاوره جدید: {{subject}}\nمراجع: {{customer}}" },
  { event: "livechat.new", channel: "TELEGRAM", body: "💬 گفت‌وگوی آنلاین جدید ({{topic}})\n{{customer}}: {{message}}" },
  { event: "consult.answered", channel: "SMS", body: "{{name}} عزیز، مشاور تغذیه مایا به درخواست «{{subject}}» پاسخ داد." },
  {
    event: "refill.reminder",
    channel: "SMS",
    body: "{{name}} عزیز، {{days}} روز تا پایان دوره مصرف {{product}} مانده است.{{coupon}} سفارش دوباره: {{link}}",
  },
  { event: "return.requested", channel: "TELEGRAM", body: "↩️ درخواست مرجوعی سفارش {{orderNumber}}\n{{customer}}: {{reason}}" },
  { event: "return.updated", channel: "SMS", body: "{{name}} عزیز، درخواست مرجوعی سفارش {{orderNumber}}: {{status}}. {{note}}" },
  { event: "review.request", channel: "SMS", body: "{{name}} عزیز، از خرید سفارش {{orderNumber}} راضی بودید؟ نظرتان در یک دقیقه: {{link}}" },
  { event: "review.low", channel: "TELEGRAM", body: "⚠️ نارضایتی خریدار ({{rating}} از ۵)\n{{customer}} — سفارش {{orderNumber}}\n{{comment}}" },
  { event: "referral.reward", channel: "SMS", body: "{{name}} عزیز، {{points}} امتیاز پاداش معرفی دوستتان به حساب شما اضافه شد. مایا اسپیرولینا" },
  { event: "winback.offer", channel: "SMS", body: "{{name}} عزیز، دلمان برایتان تنگ شده! {{discount}}٪ تخفیف با کد {{coupon}} تا {{days}} روز: {{link}}" },
];

const RULES: { event: string; channel: "SMS" | "TELEGRAM" | "EMAIL"; audience: "CUSTOMER" | "AMBASSADOR" | "ROLE" | "TELEGRAM_GROUP"; roleKey?: string }[] = [
  { event: "order.paid", channel: "SMS", audience: "CUSTOMER" },
  { event: "order.paid", channel: "EMAIL", audience: "CUSTOMER" },
  { event: "order.shipped", channel: "SMS", audience: "CUSTOMER" },
  { event: "order.shipped", channel: "TELEGRAM", audience: "CUSTOMER" },
  { event: "order.delivered", channel: "SMS", audience: "CUSTOMER" },
  { event: "order.cancelled", channel: "SMS", audience: "CUSTOMER" },
  { event: "admin.new_user", channel: "SMS", audience: "ROLE", roleKey: "super_admin" },
  { event: "admin.new_user", channel: "TELEGRAM", audience: "ROLE", roleKey: "super_admin" },
  { event: "admin.new_order", channel: "TELEGRAM", audience: "TELEGRAM_GROUP" },
  { event: "ambassador.commission", channel: "TELEGRAM", audience: "AMBASSADOR" },
  { event: "ambassador.commission", channel: "SMS", audience: "AMBASSADOR" },
  { event: "settlement.requested", channel: "TELEGRAM", audience: "ROLE", roleKey: "accountant" },
  { event: "settlement.paid", channel: "SMS", audience: "CUSTOMER" },
  { event: "settlement.rejected", channel: "SMS", audience: "CUSTOMER" },
  { event: "ambassador.application", channel: "TELEGRAM", audience: "TELEGRAM_GROUP" },
  { event: "ambassador.approved", channel: "SMS", audience: "CUSTOMER" },
  { event: "samplekit.followup", channel: "TELEGRAM", audience: "AMBASSADOR" },
  { event: "samplekit.followup", channel: "SMS", audience: "AMBASSADOR" },
  { event: "ticket.created", channel: "TELEGRAM", audience: "ROLE", roleKey: "support" },
  { event: "ticket.answered", channel: "SMS", audience: "CUSTOMER" },
  { event: "inventory.low_stock", channel: "TELEGRAM", audience: "ROLE", roleKey: "warehouse" },
  { event: "inventory.expiring", channel: "TELEGRAM", audience: "ROLE", roleKey: "warehouse" },
  { event: "consult.created", channel: "TELEGRAM", audience: "ROLE", roleKey: "consultant" },
  { event: "consult.answered", channel: "SMS", audience: "CUSTOMER" },
  { event: "livechat.new", channel: "TELEGRAM", audience: "ROLE", roleKey: "support" },
  { event: "refill.reminder", channel: "SMS", audience: "CUSTOMER" },
  { event: "return.requested", channel: "TELEGRAM", audience: "ROLE", roleKey: "support" },
  { event: "return.updated", channel: "SMS", audience: "CUSTOMER" },
  { event: "review.request", channel: "SMS", audience: "CUSTOMER" },
  { event: "review.low", channel: "TELEGRAM", audience: "ROLE", roleKey: "support" },
  { event: "referral.reward", channel: "SMS", audience: "CUSTOMER" },
  { event: "winback.offer", channel: "SMS", audience: "CUSTOMER" },
];

async function seedNotifications() {
  for (const t of TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { event_channel: { event: t.event, channel: t.channel } },
      update: {},
      create: t,
    });
  }
  // قانون پیش‌فرض فقط برای رویدادهایی ساخته می‌شود که هنوز هیچ قانونی ندارند
  // (تغییرات مدیر روی رویدادهای موجود دست نمی‌خورد)
  // متن قدیمی پیامک ارسال فقط «پست» را می‌گفت؛ اگر مدیر تغییرش نداده، با نام شرکت حمل به‌روز می‌شود
  await prisma.notificationTemplate.updateMany({
    where: { event: "order.shipped", channel: "SMS", body: "سفارش {{orderNumber}} ارسال شد. کد رهگیری پست: {{trackingCode}} - مایا اسپیرولینا" },
    data: { body: "سفارش {{orderNumber}} با {{carrier}} ارسال شد. کد رهگیری: {{trackingCode}} - مایا اسپیرولینا" },
  });
  const existing = new Set((await prisma.notificationRule.findMany({ select: { event: true } })).map((r) => r.event));
  const missing = RULES.filter((r) => !existing.has(r.event));
  if (missing.length > 0) await prisma.notificationRule.createMany({ data: missing });
}

async function main() {
  console.log("🌱 مقداردهی اولیه پایگاه داده مایا اسپیرولینا...");

  await seedSettings();
  await seedRoles();
  await seedPermissionGrants();

  const superAdminPhone = process.env.SUPER_ADMIN_PHONE || "09120000000";
  await upsertUserWithRoles(superAdminPhone, "مدیر ارشد مایا اسپیرولینا", "MAYA-ADMN", [SUPER_ADMIN_ROLE, CUSTOMER_ROLE]);

  // سفیر نمونه فقط در محیط توسعه
  if (process.env.NODE_ENV !== "production") {
    await upsertUserWithRoles("09121111111", "دکتر سارا رادمنش", "MAYA-RAD9", [AMBASSADOR_ROLE, CUSTOMER_ROLE], {
      // پله با فروش تحویل‌شده خودکار ارتقا می‌یابد (src/lib/commerce/tiers.ts)
      ambassadorTier: "SILVER",
      ambassadorSlug: "dr-radmanesh",
    });
  }

  await seedProducts();
  await seedWarehouses();
  await seedCoupons();
  await seedNotifications();

  console.log("✅ مقداردهی اولیه با موفقیت انجام شد.");
}

main()
  .catch((e) => {
    console.error("❌ خطا در seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
