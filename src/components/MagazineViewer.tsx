"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PageFlip } from "page-flip";
import { useEffect, useRef, useState } from "react";
import { Flipbook } from "@/components/Flipbook";
import { SharePanel } from "@/components/SharePanel";
import { renderPdf, revokePages } from "@/lib/pdf";
import type { Magazine } from "@/lib/types";

type Props = {
  magazine: Magazine;
  pagesFromImages?: string[];
  mode?: "reader" | "embed";
  showBranding?: boolean;
  openShare?: boolean;
};

export function MagazineViewer({
  magazine,
  pagesFromImages,
  mode = "reader",
  showBranding = true,
  openShare = false,
}: Props) {
  const bookRef = useRef<PageFlip | null>(null);
  const [pages, setPages] = useState<string[]>(pagesFromImages ?? []);
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: magazine.pageCount });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [share, setShare] = useState(openShare);
  const [lead, setLead] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [size, setSize] = useState({
    width: magazine.pageWidth || 595,
    height: magazine.pageHeight || 842,
  });

  useEffect(() => {
    if (pagesFromImages?.length) return;
    let cancelled = false;
    let urls: string[] = [];
    async function load() {
      try {
        const response = await fetch(magazine.pdfUrl || `/api/magazines/${magazine.id}/pdf`);
        if (!response.ok) throw new Error("PDF kon niet worden geladen.");
        const rendered = await renderPdf(await response.arrayBuffer(), (value) => {
          if (!cancelled) setProgress(value);
        });
        if (cancelled) {
          revokePages(rendered.pages);
          return;
        }
        urls = rendered.pages;
        setPages(rendered.pages);
        setSize({ width: rendered.pageWidth, height: rendered.pageHeight });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Laden mislukt.");
      }
    }
    void load();
    return () => {
      cancelled = true;
      revokePages(urls);
    };
  }, [magazine.id, pagesFromImages]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        bookRef.current?.flipNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        bookRef.current?.flipPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loading = pages.length === 0 && !error;
  const embed = mode === "embed";

  return (
    <div className={`relative flex flex-col overflow-hidden bg-viewer text-paper ${embed ? "h-full min-h-[640px]" : "h-dvh"}`}>
      {!embed ? (
        <header className="flex items-center justify-between px-5 py-3">
          <Link href="/" className="text-sm text-paper/70">
            Folio
          </Link>
          <div className="text-center">
            <p className="text-sm font-medium">{magazine.title}</p>
            <p className="text-xs text-paper/50">{magazine.pageCount} pagina’s</p>
          </div>
          <button
            type="button"
            onClick={() => setShare(true)}
            className="rounded-full bg-green px-3 py-1.5 text-sm text-white"
          >
            Deel / embed
          </button>
        </header>
      ) : null}

      <main className="relative min-h-0 flex-1 px-3 pb-24 pt-2">
        {error ? (
          <p className="flex h-full items-center justify-center text-sm text-red-300">{error}</p>
        ) : loading ? (
          <p className="flex h-full items-center justify-center text-sm text-paper/70">
            Pagina {progress.current} van {progress.total}
          </p>
        ) : (
          <div className="book-stage absolute inset-3 bottom-24">
            <Flipbook
              pages={pages}
              pageWidth={size.width}
              pageHeight={size.height}
              onFlip={(index) => {
                setPage(index);
                if (magazine.leadForm && index >= 2 && !leadDone) setLead(true);
              }}
              onReady={(book) => {
                bookRef.current = book;
                setReady(true);
              }}
            />
          </div>
        )}
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 py-1.5 text-sm backdrop-blur">
          <ToolButton label="Vorige" disabled={!ready || page <= 0} onClick={() => bookRef.current?.flipPrev()}>
            ‹
          </ToolButton>
          <span className="min-w-16 px-2 text-center text-paper/80">
            {page + 1} / {magazine.pageCount}
          </span>
          <ToolButton
            label="Volgende"
            disabled={!ready || page >= magazine.pageCount - 1}
            onClick={() => bookRef.current?.flipNext()}
          >
            ›
          </ToolButton>
        </div>
      </div>

      {showBranding ? (
        <Link
          href="/"
          className="absolute bottom-4 left-4 rounded bg-green px-2 py-1 text-[11px] font-semibold text-white"
        >
          Made with Folio
        </Link>
      ) : null}

      {share && !embed ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-[#f4f6f5] p-5 text-ink">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Publiceren</h2>
              <button type="button" onClick={() => setShare(false)} className="text-sm text-ink/60">
                Sluiten
              </button>
            </div>
            <SharePanel magazine={magazine} />
          </div>
        </div>
      ) : null}

      {lead ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <form
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-ink"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  magazineId: magazine.id,
                  name: form.get("name"),
                  email: form.get("email"),
                }),
              });
              setLeadDone(true);
              setLead(false);
            }}
          >
            <p className="font-semibold">Blijf op de hoogte</p>
            <p className="mt-1 text-sm text-ink/60">Laat je e-mail achter en sla deze catalogus op.</p>
            <input name="name" placeholder="Naam" className="mt-4 w-full rounded-md border px-3 py-2 text-sm" />
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail"
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
            />
            <button type="submit" className="mt-4 w-full rounded-md bg-green py-2 text-sm text-white">
              Verstuur
            </button>
            <button type="button" onClick={() => setLead(false)} className="mt-2 w-full text-sm text-ink/50">
              Nee bedankt
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full px-3 py-2 text-lg text-paper/85 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
