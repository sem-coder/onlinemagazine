import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardChrome } from "@/components/DashboardChrome";
import { MagazineSettings } from "@/components/MagazineSettings";
import { workspaceUser } from "@/lib/auth";
import { listLeadsForMagazine } from "@/lib/leads";
import { getMagazine } from "@/lib/magazines";
import { canUse } from "@/lib/plans";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function DashboardMagazinePage({ params }: Params) {
  const space = await workspaceUser();
  if (!space) redirect("/login?next=/dashboard");
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine || magazine.ownerId !== space.owner.id) notFound();
  const leads = canUse(space.owner.plan, "leads") ? await listLeadsForMagazine(magazine.id) : [];

  return (
    <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-ink/60">
            ← Overzicht
          </Link>
          <h1 className="mt-3 text-3xl font-semibold">{magazine.title}</h1>
          <p className="mt-1 text-sm text-ink/55">
            {magazine.views} weergaven · {magazine.pageCount} pagina’s
          </p>
        </div>
        <Link href={`/v/${magazine.slug}`} className="rounded-full bg-ink px-4 py-2 text-sm text-white">
          Open viewer
        </Link>
      </div>
      <MagazineSettings magazine={magazine} plan={space.owner.plan} />
      {canUse(space.owner.plan, "leads") ? (
        <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="font-semibold">Leads uit dit magazine</h2>
          {leads.length === 0 ? (
            <p className="mt-2 text-sm text-ink/55">Nog geen inzendingen.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 text-sm">
              {leads.map((lead) => (
                <li key={lead.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {lead.name || "—"} · {lead.email}
                  </span>
                  <span className="text-ink/50">{new Date(lead.createdAt).toLocaleDateString("nl-NL")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </DashboardChrome>
  );
}
