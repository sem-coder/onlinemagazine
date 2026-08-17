import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/SiteChrome";
import { MagazineSettings } from "@/components/MagazineSettings";
import { getSessionUser } from "@/lib/auth";
import { getMagazine } from "@/lib/magazines";

type Params = { params: Promise<{ id: string }> };

export default async function DashboardMagazinePage({ params }: Params) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  const { id } = await params;
  const magazine = await getMagazine(id);
  if (!magazine || magazine.ownerId !== user.id) notFound();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <Link href="/dashboard" className="text-sm text-ink/60">
            ← Overzicht
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{magazine.title}</h1>
            <p className="mt-1 text-sm text-ink/55">{magazine.views} weergaven · {magazine.pageCount} pagina’s</p>
          </div>
          <Link href={`/v/${magazine.slug}`} className="rounded-full bg-ink px-4 py-2 text-sm text-white">
            Open viewer
          </Link>
        </div>
        <MagazineSettings magazine={magazine} plan={user.plan} />
      </main>
    </div>
  );
}
