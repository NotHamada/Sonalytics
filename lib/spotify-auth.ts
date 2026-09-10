import { cookies } from "next/headers";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
export const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";

export const SCOPES = ["user-top-read", "user-read-recently-played", "user-library-read"].join(
  " "
);

export const COOKIE_ACCESS_TOKEN = "sp_access_token";
export const COOKIE_REFRESH_TOKEN = "sp_refresh_token";
export const COOKIE_EXPIRES_AT = "sp_expires_at";
export const COOKIE_OAUTH_STATE = "sp_oauth_state";

const isProd = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function basicAuthHeader(): string {
  const clientId = getEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = getEnv("SPOTIFY_CLIENT_SECRET");
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function getRedirectUri(): string {
  return getEnv("SPOTIFY_REDIRECT_URI");
}

/**
 * Canonical origin for app-internal redirects, derived from the registered redirect URI
 * rather than the incoming request. Next's dev server does not reliably reflect the actual
 * Host header in `request.url`, so deriving origin from the request is not safe here.
 */
export function getAppOrigin(): string {
  return new URL(getRedirectUri()).origin;
}

export function getClientId(): string {
  return getEnv("SPOTIFY_CLIENT_ID");
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token exchange failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? "",
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token refresh failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    // Spotify does not always rotate the refresh token; keep the old one if a new one isn't issued.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

/** Reads tokens from cookies. Returns null if the user isn't authenticated. */
export async function readStoredTokens(): Promise<StoredTokens | null> {
  const store = await cookies();
  const accessToken = store.get(COOKIE_ACCESS_TOKEN)?.value;
  const refreshToken = store.get(COOKIE_REFRESH_TOKEN)?.value;
  const expiresAt = store.get(COOKIE_EXPIRES_AT)?.value;

  if (!accessToken || !refreshToken || !expiresAt) return null;

  return { accessToken, refreshToken, expiresAt: Number(expiresAt) };
}

export async function persistTokens(tokens: StoredTokens): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_ACCESS_TOKEN, tokens.accessToken, baseCookieOptions);
  store.set(COOKIE_REFRESH_TOKEN, tokens.refreshToken, baseCookieOptions);
  store.set(COOKIE_EXPIRES_AT, String(tokens.expiresAt), baseCookieOptions);
}

export async function clearTokens(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_ACCESS_TOKEN);
  store.delete(COOKIE_REFRESH_TOKEN);
  store.delete(COOKIE_EXPIRES_AT);
}

const EXPIRY_SKEW_MS = 60_000; // refresh a minute early to avoid edge-of-expiry failures

/** Returns a valid access token, refreshing (and persisting) if it's expired or near-expiry. */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await readStoredTokens();
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt - EXPIRY_SKEW_MS) {
    return tokens.accessToken;
  }

  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    await persistTokens(refreshed);
    return refreshed.accessToken;
  } catch {
    await clearTokens();
    return null;
  }
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}
