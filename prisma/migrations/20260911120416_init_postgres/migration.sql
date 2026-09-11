-- CreateTable
CREATE TABLE "PlayEvent" (
    "id" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
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
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,

    CONSTRAINT "PlayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifyAccount" (
    "id" TEXT NOT NULL,
    "spotifyUserId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayEvent_playedAt_idx" ON "PlayEvent"("playedAt");

-- CreateIndex
CREATE INDEX "PlayEvent_artistName_idx" ON "PlayEvent"("artistName");

-- CreateIndex
CREATE UNIQUE INDEX "PlayEvent_dedupeKey_playedAt_key" ON "PlayEvent"("dedupeKey", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyAccount_spotifyUserId_key" ON "SpotifyAccount"("spotifyUserId");
