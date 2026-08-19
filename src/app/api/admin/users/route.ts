import { NextResponse } from "next/server";
import { requireAdminApi, toAdminUserRow } from "@/lib/admin";
import { registerUser } from "@/lib/auth";
import { listMagazines } from "@/lib/magazines";
import type { PlanId, UserRole } from "@/lib/types";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    plan?: PlanId;
    role?: UserRole;
  };

  const plan = PLANS.find((item) => item.id === body.plan)?.id ?? "free";
  const role = body.role === "admin" ? "admin" : "user";

  try {
    const user = await registerUser({
      email: String(body.email ?? ""),
      name: String(body.name ?? ""),
      password: String(body.password ?? ""),
      plan,
      role,
    });
    const magazines = await listMagazines();
    return NextResponse.json({ user: toAdminUserRow(user, magazines) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aanmaken mislukt." },
      { status: 400 },
    );
  }
}
