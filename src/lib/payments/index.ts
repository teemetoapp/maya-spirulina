import prisma from "@/lib/prisma";
import type { Order } from "@prisma/client";

// ==============================================================
// Payment gateway adapter.
//   PAYMENT_GATEWAY_MODE = "production" | "sandbox" (Zarinpal v4) | "mock"
// "mock" opens the built-in test gateway page (/checkout/gateway) and is
// refused in production unless ALLOW_MOCK_PAYMENTS=true (e2e tests only).
// ==============================================================

export type PaymentMode = "production" | "sandbox" | "mock";

export class PaymentError extends Error {}

export function getPaymentMode(): PaymentMode {
  const mode = (process.env.PAYMENT_GATEWAY_MODE || "mock").toLowerCase();
  if (mode === "production" || mode === "sandbox") return mode;
  return "mock";
}

export function isMockPaymentAllowed(): boolean {
  return getPaymentMode() === "mock" && (process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "true");
}

function zarinpalHost(mode: PaymentMode) {
  return mode === "sandbox" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Starts payment for a pending order and returns the URL to send the buyer to.
 */
export async function startPayment(order: Order): Promise<string> {
  const mode = getPaymentMode();

  if (mode === "mock") {
    if (!isMockPaymentAllowed()) throw new PaymentError("درگاه آزمایشی در محیط اصلی غیرفعال است.");
    return `/checkout/gateway?order=${encodeURIComponent(order.orderNumber)}`;
  }

  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  if (!merchantId) throw new PaymentError("شناسه پذیرنده زرین‌پال تنظیم نشده است.");

  const res = await fetch(`${zarinpalHost(mode)}/pg/v4/payment/request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      merchant_id: merchantId,
      amount: order.payableAmount,
      currency: "IRT", // مبالغ پروژه به تومان است
      description: `سفارش ${order.orderNumber} - مایا اسپیرولینا`,
      callback_url: process.env.ZARINPAL_CALLBACK_URL || `${appUrl()}/api/payments/zarinpal/callback`,
      metadata: { mobile: order.shippingPhone, order_id: order.orderNumber },
    }),
  });
  const data = await res.json().catch(() => null);
  const authority: string | undefined = data?.data?.authority;
  if (data?.data?.code !== 100 || !authority) {
    throw new PaymentError("اتصال به درگاه پرداخت برقرار نشد. لطفاً دوباره تلاش کنید.");
  }

  await prisma.order.update({ where: { id: order.id }, data: { gatewayAuthority: authority } });
  return `${zarinpalHost(mode)}/pg/StartPay/${authority}`;
}

/**
 * Verifies a Zarinpal callback. Returns the bank reference id on success.
 */
export async function verifyZarinpal(order: Order, authority: string): Promise<string | null> {
  const mode = getPaymentMode();
  if (mode === "mock" || order.gatewayAuthority !== authority) return null;

  const res = await fetch(`${zarinpalHost(mode)}/pg/v4/payment/verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      merchant_id: process.env.ZARINPAL_MERCHANT_ID,
      amount: order.payableAmount,
      currency: "IRT",
      authority,
    }),
  });
  const data = await res.json().catch(() => null);
  const code = data?.data?.code;
  // 100 = پرداخت موفق، 101 = قبلاً تأیید شده
  return code === 100 || code === 101 ? String(data.data.ref_id) : null;
}
