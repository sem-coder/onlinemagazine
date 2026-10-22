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

type PageSlot = {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
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

function pageElements(pages: string[]) {
  return pages.map((src, index) => {
    const page = document.createElement("div");
    page.className = "magazine-page";
    page.dataset.page = String(index);
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

function createLinkLayer(
  root: HTMLElement,
  book: PageFlip,
  linksRef: { current: PageLink[][] },
) {
  const layer = document.createElement("div");
  layer.className = "magazine-link-layer";
  let slots: PageSlot[] = [];

  const measure = () => {
    const rootRect = root.getBoundingClientRect();
    const next: PageSlot[] = [];
    for (const el of root.querySelectorAll<HTMLElement>(".magazine-page")) {
      if (el.style.display === "none" || !el.classList.contains("--simple")) continue;
      const index = Number(el.dataset.page);
      if (!Number.isFinite(index)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      next.push({
        index,
        left: rect.left - rootRect.left,
        top: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    if (next.length) slots = next;
  };

  const draw = (hide: boolean) => {
    layer.replaceChildren();
    if (hide) return;
    for (const slot of slots) {
      const pageLinks = linksRef.current[slot.index] ?? [];
      if (!pageLinks.length) continue;
      const wrap = document.createElement("div");
      wrap.className = "magazine-link-page";
      wrap.style.left = `${slot.left}px`;
      wrap.style.top = `${slot.top}px`;
      wrap.style.width = `${slot.width}px`;
      wrap.style.height = `${slot.height}px`;
      attachLinks(wrap, pageLinks, (index) => goToFlipPage(book, index));
      layer.appendChild(wrap);
    }
  };

  const sync = (mode: "show" | "hide" | "keep" = "show") => {
    if (mode === "hide") {
      draw(true);
      return;
    }
    if (mode === "show") measure();
    draw(false);
  };

  return { layer, sync };
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
  const linksRef = useRef(links);
  const syncRef = useRef<(mode?: "show" | "hide" | "keep") => void>(() => {});
  const loadedCount = useRef(0);
  const lastLinks = useRef<PageLink[][]>(links);
  linksRef.current = links;

  useEffect(() => {
    onFlipRef.current = onFlip;
    onReadyRef.current = onReady;
  }, [onFlip, onReady]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || pages.length === 0 || pageWidth < 2 || pageHeight < 2) return;

    const host = document.createElement("div");
    host.className = "flipbook-host";

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

    const { layer, sync } = createLinkLayer(root, book, linksRef);
    syncRef.current = sync;
    root.replaceChildren(host, layer);

    book.on("flip", (event) => {
      onFlipRef.current?.(Number(event.data));
      requestAnimationFrame(() => sync("show"));
    });
    book.on("changeState", (event) => {
      const state = String(event.data);
      if (state === "flipping" || state === "user_fold") sync("hide");
      else if (state === "read") requestAnimationFrame(() => sync("show"));
    });
    book.on("changeOrientation", () => {
      requestAnimationFrame(() => sync("show"));
    });
    book.on("init", () => {
      bookRef.current = book;
      onReadyRef.current?.(book);
      requestAnimationFrame(() => sync("show"));
    });
    book.on("update", () => {
      requestAnimationFrame(() => sync("show"));
    });

    const initial = pageElements(pages);
    loadedCount.current = pages.length;
    lastLinks.current = links;
    book.loadFromHTML(initial);
    bookRef.current = book;

    const observer = new ResizeObserver(() => {
      if (book.getState() === "read") sync("show");
    });
    observer.observe(root);

    return () => {
      observer.disconnect();
      bookRef.current = null;
      loadedCount.current = 0;
      syncRef.current = () => {};
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
    book.updateFromHtml(pageElements(pages));
    requestAnimationFrame(() => syncRef.current("show"));
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
