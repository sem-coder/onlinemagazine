import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { loadAdminOverview, requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdminPage();
  const { users, stats } = await loadAdminOverview();

  return (
    <div>
      <h1 className="text-3xl font-semibold">Gebruikers</h1>
      <p className="mt-1 text-ink/60">
        {stats.users} account{stats.users === 1 ? "" : "s"} · {stats.admins} admin
        {stats.admins === 1 ? "" : "s"}
      </p>
      <div className="mt-8">
        <AdminUsersPanel users={users} currentUserId={admin.id} />
      </div>
    </div>
  );
}
