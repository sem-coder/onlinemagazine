"use client";

import { PageFlip } from "page-flip";
import { useEffect, useRef } from "react";

type Props = {
  pages: string[];
  pageWidth: number;
  pageHeight: number;
  single?: boolean;
  onFlip?: (page: number) => void;
  onReady?: (book: PageFlip) => void;
};

function pageElements(pages: string[]) {
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
    return page;
  });
}

export function Flipbook({ pages, pageWidth, pageHeight, single = false, onFlip, onReady }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const onFlipRef = useRef(onFlip);
  const onReadyRef = useRef(onReady);
  const loadedCount = useRef(0);

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
      disableFlipByClick: false,
      startZIndex: 2,
    });

    const initial = pageElements(pages);
    loadedCount.current = pages.length;
    book.loadFromHTML(initial);
    book.on("flip", (event) => {
      onFlipRef.current?.(Number(event.data));
    });
    book.on("init", () => {
      onReadyRef.current?.(book);
    });
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
    if (!book || pages.length === 0 || pages.length === loadedCount.current) return;
    loadedCount.current = pages.length;
    book.updateFromHtml(pageElements(pages));
  }, [pages]);

  const bookW = single ? pageWidth : pageWidth * 2;

  return (
    <div
      ref={rootRef}
      className="flipbook-root"
      style={{ width: bookW, height: pageHeight }}
    />
  );
}
