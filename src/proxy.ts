import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwt-secret";

// ==============================================================
// Next.js 16 Proxy (formerly Middleware) — Session Guard
// Only checks that a valid session exists. Permission checks
// happen per section and per API route (src/lib/rbac/server.ts),
// because permissions live in the database and can change at any time.
// ==============================================================

const SESSION_COOKIE_NAME = "maya_session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, getJwtSecret());
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // کاربر لاگین‌شده به صفحه ورود نیاز ندارد
  if (pathname === "/login") {
    return isAuthenticated ? NextResponse.redirect(new URL("/portal", req.url)) : NextResponse.next();
  }

  // همه مسیرهای پرتال نیازمند ورود هستند
  if (pathname.startsWith("/portal") && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/portal", "/login"],
};
