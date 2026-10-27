import Section from "./Section";

const ICONS: Record<string, React.ReactNode> = {
  farm: <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />,
  doc: <path d="M9 12h6M9 16h6M7 3h7l5 5v13H7V3zM14 3v5h5" />,
  box: <path d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10" />,
  chat: <path d="M4 5h16v10H9l-5 4V5z" />,
};

export default function Features({ consult }: { consult: boolean }) {
  const items = [
    { icon: "farm", title: "تولید در مزرعه خودمان", text: "کشت، برداشت و فرآوری در مزرعه آفرینش مایا انجام می‌شود؛ بدون واسطه به دست شما می‌رسد." },
    { icon: "doc", title: "اطلاعات شفاف", text: "تاریخ تولید و انقضای هر سری روی بسته است و نتیجه آزمایش هر سری پس از دریافت منتشر می‌شود." },
    { icon: "box", title: "پودر یا کپسول", text: "هر دو از همان اسپیرولینا؛ هرکدام را که برای مصرف روزانه شما راحت‌تر است انتخاب کنید." },
    ...(consult ? [{ icon: "chat", title: "مشاوره تغذیه", text: "سؤال‌های مصرف را از مشاوران تغذیه در حساب کاربری خود بپرسید." }] : []),
  ];
  return (
    <Section title="چرا مایا؟" subtitle="آنچه ادعا می‌کنیم، مستند است.">
      <div className={`grid gap-4 sm:grid-cols-2 ${items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {items.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border-hairline bg-bg-card p-6 space-y-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-deep dark:text-accent-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">{ICONS[f.icon]}</svg>
            </span>
            <h3 className="font-bold text-text-main">{f.title}</h3>
            <p className="text-sm leading-7 text-text-muted">{f.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
