import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getModuleStates } from "@/lib/modules/server";
import type { AmbassadorTier, ShippingMethod } from "@prisma/client";

// ==============================================================
// Server-side pricing. Prices, discounts, shipping and commission
// are always computed here from the database; amounts sent by the
// browser are never trusted.
// ==============================================================

export interface CartLineInput {
  sku: string;
  quantity: number;
}

export interface QuoteInput {
  items: CartLineInput[];
  userId?: string | null;
  couponCode?: string | null;
  referralCode?: string | null;
  shippingMethod?: ShippingMethod;
  useWallet?: boolean;
  province?: string | null;
  city?: string | null;
}

export interface QuoteLine {
  variantId: string;
  sku: string;
  title: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  totalPrice: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  discountSource: "COUPON" | "AMBASSADOR" | "WHOLESALE" | null;
  discountLabel: string | null;
  couponCode: string | null;
  couponError: string | null;
  shippingMethod: ShippingMethod;
  shippingFee: number;
  freeShippingThreshold: number;
  total: number;
  walletBalance: number;
  walletUsed: number;
  payable: number;
  referrer: { id: string; name: string | null; tier: AmbassadorTier } | null;
  commissionPercent: number;
  commissionAmount: number;
  wholesale: boolean;
}

export class PricingError extends Error {}

export function commissionPercentForTier(tier: AmbassadorTier, settings: Record<string, string>): number {
  const key = tier === "DIAMOND" ? "COMMISSION_DIAMOND" : tier === "GOLD" ? "COMMISSION_GOLD" : "COMMISSION_SILVER";
  return Number(settings[key]) || 0;
}

async function findAmbassadorByCode(code: string) {
  return prisma.user.findFirst({
    where: {
      referralCode: code.trim().toUpperCase(),
      isActive: true,
      roles: { some: { role: { permissions: { has: "portal.ambassador" } } } },
    },
    select: { id: true, name: true, ambassadorTier: true },
  });
}

// "10:15,30:20" → [{min:10,pct:15},{min:30,pct:20}] (پله‌ها صعودی)
export function parseWholesaleTiers(raw: string | undefined): { min: number; pct: number }[] {
  return (raw ?? "")
    .split(",")
    .map((t) => t.split(":").map(Number))
    .filter(([min, pct]) => min > 0 && pct > 0 && pct < 100)
    .map(([min, pct]) => ({ min, pct }))
    .sort((a, b) => a.min - b.min);
}

export function wholesalePercent(totalQty: number, tiers: { min: number; pct: number }[]): number {
  return tiers.filter((t) => totalQty >= t.min).at(-1)?.pct ?? 0;
}

// نام شهر/استان بدون فاصله و با ی/ک فارسی (قانون متنی فاصله‌ها را حذف می‌کند)
const placeKey = (s: string) => s.replace(/\s+|\u200c/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");

// "تهران:45000,کرج:55000" → هزینه پست برای شهر، وگرنه استان، وگرنه پیش‌فرض
export function zoneShippingFee(raw: string | undefined, province: string | null | undefined, city: string | null | undefined, fallback: number): number {
  const zones = new Map(
    (raw ?? "")
      .split(",")
      .map((z) => z.split(":"))
      .filter(([name, fee]) => name && /^\d+$/.test(fee ?? ""))
      .map(([name, fee]) => [placeKey(name), Number(fee)] as const)
  );
  for (const place of [city, province]) {
    const fee = place ? zones.get(placeKey(place)) : undefined;
    if (fee !== undefined) return fee;
  }
  return fallback;
}

async function isWholesaleBuyer(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const n = await prisma.userRole.count({ where: { userId, role: { permissions: { has: "portal.wholesale" } } } });
  return n > 0;
}

export async function quoteCart(input: QuoteInput): Promise<Quote> {
  const [settings, modules] = await Promise.all([getSettings(), getModuleStates()]);
  const wholesale = modules.wholesale && (await isWholesaleBuyer(input.userId));
  const maxQty = wholesale ? 1000 : 20;

  const items = input.items
    .map((i) => ({ sku: String(i.sku), quantity: Math.floor(Number(i.quantity)) }))
    .filter((i) => i.quantity > 0);
  if (items.length === 0) throw new PricingError("سبد خرید شما خالی است.");
  if (items.some((i) => i.quantity > maxQty)) throw new PricingError(`حداکثر ${maxQty.toLocaleString("fa-IR")} عدد از هر کالا قابل سفارش است.`);

  const variants = await prisma.productVariant.findMany({
    where: { sku: { in: items.map((i) => i.sku) }, isActive: true, product: { isActive: true } },
    include: { product: { select: { title: true } } },
  });

  const lines: QuoteLine[] = items.map((item) => {
    const v = variants.find((x) => x.sku === item.sku);
    if (!v) throw new PricingError("یکی از کالاهای سبد خرید دیگر موجود نیست. لطفاً سبد را به‌روز کنید.");
    if (v.stock < item.quantity) throw new PricingError(`موجودی «${v.title}» کافی نیست.`);
    return {
      variantId: v.id,
      sku: v.sku,
      title: `${v.product.title} - ${v.title} (${v.format === "CAPSULE" ? "کپسول" : "پودر"})`,
      unitPrice: v.price,
      unitCost: v.costPrice,
      quantity: item.quantity,
      totalPrice: v.price * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.totalPrice, 0);

  // سفیر معرف (خرید با لینک یا کد سفیر)؛ معرفی خود مجاز نیست
  let referrer: Quote["referrer"] = null;
  // خرید عمده پورسانت سفیر ندارد
  if (input.referralCode && modules.ambassadors && !wholesale) {
    const amb = await findAmbassadorByCode(input.referralCode);
    if (amb && amb.id !== input.userId) {
      referrer = { id: amb.id, name: amb.name, tier: amb.ambassadorTier ?? "SILVER" };
    }
  }

  // تخفیف: کوپن و تخفیف سفیر با هم جمع نمی‌شوند؛ بزرگ‌ترین اعمال می‌شود
  let ambassadorDiscount = 0;
  if (referrer) {
    ambassadorDiscount = Math.round((subtotal * (Number(settings.AMBASSADOR_CUSTOMER_DISCOUNT) || 0)) / 100);
  }

  let couponDiscount = 0;
  let couponError: string | null = null;
  let couponCode: string | null = null;
  let couponLabel: string | null = null;
  if (input.couponCode && !modules.coupons) {
    couponError = "در حال حاضر کد تخفیف پذیرفته نمی‌شود.";
  } else if (input.couponCode) {
    const code = input.couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) couponError = "کد تخفیف وارد شده نامعتبر است.";
    else if (coupon.expiresAt && coupon.expiresAt < new Date()) couponError = "مهلت استفاده از این کد تخفیف تمام شده است.";
    else if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) couponError = "ظرفیت استفاده از این کد تخفیف تکمیل شده است.";
    else if (subtotal < coupon.minAmount) couponError = "مبلغ سبد خرید برای این کد تخفیف کافی نیست.";
    else {
      couponDiscount =
        coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
      if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
      couponCode = coupon.code;
      couponLabel = coupon.description || coupon.code;
    }
  }

  // تخفیف پلکانی عمده با کوپن جمع نمی‌شود؛ بزرگ‌تر اعمال می‌شود
  const totalQty = lines.reduce((n, l) => n + l.quantity, 0);
  const wholesalePct = wholesale && totalQty >= (Number(settings.WHOLESALE_MIN_QTY) || 0) ? wholesalePercent(totalQty, parseWholesaleTiers(settings.WHOLESALE_TIERS)) : 0;
  const wholesaleDiscount = Math.round((subtotal * wholesalePct) / 100);

  let discount = 0;
  let discountSource: Quote["discountSource"] = null;
  let discountLabel: string | null = null;
  if (wholesaleDiscount > 0 && wholesaleDiscount >= couponDiscount) {
    discount = wholesaleDiscount;
    discountSource = "WHOLESALE";
    discountLabel = `تخفیف عمده ${wholesalePct.toLocaleString("fa-IR")}٪`;
    if (couponCode) {
      couponError = "تخفیف عمده بیشتر از این کد است؛ تخفیف عمده اعمال شد.";
      couponCode = null;
    }
  } else if (couponDiscount > 0 && couponDiscount >= ambassadorDiscount) {
    discount = couponDiscount;
    discountSource = "COUPON";
    discountLabel = couponLabel;
  } else if (ambassadorDiscount > 0) {
    discount = ambassadorDiscount;
    discountSource = "AMBASSADOR";
    discountLabel = `تخفیف معرفی ${referrer?.name ?? "سفیر برند"}`;
    if (couponCode) {
      couponError = "تخفیف سفیر بیشتر از این کد است؛ تخفیف سفیر اعمال شد.";
      couponCode = null;
    }
  }

  const afterDiscount = subtotal - discount;
  const shippingMethod: ShippingMethod = input.shippingMethod === "EXPRESS" ? "EXPRESS" : "POST";
  const freeShippingThreshold = Number(settings.FREE_SHIPPING_THRESHOLD) || 0;
  const shippingFee =
    shippingMethod === "EXPRESS"
      ? Number(settings.SHIPPING_FEE_EXPRESS) || 0
      : afterDiscount >= freeShippingThreshold
        ? 0
        : zoneShippingFee(settings.SHIPPING_ZONES, input.province, input.city, Number(settings.SHIPPING_FEE_POST) || 0);

  const total = afterDiscount + shippingFee;

  let walletBalance = 0;
  if (input.userId) {
    const wallet = await prisma.wallet.findUnique({ where: { userId: input.userId } });
    walletBalance = wallet?.balance ?? 0;
  }
  const walletUsed = input.useWallet ? Math.min(walletBalance, total) : 0;

  const commissionPercent = referrer ? commissionPercentForTier(referrer.tier, settings) : 0;
  const commissionAmount = Math.round((afterDiscount * commissionPercent) / 100);

  return {
    lines,
    subtotal,
    discount,
    discountSource,
    discountLabel,
    couponCode: discountSource === "COUPON" ? couponCode : null,
    couponError,
    shippingMethod,
    shippingFee,
    freeShippingThreshold,
    total,
    walletBalance,
    walletUsed,
    payable: total - walletUsed,
    referrer,
    commissionPercent,
    commissionAmount,
    wholesale,
  };
}
