-- CreateTable
CREATE TABLE "PlayEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playedAt" DATETIME NOT NULL,
    "msPlayed" INTEGER NOT NULL,
    "trackUri" TEXT,
    "trackName" TEXT,
    "artistName" TEXT,
    "albumName" TEXT,
    "platform" TEXT,
    "reasonStart" TEXT,
    "reasonEnd" TEXT,
    "shuffle" BOOLEAN,
    "skipped" BOOLEAN,
    "offline" BOOLEAN,
    "isPodcast" BOOLEAN NOT NULL DEFAULT false,
    "isAudiobook" BOOLEAN NOT NULL DEFAULT false,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "PlayEvent_playedAt_idx" ON "PlayEvent"("playedAt");

-- CreateIndex
CREATE INDEX "PlayEvent_artistName_idx" ON "PlayEvent"("artistName");

-- CreateIndex
CREATE UNIQUE INDEX "PlayEvent_dedupeKey_playedAt_key" ON "PlayEvent"("dedupeKey", "playedAt");
