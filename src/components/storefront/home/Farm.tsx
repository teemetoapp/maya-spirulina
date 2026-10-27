import Image from "next/image";
import Link from "next/link";
import Section from "./Section";

export default function Farm({ trace }: { trace: boolean }) {
  return (
    <Section id="farm">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <Image src="/images/spirulina-farm-header.jpg" alt="استخرهای کشت اسپیرولینا" width={1230} height={730} sizes="(min-width: 768px) 560px, 100vw" className="w-full h-auto rounded-2xl border border-border-hairline" />
        <div className="space-y-5 text-center md:text-right">
          <h2 className="text-2xl sm:text-3xl font-black text-text-main">مزرعه آفرینش مایا</h2>
          <p className="leading-8 text-text-muted">
            اسپیرولینا در استخرهای کشت مزرعه خودمان پرورش می‌یابد، برداشت و خشک می‌شود و به شکل پودر و کپسول بسته‌بندی می‌شود. چون همه مراحل در یک‌جا انجام می‌شود، می‌توانیم اطلاعات هر سری تولید را دقیق ثبت کنیم.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            {trace && <Link href="/batch" className="btn btn-outline px-5 py-2.5 text-sm">استعلام سری تولید</Link>}
            <Link href="/research" className="btn btn-outline px-5 py-2.5 text-sm">مقالات و پژوهش‌ها</Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
