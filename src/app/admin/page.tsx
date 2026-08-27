import Link from "next/link";
import { loadAdminOverview } from "@/lib/admin";
import { formatBytes, getPlan } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function AdminHomePage() {
  const { users, magazines, orphans, stats } = await loadAdminOverview();
  const recentUsers = users.slice(0, 8);
  const recentMags = magazines.slice(0, 8);
  const ownerName = new Map(users.map((user) => [user.id, user.name]));

  return (
    <div>
      <h1 className="text-3xl font-semibold">Beheer</h1>
      <p className="mt-1 text-ink/60">Klanten, magazines en plannen in één overzicht.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gebruikers" value={stats.users} />
        <Stat label="Magazines" value={stats.magazines} />
        <Stat label="Weergaven" value={stats.views} />
        <Stat label="Leads" value={stats.leads} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(stats.planCounts) as PlanId[]).map((id) => (
          <div key={id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <p className="text-sm text-ink/55">{getPlan(id).name}</p>
            <p className="mt-1 text-xl font-semibold">{stats.planCounts[id]}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Laatste gebruikers</h2>
            <Link href="/admin/gebruikers" className="text-sm text-green">
              Alle gebruikers
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
            {recentUsers.length === 0 ? (
              <li className="p-4 text-sm text-ink/55">Nog geen accounts.</li>
            ) : (
              recentUsers.map((user) => (
                <li key={user.id}>
                  <Link href={`/admin/gebruikers/${user.id}`} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-ink/55">{user.email}</p>
                    </div>
                    <span className="text-sm text-ink/50">{user.planName}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Laatste magazines</h2>
          <ul className="mt-4 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
            {recentMags.length === 0 ? (
              <li className="p-4 text-sm text-ink/55">Nog geen magazines.</li>
            ) : (
              recentMags.map((magazine) => (
                <li key={magazine.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium">{magazine.title}</p>
                    <p className="text-ink/50">
                      {ownerName.get(magazine.ownerId) ?? (magazine.ownerId.startsWith("guest_") ? "Gast" : magazine.ownerId)} ·{" "}
                      {magazine.views} weergaven
                      {magazine.leadForm ? " · lead aan" : ""}
                    </p>
                  </div>
                  <Link href={`/v/${magazine.slug}`} className="text-green">
                    Openen
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {orphans.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Zonder account</h2>
          <p className="mt-1 text-sm text-ink/55">
            {orphans.length} magazine{orphans.length === 1 ? "" : "s"} van gasten of verwijderde users ·{" "}
            {formatBytes(orphans.reduce((sum, magazine) => sum + (magazine.bytes ?? 0), 0))}
          </p>
          <ul className="mt-4 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
            {orphans.slice(0, 12).map((magazine) => (
              <li key={magazine.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{magazine.title}</p>
                  <p className="text-ink/50">{magazine.ownerId}</p>
                </div>
                <Link href={`/v/${magazine.slug}`} className="text-green">
                  Openen
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
