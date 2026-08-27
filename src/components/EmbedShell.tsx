"use client";

import { useEffect, type ReactNode } from "react";

export function EmbedShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("embed-frame");
    document.body.classList.add("embed-frame");

    function notifyParent() {
      if (window.parent === window) return;
      const height = Math.max(640, Math.round(window.innerWidth * 0.625));
      window.parent.postMessage({ source: "pdfmagazine", type: "resize", height }, "*");
    }
    notifyParent();
    window.addEventListener("resize", notifyParent);

    return () => {
      window.removeEventListener("resize", notifyParent);
      document.documentElement.classList.remove("embed-frame");
      document.body.classList.remove("embed-frame");
    };
  }, []);

  return <div className="h-dvh w-full overflow-hidden bg-viewer">{children}</div>;
}
