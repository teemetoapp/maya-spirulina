import { requireApi, logAudit } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson } from "@/lib/api/respond";
import { runHealthChecks, alert } from "@/lib/monitoring";

// بررسی دستی سلامت سرویس‌ها و ارسال پیام آزمایشی به گروه تلگرام
export async function POST(req: Request) {
  const auth = await requireApi("settings.manage", "audit.view");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("monitoring");
  if (off) return off;
  if ((await readJson(req)).action === "test") {
    if (!process.env.TELEGRAM_ADMIN_CHAT_ID || !process.env.TELEGRAM_BOT_TOKEN) return fail("TELEGRAM_BOT_TOKEN و TELEGRAM_ADMIN_CHAT_ID در .env تنظیم نشده‌اند.");
    await alert(`test:${Date.now()}`, "پیام آزمایشی هشدار خرابی؛ اگر این را می‌بینید، هشدارها به این گروه می‌رسند.");
    await logAudit(auth.userId, "monitoring.test", "telegram", {});
    return ok({}, "پیام آزمایشی ارسال شد؛ گروه تلگرام را ببینید.");
  }
  const results = await runHealthChecks();
  return ok({ results }, results.every((r) => r.ok) ? "همه سرویس‌ها سالم‌اند." : "بعضی سرویس‌ها مشکل دارند.");
}
