"use client";

import dynamic from "next/dynamic";
import type { Magazine } from "@/lib/types";

const Viewer = dynamic(
  () => import("@/components/MagazineViewer").then((mod) => mod.MagazineViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-viewer text-paper">
        Magazine laden…
      </div>
    ),
  },
);

export function MagazineViewerClient({ magazine }: { magazine: Magazine }) {
  return <Viewer magazine={magazine} />;
}
