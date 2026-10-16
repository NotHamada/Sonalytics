"use client";

import { CheckCircle2, FileJson, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Badge, GlassCard, PillButton, ProgressBar } from "./sona/primitives";

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
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

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

  const uploading = state.status === "uploading";

  return (
    <>
      <GlassCard
        as="section"
        aria-label={t("uploadTitle")}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center gap-4 border-2 border-dashed py-14 text-center", dragging && "border-brand bg-brand-soft")}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">{t("dropTitle")}</p>
          <p className="text-sm text-text-tertiary">{t("dropHint")}</p>
        </div>
        <input
          ref={input}
          type="file"
          accept=".json"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label={t("chooseFiles")}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <PillButton onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? t("importing") : t("chooseFiles")}
        </PillButton>
      </GlassCard>

      {uploading && (
        <GlassCard role="status" aria-live="polite">
          <span className="sr-only">{t("importing")}</span>
          <div className="skeleton h-24 rounded-xl" />
        </GlassCard>
      )}

      {state.status === "done" && (
        <GlassCard as="section" aria-label={t("result")} className="fade-up flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <h2 className="font-semibold">
              {t("importedSummary", {
                inserted: state.totalInserted.toLocaleString(),
                parsed: state.totalParsed.toLocaleString(),
                files: tCommon("units.files", { count: state.files.length }),
              })}
            </h2>
          </div>
          <ProgressBar
            value={state.totalParsed > 0 ? Math.round((state.totalInserted / state.totalParsed) * 100) : 0}
            label={t("importedShare")}
          />
          <ul className="flex flex-col">
            {state.files.map((f) => (
              <li key={f.name} className="flex items-center gap-3 border-t border-divider py-3 first:border-t-0">
                <FileJson className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">{f.name}</span>
                {f.error ? <Badge tone="warn">{f.error}</Badge> : <Badge tone="green">{t("entries", { count: f.parsed })}</Badge>}
              </li>
            ))}
          </ul>
          {state.totalParsed > state.totalInserted && (
            <p className="text-xs text-text-tertiary">{t("alreadyImported", { count: (state.totalParsed - state.totalInserted).toLocaleString() })}</p>
          )}
          <Link href="/history" className="text-sm font-medium text-brand hover:underline">
            {t("viewHistory")}
          </Link>
        </GlassCard>
      )}
    </>
  );
}
