import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAccess, hasPermission } from "@/lib/rbac/server";
import { toOrderDTO } from "@/lib/commerce/dto";

// GET /api/orders/:orderNumber — the buyer or staff with orders.view
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const access = await getAccess();
  if (!access) return NextResponse.json({ success: false, error: "ابتدا وارد شوید." }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, referrer: { select: { name: true } } },
  });
  if (!order || (order.userId !== access.userId && !hasPermission(access, "orders.view"))) {
    return NextResponse.json({ success: false, error: "سفارش پیدا نشد." }, { status: 404 });
  }
  return NextResponse.json({ success: true, order: toOrderDTO(order) });
}
