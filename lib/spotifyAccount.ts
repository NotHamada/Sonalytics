import { prisma } from "./db";
import { EXPIRY_SKEW_MS, refreshAccessToken, type StoredTokens } from "./spotify-auth";

/** Upserts the stored account after login/token refresh so the cron job can use it later. */
export async function saveSpotifyAccount(spotifyUserId: string, tokens: StoredTokens): Promise<void> {
  await prisma.spotifyAccount.upsert({
    where: { spotifyUserId },
    create: {
      spotifyUserId,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: new Date(tokens.expiresAt),
    },
    update: {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: new Date(tokens.expiresAt),
    },
  });
}

/**
 * Returns a valid access token for the background sync job, refreshing (and persisting)
 * if needed. This is a personal single-user app, so there's exactly one stored account —
 * grabs whichever was most recently updated rather than requiring a request-scoped session.
 */
export async function getValidAccessTokenForSync(): Promise<string | null> {
  const account = await prisma.spotifyAccount.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!account) return null;

  if (Date.now() < account.accessTokenExpiresAt.getTime() - EXPIRY_SKEW_MS) {
    return account.accessToken;
  }

  try {
    const refreshed = await refreshAccessToken(account.refreshToken);
    await saveSpotifyAccount(account.spotifyUserId, refreshed);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}
