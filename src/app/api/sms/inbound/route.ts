import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/rbac/server";
import { normalizeIranianMobile, isValidIranianMobile } from "@/lib/validators";
import { toEnglishDigits } from "@/lib/currency";

// ==============================================================
// Incoming SMS (opt-out). Set the panel's «receive» webhook to
//   https://<site>/api/sms/inbound?key=$SMS_INBOUND_SECRET
// A reply of «11» / «لغو11» / «لغو» withdraws marketing consent.
// Field names differ between SMS panels, so the common ones are read.
// ==============================================================

const OPT_OUT = new Set(["11", "لغو11", "لغو", "stop", "cancel"]);

function authorized(key: string | null): boolean {
  const secret = process.env.SMS_INBOUND_SECRET;
  if (!secret || !key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request) {
  const url = new URL(req.url);
  if (!authorized(url.searchParams.get("key"))) return NextResponse.json({ success: false }, { status: 401 });

  const fields: Record<string, string> = Object.fromEntries(url.searchParams);
  if (req.method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    try {
      if (type.includes("json")) Object.assign(fields, await req.json());
      else Object.assign(fields, Object.fromEntries((await req.formData()) as unknown as Iterable<[string, string]>));
    } catch {
      /* بدنه خالی یا نامعتبر */
    }
  }
  const pick = (...keys: string[]) => String(keys.map((k) => fields[k]).find((v) => v !== undefined && v !== null) ?? "");
  const rawPhone = toEnglishDigits(pick("mobile", "Mobile", "from", "From", "sender", "Sender")).replace(/^\+?98/, "0");
  const text = toEnglishDigits(pick("text", "Text", "message", "Message", "messageText", "MessageText", "body", "Body"))
    .replace(/\s+/g, "")
    .toLowerCase();

  if (!isValidIranianMobile(rawPhone) || !OPT_OUT.has(text)) return NextResponse.json({ success: true, action: "ignored" });
  const phone = normalizeIranianMobile(rawPhone);
  const updated = await prisma.user.updateMany({ where: { phone }, data: { smsConsent: false, smsOptOutAt: new Date() } });
  if (updated.count) await logAudit(null, "sms.optout", phone, { via: "inbound" });
  return NextResponse.json({ success: true, action: updated.count ? "opted-out" : "unknown-number" });
}

export const GET = handle;
export const POST = handle;
