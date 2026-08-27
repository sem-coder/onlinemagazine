"use client";

import { useEffect, type ReactNode } from "react";

export function EmbedShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("embed-frame");
    document.body.classList.add("embed-frame");
    return () => {
      document.documentElement.classList.remove("embed-frame");
      document.body.classList.remove("embed-frame");
    };
  }, []);

  return <div className="h-dvh w-full overflow-hidden bg-viewer">{children}</div>;
}
