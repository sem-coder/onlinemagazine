import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/DashboardChrome";
import { workspaceUser } from "@/lib/auth";
import { listMagazinesForOwner } from "@/lib/magazines";
import { canUse } from "@/lib/plans";

export const dynamic = "force-dynamic";

function lastDays(count: number) {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

export default async function StatsPage() {
  const space = await workspaceUser();
  if (!space) redirect("/login?next=/dashboard/stats");
  if (!canUse(space.owner.plan, "stats")) {
    return (
      <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
        <h1 className="text-3xl font-semibold">Statistieken</h1>
        <p className="mt-3 text-ink/65">Lezersstatistieken zitten in Professional.</p>
        <Link href="/dashboard/upgrade" className="mt-5 inline-flex rounded-full bg-green px-4 py-2 text-sm text-white">
          Upgrade
        </Link>
      </DashboardChrome>
    );
  }

  const magazines = await listMagazinesForOwner(space.owner.id);
  const days = lastDays(14);
  const totals = days.map((day) => magazines.reduce((sum, magazine) => sum + (magazine.viewsByDay[day] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const allViews = magazines.reduce((sum, magazine) => sum + magazine.views, 0);

  return (
    <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
      <h1 className="text-3xl font-semibold">Statistieken</h1>
      <p className="mt-2 text-ink/60">{allViews} weergaven in totaal · laatste 14 dagen</p>
      <div className="mt-8 flex h-40 items-end gap-1 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        {totals.map((value, index) => (
          <div key={days[index]} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div className="w-full rounded-sm bg-green" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
            <span className="text-[10px] text-ink/40">{days[index]?.slice(8)}</span>
          </div>
        ))}
      </div>
      <ul className="mt-8 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
        {magazines.map((magazine) => (
          <li key={magazine.id} className="flex items-center justify-between p-4 text-sm">
            <Link href={`/dashboard/${magazine.id}`} className="font-medium">
              {magazine.title}
            </Link>
            <span className="text-ink/55">{magazine.views} weergaven</span>
          </li>
        ))}
        {magazines.length === 0 ? <li className="p-4 text-sm text-ink/55">Nog geen data.</li> : null}
      </ul>
    </DashboardChrome>
  );
}
