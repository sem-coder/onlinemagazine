"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PageFlip } from "page-flip";
import { useEffect, useRef, useState } from "react";
import { Flipbook } from "@/components/Flipbook";
import { SharePanel } from "@/components/SharePanel";
import { leadFormFields, leadTriggerPage } from "@/lib/lead-form";
import { fitPdfInStage, renderPdf, revokePages } from "@/lib/pdf";
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
  const stageRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>(pagesFromImages ?? []);
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: magazine.pageCount });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [share, setShare] = useState(openShare);
  const [lead, setLead] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadBusy, setLeadBusy] = useState(false);
  const leadLockRef = useRef(false);
  const [layout, setLayout] = useState({
    pageWidth: magazine.pageWidth || 595,
    pageHeight: magazine.pageHeight || 842,
    single: true,
  });

  useEffect(() => {
    if (pagesFromImages?.length) return;
    let cancelled = false;
    let urls: string[] = [];
    async function load() {
      try {
        const response = await fetch(magazine.pdfUrl || `/api/magazines/${magazine.id}/pdf`);
        if (!response.ok) throw new Error("PDF kon niet worden geladen.");
        const bytes = await response.arrayBuffer();
        if (cancelled) return;

        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        const rendered = await renderPdf(
          bytes,
          (pageW, pageH, portraitBook) => {
            const stage = stageRef.current?.getBoundingClientRect();
            const stageW = stage && stage.width > 80 ? stage.width : window.innerWidth;
            const stageH = stage && stage.height > 80 ? stage.height : window.innerHeight;
            const twoPage = portraitBook && stageW >= 720;
            return fitPdfInStage(pageW, pageH, stageW - 16, stageH - 16, twoPage);
          },
          (value) => {
            if (!cancelled) setProgress(value);
          },
          (batch) => {
            if (cancelled) return;
            urls = batch.pages;
            setLayout(batch.fitted);
            setPages(batch.pages);
          },
        );
        if (cancelled) {
          revokePages(rendered.pages);
          return;
        }
        urls = rendered.pages;
        setLayout(rendered.fitted);
        setPages(rendered.pages);
        setProgress({ current: rendered.pages.length, total: rendered.pages.length });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Laden mislukt.");
      }
    }
    void load();
    return () => {
      cancelled = true;
      revokePages(urls);
    };
  }, [magazine.id, magazine.pdfUrl, pagesFromImages]);

  useEffect(() => {
    if (pages.length === 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const rect = stage.getBoundingClientRect();
      const stageW = rect.width > 80 ? rect.width : window.innerWidth;
      const stageH = rect.height > 80 ? rect.height : window.innerHeight;
      const twoPage = magazine.pageWidth < magazine.pageHeight && stageW >= 720;
      setLayout(fitPdfInStage(magazine.pageWidth, magazine.pageHeight, stageW - 16, stageH - 16, twoPage));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [pages.length, magazine.pageWidth, magazine.pageHeight]);

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

  useEffect(() => {
    const settings = leadFormFields(magazine);
    if (!settings.leadForm || lead || share) return;
    try {
      if (localStorage.getItem(leadDoneKey(magazine.id)) === "done") {
        leadLockRef.current = true;
      }
    } catch {
      /* ignore */
    }
    if (leadLockRef.current || pages.length === 0) return;
    const total = Math.max(progress.total, magazine.pageCount, pages.length, 1);
    const triggerAt = leadTriggerPage(total, settings.leadTriggerPercent);
    if (page + 1 < triggerAt) return;
    setLead(true);
  }, [page, pages.length, progress.total, magazine.id, magazine.leadForm, magazine.leadTriggerPercent, magazine.pageCount, lead, share]);

  function dismissLead(submitted = false) {
    leadLockRef.current = true;
    setLead(false);
    if (!submitted) return;
    try {
      localStorage.setItem(leadDoneKey(magazine.id), "done");
    } catch {
      /* ignore */
    }
  }

  const leadCopy = leadFormFields(magazine);
  const embed = mode === "embed";
  const totalPages = Math.max(progress.total, pages.length, magazine.pageCount);
  const loading = progress.current < totalPages || (pages.length === 0 && !error);
  const loadPercent = totalPages ? Math.min(100, Math.round((progress.current / totalPages) * 100)) : 0;

  return (
    <div className={`relative flex flex-col overflow-hidden bg-viewer text-paper ${embed ? "h-full w-full" : "h-dvh"}`}>
      {!embed ? (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3">
          <Link href="/" className="pointer-events-auto text-sm text-paper/70">
            PDFmagazine.nl
          </Link>
          <div className="text-center">
            <p className="text-sm font-medium">{magazine.title}</p>
            <p className="text-xs text-paper/50">{totalPages} pagina’s</p>
          </div>
          <button
            type="button"
            onClick={() => setShare(true)}
            className="pointer-events-auto rounded-full bg-green px-3 py-1.5 text-sm text-white"
          >
            Deel / embed
          </button>
        </header>
      ) : null}

      {loading ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
          <div className="h-1 bg-white/10">
            <div className="h-full bg-green transition-[width] duration-200" style={{ width: `${loadPercent}%` }} />
          </div>
          <p className="mt-2 text-center text-[11px] text-paper/55">
            {pages.length ? `Laden ${loadPercent}%` : `Pagina ${progress.current} van ${totalPages}`}
          </p>
        </div>
      ) : null}

      <main className="relative min-h-0 flex-1">
        <div ref={stageRef} className="book-stage absolute inset-0 flex items-center justify-center pb-16">
          {error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : pages.length ? (
            <Flipbook
              pages={pages}
              pageWidth={layout.pageWidth}
              pageHeight={layout.pageHeight}
              single={layout.single}
              onFlip={(index) => {
                setPage(index);
              }}
              onReady={(book) => {
                bookRef.current = book;
                setReady(true);
              }}
            />
          ) : (
            <p className="text-sm text-paper/70">Magazine wordt geladen…</p>
          )}
        </div>
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 py-1.5 text-sm backdrop-blur">
          <ToolButton label="Vorige" disabled={!ready || page <= 0} onClick={() => bookRef.current?.flipPrev()}>
            ‹
          </ToolButton>
          <span className="min-w-16 px-2 text-center text-paper/80">
            {pageLabel(page, totalPages, layout.single)}
          </span>
          <ToolButton
            label="Volgende"
            disabled={!ready || page >= pages.length - 1}
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
          Made with PDFmagazine.nl
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
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <form
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-ink"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setLeadBusy(true);
              setLeadError(null);
              void fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  magazineId: magazine.id,
                  name: form.get("name"),
                  email: form.get("email"),
                }),
              })
                .then(async (response) => {
                  const data = (await response.json()) as { error?: string };
                  if (!response.ok) throw new Error(data.error ?? "Versturen mislukt.");
                  dismissLead(true);
                })
                .catch((err: unknown) => {
                  setLeadError(err instanceof Error ? err.message : "Versturen mislukt.");
                })
                .finally(() => setLeadBusy(false));
            }}
          >
            <p className="font-semibold">{leadCopy.leadTitle}</p>
            <p className="mt-1 text-sm text-ink/60">{leadCopy.leadText}</p>
            <input name="name" placeholder="Naam" className="mt-4 w-full rounded-md border px-3 py-2 text-sm" />
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail"
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
            />
            {leadError ? <p className="mt-2 text-sm text-red-700">{leadError}</p> : null}
            <button type="submit" disabled={leadBusy} className="mt-4 w-full rounded-md bg-green py-2 text-sm text-white disabled:opacity-60">
              {leadBusy ? "Versturen…" : leadCopy.leadButton}
            </button>
            <button type="button" onClick={() => dismissLead()} className="mt-2 w-full text-sm text-ink/50">
              {leadCopy.leadSkip}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function leadDoneKey(magazineId: string) {
  return `folio-lead-v5-${magazineId}`;
}

function pageLabel(page: number, total: number, single: boolean) {
  if (single || page === 0 || page >= total - 1) return `${page + 1} / ${total}`;
  return `${page + 1}–${Math.min(page + 2, total)} / ${total}`;
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
