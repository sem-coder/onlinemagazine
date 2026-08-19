import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { MAX_FLIP_PAGES, MAX_PAGES } from "@/lib/types";

export type PdfProgress = {
  current: number;
  total: number;
};

export type RenderedPdf = {
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  pages: string[];
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
  onBatch?: (payload: { pages: string[]; fitted: FittedPage; done: boolean }) => void,
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
  let cover: Blob | null = null;
  let done = 0;
  let firstBatch = false;

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1 });
    const size = { width: viewport.width, height: viewport.height };
    const blobs = await renderPdfPage(page, size, plan, fitted);
    for (const blob of blobs) {
      if (!cover) cover = blob;
      pages.push(URL.createObjectURL(blob));
      done += 1;
      onProgress?.({ current: done, total: Math.max(estimated, done) });
    }

    if (!firstBatch && (pages.length >= PRELOAD_FLIP_PAGES || index === pdf.numPages)) {
      firstBatch = true;
      onBatch?.({ pages: [...pages], fitted, done: index === pdf.numPages });
    } else if (firstBatch && (index === pdf.numPages || pages.length % 4 === 0)) {
      onBatch?.({ pages: [...pages], fitted, done: index === pdf.numPages });
    }

    if (firstBatch && index < pdf.numPages) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  if (!cover) throw new Error("PDF heeft geen pagina's");

  onProgress?.({ current: pages.length, total: pages.length });
  onBatch?.({ pages: [...pages], fitted, done: true });

  return {
    pageCount: pages.length,
    pageWidth: plan.leaf.width,
    pageHeight: plan.leaf.height,
    pages,
    cover,
    fitted,
  };
}

export function revokePages(pages: string[]) {
  for (const url of pages) URL.revokeObjectURL(url);
}
