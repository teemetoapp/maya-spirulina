-- CreateEnum
CREATE TYPE "TicketKind" AS ENUM ('SUPPORT', 'CONSULTATION');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refillDueAt" TIMESTAMP(3),
ADD COLUMN     "refillRemindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "kind" "TicketKind" NOT NULL DEFAULT 'SUPPORT';

-- CreateTable
CREATE TABLE "ModuleState" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Order_refillDueAt_idx" ON "Order"("refillDueAt");

-- CreateIndex
CREATE INDEX "SupportTicket_kind_idx" ON "SupportTicket"("kind");

