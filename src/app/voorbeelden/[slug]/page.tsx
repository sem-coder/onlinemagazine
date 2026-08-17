import { notFound } from "next/navigation";
import { MagazineViewerClient } from "@/components/MagazineViewer.client";
import { EXAMPLES, examplePages } from "@/lib/examples";
import type { Magazine } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

export default async function ExampleViewer({ params }: Params) {
  const { slug } = await params;
  const example = EXAMPLES.find((item) => item.slug === slug);
  if (!example) notFound();
  const magazine: Magazine = {
    id: `demo-${example.slug}`,
    slug: example.slug,
    title: example.title,
    originalName: `${example.slug}.pdf`,
    pageCount: example.pages,
    pageWidth: 620,
    pageHeight: 860,
    createdAt: new Date().toISOString(),
    ownerId: "demo",
    views: 0,
    public: true,
    leadForm: false,
    expiresAt: null,
  };
  return (
    <MagazineViewerClient
      magazine={magazine}
      pagesFromImages={examplePages(example.slug, example.pages)}
      showBranding
    />
  );
}
