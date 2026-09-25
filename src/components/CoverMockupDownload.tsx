"use client";

import { useState } from "react";
import { downloadCoverMockup, type MockupKind } from "@/lib/cover-mockup";
import { renderPromoPages } from "@/lib/pdf";
import type { Magazine } from "@/lib/types";

export function CoverMockupDownload({ magazine }: { magazine: Magazine }) {
  const [busy, setBusy] = useState<MockupKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function make(kind: MockupKind) {
    setBusy(kind);
    setMessage(kind === "cover" ? "Cover maken…" : "Open magazine maken…");
    const pages: ImageBitmap[] = [];
    try {
      const response = await fetch(magazine.pdfUrl || `/api/magazines/${magazine.id}/pdf`);
      if (!response.ok) throw new Error("PDF kon niet worden geladen.");
      const bytes = await response.arrayBuffer();
      const rendered = await renderPromoPages(bytes, 3, 780, 1100);
      pages.push(...rendered.pages);
      const slug = magazine.slug || magazine.id;
      await downloadCoverMockup({
        pages: rendered.pages,
        filename: kind === "cover" ? `${slug}-cover` : `${slug}-open`,
        kind,
      });
      setMessage(kind === "cover" ? "Cover gedownload." : "Open magazine gedownload.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Mockup maken mislukt.");
    } finally {
      for (const page of pages) page.close();
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold">Mockups</p>
      <p className="mt-1 text-sm text-ink/60">
        Twee losse PNG’s voor socials: de cover alleen, of het magazine opengeslagen.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void make("cover")}
          className="rounded-md bg-green px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy === "cover" ? "Cover maken…" : "Download cover"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void make("open")}
          className="rounded-md border border-black/10 px-3 py-2 text-sm disabled:opacity-50"
        >
          {busy === "open" ? "Open magazine maken…" : "Download open"}
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-ink/60">{message}</p> : null}
    </div>
  );
}
