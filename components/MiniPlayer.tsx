/** Spotify's own embeddable player widget — works for any visitor (no Premium, no extra OAuth
 *  scopes) since it runs Spotify's own playback inside the iframe, not this app's session.
 *  Unwrapped (no card of its own) so callers can drop it inline into their own layout. */
export default function MiniPlayer({
  trackId,
  artistId,
  albumId,
  height,
}: {
  trackId?: string;
  artistId?: string;
  albumId?: string;
  height?: number;
}) {
  const src = trackId
    ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
    : artistId
      ? `https://open.spotify.com/embed/artist/${artistId}?utm_source=generator&theme=0`
      : albumId
        ? `https://open.spotify.com/embed/album/${albumId}?utm_source=generator&theme=0`
        : null;

  if (!src) return null;

  return (
    <iframe
      key={src}
      src={src}
      width="100%"
      height={height ?? (trackId ? 152 : 352)}
      style={{ borderRadius: 12, border: "none", display: "block" }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify player"
    />
  );
}
