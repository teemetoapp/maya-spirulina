import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { registerUser, assignRole } from "@/lib/users";

// Development-only: sign in as a test user of a given role (?role=super_admin|admin|accountant|warehouse|support|consultant|ambassador|customer)
const DEV_USERS: Record<string, { phone: string; name: string }> = {
  super_admin: { phone: "09120000000", name: "مدیر ارشد مایا اسپیرولینا" },
  admin: { phone: "09120000001", name: "مدیر فروشگاه (تست)" },
  accountant: { phone: "09120000002", name: "حسابدار (تست)" },
  warehouse: { phone: "09120000003", name: "انباردار (تست)" },
  support: { phone: "09120000004", name: "پشتیبان (تست)" },
  consultant: { phone: "09120000005", name: "دکتر نگار امینی (مشاور تغذیه)" },
  ambassador: { phone: "09121111111", name: "دکتر فرزاد شریفی (سفیر سلامت)" },
  customer: { phone: "09123456789", name: "عضو باشگاه سلامت مایا" },
};

export async function GET(req: NextRequest) {
  // Development-only role switcher; in production only on the demo deployment (NEXT_PUBLIC_DEMO_MODE=true)
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  const roleKey = (req.nextUrl.searchParams.get("role") || "super_admin").toLowerCase();
  const devUser = DEV_USERS[roleKey];
  if (!devUser) {
    return NextResponse.json({ error: `Unknown role. Use one of: ${Object.keys(DEV_USERS).join(", ")}` }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { phone: devUser.phone } });
  if (!user) {
    user = await registerUser(devUser.phone);
    user = await prisma.user.update({ where: { id: user.id }, data: { name: devUser.name } });
  }
  if (roleKey !== "customer") await assignRole(user.id, roleKey);
  if (roleKey === "ambassador" && !user.ambassadorTier) {
    user = await prisma.user.update({ where: { id: user.id }, data: { ambassadorTier: "SILVER" } });
  }

  const token = await createSessionToken({
    id: user.id,
    phone: user.phone,
    name: user.name,
    referralCode: user.referralCode,
  });
  await setSessionCookie(token);

  return NextResponse.redirect(new URL("/portal", req.url));
}
