import type { GenrePair } from "@/lib/types";

export default function GenrePairsCard({ pairs }: { pairs: GenrePair[] }) {
  const max = Math.max(1, ...pairs.map((p) => p.count));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-1 text-lg font-semibold text-neutral-100">Genre Pairings</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Genres that most often tag the same artist in your top artists.
      </p>
      {pairs.length === 0 ? (
        <p className="text-sm text-neutral-500">Not enough genre overlap to find pairings yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {pairs.map((pair) => (
            <li key={`${pair.genreA}|${pair.genreB}`}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-neutral-200">
                  {pair.genreA} <span className="text-neutral-600">+</span> {pair.genreB}
                </span>
                <span className="tabular-nums text-neutral-500">{pair.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-800">
                <div
                  className="h-1.5 rounded-full bg-[#1DB954]"
                  style={{ width: `${(pair.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
