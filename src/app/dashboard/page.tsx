import Link from "next/link";
import { redirect } from "next/navigation";
import { UploadDropzone } from "@/components/UploadDropzone.client";
import { Logo } from "@/components/SiteChrome";
import { getSessionUser } from "@/lib/auth";
import { listMagazinesForOwner } from "@/lib/magazines";
import { getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  const magazines = await listMagazinesForOwner(user.id);
  const plan = getPlan(user.plan);
  const used = magazines.length;
  const cap = plan.flipbooks;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/prijzen">Prijzen</Link>
            <Link href="/dashboard/upgrade" className="rounded-full bg-green px-3 py-1.5 text-white">
              Upgrade
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="text-ink/60">Uitloggen</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Klantomgeving</h1>
            <p className="mt-1 text-ink/60">
              Hoi {user.name}. Plan: {plan.name}
              {cap ? ` · ${used}/${cap} flipbooks` : ` · ${used} flipbooks`}
            </p>
          </div>
        </div>
        <div className="mt-8 max-w-xl">
          <UploadDropzone compact />
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {magazines.map((magazine) => (
            <li key={magazine.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <Link href={`/dashboard/${magazine.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/magazines/${magazine.id}/cover`} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="p-4">
                  <p className="font-medium">{magazine.title}</p>
                  <p className="text-sm text-ink/55">
                    {magazine.views} weergaven · /v/{magazine.slug}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {magazines.length === 0 ? (
          <p className="mt-8 text-sm text-ink/55">Nog geen magazines. Upload een PDF om je eerste link te maken.</p>
        ) : null}
      </main>
    </div>
  );
}
