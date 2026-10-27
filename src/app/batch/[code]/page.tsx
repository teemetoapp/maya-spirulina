import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorePage from "@/components/storefront/StorePage";
import prisma from "@/lib/prisma";
import { isModuleEnabled } from "@/lib/modules/server";
import { formatJalaliShort } from "@/lib/jalali";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "اطلاعات سری تولید | مایا اسپیرولینا", robots: { index: false } };

// صفحه عمومی اسکن QR بسته. فقط داده‌های ثبت‌شده و مستند نمایش داده می‌شود.
export default async function BatchTracePage({ params }: { params: Promise<{ code: string }> }) {
  if (!(await isModuleEnabled("trace"))) notFound();
  const code = decodeURIComponent((await params).code).trim().toUpperCase().slice(0, 40);
  const batch = await prisma.inventoryBatch.findUnique({
    where: { batchCode: code },
    include: { variant: { include: { product: { select: { title: true } } } } },
  });

  const box = (title: string, body: React.ReactNode, tone = "border-border-subtle") => (
    <StorePage>
      <section className="max-w-xl mx-auto px-4 py-14 space-y-5 text-sm leading-7">
        <p className="text-xs text-text-muted font-mono" dir="ltr">{code}</p>
        <div className={`studio-card p-6 space-y-3 border ${tone}`}>
          <h1 className="text-xl font-black">{title}</h1>
          {body}
        </div>
        <Link href="/batch" className="text-xs underline">استعلام کد دیگر</Link>
      </section>
    </StorePage>
  );

  if (!batch) {
    return box(
      "این کد در سامانه مایا ثبت نشده است",
      <>
        <p>کد را دوباره با دقت بررسی کنید. اگر کد درست است، ممکن است بسته اصل نباشد.</p>
        <p>
          لطفاً از مصرف آن خودداری کنید و از طریق <Link href="/#contact" className="underline">راه‌های تماس</Link> به ما خبر دهید.
        </p>
      </>,
      "border-red-500/40"
    );
  }

  const product = `${batch.variant.product.title} - ${batch.variant.title}`;
  if (!batch.isPublic || !batch.labReportUrl) {
    return box(
      "این سری تولید در سامانه مایا ثبت شده است",
      <>
        <p>{product}</p>
        <p>تاریخ تولید: {formatJalaliShort(batch.productionDate)} · انقضا: {formatJalaliShort(batch.expiryDate)}</p>
        <p className="text-text-muted">نتیجه آزمایش این سری هنوز منتشر نشده است. نتایج فقط پس از دریافت برگه رسمی آزمایشگاه اینجا قرار می‌گیرد.</p>
      </>,
      "border-emerald-500/40"
    );
  }

  return box(
    "این سری تولید در سامانه مایا ثبت شده است",
    <>
      <p>{product}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {batch.harvestDate && (
          <>
            <dt className="text-text-muted">برداشت از مزرعه</dt>
            <dd>{formatJalaliShort(batch.harvestDate)}</dd>
          </>
        )}
        <dt className="text-text-muted">تولید</dt>
        <dd>{formatJalaliShort(batch.productionDate)}</dd>
        <dt className="text-text-muted">انقضا</dt>
        <dd>{formatJalaliShort(batch.expiryDate)}</dd>
        {batch.labName && (
          <>
            <dt className="text-text-muted">آزمایشگاه</dt>
            <dd>{batch.labName}</dd>
          </>
        )}
      </dl>
      {batch.labSummary && <p className="whitespace-pre-line">{batch.labSummary}</p>}
      <a href={batch.labReportUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary text-xs inline-flex">
        مشاهده برگه کامل آزمایش
      </a>
      <p className="text-xs text-text-muted">خلاصه بالا از روی همین برگه نوشته شده است؛ مرجع، خود برگه آزمایشگاه است.</p>
    </>,
    "border-emerald-500/40"
  );
}
