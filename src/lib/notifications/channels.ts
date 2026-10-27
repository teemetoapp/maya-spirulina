import nodemailer from "nodemailer";
import { getSmsProvider } from "@/lib/sms/sms-provider";
import type { NotificationChannel } from "@prisma/client";

// ==============================================================
// Delivery channels. Each returns ok/error; credentials come from .env.
// Without credentials a channel logs in development and fails in
// production, so a misconfiguration is visible in the notification log.
// ==============================================================

export interface DeliveryResult {
  ok: boolean;
  error?: string;
}

function notConfigured(channel: string, recipient: string, body: string): DeliveryResult {
  if (process.env.NODE_ENV === "production") return { ok: false, error: `${channel} is not configured` };
  console.log(`🔔 [${channel} DEV LOG] → ${recipient}\n${body}`);
  return { ok: true };
}

async function sendSms(phone: string, body: string, marketing: boolean): Promise<DeliveryResult> {
  const result = await getSmsProvider().sendText(phone, body, marketing);
  return result.success ? { ok: true } : { ok: false, error: result.error };
}

export async function sendTelegram(chatId: string, body: string): Promise<DeliveryResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return notConfigured("TELEGRAM", chatId, body);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: body, disable_web_page_preview: true }),
    });
    const data = await res.json();
    return data?.ok ? { ok: true } : { ok: false, error: data?.description || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

let transporter: nodemailer.Transporter | null = null;

async function sendEmail(to: string, subject: string, body: string): Promise<DeliveryResult> {
  if (!process.env.SMTP_HOST) return notConfigured("EMAIL", to, `${subject}\n${body}`);
  try {
    transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "Maya Spirulina <no-reply@mayaspirulina.ir>",
      to,
      subject,
      text: body,
      html: `<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.9">${escapeHtml(body).replace(/\n/g, "<br>")}</div>`,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function deliver(
  channel: NotificationChannel,
  recipient: string,
  body: string,
  subject?: string | null,
  marketing = false
): Promise<DeliveryResult> {
  switch (channel) {
    case "SMS":
      return sendSms(recipient, body, marketing);
    case "TELEGRAM":
      return sendTelegram(recipient, body);
    case "EMAIL":
      return sendEmail(recipient, subject || "مایا اسپیرولینا", body);
  }
}
