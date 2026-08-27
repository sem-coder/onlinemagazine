import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { clampLeadPercent, leadFormFields } from "@/lib/lead-form";
import { deleteMagazine, getMagazine, writeMeta } from "@/lib/magazines";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine) return NextResponse.json({ error: "Magazine niet gevonden." }, { status: 404 });

  const body = (await request.json()) as {
    leadForm?: boolean;
    leadTriggerPercent?: number;
    leadTitle?: string;
    leadText?: string;
    leadButton?: string;
    leadSkip?: string;
  };

  Object.assign(
    magazine,
    leadFormFields({
      ...magazine,
      leadForm: typeof body.leadForm === "boolean" ? body.leadForm : magazine.leadForm,
      leadTriggerPercent:
        body.leadTriggerPercent !== undefined ? clampLeadPercent(body.leadTriggerPercent) : magazine.leadTriggerPercent,
      leadTitle: body.leadTitle ?? magazine.leadTitle,
      leadText: body.leadText ?? magazine.leadText,
      leadButton: body.leadButton ?? magazine.leadButton,
      leadSkip: body.leadSkip ?? magazine.leadSkip,
    }),
  );
  await writeMeta(magazine);
  return NextResponse.json({ magazine });
}

export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine) return NextResponse.json({ error: "Magazine niet gevonden." }, { status: 404 });
  await deleteMagazine(magazine.id, magazine.ownerId);
  return NextResponse.json({ ok: true });
}
