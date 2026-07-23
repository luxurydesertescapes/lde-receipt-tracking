-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank_transfer', 'zelle', 'wire', 'bofa_card', 'citi_card', 'home_depot_card');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('overhead', 'property');

-- CreateEnum
CREATE TYPE "ReceiptSource" AS ENUM ('app_upload', 'app_camera', 'slack', 'email_auto');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('bofa', 'citi', 'home_depot', 'manual');

-- CreateEnum
CREATE TYPE "SupplyVendor" AS ENUM ('amazon', 'instacart', 'costco', 'home_depot', 'specialty', 'pool_supply', 'other');

-- CreateEnum
CREATE TYPE "SupplyOrderStatus" AS ENUM ('pending', 'ordered', 'delivered');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "fileId" TEXT,
    "fileUrl" TEXT,
    "storagePath" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "propertyId" TEXT,
    "description" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod",
    "source" "ReceiptSource" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notionPageId" TEXT,
    "slackChannel" TEXT,
    "slackTs" TEXT,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "source" "TransactionSource" NOT NULL,
    "issuer" TEXT,
    "last4" TEXT,
    "txnDate" TIMESTAMP(3) NOT NULL,
    "postDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "category" "Category",
    "propertyId" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,
    "isSplit" BOOLEAN NOT NULL DEFAULT false,
    "sourceFile" TEXT,
    "notionPageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionReceipt" (
    "transactionId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,

    CONSTRAINT "TransactionReceipt_pkey" PRIMARY KEY ("transactionId","receiptId")
);

-- CreateTable
CREATE TABLE "SupplyItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "vendor" "SupplyVendor" NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "alternativeNote" TEXT,
    "notes" TEXT,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "sizeOptions" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "propertyId" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "requestedByName" TEXT,
    "status" "SupplyOrderStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "orderedByEmail" TEXT,
    "orderedAt" TIMESTAMP(3),
    "orderConfirmation" TEXT,
    "expectedDelivery" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplyItemId" TEXT,
    "adHocName" TEXT,
    "adHocUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "size" TEXT,
    "notes" TEXT,

    CONSTRAINT "SupplyOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Property_name_key" ON "Property"("name");

-- CreateIndex
CREATE INDEX "Receipt_capturedAt_idx" ON "Receipt"("capturedAt");

-- CreateIndex
CREATE INDEX "Receipt_propertyId_idx" ON "Receipt"("propertyId");

-- CreateIndex
CREATE INDEX "Receipt_slackChannel_slackTs_idx" ON "Receipt"("slackChannel", "slackTs");

-- CreateIndex
CREATE INDEX "Transaction_txnDate_idx" ON "Transaction"("txnDate");

-- CreateIndex
CREATE INDEX "Transaction_propertyId_idx" ON "Transaction"("propertyId");

-- CreateIndex
CREATE INDEX "Transaction_needsReview_idx" ON "Transaction"("needsReview");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyItem_name_key" ON "SupplyItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyOrder_orderNumber_key" ON "SupplyOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "SupplyOrder_propertyId_idx" ON "SupplyOrder"("propertyId");

-- CreateIndex
CREATE INDEX "SupplyOrder_status_idx" ON "SupplyOrder"("status");

-- CreateIndex
CREATE INDEX "SupplyOrderItem_orderId_idx" ON "SupplyOrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionReceipt" ADD CONSTRAINT "TransactionReceipt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionReceipt" ADD CONSTRAINT "TransactionReceipt_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyOrder" ADD CONSTRAINT "SupplyOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyOrderItem" ADD CONSTRAINT "SupplyOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyOrderItem" ADD CONSTRAINT "SupplyOrderItem_supplyItemId_fkey" FOREIGN KEY ("supplyItemId") REFERENCES "SupplyItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
