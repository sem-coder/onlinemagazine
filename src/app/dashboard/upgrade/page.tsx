import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/SiteChrome";
import { UpgradeForm } from "@/components/UpgradeForm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/upgrade");
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-semibold">Upgrade</h1>
        <p className="mt-2 max-w-2xl text-ink/65">
          Folio verdient aan abonnementen: branding-af, extra opslag, leads en statistieken. Activeer een plan om die features te ontgrendelen.
        </p>
        <div className="mt-8">
          <Suspense>
            <UpgradeForm current={user.plan} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
