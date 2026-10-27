// ==============================================================
// Demo data for local development: ~1000 users across all roles with
// a year of orders, points, referrals, reviews, tickets, campaigns…
// so every panel chart has something to show.
//
//   npm run db:demo          → remove old demo data, then create it again
//   npm run db:demo -- --clean → only remove demo data
//
// Every demo row hangs off a demo user (phone 0999xxxxxxx, tag "demo"),
// so --clean never touches real customers. Refuses to run in production.
// ==============================================================

import { PrismaClient, type Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const NOW = Date.now();
const DEMO_TAG = "demo";
const PHONE_PREFIX = "0999";

// تولید عدد تصادفی تکرارپذیر تا هر بار همان داده ساخته شود
let seed = 1405;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;
const weighted = <T,>(items: readonly (readonly [T, number])[]): T => {
  let r = rnd() * items.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of items) if ((r -= w) < 0) return v;
  return items[items.length - 1][0];
};
// تاریخ در n روز گذشته؛ رشد کسب‌وکار باعث می‌شود داده‌های اخیر بیشتر باشند
const pastDate = (maxDays: number, growth = 1.6) => new Date(NOW - Math.pow(rnd(), growth) * maxDays * DAY - int(0, 86_399) * 1000);
const after = (d: Date, minDays: number, maxDays: number) => new Date(Math.min(d.getTime() + (minDays + rnd() * (maxDays - minDays)) * DAY, NOW));

const FIRST_M = ["علی", "محمد", "حسین", "رضا", "مهدی", "امیر", "سعید", "حمید", "کامران", "بهزاد", "پویا", "آرش", "میلاد", "سینا", "مجید"];
const FIRST_F = ["زهرا", "فاطمه", "مریم", "سارا", "نرگس", "الهام", "مینا", "نازنین", "شیوا", "لیلا", "پریسا", "هانیه", "سمیرا", "رویا", "آزاده"];
const LAST = ["محمدی", "حسینی", "احمدی", "رضایی", "کریمی", "موسوی", "جعفری", "صادقی", "نوری", "کاظمی", "رحیمی", "اکبری", "قاسمی", "یزدانی", "شریفی", "تهرانی", "مرادی", "فراهانی"];
const CITIES: [string, string, number][] = [
  ["تهران", "تهران", 30], ["اصفهان", "اصفهان", 10], ["خراسان رضوی", "مشهد", 10], ["فارس", "شیراز", 8], ["آذربایجان شرقی", "تبریز", 7],
  ["البرز", "کرج", 7], ["خوزستان", "اهواز", 5], ["قم", "قم", 4], ["کرمانشاه", "کرمانشاه", 3], ["گیلان", "رشت", 4], ["مازندران", "ساری", 4],
  ["یزد", "یزد", 3], ["کرمان", "کرمان", 3], ["همدان", "همدان", 2],
];
const PROFESSIONS = ["پزشک عمومی", "متخصص تغذیه", "مربی بدنسازی", "داروساز", "مربی یوگا", "اینفلوئنسر سلامت", "پرستار", "فیزیوتراپیست"];
const UTM = [["instagram", "social", "autumn-launch"], ["instagram", "social", "reels-detox"], ["google", "cpc", "spirulina-search"], ["telegram", "social", "channel-post"], ["torob", "referral", "price-compare"]] as const;

async function clean() {
  const demo = await prisma.user.findMany({ where: { phone: { startsWith: PHONE_PREFIX }, tags: { has: DEMO_TAG } }, select: { id: true } });
  const ids = demo.map((u) => u.id);
  if (ids.length === 0) return 0;
  // سفارش‌ها روی کاربر Restrict هستند و هزینه/کمپین روی سازنده SetNull؛ بقیه با حذف کاربر Cascade می‌شوند
  await prisma.order.deleteMany({ where: { userId: { in: ids } } });
  await prisma.expense.deleteMany({ where: { createdById: { in: ids } } });
  await prisma.smsCampaign.deleteMany({ where: { createdById: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

type U = Prisma.UserCreateManyInput & { id: string; createdAt: Date; roleKeys: string[] };

async function create() {
  const roles = new Map((await prisma.role.findMany()).map((r) => [r.key, r.id]));
  for (const k of ["customer", "ambassador", "consultant", "wholesale", "support", "warehouse", "accountant", "admin"]) {
    if (!roles.has(k)) throw new Error(`Role "${k}" is missing. Run "npx prisma db seed" first.`);
  }
  const variants = await prisma.productVariant.findMany({ where: { isActive: true } });
  if (variants.length === 0) throw new Error('No products. Run "npx prisma db seed" first.');
  const warehouse = await prisma.warehouse.findFirst({ where: { isDefault: true } });

  // ---------- کاربران ----------
  const plan: [string[], number][] = [
    [["customer"], 880], [["ambassador", "customer"], 60], [["consultant", "customer"], 10], [["wholesale", "customer"], 20],
    [["support", "customer"], 4], [["warehouse", "customer"], 2], [["accountant", "customer"], 2], [["admin", "customer"], 2],
  ];
  const users: U[] = [];
  let n = 0;
  for (const [roleKeys, count] of plan) {
    for (let i = 0; i < count; i++) {
      n++;
      const female = chance(0.58);
      const [province, city] = weighted(CITIES.map(([p, c, w]) => [[p, c], w] as const));
      const staff = !roleKeys.includes("customer") || roleKeys.length > 1;
      users.push({
        id: randomUUID(),
        phone: `${PHONE_PREFIX}${String(n).padStart(7, "0")}`,
        name: `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`,
        gender: female ? "FEMALE" : "MALE",
        province,
        city,
        referralCode: `DEMO-${String(n).padStart(4, "0")}`,
        isPhoneVerified: true,
        smsConsent: chance(0.6),
        tags: [DEMO_TAG],
        source: pick(["اینستاگرام", "معرفی دوستان", "گوگل", "تلگرام", "پزشک", "ترب"]),
        occupation: roleKeys.includes("ambassador") || roleKeys.includes("consultant") ? pick(PROFESSIONS) : null,
        ambassadorTier: roleKeys.includes("ambassador") ? weighted([["SILVER", 6], ["GOLD", 3], ["DIAMOND", 1]] as const) : null,
        ambassadorSlug: roleKeys.includes("ambassador") ? `demo-amb-${n}` : null,
        // کارکنان از ابتدا بوده‌اند؛ مشتریان در طول سال با رشد اضافه شده‌اند
        createdAt: staff && roleKeys[0] !== "ambassador" ? pastDate(365, 0.3) : pastDate(365, roleKeys[0] === "ambassador" ? 0.8 : 1.5),
        roleKeys,
      });
    }
  }
  const ambassadors = users.filter((u) => u.roleKeys.includes("ambassador"));
  const staff = users.filter((u) => ["support", "admin"].includes(u.roleKeys[0]));
  const consultants = users.filter((u) => u.roleKeys[0] === "consultant");
  // ۲۵٪ مشتریان با لینک سفیر آمده‌اند
  for (const u of users) {
    if (u.roleKeys[0] === "customer" && chance(0.25)) {
      const amb = pick(ambassadors);
      if (amb.createdAt < u.createdAt) u.referredById = amb.id;
    }
  }

  await prisma.user.createMany({ data: users.map(({ roleKeys: _k, ...u }) => (void _k, u)) });
  await prisma.userRole.createMany({ data: users.flatMap((u) => u.roleKeys.map((k) => ({ userId: u.id, roleId: roles.get(k)!, assignedAt: u.createdAt }))) });
  const wallets = users.map((u) => ({ id: randomUUID(), userId: u.id, balance: 0, totalEarned: 0, totalWithdrawn: 0, createdAt: u.createdAt }));
  await prisma.wallet.createMany({ data: wallets });
  const walletOf = new Map(wallets.map((w) => [w.userId, w]));
  await prisma.address.createMany({
    data: users.map((u) => ({
      userId: u.id, title: pick(["منزل", "محل کار", "باشگاه"]), recipient: u.name!, phone: u.phone, province: u.province!, city: u.city!,
      address: `${u.city}، خیابان ${pick(LAST)}، پلاک ${int(1, 200)}`, postalCode: String(int(1000000000, 9999999999)), isDefault: true, createdAt: u.createdAt,
    })),
  });

  // ---------- سفارش‌ها ----------
  const orders: Prisma.OrderCreateManyInput[] = [];
  const items: Prisma.OrderItemCreateManyInput[] = [];
  const points: Prisma.PointTransactionCreateManyInput[] = [];
  const walletTx: Prisma.WalletTransactionCreateManyInput[] = [];
  const reviews: Prisma.ReviewCreateManyInput[] = [];
  const returns: Prisma.ReturnRequestCreateManyInput[] = [];
  const delivered: { id: string; userId: string; at: Date }[] = [];
  let seq = 0;

  for (const u of users) {
    // اکثر مشتریان ۱ تا ۳ خرید دارند؛ عمده‌فروش‌ها بیشتر و بزرگ‌تر
    const wholesale = u.roleKeys[0] === "wholesale";
    const count = wholesale ? int(3, 9) : weighted([[0, 22], [1, 38], [2, 22], [3, 10], [4, 5], [6, 3]] as const);
    let at = after(u.createdAt, 0, 5);
    for (let k = 0; k < count && at.getTime() < NOW - DAY / 4; k++) {
      const v = weighted(variants.map((x) => [x, x.durationDays === 60 ? 5 : x.durationDays === 30 ? 3 : 2] as const));
      const qty = wholesale ? int(5, 30) : weighted([[1, 85], [2, 12], [3, 3]] as const);
      const gross = v.price * qty;
      const referrerId = u.referredById ?? (chance(0.08) ? pick(ambassadors).id : null);
      const coupon = !referrerId && chance(0.12) ? pick(["WELCOME10", "YALDA15", "BACK20"]) : null;
      const discount = wholesale ? Math.round(gross * 0.25) : referrerId ? Math.round(gross * 0.05) : coupon ? Math.round(gross * 0.1) : 0;
      const shipping = gross >= 1_000_000 ? 0 : 45_000;
      const ageDays = (NOW - at.getTime()) / DAY;
      const status = weighted(
        ageDays < 2 ? ([["PENDING", 2], ["PAID", 6], ["PROCESSING", 3]] as const)
          : ageDays < 6 ? ([["PROCESSING", 2], ["SHIPPED", 6], ["CANCELLED", 0.5]] as const)
            : ([["DELIVERED", 90], ["CANCELLED", 4], ["REFUNDED", 2], ["PENDING", 4]] as const),
      );
      const paid = status !== "PENDING";
      const commissionPercent = referrerId ? 10 : 0;
      const commission = Math.round((gross - discount) * commissionPercent / 100);
      const id = randomUUID();
      const utm = !referrerId && !coupon && chance(0.3) ? pick(UTM) : null;
      const shippedAt = ["SHIPPED", "DELIVERED", "REFUNDED"].includes(status) ? after(at, 1, 2) : null;
      const deliveredAt = ["DELIVERED", "REFUNDED"].includes(status) ? after(shippedAt!, 1, 4) : null;
      orders.push({
        id, orderNumber: `DEMO-${String(++seq).padStart(5, "0")}`, userId: u.id, status,
        totalProductAmount: gross, discountAmount: discount, shippingFee: shipping, payableAmount: gross - discount + shipping,
        couponCode: coupon, referrerId, commissionPercent, commissionAmount: commission, commissionReleased: status === "DELIVERED" && commission > 0,
        paymentStatus: paid ? "PAID" : "UNPAID", paidAt: paid ? at : null, gatewayRefId: paid ? String(int(10_000_000, 99_999_999)) : null,
        shippingRecipient: u.name!, shippingPhone: u.phone, shippingProvince: u.province!, shippingCity: u.city!,
        shippingAddress: `${u.city}، خیابان ${pick(LAST)}`, shippingPostalCode: String(int(1000000000, 9999999999)),
        shippingCarrier: shippedAt ? pick(["POST", "POST", "TIPAX", "COURIER"]) : null,
        trackingCode: shippedAt ? String(int(100000, 999999)).repeat(4) : null, shippedAt, deliveredAt,
        refillDueAt: deliveredAt ? new Date(deliveredAt.getTime() + v.durationDays * qty * DAY) : null,
        salesChannel: referrerId ? "AMBASSADOR" : coupon ? "COUPON" : utm ? "UTM" : k > 0 && chance(0.4) ? "REFILL" : "DIRECT",
        utmSource: utm?.[0] ?? null, utmMedium: utm?.[1] ?? null, utmCampaign: utm?.[2] ?? null,
        warehouseId: shippedAt ? warehouse?.id ?? null : null, createdAt: at, updatedAt: deliveredAt ?? at,
      });
      items.push({ orderId: id, variantId: v.id, productTitle: v.title, sku: v.sku, unitPrice: v.price, unitCost: v.costPrice, quantity: qty, totalPrice: gross });

      if (paid && status !== "CANCELLED") {
        const pts = Math.floor((gross - discount) / 10_000);
        points.push({ userId: u.id, orderId: id, points: pts, type: "PURCHASE_REWARD", status: status === "DELIVERED" ? "RELEASED" : status === "REFUNDED" ? "REVOKED" : "PENDING", description: `امتیاز خرید سفارش DEMO-${seq}`, releasedAt: deliveredAt, createdAt: at });
      }
      if (status === "DELIVERED") {
        delivered.push({ id, userId: u.id, at: deliveredAt! });
        if (commission > 0) {
          const w = walletOf.get(referrerId!)!;
          w.balance += commission;
          w.totalEarned += commission;
          walletTx.push({ walletId: w.id, amount: commission, balanceAfter: w.balance, type: "CREDIT", reason: "REFERRAL_COMMISSION", referenceId: id, description: `پورسانت سفارش DEMO-${seq}`, createdAt: deliveredAt! });
        }
        if (chance(0.4)) {
          const rating = weighted([[5, 55], [4, 28], [3, 9], [2, 5], [1, 3]] as const);
          reviews.push({
            orderId: id, userId: u.id, rating, publish: rating >= 4 && chance(0.7), displayName: u.name,
            status: rating >= 4 ? weighted([["APPROVED", 8], ["PENDING", 2]] as const) : weighted([["PENDING", 5], ["REJECTED", 2], ["APPROVED", 3]] as const),
            body: rating >= 4 ? pick(["انرژی‌ام واقعاً بهتر شده.", "کیفیت عالی و ارسال سریع.", "بسته‌بندی تمیز، طعم قابل‌قبول.", "دومین خریدم بود، راضی‌ام."]) : pick(["ارسال دیر رسید.", "طعم پودر برایم سخت بود.", "انتظار بیشتری داشتم."]),
            createdAt: after(deliveredAt!, 1, 7),
          });
        }
      }
      if (status === "REFUNDED") returns.push({ orderId: id, userId: u.id, reason: pick(["آسیب‌دیدگی بسته", "عدم تمایل به مصرف", "ارسال اشتباه"]), status: "REFUNDED", createdAt: after(deliveredAt!, 1, 5) });

      at = after(at, 20, 75);
    }
  }
  // امتیاز ثبت‌نام و معرفی
  for (const u of users) points.push({ userId: u.id, points: 50, type: "SIGNUP_BONUS", status: "RELEASED", description: "هدیه عضویت", releasedAt: u.createdAt, createdAt: u.createdAt });
  for (const u of users.filter((x) => x.referredById)) {
    points.push({ userId: u.referredById!, points: 100, type: "REFERRAL_REWARD", status: "RELEASED", description: `معرفی ${u.name}`, releasedAt: u.createdAt, createdAt: u.createdAt });
  }

  for (let i = 0; i < orders.length; i += 1000) await prisma.order.createMany({ data: orders.slice(i, i + 1000) });
  for (let i = 0; i < items.length; i += 1000) await prisma.orderItem.createMany({ data: items.slice(i, i + 1000) });
  for (let i = 0; i < points.length; i += 1000) await prisma.pointTransaction.createMany({ data: points.slice(i, i + 1000) });
  await prisma.walletTransaction.createMany({ data: walletTx });
  await prisma.review.createMany({ data: reviews });
  await prisma.returnRequest.createMany({ data: returns });

  // ---------- تسویه سفیران ----------
  const settlements: Prisma.SettlementRequestCreateManyInput[] = [];
  for (const a of ambassadors) {
    const w = walletOf.get(a.id)!;
    if (w.balance < 300_000) continue;
    const amount = Math.round((w.balance * (0.4 + rnd() * 0.4)) / 1000) * 1000;
    const status = weighted([["PAID", 6], ["PENDING", 2], ["APPROVED", 1], ["REJECTED", 1]] as const);
    const createdAt = pastDate(120);
    if (status === "PAID") {
      w.balance -= amount;
      w.totalWithdrawn += amount;
      walletTx.push({ walletId: w.id, amount, balanceAfter: w.balance, type: "DEBIT", reason: "SETTLEMENT_PAYOUT", description: "واریز تسویه به شبا", createdAt });
    }
    settlements.push({
      userId: a.id, amount, shebaNumber: `IR${String(int(10_000_000, 99_999_999)).repeat(3)}`, bankName: pick(["ملت", "ملی", "پاسارگاد", "سامان"]),
      accountHolder: a.name!, status, bankReceiptRef: status === "PAID" ? String(int(100_000, 999_999)) : null, processedAt: status === "PENDING" ? null : after(createdAt, 1, 4), createdAt,
    });
  }
  await prisma.settlementRequest.createMany({ data: settlements });
  await prisma.walletTransaction.createMany({ data: walletTx.filter((t) => t.reason === "SETTLEMENT_PAYOUT") });
  for (const w of wallets.filter((x) => x.totalEarned > 0)) {
    await prisma.wallet.update({ where: { id: w.id }, data: { balance: w.balance, totalEarned: w.totalEarned, totalWithdrawn: w.totalWithdrawn } });
  }

  // ---------- درخواست سفیری، کیت سمپل ----------
  const customers = users.filter((u) => u.roleKeys[0] === "customer");
  await prisma.ambassadorApplication.createMany({
    data: [...ambassadors.map((a) => ({ u: a, status: "APPROVED" as const })), ...Array.from({ length: 35 }, () => ({ u: pick(customers), status: weighted([["PENDING", 5], ["REJECTED", 3]] as const) }))].map(({ u, status }) => ({
      userId: u.id, fullName: u.name!, profession: pick(PROFESSIONS), city: u.city!, audience: `${int(1, 80)} هزار دنبال‌کننده`, status,
      createdAt: status === "APPROVED" ? new Date(u.createdAt.getTime() - DAY) : pastDate(90), reviewedAt: status === "PENDING" ? null : u.createdAt,
    })),
  });
  await prisma.sampleKit.createMany({
    data: Array.from({ length: 150 }, (_, i) => {
      const deliveredAt = pastDate(180);
      return {
        code: `DEMO-KIT-${i + 1}`, ambassadorId: pick(ambassadors).id, recipientName: `${pick([...FIRST_F, ...FIRST_M])} ${pick(LAST)}`, recipientPhone: `0912${int(1_000_000, 9_999_999)}`,
        status: weighted([["CONVERTED", 3], ["FOLLOWED_UP", 3], ["LOST", 2], ["DELIVERED", 2]] as const), deliveredAt, followUpAt: new Date(deliveredAt.getTime() + 3 * DAY), createdAt: deliveredAt,
      };
    }),
  });

  // ---------- تیکت‌ها و مشاوره ----------
  const tickets: Prisma.SupportTicketCreateManyInput[] = [];
  const messages: Prisma.TicketMessageCreateManyInput[] = [];
  for (let i = 0; i < 220; i++) {
    const u = pick(customers);
    const consult = chance(0.3);
    const createdAt = pastDate(180);
    const status = (NOW - createdAt.getTime()) / DAY < 3 ? weighted([["OPEN", 5], ["IN_PROGRESS", 3], ["ANSWERED", 2]] as const) : weighted([["CLOSED", 8], ["ANSWERED", 2]] as const);
    const firstResponseAt = status === "OPEN" ? null : new Date(createdAt.getTime() + int(10, 600) * 60_000);
    const assignee = consult ? pick(consultants) : pick(staff);
    const id = randomUUID();
    tickets.push({
      id, userId: u.id, kind: consult ? "CONSULTATION" : "SUPPORT", priority: weighted([["NORMAL", 7], ["LOW", 2], ["HIGH", 1.5], ["URGENT", 0.5]] as const),
      subject: consult ? pick(["مصرف در دوران بارداری", "تداخل با داروی تیروئید", "دوز مناسب برای ورزشکار", "مصرف برای کودک"]) : pick(["پیگیری ارسال سفارش", "تغییر آدرس", "مشکل در پرداخت", "استفاده از کد تخفیف", "کیفیت بسته‌بندی"]),
      status, assigneeId: status === "OPEN" ? null : assignee.id, firstResponseAt, closedAt: status === "CLOSED" ? after(createdAt, 1, 3) : null,
      rating: status === "CLOSED" && chance(0.6) ? weighted([[5, 6], [4, 3], [3, 1], [2, 0.5]] as const) : null, createdAt, updatedAt: createdAt,
    });
    messages.push({ ticketId: id, authorId: u.id, body: "سلام، لطفاً راهنمایی کنید.", createdAt });
    if (firstResponseAt) messages.push({ ticketId: id, authorId: assignee.id, body: "سلام، درخواست شما بررسی شد و پاسخ در ادامه آمده است.", isStaff: true, createdAt: firstResponseAt });
  }
  await prisma.supportTicket.createMany({ data: tickets });
  await prisma.ticketMessage.createMany({ data: messages });

  // ---------- CRM ----------
  const stageFor = (count: number) => (count >= 3 ? "LOYAL" : count >= 1 ? "CUSTOMER" : weighted([["NEW", 4], ["CONTACTED", 3], ["INTERESTED", 2], ["LOST", 1]] as const));
  const orderCount = new Map<string, number>();
  for (const o of orders) if (o.status === "DELIVERED") orderCount.set(o.userId, (orderCount.get(o.userId) ?? 0) + 1);
  const byStage = new Map<string, string[]>();
  for (const u of customers) {
    const lastOrder = orders.filter((o) => o.userId === u.id).at(-1);
    let stage = stageFor(orderCount.get(u.id) ?? 0);
    if (lastOrder && NOW - (lastOrder.createdAt as Date).getTime() > 120 * DAY && stage !== "NEW") stage = "AT_RISK";
    byStage.set(stage, [...(byStage.get(stage) ?? []), u.id]);
  }
  for (const [stage, ids] of byStage) await prisma.user.updateMany({ where: { id: { in: ids } }, data: { leadStage: stage as Prisma.UserUpdateManyMutationInput["leadStage"] } });
  await prisma.contactInteraction.createMany({
    data: Array.from({ length: 400 }, () => {
      const createdAt = pastDate(150);
      const followUpAt = chance(0.35) ? after(createdAt, 2, 20) : null;
      return {
        contactId: pick(customers).id, authorId: pick(staff).id, channel: weighted([["CALL", 5], ["WHATSAPP", 3], ["SMS", 2], ["TELEGRAM", 1]] as const),
        summary: pick(["پیگیری رضایت از خرید", "معرفی بسته ۶۰ روزه", "پاسخ به سؤال درباره دوز مصرف", "یادآوری تمدید", "شکایت از تأخیر ارسال"]),
        sentiment: weighted([["POSITIVE", 5], ["NEUTRAL", 4], ["NEGATIVE", 1.5]] as const), topic: pick(["PRODUCT", "SHIPPING", "PRICE", "SUPPORT", "CONSULTATION"] as const),
        followUpAt, followUpDone: followUpAt ? followUpAt.getTime() < NOW - 2 * DAY : false, createdAt,
      };
    }),
  });

  // ---------- هزینه‌ها و کمپین‌ها ----------
  const accountant = users.find((u) => u.roleKeys[0] === "accountant")!;
  const admin = users.find((u) => u.roleKeys[0] === "admin")!;
  const expenses: Prisma.ExpenseCreateManyInput[] = [];
  for (let m = 11; m >= 0; m--) {
    const month = new Date(NOW - m * 30 * DAY);
    const growth = 1 + (11 - m) * 0.08;
    expenses.push(
      { title: "اجاره انبار", category: "RENT", amount: 6_000_000, spentAt: month, createdById: accountant.id },
      { title: "حقوق کارکنان", category: "SALARY", amount: 20_000_000, spentAt: month, createdById: accountant.id },
      { title: "تبلیغات اینستاگرام", category: "MARKETING", amount: Math.round(int(5, 10) * growth) * 1_000_000, spentAt: month, createdById: accountant.id },
      { title: "هزینه پست و تیپاکس", category: "SHIPPING", amount: Math.round(int(2, 4) * growth) * 1_000_000, spentAt: month, createdById: accountant.id },
      { title: "بسته‌بندی و چاپ", category: "PACKAGING", amount: int(2, 3) * 1_000_000, spentAt: month, createdById: accountant.id },
      { title: "کارمزد درگاه", category: "GATEWAY", amount: Math.round(int(1, 2) * growth) * 1_000_000, spentAt: month, createdById: accountant.id },
    );
  }
  await prisma.expense.createMany({ data: expenses });
  await prisma.smsCampaign.createMany({
    data: [
      ["تخفیف یلدا", "یلدا مبارک! ۱۵٪ تخفیف با کد YALDA15", "همه مشتریان دارای رضایت", 812],
      ["بازگشت مشتری", "دلمان برایتان تنگ شده! ۲۰٪ تخفیف با کد BACK20", "بخش CRM: در خطر ریزش", 214],
      ["معرفی بسته پودر", "پودر اسپیرولینای مایا رسید؛ مناسب اسموتی", "بخش CRM: مشتری فعال", 640],
      ["یادآوری تمدید", "دوره مصرفتان رو به پایان است", "بخش CRM: وفادار", 158],
      ["جشنواره پاییز", "ارسال رایگان خریدهای بالای یک میلیون", "همه مشتریان دارای رضایت", 870],
      ["دعوت از سفیران", "پنل سفیران به‌روز شد؛ گزارش پورسانت را ببینید", "سفیران برند", 60],
    ].map(([title, body, segment, recipients], i) => ({ title: String(title), body: String(body), segment: String(segment), recipients: Number(recipients), createdById: admin.id, createdAt: new Date(NOW - (150 - i * 25) * DAY) })),
  });

  return { users: users.length, orders: orders.length, reviews: reviews.length, tickets: tickets.length, settlements: settlements.length };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo data is for local development only.");
  const removed = await clean();
  console.log(`🧹 ${removed} demo users (and their data) removed.`);
  if (process.argv.includes("--clean")) return;
  const r = await create();
  console.log(`✅ Demo data created: ${r.users} users, ${r.orders} orders, ${r.reviews} reviews, ${r.tickets} tickets, ${r.settlements} settlements.`);
}

main()
  .catch((e) => {
    console.error("❌ Demo seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
