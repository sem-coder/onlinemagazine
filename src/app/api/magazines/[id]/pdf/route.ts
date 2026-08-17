import { NextResponse } from "next/server";
import { getMagazine, readPdf } from "@/lib/magazines";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine) {
    return NextResponse.json({ error: "Magazine niet gevonden." }, { status: 404 });
  }
  if (magazine.pdfUrl) {
    return NextResponse.redirect(magazine.pdfUrl, 307);
  }

  const pdf = await readPdf(id);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${magazine.originalName}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
