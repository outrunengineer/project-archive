-- AlterTable: add resourcesReturned and conclusionType to Event
ALTER TABLE "Event" ADD COLUMN "resourcesReturned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "conclusionType" TEXT;
