import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import StorePage from "@/components/storefront/StorePage";
import { isModuleEnabled } from "@/lib/modules/server";
import { toEnglishDigits } from "@/lib/currency";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "استعلام سری تولید | مایا اسپیرولینا", robots: { index: false } };

export default async function BatchLookupPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (!(await isModuleEnabled("trace"))) notFound();
  const code = toEnglishDigits((await searchParams).code ?? "").trim().toUpperCase();
  if (code) redirect(`/batch/${encodeURIComponent(code.slice(0, 40))}`);
  return (
    <StorePage>
      <section className="max-w-md mx-auto px-4 py-16 space-y-4 text-sm">
        <h1 className="text-2xl font-black">استعلام سری تولید</h1>
        <p className="text-text-muted leading-7">QR روی بسته را اسکن کنید یا کد سری (بچ) چاپ‌شده روی بسته را وارد کنید.</p>
        <form method="get" className="flex gap-2">
          <input name="code" required dir="ltr" aria-label="کد سری تولید" placeholder="B-1405-01" className="input flex-1 font-mono" />
          <button type="submit" className="btn btn-primary text-xs">استعلام</button>
        </form>
      </section>
    </StorePage>
  );
}
