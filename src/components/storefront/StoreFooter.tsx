import React from "react";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getModuleStates } from "@/lib/modules/server";

export default async function StoreFooter() {
  const [s, m] = await Promise.all([getSettings(), getModuleStates()]);
  const licenses = [
    { label: "شیلات", status: s.LICENSE_SHILAT },
    { label: "سازمان غذا و دارو", status: s.LICENSE_FDA_IRC ? `${s.LICENSE_FDA} (IRC: ${s.LICENSE_FDA_IRC})` : s.LICENSE_FDA },
    { label: "سیب سلامت", status: s.LICENSE_SIB },
  ];
  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: "فروشگاه",
      links: [
        { href: "/#order", label: "خرید اسپیرولینا" },
        { href: "/#how", label: "راهنمای مصرف" },
        { href: "/#faq", label: "پرسش‌های پرتکرار" },
        ...(m.blog ? [{ href: "/blog", label: "بلاگ" }] : []),
        { href: "/research", label: "مقالات و پژوهش‌ها" },
      ],
    },
    {
      title: "خدمات مشتریان",
      links: [
        { href: "/portal/my-orders", label: "پیگیری سفارش" },
        { href: "/portal/my-tickets", label: "پشتیبانی" },
        ...(m.trace ? [{ href: "/batch", label: "استعلام سری تولید" }] : []),
        { href: "/club-rules", label: "قوانین، مرجوعی و حریم خصوصی" },
      ],
    },
    {
      title: "همکاری",
      links: [
        ...(m.ambassadors ? [{ href: "/portal/become-ambassador", label: "سفیر مایا شوید" }] : []),
        ...(m.wholesale ? [{ href: "/wholesale", label: "خرید عمده" }] : []),
        { href: "/portal", label: "ورود به پنل" },
      ],
    },
  ];

  return (
    <footer id="contact" className="border-t border-border-hairline bg-bg-card text-text-muted text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 sm:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-deep text-white dark:bg-accent-primary dark:text-bg-page font-black text-sm">MS</span>
              <span className="flex flex-col leading-tight">
                <span className="font-black text-text-main">مایا اسپیرولینا</span>
                <span className="text-xs">مزرعه آفرینش مایا</span>
              </span>
            </Link>
            <p className="leading-7 max-w-sm">
              پودر و کپسول اسپیرولینا، تولید مستقیم مزرعه آفرینش مایا. اطلاعات مزرعه، فرایند تولید و مجوزها را فقط بر اساس مدارک واقعی منتشر می‌کنیم.
            </p>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title} className="space-y-3">
              <h2 className="font-bold text-text-main">{c.title}</h2>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-text-main transition">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border-hairline flex flex-col-reverse md:flex-row items-center justify-between gap-4 text-xs">
          <p>© مزرعه آفرینش مایا. همه حقوق محفوظ است.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {s.ENAMAD_ID && s.ENAMAD_CODE && (
              // کد رسمی نماد اعتماد الکترونیکی؛ فقط پس از دریافت نماد در قوانین ماژول پر می‌شود
              <a referrerPolicy="origin" target="_blank" rel="noreferrer" href={`https://trustseal.enamad.ir/?id=${encodeURIComponent(s.ENAMAD_ID)}&Code=${encodeURIComponent(s.ENAMAD_CODE)}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img referrerPolicy="origin" src={`https://trustseal.enamad.ir/logo.aspx?id=${encodeURIComponent(s.ENAMAD_ID)}&Code=${encodeURIComponent(s.ENAMAD_CODE)}`} alt="نماد اعتماد الکترونیکی" className="h-16 w-auto" />
              </a>
            )}
            <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="وضعیت مجوزها">
              {licenses.map((l) => (
                <li key={l.label} className="rounded-full border border-border-hairline px-3 py-1">
                  {l.label}: <span className={l.status.includes("پیگیری") ? "text-brand-purple" : "text-accent-deep dark:text-accent-primary"}>{l.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
