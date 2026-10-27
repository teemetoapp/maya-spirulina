import Image from "next/image";

export default function Hero({ license, trace }: { license: string; trace: boolean }) {
  const points = [license && `شیلات: ${license}`, "ارسال به سراسر ایران", trace ? "استعلام سری تولید با QR روی بسته" : "اطلاعات تولید شفاف"].filter(Boolean) as string[];
  return (
    <section className="bg-bg-page border-b border-border-hairline">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid items-center gap-10 md:grid-cols-2">
        <div className="space-y-6 text-center md:text-right">
          <p className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-deep dark:text-accent-primary">مستقیم از مزرعه آفرینش مایا</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-text-main">
            اسپیرولینای مایا؛ <span className="text-accent-deep dark:text-accent-primary">از مزرعه تا خانه شما</span>
          </h1>
          <p className="text-base sm:text-lg leading-8 text-text-muted max-w-xl mx-auto md:mx-0">
            پودر و کپسول اسپیرولینا، کشت و فرآوری‌شده در مزرعه خودمان. اطلاعات تولید هر سری و وضعیت مجوزها را شفاف منتشر می‌کنیم.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <a href="#order" className="btn btn-primary px-6 py-3 text-sm">خرید محصول</a>
            <a href="#farm" className="btn btn-outline px-6 py-3 text-sm">آشنایی با مزرعه</a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 justify-center md:justify-start text-xs sm:text-sm text-text-muted">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-accent-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
          <div className="absolute inset-6 rounded-full bg-accent-soft blur-3xl" aria-hidden="true" />
          <Image src="/images/maya-bottle-sealed.png" alt="بسته اسپیرولینای مایا" width={506} height={904} priority sizes="(min-width: 768px) 384px, 320px" className="relative w-2/3 sm:w-3/4 h-auto mx-auto drop-shadow-xl" />
        </div>
      </div>
    </section>
  );
}
