import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { MAX_FLIP_PAGES, MAX_PAGES } from "@/lib/types";

export type PdfProgress = {
  current: number;
  total: number;
};

export type PageLink = {
  left: number;
  top: number;
  width: number;
  height: number;
  href?: string;
  page?: number;
};

export type RenderedPdf = {
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  pages: string[];
  links: PageLink[][];
  cover: Blob;
};

export type FittedPage = {
  pageWidth: number;
  pageHeight: number;
  single: boolean;
};

function ensurePdfPolyfills() {
  const mapProto = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: (key: unknown, compute: (key: unknown) => unknown) => unknown;
  };
  if (typeof mapProto.getOrInsertComputed !== "function") {
    Object.defineProperty(Map.prototype, "getOrInsertComputed", {
      value(key: unknown, compute: (key: unknown) => unknown) {
        if (this.has(key)) return this.get(key);
        const value = compute(key);
        this.set(key, value);
        return value;
      },
      writable: true,
      configurable: true,
    });
  }
}

async function loadPdfjs() {
  if (typeof window === "undefined") {
    throw new Error("PDF-conversie kan alleen in de browser.");
  }
  ensurePdfPolyfills();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

type PageSize = {
  width: number;
  height: number;
};

function leafSize(sizes: PageSize[]): PageSize {
  const portrait = sizes.find((size) => size.width < size.height);
  return portrait ?? sizes[0] ?? { width: 595, height: 842 };
}

function isSpreadPage(size: PageSize, leaf: PageSize) {
  if (size.width <= size.height) return false;
  const widthRatio = size.width / leaf.width;
  const heightRatio = size.height / leaf.height;
  return widthRatio > 1.6 && widthRatio < 2.4 && heightRatio > 0.85 && heightRatio < 1.15;
}

function shouldSplitSpreads(sizes: PageSize[]) {
  const leaf = leafSize(sizes);
  if (leaf.width >= leaf.height) return false;
  return sizes.some((size) => isSpreadPage(size, leaf));
}

async function readPageSizes(pdf: PDFDocumentProxy): Promise<PageSize[]> {
  const sizes: PageSize[] = [];
  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    sizes.push({ width: viewport.width, height: viewport.height });
  }
  return sizes;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Kon pagina niet omzetten"));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function openPdf(file: File | ArrayBuffer) {
  const pdfjs = await loadPdfjs();
  const raw = file instanceof File ? await file.arrayBuffer() : file;
  // pdf.js transfers the buffer to its worker, which detaches it.
  const data = raw.slice(0);
  return pdfjs.getDocument({
    data,
    wasmUrl: "/pdfjs/wasm/",
    iccUrl: "/pdfjs/iccs/",
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
  }).promise;
}

async function renderPageToCanvas(page: PDFPageProxy, cssWidth: number, cssHeight: number) {
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const scale = Math.min((cssWidth * dpr) / base.width, (cssHeight * dpr) / base.height);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const canvasContext = canvas.getContext("2d", { alpha: false });
  if (!canvasContext) throw new Error("Canvas niet beschikbaar");
  canvasContext.fillStyle = "#ffffff";
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext, viewport }).promise;
  return { canvas, width: base.width, height: base.height };
}

async function canvasSliceBlob(source: HTMLCanvasElement, sx: number, sw: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(sw));
  canvas.height = source.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas niet beschikbaar");
  context.drawImage(source, sx, 0, canvas.width, source.height, 0, 0, canvas.width, source.height);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

async function renderPageAtSize(page: PDFPageProxy, cssWidth: number, cssHeight: number) {
  const rendered = await renderPageToCanvas(page, cssWidth, cssHeight);
  const blob = await canvasToBlob(rendered.canvas, "image/jpeg", 0.92);
  rendered.canvas.width = 0;
  rendered.canvas.height = 0;
  return { blob, width: rendered.width, height: rendered.height };
}

async function renderSpreadHalves(page: PDFPageProxy, cssWidth: number, cssHeight: number) {
  const rendered = await renderPageToCanvas(page, cssWidth * 2, cssHeight);
  const half = Math.floor(rendered.canvas.width / 2);
  const left = await canvasSliceBlob(rendered.canvas, 0, half);
  const right = await canvasSliceBlob(rendered.canvas, half, rendered.canvas.width - half);
  rendered.canvas.width = 0;
  rendered.canvas.height = 0;
  return [left, right] as const;
}

export function fitPdfInStage(
  pageW: number,
  pageH: number,
  stageW: number,
  stageH: number,
  twoPage = false,
): FittedPage {
  const width = Math.max(pageW, 1);
  const height = Math.max(pageH, 1);
  const scale = Math.min(stageW / (width * (twoPage ? 2 : 1)), stageH / height);
  return {
    pageWidth: Math.max(1, Math.round(width * scale)),
    pageHeight: Math.max(1, Math.round(height * scale)),
    single: !twoPage,
  };
}

function planPdfPages(sizes: PageSize[]) {
  const split = shouldSplitSpreads(sizes);
  const leaf = split ? leafSize(sizes) : sizes[0];
  const pageCount = split
    ? sizes.reduce((sum, size) => sum + (isSpreadPage(size, leaf) ? 2 : 1), 0)
    : sizes.length;
  return { split, leaf, pageCount, portraitBook: leaf.width < leaf.height };
}

export async function inspectPdf(file: File) {
  const pdf = await openPdf(file);
  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`Dit PDF heeft ${pdf.numPages} pagina's. Maximaal ${MAX_PAGES} voor nu.`);
  }
  const sizes = await readPageSizes(pdf);
  const plan = planPdfPages(sizes);
  if (plan.pageCount > MAX_FLIP_PAGES) {
    throw new Error(`Dit PDF wordt ${plan.pageCount} bladzijden. Maximaal ${MAX_FLIP_PAGES} voor nu.`);
  }
  const first = await pdf.getPage(1);
  const coverScale = Math.min(480 / plan.leaf.width, 1);
  const cover = await renderPageAtSize(first, plan.leaf.width * coverScale, plan.leaf.height * coverScale);
  return {
    pageCount: plan.pageCount,
    pageWidth: plan.leaf.width,
    pageHeight: plan.leaf.height,
    cover: cover.blob,
  };
}

const PRELOAD_FLIP_PAGES = 3;

function estimatedFlipCount(pdfPages: number, split: boolean) {
  if (!split) return pdfPages;
  return Math.max(1, pdfPages * 2 - 2);
}

type PendingLink = PageLink & { destPdfPage?: number };

type AnnotLike = {
  subtype?: string;
  annotationType?: number;
  url?: string;
  unsafeUrl?: string;
  dest?: unknown;
  rect?: number[];
};

function normalizeHref(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^(javascript|vbscript|data|file):/i.test(trimmed)) return undefined;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return undefined;
}

function rectToViewportBox(
  viewport: { width: number; height: number; convertToViewportRectangle?: (rect: number[]) => number[] },
  rect: number[],
) {
  const converted =
    typeof viewport.convertToViewportRectangle === "function"
      ? viewport.convertToViewportRectangle(rect)
      : [rect[0], viewport.height - rect[3], rect[2], viewport.height - rect[1]];
  return {
    x1: Math.min(converted[0], converted[2]),
    y1: Math.min(converted[1], converted[3]),
    x2: Math.max(converted[0], converted[2]),
    y2: Math.max(converted[1], converted[3]),
  };
}

function boxToLink(
  box: { x1: number; y1: number; x2: number; y2: number },
  pageW: number,
  pageH: number,
  offsetX: number,
  sliceW: number,
  href?: string,
  destPdfPage?: number,
): PendingLink | null {
  const padX = Math.max(4, sliceW * 0.012);
  const padY = Math.max(4, pageH * 0.012);
  const left = Math.max(box.x1 - padX, offsetX);
  const right = Math.min(box.x2 + padX, offsetX + sliceW);
  const top = Math.max(box.y1 - padY, 0);
  const bottom = Math.min(box.y2 + padY, pageH);
  if (right - left < 2 || bottom - top < 2) return null;
  return {
    left: (left - offsetX) / sliceW,
    top: top / pageH,
    width: (right - left) / sliceW,
    height: (bottom - top) / pageH,
    href,
    destPdfPage,
  };
}

async function destToPdfPage(
  pdf: PDFDocumentProxy,
  dest: unknown,
  cache: Map<string, number | null>,
) {
  let explicit = dest;
  if (typeof dest === "string") {
    if (cache.has(dest)) return cache.get(dest) ?? null;
    try {
      explicit = await pdf.getDestination(dest);
    } catch {
      cache.set(dest, null);
      return null;
    }
  }
  if (!Array.isArray(explicit) || explicit[0] == null) {
    if (typeof dest === "string") cache.set(dest, null);
    return null;
  }
  try {
    const index = await pdf.getPageIndex(explicit[0]);
    if (typeof dest === "string") cache.set(dest, index);
    return index;
  } catch {
    if (typeof dest === "string") cache.set(dest, null);
    return null;
  }
}

async function extractPageLinks(
  pdf: PDFDocumentProxy,
  page: PDFPageProxy,
  cache: Map<string, number | null>,
) {
  const viewport = page.getViewport({ scale: 1 });
  const annotations = (await page.getAnnotations()) as AnnotLike[];
  const links: PendingLink[] = [];
  for (const annot of annotations) {
    const subtype = String(annot.subtype || "");
    if (subtype !== "Link" && annot.annotationType !== 2) continue;
    if (!Array.isArray(annot.rect) || annot.rect.length < 4) continue;
    const href = normalizeHref(String(annot.url || annot.unsafeUrl || ""));
    let destPdfPage: number | undefined;
    if (!href && annot.dest != null) {
      const index = await destToPdfPage(pdf, annot.dest, cache);
      if (index != null) destPdfPage = index;
    }
    if (!href && destPdfPage == null) continue;
    const box = rectToViewportBox(viewport, annot.rect);
    const mapped = boxToLink(box, viewport.width, viewport.height, 0, viewport.width, href, destPdfPage);
    if (mapped) links.push(mapped);
  }
  return { links, viewport };
}

function splitLinksForSpread(links: PendingLink[], pageW: number, pageH: number) {
  const mid = pageW / 2;
  const left: PendingLink[] = [];
  const right: PendingLink[] = [];
  for (const link of links) {
    const box = {
      x1: link.left * pageW,
      y1: link.top * pageH,
      x2: (link.left + link.width) * pageW,
      y2: (link.top + link.height) * pageH,
    };
    const leftLink = boxToLink(box, pageW, pageH, 0, mid, link.href, link.destPdfPage);
    const rightLink = boxToLink(box, pageW, pageH, mid, pageW - mid, link.href, link.destPdfPage);
    if (leftLink) left.push(leftLink);
    if (rightLink) right.push(rightLink);
  }
  return [left, right] as const;
}

function resolveDests(linkPages: PendingLink[][], pdfToFlip: number[]) {
  for (const page of linkPages) {
    for (const link of page) {
      if (link.page == null && link.destPdfPage != null && pdfToFlip[link.destPdfPage] != null) {
        link.page = pdfToFlip[link.destPdfPage];
      }
    }
  }
}

function publicLinks(linkPages: PendingLink[][]): PageLink[][] {
  return linkPages.map((page) =>
    page
      .filter((link) => Boolean(link.href) || link.page != null)
      .map(({ destPdfPage: _dest, ...link }) => link),
  );
}

async function renderPdfPage(
  page: PDFPageProxy,
  size: PageSize,
  plan: ReturnType<typeof planPdfPages>,
  fitted: FittedPage,
) {
  if (plan.split && isSpreadPage(size, plan.leaf)) {
    return [...(await renderSpreadHalves(page, fitted.pageWidth, fitted.pageHeight))];
  }
  const rendered = await renderPageAtSize(page, fitted.pageWidth, fitted.pageHeight);
  return [rendered.blob];
}

export async function renderPdf(
  file: File | ArrayBuffer,
  fit: (pageW: number, pageH: number, portraitBook: boolean) => FittedPage,
  onProgress?: (progress: PdfProgress) => void,
  onBatch?: (payload: { pages: string[]; links: PageLink[][]; fitted: FittedPage; done: boolean }) => void,
): Promise<RenderedPdf & { fitted: FittedPage }> {
  const pdf = await openPdf(file);

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`Dit PDF heeft ${pdf.numPages} pagina's. Maximaal ${MAX_PAGES} voor nu.`);
  }

  const peekCount = Math.min(pdf.numPages, 4);
  const peekSizes: PageSize[] = [];
  for (let index = 1; index <= peekCount; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    peekSizes.push({ width: viewport.width, height: viewport.height });
  }
  const plan = planPdfPages(peekSizes);
  const estimated = estimatedFlipCount(pdf.numPages, plan.split);
  const fitted = fit(plan.leaf.width, plan.leaf.height, plan.portraitBook);

  const pages: string[] = [];
  const pendingLinks: PendingLink[][] = [];
  const pdfToFlip: number[] = [];
  const destCache = new Map<string, number | null>();
  let cover: Blob | null = null;
  let done = 0;
  let firstBatch = false;

  const emitBatch = (complete: boolean) => {
    resolveDests(pendingLinks, pdfToFlip);
    onBatch?.({ pages: [...pages], links: publicLinks(pendingLinks), fitted, done: complete });
  };

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    const size = { width: viewport.width, height: viewport.height };
    pdfToFlip[index - 1] = pages.length;
    let extracted: { links: PendingLink[]; viewport: { width: number; height: number } } = {
      links: [],
      viewport,
    };
    try {
      extracted = await extractPageLinks(pdf, page, destCache);
    } catch {
      extracted = { links: [], viewport };
    }
    const blobs = await renderPdfPage(page, size, plan, fitted);
    const spread = plan.split && isSpreadPage(size, plan.leaf);
    const mapped = spread
      ? splitLinksForSpread(extracted.links, extracted.viewport.width, extracted.viewport.height)
      : [extracted.links];
    for (let i = 0; i < blobs.length; i += 1) {
      const blob = blobs[i];
      if (!cover) cover = blob;
      pages.push(URL.createObjectURL(blob));
      pendingLinks.push(mapped[i] ?? []);
      done += 1;
      onProgress?.({ current: done, total: Math.max(estimated, done) });
    }

    if (!firstBatch && (pages.length >= PRELOAD_FLIP_PAGES || index === pdf.numPages)) {
      firstBatch = true;
      emitBatch(index === pdf.numPages);
    } else if (firstBatch && (index === pdf.numPages || pages.length % 4 === 0)) {
      emitBatch(index === pdf.numPages);
    }

    if (firstBatch && index < pdf.numPages) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  if (!cover) throw new Error("PDF heeft geen pagina's");

  onProgress?.({ current: pages.length, total: pages.length });
  resolveDests(pendingLinks, pdfToFlip);
  const links = publicLinks(pendingLinks);
  onBatch?.({ pages: [...pages], links, fitted, done: true });

  return {
    pageCount: pages.length,
    pageWidth: plan.leaf.width,
    pageHeight: plan.leaf.height,
    pages,
    links,
    cover,
    fitted,
  };
}

export async function renderPromoPages(
  file: File | ArrayBuffer,
  maxPages = 10,
  cssWidth = 540,
  cssHeight = 760,
  onProgress?: (progress: PdfProgress) => void,
) {
  const pdf = await openPdf(file);
  const peekCount = Math.min(pdf.numPages, 4);
  const peekSizes: PageSize[] = [];
  for (let index = 1; index <= peekCount; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    peekSizes.push({ width: viewport.width, height: viewport.height });
  }
  const plan = planPdfPages(peekSizes);
  const fitted: FittedPage = {
    pageWidth: cssWidth,
    pageHeight: cssHeight,
    single: false,
  };
  const limit = Math.max(1, Math.min(maxPages, MAX_FLIP_PAGES));
  const pages: ImageBitmap[] = [];

  for (let index = 1; index <= pdf.numPages && pages.length < limit; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    const size = { width: viewport.width, height: viewport.height };
    const blobs = await renderPdfPage(page, size, plan, fitted);
    for (const blob of blobs) {
      pages.push(await createImageBitmap(blob));
      onProgress?.({ current: pages.length, total: limit });
      if (pages.length >= limit) break;
    }
  }

  if (pages.length === 0) throw new Error("PDF heeft geen pagina's");
  return {
    pages,
    pageWidth: plan.leaf.width,
    pageHeight: plan.leaf.height,
  };
}

export function revokePages(pages: string[]) {
  for (const url of pages) URL.revokeObjectURL(url);
}
