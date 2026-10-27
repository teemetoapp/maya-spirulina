"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatToman } from "@/lib/currency";

interface SuccessOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  trackingCode: string | null;
  totalAmount: number;
  walletUsed: number;
  payableAmount: number;
  customerName: string;
  address: string;
  shippingMethodLabel: string;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumberParam = searchParams.get("order") || searchParams.get("orderNumber") || "";

  const [order, setOrder] = useState<SuccessOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumberParam) return;
    fetch(`/api/orders/${encodeURIComponent(orderNumberParam)}`)
      .then((res) => res.json())
      .then((data) => (data.success ? setOrder(data.order) : setLoadError(data.error)))
      .catch(() => setLoadError("ارتباط با سرور برقرار نشد."));
  }, [orderNumberParam]);

  if (loadError || !orderNumberParam) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-sm text-text-muted">{loadError || "شماره سفارش مشخص نیست."}</p>
        <Link href="/portal/my-orders" className="btn btn-primary">سفارش‌های من</Link>
      </div>
    );
  }

  if (!order) {
    return <div className="p-12 text-center text-text-muted text-xs">در حال بارگذاری فاکتور...</div>;
  }

  const isPaid = order.paymentStatus === "PAID";
  const orderNumber = order.orderNumber;
  const trackingCode = order.trackingCode || "پس از ارسال ثبت می‌شود";
  const payableAmount = order.totalAmount;
  const customerName = order.customerName;
  const address = order.address;
  const shippingMethod = order.shippingMethodLabel;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-8 text-right">
      {/* 1. Header Banner */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-4xl mx-auto shadow-xl shadow-emerald-950/40 animate-pulse">
          ✓
        </div>
        <div>
          <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-widest block mb-1">
            MAYA SPIRULINA RECEIPT
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isPaid ? "پرداخت با موفقیت انجام شد و سفارش شما ثبت گردید" : "سفارش شما در انتظار پرداخت است"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-2 max-w-md mx-auto">
            {isPaid
              ? "پیامک تأیید سفارش ارسال شد؛ کد رهگیری پس از ارسال مرسوله پیامک می‌شود."
              : "پرداخت این سفارش تکمیل نشده است."}
          </p>
        </div>
      </div>

      {/* 2. Official Order Receipt Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-bg-card border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-xl dark:shadow-2xl space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">شماره یکتای سفارش:</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-wider mt-0.5">
              {orderNumber}
            </div>
          </div>
          <div className="sm:text-left">
            <div className="text-xs text-slate-500 dark:text-slate-400">کد رهگیری پستی مرسوله:</div>
            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg mt-0.5 inline-block">
              {trackingCode}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block">تحویل‌گیرنده:</span>
            <span className="font-bold text-slate-900 dark:text-white block">{customerName}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block">شیوه ارسال:</span>
            <span className="font-bold text-slate-900 dark:text-white block">{shippingMethod}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1 sm:col-span-2">
            <span className="text-slate-500 dark:text-slate-400 block">نشانی تحویل مرسوله:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 block">{address}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block">وضعیت پرداخت:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>●</span>
              <span>
                {isPaid
                  ? order.paymentMethod === "WALLET"
                    ? "پرداخت شده از کیف پول"
                    : "پرداخت شده"
                  : "پرداخت نشده"}
              </span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block">مبلغ کل پرداخت شده:</span>
            <span className="font-black text-slate-900 dark:text-white font-mono text-sm block">
              {formatToman(payableAmount)}
            </span>
          </div>
        </div>

        {/* Post Packaging Note */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
            BOX
          </div>
          <div>
            <strong className="text-emerald-500 block mb-0.5">بسته‌بندی استاندارد زیستی و محرمانه:</strong>
            سفارش شما در بسته‌بندی محافظ مایا اسپیرولینا قرار گرفته و حداکثر تا ۲۴ ساعت کاری آینده به اداره پست یا پیک تحویل داده خواهد شد.
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
          <Link
            href="/portal/my-orders"
            className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold shadow-md shadow-emerald-500/20 transition text-center cursor-pointer"
          >
            مشاهده سفارش در پنل کاربری ➔
          </Link>
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>چاپ فاکتور رسمی</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition text-center"
          >
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-bg-page dark:text-neutral-100 transition-colors duration-200">
      <Suspense fallback={<div className="p-12 text-center text-slate-500 dark:text-slate-400">در حال بارگذاری فاکتور...</div>}>
        <OrderSuccessContent />
      </Suspense>
    </div>
  );
}
