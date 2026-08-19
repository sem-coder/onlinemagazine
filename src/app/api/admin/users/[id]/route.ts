import { NextResponse } from "next/server";
import { requireAdminApi, toAdminUserRow, updateAdminUser, removeAdminUser } from "@/lib/admin";
import { findUserById } from "@/lib/users";
import { listMagazines } from "@/lib/magazines";
import type { PlanId, UserRole } from "@/lib/types";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;

  const body = (await request.json()) as {
    name?: string;
    plan?: PlanId;
    role?: UserRole;
    password?: string;
  };

  if (body.plan && !PLANS.some((plan) => plan.id === body.plan)) {
    return NextResponse.json({ error: "Ongeldig plan." }, { status: 400 });
  }
  if (body.role && body.role !== "admin" && body.role !== "user") {
    return NextResponse.json({ error: "Ongeldige rol." }, { status: 400 });
  }

  try {
    const user = await updateAdminUser(gate.user, id, body);
    const magazines = await listMagazines();
    return NextResponse.json({ user: toAdminUserRow(user, magazines) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Opslaan mislukt." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;

  try {
    await removeAdminUser(gate.user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verwijderen mislukt." },
      { status: 400 },
    );
  }
}

export async function GET(_request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  const user = await findUserById(id);
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
  const magazines = await listMagazines();
  return NextResponse.json({ user: toAdminUserRow(user, magazines) });
}
