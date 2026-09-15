-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "notes" TEXT,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "fileKind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pages" INTEGER NOT NULL,
    "pageRange" TEXT,
    "copies" INTEGER NOT NULL,
    "color" BOOLEAN NOT NULL,
    "duplex" BOOLEAN NOT NULL,
    "pricePerPage" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("color", "copies", "createdAt", "customerName", "customerPhone", "duplex", "fileKind", "fileSize", "id", "mimeType", "notes", "originalName", "pageRange", "pages", "pricePerPage", "status", "storedName", "totalPrice", "updatedAt") SELECT "color", "copies", "createdAt", "customerName", "customerPhone", "duplex", "fileKind", "fileSize", "id", "mimeType", "notes", "originalName", "pageRange", "pages", "pricePerPage", "status", "storedName", "totalPrice", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
