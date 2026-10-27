import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getModuleStates } from "@/lib/modules/server";
import { notify } from "@/lib/notifications";
import { formatJalaliShort } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/currency";

// ==============================================================
// Module «refill» — consumption-period reminders.
// When an order is delivered its refillDueAt is set to
//   deliveredAt + Σ(durationDays × quantity)   (capped at a year)
// The cron sends one reminder REFILL_REMIND_DAYS_BEFORE days earlier,
// with a single-use discount code when the coupons module is on.
// A customer who has already ordered again is not reminded.
// ==============================================================

const DAY = 86_400_000;
const MAX_DAYS = 365;

export async function refillDueFor(orderId: string, deliveredAt: Date): Promise<Date | null> {
  const items = await prisma.orderItem.findMany({ where: { orderId }, include: { variant: { select: { durationDays: true } } } });
  const days = Math.min(
    MAX_DAYS,
    items.reduce((sum, i) => sum + (i.variant.durationDays || 0) * i.quantity, 0)
  );
  return days > 0 ? new Date(deliveredAt.getTime() + days * DAY) : null;
}

// سفارش‌های تحویل‌شده‌ای که هنوز تاریخ پایان مصرف ندارند (سفارش‌های قدیمی)
export async function backfillRefillDates(): Promise<number> {
  const orders = await prisma.order.findMany({
    where: { status: "DELIVERED", deliveredAt: { not: null }, refillDueAt: null, refillRemindedAt: null },
    select: { id: true, deliveredAt: true },
    take: 200,
  });
  for (const o of orders) {
    const due = await refillDueFor(o.id, o.deliveredAt!);
    // بدون دوره مصرف: علامت می‌خورد تا دوباره بررسی نشود
    await prisma.order.update({ where: { id: o.id }, data: due ? { refillDueAt: due } : { refillRemindedAt: new Date(0) } });
  }
  return orders.length;
}

async function reorderedSince(userId: string, since: Date): Promise<boolean> {
  const n = await prisma.order.count({
    where: { userId, createdAt: { gt: since }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
  });
  return n > 0;
}

function refillCode(): string {
  return `REFILL-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function sendRefillReminders(): Promise<number> {
  const modules = await getModuleStates();
  if (!modules.refill) return 0;
  await backfillRefillDates();

  const s = await getSettings();
  const daysBefore = Number(s.REFILL_REMIND_DAYS_BEFORE) || 7;
  const discount = modules.coupons ? Number(s.REFILL_DISCOUNT_PERCENT) || 0 : 0;
  const validDays = Number(s.REFILL_COUPON_VALID_DAYS) || 14;
  const now = Date.now();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const due = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      refillRemindedAt: null,
      refillDueAt: { lte: new Date(now + daysBefore * DAY), gte: new Date(now - 30 * DAY) },
    },
    include: { items: { select: { productTitle: true } } },
    take: 200,
  });

  let sent = 0;
  for (const o of due) {
    const claimed = await prisma.order.updateMany({ where: { id: o.id, refillRemindedAt: null }, data: { refillRemindedAt: new Date() } });
    if (claimed.count === 0) continue;
    if (await reorderedSince(o.userId, o.deliveredAt ?? o.createdAt)) continue;

    let coupon = "";
    let code: string | null = null;
    if (discount > 0) {
      code = refillCode();
      await prisma.coupon.create({
        data: {
          code,
          description: `تخفیف تمدید مصرف سفارش ${o.orderNumber}`,
          type: "PERCENT",
          value: discount,
          maxUses: 1,
          expiresAt: new Date(now + validDays * DAY),
        },
      });
      coupon = ` کد تخفیف ${toPersianDigits(discount)}٪ شما: ${code}`;
    }
    const days = Math.max(0, Math.ceil((o.refillDueAt!.getTime() - now) / DAY));
    const link = `${appUrl}/checkout?reorder=${encodeURIComponent(o.orderNumber)}${code ? `&coupon=${code}` : ""}`;
    await notify("refill.reminder", {
      userId: o.userId,
      data: { days: toPersianDigits(days), product: o.items[0]?.productTitle ?? "اسپیرولینا مایا", coupon, link },
    });
    sent++;
  }
  return sent;
}

// ---------------------------------------------------------------- views

export interface CustomerRefill {
  orderNumber: string;
  product: string;
  dueDate: string;
  daysLeft: number;
  totalDays: number;
  reorderHref: string;
}

// نزدیک‌ترین پایان دوره مصرف مشتری (اگر بعد از آن سفارش جدیدی نداده باشد)
export async function loadCustomerRefill(userId: string): Promise<CustomerRefill | null> {
  const order = await prisma.order.findFirst({
    where: { userId, status: "DELIVERED", refillDueAt: { gte: new Date(Date.now() - 30 * DAY) } },
    orderBy: { deliveredAt: "desc" },
    include: { items: { select: { productTitle: true } } },
  });
  if (!order?.refillDueAt || !order.deliveredAt) return null;
  if (await reorderedSince(userId, order.deliveredAt)) return null;
  const totalDays = Math.max(1, Math.round((order.refillDueAt.getTime() - order.deliveredAt.getTime()) / DAY));
  return {
    orderNumber: order.orderNumber,
    product: order.items[0]?.productTitle ?? "اسپیرولینا مایا",
    dueDate: formatJalaliShort(order.refillDueAt),
    daysLeft: Math.ceil((order.refillDueAt.getTime() - Date.now()) / DAY),
    totalDays,
    reorderHref: `/checkout?reorder=${encodeURIComponent(order.orderNumber)}`,
  };
}

export interface RefillRow {
  orderNumber: string;
  customerId: string;
  customer: string;
  phone: string;
  product: string;
  dueDate: string;
  daysLeft: number;
  status: "UPCOMING" | "REMINDED" | "REORDERED" | "OVERDUE";
}

export async function loadRefillsAdmin(): Promise<{ rows: RefillRow[]; stats: { dueWeek: number; reminded30: number; reordered30: number; conversion: number | null } }> {
  const now = Date.now();
  const orders = await prisma.order.findMany({
    where: { status: "DELIVERED", refillDueAt: { gte: new Date(now - 30 * DAY), lte: new Date(now + 45 * DAY) } },
    orderBy: { refillDueAt: "asc" },
    include: { user: { select: { name: true, phone: true } }, items: { select: { productTitle: true } } },
    take: 400,
  });
  const userIds = [...new Set(orders.map((o) => o.userId))];
  const later = userIds.length
    ? await prisma.order.findMany({
        where: { userId: { in: userIds }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        select: { userId: true, createdAt: true },
      })
    : [];
  const rows: RefillRow[] = orders.map((o) => {
    const since = (o.deliveredAt ?? o.createdAt).getTime();
    const reordered = later.some((l) => l.userId === o.userId && l.createdAt.getTime() > since);
    const daysLeft = Math.ceil((o.refillDueAt!.getTime() - now) / DAY);
    const reminded = !!o.refillRemindedAt && o.refillRemindedAt.getTime() > 0;
    return {
      orderNumber: o.orderNumber,
      customerId: o.userId,
      customer: o.user.name ?? "بدون نام",
      phone: o.user.phone,
      product: o.items[0]?.productTitle ?? "—",
      dueDate: formatJalaliShort(o.refillDueAt!),
      daysLeft,
      status: reordered ? "REORDERED" : reminded ? "REMINDED" : daysLeft < 0 ? "OVERDUE" : "UPCOMING",
    };
  });
  const reminded = await prisma.order.findMany({
    where: { refillRemindedAt: { gte: new Date(now - 30 * DAY) } },
    select: { userId: true, refillRemindedAt: true },
  });
  let reordered30 = 0;
  for (const r of reminded) {
    if (await reorderedSince(r.userId, r.refillRemindedAt!)) reordered30++;
  }
  return {
    rows,
    stats: {
      dueWeek: rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 7 && r.status !== "REORDERED").length,
      reminded30: reminded.length,
      reordered30,
      conversion: reminded.length ? Math.round((reordered30 / reminded.length) * 100) : null,
    },
  };
}
