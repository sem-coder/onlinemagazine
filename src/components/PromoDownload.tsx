"use client";

import { useState } from "react";
import { renderPromoPages } from "@/lib/pdf";
import { downloadPromoClip, type PromoFormat } from "@/lib/promo-clip";
import type { Magazine } from "@/lib/types";

export function PromoDownload({ magazine }: { magazine: Magazine }) {
  const [busy, setBusy] = useState<PromoFormat | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  async function make(format: PromoFormat) {
    setBusy(format);
    setProgress(0);
    setMessage(format === "mp4" ? "Pagina’s laden voor de clip…" : "GIF maken…");
    const pages: ImageBitmap[] = [];
    try {
      const response = await fetch(magazine.pdfUrl || `/api/magazines/${magazine.id}/pdf`);
      if (!response.ok) throw new Error("PDF kon niet worden geladen.");
      const bytes = await response.arrayBuffer();
      const rendered = await renderPromoPages(bytes, Math.min(10, Math.max(4, magazine.pageCount)), 520, 740, (value) => {
        setProgress(Math.round((value.current / Math.max(1, value.total)) * 40));
      });
      pages.push(...rendered.pages);
      setMessage(format === "mp4" ? "Animatie omzetten naar MP4…" : "Frames naar GIF schrijven…");
      await downloadPromoClip({
        pages: rendered.pages,
        pageWidth: rendered.pageWidth,
        pageHeight: rendered.pageHeight,
        filename: `${magazine.slug || magazine.id}-preview`,
        format,
        onProgress: (value) => setProgress(40 + Math.round(value * 60)),
      });
      setProgress(100);
      setMessage("Gedownload. MP4 is het best voor Meta-ads.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Clip maken mislukt.");
    } finally {
      for (const page of pages) page.close();
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold">Advertentieclip</p>
      <p className="mt-1 text-sm text-ink/60">
        Korte video waarin de brochure écht omslaat, zoals in de viewer. MP4 is klaar voor Meta; GIF is kleiner en universeel.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void make("mp4")}
          className="rounded-md bg-green px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy === "mp4" ? "MP4 maken…" : "Download MP4"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void make("gif")}
          className="rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50"
        >
          {busy === "gif" ? "GIF maken…" : "Download GIF"}
        </button>
      </div>
      {busy ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10">
          <div className="h-full bg-green transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-ink/60">{message}</p> : null}
    </div>
  );
}
