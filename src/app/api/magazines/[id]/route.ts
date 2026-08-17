import { NextResponse } from "next/server";
import { getMagazine } from "@/lib/magazines";

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
  return NextResponse.json({ magazine });
}
