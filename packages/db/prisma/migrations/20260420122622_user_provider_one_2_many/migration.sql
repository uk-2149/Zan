-- DropIndex
DROP INDEX "Provider_userId_key";

-- CreateIndex
CREATE INDEX "Provider_userId_idx" ON "Provider"("userId");
