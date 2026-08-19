import type { PDFPageProxy } from "pdfjs-dist";
import { MAX_PAGES } from "@/lib/types";

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

async function renderPageAtSize(page: PDFPageProxy, cssWidth: number, cssHeight: number) {
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
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, width: base.width, height: base.height };
}

export function fitPdfInStage(
  pageW: number,
  pageH: number,
  stageW: number,
  stageH: number,
): FittedPage {
  const width = Math.max(pageW, 1);
  const height = Math.max(pageH, 1);
  const scale = Math.min(stageW / width, stageH / height);
  return {
    pageWidth: Math.max(1, Math.round(width * scale)),
    pageHeight: Math.max(1, Math.round(height * scale)),
    single: true,
  };
}

export async function inspectPdf(file: File) {
  const pdf = await openPdf(file);
  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`Dit PDF heeft ${pdf.numPages} pagina's. Maximaal ${MAX_PAGES} voor nu.`);
  }
  const first = await pdf.getPage(1);
  const base = first.getViewport({ scale: 1 });
  const coverScale = Math.min(480 / base.width, 1);
  const cover = await renderPageAtSize(first, base.width * coverScale, base.height * coverScale);
  return {
    pageCount: pdf.numPages,
    pageWidth: base.width,
    pageHeight: base.height,
    cover: cover.blob,
  };
}

export async function renderPdf(
  file: File | ArrayBuffer,
  fit: (pageW: number, pageH: number) => FittedPage,
  onProgress?: (progress: PdfProgress) => void,
): Promise<RenderedPdf & { fitted: FittedPage }> {
  const pdf = await openPdf(file);

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`Dit PDF heeft ${pdf.numPages} pagina's. Maximaal ${MAX_PAGES} voor nu.`);
  }

  const first = await pdf.getPage(1);
  const base = first.getViewport({ scale: 1 });
  const fitted = fit(base.width, base.height);

  const pages: string[] = [];
  let cover: Blob | null = null;

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = index === 1 ? first : await pdf.getPage(index);
    const rendered = await renderPageAtSize(page, fitted.pageWidth, fitted.pageHeight);
    if (index === 1) cover = rendered.blob;
    pages.push(URL.createObjectURL(rendered.blob));
    onProgress?.({ current: index, total: pdf.numPages });
  }

  if (!cover) throw new Error("PDF heeft geen pagina's");

  return {
    pageCount: pdf.numPages,
    pageWidth: base.width,
    pageHeight: base.height,
    pages,
    cover,
    fitted,
  };
}

export function revokePages(pages: string[]) {
  for (const url of pages) URL.revokeObjectURL(url);
}
