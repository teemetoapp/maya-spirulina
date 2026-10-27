import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorePage from "@/components/storefront/StorePage";
import { getSettings } from "@/lib/settings";
import { isModuleEnabled } from "@/lib/modules/server";
import { parseWholesaleTiers } from "@/lib/commerce/pricing";
import { toPersianDigits } from "@/lib/currency";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خرید عمده اسپیرولینا برای فروشگاه‌ها و باشگاه‌ها | مایا اسپیرولینا",
  description: "همکاری عمده با مایا اسپیرولینا: تخفیف پلکانی برای داروخانه‌ها، فروشگاه‌های مکمل و باشگاه‌های ورزشی.",
};

export default async function WholesaleInfoPage() {
  if (!(await isModuleEnabled("wholesale"))) notFound();
  const s = await getSettings();
  const tiers = parseWholesaleTiers(s.WHOLESALE_TIERS);
  return (
    <StorePage>
      <article className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-sm leading-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-black">خرید عمده برای فروشگاه‌ها و باشگاه‌ها</h1>
          <p className="text-text-muted">داروخانه‌ها، فروشگاه‌های مکمل و باشگاه‌های ورزشی می‌توانند با حساب همکار عمده، با تخفیف پلکانی سفارش بدهند.</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">تخفیف پلکانی</h2>
          <ul className="list-disc pr-5 space-y-1">
            <li>حداقل سفارش عمده: {toPersianDigits(Number(s.WHOLESALE_MIN_QTY) || 0)} عدد (جمع همه اقلام).</li>
            {tiers.map((t) => (
              <li key={t.min}>
                از {toPersianDigits(t.min)} عدد به بالا: {toPersianDigits(t.pct)}٪ تخفیف
              </li>
            ))}
            <li>تخفیف عمده با کد تخفیف جمع نمی‌شود و پورسانت سفیر به آن تعلق نمی‌گیرد.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">چطور همکار عمده شوم؟</h2>
          <ol className="list-decimal pr-5 space-y-1">
            <li>با شماره موبایل وارد سایت شوید.</li>
            <li>یک تیکت با عنوان «درخواست همکاری عمده» بفرستید و نام فروشگاه یا باشگاه، شهر و مجوز کسب را بنویسید.</li>
            <li>پس از بررسی، «پنل عمده» در حساب شما فعال می‌شود.</li>
          </ol>
          <Link href="/portal/my-tickets" className="btn btn-primary text-xs inline-flex mt-2">
            ارسال درخواست همکاری
          </Link>
        </section>
      </article>
    </StorePage>
  );
}
