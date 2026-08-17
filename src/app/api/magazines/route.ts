import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { listMagazines, saveMagazine } from "@/lib/magazines";
import { MAX_PDF_BYTES, MAX_PAGES, type Magazine } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const magazines = await listMagazines();
  return NextResponse.json({ magazines });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const pdf = form.get("pdf");
  const cover = form.get("cover");
  const title = String(form.get("title") ?? "").trim();
  const originalName = String(form.get("originalName") ?? "magazine.pdf");
  const pageCount = Number(form.get("pageCount"));
  const pageWidth = Number(form.get("pageWidth"));
  const pageHeight = Number(form.get("pageHeight"));

  if (!(pdf instanceof File)) {
    return NextResponse.json({ error: "Upload een PDF-bestand." }, { status: 400 });
  }
  if (!(cover instanceof File)) {
    return NextResponse.json({ error: "Cover ontbreekt." }, { status: 400 });
  }
  if (pdf.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF is groter dan 40 MB." }, { status: 400 });
  }
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) {
    return NextResponse.json({ error: "Ongeldig aantal pagina's." }, { status: 400 });
  }
  if (!pageWidth || !pageHeight) {
    return NextResponse.json({ error: "Paginaformaat ontbreekt." }, { status: 400 });
  }

  const pdfBuffer = Buffer.from(await pdf.arrayBuffer());
  if (!pdfBuffer.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
    return NextResponse.json({ error: "Dit lijkt geen geldige PDF." }, { status: 400 });
  }

  const id = nanoid(10);
  const magazine: Magazine = {
    id,
    title: title || originalName.replace(/\.pdf$/i, ""),
    originalName,
    pageCount,
    pageWidth,
    pageHeight,
    createdAt: new Date().toISOString(),
  };

  await saveMagazine({
    id,
    magazine,
    pdf: pdfBuffer,
    cover: Buffer.from(await cover.arrayBuffer()),
  });

  return NextResponse.json({ magazine });
}
