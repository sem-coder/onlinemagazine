import { NextResponse } from "next/server";
import { workspaceUser } from "@/lib/auth";
import { getMagazine, readPdf } from "@/lib/magazines";
import { canUse } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine) {
    return NextResponse.json({ error: "Magazine niet gevonden." }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  if (download) {
    const space = await workspaceUser();
    if (!space || magazine.ownerId !== space.owner.id || !canUse(space.owner.plan, "download")) {
      return NextResponse.json({ error: "PDF-download zit in Standard.", upgrade: true }, { status: 402 });
    }
  }

  if (magazine.pdfUrl && !download) {
    return NextResponse.redirect(magazine.pdfUrl, 307);
  }

  const pdf = await readPdf(id);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${magazine.originalName}"`,
      "Cache-Control": download ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
