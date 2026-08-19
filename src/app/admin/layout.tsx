import type { ReactNode } from "react";
import { AdminChrome } from "@/components/AdminChrome";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();
  return <AdminChrome user={user}>{children}</AdminChrome>;
}
