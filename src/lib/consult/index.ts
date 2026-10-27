import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

// ==============================================================
// Nutrition consultation (module «consultation»). A request is a
// SupportTicket with kind = CONSULTATION; consultants answer it in
// the consultant portal, never on the support board.
// ==============================================================

export const CONSULT_GOALS = [
  "افزایش انرژی و رفع خستگی",
  "کنترل وزن",
  "ورزش و عضله‌سازی",
  "کم‌خونی و فقر آهن",
  "پوست، مو و ناخن",
  "تقویت ایمنی",
  "بارداری و شیردهی",
  "سایر",
] as const;

export interface ConsultEligibility {
  canRequest: boolean;
  reason: string | null;
  responseHours: number;
  maxOpen: number;
}

export async function consultEligibility(userId: string): Promise<ConsultEligibility> {
  const s = await getSettings();
  const maxOpen = Number(s.CONSULT_MAX_OPEN) || 2;
  const responseHours = Number(s.CONSULT_RESPONSE_HOURS) || 48;
  const [open, delivered] = await Promise.all([
    prisma.supportTicket.count({ where: { userId, kind: "CONSULTATION", status: { not: "CLOSED" } } }),
    s.CONSULT_BUYERS_ONLY === "1" ? prisma.order.count({ where: { userId, status: "DELIVERED" } }) : Promise.resolve(1),
  ]);
  if (delivered === 0) return { canRequest: false, reason: "مشاوره رایگان برای خریداران محصولات مایا فعال است.", responseHours, maxOpen };
  if (open >= maxOpen) return { canRequest: false, reason: "درخواست‌های قبلی شما هنوز باز است؛ لطفاً تا پاسخ مشاور صبر کنید.", responseHours, maxOpen };
  return { canRequest: true, reason: null, responseHours, maxOpen };
}
