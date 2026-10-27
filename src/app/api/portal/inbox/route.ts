import { requireApi } from "@/lib/rbac/server";
import { ok } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { formatJalaliDateTime } from "@/lib/jalali";

// Latest notifications sent to the current user (the header bell)
export async function GET() {
  const auth = await requireApi();
  if (auth instanceof Response) return auth;
  const logs = await prisma.notificationLog.findMany({
    where: { userId: auth.userId, status: { in: ["SENT", "QUEUED", "SENDING"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  // هر رویداد ممکن است از چند کانال ارسال شده باشد؛ فقط یک‌بار نمایش داده شود
  const seen = new Set<string>();
  const items = logs
    .filter((l) => {
      const key = `${l.event}|${l.body.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map((l) => ({ id: l.id, body: l.subject || l.body, createdAt: formatJalaliDateTime(l.createdAt) }));
  return ok({ items });
}
