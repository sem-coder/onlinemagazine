import { notFound } from "next/navigation";
import { MagazineViewerClient } from "@/components/MagazineViewer.client";
import { bumpViews, getMagazineBySlugOrId } from "@/lib/magazines";
import { canUse } from "@/lib/plans";
import { findUserById } from "@/lib/users";

type Params = { params: Promise<{ id: string }> };

export default async function EmbedPage({ params }: Params) {
  const { id } = await params;
  const magazine = await getMagazineBySlugOrId(id);
  if (!magazine || !magazine.public) notFound();
  await bumpViews(magazine.id);
  const owner = await findUserById(magazine.ownerId);
  return (
    <MagazineViewerClient
      magazine={magazine}
      mode="embed"
      showBranding={!(owner && canUse(owner.plan, "brandingOff"))}
    />
  );
}
