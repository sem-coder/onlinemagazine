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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Kon pagina niet omzetten"));
        else resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function renderPage(page: PDFPageProxy, maxEdge: number, quality: number) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(maxEdge / Math.max(base.width, base.height), 2.2);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const canvasContext = canvas.getContext("2d", { alpha: false });
  if (!canvasContext) throw new Error("Canvas niet beschikbaar");
  canvasContext.fillStyle = "#ffffff";
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext, viewport }).promise;
  const blob = await canvasToBlob(canvas, quality);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, width: base.width, height: base.height };
}

export async function openPdf(file: File | ArrayBuffer) {
  const pdfjs = await loadPdfjs();
  const data = file instanceof File ? await file.arrayBuffer() : file;
  return pdfjs.getDocument({ data }).promise;
}

export async function renderPdfPageJpeg(
  pdf: Awaited<ReturnType<typeof openPdf>>,
  index: number,
  maxEdge: number,
  quality: number,
) {
  const page = await pdf.getPage(index);
  return renderPage(page, maxEdge, quality);
}

export async function inspectPdf(file: File) {
  const pdf = await openPdf(file);
  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`Dit PDF heeft ${pdf.numPages} pagina's. Maximaal ${MAX_PAGES} voor nu.`);
  }
  const first = await pdf.getPage(1);
  const cover = await renderPage(first, 720, 0.78);
  const base = first.getViewport({ scale: 1 });
  return {
    pageCount: pdf.numPages,
    pageWidth: base.width,
    pageHeight: base.height,
    cover: cover.blob,
  };
}

export async function renderPdf(
  file: File | ArrayBuffer,
  onProgress?: (progress: PdfProgress) => void,
): Promise<RenderedPdf> {
  const pdf = await openPdf(file);

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`Dit PDF heeft ${pdf.numPages} pagina's. Maximaal ${MAX_PAGES} voor nu.`);
  }

  const pages: string[] = [];
  let pageWidth = 595;
  let pageHeight = 842;
  let cover: Blob | null = null;

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const rendered = await renderPage(page, index === 1 ? 1600 : 1400, 0.84);
    if (index === 1) {
      pageWidth = rendered.width;
      pageHeight = rendered.height;
      cover = rendered.blob;
    }
    pages.push(URL.createObjectURL(rendered.blob));
    onProgress?.({ current: index, total: pdf.numPages });
  }

  if (!cover) throw new Error("PDF heeft geen pagina's");

  return {
    pageCount: pdf.numPages,
    pageWidth,
    pageHeight,
    pages,
    cover,
  };
}

export function revokePages(pages: string[]) {
  for (const url of pages) URL.revokeObjectURL(url);
}
