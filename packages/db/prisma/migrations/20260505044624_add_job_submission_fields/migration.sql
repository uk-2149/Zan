/*
  Warnings:

  - Added the required column `dockerImage` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobParams` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Made the column `requiredVramGB` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "dockerImage" TEXT NOT NULL,
ADD COLUMN     "jobParams" JSONB NOT NULL,
ADD COLUMN     "timeLimitSecs" INTEGER NOT NULL DEFAULT 3600,
ALTER COLUMN "requiredVramGB" SET NOT NULL,
ALTER COLUMN "requiredVramGB" SET DEFAULT 4;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletNonce" TEXT,
ADD COLUMN     "walletNonceExpiry" TIMESTAMP(3);
