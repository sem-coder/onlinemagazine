import { PDFDocument } from "pdf-lib";
import { openPdf, renderPdfPageJpeg } from "@/lib/pdf";
import { MAX_PDF_BYTES } from "@/lib/types";

export const UPLOAD_TARGET_BYTES = Math.floor(3.2 * 1024 * 1024);

const PASSES = [
  { maxEdge: 1280, quality: 0.68 },
  { maxEdge: 1024, quality: 0.55 },
  { maxEdge: 840, quality: 0.44 },
  { maxEdge: 720, quality: 0.36 },
] as const;

export type ShrinkProgress = {
  current: number;
  total: number;
  pass: number;
  passes: number;
};

export async function shrinkPdfForUpload(
  file: File,
  onProgress?: (progress: ShrinkProgress) => void,
): Promise<File> {
  if (file.size <= UPLOAD_TARGET_BYTES) return file;

  const pdf = await openPdf(file);
  const startPass = file.size > 20 * 1024 * 1024 ? 2 : file.size > 10 * 1024 * 1024 ? 1 : 0;
  let best: Uint8Array | null = null;

  for (let pass = startPass; pass < PASSES.length; pass += 1) {
    const { maxEdge, quality } = PASSES[pass];
    const out = await PDFDocument.create();

    for (let index = 1; index <= pdf.numPages; index += 1) {
      const rendered = await renderPdfPageJpeg(pdf, index, maxEdge, quality);
      const image = await out.embedJpg(new Uint8Array(await rendered.blob.arrayBuffer()));
      const page = out.addPage([rendered.width, rendered.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: rendered.width,
        height: rendered.height,
      });
      onProgress?.({
        current: index,
        total: pdf.numPages,
        pass: pass - startPass + 1,
        passes: PASSES.length - startPass,
      });
    }

    best = await out.save({ useObjectStreams: true });
    if (best.byteLength <= UPLOAD_TARGET_BYTES) break;
  }

  if (!best) return file;
  if (best.byteLength >= file.size) return file;
  if (best.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF blijft te groot, ook na verkleinen. Probeer minder pagina's.");
  }

  return new File([new Uint8Array(best)], file.name, { type: "application/pdf" });
}
