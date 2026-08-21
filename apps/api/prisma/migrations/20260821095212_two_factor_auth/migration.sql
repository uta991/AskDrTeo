-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailedLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLockAlertAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "login_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resends" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_challenges_userId_consumedAt_idx" ON "login_challenges"("userId", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_tokenHash_key" ON "trusted_devices"("tokenHash");

-- CreateIndex
CREATE INDEX "trusted_devices_userId_revokedAt_idx" ON "trusted_devices"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "login_challenges" ADD CONSTRAINT "login_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
