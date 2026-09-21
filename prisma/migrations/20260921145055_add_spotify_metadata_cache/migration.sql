-- CreateTable
CREATE TABLE "CachedTrack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "popularity" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "albumId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumReleaseDate" TEXT NOT NULL,
    "albumTotalTracks" INTEGER,
    "albumImages" JSONB NOT NULL,
    "artists" JSONB NOT NULL,
    "externalUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedArtist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genres" JSONB NOT NULL,
    "popularity" INTEGER NOT NULL,
    "followers" INTEGER NOT NULL,
    "images" JSONB NOT NULL,
    "externalUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedArtist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CachedTrack_fetchedAt_idx" ON "CachedTrack"("fetchedAt");

-- CreateIndex
CREATE INDEX "CachedArtist_fetchedAt_idx" ON "CachedArtist"("fetchedAt");
