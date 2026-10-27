import prisma from "@/lib/prisma";
import { formatJalaliShort } from "@/lib/jalali";

export interface AdminVariant {
  id: string;
  productId: string;
  sku: string;
  title: string;
  format: "CAPSULE" | "POWDER";
  durationDays: number;
  packDescription: string;
  badge: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number;
  stock: number;
  lowStockAlert: number;
  weightGrams: number | null;
  isActive: boolean;
  sortOrder: number;
  sold30d: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  dosageInstructions: string;
  benefits: string[];
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  variants: AdminVariant[];
}

export interface AdminBatch {
  id: string;
  batchCode: string;
  sku: string;
  variantTitle: string;
  quantity: number;
  productionDate: string;
  expiryDate: string;
  daysToExpiry: number;
  labReportUrl: string | null;
  harvestDate: string; // yyyy-mm-dd برای فرم، خالی اگر ثبت نشده
  labName: string;
  labSummary: string;
  isPublic: boolean;
}

export async function loadCatalogAdmin(): Promise<{ products: AdminProduct[]; batches: AdminBatch[] }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [products, batches, sold] = await Promise.all([
    prisma.product.findMany({
      orderBy: { sortOrder: "asc" },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.inventoryBatch.findMany({ orderBy: { expiryDate: "asc" }, include: { variant: true }, take: 300 }),
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: { order: { createdAt: { gte: since }, status: { notIn: ["PENDING", "CANCELLED"] } } },
      _sum: { quantity: true },
    }),
  ]);
  const soldMap = new Map(sold.map((s) => [s.variantId, s._sum.quantity ?? 0]));
  const now = Date.now();

  return {
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle ?? "",
      shortDescription: p.shortDescription ?? "",
      description: p.description,
      dosageInstructions: p.dosageInstructions ?? "",
      benefits: p.benefits,
      images: p.images,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      sortOrder: p.sortOrder,
      variants: p.variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        title: v.title,
        format: v.format,
        durationDays: v.durationDays,
        packDescription: v.packDescription ?? "",
        badge: v.badge ?? "",
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        costPrice: v.costPrice,
        stock: v.stock,
        lowStockAlert: v.lowStockAlert,
        weightGrams: v.weightGrams,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
        sold30d: soldMap.get(v.id) ?? 0,
      })),
    })),
    batches: batches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      sku: b.variant.sku,
      variantTitle: b.variant.title,
      quantity: b.quantity,
      productionDate: formatJalaliShort(b.productionDate),
      expiryDate: formatJalaliShort(b.expiryDate),
      daysToExpiry: Math.floor((b.expiryDate.getTime() - now) / 86_400_000),
      labReportUrl: b.labReportUrl,
      harvestDate: b.harvestDate ? b.harvestDate.toISOString().slice(0, 10) : "",
      labName: b.labName ?? "",
      labSummary: b.labSummary ?? "",
      isPublic: b.isPublic,
    })),
  };
}
