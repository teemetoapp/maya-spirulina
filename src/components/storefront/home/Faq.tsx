import Link from "next/link";
import Section from "./Section";

export default function Faq({ returnDays, trace }: { returnDays: number; trace: boolean }) {
  const items: { q: string; a: React.ReactNode }[] = [
    { q: "پودر بهتر است یا کپسول؟", a: "هر دو اسپیرولینای همان مزرعه هستند. پودر را می‌توانید در نوشیدنی حل کنید؛ کپسول برای کسانی که طعم آن را دوست ندارند یا بیرون از خانه مصرف می‌کنند راحت‌تر است." },
    { q: "روزانه چقدر مصرف کنم؟", a: "مقدار مصرف روزانه روی برچسب هر بسته نوشته شده است. اگر سؤال خاصی دارید، از بخش مشاوره در حساب کاربری بپرسید." },
    { q: "چه کسانی باید پیش از مصرف با پزشک مشورت کنند؟", a: "زنان باردار و شیرده، کودکان، افراد مبتلا به بیماری‌های خودایمنی یا فنیل‌کتونوری (PKU) و کسانی که دارو مصرف می‌کنند." },
    { q: "سفارش کی به دستم می‌رسد؟", a: "پس از پرداخت، سفارش آماده و ارسال می‌شود و کد رهگیری برایتان پیامک می‌شود. وضعیت سفارش را در «سفارش‌های من» هم می‌بینید." },
    {
      q: "اگر از خرید راضی نبودم؟",
      a: (
        <>
          {returnDays > 0 ? `تا ${returnDays.toLocaleString("fa-IR")} روز پس از تحویل می‌توانید از «سفارش‌های من» درخواست مرجوعی ثبت کنید.` : "از بخش پشتیبانی با ما در تماس باشید."}{" "}
          <Link href="/club-rules" className="underline">شرایط کامل</Link>
        </>
      ),
    },
    ...(trace
      ? [{ q: "از کجا بدانم بسته اصل است؟", a: <>کد QR روی بسته را اسکن کنید یا کد سری را در <Link href="/batch" className="underline">استعلام سری تولید</Link> وارد کنید.</> }]
      : []),
  ];
  return (
    <Section id="faq" title="پرسش‌های پرتکرار" muted>
      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((f) => (
          <details key={f.q} className="group rounded-xl border border-border-hairline bg-bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5 font-bold text-text-main [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-xl leading-none text-text-muted transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <div className="px-4 sm:px-5 pb-5 text-sm leading-7 text-text-muted">{f.a}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}
