-- CreateTable
CREATE TABLE "Risk" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Ongoing',
    "severity" TEXT NOT NULL,
    "types" TEXT NOT NULL,
    "timelineId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Risk_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "Timeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
