// قاب یکسان بخش‌های صفحه اصلی: فاصله، عرض و عنوان
export default function Section({ id, title, subtitle, muted = false, children }: { id?: string; title?: string; subtitle?: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-20 py-14 sm:py-20 ${muted ? "bg-bg-subtle" : "bg-bg-page"}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {title && (
          <header className="max-w-2xl mx-auto text-center mb-10 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-text-main">{title}</h2>
            {subtitle && <p className="text-sm sm:text-base leading-7 text-text-muted">{subtitle}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
