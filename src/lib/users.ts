import prisma from "@/lib/prisma";
import { isModuleEnabled } from "@/lib/modules/server";
import { generateReferralCode } from "@/lib/auth";
import { CUSTOMER_ROLE } from "@/lib/rbac/permissions";
import { getNumberSetting } from "@/lib/settings";
import { pointsExpiryDate } from "@/lib/commerce/loyalty";

// ==============================================================
// User lifecycle helpers (registration and role assignment)
// ==============================================================

async function uniqueReferralCode(): Promise<string> {
  for (;;) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!existing) return code;
  }
}

/**
 * Registers a new user with a wallet, the default customer role and the signup bonus.
 */
export async function registerUser(phone: string, referrerCode?: string | null, opts: { ip?: string | null; smsConsent?: boolean } = {}) {
  let referredById: string | null = null;
  if (referrerCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referrerCode }, select: { id: true } });
    referredById = referrer?.id ?? null;
  }

  const customerRole = await prisma.role.findUnique({ where: { key: CUSTOMER_ROLE } });
  const signupPoints = (await isModuleEnabled("loyalty")) ? await getNumberSetting("SIGNUP_REWARD_POINTS") : 0;

  return prisma.user.create({
    data: {
      phone,
      isPhoneVerified: true,
      referralCode: await uniqueReferralCode(),
      referredById,
      signupIp: opts.ip ?? null,
      ...(opts.smsConsent ? { smsConsent: true, smsConsentAt: new Date() } : {}),
      wallet: { create: { balance: 0 } },
      roles: customerRole ? { create: { roleId: customerRole.id } } : undefined,
      pointTransactions:
        signupPoints > 0
          ? {
              create: {
                points: signupPoints,
                type: "SIGNUP_BONUS",
                status: "RELEASED",
                description: "هدیه خوش‌آمدگویی عضویت در باشگاه مشتریان مایا اسپیرولینا",
                releasedAt: new Date(),
                expiresAt: await pointsExpiryDate(),
              },
            }
          : undefined,
    },
  });
}

export async function assignRole(userId: string, roleKey: string, assignedById?: string | null) {
  const role = await prisma.role.findUnique({ where: { key: roleKey } });
  if (!role) throw new Error(`Role "${roleKey}" does not exist`);
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    update: {},
    create: { userId, roleId: role.id, assignedById: assignedById ?? null },
  });
}
