-- CreateEnum
CREATE TYPE "FixedCostCategory" AS ENUM ('SALARY', 'RENT', 'UTILITIES', 'DEPRECIATION', 'MARKETING', 'SOFTWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'CUSTOMER', 'LOYAL', 'AT_RISK', 'LOST');

-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('CALL', 'SMS', 'WHATSAPP', 'TELEGRAM', 'EMAIL', 'VISIT', 'NOTE');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "FeedbackTopic" AS ENUM ('PRODUCT', 'SHIPPING', 'SETTLEMENT', 'PRICE', 'SUPPORT', 'CONSULTATION', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "LiveChatTopic" AS ENUM ('SUPPORT', 'CONSULTATION', 'SALES');

-- CreateEnum
CREATE TYPE "LiveChatStatus" AS ENUM ('WAITING', 'ACTIVE', 'CLOSED');

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "fullCostPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overheadUnits" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "targetMargin" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bestCallTime" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "healthNotes" TEXT,
ADD COLUMN     "leadStage" "LeadStage",
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "mobile2" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "preferredContact" TEXT,
ADD COLUMN     "telegramUsername" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "VariantCostItem" ADD COLUMN     "inputId" TEXT;

-- CreateTable
CREATE TABLE "CostInput" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "category" "CostCategory" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedCost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "FixedCostCategory" NOT NULL DEFAULT 'OTHER',
    "monthlyAmount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInteraction" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "authorId" TEXT,
    "channel" "InteractionChannel" NOT NULL DEFAULT 'CALL',
    "summary" TEXT NOT NULL,
    "sentiment" "Sentiment" NOT NULL DEFAULT 'NEUTRAL',
    "topic" "FeedbackTopic",
    "followUpAt" TIMESTAMP(3),
    "followUpDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChat" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "topic" "LiveChatTopic" NOT NULL DEFAULT 'SUPPORT',
    "status" "LiveChatStatus" NOT NULL DEFAULT 'WAITING',
    "assigneeId" TEXT,
    "page" TEXT,
    "rating" INTEGER,
    "ratingComment" TEXT,
    "firstReplyAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactInteraction_contactId_idx" ON "ContactInteraction"("contactId");

-- CreateIndex
CREATE INDEX "ContactInteraction_followUpAt_followUpDone_idx" ON "ContactInteraction"("followUpAt", "followUpDone");

-- CreateIndex
CREATE INDEX "LiveChat_visitorKey_idx" ON "LiveChat"("visitorKey");

-- CreateIndex
CREATE INDEX "LiveChat_status_lastMessageAt_idx" ON "LiveChat"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "LiveChat_guestPhone_idx" ON "LiveChat"("guestPhone");

-- CreateIndex
CREATE INDEX "LiveChatMessage_chatId_createdAt_idx" ON "LiveChatMessage"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantCostItem" ADD CONSTRAINT "VariantCostItem_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "CostInput"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChat" ADD CONSTRAINT "LiveChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChat" ADD CONSTRAINT "LiveChat_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "LiveChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

