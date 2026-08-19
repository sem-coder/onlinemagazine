import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { deleteMagazine, getMagazine } from "@/lib/magazines";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine) return NextResponse.json({ error: "Magazine niet gevonden." }, { status: 404 });
  await deleteMagazine(magazine.id, magazine.ownerId);
  return NextResponse.json({ ok: true });
}
