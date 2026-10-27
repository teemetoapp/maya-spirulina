"use client";

import React, { useState } from "react";
import type { AdminProduct, AdminVariant, AdminBatch } from "@/lib/portal/catalog-admin";
import { apiCall, useMutation, PageTitle, MutationNotice, EmptyState, Table, Td, Field, Modal, StatCard, Notice } from "@/components/portal/ui";
import SectionTabs from "@/components/portal/SectionTabs";
import { formatToman, toPersianDigits, toEnglishDigits } from "@/lib/currency";
import QRCode from "qrcode";
import type { WarehouseView } from "@/lib/commerce/warehouses";
import { formatJalaliShort } from "@/lib/jalali";

type WarehouseData = { warehouses: WarehouseView[]; transfers: { id: string; at: string; from: string; to: string; sku: string; quantity: number; note: string }[] };

// ==============================================================
// Products & inventory — a small catalog (today one product, at most
// 4–5 later). Each product has sellable packs (variants) with their
// own SKU, price and stock; stock comes in through production batches.
// ==============================================================

interface Perms {
  canEditProducts: boolean;
  canManageInventory: boolean;
}

const num = (v: string) => Number(toEnglishDigits(v || "0")) || 0;

function ProductForm({ product, onDone }: { product: AdminProduct | null; onDone: () => void }) {
  const [f, setF] = useState({
    slug: product?.slug ?? "",
    title: product?.title ?? "",
    subtitle: product?.subtitle ?? "",
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? "",
    dosageInstructions: product?.dosageInstructions ?? "",
    benefits: product?.benefits.join("\n") ?? "",
    images: product?.images.join("\n") ?? "",
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    sortOrder: String(product?.sortOrder ?? 0),
  });
  const { run, busy, notice } = useMutation();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal title={product ? `ویرایش ${product.title}` : "محصول جدید"} onClose={onDone}>
      <MutationNotice notice={notice} />
      <form
        className="space-y-3 text-xs"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await run(() =>
            apiCall("/api/admin/products", product ? "PATCH" : "POST", { ...f, id: product?.id, sortOrder: num(f.sortOrder) })
          );
          if (res.success) onDone();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="عنوان"><input required className="input w-full" value={f.title} onChange={set("title")} /></Field>
          <Field label="اسلاگ (آدرس)"><input required dir="ltr" disabled={!!product} className="input w-full" value={f.slug} onChange={set("slug")} /></Field>
        </div>
        <Field label="زیرعنوان"><input className="input w-full" value={f.subtitle} onChange={set("subtitle")} /></Field>
        <Field label="خلاصه"><textarea rows={2} className="input w-full" value={f.shortDescription} onChange={set("shortDescription")} /></Field>
        <Field label="توضیحات کامل"><textarea required rows={4} className="input w-full" value={f.description} onChange={set("description")} /></Field>
        <Field label="دستور مصرف"><textarea rows={2} className="input w-full" value={f.dosageInstructions} onChange={set("dosageInstructions")} /></Field>
        <Field label="مزایا (هر خط یک مورد)"><textarea rows={3} className="input w-full" value={f.benefits} onChange={set("benefits")} /></Field>
        <Field label="آدرس تصاویر (هر خط یک آدرس)"><textarea dir="ltr" rows={2} className="input w-full" value={f.images} onChange={set("images")} /></Field>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> فعال در فروشگاه</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.isFeatured} onChange={(e) => setF({ ...f, isFeatured: e.target.checked })} /> محصول اصلی صفحه اول</label>
          <Field label="ترتیب"><input dir="ltr" className="input w-20" value={f.sortOrder} onChange={set("sortOrder")} /></Field>
        </div>
        <div className="flex justify-end"><button className="btn btn-primary text-xs" disabled={busy}>ذخیره</button></div>
      </form>
    </Modal>
  );
}

function VariantForm({ productId, variant, onDone }: { productId: string; variant: AdminVariant | null; onDone: () => void }) {
  const [f, setF] = useState({
    sku: variant?.sku ?? "",
    title: variant?.title ?? "",
    format: variant?.format ?? "CAPSULE",
    durationDays: String(variant?.durationDays ?? 30),
    packDescription: variant?.packDescription ?? "",
    badge: variant?.badge ?? "",
    price: String(variant?.price ?? ""),
    compareAtPrice: String(variant?.compareAtPrice ?? ""),
    costPrice: String(variant?.costPrice ?? 0),
    lowStockAlert: String(variant?.lowStockAlert ?? 10),
    weightGrams: String(variant?.weightGrams ?? ""),
    isActive: variant?.isActive ?? true,
    sortOrder: String(variant?.sortOrder ?? 0),
  });
  const { run, busy, notice } = useMutation();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const margin = num(f.price) > 0 ? Math.round(((num(f.price) - num(f.costPrice)) / num(f.price)) * 100) : 0;

  return (
    <Modal title={variant ? `ویرایش ${variant.sku}` : "بسته جدید"} onClose={onDone}>
      <MutationNotice notice={notice} />
      <form
        className="space-y-3 text-xs"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await run(() =>
            apiCall("/api/admin/variants", variant ? "PATCH" : "POST", {
              ...f,
              id: variant?.id,
              productId,
              durationDays: num(f.durationDays),
              price: num(f.price),
              compareAtPrice: num(f.compareAtPrice),
              costPrice: num(f.costPrice),
              lowStockAlert: num(f.lowStockAlert),
              weightGrams: num(f.weightGrams),
              sortOrder: num(f.sortOrder),
            })
          );
          if (res.success) onDone();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU"><input required dir="ltr" disabled={!!variant} className="input w-full font-mono" value={f.sku} onChange={set("sku")} /></Field>
          <Field label="عنوان بسته"><input required className="input w-full" value={f.title} onChange={set("title")} /></Field>
          <Field label="شکل">
            <select className="input w-full" value={f.format} onChange={set("format")}>
              <option value="CAPSULE">قرص / کپسول</option>
              <option value="POWDER">پودر</option>
            </select>
          </Field>
          <Field label="دوره مصرف (روز)"><input dir="ltr" className="input w-full" value={f.durationDays} onChange={set("durationDays")} /></Field>
          <Field label="قیمت فروش (تومان)"><input required dir="ltr" className="input w-full font-mono" value={f.price} onChange={set("price")} /></Field>
          <Field label="قیمت قبل از تخفیف"><input dir="ltr" className="input w-full font-mono" value={f.compareAtPrice} onChange={set("compareAtPrice")} /></Field>
          <Field label={`بهای تمام‌شده (حاشیه ${toPersianDigits(margin)}٪) · جزئیات در «بهای تمام‌شده»`}><input dir="ltr" className="input w-full font-mono" value={f.costPrice} onChange={set("costPrice")} /></Field>
          <Field label="هشدار کمبود موجودی"><input dir="ltr" className="input w-full" value={f.lowStockAlert} onChange={set("lowStockAlert")} /></Field>
          <Field label="توضیح بسته‌بندی"><input className="input w-full" value={f.packDescription} onChange={set("packDescription")} /></Field>
          <Field label="برچسب (مثلاً پرفروش‌ترین)"><input className="input w-full" value={f.badge} onChange={set("badge")} /></Field>
          <Field label="وزن (گرم)"><input dir="ltr" className="input w-full" value={f.weightGrams} onChange={set("weightGrams")} /></Field>
          <Field label="ترتیب نمایش"><input dir="ltr" className="input w-full" value={f.sortOrder} onChange={set("sortOrder")} /></Field>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> قابل فروش</label>
        <div className="flex justify-end"><button className="btn btn-primary text-xs" disabled={busy}>ذخیره</button></div>
      </form>
    </Modal>
  );
}

function ProductsTab({ products, perms }: { products: AdminProduct[]; perms: Perms }) {
  const [editProduct, setEditProduct] = useState<AdminProduct | null | "new">(null);
  const [editVariant, setEditVariant] = useState<{ productId: string; variant: AdminVariant | null } | null>(null);

  return (
    <div className="space-y-5">
      {perms.canEditProducts && (
        <div className="flex justify-end">
          <button className="btn btn-outline text-xs" onClick={() => setEditProduct("new")}>محصول جدید</button>
        </div>
      )}
      {products.length === 0 && <EmptyState text="هنوز محصولی ثبت نشده است." />}
      {products.map((p) => (
        <div key={p.id} className="studio-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black">{p.title}</h2>
                {p.isFeatured && <span className="badge-status badge-status-success">محصول اصلی</span>}
                {!p.isActive && <span className="badge-status badge-status-neutral">غیرفعال</span>}
              </div>
              <span className="text-[11px] text-text-muted font-mono" dir="ltr">/{p.slug}</span>
            </div>
            {perms.canEditProducts && (
              <div className="flex gap-2">
                <button className="btn btn-ghost text-xs" onClick={() => setEditProduct(p)}>ویرایش محصول</button>
                <button className="btn btn-outline text-xs" onClick={() => setEditVariant({ productId: p.id, variant: null })}>افزودن بسته</button>
              </div>
            )}
          </div>
          <Table head={["SKU", "بسته", "قیمت", "بهای تمام‌شده", "موجودی", "فروش ۳۰ روز", "وضعیت", ""]}>
            {p.variants.map((v) => (
              <tr key={v.id}>
                <Td className="font-mono">{v.sku}</Td>
                <Td>{v.title}{v.badge && <span className="badge-status badge-status-info mr-2">{v.badge}</span>}</Td>
                <Td className="font-mono">{formatToman(v.price)}</Td>
                <Td className="font-mono">{formatToman(v.costPrice)}</Td>
                <Td className={`font-mono ${v.stock <= v.lowStockAlert ? "text-danger font-bold" : ""}`}>{toPersianDigits(v.stock)}</Td>
                <Td className="font-mono">{toPersianDigits(v.sold30d)}</Td>
                <Td><span className={`badge-status ${v.isActive ? "badge-status-success" : "badge-status-neutral"}`}>{v.isActive ? "فعال" : "غیرفعال"}</span></Td>
                <Td>{perms.canEditProducts && <button className="btn btn-ghost text-xs" onClick={() => setEditVariant({ productId: p.id, variant: v })}>ویرایش</button>}</Td>
              </tr>
            ))}
          </Table>
        </div>
      ))}
      {editProduct && <ProductForm product={editProduct === "new" ? null : editProduct} onDone={() => setEditProduct(null)} />}
      {editVariant && <VariantForm productId={editVariant.productId} variant={editVariant.variant} onDone={() => setEditVariant(null)} />}
    </div>
  );
}

function InventoryTab({ products, perms, warehouses }: { products: AdminProduct[]; perms: Perms; warehouses: WarehouseView[] | null }) {
  const variants = products.flatMap((p) => p.variants.map((v) => ({ ...v, productTitle: p.title })));
  const active = (warehouses ?? []).filter((w) => w.isActive);
  const [batch, setBatch] = useState({ variantId: variants[0]?.id ?? "", batchCode: "", quantity: "", productionDate: "", expiryDate: "", labReportUrl: "", warehouseId: "" });
  const { run, busy, notice } = useMutation();
  const low = variants.filter((v) => v.isActive && v.stock <= v.lowStockAlert);

  function adjust(v: AdminVariant) {
    const delta = window.prompt(`تغییر موجودی ${v.sku}${active.length > 1 ? " در انبار پیش‌فرض" : ""} (مثلاً ۵ یا -۲):`);
    if (!delta) return;
    const reason = window.prompt("دلیل اصلاح موجودی:") ?? "";
    run(() => apiCall("/api/admin/inventory", "PATCH", { variantId: v.id, delta: Number(toEnglishDigits(delta)), reason }));
  }

  return (
    <div className="space-y-5">
      <MutationNotice notice={notice} />
      {low.length > 0 && <Notice kind="warning">موجودی این بسته‌ها کم است: {low.map((v) => v.sku).join("، ")}</Notice>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="کل موجودی (عدد)" value={toPersianDigits(variants.reduce((s, v) => s + v.stock, 0))} />
        <StatCard label="ارزش موجودی (بهای تمام‌شده)" value={formatToman(variants.reduce((s, v) => s + v.stock * v.costPrice, 0))} />
        <StatCard label="فروش ۳۰ روز اخیر" value={toPersianDigits(variants.reduce((s, v) => s + v.sold30d, 0))} />
        <StatCard label="بسته‌های کم‌موجودی" value={toPersianDigits(low.length)} />
      </div>
      {perms.canManageInventory && (
        <form
          className="studio-card p-5 grid grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await run(() => apiCall("/api/admin/inventory", "POST", { ...batch, quantity: num(batch.quantity) }));
            if (res.success) setBatch({ ...batch, batchCode: "", quantity: "" });
          }}
        >
          <Field label="بسته">
            <select className="input w-full" value={batch.variantId} onChange={(e) => setBatch({ ...batch, variantId: e.target.value })}>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}
            </select>
          </Field>
          <Field label="کد بچ"><input required dir="ltr" className="input w-full font-mono" value={batch.batchCode} onChange={(e) => setBatch({ ...batch, batchCode: e.target.value })} /></Field>
          <Field label="تعداد"><input required dir="ltr" className="input w-full" value={batch.quantity} onChange={(e) => setBatch({ ...batch, quantity: e.target.value })} /></Field>
          <Field label="تاریخ تولید"><input required type="date" className="input w-full" value={batch.productionDate} onChange={(e) => setBatch({ ...batch, productionDate: e.target.value })} /></Field>
          <Field label="تاریخ انقضا"><input required type="date" className="input w-full" value={batch.expiryDate} onChange={(e) => setBatch({ ...batch, expiryDate: e.target.value })} /></Field>
          {active.length > 1 && (
            <Field label="انبار">
              <select className="input w-full" value={batch.warehouseId} onChange={(e) => setBatch({ ...batch, warehouseId: e.target.value })}>
                <option value="">انبار پیش‌فرض</option>
                {active.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
          )}
          <button className="btn btn-primary text-xs" disabled={busy}>ورود بچ به انبار</button>
        </form>
      )}
      <Table head={["SKU", "محصول", "موجودی", "حد هشدار", "فروش ۳۰ روز", "پوشش (روز)", ""]}>
        {variants.map((v) => (
          <tr key={v.id}>
            <Td className="font-mono">{v.sku}</Td>
            <Td>{v.title}</Td>
            <Td className={`font-mono ${v.stock <= v.lowStockAlert ? "text-danger font-bold" : ""}`}>{toPersianDigits(v.stock)}</Td>
            <Td className="font-mono">{toPersianDigits(v.lowStockAlert)}</Td>
            <Td className="font-mono">{toPersianDigits(v.sold30d)}</Td>
            <Td className="font-mono">{v.sold30d > 0 ? toPersianDigits(Math.floor((v.stock / v.sold30d) * 30)) : "—"}</Td>
            <Td>{perms.canManageInventory && <button className="btn btn-ghost text-xs" disabled={busy} onClick={() => adjust(v)}>اصلاح موجودی</button>}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function ExpiryTab({ batches }: { batches: AdminBatch[] }) {
  const expiring = batches.filter((b) => b.daysToExpiry <= 90);
  return (
    <div className="space-y-4">
      {expiring.length > 0 && <Notice kind="warning">{toPersianDigits(expiring.length)} بچ کمتر از ۹۰ روز تا انقضا دارد. فروش آن‌ها را در اولویت بگذارید (FEFO).</Notice>}
      {batches.length === 0 ? (
        <EmptyState text="هنوز بچ تولیدی ثبت نشده است." />
      ) : (
        <Table head={["کد بچ", "SKU", "تعداد ورودی", "تولید", "انقضا", "باقی‌مانده"]}>
          {batches.map((b) => (
            <tr key={b.id}>
              <Td className="font-mono">{b.batchCode}</Td>
              <Td className="font-mono">{b.sku}</Td>
              <Td className="font-mono">{toPersianDigits(b.quantity)}</Td>
              <Td>{b.productionDate}</Td>
              <Td>{b.expiryDate}</Td>
              <Td>
                <span className={`badge-status ${b.daysToExpiry < 0 ? "badge-status-danger" : b.daysToExpiry <= 90 ? "badge-status-warning" : "badge-status-success"}`}>
                  {b.daysToExpiry < 0 ? "منقضی شده" : `${toPersianDigits(b.daysToExpiry)} روز`}
                </span>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

// چند انبار: موجودی فیزیکی هر انبار، انتقال و اصلاح شمارش
function WarehousesTab({ products, data }: { products: AdminProduct[]; data: WarehouseData }) {
  const variants = products.flatMap((p) => p.variants);
  const active = data.warehouses.filter((w) => w.isActive);
  const { run, busy, notice } = useMutation();
  const [add, setAdd] = useState({ name: "", city: "" });
  const [tr, setTr] = useState({ fromId: active[0]?.id ?? "", toId: active[1]?.id ?? "", variantId: variants[0]?.id ?? "", quantity: "", note: "" });
  const [adj, setAdj] = useState({ warehouseId: active[0]?.id ?? "", variantId: variants[0]?.id ?? "", delta: "", reason: "" });
  const reserved = (variantId: string) => data.warehouses.reduce((n, w) => n + (w.stock[variantId] ?? 0), 0) - (variants.find((v) => v.id === variantId)?.stock ?? 0);

  return (
    <div className="space-y-5 text-xs">
      <MutationNotice notice={notice} />
      <Notice kind="info">موجودی هر انبار، کالای فیزیکی داخل آن است. «رزرو» یعنی سفارش پرداخت‌شده‌ای که هنوز ارسال نشده؛ با ثبت ارسال از انبار انتخاب‌شده کم می‌شود.</Notice>
      <Table head={["SKU", ...data.warehouses.map((w) => `${w.name}${w.isDefault ? " (پیش‌فرض)" : ""}${w.isActive ? "" : " (غیرفعال)"}`), "رزرو ارسال‌نشده", "قابل فروش"]}>
        {variants.map((v) => (
          <tr key={v.id}>
            <Td className="font-mono">{v.sku}</Td>
            {data.warehouses.map((w) => <Td key={w.id} className="font-mono">{toPersianDigits(w.stock[v.id] ?? 0)}</Td>)}
            <Td className="font-mono">{toPersianDigits(reserved(v.id))}</Td>
            <Td className="font-mono">{toPersianDigits(v.stock)}</Td>
          </tr>
        ))}
      </Table>

      <div className="grid lg:grid-cols-3 gap-4">
        <form className="studio-card p-4 space-y-2" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => apiCall("/api/admin/warehouses", "PUT", { ...tr, quantity: num(tr.quantity) })); if (r.success) setTr({ ...tr, quantity: "", note: "" }); }}>
          <p className="font-bold">انتقال بین انبارها</p>
          <Field label="از"><select className="input w-full" value={tr.fromId} onChange={(e) => setTr({ ...tr, fromId: e.target.value })}>{active.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
          <Field label="به"><select className="input w-full" value={tr.toId} onChange={(e) => setTr({ ...tr, toId: e.target.value })}>{active.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
          <Field label="بسته"><select className="input w-full" value={tr.variantId} onChange={(e) => setTr({ ...tr, variantId: e.target.value })}>{variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}</select></Field>
          <Field label="تعداد"><input required dir="ltr" className="input w-full" value={tr.quantity} onChange={(e) => setTr({ ...tr, quantity: e.target.value })} /></Field>
          <Field label="توضیح"><input className="input w-full" maxLength={200} value={tr.note} onChange={(e) => setTr({ ...tr, note: e.target.value })} /></Field>
          <button className="btn btn-primary text-xs" disabled={busy || active.length < 2}>ثبت انتقال</button>
        </form>

        <form className="studio-card p-4 space-y-2" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => apiCall("/api/admin/inventory", "PATCH", { ...adj, delta: num(adj.delta) })); if (r.success) setAdj({ ...adj, delta: "", reason: "" }); }}>
          <p className="font-bold">اصلاح شمارش یک انبار</p>
          <Field label="انبار"><select className="input w-full" value={adj.warehouseId} onChange={(e) => setAdj({ ...adj, warehouseId: e.target.value })}>{active.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
          <Field label="بسته"><select className="input w-full" value={adj.variantId} onChange={(e) => setAdj({ ...adj, variantId: e.target.value })}>{variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}</select></Field>
          <Field label="تغییر (مثلاً ۵ یا -۲)"><input required dir="ltr" className="input w-full" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} /></Field>
          <Field label="دلیل"><input required className="input w-full" maxLength={200} value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} /></Field>
          <button className="btn btn-primary text-xs" disabled={busy}>ثبت اصلاح</button>
        </form>

        <div className="studio-card p-4 space-y-3">
          <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => apiCall("/api/admin/warehouses", "POST", add)); if (r.success) setAdd({ name: "", city: "" }); }}>
            <p className="font-bold">انبار جدید</p>
            <Field label="نام"><input required maxLength={60} className="input w-full" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></Field>
            <Field label="شهر"><input maxLength={40} className="input w-full" value={add.city} onChange={(e) => setAdd({ ...add, city: e.target.value })} /></Field>
            <button className="btn btn-primary text-xs" disabled={busy}>افزودن</button>
          </form>
          <ul className="space-y-1">
            {data.warehouses.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2">
                <span>{w.name}{w.city ? ` · ${w.city}` : ""}</span>
                <span className="flex gap-1">
                  {!w.isDefault && w.isActive && <button type="button" className="btn btn-ghost text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/warehouses", "PATCH", { id: w.id, isDefault: true }))}>پیش‌فرض</button>}
                  {!w.isDefault && <button type="button" className="btn btn-ghost text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/warehouses", "PATCH", { id: w.id, isActive: !w.isActive }))}>{w.isActive ? "غیرفعال" : "فعال"}</button>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {data.transfers.length > 0 && (
        <Table head={["تاریخ", "از", "به", "SKU", "تعداد", "توضیح"]}>
          {data.transfers.map((t) => (
            <tr key={t.id}>
              <Td>{formatJalaliShort(t.at)}</Td>
              <Td>{t.from}</Td>
              <Td>{t.to}</Td>
              <Td className="font-mono">{t.sku}</Td>
              <Td className="font-mono">{toPersianDigits(t.quantity)}</Td>
              <Td>{t.note || "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

// ردیابی بچ: اطلاعات عمومی صفحه /batch/<کد> و QR چاپ روی بسته
function TraceTab({ batches }: { batches: AdminBatch[] }) {
  const [edit, setEdit] = useState<AdminBatch | null>(null);
  const [qr, setQr] = useState<{ code: string; url: string; img: string } | null>(null);
  const { run, busy, notice } = useMutation();
  const base = (process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");

  const showQr = async (code: string) => {
    const url = `${base}/batch/${encodeURIComponent(code)}`;
    setQr({ code, url, img: await QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: "M" }) });
  };

  return (
    <div className="space-y-4 text-xs">
      <Notice kind="info">مشتری با اسکن QR روی بسته، تاریخ تولید و برداشت و نتیجه آزمایش همان سری را می‌بیند. فقط بچی منتشر می‌شود که برگه آزمایش واقعی دارد؛ فایل PDF را در پوشه public/lab-reports بگذارید یا لینک https بدهید.</Notice>
      <MutationNotice notice={notice} />
      {batches.length === 0 ? (
        <EmptyState text="هنوز بچ تولیدی ثبت نشده است." />
      ) : (
        <Table head={["کد بچ", "SKU", "برداشت", "آزمایشگاه", "وضعیت", ""]}>
          {batches.map((b) => (
            <tr key={b.id}>
              <Td className="font-mono">{b.batchCode}</Td>
              <Td className="font-mono">{b.sku}</Td>
              <Td>{b.harvestDate ? toPersianDigits(b.harvestDate) : "—"}</Td>
              <Td>{b.labName || "—"}</Td>
              <Td>
                <span className={`badge-status ${b.isPublic ? "badge-status-success" : "badge-status-warning"}`}>{b.isPublic ? "منتشر شده" : "منتشر نشده"}</span>
              </Td>
              <Td>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline text-xs" onClick={() => setEdit(b)}>ویرایش</button>
                  <button type="button" className="btn btn-outline text-xs" onClick={() => showQr(b.batchCode)}>QR</button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {edit && (
        <Modal title={`ردیابی بچ ${edit.batchCode}`} onClose={() => setEdit(null)}>
          <form
            className="space-y-3 text-xs"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await run(() => apiCall("/api/admin/inventory", "PUT", edit));
              if (res.success) setEdit(null);
            }}
          >
            <Field label="تاریخ برداشت از مزرعه"><input type="date" className="input w-full" value={edit.harvestDate} onChange={(e) => setEdit({ ...edit, harvestDate: e.target.value })} /></Field>
            <Field label="نام آزمایشگاه"><input className="input w-full" maxLength={120} value={edit.labName} onChange={(e) => setEdit({ ...edit, labName: e.target.value })} /></Field>
            <Field label="خلاصه نتیجه (دقیقاً مطابق برگه آزمایش)"><textarea className="input w-full" rows={4} maxLength={1000} value={edit.labSummary} onChange={(e) => setEdit({ ...edit, labSummary: e.target.value })} /></Field>
            <Field label="لینک برگه آزمایش"><input dir="ltr" className="input w-full font-mono" placeholder="/lab-reports/B-1405-01.pdf" value={edit.labReportUrl ?? ""} onChange={(e) => setEdit({ ...edit, labReportUrl: e.target.value })} /></Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={edit.isPublic} onChange={(e) => setEdit({ ...edit, isPublic: e.target.checked })} />
              نمایش عمومی با اسکن QR
            </label>
            <button type="submit" className="btn btn-primary text-xs" disabled={busy}>ذخیره</button>
          </form>
        </Modal>
      )}

      {qr && (
        <Modal title={`QR بچ ${qr.code}`} onClose={() => setQr(null)}>
          <div className="space-y-3 text-center text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.img} alt={`QR بچ ${qr.code}`} className="mx-auto w-56 h-56" />
            <p dir="ltr" className="font-mono break-all">{qr.url}</p>
            <a href={qr.img} download={`batch-${qr.code}.png`} className="btn btn-primary text-xs inline-flex">دانلود برای چاپ</a>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function CatalogAdmin({ products, batches, perms, trace = false, warehouses = null }: { products: AdminProduct[]; batches: AdminBatch[]; perms: Perms; trace?: boolean; warehouses?: WarehouseData | null }) {
  return (
    <div className="space-y-5">
      <PageTitle title="محصولات و انبار" subtitle="قیمت، بسته‌ها، موجودی و تاریخ انقضا. قیمت فروشگاه و صفحه پرداخت مستقیماً از همین‌جا خوانده می‌شود." />
      <SectionTabs
        tabs={[
          { id: "products", label: "محصولات و بسته‌ها", content: <ProductsTab products={products} perms={perms} /> },
          { id: "inventory", label: "موجودی انبار", content: <InventoryTab products={products} perms={perms} warehouses={warehouses?.warehouses ?? null} /> },
          ...(warehouses && perms.canManageInventory ? [{ id: "warehouses", label: "انبارها و انتقال", content: <WarehousesTab products={products} data={warehouses} /> }] : []),
          { id: "expiry", label: "کنترل انقضا", content: <ExpiryTab batches={batches} /> },
          ...(trace && perms.canManageInventory ? [{ id: "trace", label: "ردیابی بچ و QR", content: <TraceTab batches={batches} /> }] : []),
        ]}
      />
    </div>
  );
}
