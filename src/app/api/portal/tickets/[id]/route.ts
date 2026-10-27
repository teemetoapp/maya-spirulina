import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { moduleGuard } from "@/lib/modules/server";
import type { Access } from "@/lib/rbac/server";
import type { SupportTicket } from "@prisma/client";

// کارمند مجاز برای این تیکت: پشتیبانی با tickets.manage؛ مشاوره با consult.manage
// یا مشاوری که تیکت به خودش ارجاع شده یا هنوز ارجاع نشده است
function staffFor(auth: Access, ticket: SupportTicket): boolean {
  if (ticket.kind === "SUPPORT") return hasPermission(auth, "tickets.manage");
  if (hasPermission(auth, "consult.manage")) return true;
  return hasPermission(auth, "portal.consultant") && (!ticket.assigneeId || ticket.assigneeId === auth.userId);
}

const moduleOf = (t: SupportTicket): "consultation" | "tickets" => (t.kind === "CONSULTATION" ? "consultation" : "tickets");

const STATUSES = ["OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

// Reply to a ticket (owner or support staff)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi();
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const body = str((await readJson(req)).body, 4000);
  if (!body) return fail("متن پیام خالی است.");

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return fail("تیکت پیدا نشد.", 404);
  const off = await moduleGuard(moduleOf(ticket));
  if (off) return off;
  const isStaff = staffFor(auth, ticket);
  const isOwner = ticket.userId === auth.userId;
  if (!isStaff && !isOwner) return fail("دسترسی ندارید.", 403);
  if (ticket.status === "CLOSED" && !isStaff) return fail("این تیکت بسته شده است؛ تیکت جدید ثبت کنید.");
  const asStaff = isStaff && !isOwner;

  await prisma.$transaction([
    prisma.ticketMessage.create({ data: { ticketId: id, authorId: auth.userId, body, isStaff: asStaff } }),
    prisma.supportTicket.update({
      where: { id },
      data: {
        status: asStaff ? "ANSWERED" : "OPEN",
        ...(asStaff && !ticket.firstResponseAt ? { firstResponseAt: new Date() } : {}),
        ...(asStaff && !ticket.assigneeId ? { assigneeId: auth.userId } : {}),
        closedAt: null,
      },
    }),
  ]);
  if (asStaff) {
    await notify(ticket.kind === "CONSULTATION" ? "consult.answered" : "ticket.answered", { userId: ticket.userId, data: { subject: ticket.subject } });
  }
  return ok({}, "پیام ارسال شد.");
}

// Staff: status (kanban column), priority and assignee
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("tickets.manage", "consult.manage", "portal.consultant");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return fail("تیکت پیدا نشد.", 404);
  const off = await moduleGuard(moduleOf(ticket));
  if (off) return off;
  if (!staffFor(auth, ticket)) return fail("دسترسی ندارید.", 403);
  const b = await readJson(req);
  const data: { status?: (typeof STATUSES)[number]; priority?: (typeof PRIORITIES)[number]; assigneeId?: string | null; closedAt?: Date | null } = {};

  if (b.status !== undefined) {
    const status = str(b.status, 20) as (typeof STATUSES)[number];
    if (!STATUSES.includes(status)) return fail("وضعیت نامعتبر است.");
    data.status = status;
    data.closedAt = status === "CLOSED" ? new Date() : null;
  }
  if (b.priority !== undefined) {
    const priority = str(b.priority, 10) as (typeof PRIORITIES)[number];
    if (!PRIORITIES.includes(priority)) return fail("اولویت نامعتبر است.");
    data.priority = priority;
  }
  if (b.assigneeId !== undefined) {
    const assigneeId = str(b.assigneeId, 40) || null;
    // مشاور فقط می‌تواند درخواست را به خودش بردارد یا آزاد کند
    if (ticket.kind === "CONSULTATION" && !hasPermission(auth, "consult.manage") && assigneeId && assigneeId !== auth.userId) {
      return fail("ارجاع به مشاور دیگر فقط توسط مدیر مشاوره انجام می‌شود.", 403);
    }
    if (assigneeId && !(await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } }))) return fail("کارشناس پیدا نشد.");
    data.assigneeId = assigneeId;
  }
  if (Object.keys(data).length === 0) return fail("تغییری ارسال نشد.");
  await prisma.supportTicket.update({ where: { id }, data });
  await logAudit(auth.userId, "ticket.update", id, data);
  return ok({}, "تیکت به‌روز شد.");
}

// Customer rates the support after an answer (1-5); rating also closes the ticket
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi();
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const b = await readJson(req);
  const rating = int(b.rating) ?? 0;
  if (rating < 1 || rating > 5) return fail("امتیاز باید بین ۱ تا ۵ باشد.");
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket || ticket.userId !== auth.userId) return fail("تیکت پیدا نشد.", 404);
  const off = await moduleGuard(moduleOf(ticket));
  if (off) return off;
  if (ticket.status !== "ANSWERED" && ticket.status !== "CLOSED") return fail("پس از دریافت پاسخ می‌توانید امتیاز دهید.");
  await prisma.supportTicket.update({
    where: { id },
    data: { rating, ratingComment: str(b.comment, 500) || null, status: "CLOSED", closedAt: ticket.closedAt ?? new Date() },
  });
  return ok({}, "ممنون از بازخورد شما.");
}
