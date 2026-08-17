import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MagazineViewerClient } from "@/components/MagazineViewer.client";
import { getMagazine } from "@/lib/magazines";

type MagazineParams = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: MagazineParams): Promise<Metadata> {
  const { id } = await params;
  const magazine = await getMagazine(id);
  return {
    title: magazine ? `${magazine.title} — Folio` : "Magazine — Folio",
  };
}

export default async function MagazinePage({ params }: MagazineParams) {
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine) notFound();
  return <MagazineViewerClient magazine={magazine} />;
}
