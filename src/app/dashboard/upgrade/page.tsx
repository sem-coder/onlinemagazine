import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/DashboardChrome";
import { UpgradeForm } from "@/components/UpgradeForm";
import { workspaceUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const space = await workspaceUser();
  if (!space) redirect("/login?next=/dashboard/upgrade");
  return (
    <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
      <h1 className="text-3xl font-semibold">Upgrade</h1>
      <p className="mt-2 max-w-2xl text-ink/65">
        Branding-af, extra opslag, leads, statistieken en een boekenkast. Activeer een plan om die features te ontgrendelen.
      </p>
      <div className="mt-8">
        <Suspense>
          <UpgradeForm current={space.user.plan} />
        </Suspense>
      </div>
    </DashboardChrome>
  );
}
