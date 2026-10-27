import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserSession } from "@/types";
import prisma from "./prisma";
import { getJwtSecret } from "./jwt-secret";

// ==============================================================
// JWT Authentication & Session Token Handler
// ==============================================================

export const SESSION_COOKIE_NAME = "maya_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Generates a random 5-digit OTP code
 */
export function generateOtpCode(): string {
  // Generates 5 digits between 10000 and 99999 using a CSPRNG
  return (10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000)).toString();
}

/**
 * Generates a unique, branded referral code (e.g. MAYA-4821)
 */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MAYA-${randomPart}`;
}

/**
 * Signs a JWT session token
 */
export async function createSessionToken(payload: UserSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

/**
 * Verifies a JWT session token
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      id: payload.id as string,
      phone: payload.phone as string,
      name: (payload.name as string) || null,
      referralCode: payload.referralCode as string,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie on HTTP response headers
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Retrieves the current authenticated user session from cookies
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

/**
 * Fetches the full User record (with wallet and counters) for the logged-in user
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.id },
    include: {
      wallet: true,
      _count: {
        select: {
          orders: true,
          referrals: true,
        },
      },
    },
  });
}
