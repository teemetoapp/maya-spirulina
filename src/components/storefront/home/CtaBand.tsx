import Link from "next/link";

// دعوت به همکاری: سفیر برند و خرید عمده
export default function CtaBand({ ambassadors, wholesale }: { ambassadors: boolean; wholesale: boolean }) {
  if (!ambassadors && !wholesale) return null;
  return (
    <section className="py-14 sm:py-20 bg-bg-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-4 md:grid-cols-2">
        {ambassadors && (
          <div className="rounded-2xl bg-accent-deep p-8 text-white space-y-4">
            <h2 className="text-xl sm:text-2xl font-black">سفیر مایا شوید</h2>
            <p className="text-sm leading-7 text-white/85">مایا را به دیگران معرفی کنید و از هر خرید با لینک شما پورسانت بگیرید.</p>
            <Link href="/portal/become-ambassador" className="btn bg-white text-accent-deep hover:bg-white/90 px-5 py-2.5 text-sm font-bold">درخواست همکاری</Link>
          </div>
        )}
        {wholesale && (
          <div className="rounded-2xl border border-border-hairline bg-bg-card p-8 space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-text-main">خرید عمده</h2>
            <p className="text-sm leading-7 text-text-muted">برای داروخانه‌ها، فروشگاه‌ها و باشگاه‌های ورزشی با تخفیف پلکانی.</p>
            <Link href="/wholesale" className="btn btn-outline px-5 py-2.5 text-sm">شرایط همکاری عمده</Link>
          </div>
        )}
      </div>
    </section>
  );
}
