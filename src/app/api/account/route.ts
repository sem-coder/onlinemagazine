import { NextResponse } from "next/server";
import { workspaceUser } from "@/lib/auth";
import { canUse } from "@/lib/plans";
import { bookshelfSlugTaken, saveUser } from "@/lib/users";
import { SLUG_PATTERN } from "@/lib/types";

export async function PATCH(request: Request) {
  const space = await workspaceUser();
  if (!space) return NextResponse.json({ error: "Log in." }, { status: 401 });
  if (space.isMember) {
    return NextResponse.json({ error: "Alleen de eigenaar kan dit wijzigen." }, { status: 403 });
  }
  if (!canUse(space.owner.plan, "bookshelf")) {
    return NextResponse.json({ error: "Boekenkast zit in Premium.", upgrade: true }, { status: 402 });
  }
  const body = (await request.json()) as { bookshelfSlug?: string };
  const slug = String(body.bookshelfSlug ?? "").trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "Slug: alleen kleine letters, cijfers en streepjes." }, { status: 400 });
  }
  if (await bookshelfSlugTaken(slug, space.owner.id)) {
    return NextResponse.json({ error: "Deze boekenkast-URL is al in gebruik." }, { status: 409 });
  }
  space.owner.bookshelfSlug = slug;
  await saveUser(space.owner);
  return NextResponse.json({ bookshelfSlug: slug });
}