"use client";

import { useState } from "react";

interface FileResult {
  name: string;
  parsed: number;
  error?: string;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; totalParsed: number; totalInserted: number; files: FileResult[] }
  | { status: "error"; message: string };

export default function ImportClient() {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setState({ status: "uploading" });

    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Import failed (${res.status})`);
      }
      const data = (await res.json()) as { totalParsed: number; totalInserted: number; files: FileResult[] };
      setState({ status: "done", ...data });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Import your history</h2>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        Request your <strong>Extended Streaming History</strong> from Spotify (Account → Privacy
        settings → Request data), wait for the email — it can take a few days — unzip it, and
        select every <code>Streaming_History_Audio_*.json</code> file below.
      </p>

      <label className="glow-accent mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]">
        Choose files
        <input
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {state.status === "uploading" && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Importing…</p>
      )}

      {state.status === "error" && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
          {state.message}
        </div>
      )}

      {state.status === "done" && (
        <div className="mt-4 space-y-2">
          <div
            className="rounded-xl border border-[var(--divider)] px-4 py-3 text-sm text-[var(--text-primary)]"
            style={{ background: "var(--accent-soft)" }}
          >
            Imported {state.totalInserted.toLocaleString()} new plays (
            {state.totalParsed.toLocaleString()} parsed across {state.files.length} file
            {state.files.length === 1 ? "" : "s"}).
          </div>
          <ul className="space-y-1 text-xs text-[var(--text-tertiary)]">
            {state.files.map((f) => (
              <li key={f.name}>
                {f.name}:{" "}
                {f.error ? <span className="text-red-500 dark:text-red-300">{f.error}</span> : `${f.parsed} entries`}
              </li>
            ))}
          </ul>
          <a
            href="/history"
            className="mt-3 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            View your history →
          </a>
        </div>
      )}
    </div>
  );
}
