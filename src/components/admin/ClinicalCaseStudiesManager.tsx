"use client";

import React, { useState, useMemo } from "react";
import { INITIAL_CASE_STUDIES, ClinicalCaseStudy } from "@/data/case-studies";
import { toPersianDigits } from "@/lib/currency";

export default function ClinicalCaseStudiesManager() {
  const [cases, setCases] = useState<ClinicalCaseStudy[]>(INITIAL_CASE_STUDIES);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseModal, setSelectedCaseModal] = useState<ClinicalCaseStudy | null>(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  // New Case State
  const [patientTitle, setPatientTitle] = useState("");
  const [doctorName, setDoctorName] = useState("دکتر سارا رادمنش");
  const [complaint, setComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [baselineFerritin, setBaselineFerritin] = useState("8.0");
  const [followupFerritin, setFollowupFerritin] = useState("35.0");
  const [doctorNote, setDoctorNote] = useState("");
  const [patientQuote, setPatientQuote] = useState("");

  // Metrics
  const metrics = useMemo(() => {
    const total = cases.length;
    const approved = cases.filter((c) => c.status === "APPROVED").length;
    const pending = cases.filter((c) => c.status === "PENDING_REVIEW").length;
    const featured = cases.filter((c) => c.isFeaturedOnLanding).length;

    return { total, approved, pending, featured };
  }, [cases]);

  // Filtered List
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch =
        c.patientAnonymousTitle.includes(searchQuery) ||
        c.supervisingAmbassador.fullName.includes(searchQuery) ||
        c.primaryComplaint.includes(searchQuery) ||
        c.diagnosis.includes(searchQuery) ||
        c.caseNumber.includes(searchQuery);

      if (!matchesSearch) return false;

      if (activeFilter === "all") return true;
      if (activeFilter === "approved") return c.status === "APPROVED";
      if (activeFilter === "pending") return c.status === "PENDING_REVIEW";
      if (activeFilter === "featured") return c.isFeaturedOnLanding;
      return true;
    });
  }, [cases, activeFilter, searchQuery]);

  const handleApproveCase = (id: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "APPROVED", approvedAt: "امروز" } : c
      )
    );
    if (selectedCaseModal?.id === id) {
      setSelectedCaseModal((prev) => (prev ? { ...prev, status: "APPROVED" } : null));
    }
  };

  const handleToggleFeatured = (id: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isFeaturedOnLanding: !c.isFeaturedOnLanding } : c
      )
    );
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientTitle || !complaint) return;

    const baseNum = parseFloat(baselineFerritin) || 8;
    const followNum = parseFloat(followupFerritin) || 35;
    const changePct = Math.round(((followNum - baseNum) / baseNum) * 100);

    const newCase: ClinicalCaseStudy = {
      id: `cs-${Date.now()}`,
      caseNumber: `CASE-1403-${Math.floor(100 + Math.random() * 900)}`,
      patientAnonymousTitle: patientTitle,
      gender: "خانم",
      age: 35,
      city: "تهران",
      supervisingAmbassador: {
        fullName: doctorName,
        slug: doctorName.includes("رادمنش") ? "dr-radmanesh" : "dr-maryam-hosseini",
        specialty: "پزشک ناظر بالینی",
        referralCode: "MAYA-RAD9",
      },
      primaryComplaint: complaint,
      diagnosis: diagnosis || "کمبود مواد مغذی سلولی",
      prescribedMayaPackage: {
        slug: "maya-tablets-240",
        name: "بسته ۶۰ روزه طلایی (۲۴۰ کپسول ۵۰۰mg فشرده سرد مایا)",
        durationDays: 60,
        dosageInstructions: "روزانه ۴ کپسول با آب ولرم",
      },
      biomarkers: [
        {
          name: "فریتین سرم (Ferritin)",
          unit: "ng/mL",
          baselineValue: baseNum,
          followupValue: followNum,
          referenceRange: "۱۵ - ۱۵۰",
          changePercent: changePct,
          status: "NORMALIZED",
        },
      ],
      clinicalDoctorNote: doctorNote || "پروتکل با موفقیت اجرا شد و عوارض گوارشی گزارش نشد.",
      patientVerbatimFeedback: patientQuote || "سطح انرژی و نتایج آزمایش رضایت‌بخش است.",
      complianceRatePercent: 95,
      adverseEffectsReported: "فاقد عارضه گوارشی",
      status: "APPROVED",
      submittedAt: "امروز",
      approvedAt: "امروز",
      isFeaturedOnLanding: false,
    };

    setCases((prev) => [newCase, ...prev]);
    setIsNewCaseModalOpen(false);
    setPatientTitle("");
    setComplaint("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              سامانه پرونده‌ها و اسناد بالینی سفیران سلامت
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Clinical Case Studies & Lab Proof
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            بایگانی آزمایشات خون قبل و بعد مراجعین مطب پزشکان و سفیران همکار مایا، پایش فریتین و آنزیم‌های کبد، و انتشار شواهد در لندینگ پیج.
          </p>
        </div>

        <button
          onClick={() => setIsNewCaseModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl hover:opacity-95 shadow-[0_2px_12px_rgba(16,185,129,0.3)] transition"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          ثبت پرونده بالینی جدید
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/8 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
          <span className="text-[11px] font-medium text-zinc-400">کل پرونده‌های مستند</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white">{toPersianDigits(metrics.total)}</span>
            <span className="text-xs text-zinc-400">کیس بالینی</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-400">ثبت‌شده توسط پزشکان و سفیران تاییدشده</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/8 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition" />
          <span className="text-[11px] font-medium text-zinc-400">تأییدشده و منتشر در سایت</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-sky-400">{toPersianDigits(metrics.approved)}</span>
            <span className="text-xs text-zinc-400">سند آزمایشگاهی</span>
          </div>
          <div className="mt-2 text-[10px] text-sky-300">نمایش رسمی در صفحه بیومارکرها و سفیران</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition" />
          <span className="text-[11px] font-medium text-amber-300">در انتظار بررسی بورد علمی</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400">{toPersianDigits(metrics.pending)}</span>
            <span className="text-xs text-amber-300/80">کیس جدید</span>
          </div>
          <div className="mt-2 text-[10px] text-amber-300/80">نیازمند تطبیق برگه آزمایش و تایید پزشک ناظر</div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/8 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition" />
          <span className="text-[11px] font-medium text-zinc-400">منتخب صفحه اصلی (Featured)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-300">{toPersianDigits(metrics.featured)}</span>
            <span className="text-xs text-zinc-400">پرونده برجسته</span>
          </div>
          <div className="mt-2 text-[10px] text-purple-300/80">سند اثربخشی مستقیم جهت افزایش نرخ تبدیل</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/40 border border-white/8">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "همه پرونده‌ها", count: cases.length },
            { id: "approved", label: "تاییدشده بالینی", count: metrics.approved },
            { id: "pending", label: "در انتظار بررسی", count: metrics.pending, highlight: metrics.pending > 0 },
            { id: "featured", label: "منتخب لندینگ پیج", count: metrics.featured },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? tab.highlight
                    ? "bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20"
                    : "bg-white/10 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeFilter === tab.id
                  ? tab.highlight ? "bg-black/20 text-black" : "bg-white/20 text-white"
                  : "bg-white/5 text-zinc-400"
              }`}>
                {toPersianDigits(tab.count)}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی مراجع، پزشک ناظر یا بیماری..."
            className="w-full pl-3 pr-8 py-1.5 text-xs bg-zinc-800/80 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
          <svg className="size-4 text-zinc-500 absolute right-2.5 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Case Studies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCases.map((cs) => {
          const isPending = cs.status === "PENDING_REVIEW";

          return (
            <div
              key={cs.id}
              className={`p-5 rounded-2xl bg-zinc-900/70 border transition flex flex-col justify-between space-y-4 ${
                isPending
                  ? "border-amber-500/40 bg-amber-500/[0.02]"
                  : cs.isFeaturedOnLanding
                  ? "border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
                  : "border-white/8 hover:border-white/15"
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{cs.patientAnonymousTitle}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({cs.caseNumber})</span>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      ناظر: {cs.supervisingAmbassador.fullName} • {cs.city}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cs.isFeaturedOnLanding && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        منتخب لندینگ
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cs.status === "APPROVED"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                    }`}>
                      {cs.status === "APPROVED" ? "تاییدشده" : "در انتظار بررسی"}
                    </span>
                  </div>
                </div>

                {/* Complaint & Diagnosis */}
                <div className="text-xs space-y-1">
                  <p className="text-zinc-300 text-[11px] line-clamp-2">
                    <span className="text-zinc-500">شکایت بالینی:</span> {cs.primaryComplaint}
                  </p>
                  <p className="text-zinc-400 text-[11px]">
                    <span className="text-zinc-500">تشخیص:</span> {cs.diagnosis}
                  </p>
                </div>

                {/* Biomarkers Highlights */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>بیومارکرهای پایش‌شده ({toPersianDigits(cs.prescribedMayaPackage.durationDays)} روزه)</span>
                    <span>تغییر درصدی</span>
                  </div>
                  {cs.biomarkers.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-300 text-[11px] font-sans">{b.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 line-through text-[11px]">{toPersianDigits(b.baselineValue)}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-emerald-400 font-bold">{toPersianDigits(b.followupValue)} {b.unit}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          {b.changePercent > 0 ? `+${toPersianDigits(b.changePercent)}٪` : `${toPersianDigits(b.changePercent)}٪`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Doctor Note */}
                <p className="text-[11px] text-zinc-300 leading-relaxed italic border-r-2 border-emerald-500/40 pr-2">
                  «{cs.clinicalDoctorNote}»
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/6 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => setSelectedCaseModal(cs)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition"
                >
                  مشاهده برگه آزمایش و جزئیات
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleFeatured(cs.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition ${
                      cs.isFeaturedOnLanding
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {cs.isFeaturedOnLanding ? "حذف از منتخب" : "افزودن به منتخب لندینگ"}
                  </button>

                  {isPending && (
                    <button
                      onClick={() => handleApproveCase(cs.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition"
                    >
                      تایید و انتشار
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Case Details Inspector Modal */}
      {selectedCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div>
                <h3 className="text-sm font-bold text-white">
                  پرونده بالینی {selectedCaseModal.caseNumber}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedCaseModal.patientAnonymousTitle} • تحت نظارت {selectedCaseModal.supervisingAmbassador.fullName}
                </p>
              </div>
              <button
                onClick={() => setSelectedCaseModal(null)}
                className="size-7 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-zinc-500 text-[10px] block">شکایت بالینی و تشخیص اولیه:</span>
                <p className="text-zinc-200 font-medium">{selectedCaseModal.primaryComplaint}</p>
                <p className="text-zinc-400">{selectedCaseModal.diagnosis}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-emerald-400 text-[10px] block font-semibold">پروتکل تجویزی مایا:</span>
                <p className="text-zinc-200 font-medium">{selectedCaseModal.prescribedMayaPackage.name}</p>
                <p className="text-zinc-400">{selectedCaseModal.prescribedMayaPackage.dosageInstructions}</p>
              </div>

              {/* Lab Scans Simulation */}
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 text-center space-y-2">
                <span className="text-xs text-zinc-400 font-semibold block">تصویر تاییدیه برگه آزمایشگاهی مخدوش‌شده</span>
                <div className="h-32 rounded-lg bg-zinc-800/80 border border-white/5 flex flex-col items-center justify-center text-zinc-500 space-y-1">
                  <svg className="size-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[11px]">اسکن رسمی آزمایشگاه تشخیص طبی نورا (اطلاعات هویتی محرمانه)</span>
                  <span className="text-[10px] text-emerald-400">تطبیق بیومارکرها: ۱۰۰٪ همخوان با داده‌های ورودی</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-zinc-500 text-[10px] block">یادداشت پزشک ناظر:</span>
                <p className="text-zinc-200 italic">«{selectedCaseModal.clinicalDoctorNote}»</p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-zinc-500 text-[10px] block">گزارش عوارض جانبی و گوارشی:</span>
                <p className="text-emerald-400 font-medium">{selectedCaseModal.adverseEffectsReported}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/8">
              <span className="text-[11px] text-zinc-400">
                تاریخ ثبت: {selectedCaseModal.submittedAt}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCaseModal(null)}
                  className="px-4 py-2 text-xs rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition"
                >
                  بستن
                </button>
                {selectedCaseModal.status === "PENDING_REVIEW" && (
                  <button
                    onClick={() => handleApproveCase(selectedCaseModal.id)}
                    className="px-5 py-2 text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl hover:opacity-95 shadow-md shadow-emerald-500/20 transition"
                  >
                    تایید پرونده و انتشار عمومی
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Case Entry Modal */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleCreateCase}
            className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="text-sm font-bold text-white">ثبت پرونده بالینی جدید مراجع</h3>
              <button
                type="button"
                onClick={() => setIsNewCaseModalOpen(false)}
                className="size-7 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">عنوان مستعار بیمار (مثلاً: مراجع خانم ۳۶ ساله - مهندس):</label>
                <input
                  type="text"
                  required
                  placeholder="مراجع خانم ۳۶ ساله..."
                  value={patientTitle}
                  onChange={(e) => setPatientTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">پزشک ناظر / سفیر سلامت ثبت‌کننده:</label>
                <select
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="دکتر سارا رادمنش">دکتر سارا رادمنش (متخصص پزشکی کاربردی)</option>
                  <option value="دکتر مریم حسینی">دکتر مریم حسینی (پزشک عمومی و کبد)</option>
                  <option value="کاپیتان فرهاد امینی">کاپیتان فرهاد امینی (فیزیولوژیست ورزشی)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">شکایت اولیه و علائم بیمار:</label>
                <input
                  type="text"
                  required
                  placeholder="خستگی مفرط، عدم تحمل قرص آهن..."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">تشخیص بالینی:</label>
                <input
                  type="text"
                  placeholder="آنمی فقر آهن با فریتین پایین"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
                <div>
                  <label className="text-zinc-400 block mb-1">فریتین اولیه (ng/mL):</label>
                  <input
                    type="text"
                    value={baselineFerritin}
                    onChange={(e) => setBaselineFerritin(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-800 border border-white/10 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-emerald-400 block mb-1">فریتین پس از دوره (ng/mL):</label>
                  <input
                    type="text"
                    value={followupFerritin}
                    onChange={(e) => setFollowupFerritin(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-800 border border-white/10 rounded-lg text-emerald-400 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">یادداشت پزشک در پرونده:</label>
                <textarea
                  rows={2}
                  value={doctorNote}
                  onChange={(e) => setDoctorNote(e.target.value)}
                  placeholder="تحمل گوارشی، تغییرات علائم..."
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/8">
              <button
                type="button"
                onClick={() => setIsNewCaseModalOpen(false)}
                className="px-4 py-2 text-xs rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl hover:opacity-95 shadow-md shadow-emerald-500/20 transition"
              >
                ثبت پرونده در دیتابیس بالینی
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
