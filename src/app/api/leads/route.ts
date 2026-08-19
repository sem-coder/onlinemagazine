import { NextResponse } from "next/server";
import { workspaceUser } from "@/lib/auth";
import { addLead, listLeadsForMagazine, listLeadsForOwner } from "@/lib/leads";
import { getMagazine } from "@/lib/magazines";
import { canUse } from "@/lib/plans";

export async function GET(request: Request) {
  const space = await workspaceUser();
  if (!space) return NextResponse.json({ error: "Log in." }, { status: 401 });
  if (!canUse(space.owner.plan, "leads")) {
    return NextResponse.json({ error: "Leads zitten in Professional.", upgrade: true }, { status: 402 });
  }
  const magazineId = new URL(request.url).searchParams.get("magazineId");
  if (magazineId) {
    const magazine = await getMagazine(magazineId);
    if (!magazine || magazine.ownerId !== space.owner.id) {
      return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    }
    return NextResponse.json({ leads: await listLeadsForMagazine(magazineId) });
  }
  return NextResponse.json({ leads: await listLeadsForOwner(space.owner.id) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    magazineId?: string;
    name?: string;
    email?: string;
  };
  if (!body.magazineId) {
    return NextResponse.json({ error: "Magazine ontbreekt." }, { status: 400 });
  }
  const result = await addLead({
    magazineId: body.magazineId,
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}