"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { inspectPdf } from "@/lib/pdf";
import { MAX_PDF_BYTES } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "converting"; current: number; total: number }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

function titleFromFile(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
}

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setStatus({ kind: "error", message: "Alleen PDF-bestanden." });
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        setStatus({ kind: "error", message: "PDF is groter dan 40 MB." });
        return;
      }

      try {
        setStatus({ kind: "converting", current: 0, total: 1 });
        const inspected = await inspectPdf(file);
        setStatus({ kind: "converting", current: inspected.pageCount, total: inspected.pageCount });

        setStatus({ kind: "uploading" });
        const form = new FormData();
        form.set("pdf", file);
        form.set("cover", inspected.cover, "cover.jpg");
        form.set("title", titleFromFile(file.name));
        form.set("originalName", file.name);
        form.set("pageCount", String(inspected.pageCount));
        form.set("pageWidth", String(Math.round(inspected.pageWidth)));
        form.set("pageHeight", String(Math.round(inspected.pageHeight)));

        const response = await fetch("/api/magazines", { method: "POST", body: form });
        const data = (await response.json()) as { magazine?: { id: string }; error?: string };

        if (!response.ok || !data.magazine) {
          throw new Error(data.error ?? "Upload mislukt");
        }

        router.push(`/m/${data.magazine.id}`);
        router.refresh();
      } catch (error) {
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Er ging iets mis.",
        });
      }
    },
    [router],
  );

  const busy = status.kind === "converting" || status.kind === "uploading";

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={`group relative flex min-h-56 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-ink bg-white shadow-[0_20px_50px_rgba(28,25,21,0.12)]"
            : "border-ink/20 bg-white/70 hover:border-ink/45 hover:bg-white"
        } ${busy ? "cursor-wait" : "cursor-pointer"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />

        {status.kind === "converting" ? (
          <>
            <p className="font-display text-2xl text-ink">PDF wordt omgezet…</p>
            <p className="mt-2 text-sm text-ink/60">
              Pagina {status.current} van {status.total}
            </p>
            <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${status.total ? (status.current / status.total) * 100 : 8}%`,
                }}
              />
            </div>
          </>
        ) : status.kind === "uploading" ? (
          <>
            <p className="font-display text-2xl text-ink">Magazine wordt opgeslagen…</p>
            <p className="mt-2 text-sm text-ink/60">Daarna kun je erdoorheen bladeren.</p>
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/25">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="mt-5 font-display text-2xl text-ink">Sleep je PDF hierheen</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-ink/60">
              Of klik om een bestand te kiezen. We maken er een magazine van waar je doorheen kunt bladeren.
            </p>
            <span className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition group-hover:bg-accent">
              Upload PDF
            </span>
          </>
        )}
      </button>

      {status.kind === "error" ? (
        <p className="mt-4 text-center text-sm text-accent">{status.message}</p>
      ) : null}
    </div>
  );
}
