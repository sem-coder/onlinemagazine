"use client";

import { upload } from "@vercel/blob/client";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { inspectPdf } from "@/lib/pdf";
import { shrinkPdfForUpload, UPLOAD_TARGET_BYTES } from "@/lib/shrink-pdf";
import { MAX_PDF_BYTES } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "converting"; current: number; total: number; label: string }
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
      throw new Error("Dit PDF is te groot. Ververs de pagina — we verkleinen hem nu automatisch.");
    }
    throw new Error(text.slice(0, 160) || `Upload mislukt (${response.status}).`);
  }
}

export function UploadDropzone({ compact = false }: { compact?: boolean }) {
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
        setStatus({ kind: "converting", current: 0, total: 1, label: "PDF wordt gelezen…" });
        const inspected = await inspectPdf(file);
        let pdf = file;
        if (file.size > UPLOAD_TARGET_BYTES) {
          pdf = await shrinkPdfForUpload(file, (progress) => {
            setStatus({
              kind: "converting",
              current: progress.current,
              total: progress.total,
              label: `PDF wordt verkleind… pagina ${progress.current}/${progress.total}`,
            });
          });
        }
        setStatus({ kind: "uploading" });

        const blobStatus = await readApiJson(await fetch("/api/blob"));
        if (blobStatus.enabled) {
          const id = nanoid(10);
          const [pdfBlob, coverBlob] = await Promise.all([
            upload(`magazines/${id}/magazine.pdf`, pdf, {
              access: "public",
              handleUploadUrl: "/api/blob",
              multipart: true,
              contentType: "application/pdf",
            }),
            upload(`magazines/${id}/cover.jpg`, inspected.cover, {
              access: "public",
              handleUploadUrl: "/api/blob",
              contentType: "image/jpeg",
            }),
          ]);
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
            }),
          });
          const data = await readApiJson(response);
          if (!response.ok || !data.magazine) throw new Error(data.error ?? "Upload mislukt");
          router.push(`/v/${data.magazine.slug}?share=1`);
          router.refresh();
          return;
        }

        const form = new FormData();
        form.set("pdf", pdf);
        form.set("cover", inspected.cover, "cover.jpg");
        form.set("title", titleFromFile(file.name));
        form.set("originalName", file.name);
        form.set("pageCount", String(inspected.pageCount));
        form.set("pageWidth", String(Math.round(inspected.pageWidth)));
        form.set("pageHeight", String(Math.round(inspected.pageHeight)));
        const response = await fetch("/api/magazines", { method: "POST", body: form });
        const data = await readApiJson(response);
        if (!response.ok || !data.magazine) throw new Error(data.error ?? "Upload mislukt");
        router.push(`/v/${data.magazine.slug}?share=1`);
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
        className={`group w-full rounded-2xl border-2 border-dashed text-center transition ${
          compact ? "min-h-40 px-5 py-8" : "min-h-52 px-6 py-10"
        } ${dragOver ? "border-green bg-green/5" : "border-black/15 bg-white hover:border-green"} ${
          busy ? "cursor-wait" : "cursor-pointer"
        }`}
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
        {status.kind === "converting" || status.kind === "uploading" ? (
          <p className="font-medium text-ink">
            {status.kind === "uploading" ? "Magazine wordt gepubliceerd…" : status.label}
          </p>
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
