import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/DashboardChrome";
import { workspaceUser } from "@/lib/auth";
import { listLeadsForOwner } from "@/lib/leads";
import { canUse } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const space = await workspaceUser();
  if (!space) redirect("/login?next=/dashboard/leads");
  if (!canUse(space.owner.plan, "leads")) {
    return (
      <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
        <h1 className="text-3xl font-semibold">Leads</h1>
        <p className="mt-3 text-ink/65">Leadformulieren en inzendingen zitten in Professional.</p>
        <Link href="/dashboard/upgrade" className="mt-5 inline-flex rounded-full bg-green px-4 py-2 text-sm text-white">
          Upgrade
        </Link>
      </DashboardChrome>
    );
  }

  const leads = await listLeadsForOwner(space.owner.id);

  return (
    <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
      <h1 className="text-3xl font-semibold">Leads</h1>
      <p className="mt-2 text-ink/60">{leads.length} inzendingen</p>
      <ul className="mt-8 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
        {leads.length === 0 ? (
          <li className="p-4 text-sm text-ink/55">Nog geen leads. Zet het formulier aan bij een magazine.</li>
        ) : (
          leads.map((lead) => (
            <li key={lead.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[1fr_1fr_auto]">
              <span className="font-medium">{lead.name || "—"}</span>
              <a href={`mailto:${lead.email}`} className="text-ink/70">
                {lead.email}
              </a>
              <span className="text-ink/50">
                {lead.magazineTitle} · {new Date(lead.createdAt).toLocaleDateString("nl-NL")}
              </span>
            </li>
          ))
        )}
      </ul>
    </DashboardChrome>
  );
}
