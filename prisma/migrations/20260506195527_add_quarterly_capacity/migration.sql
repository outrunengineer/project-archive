-- CreateTable
CREATE TABLE "QuarterlyCapacity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timelineId" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "quarter" TEXT NOT NULL,
    "totalFte" REAL NOT NULL DEFAULT 0,
    "platformFte" REAL NOT NULL DEFAULT 0,
    "replacementFte" REAL NOT NULL DEFAULT 0,
    "newFte" REAL NOT NULL DEFAULT 0,
    "businessContinuityFte" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuarterlyCapacity_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "Timeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyCapacity_timelineId_fiscalYear_quarter_key" ON "QuarterlyCapacity"("timelineId", "fiscalYear", "quarter");
