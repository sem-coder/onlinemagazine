import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserEditor } from "@/components/AdminUserEditor";
import { requireAdminPage, toAdminUserRow } from "@/lib/admin";
import { listLeadsForOwner } from "@/lib/leads";
import { listMagazinesForOwner } from "@/lib/magazines";
import { formatBytes } from "@/lib/plans";
import { findUserById } from "@/lib/users";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Params) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const user = await findUserById(id);
  if (!user) notFound();

  const magazines = await listMagazinesForOwner(user.id);
  const leads = await listLeadsForOwner(user.id);
  const row = toAdminUserRow(user, magazines);

  return (
    <div>
      <Link href="/admin/gebruikers" className="text-sm text-ink/60">
        ← Gebruikers
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{user.name}</h1>
          <p className="mt-1 text-ink/60">{user.email}</p>
        </div>
        <p className="text-sm text-ink/55">
          {row.magazines} magazines · {row.views} weergaven · {leads.length} leads · {formatBytes(row.storageBytes)}
        </p>
      </div>
      {leads.length > 0 ? (
        <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="font-semibold">Laatste leads</h2>
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {leads.slice(0, 8).map((lead) => (
              <li key={lead.id} className="flex justify-between gap-3 py-2">
                <span>
                  {lead.name || "—"} · {lead.email}
                  <span className="text-ink/45"> · {lead.magazineTitle}</span>
                </span>
                <span className="text-ink/50">{new Date(lead.createdAt).toLocaleDateString("nl-NL")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mt-8">
        <AdminUserEditor user={row} magazines={magazines} currentUserId={admin.id} />
      </div>
    </div>
  );
}
