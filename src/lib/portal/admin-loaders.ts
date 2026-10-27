import prisma from "@/lib/prisma";
import { getSettings, SETTING_DEFAULTS } from "@/lib/settings";
import { formatJalaliDateTime, formatJalaliShort, toJalali } from "@/lib/jalali";
import { NOTIFICATION_EVENTS } from "@/lib/notifications/events";
import { toOrderDTO } from "@/lib/commerce/dto";
import { loadTicketStats } from "@/lib/portal/tickets";
import { getPaymentMode, isMockPaymentAllowed } from "@/lib/payments";
import type { AdminCoupon } from "@/components/portal/admin/CouponsAdmin";

// ==============================================================
// Server-side data loaders for the staff sections of the portal.
// Each returns plain serializable objects for a client component.
// ==============================================================

const DAY = 86_400_000;

export async function loadCoupons(): Promise<AdminCoupon[]> {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const now = Date.now();
  return coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description ?? "",
    type: c.type,
    value: c.value,
    minAmount: c.minAmount,
    maxDiscount: c.maxDiscount,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "",
    expiresLabel: c.expiresAt ? formatJalaliShort(c.expiresAt) : "",
    isExpired: !!c.expiresAt && c.expiresAt.getTime() < now,
    isActive: c.isActive,
  }));
}

export async function loadSettingsAdmin() {
  const values = await getSettings();
  return Object.entries(SETTING_DEFAULTS).map(([key, def]) => ({
    key,
    value: values[key as keyof typeof SETTING_DEFAULTS],
    defaultValue: def.value,
    description: def.description,
  }));
}

export async function loadNotificationsAdmin() {
  const [templates, rules, logs, roles, counts] = await Promise.all([
    prisma.notificationTemplate.findMany({ orderBy: [{ event: "asc" }, { channel: "asc" }] }),
    prisma.notificationRule.findMany({ orderBy: [{ event: "asc" }, { createdAt: "asc" }] }),
    prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.role.findMany({ select: { key: true, name: true } }),
    prisma.notificationLog.groupBy({
      by: ["status"],
      where: { createdAt: { gte: new Date(Date.now() - 7 * DAY) } },
      _count: { _all: true },
    }),
  ]);
  return {
    events: NOTIFICATION_EVENTS.map((e) => ({ key: e.key, label: e.label, variables: [...e.variables] })),
    templates: templates.map((t) => ({
      id: t.id,
      event: t.event,
      channel: t.channel,
      subject: t.subject ?? "",
      body: t.body,
      isActive: t.isActive,
    })),
    rules: rules.map((r) => ({
      id: r.id,
      event: r.event,
      channel: r.channel,
      audience: r.audience,
      roleKey: r.roleKey,
      target: r.target,
      isActive: r.isActive,
    })),
    logs: logs.map((l) => ({
      id: l.id,
      event: l.event,
      channel: l.channel,
      recipient: l.recipient,
      status: l.status,
      body: l.body,
      error: l.error,
      attempts: l.attempts,
      createdAt: formatJalaliDateTime(l.createdAt),
    })),
    roles,
    weekStats: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<string, number>,
    channels: {
      SMS: !!(process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== "mock"),
      TELEGRAM: !!process.env.TELEGRAM_BOT_TOKEN,
      EMAIL: !!process.env.SMTP_HOST,
    },
  };
}
export type NotificationsAdminData = Awaited<ReturnType<typeof loadNotificationsAdmin>>;

// Connection status of payment and messaging services (never exposes secrets;
// keys stay in .env, only whether each one is set).
export function loadIntegrationStatus() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const mode = getPaymentMode();
  return {
    payment: {
      mode,
      merchantSet: !!process.env.ZARINPAL_MERCHANT_ID,
      callbackUrl: process.env.ZARINPAL_CALLBACK_URL || `${appUrl}/api/payments/zarinpal/callback`,
      mockAllowed: isMockPaymentAllowed(),
    },
    sms: { provider: process.env.SMS_PROVIDER || "mock" },
    telegram: { botSet: !!process.env.TELEGRAM_BOT_TOKEN, botUsername: process.env.TELEGRAM_BOT_USERNAME || null, adminChatSet: !!process.env.TELEGRAM_ADMIN_CHAT_ID },
    email: { smtpSet: !!process.env.SMTP_HOST, from: process.env.SMTP_FROM || null },
    cronSecretSet: !!process.env.CRON_SECRET,
  };
}
export type IntegrationStatus = ReturnType<typeof loadIntegrationStatus>;

export async function loadAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { actor: { select: { name: true, phone: true } } },
  });
  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    target: l.target,
    actor: l.actor ? l.actor.name ?? l.actor.phone : "سیستم",
    details: l.details ? JSON.stringify(l.details) : "",
    createdAt: formatJalaliDateTime(l.createdAt),
  }));
}

export async function loadOverview() {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since60 = new Date(now - 60 * DAY);
  const since365 = new Date(now - 365 * DAY);
  const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

  const [
    ordersYear, toShip, openTickets, pendingApps, pendingSettlements, lowStock, expiring, newUsers, recent, topVariants,
    failedNotifs, expensesYear, statusGroups, ambassadorCount, customerCount, staffCount, support,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since365 }, status: { in: [...paidStatuses] } },
      select: {
        createdAt: true,
        totalProductAmount: true,
        discountAmount: true,
        commissionAmount: true,
        referrerId: true,
        userId: true,
        shippingProvince: true,
        items: { select: { unitCost: true, quantity: true } },
      },
    }),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.ambassadorApplication.count({ where: { status: "PENDING" } }),
    prisma.settlementRequest.count({ where: { status: { in: ["PENDING", "APPROVED"] } } }),
    prisma.productVariant.findMany({ where: { isActive: true }, select: { sku: true, stock: true, lowStockAlert: true } }),
    prisma.inventoryBatch.count({ where: { expiryDate: { lte: new Date(now + 90 * DAY), gte: new Date(now) } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.order.findMany({ where: { status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 6, include: { items: true } }),
    prisma.orderItem.groupBy({
      by: ["sku", "productTitle"],
      where: { order: { createdAt: { gte: since30 }, status: { in: [...paidStatuses] } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 6,
    }),
    prisma.notificationLog.count({ where: { status: "FAILED", createdAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.expense.findMany({ where: { spentAt: { gte: since365 } }, select: { spentAt: true, amount: true } }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.user.count({ where: { isActive: true, roles: { some: { role: { key: "ambassador" } } } } }),
    prisma.user.count({ where: { orders: { some: { status: { in: [...paidStatuses] } } } } }),
    prisma.user.count({ where: { isActive: true, roles: { some: { role: { key: { notIn: ["customer", "ambassador"] } } } } } }),
    loadTicketStats(),
  ]);

  const formatOf = new Map(
    (await prisma.productVariant.findMany({ where: { sku: { in: topVariants.map((t) => t.sku) } }, select: { sku: true, format: true } })).map((v) => [
      v.sku,
      v.format === "CAPSULE" ? "کپسول" : "پودر",
    ])
  );
  const net = (o: { totalProductAmount: number; discountAmount: number }) => o.totalProductAmount - o.discountAmount;
  const cogsOf = (o: { items: { unitCost: number; quantity: number }[] }) => o.items.reduce((a, i) => a + i.unitCost * i.quantity, 0);
  const last30 = ordersYear.filter((o) => o.createdAt >= since30);
  const prev30 = ordersYear.filter((o) => o.createdAt >= since60 && o.createdAt < since30);
  const revenue = last30.reduce((s, o) => s + net(o), 0);
  const prevRevenue = prev30.reduce((s, o) => s + net(o), 0);
  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);

  // سود ۳۰ روز: فروش خالص − بهای تمام‌شده − پورسانت − هزینه‌های ثبت‌شده
  const cogs = last30.reduce((s, o) => s + cogsOf(o), 0);
  const commission = last30.reduce((s, o) => s + o.commissionAmount, 0);
  const expenses = expensesYear.filter((e) => e.spentAt >= since30).reduce((s, e) => s + e.amount, 0);

  // فروش روزانه ۳۰ روز اخیر
  const daily: { label: string; value: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const start = new Date(now - i * DAY);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + DAY;
    const { jm, jd } = toJalali(start);
    const day = last30.filter((o) => o.createdAt.getTime() >= start.getTime() && o.createdAt.getTime() < end);
    daily.push({ label: `${jm}/${jd}`, value: day.reduce((s, o) => s + net(o), 0), orders: day.length });
  }

  // روند ۱۲ ماه شمسی: فروش خالص و سود خالص
  const monthKey = (d: Date) => {
    const { jy, jm } = toJalali(d);
    return `${jy}/${String(jm).padStart(2, "0")}`;
  };
  const monthly = new Map<string, { key: string; revenue: number; profit: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    const { jy, jm } = toJalali(d);
    let y = jy;
    let m = jm - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const key = `${y}/${String(m).padStart(2, "0")}`;
    monthly.set(key, { key, revenue: 0, profit: 0 });
  }
  for (const o of ordersYear) {
    const m = monthly.get(monthKey(o.createdAt));
    if (!m) continue;
    m.revenue += net(o);
    m.profit += net(o) - cogsOf(o) - o.commissionAmount;
  }
  for (const e of expensesYear) {
    const m = monthly.get(monthKey(e.spentAt));
    if (m) m.profit -= e.amount;
  }

  // کانال فروش (۳۰ روز)
  const viaAmbassador = last30.filter((o) => o.referrerId);
  const channel = {
    direct: { revenue: revenue - viaAmbassador.reduce((s, o) => s + net(o), 0), orders: last30.length - viaAmbassador.length },
    ambassador: { revenue: viaAmbassador.reduce((s, o) => s + net(o), 0), orders: viaAmbassador.length },
  };

  // استان‌ها (۳۰ روز)
  const provinceMap = new Map<string, number>();
  for (const o of last30) provinceMap.set(o.shippingProvince || "نامشخص", (provinceMap.get(o.shippingProvince || "نامشخص") ?? 0) + net(o));
  const provinces = [...provinceMap.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // برترین سفیران (۳۰ روز)
  const ambMap = new Map<string, { revenue: number; orders: number; commission: number }>();
  for (const o of viaAmbassador) {
    const a = ambMap.get(o.referrerId!) ?? { revenue: 0, orders: 0, commission: 0 };
    a.revenue += net(o);
    a.orders += 1;
    a.commission += o.commissionAmount;
    ambMap.set(o.referrerId!, a);
  }
  const topAmbIds = [...ambMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  const ambUsers = await prisma.user.findMany({ where: { id: { in: topAmbIds.map(([id]) => id) } }, select: { id: true, name: true, phone: true, ambassadorTier: true } });
  const topAmbassadors = topAmbIds.map(([id, v]) => {
    const u = ambUsers.find((x) => x.id === id);
    return { id, name: u?.name ?? u?.phone ?? "—", tier: u?.ambassadorTier ?? "SILVER", ...v };
  });

  // وفاداری مشتری (۱۲ ماه): سهم مشتریانی که بیش از یک بار خرید کرده‌اند
  const perCustomer = new Map<string, number>();
  for (const o of ordersYear) perCustomer.set(o.userId, (perCustomer.get(o.userId) ?? 0) + 1);
  const buyersYear = perCustomer.size;
  const repeatBuyers = [...perCustomer.values()].filter((n) => n > 1).length;

  return {
    revenue,
    profit: { cogs, commission, expenses, net: revenue - cogs - commission - expenses },
    revenueChange: pct(revenue, prevRevenue),
    ordersChange: pct(last30.length, prev30.length),
    orders: last30.length,
    aov: last30.length ? Math.round(revenue / last30.length) : 0,
    ambassadorShare: last30.length ? Math.round((viaAmbassador.length / last30.length) * 100) : 0,
    customers: new Set(last30.map((o) => o.userId)).size,
    newUsers,
    people: { customers: customerCount, ambassadors: ambassadorCount, staff: staffCount },
    loyalty: { buyersYear, repeatBuyers, repeatRate: buyersYear ? Math.round((repeatBuyers / buyersYear) * 100) : 0 },
    daily,
    monthly: [...monthly.values()],
    channel,
    statuses: statusGroups.map((g) => ({ status: g.status, count: g._count._all })).sort((a, b) => b.count - a.count),
    provinces,
    topAmbassadors,
    support,
    tasks: {
      toShip,
      openTickets,
      pendingApps,
      pendingSettlements,
      lowStock: lowStock.filter((v) => v.stock <= v.lowStockAlert).map((v) => v.sku),
      expiring,
      failedNotifs,
    },
    recent: recent.map(toOrderDTO),
    // کپسول و پودر عنوان بسته یکسان دارند؛ نوع بسته کنار عنوان می‌آید تا قابل تشخیص باشند
    topVariants: topVariants.map((t) => ({
      sku: t.sku,
      title: formatOf.has(t.sku) ? `${t.productTitle} (${formatOf.get(t.sku)})` : t.productTitle,
      quantity: t._sum.quantity ?? 0,
      revenue: t._sum.totalPrice ?? 0,
    })),
  };
}
export type OverviewData = Awaited<ReturnType<typeof loadOverview>>;

export async function loadSampleKitsAdmin() {
  const kits = await prisma.sampleKit.findMany({
    orderBy: { deliveredAt: "desc" },
    take: 500,
    include: { ambassador: { select: { name: true, phone: true } }, convertedOrder: { select: { orderNumber: true } } },
  });
  const now = Date.now();
  return kits.map((k) => ({
    id: k.id,
    code: k.code,
    ambassador: k.ambassador.name ?? k.ambassador.phone,
    recipientName: k.recipientName,
    recipientPhone: k.recipientPhone,
    status: k.status,
    deliveredAt: formatJalaliShort(k.deliveredAt),
    followUpAt: formatJalaliShort(k.followUpAt),
    followUpDue: k.status === "DELIVERED" && k.followUpAt.getTime() <= now,
    convertedOrderNumber: k.convertedOrder?.orderNumber ?? null,
    notes: k.notes ?? "",
  }));
}

export async function loadAbandonedCheckouts() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PENDING", "CANCELLED"] }, paymentStatus: { not: "PAID" } },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { items: true, user: { select: { name: true, phone: true } } },
  });
  return orders.map((o) => ({ ...toOrderDTO(o), accountName: o.user.name, accountPhone: o.user.phone }));
}

export async function loadFinance() {
  const since = new Date(Date.now() - 365 * DAY);
  const [orders, settings, settlementsPaid, expenses] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUNDED"] } },
      include: { items: { select: { unitCost: true, quantity: true } } },
    }),
    getSettings(),
    prisma.settlementRequest.aggregate({ where: { status: "PAID", processedAt: { gte: since } }, _sum: { amount: true } }),
    prisma.expense.findMany({ where: { spentAt: { gte: since } }, orderBy: { spentAt: "desc" } }),
  ]);

  type Month = { key: string; orders: number; gross: number; discount: number; shipping: number; cogs: number; commission: number; refunds: number; expenses: number };
  const emptyMonth = (key: string): Month => ({ key, orders: 0, gross: 0, discount: 0, shipping: 0, cogs: 0, commission: 0, refunds: 0, expenses: 0 });
  const monthKey = (d: Date) => {
    const { jy, jm } = toJalali(d);
    return `${jy}/${String(jm).padStart(2, "0")}`;
  };

  const months = new Map<string, Month>();
  for (const o of orders) {
    const key = monthKey(o.createdAt);
    const m = months.get(key) ?? emptyMonth(key);
    if (o.status === "REFUNDED") {
      m.refunds += o.totalProductAmount - o.discountAmount;
    } else {
      m.orders += 1;
      m.gross += o.totalProductAmount;
      m.discount += o.discountAmount;
      m.shipping += o.shippingFee;
      m.cogs += o.items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
      m.commission += o.commissionAmount;
    }
    months.set(key, m);
  }
  for (const e of expenses) {
    const key = monthKey(e.spentAt);
    const m = months.get(key) ?? emptyMonth(key);
    m.expenses += e.amount;
    months.set(key, m);
  }
  return {
    months: [...months.values()].sort((a, b) => (a.key < b.key ? 1 : -1)),
    expenses: expenses.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      date: formatJalaliShort(e.spentAt),
      note: e.note ?? "",
    })),
    settlementsPaid: settlementsPaid._sum.amount ?? 0,
    freeShippingThreshold: Number(settings.FREE_SHIPPING_THRESHOLD) || 0,
  };
}
export type FinanceData = Awaited<ReturnType<typeof loadFinance>>;
