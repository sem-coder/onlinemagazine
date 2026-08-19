import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/DashboardChrome";
import { TeamForm } from "@/components/TeamForm";
import { workspaceUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const space = await workspaceUser();
  if (!space) redirect("/login?next=/dashboard/team");
  const plan = getPlan(space.owner.plan);

  return (
    <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
      <h1 className="text-3xl font-semibold">Team</h1>
      <p className="mt-2 text-ink/60">
        {plan.name}: {plan.seats} gebruiker{plan.seats === 1 ? "" : "s"} in dit account.
      </p>
      <div className="mt-8">
        <TeamForm members={space.owner.teamMembers} seats={plan.seats} isMember={space.isMember} />
      </div>
    </DashboardChrome>
  );
}
