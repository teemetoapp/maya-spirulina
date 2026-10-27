import prisma from "@/lib/prisma";
import { formatJalaliDateTime } from "@/lib/jalali";

export interface ReviewRow {
  id: string;
  orderNumber: string;
  customer: string;
  customerId: string;
  rating: number;
  body: string | null;
  displayName: string | null;
  publish: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reply: string | null;
  at: string;
}

export async function loadReviewsAdmin(): Promise<{ rows: ReviewRow[]; avg: number | null; dist: number[]; pending: number }> {
  const [list, agg, dist] = await Promise.all([
    prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { order: { select: { orderNumber: true } }, user: { select: { name: true, phone: true } } } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], _count: { _all: true } }),
  ]);
  return {
    rows: list.map((r) => ({
      id: r.id,
      orderNumber: r.order.orderNumber,
      customer: r.user.name ?? r.user.phone,
      customerId: r.userId,
      rating: r.rating,
      body: r.body,
      displayName: r.displayName,
      publish: r.publish,
      status: r.status,
      reply: r.reply,
      at: formatJalaliDateTime(r.createdAt),
    })),
    avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    dist: [1, 2, 3, 4, 5].map((n) => dist.find((d) => d.rating === n)?._count._all ?? 0),
    pending: list.filter((r) => r.publish && r.status === "PENDING").length,
  };
}

// نظرهای تأییدشده‌ای که خریدار اجازه انتشارشان را داده (برای سایت)
export async function loadPublicReviews(take = 12) {
  const rows = await prisma.review.findMany({
    where: { status: "APPROVED", publish: true, body: { not: null } },
    orderBy: { createdAt: "desc" },
    take,
    include: { order: { select: { items: { select: { productTitle: true }, take: 1 } } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.displayName || "خریدار", rating: r.rating, body: r.body!, reply: r.reply, product: r.order.items[0]?.productTitle ?? null, at: r.createdAt }));
}
