"use client";

import { PageFlip } from "page-flip";
import { useEffect, useRef, useState } from "react";

type Props = {
  pages: string[];
  pageWidth: number;
  pageHeight: number;
  onFlip?: (page: number) => void;
  onReady?: (book: PageFlip) => void;
};

type Layout = {
  width: number;
  height: number;
  portrait: boolean;
};

function fitLayout(stageW: number, stageH: number, pageW: number, pageH: number): Layout {
  const pad = 20;
  const availW = Math.max(stageW - pad, 120);
  const availH = Math.max(stageH - pad, 160);
  const ratioW = Math.max(pageW, 1);
  const ratioH = Math.max(pageH, 1);

  const scaleSpread = Math.min(availW / (ratioW * 2), availH / ratioH);
  const scaleSingle = Math.min(availW / ratioW, availH / ratioH);
  const spreadPageW = ratioW * scaleSpread;
  const portrait = availW < 680 || spreadPageW < 180;

  const scale = portrait ? scaleSingle : scaleSpread;
  return {
    width: Math.max(1, Math.round(ratioW * scale)),
    height: Math.max(1, Math.round(ratioH * scale)),
    portrait,
  };
}

export function Flipbook({ pages, pageWidth, pageHeight, onFlip, onReady }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostWrapRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const pageIndexRef = useRef(0);
  const onFlipRef = useRef(onFlip);
  const onReadyRef = useRef(onReady);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    onFlipRef.current = onFlip;
    onReadyRef.current = onReady;
  }, [onFlip, onReady]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const next = fitLayout(rect.width, rect.height, pageWidth, pageHeight);
      setLayout((prev) => {
        if (
          prev &&
          prev.width === next.width &&
          prev.height === next.height &&
          prev.portrait === next.portrait
        ) {
          return prev;
        }
        return next;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [pageWidth, pageHeight]);

  useEffect(() => {
    const wrap = hostWrapRef.current;
    if (!wrap || !layout || pages.length === 0) return;

    wrap.replaceChildren();
    const host = document.createElement("div");
    host.className = "flipbook-host";
    wrap.appendChild(host);

    const elements = pages.map((src, index) => {
      const page = document.createElement("div");
      page.className = "magazine-page";
      page.dataset.density = index === 0 || index === pages.length - 1 ? "hard" : "soft";
      const image = document.createElement("img");
      image.src = src;
      image.alt = `Pagina ${index + 1}`;
      image.draggable = false;
      page.appendChild(image);
      return page;
    });

    const book = new PageFlip(host, {
      width: layout.width,
      height: layout.height,
      size: "fixed",
      drawShadow: true,
      flippingTime: 750,
      usePortrait: layout.portrait,
      autoSize: false,
      maxShadowOpacity: 0.45,
      showCover: true,
      mobileScrollSupport: true,
      showPageCorners: true,
      disableFlipByClick: false,
      startZIndex: 2,
    });

    book.loadFromHTML(elements);
    const startPage = Math.min(pageIndexRef.current, pages.length - 1);
    if (startPage > 0) book.turnToPage(startPage);

    book.on("flip", (event) => {
      const index = Number(event.data);
      pageIndexRef.current = index;
      onFlipRef.current?.(index);
    });
    book.on("init", () => {
      bookRef.current = book;
      onReadyRef.current?.(book);
    });

    bookRef.current = book;

    return () => {
      book.destroy();
      if (bookRef.current === book) bookRef.current = null;
    };
  }, [pages, layout]);

  const bookW = layout ? (layout.portrait ? layout.width : layout.width * 2) : undefined;
  const bookH = layout?.height;

  return (
    <div ref={stageRef} className="flex h-full w-full items-center justify-center">
      <div
        ref={hostWrapRef}
        className="flipbook-root"
        style={bookW && bookH ? { width: bookW, height: bookH } : { width: "100%", height: "100%" }}
      />
    </div>
  );
}
