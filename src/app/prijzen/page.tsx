import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PricingTable } from "@/components/PricingTable";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getSessionUser();
  return (
    <div className="bg-paper">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="text-center text-4xl font-semibold">Prijzen</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink/65">
          Start gratis. Upgrade als je branding wilt weghalen, leads wilt vangen of onbeperkt wilt publiceren.
        </p>
        <div className="mt-12">
          <PricingTable ctaHref={user ? "/dashboard/upgrade" : "/signup"} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
