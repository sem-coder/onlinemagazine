import { NextResponse } from "next/server";
import { actorId, getSessionUser } from "@/lib/auth";
import { deleteMagazine, getMagazine, slugTaken, uniqueSlug, writeMeta } from "@/lib/magazines";
import { canUse } from "@/lib/plans";
import { SLUG_PATTERN } from "@/lib/types";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ownerId = await actorId();
  const magazine = await getMagazine(id);
  if (!magazine || magazine.ownerId !== ownerId) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    slug?: string;
    public?: boolean;
    leadForm?: boolean;
  };
  const user = await getSessionUser();
  const plan = user?.plan ?? "free";

  if (typeof body.title === "string" && body.title.trim()) {
    magazine.title = body.title.trim();
  }
  if (typeof body.public === "boolean") magazine.public = body.public;
  if (typeof body.leadForm === "boolean") {
    if (body.leadForm && !canUse(plan, "leads")) {
      return NextResponse.json({ error: "Leadformulieren zitten in Professional.", upgrade: true }, { status: 402 });
    }
    magazine.leadForm = body.leadForm;
  }
  if (typeof body.slug === "string") {
    if (!canUse(plan, "slug")) {
      return NextResponse.json({ error: "Eigen URL zit in Professional.", upgrade: true }, { status: 402 });
    }
    const slug = body.slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug)) {
      return NextResponse.json({ error: "Slug: alleen kleine letters, cijfers en streepjes." }, { status: 400 });
    }
    if (await slugTaken(slug, magazine.id)) {
      magazine.slug = await uniqueSlug(slug, magazine.id);
    } else {
      magazine.slug = slug;
    }
  }

  await writeMeta(magazine);
  return NextResponse.json({ magazine });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ownerId = await actorId();
  const ok = await deleteMagazine(id, ownerId);
  if (!ok) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
