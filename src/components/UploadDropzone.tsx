"use client";

import { upload } from "@vercel/blob/client";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { inspectPdf } from "@/lib/pdf";
import { formatBytes } from "@/lib/plans";
import { MAX_PDF_BYTES } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "converting" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

function titleFromFile(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
}

async function readApiJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as { magazine?: { id: string; slug: string }; error?: string; enabled?: boolean };
  } catch {
    if (response.status === 413 || text.startsWith("Request Entit")) {
      throw new Error("Dit PDF is te groot voor de server. Probeer het opnieuw.");
    }
    throw new Error(text.slice(0, 160) || `Upload mislukt (${response.status}).`);
  }
}

function postForm(form: FormData, onProgress: (ratio: number) => void) {
  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/magazines");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: { "Content-Type": xhr.getResponseHeader("content-type") || "application/json" },
        }),
      );
    };
    xhr.onerror = () => reject(new Error("Upload mislukt."));
    xhr.send(form);
  });
}

export function UploadDropzone({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [progress, setProgress] = useState(0);
  const [job, setJob] = useState<{ name: string; size: number } | null>(null);

  const setBar = useCallback((value: number) => {
    const next = Math.max(progressRef.current, Math.min(100, Math.round(value)));
    progressRef.current = next;
    setProgress(next);
  }, []);

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
      progressRef.current = 0;
      setProgress(0);
      setJob({ name: file.name, size: file.size });
      const creep = window.setInterval(() => {
        if (progressRef.current < 10) setBar(progressRef.current + 1);
      }, 220);
      try {
        setStatus({ kind: "converting" });
        const inspected = await inspectPdf(file);
        window.clearInterval(creep);
        setBar(12);
        setStatus({ kind: "uploading" });

        const blobStatus = await readApiJson(await fetch("/api/blob"));
        if (blobStatus.enabled) {
          const id = nanoid(10);
          const loaded = { pdf: 0, cover: 0 };
          const totals = { pdf: Math.max(1, file.size), cover: Math.max(1, inspected.cover.size) };
          const report = () => {
            const ratio = (loaded.pdf + loaded.cover) / (totals.pdf + totals.cover);
            setBar(12 + ratio * 80);
          };
          const [pdfBlob, coverBlob] = await Promise.all([
            upload(`magazines/${id}/magazine.pdf`, file, {
              access: "public",
              handleUploadUrl: "/api/blob",
              multipart: true,
              contentType: "application/pdf",
              onUploadProgress: (event) => {
                loaded.pdf = event.loaded;
                if (event.total > 0) totals.pdf = event.total;
                report();
              },
            }),
            upload(`magazines/${id}/cover.jpg`, inspected.cover, {
              access: "public",
              handleUploadUrl: "/api/blob",
              contentType: "image/jpeg",
              onUploadProgress: (event) => {
                loaded.cover = event.loaded;
                if (event.total > 0) totals.cover = event.total;
                report();
              },
            }),
          ]);
          setBar(94);
          const response = await fetch("/api/magazines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              pdfUrl: pdfBlob.url,
              coverUrl: coverBlob.url,
              title: titleFromFile(file.name),
              originalName: file.name,
              pageCount: inspected.pageCount,
              pageWidth: Math.round(inspected.pageWidth),
              pageHeight: Math.round(inspected.pageHeight),
              bytes: file.size,
            }),
          });
          const data = await readApiJson(response);
          if (!response.ok || !data.magazine) throw new Error(data.error ?? "Upload mislukt");
          setBar(100);
          router.push(`/v/${data.magazine.slug}?share=1`);
          router.refresh();
          return;
        }

        const form = new FormData();
        form.set("pdf", file);
        form.set("cover", inspected.cover, "cover.jpg");
        form.set("title", titleFromFile(file.name));
        form.set("originalName", file.name);
        form.set("pageCount", String(inspected.pageCount));
        form.set("pageWidth", String(Math.round(inspected.pageWidth)));
        form.set("pageHeight", String(Math.round(inspected.pageHeight)));
        const response = await postForm(form, (ratio) => setBar(12 + ratio * 82));
        const data = await readApiJson(response);
        if (!response.ok || !data.magazine) throw new Error(data.error ?? "Upload mislukt");
        setBar(100);
        router.push(`/v/${data.magazine.slug}?share=1`);
        router.refresh();
      } catch (error) {
        window.clearInterval(creep);
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "Er ging iets mis.",
        });
      }
    },
    [router, setBar],
  );

  const busy = status.kind === "converting" || status.kind === "uploading";

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (busy) return;
          const file = event.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={`group w-full rounded-2xl border-2 border-dashed transition ${
          busy ? "min-h-0 cursor-wait px-6 py-6 text-left" : compact ? "min-h-40 px-5 py-8 text-center" : "min-h-52 px-6 py-10 text-center"
        } ${
          busy ? "border-green bg-white" : dragOver ? "border-green bg-green/5" : "border-black/15 bg-white hover:border-green"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        {busy && job ? (
          <div className="w-full">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold text-ink">{status.kind === "uploading" ? "Uploaden…" : "Verwerken…"}</p>
              <p className="text-sm text-ink/45">{formatBytes(job.size)}</p>
            </div>
            <div
              className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Uploadvoortgang"
            >
              <div className="h-full rounded-full bg-green transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 truncate text-sm text-green">{job.name}</p>
          </div>
        ) : (
          <>
            <p className="text-ink/70">Sleep de PDF hierheen om te converteren</p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-md bg-green px-5 py-2.5 text-sm font-semibold text-white">
              ↑ Upload
            </span>
          </>
        )}
      </button>
      {status.kind === "error" ? <p className="mt-3 text-sm text-red-700">{status.message}</p> : null}
    </div>
  );
}
