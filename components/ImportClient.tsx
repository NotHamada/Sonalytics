"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface FileResult {
  name: string;
  parsed: number;
  error?: string;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; totalParsed: number; totalInserted: number; files: FileResult[] };

// ~500 bytes per raw entry, so a chunk stays around 1 MB — well under Vercel's 4.5 MB body limit.
const CHUNK_SIZE = 2000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function uploadFile(file: File): Promise<{ parsed: number; inserted: number }> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error(`${file.name} isn't valid JSON.`);
  }

  // A non-array is sent as-is so the server's parser reports its usual "doesn't look like a
  // Spotify streaming history file" error.
  const chunks = Array.isArray(json) ? chunk(json, CHUNK_SIZE) : [json];

  let parsed = 0;
  let inserted = 0;
  for (const entries of chunks) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, entries }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Import failed (${res.status})`);
    }
    const data = (await res.json()) as { parsed: number; inserted: number };
    parsed += data.parsed;
    inserted += data.inserted;
  }
  return { parsed, inserted };
}

export default function ImportClient() {
  const t = useTranslations("import");
  const tCommon = useTranslations("common");
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setState({ status: "uploading" });

    let totalParsed = 0;
    let totalInserted = 0;
    const results: FileResult[] = [];

    for (const file of files) {
      try {
        const { parsed, inserted } = await uploadFile(file);
        totalParsed += parsed;
        totalInserted += inserted;
        results.push({ name: file.name, parsed });
      } catch (err) {
        results.push({
          name: file.name,
          parsed: 0,
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    }

    setState({ status: "done", totalParsed, totalInserted, files: results });
  }

  return (
    <div className="glass-card p-6 text-center">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("uploadTitle")}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--text-secondary)]">
        {t("uploadDescriptionPrefix")} <code>Streaming_History_Audio_*.json</code> {t("uploadDescriptionMiddle")}{" "}
        <code>Streaming_History_Video_*.json</code> {t("uploadDescriptionSuffix")}
      </p>

      <label className="glow-accent mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]">
        {t("chooseFiles")}
        <input
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {state.status === "uploading" && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">{t("importing")}</p>
      )}

      {state.status === "done" && (
        <div className="mt-4 space-y-2 text-left">
          <div
            className="rounded-xl border border-[var(--divider)] px-4 py-3 text-sm text-[var(--text-primary)]"
            style={{ background: "var(--accent-soft)" }}
          >
            {t("importedSummary", {
              inserted: state.totalInserted.toLocaleString(),
              parsed: state.totalParsed.toLocaleString(),
              files: tCommon("units.files", { count: state.files.length }),
            })}
          </div>
          <ul className="space-y-1 text-xs text-[var(--text-tertiary)]">
            {state.files.map((f) => (
              <li key={f.name}>
                {f.name}:{" "}
                {f.error ? (
                  <span className="text-red-500 dark:text-red-300">{f.error}</span>
                ) : (
                  t("entries", { count: f.parsed })
                )}
              </li>
            ))}
          </ul>
          <Link
            href="/history"
            className="mt-3 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {t("viewHistory")}
          </Link>
        </div>
      )}
    </div>
  );
}
