"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CostingData, CostItemDTO, CostCategoryKey, CostInputDTO, FixedCostDTO } from "@/lib/portal/costing";
import { COST_CATEGORY_LABELS } from "@/lib/portal/costing";
import { FIXED_COST_LABELS, priceForMargin, marginOf, type FixedCostCategoryKey } from "@/lib/costing/pricing";
import { PageTitle, StatCard, Notice, MutationNotice, useMutation, apiCall } from "@/components/portal/ui";
import { BarList } from "@/components/portal/charts";
import { formatToman, toPersianDigits, toEnglishDigits } from "@/lib/currency";

// ==============================================================
// بهای تمام‌شده
//  • برگه هزینه هر بسته: ردیف دستی یا متصل به «منبع» (آب، برق، پودر…)
//    که نرخش یک‌جا تعریف می‌شود: مقدار مصرف × نرخ منبع
//  • سهم سربار: جمع هزینه‌های ثابت ماهانه ÷ تولید ماهانه × ضریب بسته
//  • اسلایدر حاشیه سود → قیمت پیشنهادی → ثبت مستقیم به‌عنوان قیمت سایت
// ==============================================================

type Row = Omit<CostItemDTO, "id"> & { key: string };
type Tab = "sheet" | "inputs" | "fixed";

const TEMPLATE: { title: string; category: CostCategoryKey; quantity: number }[] = [
  { title: "پودر اسپیرولینا (گرم)", category: "RAW_MATERIAL", quantity: 1 },
  { title: "کپسول / قرص‌سازی", category: "CAPSULE", quantity: 1 },
  { title: "قوطی و درب", category: "PACKAGING", quantity: 1 },
  { title: "برچسب", category: "LABEL", quantity: 1 },
  { title: "جعبه و بروشور", category: "BOX", quantity: 1 },
  { title: "سهم آزمایش و مجوز", category: "LAB_TEST", quantity: 1 },
  { title: "دستمزد تولید و بسته‌بندی", category: "PRODUCTION", quantity: 1 },
  { title: "حمل تا انبار", category: "LOGISTICS", quantity: 1 },
];

let seq = 0;
const newKey = () => `r${++seq}`;
const plain = (r: Omit<CostItemDTO, "id">) => ({ title: r.title, category: r.category, quantity: r.quantity, unitCost: r.unitCost, inputId: r.inputId ?? null, note: r.note });
const toRows = (items: CostItemDTO[]): Row[] => items.map((i) => ({ ...plain(i), key: newKey() }));
const num = (v: string) => Number(toEnglishDigits(v).replace(/[^\d.]/g, "")) || 0;
const pctOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const money = (n: number) => toPersianDigits(Math.round(n).toLocaleString("en-US"));

function marginBadge(m: number) {
  if (m < 20) return "badge-status-danger";
  if (m < 40) return "badge-status-warning";
  return "badge-status-success";
}

export default function CostingAdmin({
  data,
  selectedId,
  canPublishPrice,
}: {
  data: CostingData;
  selectedId: string | null;
  canPublishPrice: boolean;
}) {
  const router = useRouter();
  const { variants, overhead } = data;
  const [tab, setTab] = useState<Tab>("sheet");
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0] ?? null;

  const withSheet = variants.filter((v) => v.items.length > 0);
  const sold = variants.reduce((s, v) => s + v.sold30d, 0);
  const weightedMargin = sold
    ? pctOf(
        variants.reduce((s, v) => s + (v.price - v.fullCostPrice) * v.sold30d, 0),
        variants.reduce((s, v) => s + v.price * v.sold30d, 0)
      )
    : null;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "sheet", label: "برگه هزینه و قیمت‌گذاری" },
    { id: "inputs", label: "منابع و نرخ‌ها", count: data.inputs.length },
    { id: "fixed", label: "هزینه‌های ثابت", count: data.fixed.filter((f) => f.isActive).length },
  ];

  return (
    <div className="space-y-5">
      <PageTitle
        title="بهای تمام‌شده و قیمت‌گذاری"
        subtitle="هزینه متغیر هر بسته + سهم هزینه‌های ثابت = بهای تمام‌شده کامل. با اسلایدر حاشیه سود، قیمت پیشنهادی را ببینید و مستقیم روی سایت ثبت کنید."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="بسته‌های دارای برگه هزینه" value={`${toPersianDigits(withSheet.length)} از ${toPersianDigits(variants.length)}`} />
        <StatCard label="حاشیه سود خالص وزنی (۳۰ روز)" value={weightedMargin === null ? "—" : `${toPersianDigits(weightedMargin)}٪`} hint="پس از کسر سهم هزینه ثابت" />
        <StatCard label="هزینه‌های ثابت ماهانه" value={formatToman(overhead.monthlyTotal)} hint={`${toPersianDigits(data.fixed.filter((f) => f.isActive).length)} قلم فعال`} />
        <StatCard
          label="سربار هر واحد"
          value={formatToman(overhead.perUnit)}
          hint={`تقسیم بر ${toPersianDigits(overhead.monthlyUnits.toLocaleString("en-US"))} واحد تولید ماهانه`}
        />
      </div>

      <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-border-hairline">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs -mb-px border-b-2 transition ${tab === t.id ? "border-accent-primary text-accent-primary font-black" : "border-transparent text-text-muted"}`}
          >
            {t.label}
            {t.count !== undefined && <span className="ms-1 text-[10px] opacity-70">({toPersianDigits(t.count)})</span>}
          </button>
        ))}
      </div>

      {tab === "inputs" && <InputsTab inputs={data.inputs} />}
      {tab === "fixed" && <FixedTab fixed={data.fixed} overhead={overhead} />}
      {tab === "sheet" &&
        (variants.length === 0 ? (
          <Notice kind="info">هنوز بسته‌ای در کاتالوگ ثبت نشده است.</Notice>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4 items-start">
            <aside className="studio-card divide-y divide-border-hairline max-h-[75vh] overflow-y-auto">
              {variants.map((v) => {
                const m = marginOf(v.price, v.fullCostPrice);
                const active = v.id === selected?.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => router.push(`/portal/costing?id=${v.id}`, { scroll: false })}
                    className={`w-full text-right p-3 space-y-1 transition-colors ${active ? "bg-accent-soft" : "hover:bg-bg-subtle"}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-xs font-bold truncate">{v.productTitle}</span>
                      {v.items.length ? (
                        <span className={`badge-status ${marginBadge(m)} shrink-0`}>{toPersianDigits(m)}٪</span>
                      ) : (
                        <span className="badge-status badge-status-neutral shrink-0">بدون برگه</span>
                      )}
                    </div>
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>
                        {v.title} · <span className="font-mono">{v.sku}</span>
                      </span>
                      <span className="font-mono">{formatToman(v.price, false)}</span>
                    </div>
                  </button>
                );
              })}
            </aside>
            {selected && <CostSheet key={selected.id} variant={selected} data={data} canPublishPrice={canPublishPrice} />}
          </div>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------- cost sheet

function CostSheet({ variant, data, canPublishPrice }: { variant: CostingData["variants"][number]; data: CostingData; canPublishPrice: boolean }) {
  const { variants, rules, overhead, inputs } = data;
  const inputMap = useMemo(() => new Map(inputs.map((i) => [i.id, i])), [inputs]);
  const [rows, setRows] = useState<Row[]>(() => toRows(variant.items));
  const [units, setUnits] = useState(variant.overheadUnits);
  const [copyFrom, setCopyFrom] = useState("");
  const { run, busy, notice } = useMutation();

  // ردیف متصل همیشه نرخ روز منبع را می‌گیرد
  const lineCost = (r: Row) => r.quantity * (r.inputId ? inputMap.get(r.inputId)?.price ?? r.unitCost : r.unitCost);
  const variable = Math.round(rows.reduce((s, r) => s + lineCost(r), 0));
  const overheadShare = Math.round(overhead.perUnit * units);
  const fullCost = (rows.length ? variable : variant.costPrice) + overheadShare;
  const dirty =
    JSON.stringify(rows.map(plain)) !== JSON.stringify(variant.items.map(plain)) || units !== variant.overheadUnits;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(COST_CATEGORY_LABELS[r.category], (map.get(COST_CATEGORY_LABELS[r.category]) ?? 0) + lineCost(r));
    if (overheadShare > 0) map.set("سهم هزینه‌های ثابت", overheadShare);
    const tot = [...map.values()].reduce((a, b) => a + b, 0);
    return [...map.entries()]
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ label: k, value: Math.round(v), hint: `${toPersianDigits(pctOf(v, tot))}٪` }))
      .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, overheadShare, inputMap]);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const setSource = (r: Row, inputId: string) => {
    if (!inputId) return update(r.key, { inputId: null });
    const inp = inputMap.get(inputId);
    if (!inp) return;
    update(r.key, { inputId, unitCost: inp.price, category: inp.category, title: r.title || inp.title });
  };
  const addRow = () => setRows((rs) => [...rs, { key: newKey(), title: "", category: "OTHER", quantity: 1, unitCost: 0, inputId: null, note: "" }]);
  const applyTemplate = () =>
    setRows((rs) => [
      ...rs,
      ...TEMPLATE.filter((t) => !rs.some((r) => r.title === t.title)).map((t) => ({ ...t, key: newKey(), unitCost: 0, inputId: null, note: "" })),
    ]);
  const copy = () => {
    const src = variants.find((v) => v.id === copyFrom);
    if (src) setRows(toRows(src.items));
  };

  async function save() {
    await run(() => apiCall("/api/admin/costing", "PUT", { variantId: variant.id, items: rows.map(plain), overheadUnits: units }), "برگه هزینه ذخیره شد.");
  }

  const others = variants.filter((v) => v.id !== variant.id && v.items.length);

  return (
    <div className="space-y-4 min-w-0">
      <section className="studio-card p-5 space-y-4">
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">
              {variant.productTitle} — {variant.title}
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              <span className="font-mono">{variant.sku}</span> · قیمت فعلی سایت {formatToman(variant.price)} · {toPersianDigits(variant.sold30d)} فروش در ۳۰ روز
              {variant.updatedAt && <> · آخرین به‌روزرسانی {variant.updatedAt}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost text-xs border border-border-hairline" onClick={applyTemplate}>
              ردیف‌های پیشنهادی
            </button>
            {others.length > 0 && (
              <div className="flex gap-1">
                <select className="input text-xs py-1.5" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} aria-label="کپی برگه هزینه از بسته دیگر">
                  <option value="">کپی از بسته دیگر…</option>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.productTitle} — {o.title}
                    </option>
                  ))}
                </select>
                <button className="btn btn-ghost text-xs border border-border-hairline" disabled={!copyFrom} onClick={copy}>
                  کپی
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[860px]">
            <thead>
              <tr className="border-b border-border-hairline text-text-muted">
                <th className="text-right font-bold p-2 min-w-[150px]">عنوان هزینه</th>
                <th className="text-right font-bold p-2 w-40">منبع نرخ</th>
                <th className="text-right font-bold p-2 w-36">دسته</th>
                <th className="text-right font-bold p-2 w-24">مقدار مصرف</th>
                <th className="text-right font-bold p-2 w-32">نرخ واحد (تومان)</th>
                <th className="text-right font-bold p-2 w-28">جمع ردیف</th>
                <th className="text-right font-bold p-2">توضیح</th>
                <th className="p-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-text-muted">
                    برای این بسته هنوز هزینه‌ای ثبت نشده است. «ردیف‌های پیشنهادی» را بزنید یا یک ردیف اضافه کنید.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const inp = r.inputId ? inputMap.get(r.inputId) : undefined;
                return (
                  <tr key={r.key}>
                    <td className="p-1.5">
                      <input className="input text-xs w-full" value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} placeholder="مثلاً آب مصرفی کشت" />
                    </td>
                    <td className="p-1.5">
                      <select className="input text-xs w-full" value={r.inputId ?? ""} onChange={(e) => setSource(r, e.target.value)} aria-label="منبع نرخ">
                        <option value="">نرخ دستی</option>
                        {inputs.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.title} ({i.unit})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <select className="input text-xs w-full" value={r.category} onChange={(e) => update(r.key, { category: e.target.value as CostCategoryKey })}>
                        {Object.entries(COST_CATEGORY_LABELS).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <div className="flex items-center gap-1">
                        <input
                          className="input text-xs w-full font-mono"
                          inputMode="decimal"
                          value={toPersianDigits(r.quantity)}
                          onChange={(e) => update(r.key, { quantity: num(e.target.value) })}
                          aria-label="مقدار مصرف"
                        />
                        {inp && <span className="text-[10px] text-text-muted whitespace-nowrap">{inp.unit}</span>}
                      </div>
                    </td>
                    <td className="p-1.5">
                      {inp ? (
                        <span className="block px-2 py-1.5 font-mono text-text-muted" title="نرخ از «منابع و نرخ‌ها» خوانده می‌شود">
                          {money(inp.price)} <span className="text-[10px]">/ {inp.unit}</span>
                        </span>
                      ) : (
                        <input
                          className="input text-xs w-full font-mono"
                          inputMode="numeric"
                          value={money(r.unitCost)}
                          onChange={(e) => update(r.key, { unitCost: Math.round(num(e.target.value)) })}
                          aria-label="نرخ واحد"
                        />
                      )}
                    </td>
                    <td className="p-1.5 font-mono whitespace-nowrap">{formatToman(Math.round(lineCost(r)), false)}</td>
                    <td className="p-1.5">
                      <input className="input text-xs w-full" value={r.note} onChange={(e) => update(r.key, { note: e.target.value })} placeholder="تأمین‌کننده، …" />
                    </td>
                    <td className="p-1.5">
                      <button className="btn btn-ghost text-xs text-danger" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="حذف ردیف">
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost text-xs border border-border-hairline" onClick={addRow}>
            + افزودن ردیف
          </button>
          {inputs.length === 0 && <span className="text-[11px] text-text-muted">برای فرمول «مقدار × نرخ» (مثلاً لیتر آب × نرخ آب) ابتدا در تب «منابع و نرخ‌ها» منبع تعریف کنید.</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-bg-subtle p-3 space-y-1">
            <span className="text-text-muted">هزینه متغیر (مواد، بسته‌بندی، مصرف)</span>
            <div className="font-black font-mono text-sm">{formatToman(rows.length ? variable : variant.costPrice)}</div>
          </div>
          <div className="rounded-lg bg-bg-subtle p-3 space-y-1">
            <label className="text-text-muted flex items-center justify-between gap-2">
              <span>سهم هزینه‌های ثابت</span>
              <span className="flex items-center gap-1">
                ضریب
                <input
                  className="input text-xs w-16 font-mono py-0.5"
                  inputMode="decimal"
                  value={toPersianDigits(units)}
                  onChange={(e) => setUnits(Math.min(100, num(e.target.value)))}
                  aria-label="ضریب سهم سربار"
                />
              </span>
            </label>
            <div className="font-black font-mono text-sm">{formatToman(overheadShare)}</div>
            <p className="text-[10.5px] text-text-subtle">
              {formatToman(overhead.perUnit)} سربار هر واحد × {toPersianDigits(units)}؛ بسته ۲ برابری را ۲ بزنید، بدون سربار ۰.
            </p>
          </div>
          <div className="rounded-lg bg-accent-soft p-3 space-y-1">
            <span className="text-text-muted">بهای تمام‌شده کامل</span>
            <div className="font-black font-mono text-base text-accent-primary">{formatToman(fullCost)}</div>
            <p className="text-[10.5px] text-text-subtle">مبنای قیمت‌گذاری؛ در حسابداری فقط هزینه متغیر بهای کالای فروش‌رفته است.</p>
          </div>
        </div>

        <MutationNotice notice={notice} />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary text-xs" disabled={busy || !dirty} onClick={save}>
            {busy ? "در حال ذخیره…" : "ذخیره و محاسبه بهای تمام‌شده"}
          </button>
          {dirty && <span className="text-[11px] text-warning">تغییرات ذخیره نشده است.</span>}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarginPanel key={`${variant.id}-${variant.price}-${variant.fullCostPrice}`} variant={variant} fullCost={fullCost} rules={rules} dirty={dirty} canPublishPrice={canPublishPrice} />
        <section className="studio-card p-5 space-y-3">
          <h3 className="text-sm font-black">ترکیب بهای تمام‌شده</h3>
          {byCategory.length ? <BarList items={byCategory} format={(n) => formatToman(n, false)} /> : <p className="text-xs text-text-muted">هنوز ردیفی با مبلغ ثبت نشده است.</p>}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- margin slider

function MarginPanel({
  variant,
  fullCost,
  rules,
  dirty,
  canPublishPrice,
}: {
  variant: CostingData["variants"][number];
  fullCost: number;
  rules: CostingData["rules"];
  dirty: boolean;
  canPublishPrice: boolean;
}) {
  const current = marginOf(variant.price, fullCost);
  const [margin, setMargin] = useState<number>(variant.targetMargin ?? Math.min(80, Math.max(0, Math.round(current))));
  const { run, busy, notice } = useMutation();
  const price = priceForMargin(fullCost, margin, rules.rounding);
  const effective = marginOf(price, fullCost);
  const diff = price - variant.price;

  const discounted = Math.round(price * (1 - rules.ambassadorDiscount / 100));
  const commission = Math.round(discounted * (rules.maxCommission / 100));
  const viaAmb = discounted - commission - fullCost;

  const send = (publish: boolean) =>
    run(() => apiCall("/api/admin/costing/price", "POST", { variantId: variant.id, targetMargin: margin, publish, price }));

  return (
    <section className="studio-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black">حاشیه سود و قیمت سایت</h3>
        <span className={`badge-status ${marginBadge(current)}`}>حاشیه فعلی {toPersianDigits(current)}٪</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <label htmlFor={`m-${variant.id}`} className="font-bold">
            حاشیه سود هدف
          </label>
          <span className="font-black text-accent-primary">{toPersianDigits(margin)}٪</span>
        </div>
        <input
          id={`m-${variant.id}`}
          type="range"
          min={0}
          max={80}
          step={1}
          value={margin}
          onChange={(e) => setMargin(Number(e.target.value))}
          className="w-full accent-[var(--accent-primary)]"
        />
        <div className="flex justify-between text-[10px] text-text-subtle">
          {[0, 20, 40, 60, 80].map((n) => (
            <span key={n}>{toPersianDigits(n)}٪</span>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-bg-subtle p-3 space-y-1.5 text-xs">
        <Line label="بهای تمام‌شده کامل" v={fullCost} />
        <div className="flex justify-between font-black text-sm">
          <span>قیمت پیشنهادی</span>
          <span className="font-mono text-accent-primary">{formatToman(price)}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>نسبت به قیمت فعلی ({formatToman(variant.price, false)})</span>
          <span className={`font-mono ${diff > 0 ? "text-success" : diff < 0 ? "text-danger" : ""}`}>
            {diff === 0 ? "بدون تغییر" : `${diff > 0 ? "+" : "−"} ${formatToman(Math.abs(diff), false)}`}
          </span>
        </div>
        <p className="text-[10.5px] text-text-subtle">
          گرد شده به {toPersianDigits(rules.rounding.toLocaleString("en-US"))} تومان؛ حاشیه واقعی {toPersianDigits(effective)}٪.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border-hairline p-3">
          <span className="text-text-muted">سود هر فروش مستقیم</span>
          <div className={`font-black font-mono ${price - fullCost < 0 ? "text-danger" : ""}`}>{formatToman(price - fullCost)}</div>
        </div>
        <div className="rounded-lg border border-border-hairline p-3">
          <span className="text-text-muted">سود فروش سفیری (بدترین حالت)</span>
          <div className={`font-black font-mono ${viaAmb < 0 ? "text-danger" : ""}`}>{formatToman(viaAmb)}</div>
          <span className="text-[10px] text-text-subtle">
            تخفیف {toPersianDigits(rules.ambassadorDiscount)}٪ + پورسانت {toPersianDigits(rules.maxCommission)}٪
          </span>
        </div>
      </div>
      {viaAmb < 0 && <Notice kind="warning">با این حاشیه، فروش از طریق سفیر با بیشترین پورسانت زیان‌ده است.</Notice>}

      <MutationNotice notice={notice} />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost text-xs border border-border-hairline" disabled={busy} onClick={() => send(false)}>
          ذخیره حاشیه هدف
        </button>
        {canPublishPrice ? (
          <button className="btn btn-primary text-xs" disabled={busy || dirty || price === variant.price || fullCost <= 0} onClick={() => send(true)}>
            ثبت {formatToman(price)} به‌عنوان قیمت سایت
          </button>
        ) : (
          <span className="text-[11px] text-text-muted self-center">ثبت قیمت سایت به دسترسی «ویرایش محصولات و قیمت‌ها» نیاز دارد.</span>
        )}
      </div>
      {dirty && canPublishPrice && <p className="text-[11px] text-warning">اول برگه هزینه را ذخیره کنید تا قیمت بر اساس بهای جدید ثبت شود.</p>}
    </section>
  );
}

// ---------------------------------------------------------------- shared resources

const BLANK_INPUT = { title: "", unit: "", price: 0, category: "OTHER" as CostCategoryKey, note: "" };

function InputsTab({ inputs }: { inputs: CostInputDTO[] }) {
  const [form, setForm] = useState(BLANK_INPUT);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(BLANK_INPUT);
  const { run, busy, notice } = useMutation();

  const add = async () => {
    const r = await run(() => apiCall("/api/admin/costing/inputs", "POST", form));
    if (r.success) setForm(BLANK_INPUT);
  };
  const saveEdit = async (id: string) => {
    const r = await run(() => apiCall("/api/admin/costing/inputs", "PUT", { id, ...draft }));
    if (r.success) setEditing(null);
  };
  const remove = (i: CostInputDTO) => {
    if (i.usedBy && !confirm(`«${i.title}» در ${i.usedBy} ردیف استفاده شده؛ آن ردیف‌ها با آخرین نرخ دستی می‌شوند. حذف شود؟`)) return;
    run(() => apiCall("/api/admin/costing/inputs", "DELETE", { id: i.id }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-hairline bg-bg-subtle p-3 text-xs leading-6 text-text-muted">
        منابع، هزینه‌های مصرفی مشترک هستند (آب هر لیتر، برق هر کیلووات، پودر هر گرم، کپسول هر عدد…). در برگه هزینه هر بسته فقط مقدار مصرف را وارد کنید؛ با تغییر نرخ اینجا، بهای همه
        بسته‌های مرتبط خودکار دوباره حساب می‌شود.
      </div>
      <section className="studio-card p-4 space-y-3">
        <h3 className="text-sm font-black">منبع جدید</h3>
        <InputFields value={form} onChange={setForm} />
        <button className="btn btn-primary text-xs" disabled={busy || !form.title || !form.unit} onClick={add}>
          افزودن منبع
        </button>
      </section>
      <MutationNotice notice={notice} />
      {inputs.length === 0 ? (
        <p className="text-xs text-text-muted">هنوز منبعی تعریف نشده است.</p>
      ) : (
        <div className="studio-card overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-border-hairline text-text-muted">
                <th className="text-right p-2">منبع</th>
                <th className="text-right p-2">دسته</th>
                <th className="text-right p-2">نرخ</th>
                <th className="text-right p-2">استفاده در</th>
                <th className="text-right p-2">به‌روزرسانی</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {inputs.map((i) =>
                editing === i.id ? (
                  <tr key={i.id}>
                    <td colSpan={6} className="p-3 space-y-2">
                      <InputFields value={draft} onChange={setDraft} />
                      <div className="flex gap-2">
                        <button className="btn btn-primary text-xs" disabled={busy} onClick={() => saveEdit(i.id)}>
                          ذخیره و بازمحاسبه
                        </button>
                        <button className="btn btn-ghost text-xs" onClick={() => setEditing(null)}>
                          انصراف
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={i.id}>
                    <td className="p-2 font-bold">
                      {i.title}
                      {i.note && <span className="block text-[10.5px] text-text-muted font-normal">{i.note}</span>}
                    </td>
                    <td className="p-2">{COST_CATEGORY_LABELS[i.category]}</td>
                    <td className="p-2 font-mono whitespace-nowrap">
                      {money(i.price)} تومان / {i.unit}
                    </td>
                    <td className="p-2">{i.usedBy ? `${toPersianDigits(i.usedBy)} ردیف` : "—"}</td>
                    <td className="p-2 text-text-muted">{i.updatedAt}</td>
                    <td className="p-2 whitespace-nowrap text-left">
                      <button
                        className="btn btn-ghost text-xs"
                        onClick={() => {
                          setEditing(i.id);
                          setDraft({ title: i.title, unit: i.unit, price: i.price, category: i.category, note: i.note });
                        }}
                      >
                        ویرایش
                      </button>
                      <button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => remove(i)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InputFields({ value, onChange }: { value: typeof BLANK_INPUT; onChange: (v: typeof BLANK_INPUT) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
      <input className="input text-xs" placeholder="عنوان (مثلاً آب کشت)" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} aria-label="عنوان منبع" />
      <input className="input text-xs" placeholder="واحد (لیتر، گرم، kWh)" value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} aria-label="واحد" />
      <input
        className="input text-xs font-mono"
        inputMode="numeric"
        placeholder="نرخ هر واحد (تومان)"
        value={value.price ? money(value.price) : ""}
        onChange={(e) => onChange({ ...value, price: Math.round(num(e.target.value)) })}
        aria-label="نرخ هر واحد"
      />
      <select className="input text-xs" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value as CostCategoryKey })} aria-label="دسته">
        {Object.entries(COST_CATEGORY_LABELS).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <input className="input text-xs" placeholder="توضیح / تأمین‌کننده" value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} aria-label="توضیح" />
    </div>
  );
}

// ---------------------------------------------------------------- fixed costs

const BLANK_FIXED = { title: "", category: "SALARY" as FixedCostCategoryKey, monthlyAmount: 0, note: "" };

function FixedTab({ fixed, overhead }: { fixed: FixedCostDTO[]; overhead: CostingData["overhead"] }) {
  const [form, setForm] = useState(BLANK_FIXED);
  const { run, busy, notice } = useMutation();
  const add = async () => {
    const r = await run(() => apiCall("/api/admin/costing/fixed", "POST", form));
    if (r.success) setForm(BLANK_FIXED);
  };
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fixed) if (f.isActive) m.set(FIXED_COST_LABELS[f.category], (m.get(FIXED_COST_LABELS[f.category]) ?? 0) + f.monthlyAmount);
    return [...m.entries()].map(([label, value]) => ({ label, value, hint: `${toPersianDigits(pctOf(value, overhead.monthlyTotal))}٪` })).sort((a, b) => b.value - a.value);
  }, [fixed, overhead.monthlyTotal]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-hairline bg-bg-subtle p-3 text-xs leading-6 text-text-muted">
        هزینه‌های ثابت ماهانه (حقوق، اجاره، قبوض، استهلاک…) بر تعداد تولید ماهانه ({toPersianDigits(overhead.monthlyUnits.toLocaleString("en-US"))} واحد) تقسیم می‌شوند و
        سهم هر واحد {formatToman(overhead.perUnit)} است. تعداد تولید ماهانه و گرد کردن قیمت را در{" "}
        <Link href="/portal/modules" className="font-bold text-accent-primary">
          مرکز کنترل ← قوانین ماژول بهای تمام‌شده
        </Link>{" "}
        تغییر دهید.
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4">
          <section className="studio-card p-4 space-y-3">
            <h3 className="text-sm font-black">هزینه ثابت جدید</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input className="input text-xs" placeholder="عنوان (مثلاً حقوق اپراتور)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="عنوان" />
              <select className="input text-xs" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FixedCostCategoryKey })} aria-label="دسته">
                {Object.entries(FIXED_COST_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                className="input text-xs font-mono"
                inputMode="numeric"
                placeholder="مبلغ ماهانه (تومان)"
                value={form.monthlyAmount ? money(form.monthlyAmount) : ""}
                onChange={(e) => setForm({ ...form, monthlyAmount: Math.round(num(e.target.value)) })}
                aria-label="مبلغ ماهانه"
              />
              <input className="input text-xs" placeholder="توضیح" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} aria-label="توضیح" />
            </div>
            <button className="btn btn-primary text-xs" disabled={busy || !form.title || !form.monthlyAmount} onClick={add}>
              افزودن و بازمحاسبه همه بسته‌ها
            </button>
          </section>
          <MutationNotice notice={notice} />
          {fixed.length === 0 ? (
            <p className="text-xs text-text-muted">هنوز هزینه ثابتی ثبت نشده است.</p>
          ) : (
            <div className="studio-card divide-y divide-border-hairline">
              {fixed.map((f) => (
                <FixedRow key={`${f.id}-${f.monthlyAmount}-${f.isActive}`} row={f} run={run} busy={busy} />
              ))}
            </div>
          )}
        </div>
        <section className="studio-card p-4 space-y-3">
          <h3 className="text-sm font-black">ترکیب هزینه‌های ثابت</h3>
          <div className="text-xs flex justify-between">
            <span className="text-text-muted">جمع ماهانه</span>
            <span className="font-black font-mono">{formatToman(overhead.monthlyTotal)}</span>
          </div>
          {byCat.length ? <BarList items={byCat} format={(n) => formatToman(n, false)} /> : <p className="text-xs text-text-muted">—</p>}
        </section>
      </div>
    </div>
  );
}

function FixedRow({ row, run, busy }: { row: FixedCostDTO; run: ReturnType<typeof useMutation>["run"]; busy: boolean }) {
  const [amount, setAmount] = useState(row.monthlyAmount);
  const put = (patch: Partial<FixedCostDTO>) => run(() => apiCall("/api/admin/costing/fixed", "PUT", { ...row, ...patch }));
  return (
    <div className={`p-3 flex flex-wrap items-center gap-3 text-xs ${row.isActive ? "" : "opacity-60"}`}>
      <div className="flex-1 min-w-40">
        <div className="font-bold">{row.title}</div>
        <div className="text-[10.5px] text-text-muted">
          {FIXED_COST_LABELS[row.category]}
          {row.note && ` · ${row.note}`}
        </div>
      </div>
      <div className="w-40 shrink-0">
        <input className="input text-xs font-mono w-full" inputMode="numeric" value={money(amount)} onChange={(e) => setAmount(Math.round(num(e.target.value)))} aria-label={`مبلغ ماهانه ${row.title}`} />
      </div>
      {amount !== row.monthlyAmount && (
        <button className="btn btn-primary text-xs" disabled={busy} onClick={() => put({ monthlyAmount: amount })}>
          ذخیره
        </button>
      )}
      <label className="flex items-center gap-1 cursor-pointer">
        <input type="checkbox" checked={row.isActive} disabled={busy} onChange={(e) => put({ isActive: e.target.checked })} />
        فعال
      </label>
      <button
        className="btn btn-ghost text-xs text-danger"
        disabled={busy}
        onClick={() => confirm(`«${row.title}» حذف شود؟`) && run(() => apiCall("/api/admin/costing/fixed", "DELETE", { id: row.id }))}
      >
        حذف
      </button>
    </div>
  );
}

function Line({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between text-text-muted">
      <span>{label}</span>
      <span className="font-mono">{formatToman(v)}</span>
    </div>
  );
}
