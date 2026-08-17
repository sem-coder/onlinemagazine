"use client";

import dynamic from "next/dynamic";
import type { Magazine } from "@/lib/types";

const Viewer = dynamic(
  () => import("@/components/MagazineViewer").then((mod) => mod.MagazineViewer),
  { ssr: false, loading: () => <div className="flex min-h-dvh items-center justify-center bg-viewer text-paper">Magazine laden…</div> },
);

export function MagazineViewerClient({
  magazine,
  pagesFromImages,
  mode,
  showBranding,
  openShare,
}: {
  magazine: Magazine;
  pagesFromImages?: string[];
  mode?: "reader" | "embed";
  showBranding?: boolean;
  openShare?: boolean;
}) {
  return (
    <Viewer
      magazine={magazine}
      pagesFromImages={pagesFromImages}
      mode={mode}
      showBranding={showBranding}
      openShare={openShare}
    />
  );
}
