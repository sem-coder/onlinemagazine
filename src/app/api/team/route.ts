import { NextResponse } from "next/server";
import { workspaceUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { inviteTeamMember, removeTeamMember } from "@/lib/users";

export async function GET() {
  const space = await workspaceUser();
  if (!space) return NextResponse.json({ error: "Log in." }, { status: 401 });
  const plan = getPlan(space.owner.plan);
  return NextResponse.json({
    owner: { id: space.owner.id, name: space.owner.name, email: space.owner.email },
    isMember: space.isMember,
    seats: plan.seats,
    members: space.owner.teamMembers,
  });
}

export async function POST(request: Request) {
  const space = await workspaceUser();
  if (!space) return NextResponse.json({ error: "Log in." }, { status: 401 });
  if (space.isMember) {
    return NextResponse.json({ error: "Alleen de eigenaar kan uitnodigen." }, { status: 403 });
  }
  const plan = getPlan(space.owner.plan);
  if (1 + space.owner.teamMembers.length >= plan.seats) {
    return NextResponse.json(
      { error: `Je ${plan.name}-plan heeft ${plan.seats} gebruikers. Upgrade voor meer.`, upgrade: true },
      { status: 402 },
    );
  }
  const body = (await request.json()) as { email?: string };
  try {
    const member = await inviteTeamMember(space.owner, String(body.email ?? ""));
    return NextResponse.json({ member });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Uitnodigen mislukt." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const space = await workspaceUser();
  if (!space) return NextResponse.json({ error: "Log in." }, { status: 401 });
  if (space.isMember) {
    return NextResponse.json({ error: "Alleen de eigenaar kan verwijderen." }, { status: 403 });
  }
  const body = (await request.json()) as { email?: string };
  await removeTeamMember(space.owner, String(body.email ?? ""));
  return NextResponse.json({ ok: true });
}