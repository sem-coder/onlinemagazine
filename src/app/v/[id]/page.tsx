import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MagazineViewerClient } from "@/components/MagazineViewer.client";
import { bumpViews, getMagazineBySlugOrId } from "@/lib/magazines";
import { canUse } from "@/lib/plans";
import { findUserById } from "@/lib/users";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ share?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const magazine = await getMagazineBySlugOrId(id);
  return { title: magazine ? `${magazine.title} — Folio` : "Magazine — Folio" };
}

export default async function ViewPage({ params, searchParams }: Params) {
  const { id } = await params;
  const query = await searchParams;
  const magazine = await getMagazineBySlugOrId(id);
  if (!magazine || !magazine.public) notFound();
  if (magazine.expiresAt && new Date(magazine.expiresAt) < new Date()) notFound();
  await bumpViews(magazine.id);
  const owner = await findUserById(magazine.ownerId);
  const hideBrand = owner ? canUse(owner.plan, "brandingOff") : false;
  return (
    <MagazineViewerClient
      magazine={magazine}
      showBranding={!hideBrand}
      openShare={query.share === "1"}
    />
  );
}
