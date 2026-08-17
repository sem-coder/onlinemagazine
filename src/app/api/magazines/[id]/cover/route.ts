import { NextResponse } from "next/server";
import { getMagazine, readCover } from "@/lib/magazines";

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
  if (magazine.coverUrl) {
    return NextResponse.redirect(magazine.coverUrl, 307);
  }

  const cover = await readCover(id);
  return new NextResponse(new Uint8Array(cover), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
