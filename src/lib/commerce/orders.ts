import prisma from "@/lib/prisma";
import { defaultWarehouseId, moveWarehouseStock, resolveWarehouseId } from "@/lib/commerce/warehouses";
import { isModuleEnabled } from "@/lib/modules/server";
import { notify } from "@/lib/notifications";
import { getNumberSetting } from "@/lib/settings";
import { logAudit } from "@/lib/rbac/server";
import { toJalali } from "@/lib/jalali";
import { creditWallet } from "@/lib/wallet";
import { ORDER_TRANSITIONS, CARRIER_LABELS } from "./dto";
import { refreshAmbassadorTier } from "./tiers";
import { refillDueFor } from "./refill";
import { pointsExpiryDate, grantReferralReward, revokeOrderPoints } from "./loyalty";
import type { Quote } from "./pricing";
import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";

// ==============================================================
// Order lifecycle — one place for every state change, so stock,
// wallet, commission, loyalty points and notifications stay in sync.
//
//   PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
//        ↘ CANCELLED (from any state before SHIPPED)   DELIVERED → REFUNDED
// ==============================================================

export class OrderError extends Error {}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  // ORD-YYMMDD-XXXX بر اساس تاریخ شمسی
  const { jy, jm, jd } = toJalali(new Date());
  const jalali = `${String(jy).slice(2)}${String(jm).padStart(2, "0")}${String(jd).padStart(2, "0")}`;
  for (;;) {
    const candidate = `ORD-${jalali}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
}

export interface ShippingInfo {
  recipient: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  note?: string;
}

// منبع فروش و نشانه‌های تقلب که در صفحه پرداخت تشخیص داده شده
export interface OrderMeta {
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null } | null;
  fraudFlags?: string[];
}

export const CARRIERS = CARRIER_LABELS as { POST: string; TIPAX: string; COURIER: string; OTHER: string };
export type CarrierKey = keyof typeof CARRIERS;

export function salesChannelFor(quote: Pick<Quote, "referrer" | "couponCode" | "wholesale">, utmSource?: string | null): string {
  if (quote.wholesale) return "WHOLESALE";
  if (quote.referrer) return "AMBASSADOR";
  const code = quote.couponCode ?? "";
  if (code.startsWith("REFILL-")) return "REFILL";
  if (code.startsWith("WINBACK-")) return "WINBACK";
  if (code) return "COUPON";
  if (utmSource) return "UTM";
  return "DIRECT";
}

/**
 * Creates an order from a server-side quote. Stock and wallet credit are
 * reserved inside the same transaction; if nothing is left to pay online
 * the order is marked paid immediately.
 */
export async function createOrder(userId: string, quote: Quote, shipping: ShippingInfo, meta: OrderMeta = {}) {
  const paymentMethod: PaymentMethod =
    quote.walletUsed === 0 ? "ONLINE_GATEWAY" : quote.payable === 0 ? "WALLET" : "HYBRID";

  const order = await prisma.$transaction(async (tx) => {
    for (const line of quote.lines) {
      const updated = await tx.productVariant.updateMany({
        where: { id: line.variantId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (updated.count === 0) throw new OrderError(`موجودی «${line.title}» کافی نیست.`);
    }

    if (quote.couponCode) {
      await tx.coupon.update({ where: { code: quote.couponCode }, data: { usedCount: { increment: 1 } } });
    }

    const orderNumber = await nextOrderNumber(tx);
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: "PENDING",
        totalProductAmount: quote.subtotal,
        discountAmount: quote.discount,
        couponCode: quote.couponCode,
        walletCreditUsed: quote.walletUsed,
        shippingFee: quote.shippingFee,
        shippingMethod: quote.shippingMethod,
        payableAmount: quote.payable,
        paymentMethod,
        referrerId: quote.referrer?.id ?? null,
        commissionPercent: quote.commissionPercent,
        commissionAmount: quote.commissionAmount,
        shippingRecipient: shipping.recipient,
        shippingPhone: shipping.phone,
        shippingProvince: shipping.province,
        shippingCity: shipping.city,
        shippingAddress: shipping.address,
        shippingPostalCode: shipping.postalCode,
        customerNote: shipping.note || null,
        salesChannel: salesChannelFor(quote, meta.utm?.source),
        utmSource: meta.utm?.source?.slice(0, 60) || null,
        utmMedium: meta.utm?.medium?.slice(0, 60) || null,
        utmCampaign: meta.utm?.campaign?.slice(0, 80) || null,
        fraudFlags: meta.fraudFlags ?? [],
        items: {
          create: quote.lines.map((l) => ({
            variantId: l.variantId,
            productTitle: l.title,
            sku: l.sku,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            quantity: l.quantity,
            totalPrice: l.totalPrice,
          })),
        },
      },
    });

    if (quote.walletUsed > 0) {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      if (wallet.balance < quote.walletUsed) throw new OrderError("موجودی کیف پول کافی نیست.");
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: quote.walletUsed } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: quote.walletUsed,
          balanceAfter: updatedWallet.balance,
          type: "DEBIT",
          reason: "ORDER_PAYMENT",
          referenceId: created.id,
          description: `پرداخت سفارش ${orderNumber} از کیف پول`,
        },
      });
    }

    return created;
  });

  if (order.payableAmount === 0) {
    await markOrderPaid(order.id, null);
  }
  return order;
}

/**
 * Marks a pending order as paid (after gateway verification or a full wallet payment).
 * Idempotent: calling it twice for the same order does nothing the second time.
 */
export async function markOrderPaid(orderId: string, gatewayRefId: string | null) {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID", paymentStatus: "PAID", paidAt: new Date(), gatewayRefId },
  });
  if (updated.count === 0) return;
  await assignInvoiceNumber(orderId);

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { user: true } });
  await notify("order.paid", {
    userId: order.userId,
    data: { orderNumber: order.orderNumber, amount: order.totalProductAmount - order.discountAmount + order.shippingFee },
  });
  await notify("admin.new_order", {
    data: { orderNumber: order.orderNumber, amount: order.payableAmount + order.walletCreditUsed, customer: order.shippingRecipient },
  });
  if (order.referrerId && order.commissionAmount > 0) {
    await notify("ambassador.commission", {
      ambassadorId: order.referrerId,
      data: { orderNumber: order.orderNumber, commission: order.commissionAmount },
    });
  }
  await checkLowStock(orderId);
}

// شماره صورتحساب پیاپی (سامانه مودیان)؛ تکرار هم‌زمان با قید یکتا رد و دوباره تلاش می‌شود
export async function assignInvoiceNumber(orderId: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { invoiceNumber: true } });
    if (!order || order.invoiceNumber) return;
    const last = await prisma.order.aggregate({ _max: { invoiceNumber: true } });
    try {
      await prisma.order.updateMany({
        where: { id: orderId, invoiceNumber: null },
        data: { invoiceNumber: (last._max.invoiceNumber ?? 0) + 1, invoicedAt: new Date() },
      });
      return;
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
  }
}

async function checkLowStock(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId }, include: { variant: true } });
  for (const item of items) {
    if (item.variant.stock <= item.variant.lowStockAlert) {
      await notify("inventory.low_stock", { data: { sku: item.variant.sku, stock: item.variant.stock } });
    }
  }
}

/**
 * Staff status change (kanban, list or shipping view all call this).
 */
export async function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  actorId: string | null,
  options: { trackingCode?: string | null; note?: string | null; carrier?: CarrierKey | null; restock?: boolean; warehouseId?: string | null } = {}
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("سفارش پیدا نشد.");
  if (order.status === to) return order;
  if (!canTransition(order.status, to)) {
    throw new OrderError("این تغییر وضعیت برای سفارش مجاز نیست.");
  }
  if (to === "SHIPPED" && !(options.trackingCode || order.trackingCode)) {
    throw new OrderError("برای ارسال سفارش، کد رهگیری پست را وارد کنید.");
  }

  const loyaltyOn = await isModuleEnabled("loyalty");
  const pointsPer100k = loyaltyOn ? await getNumberSetting("PURCHASE_POINTS_PER_100K") : 0;
  const pointsExpiry = await pointsExpiryDate();

  const result = await prisma.$transaction(async (tx) => {
    // ارسال: موجودی فیزیکی انبار مبدأ کم می‌شود
    const shipFrom = to === "SHIPPED" ? await resolveWarehouseId(tx, options.warehouseId) : null;
    if (shipFrom) {
      for (const item of await tx.orderItem.findMany({ where: { orderId } })) await moveWarehouseStock(tx, shipFrom, item.variantId, -item.quantity);
    }
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        trackingCode: options.trackingCode ?? order.trackingCode,
        adminNote: options.note ?? order.adminNote,
        ...(to === "SHIPPED" ? { shippedAt: new Date(), shippingCarrier: options.carrier ?? order.shippingCarrier ?? "POST", warehouseId: shipFrom } : {}),
        ...(to === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(to === "PAID" ? { paymentStatus: "PAID" as const, paidAt: order.paidAt ?? new Date() } : {}),
      },
    });

    if (to === "CANCELLED") {
      // بازگشت موجودی و بازگشت مبلغ پرداختی به کیف پول مشتری
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      const refund = order.walletCreditUsed + (order.paymentStatus === "PAID" ? order.payableAmount : 0);
      await creditWallet(tx, order.userId, refund, "ORDER_REFUND", orderId, `بازگشت وجه سفارش لغو شده ${order.orderNumber}`);
    }

    if (to === "DELIVERED") {
      // آزادسازی پورسانت سفیر و امتیاز خرید پس از تحویل
      if (order.referrerId && order.commissionAmount > 0 && !order.commissionReleased) {
        await creditWallet(
          tx,
          order.referrerId,
          order.commissionAmount,
          "REFERRAL_COMMISSION",
          orderId,
          `پورسانت سفارش ${order.orderNumber}`
        );
        await tx.order.update({ where: { id: orderId }, data: { commissionReleased: true } });
      }
      const points = Math.floor((order.totalProductAmount - order.discountAmount) / 100000) * pointsPer100k;
      if (points > 0) {
        await tx.pointTransaction.create({
          data: {
            userId: order.userId,
            orderId,
            points,
            type: "PURCHASE_REWARD",
            status: "RELEASED",
            releasedAt: new Date(),
            expiresAt: pointsExpiry,
            description: `امتیاز خرید سفارش ${order.orderNumber}`,
          },
        });
      }
    }

    if (to === "REFUNDED") {
      // مرجوعی: بازگشت وجه به کیف پول مشتری، برگشت کالا به انبار (اگر سالم رسیده) و ابطال امتیازها
      const refund = order.walletCreditUsed + (order.paymentStatus === "PAID" ? order.payableAmount : 0);
      await creditWallet(tx, order.userId, refund, "ORDER_REFUND", orderId, `بازگشت وجه سفارش مرجوعی ${order.orderNumber}`);
      if (options.restock !== false) {
        const items = await tx.orderItem.findMany({ where: { orderId } });
        // کالای ارسال‌شده به همان انبار مبدأ برمی‌گردد
        const backTo = order.shippedAt ? (order.warehouseId ?? (await defaultWarehouseId(tx))) : null;
        for (const item of items) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
          if (backTo) await moveWarehouseStock(tx, backTo, item.variantId, item.quantity);
        }
      }
      await revokeOrderPoints(tx, orderId);
    }

    if (to === "REFUNDED" && order.commissionReleased && order.referrerId) {
      // پورسانت سفارش مرجوعی از کیف پول سفیر کسر می‌شود
      const wallet = await tx.wallet.findUnique({ where: { userId: order.referrerId } });
      if (wallet) {
        const after = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: order.commissionAmount }, totalEarned: { decrement: order.commissionAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: order.commissionAmount,
            balanceAfter: after.balance,
            type: "DEBIT",
            reason: "ADMIN_ADJUSTMENT",
            referenceId: orderId,
            description: `کسر پورسانت سفارش مرجوعی ${order.orderNumber}`,
          },
        });
      }
    }

    return updated;
  });

  await logAudit(actorId, "order.status", order.orderNumber, { from: order.status, to, trackingCode: options.trackingCode });

  // ارتقای خودکار پله سفیر (و درصد پورسانت سفارش‌های بعدی) بر اساس فروش تحویل‌شده
  if (to === "DELIVERED" && order.referrerId) await refreshAmbassadorTier(order.referrerId);
  // پاداش معرفی دوست (یک سطح، با بررسی تقلب)
  if (to === "DELIVERED") await grantReferralReward(orderId);

  // پایان دوره مصرف برای یادآوری تمدید
  if (to === "DELIVERED" && result.deliveredAt) {
    const due = await refillDueFor(orderId, result.deliveredAt);
    if (due) await prisma.order.update({ where: { id: orderId }, data: { refillDueAt: due } });
  }

  const data = {
    orderNumber: order.orderNumber,
    trackingCode: result.trackingCode ?? "",
    carrier: CARRIERS[(result.shippingCarrier as CarrierKey) ?? "POST"] ?? "پست",
  };
  if (to === "SHIPPED") await notify("order.shipped", { userId: order.userId, data });
  if (to === "DELIVERED") await notify("order.delivered", { userId: order.userId, data });
  if (to === "CANCELLED") await notify("order.cancelled", { userId: order.userId, data });

  return result;
}
