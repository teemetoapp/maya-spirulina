"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatToman, toPersianDigits, toEnglishDigits } from "@/lib/currency";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE, RETURN_STATUS_LABELS } from "@/lib/commerce/dto";
import { LOYALTY_TIERS } from "@/lib/portal/labels";
import type { CustomerData } from "@/lib/portal/customer-data";
import type { OrderDTO } from "@/lib/commerce/dto";
import { apiCall, PageTitle, Notice } from "@/components/portal/ui";
import SectionTabs from "@/components/portal/SectionTabs";
import { PROFILE_FIELDS, GENDER_LABELS } from "@/lib/crm/profile-fields";

// ==============================================================
// Customer area of the unified portal. Each sidebar item renders one
// view; all data comes from the database (loadCustomerData) and every
// change goes through /api/portal/* followed by router.refresh().
// ==============================================================

export type CustomerView = "home" | "my-orders" | "wallet" | "addresses" | "profile";

const STATUS_BADGE = ORDER_STATUS_BADGE;

async function postJson(url: string, method: "GET" | "POST" | "PATCH" | "DELETE", body: unknown) {
  return apiCall(url, method, body);
}

const RETURN_REASONS = ["کالا آسیب دیده رسید", "کالای اشتباه ارسال شد", "تاریخ انقضا نزدیک یا گذشته", "مشکل کیفیت یا طعم", "پشیمان شدم (بسته باز نشده)", "سایر"];

// نظرسنجی بعد از تحویل و درخواست مرجوعی، زیر هر سفارش تحویل‌شده
function OrderActions({ order, rules, features, openReview }: { order: OrderDTO; rules: CustomerData["rules"]; features: CustomerData["features"]; openReview: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"review" | "return" | null>(openReview && !order.review ? "review" : null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [publish, setPublish] = useState(true);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "danger"; text: string } | null>(null);
  const delivered = order.status === "DELIVERED";
  const [now] = useState(() => Date.now());
  const inWindow = !!order.deliveredAtIso && now - new Date(order.deliveredAtIso).getTime() <= rules.returnWindowDays * 86_400_000;

  const send = async (url: string, payload: unknown) => {
    setBusy(true);
    const res = await postJson(url, "POST", payload);
    setBusy(false);
    setMessage(res.success ? { kind: "success", text: res.message ?? "ثبت شد." } : { kind: "danger", text: res.error ?? "خطا" });
    if (res.success) {
      setMode(null);
      router.refresh();
    }
  };

  const showInvoice = features.invoice && order.invoiceNumber && order.status !== "PENDING" && order.status !== "CANCELLED";
  const canReview = features.reviews && delivered && !order.review;
  const canReturn = delivered && !order.returnRequest && inWindow;
  if (!showInvoice && !canReview && !canReturn && !order.returnRequest && !message) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-border-hairline text-xs">
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {order.returnRequest && (
        <p>
          مرجوعی: <strong>{RETURN_STATUS_LABELS[order.returnRequest.status]}</strong>
          {order.returnRequest.adminNote && <span className="text-text-muted"> · {order.returnRequest.adminNote}</span>}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {showInvoice && (
          <a href={`/invoice/${order.orderNumber}`} target="_blank" className="btn btn-ghost border border-border-hairline h-8 text-[11px]">
            صورتحساب رسمی
          </a>
        )}
        {canReview && (
          <button type="button" className="btn btn-primary h-8 text-[11px]" onClick={() => setMode(mode === "review" ? null : "review")}>
            از این خرید راضی بودید؟
          </button>
        )}
        {canReturn && (
          <button type="button" className="btn btn-ghost h-8 text-[11px] text-text-muted" onClick={() => setMode(mode === "return" ? null : "return")}>
            درخواست مرجوعی
          </button>
        )}
        {order.review && <span className="text-text-muted self-center">امتیاز شما: {"★".repeat(order.review.rating)}</span>}
      </div>

      {mode === "review" && (
        <form
          className="space-y-2 rounded-lg bg-bg-subtle p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send("/api/portal/reviews", { orderNumber: order.orderNumber, rating, body, publish });
          }}
        >
          <div className="flex gap-1" dir="ltr" role="radiogroup" aria-label="امتیاز رضایت">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} از ۵`} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-brand-gold" : "text-text-subtle"}`}>
                ★
              </button>
            ))}
          </div>
          <textarea className="input w-full min-h-20 text-xs" maxLength={1000} placeholder="تجربه‌تان از محصول، ارسال یا پشتیبانی (اختیاری)" value={body} onChange={(e) => setBody(e.target.value)} />
          {body.trim() && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="accent-emerald-500" />
              اجازه می‌دهم نظرم با نام کوچک و برچسب «خرید تأییدشده» در سایت نمایش داده شود.
            </label>
          )}
          <button className="btn btn-primary text-xs" disabled={busy || !rating}>ثبت نظر</button>
        </form>
      )}

      {mode === "return" && (
        <form
          className="space-y-2 rounded-lg bg-bg-subtle p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send("/api/portal/returns", { orderNumber: order.orderNumber, reason, details });
          }}
        >
          <p className="text-text-muted">تا {toPersianDigits(rules.returnWindowDays)} روز پس از تحویل. پس از دریافت کالا، مبلغ به کیف پول شما برمی‌گردد.</p>
          <select className="input w-full text-xs" value={reason} onChange={(e) => setReason(e.target.value)} required aria-label="دلیل مرجوعی">
            <option value="">دلیل مرجوعی را انتخاب کنید</option>
            {RETURN_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <textarea className="input w-full min-h-16 text-xs" maxLength={1000} placeholder="توضیح (اختیاری)" value={details} onChange={(e) => setDetails(e.target.value)} />
          <button className="btn btn-primary text-xs" disabled={busy || !reason}>ثبت درخواست</button>
        </form>
      )}
    </div>
  );
}

export function OrderCard({ order, data, openReview = false }: { order: OrderDTO; data?: CustomerData; openReview?: boolean }) {
  return (
    <div className="studio-card p-5 space-y-4" id={`order-${order.orderNumber}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-accent-primary font-mono">{order.orderNumber}</span>
            <span className={`badge-status ${STATUS_BADGE[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
          </div>
          <span className="text-[11px] text-text-muted block mt-1">ثبت سفارش: {order.createdAt}</span>
        </div>
        <div className="sm:text-left">
          <span className="text-xs text-text-muted block">مبلغ سفارش:</span>
          <span className="text-base font-black font-mono">{formatToman(order.totalAmount)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-text-muted block mb-1">اقلام:</span>
          <span className="font-semibold block">{order.itemsSummary}</span>
        </div>
        <div>
          <span className="text-text-muted block mb-1">آدرس ارسال ({order.shippingMethodLabel}):</span>
          <span className="block truncate">{order.address}</span>
        </div>
      </div>

      {order.status === "PENDING" && (
        <p className="text-[11px] text-text-muted">
          پرداخت این سفارش تکمیل نشده است. سفارش‌های پرداخت‌نشده پس از مدتی به‌طور خودکار لغو می‌شوند.
        </p>
      )}

      {order.trackingCode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-accent-soft p-3 rounded-lg border border-accent-border">
          <span className="text-xs">
            کد رهگیری {order.carrier}: <strong className="font-mono text-accent-primary">{order.trackingCode}</strong>
          </span>
          {(order.carrierKey ?? "POST") === "POST" && (
            <a
              href={`https://tracking.post.ir/?id=${order.trackingCode}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary h-8 text-[11px] self-start sm:self-auto"
            >
              رهگیری در سامانه پست
            </a>
          )}
        </div>
      )}

      {data && <OrderActions order={order} rules={data.rules} features={data.features} openReview={openReview} />}

    </div>
  );
}

// کارت «تا پایان دوره مصرف» (ماژول یادآوری تمدید)
function RefillCard({ refill }: { refill: NonNullable<CustomerData["refill"]> }) {
  const used = Math.min(100, Math.max(0, Math.round(((refill.totalDays - Math.max(0, refill.daysLeft)) / refill.totalDays) * 100)));
  const urgent = refill.daysLeft <= 7;
  return (
    <div className={`studio-card p-5 space-y-3 ${urgent ? "border-accent-primary" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-bold text-accent-primary">دوره مصرف شما</span>
          <p className="text-sm font-black">
            {refill.daysLeft > 0 ? <>{toPersianDigits(refill.daysLeft)} روز تا پایان بسته</> : "بسته شما احتمالاً تمام شده است"}
          </p>
          <p className="text-[11px] text-text-muted">
            {refill.product} · سفارش {refill.orderNumber} · پایان: {refill.dueDate}
          </p>
        </div>
        <Link href={refill.reorderHref} className={`btn text-xs ${urgent ? "btn-primary" : "btn-outline"}`}>
          سفارش دوباره
        </Link>
      </div>
      <div className="w-full h-2 rounded-full bg-bg-subtle overflow-hidden" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-accent-primary rounded-full" style={{ width: `${used}%` }} />
      </div>
      <p className="text-[11px] text-text-subtle">برای نتیجه بهتر، مصرف را بدون وقفه ادامه دهید. چند روز قبل از تمام شدن، پیامک یادآوری هم برایتان می‌آید.</p>
    </div>
  );
}

function HomeView({ data }: { data: CustomerData }) {
  const tierIndex = LOYALTY_TIERS.reduce((acc, t, i) => (data.totalSpent >= t.min ? i : acc), 0);
  const tier = LOYALTY_TIERS[tierIndex];
  const next = LOYALTY_TIERS[tierIndex + 1];
  const progress = next ? Math.min(100, Math.round(((data.totalSpent - tier.min) / (next.min - tier.min)) * 100)) : 100;
  const activeOrders = data.orders.filter((o) => ["PAID", "PROCESSING", "SHIPPED"].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="studio-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-accent-soft border border-accent-border flex items-center justify-center text-accent-primary text-xl font-black">
            {data.name ? data.name[0] : "M"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-black">{data.name || "عضو باشگاه مایا"}</h1>
              <span className="badge-status badge-status-success">سطح {tier.label}</span>
            </div>
            <p className="text-xs text-text-muted font-mono">{toPersianDigits(data.phone)}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-border-hairline space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">
              {next ? (
                <>
                  پیشرفت تا سطح <strong className="text-accent-primary">{next.label}</strong>
                </>
              ) : (
                "شما در بالاترین سطح باشگاه هستید"
              )}
            </span>
            {next && (
              <span className="text-text-subtle text-[11px]">
                {formatToman(next.min - data.totalSpent)} خرید دیگر
              </span>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-bg-subtle overflow-hidden">
            <div className="h-full bg-accent-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {data.refill && <RefillCard refill={data.refill} />}

      <div className={`grid grid-cols-1 gap-4 ${data.features.loyalty ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <Link href="/portal/wallet" className="studio-card-interactive p-5 space-y-2 block">
          <span className="text-xs font-bold text-accent-primary">کیف پول</span>
          <div className="text-2xl font-black font-mono">{formatToman(data.walletBalance)}</div>
          <p className="text-[11px] text-text-muted">قابل استفاده هنگام پرداخت سفارش</p>
        </Link>
        {data.features.loyalty && (
        <Link href="/portal/wallet?tab=points" className="studio-card-interactive p-5 space-y-2 block">
          <span className="text-xs font-bold text-accent-primary">امتیاز وفاداری</span>
          <div className="text-2xl font-black font-mono">
            {toPersianDigits(data.points)} <span className="text-xs font-normal text-text-muted">امتیاز</span>
          </div>
          <p className="text-[11px] text-text-muted">
            هر امتیاز = {formatToman(data.rules.pointsToToman)} اعتبار
          </p>
        </Link>
        )}
        <Link href="/portal/my-orders" className="studio-card-interactive p-5 space-y-2 block">
          <span className="text-xs font-bold text-text-muted">سفارش‌های در جریان</span>
          <div className="text-2xl font-black font-mono">
            {toPersianDigits(activeOrders.length)} <span className="text-xs font-normal text-text-muted">سفارش</span>
          </div>
          <p className="text-[11px] text-text-muted">از {toPersianDigits(data.orders.length)} سفارش ثبت‌شده</p>
        </Link>
      </div>

      {data.features.consultation && (
        <Link href="/portal/my-consultations" className="studio-card-interactive p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-accent-primary">مشاوره تغذیه رایگان</span>
            <p className="text-[11px] text-text-muted">سؤال درباره مصرف اسپیرولینا، دوز مناسب یا رژیم دارید؟ از مشاور تغذیه مایا بپرسید.</p>
          </div>
          <span className="btn btn-outline text-xs shrink-0">درخواست مشاوره</span>
        </Link>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-bold">آخرین سفارش‌ها</h2>
        {data.orders.length === 0 ? (
          <div className="studio-card p-6 text-center text-xs text-text-muted space-y-3">
            <p>هنوز سفارشی ثبت نکرده‌اید.</p>
            <Link href="/#order" className="btn btn-primary">
              خرید اسپیرولینا مایا
            </Link>
          </div>
        ) : (
          data.orders.slice(0, 3).map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>
    </div>
  );
}

function OrdersView({ data }: { data: CustomerData }) {
  // لینک پیامک نظرسنجی: /portal/my-orders?review=ORD-...
  const reviewFor = useSearchParams()?.get("review") ?? null;
  return (
    <div className="space-y-4">
      <PageTitle title="سفارش‌های من" subtitle={`${toPersianDigits(data.orders.length)} سفارش ثبت شده`} />
      {data.orders.length === 0 ? (
        <div className="studio-card p-6 text-center text-xs text-text-muted">هنوز سفارشی ثبت نکرده‌اید.</div>
      ) : (
        data.orders.map((o) => <OrderCard key={o.id} order={o} data={data} openReview={o.orderNumber === reviewFor} />)
      )}
    </div>
  );
}

function WalletView({ data }: { data: CustomerData }) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-text-muted">پورسانت، بازگشت وجه و تبدیل امتیاز به این کیف پول واریز می‌شود.</p>
      <div className="studio-card p-6">
        <span className="text-xs text-accent-primary font-bold block mb-1">موجودی قابل استفاده</span>
        <div className="text-3xl font-black font-mono">{formatToman(data.walletBalance)}</div>
      </div>

      <div className="studio-card overflow-x-auto">
        <table className="w-full text-xs text-right min-w-[560px]">
          <thead className="bg-bg-subtle border-b border-border-hairline text-text-muted font-bold">
            <tr>
              <th className="py-3 px-4">شرح تراکنش</th>
              <th className="py-3 px-4 text-center">نوع</th>
              <th className="py-3 px-4">مبلغ</th>
              <th className="py-3 px-4">تاریخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)]">
            {data.transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-text-muted">
                  هنوز تراکنشی ثبت نشده است.
                </td>
              </tr>
            )}
            {data.transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="py-3 px-4 font-medium">{tx.title}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`badge-status ${tx.type === "CREDIT" ? "badge-status-success" : "badge-status-danger"}`}>
                    {tx.type === "CREDIT" ? "واریز" : "برداشت"}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono font-bold">
                  {tx.type === "CREDIT" ? "+" : "-"} {formatToman(tx.amount)}
                </td>
                <td className="py-3 px-4 text-text-muted text-[11px]">{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PointsView({ data }: { data: CustomerData }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const canRedeem = data.points >= data.rules.minPointsToRedeem && data.points > 0;

  const redeem = async () => {
    setBusy(true);
    const res = await postJson("/api/portal/points/redeem", "POST", {});
    setBusy(false);
    setMessage(res.success ? { kind: "success", text: res.message ?? "" } : { kind: "danger", text: res.error ?? "خطا" });
    if (res.success) router.refresh();
  };

  return (
    <div className="space-y-6">
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="studio-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-accent-primary font-bold block mb-1">امتیاز فعال</span>
            <div className="text-3xl font-black font-mono">
              {toPersianDigits(data.points)} <span className="text-sm font-normal text-text-muted">امتیاز</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              ارزش فعلی: {formatToman(data.points * data.rules.pointsToToman)}
            </p>
          </div>
          <button type="button" onClick={redeem} disabled={!canRedeem || busy} className="btn btn-primary disabled:opacity-50">
            تبدیل همه امتیازها به اعتبار کیف پول
          </button>
        </div>
        <p className="text-xs text-text-muted leading-relaxed pt-3 border-t border-border-hairline">
          به ازای هر ۱۰۰ هزار تومان خرید تحویل‌شده {toPersianDigits(data.rules.pointsPer100k)} امتیاز می‌گیرید. حداقل امتیاز
          قابل تبدیل {toPersianDigits(data.rules.minPointsToRedeem)} است.
          {data.rules.pointsExpiryDays > 0 && ` هر امتیاز ${toPersianDigits(data.rules.pointsExpiryDays)} روز پس از دریافت منقضی می‌شود.`}
          {data.rules.referralPoints > 0 &&
            ` با معرفی دوستان (کد شما: ${data.referralCode}) پس از تحویل اولین خریدشان ${toPersianDigits(data.rules.referralPoints)} امتیاز می‌گیرید.`}{" "}
          <Link href="/club-rules" className="text-accent-primary underline">قوانین کامل باشگاه</Link>
        </p>
      </div>

      <div className="studio-card divide-y divide-[var(--border-hairline)]">
        {data.pointHistory.length === 0 && <p className="p-5 text-xs text-text-muted text-center">هنوز امتیازی نگرفته‌اید.</p>}
        {data.pointHistory.map((p) => (
          <div key={p.id} className="p-4 flex items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-[11px] text-text-subtle mt-0.5">{p.date}</p>
            </div>
            <span className={`font-mono font-bold ${p.points >= 0 ? "text-accent-primary" : "text-text-muted"}`}>
              {p.points >= 0 ? "+" : ""}
              {toPersianDigits(p.points)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-bg-page border border-border-hairline outline-none focus:border-accent-primary focus-visible:ring-2 focus-visible:ring-accent-primary/20 transition text-xs";

function AddressesView({ data }: { data: CustomerData }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", recipient: data.name ?? "", phone: data.phone, province: "تهران", city: "تهران", address: "", postalCode: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await postJson("/api/portal/addresses", "POST", { ...form, postalCode: toEnglishDigits(form.postalCode), phone: toEnglishDigits(form.phone) });
    if (!res.success) return setError(res.error ?? "خطا");
    setIsOpen(false);
    setForm({ ...form, title: "", address: "", postalCode: "" });
    router.refresh();
  };

  const act = async (id: string, action: "default" | "delete") => {
    await postJson(`/api/portal/addresses`, action === "delete" ? "DELETE" : "PATCH", { id });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <PageTitle
        title="نشانی‌ها"
        action={
          <button type="button" onClick={() => setIsOpen(true)} className="btn btn-primary">
            + افزودن نشانی
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.addresses.length === 0 && (
          <div className="studio-card p-6 text-center text-xs text-text-muted md:col-span-2">نشانی ذخیره‌شده‌ای ندارید.</div>
        )}
        {data.addresses.map((addr) => (
          <div key={addr.id} className="studio-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{addr.title}</span>
              {addr.isDefault && <span className="badge-status badge-status-success">پیش‌فرض</span>}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {addr.recipient} — {addr.province}، {addr.city}، {addr.address}
            </p>
            <div className="flex items-center justify-between text-[11px] text-text-subtle font-mono">
              <span>کد پستی: {toPersianDigits(addr.postalCode)}</span>
              <span className="flex gap-3">
                {!addr.isDefault && (
                  <button type="button" onClick={() => act(addr.id, "default")} className="hover:text-accent-primary">
                    پیش‌فرض شود
                  </button>
                )}
                <button type="button" onClick={() => act(addr.id, "delete")} className="hover:text-rose-500">
                  حذف
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="w-full max-w-md bg-bg-card border border-border-hairline rounded-xl p-6 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h3 className="text-sm font-bold">افزودن نشانی جدید</h3>
              <button type="button" onClick={() => setIsOpen(false)} className="text-text-subtle p-1" aria-label="بستن">
                ✕
              </button>
            </div>
            {error && <Notice kind="danger">{error}</Notice>}
            <input required placeholder="عنوان (منزل، محل کار)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="نام گیرنده" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} className={inputClass} />
              <input required dir="ltr" placeholder="09123456789" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              <input required placeholder="استان" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={inputClass} />
              <input required placeholder="شهر" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
            </div>
            <textarea required rows={2} placeholder="خیابان، کوچه، پلاک، واحد" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputClass} resize-none`} />
            <input required dir="ltr" placeholder="کد پستی ۱۰ رقمی" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className={inputClass} />
            <button type="submit" className="btn btn-primary w-full">ثبت نشانی</button>
          </form>
        </div>
      )}
    </div>
  );
}

function ProfileView({ data }: { data: CustomerData }) {
  const router = useRouter();
  const [form, setForm] = useState(data.profile);
  const [message, setMessage] = useState<{ kind: "success" | "danger"; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { extra, ...rest } = form;
    const res = await postJson("/api/portal/profile", "PATCH", {
      ...rest,
      ...extra,
      landline: toEnglishDigits(extra.landline ?? ""),
      nationalCode: toEnglishDigits(form.nationalCode),
      birthDate: toEnglishDigits(form.birthDate),
    });
    setMessage(res.success ? { kind: "success", text: "مشخصات شما ذخیره شد." } : { kind: "danger", text: res.error ?? "خطا" });
    if (res.success) router.refresh();
  };

  const toggle = (key: "notifySms" | "notifyTelegram" | "notifyEmail" | "smsConsent", label: string, hint?: React.ReactNode) => (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-border-hairline cursor-pointer">
      <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="mt-0.5 accent-emerald-500" />
      <span>
        <span className="font-semibold block">{label}</span>
        {hint && <span className="text-[11px] text-text-muted block mt-0.5">{hint}</span>}
      </span>
    </label>
  );

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <PageTitle title="پروفایل و اعلان‌ها" />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <div className="studio-card p-6 space-y-4 text-xs">
        <h2 className="text-sm font-bold">اطلاعات حساب</h2>
        <div>
          <label className="block font-semibold mb-1.5">نام و نام خانوادگی</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1.5">شماره همراه (شناسه ورود)</label>
            <input disabled dir="ltr" value={data.phone} className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block font-semibold mb-1.5">ایمیل (برای فاکتور)</label>
            <input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block font-semibold mb-1.5">کد ملی</label>
            <input dir="ltr" value={form.nationalCode} onChange={(e) => setForm({ ...form, nationalCode: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block font-semibold mb-1.5">تاریخ تولد</label>
            <input dir="ltr" placeholder="1370/01/01" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="studio-card p-6 space-y-4 text-xs">
        <div>
          <h2 className="text-sm font-bold">اطلاعات تکمیلی</h2>
          <p className="text-[11px] text-text-muted mt-1">به ما کمک می‌کند پیشنهادها و پشتیبانی دقیق‌تری به شما بدهیم.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1.5">جنسیت</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputClass}>
              <option value="">انتخاب کنید</option>
              {Object.entries(GENDER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {PROFILE_FIELDS.map((f) => (
            <div key={f.key} className={f.wide || f.key === "company" ? "sm:col-span-2" : ""}>
              <label className="block font-semibold mb-1.5">{f.label}</label>
              {f.options ? (
                <select value={form.extra[f.key] ?? ""} onChange={(e) => setForm({ ...form, extra: { ...form.extra, [f.key]: e.target.value } })} className={inputClass}>
                  <option value="">انتخاب کنید</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  dir={f.ltr ? "ltr" : undefined}
                  maxLength={f.max}
                  placeholder={f.placeholder}
                  value={form.extra[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, extra: { ...form.extra, [f.key]: e.target.value } })}
                  className={inputClass}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="studio-card p-6 space-y-3 text-xs">
        <h2 className="text-sm font-bold">کانال‌های دریافت اعلان</h2>
        {toggle("notifySms", "پیامک", "وضعیت سفارش و کد رهگیری")}
        {toggle("smsConsent", "پیامک تخفیف و جشنواره", "اختیاری؛ با ارسال «۱۱» به خط تبلیغاتی هم لغو می‌شود.")}
        {toggle("notifyEmail", "ایمیل", form.email ? "فاکتور و اطلاع‌رسانی سفارش" : "برای فعال‌شدن، ایمیل خود را وارد کنید")}
        {toggle(
          "notifyTelegram",
          "تلگرام",
          data.profile.telegramLinked ? (
            "حساب تلگرام شما متصل است."
          ) : data.telegramLink ? (
            <>
              ابتدا{" "}
              <a href={data.telegramLink} target="_blank" rel="noreferrer" className="text-accent-primary underline">
                ربات مایا را در تلگرام باز کنید
              </a>{" "}
              و دکمه Start را بزنید.
            </>
          ) : (
            "اتصال تلگرام هنوز توسط مدیر فعال نشده است."
          )
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary">ذخیره تغییرات</button>
      </div>
    </form>
  );
}

function WalletAndPoints({ data }: { data: CustomerData }) {
  return (
    <div className="space-y-5">
      <PageTitle title="کیف پول و امتیاز" />
      <SectionTabs
        tabs={[
          { id: "wallet", label: "کیف پول", content: <WalletView data={data} /> },
          { id: "points", label: "امتیاز وفاداری", content: <PointsView data={data} /> },
        ]}
      />
    </div>
  );
}

export default function CustomerArea({ view, data }: { view: CustomerView; data: CustomerData }) {
  switch (view) {
    case "home":
      return <HomeView data={data} />;
    case "my-orders":
      return <OrdersView data={data} />;
    case "wallet":
      return <WalletAndPoints data={data} />;
    case "addresses":
      return <AddressesView data={data} />;
    case "profile":
      return <ProfileView data={data} />;
  }
}
