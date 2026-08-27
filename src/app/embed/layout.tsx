import type { ReactNode } from "react";
import { EmbedShell } from "@/components/EmbedShell";

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return <EmbedShell>{children}</EmbedShell>;
}
