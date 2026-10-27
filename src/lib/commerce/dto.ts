import { formatJalaliDateTime } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/currency";
import type { Order, OrderItem, User, Review, ReturnRequest } from "@prisma/client";

// Serializable order shape shared by the customer, ambassador and staff views
export interface OrderDTO {
  id: string;
  orderNumber: string;
  status: Order["status"];
  paymentStatus: Order["paymentStatus"];
  paymentMethod: Order["paymentMethod"];
  createdAt: string;
  createdAtIso: string;
  customerName: string;
  customerPhone: string;
  address: string;
  postalCode: string;
  shippingMethod: Order["shippingMethod"];
  shippingMethodLabel: string;
  itemsSummary: string;
  items: { sku: string; title: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingFee: number;
  walletUsed: number;
  payableAmount: number;
  totalAmount: number; // مبلغ نهایی سفارش (پس از تخفیف و با هزینه ارسال)
  trackingCode: string | null;
  referrerName: string | null;
  commissionAmount: number;
  commissionReleased: boolean;
  customerNote: string | null;
  adminNote: string | null;
  carrier: string; // نام شرکت حمل
  carrierKey: string | null;
  deliveredAtIso: string | null;
  invoiceNumber: number | null;
  salesChannel: string | null;
  fraudFlags: string[];
  review: { rating: number; status: Review["status"] } | null;
  returnRequest: { id: string; status: ReturnRequest["status"]; reason: string; details: string | null; adminNote: string | null; createdAt: string } | null;
}

export const CARRIER_LABELS: Record<string, string> = { POST: "پست", TIPAX: "تیپاکس", COURIER: "پیک", OTHER: "باربری" };
export const RETURN_STATUS_LABELS: Record<ReturnRequest["status"], string> = {
  REQUESTED: "در انتظار بررسی",
  APPROVED: "تأیید شد؛ کالا را ارسال کنید",
  REJECTED: "رد شد",
  REFUNDED: "مبلغ به کیف پول برگشت",
};

export function toOrderDTO(
  order: Order & { items: OrderItem[]; referrer?: Pick<User, "name"> | null; review?: Review | null; returnRequest?: ReturnRequest | null }
): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    createdAt: formatJalaliDateTime(order.createdAt),
    createdAtIso: order.createdAt.toISOString(),
    customerName: order.shippingRecipient,
    customerPhone: order.shippingPhone,
    address: `${order.shippingProvince}، ${order.shippingCity}، ${order.shippingAddress}`,
    postalCode: order.shippingPostalCode,
    shippingMethod: order.shippingMethod,
    shippingMethodLabel: order.shippingMethod === "EXPRESS" ? "پیک اکسپرس" : "پست پیشتاز",
    itemsSummary: order.items.map((i) => `${toPersianDigits(i.quantity)} × ${i.productTitle}`).join(" + "),
    items: order.items.map((i) => ({
      sku: i.sku,
      title: i.productTitle,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
    })),
    subtotal: order.totalProductAmount,
    discountAmount: order.discountAmount,
    couponCode: order.couponCode,
    shippingFee: order.shippingFee,
    walletUsed: order.walletCreditUsed,
    payableAmount: order.payableAmount,
    totalAmount: order.totalProductAmount - order.discountAmount + order.shippingFee,
    trackingCode: order.trackingCode,
    referrerName: order.referrer?.name ?? null,
    commissionAmount: order.commissionAmount,
    commissionReleased: order.commissionReleased,
    customerNote: order.customerNote,
    adminNote: order.adminNote,
    carrier: CARRIER_LABELS[order.shippingCarrier ?? "POST"] ?? "پست",
    carrierKey: order.shippingCarrier,
    deliveredAtIso: order.deliveredAt?.toISOString() ?? null,
    invoiceNumber: order.invoiceNumber,
    salesChannel: order.salesChannel,
    fraudFlags: order.fraudFlags,
    review: order.review ? { rating: order.review.rating, status: order.review.status } : null,
    returnRequest: order.returnRequest
      ? {
          id: order.returnRequest.id,
          status: order.returnRequest.status,
          reason: order.returnRequest.reason,
          details: order.returnRequest.details,
          adminNote: order.returnRequest.adminNote,
          createdAt: formatJalaliDateTime(order.returnRequest.createdAt),
        }
      : null,
  };
}

export const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت شده",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
  REFUNDED: "مرجوع شده",
};

export const ORDER_STATUS_BADGE: Record<Order["status"], string> = {
  PENDING: "badge-status-neutral",
  PAID: "badge-status-info",
  PROCESSING: "badge-status-info",
  SHIPPED: "badge-status-warning",
  DELIVERED: "badge-status-success",
  CANCELLED: "badge-status-danger",
  REFUNDED: "badge-status-danger",
};

// مسیرهای مجاز تغییر وضعیت (سرور و رابط کاربری از یک منبع می‌خوانند)
//   PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
//        ↘ CANCELLED (قبل از ارسال)          DELIVERED → REFUNDED
export const ORDER_TRANSITIONS: Record<Order["status"], Order["status"][]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};
