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
    "tipType" TEXT DEFAULT 'degen',
    "tipAmount" INTEGER,
    "tipPct" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("actionType", "avatarUrl", "createdAt", "email", "id", "plan", "planExpiry", "planTokenId", "role", "signerUuid", "tipAmount", "tipPct", "tipType", "updatedAt", "username") SELECT "actionType", "avatarUrl", "createdAt", "email", "id", "plan", "planExpiry", "planTokenId", "role", "signerUuid", "tipAmount", "tipPct", "tipType", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_signerUuid_key" ON "User"("signerUuid");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
