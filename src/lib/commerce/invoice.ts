import type { Order, OrderItem } from "@prisma/client";

// ==============================================================
// Official invoice lines. Site prices include VAT, so each line is split
//   net = line total − its share of the order discount
//   base = net ÷ (1 + VAT%)   tax = net − base
// Shipping is its own line. Amounts are in Rial (Moadian works in Rial).
// shortcut: one VAT rate and one goods ID for every line (single product family);
// move both to the variant when products with different tax rules are added.
// ==============================================================

export interface InvoiceLine {
  title: string;
  sku: string;
  quantity: number;
  unitPriceRial: number;
  grossRial: number;
  discountRial: number;
  baseRial: number;
  taxRial: number;
  totalRial: number;
}

export function invoiceLines(order: Order & { items: OrderItem[] }, vatPercent: number): InvoiceLine[] {
  const subtotal = order.items.reduce((s, i) => s + i.totalPrice, 0) || 1;
  let discountLeft = order.discountAmount;
  const rows = order.items.map((i, idx) => {
    // آخرین ردیف باقی‌مانده تخفیف را می‌گیرد تا جمع‌ها دقیق بمانند
    const discount = idx === order.items.length - 1 ? discountLeft : Math.round((order.discountAmount * i.totalPrice) / subtotal);
    discountLeft -= discount;
    return { title: i.productTitle, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice, gross: i.totalPrice, discount };
  });
  if (order.shippingFee > 0) rows.push({ title: "هزینه ارسال", sku: "SHIPPING", quantity: 1, unitPrice: order.shippingFee, gross: order.shippingFee, discount: 0 });
  return rows.map((r) => {
    const net = (r.gross - r.discount) * 10;
    const base = Math.round(net / (1 + vatPercent / 100));
    return {
      title: r.title,
      sku: r.sku,
      quantity: r.quantity,
      unitPriceRial: r.unitPrice * 10,
      grossRial: r.gross * 10,
      discountRial: r.discount * 10,
      baseRial: base,
      taxRial: net - base,
      totalRial: net,
    };
  });
}
