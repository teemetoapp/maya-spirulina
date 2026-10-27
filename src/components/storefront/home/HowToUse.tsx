import Section from "./Section";

export default function HowToUse({ refill }: { refill: boolean }) {
  const steps = [
    { title: "مقدار را از برچسب بخوانید", text: "مقدار مصرف روزانه روی برچسب هر بسته نوشته شده است. از آن بیشتر مصرف نکنید." },
    { title: "با آب یا نوشیدنی", text: "پودر را در آب، آبمیوه یا اسموتی حل کنید. کپسول را با یک لیوان آب بخورید." },
    { title: "مصرف منظم", text: refill ? "پیش از تمام شدن بسته، برایتان پیامک یادآوری می‌فرستیم تا مصرف قطع نشود." : "بهتر است هر روز در ساعت مشخصی مصرف کنید." },
  ];
  return (
    <Section id="how" title="راهنمای مصرف" muted>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-border-hairline bg-bg-card p-6 space-y-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-deep text-white dark:bg-accent-primary dark:text-bg-page font-black">{(i + 1).toLocaleString("fa-IR")}</span>
            <h3 className="font-bold text-text-main">{s.title}</h3>
            <p className="text-sm leading-7 text-text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-xs leading-6 text-text-muted">اسپیرولینا مکمل غذایی است و جایگزین دارو نیست. در دوران بارداری و شیردهی، در صورت بیماری یا مصرف دارو، پیش از مصرف با پزشک مشورت کنید.</p>
    </Section>
  );
}
