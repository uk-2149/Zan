/*
  Warnings:

  - The values [ONLINE] on the enum `ProviderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isReleased` on the `Escrow` table. All the data in the column will be lost.
  - You are about to drop the column `txSignature` on the `Escrow` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Escrow` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `budget` on the `Job` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `pricePerHour` on the `Provider` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - A unique constraint covering the columns `[agentPublicKey]` on the table `Provider` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `depositTxSig` to the `Escrow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Provider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProviderMetric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PASSED', 'SUSPICIOUS', 'FAILED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('LOCKED', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "StakeTransactionType" AS ENUM ('DEPOSIT', 'SLASH_VERIFICATION', 'SLASH_FRAUD', 'WITHDRAWAL', 'TIER_REFUND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'QUEUED';
ALTER TYPE "JobStatus" ADD VALUE 'REFUNDED';

-- AlterEnum
BEGIN;
CREATE TYPE "ProviderStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'BUSY', 'OFFLINE', 'SUSPENDED');
ALTER TABLE "public"."Provider" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Provider" ALTER COLUMN "status" TYPE "ProviderStatus_new" USING ("status"::text::"ProviderStatus_new");
ALTER TYPE "ProviderStatus" RENAME TO "ProviderStatus_old";
ALTER TYPE "ProviderStatus_new" RENAME TO "ProviderStatus";
DROP TYPE "public"."ProviderStatus_old";
ALTER TABLE "Provider" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Escrow" DROP COLUMN "isReleased",
DROP COLUMN "txSignature",
ADD COLUMN     "depositTxSig" TEXT NOT NULL,
ADD COLUMN     "refundTxSig" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "releaseTxSig" TEXT,
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "status" "EscrowStatus" NOT NULL DEFAULT 'LOCKED',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "executionMetadata" JSONB,
ADD COLUMN     "finalCost" DECIMAL(65,30),
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "requiredGpuTier" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiredVramGB" INTEGER,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "verificationCostClient" DECIMAL(65,30),
ADD COLUMN     "verificationCostProvider" DECIMAL(65,30),
ADD COLUMN     "verificationExecutionMetadata" JSONB,
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationOutputUri" TEXT,
ADD COLUMN     "verificationProviderId" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "budget" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "agentPublicKey" TEXT,
ADD COLUMN     "agentVersion" TEXT,
ADD COLUMN     "availabilitySchedule" JSONB,
ADD COLUMN     "computeCapability" TEXT,
ADD COLUMN     "cudaVersion" TEXT,
ADD COLUMN     "downloadMbps" DOUBLE PRECISION,
ADD COLUMN     "driverVersion" TEXT,
ADD COLUMN     "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pingMs" DOUBLE PRECISION,
ADD COLUMN     "stakeLockedUntil" TIMESTAMP(3),
ADD COLUMN     "stakeSignature" TEXT,
ADD COLUMN     "stakedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploadMbps" DOUBLE PRECISION,
ALTER COLUMN "pricePerHour" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ProviderMetric" ADD COLUMN     "avgExecutionTimeMs" INTEGER,
ADD COLUMN     "avgGpuUtilization" DOUBLE PRECISION,
ADD COLUMN     "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "timesBeingFlagged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalEarnedSol" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "totalSlashedSol" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uptimePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "verificationsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationsPassed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakeTransaction" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" "StakeTransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "jobId" TEXT,
    "txSig" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StakeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "StakeTransaction_providerId_idx" ON "StakeTransaction"("providerId");

-- CreateIndex
CREATE INDEX "StakeTransaction_providerId_type_idx" ON "StakeTransaction"("providerId", "type");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_clientId_idx" ON "Job"("clientId");

-- CreateIndex
CREATE INDEX "Job_providerId_idx" ON "Job"("providerId");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JobEvent_jobId_idx" ON "JobEvent"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_agentPublicKey_key" ON "Provider"("agentPublicKey");

-- CreateIndex
CREATE INDEX "Provider_status_idx" ON "Provider"("status");

-- CreateIndex
CREATE INDEX "Provider_status_tier_idx" ON "Provider"("status", "tier");

-- CreateIndex
CREATE INDEX "Provider_status_vramGB_idx" ON "Provider"("status", "vramGB");

-- CreateIndex
CREATE INDEX "Provider_lastHeartbeat_idx" ON "Provider"("lastHeartbeat");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeTransaction" ADD CONSTRAINT "StakeTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_verificationProviderId_fkey" FOREIGN KEY ("verificationProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
