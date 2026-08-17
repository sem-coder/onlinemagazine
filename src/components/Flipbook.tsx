"use client";

import { PageFlip } from "page-flip";
import { useEffect, useRef } from "react";

type Props = {
  pages: string[];
  pageWidth: number;
  pageHeight: number;
  onFlip?: (page: number) => void;
  onReady?: (book: PageFlip) => void;
};

export function Flipbook({ pages, pageWidth, pageHeight, onFlip, onReady }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onFlipRef = useRef(onFlip);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onFlipRef.current = onFlip;
    onReadyRef.current = onReady;
  }, [onFlip, onReady]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || pages.length === 0) return;

    const host = document.createElement("div");
    host.className = "flipbook-host";
    root.appendChild(host);

    const elements = pages.map((src, index) => {
      const page = document.createElement("div");
      page.className = "magazine-page";
      page.dataset.density =
        index === 0 || index === pages.length - 1 ? "hard" : "soft";
      const image = document.createElement("img");
      image.src = src;
      image.alt = `Pagina ${index + 1}`;
      image.draggable = false;
      page.appendChild(image);
      return page;
    });

    const book = new PageFlip(host, {
      width: Math.max(pageWidth, 1),
      height: Math.max(pageHeight, 1),
      size: "stretch",
      minWidth: 220,
      maxWidth: 720,
      minHeight: 280,
      maxHeight: 980,
      drawShadow: true,
      flippingTime: 750,
      usePortrait: true,
      autoSize: true,
      maxShadowOpacity: 0.45,
      showCover: true,
      mobileScrollSupport: true,
      showPageCorners: true,
      disableFlipByClick: false,
      startZIndex: 2,
    });

    book.loadFromHTML(elements);
    book.on("flip", (event) => {
      onFlipRef.current?.(Number(event.data));
    });
    book.on("init", () => {
      onReadyRef.current?.(book);
    });

    return () => {
      book.destroy();
    };
  }, [pages, pageWidth, pageHeight]);

  return <div ref={rootRef} className="flipbook-root" />;
}
