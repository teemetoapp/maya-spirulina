import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccess } from "@/lib/rbac/server";

export async function GET() {
  const [user, access] = await Promise.all([getCurrentUser(), getAccess()]);

  if (!user || !access) {
    return NextResponse.json(
      { success: false, error: "کاربر وارد نشده است." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      roles: access.roleKeys,
      permissions: access.permissions,
      referralCode: user.referralCode,
      walletBalance: user.wallet?.balance || 0,
      totalEarned: user.wallet?.totalEarned || 0,
      totalOrders: user._count.orders,
      totalReferrals: user._count.referrals,
    },
  });
}
