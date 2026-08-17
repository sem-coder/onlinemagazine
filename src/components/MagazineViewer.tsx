"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PageFlip } from "page-flip";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flipbook } from "@/components/Flipbook";
import { renderPdf, revokePages } from "@/lib/pdf";
import type { Magazine } from "@/lib/types";

type Props = {
  magazine: Magazine;
};

export function MagazineViewer({ magazine }: Props) {
  const bookRef = useRef<PageFlip | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: magazine.pageCount });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [thumbs, setThumbs] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let urls: string[] = [];

    async function load() {
      try {
        const response = await fetch(`/api/magazines/${magazine.id}/pdf`);
        if (!response.ok) throw new Error("PDF kon niet worden geladen.");
        const buffer = await response.arrayBuffer();
        const rendered = await renderPdf(buffer, (value) => {
          if (!cancelled) setProgress(value);
        });
        if (cancelled) {
          revokePages(rendered.pages);
          return;
        }
        urls = rendered.pages;
        setPages(rendered.pages);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Laden mislukt.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      revokePages(urls);
    };
  }, [magazine.id]);

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
      if (event.key.toLowerCase() === "f") {
        void document.documentElement.requestFullscreen?.();
      }
      if (event.key === "Escape") setThumbs(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Kopieer deze link:", url);
    }
  }, []);

  const loading = pages.length === 0 && !error;

  return (
    <div className="relative flex min-h-dvh flex-col bg-viewer text-paper">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm text-paper/70 transition hover:text-paper">
          ← Folio
        </Link>
        <div className="text-center">
          <p className="font-display text-lg tracking-tight">{magazine.title}</p>
          <p className="text-xs text-paper/50">{magazine.pageCount} pagina’s</p>
        </div>
        <button
          type="button"
          onClick={() => void share()}
          className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-paper/80 hover:bg-white/10"
        >
          {copied ? "Gekopieerd" : "Deel"}
        </button>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-3 pb-28 pt-2">
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : loading ? (
          <div className="text-center">
            <p className="font-display text-2xl">Magazine wordt klaargezet…</p>
            <p className="mt-2 text-sm text-paper/55">
              Pagina {progress.current} van {progress.total}
            </p>
            <div className="mx-auto mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${progress.total ? (progress.current / progress.total) * 100 : 6}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="book-stage">
            <Flipbook
              pages={pages}
              pageWidth={magazine.pageWidth}
              pageHeight={magazine.pageHeight}
              onFlip={setPage}
              onReady={(book) => {
                bookRef.current = book;
                setReady(true);
              }}
            />
          </div>
        )}
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-5">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 py-2 text-sm shadow-2xl backdrop-blur-md">
          <ToolButton
            label="Vorige"
            disabled={!ready || page <= 0}
            onClick={() => bookRef.current?.flipPrev()}
          >
            ‹
          </ToolButton>
          <button
            type="button"
            onClick={() => setThumbs((open) => !open)}
            className="min-w-24 rounded-full px-3 py-2 text-paper/85 hover:bg-white/10"
          >
            {page + 1} / {magazine.pageCount}
          </button>
          <ToolButton
            label="Volgende"
            disabled={!ready || page >= magazine.pageCount - 1}
            onClick={() => bookRef.current?.flipNext()}
          >
            ›
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-white/15" />
          <ToolButton
            label="Volledig scherm"
            onClick={() => void document.documentElement.requestFullscreen?.()}
          >
            ⛶
          </ToolButton>
          <a
            href={`/api/magazines/${magazine.id}/pdf`}
            download={magazine.originalName}
            className="rounded-full px-3 py-2 text-paper/85 hover:bg-white/10"
          >
            PDF
          </a>
        </div>
      </div>

      {thumbs ? (
        <div className="absolute inset-x-0 bottom-24 z-20 mx-auto max-w-5xl px-4">
          <div className="max-h-48 overflow-x-auto rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-md">
            <div className="flex gap-2">
              {pages.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    bookRef.current?.flip(index);
                    setThumbs(false);
                  }}
                  className={`h-32 w-24 shrink-0 overflow-hidden rounded-md border ${
                    index === page ? "border-accent" : "border-white/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Pagina ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
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
      className="rounded-full px-3 py-2 text-lg text-paper/85 hover:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
