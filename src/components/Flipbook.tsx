"use client";

import { PageFlip } from "page-flip";
import { useEffect, useRef } from "react";
import type { PageLink } from "@/lib/pdf";

type Props = {
  pages: string[];
  links?: PageLink[][];
  pageWidth: number;
  pageHeight: number;
  single?: boolean;
  onFlip?: (page: number) => void;
  onReady?: (book: PageFlip) => void;
};

function goToFlipPage(book: PageFlip, index: number) {
  if (index < 0 || index >= book.getPageCount()) return;
  if (book.getCurrentPageIndex() === index) return;
  book.flip(index);
}

function attachLinks(page: HTMLElement, links: PageLink[], goToPage: (index: number) => void) {
  for (const link of links) {
    const hotspot = document.createElement("a");
    hotspot.className = "magazine-link";
    hotspot.style.left = `${link.left * 100}%`;
    hotspot.style.top = `${link.top * 100}%`;
    hotspot.style.width = `${link.width * 100}%`;
    hotspot.style.height = `${link.height * 100}%`;
    if (link.page != null) {
      hotspot.href = `#pagina-${link.page + 1}`;
      hotspot.title = `Ga naar pagina ${link.page + 1}`;
      hotspot.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        goToPage(link.page!);
      });
    } else if (link.href) {
      hotspot.href = link.href;
      hotspot.target = "_blank";
      hotspot.rel = "noopener noreferrer";
      hotspot.title = link.href;
    } else {
      continue;
    }
    const stop = (event: Event) => event.stopPropagation();
    hotspot.addEventListener("pointerdown", stop);
    hotspot.addEventListener("mousedown", stop);
    hotspot.addEventListener("touchstart", stop, { passive: true });
    page.appendChild(hotspot);
  }
}

function pageElements(pages: string[], links: PageLink[][], goToPage: (index: number) => void) {
  return pages.map((src, index) => {
    const page = document.createElement("div");
    page.className = "magazine-page";
    page.dataset.density = index === 0 || index === pages.length - 1 ? "hard" : "soft";
    const image = document.createElement("img");
    image.src = src;
    image.alt = `Pagina ${index + 1}`;
    image.draggable = false;
    image.decoding = "async";
    page.appendChild(image);
    attachLinks(page, links[index] ?? [], goToPage);
    return page;
  });
}

export function Flipbook({
  pages,
  links = [],
  pageWidth,
  pageHeight,
  single = false,
  onFlip,
  onReady,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const onFlipRef = useRef(onFlip);
  const onReadyRef = useRef(onReady);
  const loadedCount = useRef(0);
  const lastLinks = useRef<PageLink[][]>(links);

  useEffect(() => {
    onFlipRef.current = onFlip;
    onReadyRef.current = onReady;
  }, [onFlip, onReady]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || pages.length === 0 || pageWidth < 2 || pageHeight < 2) return;

    const host = document.createElement("div");
    host.className = "flipbook-host";
    root.replaceChildren(host);

    const book = new PageFlip(host, {
      width: pageWidth,
      height: pageHeight,
      size: "fixed",
      drawShadow: true,
      flippingTime: 750,
      usePortrait: single,
      autoSize: false,
      maxShadowOpacity: 0.4,
      showCover: !single,
      mobileScrollSupport: true,
      showPageCorners: true,
      clickEventForward: true,
      disableFlipByClick: false,
      startZIndex: 2,
    });

    const goToPage = (index: number) => goToFlipPage(book, index);

    book.on("flip", (event) => {
      onFlipRef.current?.(Number(event.data));
    });
    book.on("init", () => {
      bookRef.current = book;
      onReadyRef.current?.(book);
    });
    const initial = pageElements(pages, links, goToPage);
    loadedCount.current = pages.length;
    lastLinks.current = links;
    book.loadFromHTML(initial);
    bookRef.current = book;

    return () => {
      bookRef.current = null;
      loadedCount.current = 0;
      book.destroy();
    };
    // Recreate only when the book geometry changes, not when extra pages stream in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidth, pageHeight, single, pages[0]]);

  useEffect(() => {
    const book = bookRef.current;
    if (!book || pages.length === 0) return;
    if (pages.length === loadedCount.current && links === lastLinks.current) return;
    loadedCount.current = pages.length;
    lastLinks.current = links;
    book.updateFromHtml(pageElements(pages, links, (index) => goToFlipPage(book, index)));
  }, [pages, links]);

  const bookW = single ? pageWidth : pageWidth * 2;

  return (
    <div
      ref={rootRef}
      className="flipbook-root"
      style={{ width: bookW, height: pageHeight }}
    />
  );
}
