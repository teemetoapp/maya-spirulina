"use client";

import React, { useMemo, useState } from "react";
import type { OrderDTO } from "@/lib/commerce/dto";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE, ORDER_TRANSITIONS, CARRIER_LABELS, RETURN_STATUS_LABELS } from "@/lib/commerce/dto";
import { FRAUD_LABELS } from "@/lib/commerce/fraud-labels";
import { apiCall, useMutation, Notice, PageTitle, MutationNotice, EmptyState, Table, Td, Field, Modal, StatCard } from "@/components/portal/ui";
import SectionTabs from "@/components/portal/SectionTabs";
import { formatToman, toPersianDigits } from "@/lib/currency";

// ==============================================================
// Orders hub — list, pipeline (kanban) and shipping desk. All three
// views read the same orders and change status through one API, which
// runs the order lifecycle (stock, wallet, commission, notifications).
// ==============================================================

type Status = OrderDTO["status"];
const PIPELINE: Status[] = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge-status ${ORDER_STATUS_BADGE[status]}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

type WarehouseOption = { id: string; name: string };

// انتخاب انبار مبدأ فقط وقتی بیش از یک انبار فعال هست
function WarehouseSelect({ warehouses, value, onChange, className }: { warehouses: WarehouseOption[]; value: string; onChange: (v: string) => void; className: string }) {
  if (warehouses.length < 2) return null;
  return (
    <select className={className} aria-label="انبار مبدأ" value={value} onChange={(e) => onChange(e.target.value)}>
      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
  );
}

function OrderDetail({ order, canManage, onClose, warehouses }: { order: OrderDTO; canManage: boolean; onClose: () => void; warehouses: WarehouseOption[] }) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [tracking, setTracking] = useState(order.trackingCode ?? "");
  const [note, setNote] = useState(order.adminNote ?? "");
  const [carrier, setCarrier] = useState(order.carrierKey ?? "POST");
  const { run, busy, notice } = useMutation();
  const next = ORDER_TRANSITIONS[order.status].filter((s) => s !== "PAID");

  function move(status: Status) {
    if ((status === "CANCELLED" || status === "REFUNDED") && !window.confirm(`سفارش ${order.orderNumber} «${ORDER_STATUS_LABELS[status]}» شود؟ مبلغ به کیف پول مشتری برمی‌گردد.`)) return;
    run(() => apiCall(`/api/admin/orders/${order.id}`, "PATCH", { status, trackingCode: tracking, note, carrier, warehouseId }));
  }

  return (
    <Modal title={`سفارش ${order.orderNumber}`} onClose={onClose}>
      <MutationNotice notice={notice} />
      <div className="flex items-center gap-2 text-xs">
        <StatusBadge status={order.status} />
        <span className="text-text-muted">{order.createdAt}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-text-muted block">گیرنده</span>
          {order.customerName} · <span className="font-mono">{toPersianDigits(order.customerPhone)}</span>
        </div>
        <div>
          <span className="text-text-muted block">ارسال</span>
          {order.shippingMethodLabel}
        </div>
        <div className="col-span-2">
          <span className="text-text-muted block">نشانی</span>
          {order.address} · کد پستی <span className="font-mono">{toPersianDigits(order.postalCode)}</span>
        </div>
      </div>
      <Table head={["کالا", "تعداد", "مبلغ"]}>
        {order.items.map((i) => (
          <tr key={i.sku}>
            <Td>
              {i.title}
              <span className="block text-[10px] text-text-muted font-mono">{i.sku}</span>
            </Td>
            <Td>{toPersianDigits(i.quantity)}</Td>
            <Td className="font-mono">{formatToman(i.totalPrice)}</Td>
          </tr>
        ))}
      </Table>
      <div className="text-xs space-y-1">
        <div className="flex justify-between"><span>جمع کالا</span><span className="font-mono">{formatToman(order.subtotal)}</span></div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between"><span>تخفیف {order.couponCode ? `(${order.couponCode})` : "(سفیر)"}</span><span className="font-mono">−{formatToman(order.discountAmount)}</span></div>
        )}
        <div className="flex justify-between"><span>ارسال</span><span className="font-mono">{formatToman(order.shippingFee)}</span></div>
        {order.walletUsed > 0 && <div className="flex justify-between"><span>از کیف پول</span><span className="font-mono">{formatToman(order.walletUsed)}</span></div>}
        <div className="flex justify-between font-black"><span>پرداخت آنلاین</span><span className="font-mono">{formatToman(order.payableAmount)}</span></div>
        {order.referrerName && (
          <div className="flex justify-between text-text-muted"><span>سفیر معرف: {order.referrerName}</span><span className="font-mono">پورسانت {formatToman(order.commissionAmount)}</span></div>
        )}
        {order.customerNote && <p className="text-text-muted">یادداشت مشتری: {order.customerNote}</p>}
        {order.salesChannel && <p className="text-text-muted">منبع فروش: {SALES_CHANNEL_LABELS[order.salesChannel] ?? order.salesChannel}</p>}
        {order.invoiceNumber && (
          <p className="text-text-muted">
            صورتحساب شماره {toPersianDigits(order.invoiceNumber)} ·{" "}
            <a href={`/invoice/${order.orderNumber}`} target="_blank" className="text-accent-primary underline">نمایش و چاپ</a>
          </p>
        )}
        {order.fraudFlags.length > 0 && (
          <Notice kind="warning">
            <span className="font-bold">هشدار تقلب: </span>
            {order.fraudFlags.map((f) => FRAUD_LABELS[f] ?? f).join("، ")}
          </Notice>
        )}
      </div>

      {canManage && (
        <div className="space-y-3 pt-3 border-t border-border-hairline">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="شرکت حمل">
              <select className="input w-full" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                {Object.entries(CARRIER_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="کد رهگیری">
              <input dir="ltr" className="input w-full font-mono" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            </Field>
            {warehouses.length > 1 && next.includes("SHIPPED") && (
              <Field label="ارسال از انبار">
                <WarehouseSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} className="input w-full" />
              </Field>
            )}
            <Field label="یادداشت داخلی">
              <input className="input w-full" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline text-xs" disabled={busy} onClick={() => run(() => apiCall(`/api/admin/orders/${order.id}`, "PATCH", { trackingCode: tracking, note, carrier }))}>
              ذخیره یادداشت و کد
            </button>
            {next.map((s) => (
              <button key={s} className={`btn text-xs ${s === "CANCELLED" || s === "REFUNDED" ? "btn-ghost text-danger" : "btn-primary"}`} disabled={busy} onClick={() => move(s)}>
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function ListView({ orders, onOpen, initialQuery = "" }: { orders: OrderDTO[]; onOpen: (o: OrderDTO) => void; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<"ALL" | Status>("ALL");
  const filtered = orders.filter(
    (o) =>
      (status === "ALL" || o.status === status) &&
      (!q || o.orderNumber.includes(q.toUpperCase()) || o.customerName.includes(q) || o.customerPhone.includes(q))
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input className="input w-full sm:w-72" placeholder="جستجو: شماره سفارش، نام یا موبایل" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-full sm:w-48" value={status} onChange={(e) => setStatus(e.target.value as Status | "ALL")}>
          <option value="ALL">همه وضعیت‌ها</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState text="سفارشی با این مشخصات پیدا نشد." />
      ) : (
        <Table head={["سفارش", "تاریخ", "مشتری", "اقلام", "مبلغ", "وضعیت"]}>
          {filtered.map((o) => (
            <tr key={o.id} className="cursor-pointer hover:bg-bg-subtle" onClick={() => onOpen(o)}>
              <Td className="font-mono text-accent-primary">{o.orderNumber}</Td>
              <Td>{o.createdAt}</Td>
              <Td>{o.customerName}<span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(o.customerPhone)}</span></Td>
              <Td className="max-w-56 truncate">{o.itemsSummary}</Td>
              <Td className="font-mono">{formatToman(o.totalAmount)}</Td>
              <Td><StatusBadge status={o.status} /></Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function PipelineView({ orders, onOpen }: { orders: OrderDTO[]; onOpen: (o: OrderDTO) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {PIPELINE.map((s) => {
        const col = orders.filter((o) => o.status === s);
        return (
          <div key={s} className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <StatusBadge status={s} />
              <span className="text-text-muted">{toPersianDigits(col.length)}</span>
            </div>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto">
              {col.slice(0, 50).map((o) => (
                <button key={o.id} onClick={() => onOpen(o)} className="studio-card studio-card-interactive w-full text-right p-3 text-xs space-y-1">
                  <span className="font-mono font-bold block">{o.orderNumber}</span>
                  <span className="block truncate">{o.customerName}</span>
                  <span className="block font-mono text-text-muted">{formatToman(o.totalAmount)}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShippingView({ orders, canManage, warehouses }: { orders: OrderDTO[]; canManage: boolean; warehouses: WarehouseOption[] }) {
  const [from, setFrom] = useState<Record<string, string>>({});
  const toShip = orders.filter((o) => o.status === "PAID" || o.status === "PROCESSING");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [carriers, setCarriers] = useState<Record<string, string>>({});
  const { run, busy, notice } = useMutation();

  function printLabel(o: OrderDTO) {
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><title>${o.orderNumber}</title><style>body{font-family:Vazirmatn,Tahoma,sans-serif;padding:16px;font-size:13px}h2{margin:0 0 8px}div{margin:6px 0}.box{border:1px dashed #000;padding:12px}</style></head><body><div class="box"><h2>اسپیرولینا مایا</h2><div><b>سفارش:</b> ${o.orderNumber}</div><div><b>گیرنده:</b> ${o.customerName}</div><div><b>تلفن:</b> ${o.customerPhone}</div><div><b>نشانی:</b> ${o.address}</div><div><b>کد پستی:</b> ${o.postalCode}</div><div><b>روش ارسال:</b> ${o.shippingMethodLabel}</div><div><b>اقلام:</b> ${o.itemsSummary}</div></div><script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-3">
      <MutationNotice notice={notice} />
      {toShip.length === 0 ? (
        <EmptyState text="سفارشی در صف ارسال نیست." />
      ) : (
        <Table head={["سفارش", "گیرنده", "روش", "اقلام", "حمل و کد رهگیری", ""]}>
          {toShip.map((o) => (
            <tr key={o.id}>
              <Td className="font-mono">{o.orderNumber}</Td>
              <Td>{o.customerName}<span className="block text-[11px] text-text-muted">{o.address}</span></Td>
              <Td>{o.shippingMethodLabel}</Td>
              <Td className="max-w-48 truncate">{o.itemsSummary}</Td>
              <Td className="whitespace-nowrap">
                <select className="input text-xs w-24 ml-1" aria-label="شرکت حمل" value={carriers[o.id] ?? "POST"} onChange={(e) => setCarriers({ ...carriers, [o.id]: e.target.value })}>
                  {Object.entries(CARRIER_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
                <WarehouseSelect warehouses={warehouses} value={from[o.id] ?? warehouses[0]?.id ?? ""} onChange={(v) => setFrom({ ...from, [o.id]: v })} className="input text-xs w-28 ml-1" />
                <input dir="ltr" aria-label="کد رهگیری" className="input text-xs font-mono w-40" value={codes[o.id] ?? ""} onChange={(e) => setCodes({ ...codes, [o.id]: e.target.value })} />
              </Td>
              <Td className="whitespace-nowrap space-x-2 space-x-reverse">
                <button className="btn btn-outline text-xs" onClick={() => printLabel(o)}>برچسب</button>
                {canManage && o.status === "PAID" && (
                  <button className="btn btn-ghost text-xs" disabled={busy} onClick={() => run(() => apiCall(`/api/admin/orders/${o.id}`, "PATCH", { status: "PROCESSING" }))}>
                    شروع بسته‌بندی
                  </button>
                )}
                {canManage && (
                  <button className="btn btn-primary text-xs" disabled={busy || !codes[o.id]} onClick={() => run(() => apiCall(`/api/admin/orders/${o.id}`, "PATCH", { status: "SHIPPED", trackingCode: codes[o.id], carrier: carriers[o.id] ?? "POST", warehouseId: from[o.id] ?? warehouses[0]?.id }))}>
                    ثبت ارسال
                  </button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

export const SALES_CHANNEL_LABELS: Record<string, string> = {
  WHOLESALE: "عمده",
  AMBASSADOR: "سفیر",
  REFILL: "یادآوری تمدید",
  WINBACK: "پیامک بازگشت",
  COUPON: "کد تخفیف",
  UTM: "تبلیغ (utm)",
  DIRECT: "مستقیم",
};

function ReturnsView({ orders, canManage }: { orders: OrderDTO[]; canManage: boolean }) {
  const rows = orders.filter((o) => o.returnRequest).sort((a, b) => Number(b.returnRequest!.status === "REQUESTED") - Number(a.returnRequest!.status === "REQUESTED"));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const { run, busy, notice } = useMutation();
  const act = (o: OrderDTO, action: "approve" | "reject" | "refund") => {
    if (action === "refund" && !window.confirm(`مبلغ سفارش ${o.orderNumber} به کیف پول مشتری برگردد و امتیازهای آن باطل شود؟`)) return;
    run(() => apiCall("/api/admin/returns", "PATCH", { id: o.returnRequest!.id, action, note: notes[o.id] ?? "", restock: restock[o.id] ?? true }));
  };
  if (rows.length === 0) return <EmptyState text="درخواست مرجوعی ثبت نشده است." />;
  return (
    <div className="space-y-3">
      <MutationNotice notice={notice} />
      <Table head={["سفارش", "مشتری", "دلیل", "وضعیت", ""]}>
        {rows.map((o) => {
          const r = o.returnRequest!;
          const open = r.status === "REQUESTED" || r.status === "APPROVED";
          return (
            <tr key={o.id}>
              <Td className="font-mono">{o.orderNumber}<span className="block text-[10px] text-text-muted">{r.createdAt}</span></Td>
              <Td>{o.customerName}<span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(o.customerPhone)}</span></Td>
              <Td className="max-w-56">{r.reason}{r.details && <span className="block text-[11px] text-text-muted">{r.details}</span>}</Td>
              <Td>{RETURN_STATUS_LABELS[r.status]}{r.adminNote && <span className="block text-[11px] text-text-muted">{r.adminNote}</span>}</Td>
              <Td className="space-y-1 min-w-56">
                {canManage && open && (
                  <>
                    <input className="input text-xs w-full" placeholder="یادداشت برای مشتری" value={notes[o.id] ?? ""} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
                    <label className="flex items-center gap-1 text-[11px]">
                      <input type="checkbox" checked={restock[o.id] ?? true} onChange={(e) => setRestock({ ...restock, [o.id]: e.target.checked })} />
                      کالا سالم است؛ به انبار برگردد
                    </label>
                    <div className="flex gap-1">
                      {r.status === "REQUESTED" && <button className="btn btn-outline text-xs" disabled={busy} onClick={() => act(o, "approve")}>تأیید</button>}
                      <button className="btn btn-primary text-xs" disabled={busy} onClick={() => act(o, "refund")}>بازپرداخت</button>
                      <button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => act(o, "reject")}>رد</button>
                    </div>
                  </>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

export default function OrdersAdmin({ orders, canManage, initialQuery = "", warehouses = [] }: { orders: OrderDTO[]; canManage: boolean; initialQuery?: string; warehouses?: WarehouseOption[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = orders.find((o) => o.id === openId) ?? null;
  const openReturns = orders.filter((o) => o.returnRequest?.status === "REQUESTED").length;
  const stats = useMemo(() => {
    const paid = orders.filter((o) => !["PENDING", "CANCELLED", "REFUNDED"].includes(o.status));
    return {
      revenue: paid.reduce((s, o) => s + o.totalAmount, 0),
      toShip: orders.filter((o) => o.status === "PAID" || o.status === "PROCESSING").length,
      shipped: orders.filter((o) => o.status === "SHIPPED").length,
      pending: orders.filter((o) => o.status === "PENDING").length,
    };
  }, [orders]);

  return (
    <div className="space-y-5">
      <PageTitle title="همه سفارش‌های سازمان" subtitle="همه سفارش‌های ثبت‌شده توسط مشتریان و سفیران. تغییر وضعیت، کد رهگیری و لغو در هر سه نما یکسان ثبت می‌شود و پیامک مشتری خودکار ارسال می‌شود." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="فروش پرداخت‌شده" value={formatToman(stats.revenue)} />
        <StatCard label="در صف ارسال" value={toPersianDigits(stats.toShip)} />
        <StatCard label="در راه" value={toPersianDigits(stats.shipped)} />
        <StatCard label="در انتظار پرداخت" value={toPersianDigits(stats.pending)} />
      </div>
      <SectionTabs
        tabs={[
          { id: "list", label: "فهرست", content: <ListView initialQuery={initialQuery} orders={orders} onOpen={(o) => setOpenId(o.id)} /> },
          { id: "pipeline", label: "خط تولید سفارش", content: <PipelineView orders={orders} onOpen={(o) => setOpenId(o.id)} /> },
          { id: "shipping", label: "میز ارسال", content: <ShippingView orders={orders} canManage={canManage} warehouses={warehouses} /> },
          {
            id: "returns",
            label: `مرجوعی‌ها${openReturns ? ` (${toPersianDigits(openReturns)})` : ""}`,
            content: <ReturnsView orders={orders} canManage={canManage} />,
          },
        ]}
      />
      {open && <OrderDetail key={open.id + open.status} order={open} canManage={canManage} onClose={() => setOpenId(null)} warehouses={warehouses} />}
    </div>
  );
}
