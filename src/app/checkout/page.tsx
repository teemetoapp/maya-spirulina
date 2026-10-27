import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/lib/auth";
import { CartProvider } from "@/lib/cart-context";
import StoreHeader from "@/components/storefront/StoreHeader";
import CheckoutClient from "@/components/storefront/CheckoutClient";
import CartDrawer from "@/components/storefront/CartDrawer";
import StoreFooter from "@/components/storefront/StoreFooter";
import ReorderLoader from "@/components/storefront/ReorderLoader";
import prisma from "@/lib/prisma";
import type { CartItem } from "@/lib/cart-context";
import type { Prisma } from "@prisma/client";

type VariantRow = Awaited<ReturnType<typeof findVariants>>[number];

function findVariants(where: Prisma.ProductVariantWhereInput) {
  return prisma.productVariant.findMany({ where: { ...where, isActive: true, stock: { gt: 0 }, product: { isActive: true } }, include: { product: { select: { title: true } } } });
}

function toCartItem(v: VariantRow, quantity: number): CartItem {
  const capsule = v.format === "CAPSULE";
  return {
    id: v.sku,
    slug: v.sku.toLowerCase(),
    title: `${v.product.title} - ${v.title} (${capsule ? "کپسول" : "پودر"})`,
    sku: v.sku,
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? undefined,
    quantity: Math.min(quantity, v.stock),
    icon: "🌿",
    category: capsule ? "tablets" : "powder",
    categoryLabel: capsule ? "کپسول" : "پودر خالص",
    gradient: "from-neutral-800 to-neutral-900",
  };
}

// اقلام سفارش قبلی کاربر با قیمت امروز (فقط کالاهای فعال و موجود)
async function loadReorderItems(userId: string, orderNumber: string): Promise<CartItem[]> {
  const order = await prisma.order.findFirst({ where: { orderNumber, userId }, select: { items: { select: { variantId: true, quantity: true } } } });
  if (!order) return [];
  const variants = await findVariants({ id: { in: order.items.map((i) => i.variantId) } });
  return variants.map((v) => toCartItem(v, Math.min(order.items.find((i) => i.variantId === v.id)!.quantity, 20)));
}

// سفارش عمده از پنل همکار: ?wholesale=SKU:QTY,SKU:QTY (سقف و تخفیف را سرور در quoteCart بررسی می‌کند)
async function loadWholesaleItems(raw: string): Promise<CartItem[]> {
  const wanted = new Map(
    raw.split(",").map((p) => p.split(":")).filter(([sku, q]) => sku && Number(q) > 0).map(([sku, q]) => [sku, Math.min(Math.floor(Number(q)), 1000)] as const)
  );
  if (wanted.size === 0) return [];
  const variants = await findVariants({ sku: { in: [...wanted.keys()] } });
  return variants.map((v) => toCartItem(v, wanted.get(v.sku)!));
}

export const metadata = {
  title: "تسویه‌حساب و پرداخت سفارش | مایا اسپیرولینا",
  description: "ثبت نهایی آدرس تحویل، انتخاب روش ارسال، اعمال کد تخفیف و پرداخت امن سفارش در فروشگاه مایا اسپیرولینا.",
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const reorder = typeof query.reorder === "string" ? query.reorder.slice(0, 40) : null;
  const wholesale = typeof query.wholesale === "string" ? query.wholesale.slice(0, 600) : null;
  const coupon = typeof query.coupon === "string" ? query.coupon.slice(0, 40) : null;
  const session = await getSession();
  // ثبت سفارش نیازمند ورود با موبایل است (سبد خرید پس از ورود حفظ می‌شود)
  if (!session) {
    const back = wholesale
      ? `/checkout?wholesale=${encodeURIComponent(wholesale)}`
      : reorder
        ? `/checkout?reorder=${encodeURIComponent(reorder)}${coupon ? `&coupon=${encodeURIComponent(coupon)}` : ""}`
        : "/checkout";
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }
  const reorderItems = wholesale ? await loadWholesaleItems(wholesale) : reorder ? await loadReorderItems(session.id, reorder) : [];
  const currentUser = await getCurrentUser();

  const userSession = session
    ? {
        name: currentUser?.name || null,
        phone: session.phone,
      }
    : null;

  return (
    <CartProvider>
      {reorderItems.length > 0 && <ReorderLoader items={reorderItems} coupon={coupon} />}
      <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-bg-page dark:text-neutral-100 selection:bg-accent-primary selection:text-white flex flex-col justify-between transition-colors duration-200">
        <StoreHeader userSession={userSession} />

        <main className="flex-1">
          <Suspense
            fallback={
              <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-neutral-500">
                در حال بارگذاری فرم تسویه‌حساب...
              </div>
            }
          >
            <CheckoutClient userSession={userSession} />
          </Suspense>
        </main>

        <CartDrawer />
        <StoreFooter />
      </div>
    </CartProvider>
  );
}
