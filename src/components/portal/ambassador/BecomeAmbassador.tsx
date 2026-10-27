"use client";

import React, { useState } from "react";
import { apiCall, useMutation, PageTitle, MutationNotice, Field, Notice } from "@/components/portal/ui";
import { detectBankFromSheba } from "@/lib/validators";
import { toEnglishDigits, toPersianDigits } from "@/lib/currency";

const PROFESSIONS = [
  "پزشک عمومی / متخصص",
  "کارشناس یا مشاور تغذیه",
  "مربی ورزشی",
  "داروساز",
  "فعال حوزه سبک زندگی سالم",
  "سایر",
];

interface Props {
  name: string;
  application: { status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string; reviewNote: string | null } | null;
  commission: { silver: number; gold: number; diamond: number; customerDiscount: number };
}

export default function BecomeAmbassador({ name, application, commission }: Props) {
  const [form, setForm] = useState({
    fullName: name,
    profession: PROFESSIONS[0],
    city: "",
    licenseNumber: "",
    shebaNumber: "",
    socialLink: "",
    audience: "",
    motivation: "",
  });
  const { run, busy, notice } = useMutation();
  const sheba = toEnglishDigits(form.shebaNumber).toUpperCase().replace(/\s/g, "");
  const bank = sheba.length >= 7 ? detectBankFromSheba(sheba.startsWith("IR") ? sheba : `IR${sheba}`) : "";

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageTitle
        title="سفیر برند مایا شوید"
        subtitle="پزشکان، مشاوران تغذیه و مربیانی که اسپیرولینا را به مراجعان خود معرفی می‌کنند، از هر خرید پورسانت می‌گیرند."
      />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        {[
          ["نقره‌ای", commission.silver],
          ["طلایی", commission.gold],
          ["الماس", commission.diamond],
        ].map(([label, pct]) => (
          <div key={label} className="studio-card p-4">
            <span className="text-text-muted block">سطح {label}</span>
            <span className="text-lg font-black">{toPersianDigits(pct)}٪ پورسانت</span>
          </div>
        ))}
        <div className="studio-card p-4">
          <span className="text-text-muted block">تخفیف مشتریان شما</span>
          <span className="text-lg font-black">{toPersianDigits(commission.customerDiscount)}٪</span>
        </div>
      </div>

      {application?.status === "PENDING" && (
        <Notice kind="info">درخواست شما در تاریخ {application.createdAt} ثبت شده و در حال بررسی است.</Notice>
      )}
      {application?.status === "REJECTED" && (
        <Notice kind="danger">
          درخواست قبلی شما تأیید نشد{application.reviewNote ? `: ${application.reviewNote}` : "."} می‌توانید دوباره درخواست دهید.
        </Notice>
      )}
      <MutationNotice notice={notice} />

      {application?.status !== "PENDING" && (
        <form
          className="studio-card p-5 space-y-4 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => apiCall("/api/portal/ambassador/apply", "POST", { ...form, shebaNumber: sheba }));
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="نام و نام خانوادگی">
              <input required className="input w-full" value={form.fullName} onChange={set("fullName")} />
            </Field>
            <Field label="حوزه فعالیت">
              <select className="input w-full" value={form.profession} onChange={set("profession")}>
                {PROFESSIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="شهر">
              <input required className="input w-full" value={form.city} onChange={set("city")} />
            </Field>
            <Field label="شماره نظام / مجوز (در صورت وجود)">
              <input dir="ltr" className="input w-full" value={form.licenseNumber} onChange={set("licenseNumber")} />
            </Field>
            <Field label={`شماره شبا برای واریز پورسانت${bank ? ` (${bank})` : ""}`}>
              <input dir="ltr" className="input w-full font-mono" placeholder="IR..." value={form.shebaNumber} onChange={set("shebaNumber")} />
            </Field>
            <Field label="صفحه اینستاگرام یا وب‌سایت">
              <input dir="ltr" className="input w-full" value={form.socialLink} onChange={set("socialLink")} />
            </Field>
          </div>
          <Field label="مخاطبان شما چه کسانی هستند؟">
            <input className="input w-full" value={form.audience} onChange={set("audience")} />
          </Field>
          <Field label="چرا می‌خواهید سفیر مایا شوید؟">
            <textarea rows={3} className="input w-full" value={form.motivation} onChange={set("motivation")} />
          </Field>
          <div className="flex justify-end">
            <button className="btn btn-primary text-xs" disabled={busy}>
              ارسال درخواست
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
