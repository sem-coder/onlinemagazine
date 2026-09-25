"use client";

import { useState } from "react";
import { downloadCoverMockup } from "@/lib/cover-mockup";
import { renderPromoPages } from "@/lib/pdf";
import type { Magazine } from "@/lib/types";

export function CoverMockupDownload({ magazine }: { magazine: Magazine }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    setMessage("Cover-mockup maken…");
    const pages: ImageBitmap[] = [];
    try {
      const response = await fetch(magazine.pdfUrl || `/api/magazines/${magazine.id}/pdf`);
      if (!response.ok) throw new Error("PDF kon niet worden geladen.");
      const bytes = await response.arrayBuffer();
      const rendered = await renderPromoPages(bytes, 3, 780, 1100);
      pages.push(...rendered.pages);
      await downloadCoverMockup({
        pages: rendered.pages,
        pageWidth: rendered.pageWidth,
        pageHeight: rendered.pageHeight,
        filename: `${magazine.slug || magazine.id}-cover`,
      });
      setMessage("Gedownload. PNG is klaar voor socials en ads.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Mockup maken mislukt.");
    } finally {
      for (const page of pages) page.close();
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold">Cover-mockup</p>
      <p className="mt-1 text-sm text-ink/60">
        PNG van je brochure als 3D-magazine: cover schuin vooraan, open bladzijde erachter. Klaar voor LinkedIn, Meta of je site.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void make()}
        className="mt-3 rounded-md bg-green px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? "PNG maken…" : "Download PNG"}
      </button>
      {message ? <p className="mt-2 text-sm text-ink/60">{message}</p> : null}
    </div>
  );
}
