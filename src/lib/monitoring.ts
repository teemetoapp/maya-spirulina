import prisma from "@/lib/prisma";
import cache from "@/lib/redis";
import { sendTelegram } from "@/lib/notifications/channels";
import { getSettings } from "@/lib/settings";
import { isModuleEnabled } from "@/lib/modules/server";

// ==============================================================
// Service health and Telegram alerts for the admin group
// (TELEGRAM_ADMIN_CHAT_ID). Alerts go straight to Telegram, not through
// the notification queue, so they still arrive when the database is down.
// State lives in process memory: one server process runs the site and cron.
// shortcut: memory state resets on restart (one repeat alert), move to Redis if the site runs on several servers.
// ==============================================================

export interface CheckResult {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface State {
  down: Map<string, string>; // key → detail of the open incident
  lastSent: Map<string, number>;
  last: { at: string; results: CheckResult[] } | null;
}
const g = globalThis as unknown as { _mayaHealth?: State };
const state: State = (g._mayaHealth ??= { down: new Map(), lastSent: new Map(), last: null });

async function repeatMs(): Promise<number> {
  try {
    return (Number((await getSettings()).ALERT_REPEAT_MINUTES) || 60) * 60_000;
  } catch {
    return 60 * 60_000; // دیتابیس در دسترس نیست
  }
}

async function telegram(text: string) {
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chat) {
    console.warn("[monitoring] TELEGRAM_ADMIN_CHAT_ID is not set:", text);
    return;
  }
  const res = await sendTelegram(chat, text);
  if (!res.ok) console.error("[monitoring] telegram alert failed:", res.error);
}

/** Sends an alert at most once per ALERT_REPEAT_MINUTES for the same key. */
export async function alert(key: string, text: string, now = Date.now()) {
  if ((state.lastSent.get(key) ?? 0) + (await repeatMs()) > now) return false;
  state.lastSent.set(key, now);
  await telegram(`⚠️ مایا اسپیرولینا\n${text}`);
  return true;
}

async function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`پاسخ نداد (${ms / 1000} ثانیه)`)), ms))]);
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

async function check(key: string, label: string, fn: () => Promise<string>): Promise<CheckResult> {
  try {
    return { key, label, ok: true, detail: await withTimeout(fn()) };
  } catch (e) {
    return { key, label, ok: false, detail: msg(e) };
  }
}

export async function runHealthChecks(): Promise<CheckResult[]> {
  const s = await getSettings().catch(() => ({}) as Record<string, string>);
  const results = await Promise.all([
    check("db", "دیتابیس", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return "وصل است";
    }),
    check("cache", "Redis (کد ورود و محدودیت‌ها)", async () => {
      const v = String(Date.now());
      await cache.set("health:ping", v, "EX", 60);
      if ((await cache.get("health:ping")) !== v) throw new Error("نوشتن و خواندن انجام نشد؛ ورود با کد یک‌بارمصرف مختل می‌شود");
      return "وصل است";
    }),
    check("sms", "پنل پیامک", async () => {
      const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase();
      const failed = await prisma.notificationLog.count({ where: { channel: "SMS", status: "FAILED", createdAt: { gte: new Date(Date.now() - 30 * 60_000) } } });
      if (failed >= 3) throw new Error(`${failed} پیامک در ۳۰ دقیقه گذشته ارسال نشد`);
      if (provider !== "smsir" || !process.env.SMSIR_API_KEY) return provider === "mock" ? "حالت آزمایشی (پیامک واقعی ارسال نمی‌شود)" : "بدون خطای ارسال";
      const res = await fetch("https://api.sms.ir/v1/credit", { headers: { "x-api-key": process.env.SMSIR_API_KEY, Accept: "application/json" } });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.status !== 1) throw new Error(`پاسخ sms.ir: ${data?.message ?? `HTTP ${res.status}`}`);
      const credit = Number(data.data) || 0;
      const min = Number(s.SMS_CREDIT_ALERT) || 0;
      if (min > 0 && credit < min) throw new Error(`اعتبار پنل کم است: ${credit.toLocaleString("fa-IR")}`);
      return `اعتبار: ${credit.toLocaleString("fa-IR")}`;
    }),
    check("gateway", "درگاه پرداخت زرین‌پال", async () => {
      const mode = process.env.PAYMENT_GATEWAY_MODE || "mock";
      if (mode === "mock") return "حالت آزمایشی";
      const host = mode === "sandbox" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
      const res = await fetch(`${host}/pg/v4/payment/request.json`, { method: "HEAD" });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return "در دسترس";
    }),
  ]);
  state.last = { at: new Date().toISOString(), results };
  return results;
}

/** Cron entry: checks services, alerts on new or ongoing failures and on recovery. */
export async function monitorServices(): Promise<CheckResult[]> {
  let on = true;
  try {
    on = await isModuleEnabled("monitoring");
  } catch {
    // دیتابیس در دسترس نیست: بررسی و هشدار انجام می‌شود
  }
  if (!on) return [];
  const results = await runHealthChecks();
  for (const r of results) {
    if (!r.ok) {
      state.down.set(r.key, r.detail);
      await alert(`health:${r.key}`, `🔴 ${r.label} مشکل دارد\n${r.detail}`);
    } else if (state.down.has(r.key)) {
      state.down.delete(r.key);
      state.lastSent.delete(`health:${r.key}`);
      await telegram(`✅ مایا اسپیرولینا\n${r.label} دوباره سالم است.`);
    }
  }
  return results;
}

/** Server errors from instrumentation.onRequestError; one alert per distinct error per window. */
export async function reportServerError(err: unknown, path: string) {
  const text = msg(err);
  console.error("[server error]", path, text);
  try {
    if (!(await isModuleEnabled("monitoring"))) return;
  } catch {
    // دیتابیس قطع است؛ بررسی سلامت همان را گزارش می‌کند
    return;
  }
  await alert(`error:${path.split("?")[0]}:${text.slice(0, 80)}`, `🐞 خطای سرور در ${path.split("?")[0]}\n${text}`);
}

export function lastHealth() {
  return state.last;
}
