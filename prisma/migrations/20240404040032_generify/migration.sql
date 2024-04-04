/*
  Warnings:

  - You are about to drop the column `tipAmount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `degenTipPct` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tipType` on the `User` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "timezone" TEXT NOT NULL DEFAULT 'utc',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "email" TEXT,
    "signerUuid" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "planExpiry" DATETIME,
    "planTokenId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "actionType" TEXT,
    "tipType" TEXT,
    "tipAmount" INTEGER,
    "tipPct" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("actionType", "avatarUrl", "createdAt", "email", "id", "plan", "planExpiry", "planTokenId", "role", "signerUuid", "updatedAt", "username") SELECT "actionType", "avatarUrl", "createdAt", "email", "id", "plan", "planExpiry", "planTokenId", "role", "signerUuid", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_signerUuid_key" ON "User"("signerUuid");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
