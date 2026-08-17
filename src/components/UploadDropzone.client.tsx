"use client";

import dynamic from "next/dynamic";

export const UploadDropzone = dynamic(
  () => import("@/components/UploadDropzone").then((mod) => mod.UploadDropzone),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-56 w-full items-center justify-center rounded-3xl border-2 border-dashed border-ink/20 bg-white/70 text-sm text-ink/50">
        Upload klaarzetten…
      </div>
    ),
  },
);
