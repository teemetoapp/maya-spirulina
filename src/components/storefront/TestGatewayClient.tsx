"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatToman } from "@/lib/currency";

interface PendingOrder {
  orderNumber: string;
  payableAmount: number;
  customerName: string;
  itemsSummary: string;
  status: string;
}

// Test payment gateway (PAYMENT_GATEWAY_MODE=mock). In production the buyer
// is redirected to the real gateway (Zarinpal) instead of this page.
export default function TestGatewayClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";

  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    fetch(`/api/orders/${encodeURIComponent(orderNumber)}`)
      .then((res) => res.json())
      .then((data) => (data.success ? setOrder(data.order) : setError(data.error)))
      .catch(() => setError("ارتباط با سرور برقرار نشد."));
  }, [orderNumber]);

  const submit = async (action: "pay" | "cancel") => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, action }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "خطا در پرداخت آزمایشی.");
        setIsProcessing(false);
        return;
      }
      router.push(data.redirectUrl);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex items-center justify-center px-4 py-12">
      <div className="studio-card w-full max-w-md p-6 space-y-5">
        <div className="badge-status badge-status-warning">درگاه آزمایشی — بدون تراکنش واقعی</div>
        <div>
          <h1 className="text-lg font-black">پرداخت سفارش</h1>
          <p className="text-xs text-text-muted mt-1">
            این صفحه فقط در حالت آزمایشی (<span dir="ltr">PAYMENT_GATEWAY_MODE=mock</span>) نمایش داده می‌شود.
          </p>
        </div>

        {error && <div className="badge-status badge-status-danger w-full py-2">{error}</div>}

        {order ? (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">شماره سفارش</span>
              <span className="font-mono font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">اقلام</span>
              <span className="text-left">{order.itemsSummary}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border-hairline">
              <span className="text-text-muted">مبلغ قابل پرداخت</span>
              <span className="font-black text-base text-accent-primary">{formatToman(order.payableAmount)}</span>
            </div>
          </div>
        ) : (
          !error && <p className="text-xs text-text-muted">در حال بارگذاری سفارش…</p>
        )}

        {order?.status === "PENDING" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => submit("pay")}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              پرداخت موفق
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => submit("cancel")}
              className="btn btn-outline w-full disabled:opacity-50"
            >
              انصراف از پرداخت
            </button>
          </div>
        )}

        {order && order.status !== "PENDING" && (
          <Link href={`/checkout/success?order=${order.orderNumber}`} className="btn btn-primary w-full">
            مشاهده وضعیت سفارش
          </Link>
        )}
      </div>
    </div>
  );
}
