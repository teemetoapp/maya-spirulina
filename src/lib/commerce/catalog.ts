import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
export interface StorefrontVariant {
  sku: string;
  title: string;
  format: "CAPSULE" | "POWDER";
  durationDays: number;
  packDescription: string | null;
  badge: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
}

export interface StorefrontProduct {
  title: string;
  variants: StorefrontVariant[];
  freeShippingThreshold: number;
  postShippingFee: number;
}

/**
 * The «hero» product shown on the home page. The site sells one product
 * today; extra products (up to 4–5) only need isFeatured=false rows.
 */
export async function getFeaturedProduct(): Promise<StorefrontProduct | null> {
  const [product, settings] = await Promise.all([
    prisma.product.findFirst({
      where: { isActive: true, isFeatured: true },
      orderBy: { sortOrder: "asc" },
      include: { variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
    getSettings(),
  ]);
  if (!product) return null;

  return {
    title: product.title,
    freeShippingThreshold: Number(settings.FREE_SHIPPING_THRESHOLD) || 0,
    postShippingFee: Number(settings.SHIPPING_FEE_POST) || 0,
    variants: product.variants.map((v) => ({
      sku: v.sku,
      title: v.title,
      format: v.format,
      durationDays: v.durationDays,
      packDescription: v.packDescription,
      badge: v.badge,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
    })),
  };
}
