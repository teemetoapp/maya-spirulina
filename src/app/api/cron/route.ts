import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { processQueue, notify } from "@/lib/notifications";
import { getNumberSetting } from "@/lib/settings";
import { changeOrderStatus } from "@/lib/commerce/orders";
import { formatJalaliShort } from "@/lib/jalali";
import { isModuleEnabled } from "@/lib/modules/server";
import { sendRefillReminders } from "@/lib/commerce/refill";
import { expirePoints, releaseHeldRewards } from "@/lib/commerce/loyalty";
import { sendWinbacks, sendReviewRequests } from "@/lib/marketing/campaigns";
import { monitorServices } from "@/lib/monitoring";

// ==============================================================
// Scheduled jobs. Call every 10–15 minutes from the server's crontab:
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron
// Each job is idempotent, so running it more often is harmless.
// ==============================================================

const DAY = 86_400_000;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function cancelStalePendingOrders() {
  const hours = await getNumberSetting("PENDING_ORDER_EXPIRY_HOURS");
  if (hours <= 0) return 0;
  const stale = await prisma.order.findMany({
    where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - hours * 3_600_000) } },
    select: { id: true },
    take: 100,
  });
  for (const o of stale) {
    try {
      await changeOrderStatus(o.id, "CANCELLED", null, { note: "لغو خودکار: پرداخت انجام نشد" });
    } catch (err) {
      console.error("[cron] cancel failed", o.id, err);
    }
  }
  return stale.length;
}

async function sampleKitFollowUps() {
  if (!(await isModuleEnabled("samplekits"))) return 0;
  const due = await prisma.sampleKit.findMany({
    where: { status: "DELIVERED", followUpAt: { lte: new Date() }, remindedAt: null },
    take: 200,
  });
  for (const k of due) {
    const claimed = await prisma.sampleKit.updateMany({ where: { id: k.id, remindedAt: null }, data: { remindedAt: new Date() } });
    if (claimed.count === 0) continue;
    await notify("samplekit.followup", {
      ambassadorId: k.ambassadorId,
      data: { recipient: k.recipientName, phone: k.recipientPhone },
    });
  }
  return due.length;
}

async function expiryAlerts() {
  if (!(await isModuleEnabled("expiry"))) return 0;
  const days = await getNumberSetting("EXPIRY_ALERT_DAYS");
  const batches = await prisma.inventoryBatch.findMany({
    where: { alertedAt: null, expiryDate: { lte: new Date(Date.now() + days * DAY) } },
    include: { variant: { select: { sku: true } } },
    take: 100,
  });
  for (const b of batches) {
    await prisma.inventoryBatch.update({ where: { id: b.id }, data: { alertedAt: new Date() } });
    await notify("inventory.expiring", { data: { batchCode: b.batchCode, sku: b.variant.sku, date: formatJalaliShort(b.expiryDate) } });
  }
  return batches.length;
}

async function run(req: Request) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  // اول بررسی سلامت، تا اگر دیتابیس قطع است هشدار پیش از خطای بقیه کارها برود
  const health = await monitorServices();
  const result = {
    unhealthy: health.filter((h) => !h.ok).map((h) => h.key),
    cancelledOrders: await cancelStalePendingOrders(),
    sampleKitFollowUps: await sampleKitFollowUps(),
    expiryAlerts: await expiryAlerts(),
    refillReminders: await sendRefillReminders(),
    referralRewardsReleased: await releaseHeldRewards(),
    pointsExpired: await expirePoints(),
    winbacks: await sendWinbacks(),
    reviewRequests: await sendReviewRequests(),
    notifications: await processQueue(),
  };
  return NextResponse.json({ success: true, ...result });
}

export const GET = run;
export const POST = run;
