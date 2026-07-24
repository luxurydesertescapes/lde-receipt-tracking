-- CreateTable
CREATE TABLE "SlackSyncState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,

    CONSTRAINT "SlackSyncState_pkey" PRIMARY KEY ("id")
);
