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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="text-lg font-semibold text-neutral-100">Import your history</h2>
      <p className="mt-1.5 text-sm text-neutral-400">
        Request your <strong>Extended Streaming History</strong> from Spotify (Account → Privacy
        settings → Request data), wait for the email — it can take a few days — unzip it, and
        select every <code>Streaming_History_Audio_*.json</code> and{" "}
        <code>Streaming_History_Video_*.json</code> file below (same format, just audio vs.
        video plays).
      </p>

      <label className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1DB954] px-6 py-3 font-semibold text-black hover:bg-[#1ed760] transition-colors">
        Choose files
        <input
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {state.status === "uploading" && <p className="mt-4 text-sm text-neutral-400">Importing…</p>}

      {state.status === "error" && (
        <div className="mt-4 rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.message}
        </div>
      )}

      {state.status === "done" && (
        <div className="mt-4 space-y-2">
          <div className="rounded-md border border-neutral-800 bg-neutral-800/50 px-4 py-3 text-sm text-neutral-100">
            Imported {state.totalInserted.toLocaleString()} new plays (
            {state.totalParsed.toLocaleString()} parsed across {state.files.length} file
            {state.files.length === 1 ? "" : "s"}).
          </div>
          <ul className="space-y-1 text-xs text-neutral-500">
            {state.files.map((f) => (
              <li key={f.name}>
                {f.name}: {f.error ? <span className="text-red-300">{f.error}</span> : `${f.parsed} entries`}
              </li>
            ))}
          </ul>
          <a href="/history" className="mt-3 inline-block text-sm font-medium text-[#1DB954] hover:underline">
            View your history →
          </a>
        </div>
      )}
    </div>
  );
}
