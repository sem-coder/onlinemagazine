import { NextResponse } from "next/server";
import { getMagazineBySlugOrId, writeMeta } from "@/lib/magazines";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    magazineId?: string;
    name?: string;
    email?: string;
  };
  const magazine = body.magazineId ? await getMagazineBySlugOrId(body.magazineId) : null;
  if (!magazine || !magazine.leadForm) {
    return NextResponse.json({ error: "Leadformulier staat niet aan." }, { status: 400 });
  }
  if (!body.email?.includes("@")) {
    return NextResponse.json({ error: "Vul een e-mailadres in." }, { status: 400 });
  }
  magazine.views = magazine.views;
  await writeMeta(magazine);
  return NextResponse.json({ ok: true });
}
