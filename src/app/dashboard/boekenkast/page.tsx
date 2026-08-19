import Link from "next/link";
import { redirect } from "next/navigation";
import { BookshelfForm } from "@/components/BookshelfForm";
import { DashboardChrome } from "@/components/DashboardChrome";
import { workspaceUser } from "@/lib/auth";
import { listMagazinesForOwner } from "@/lib/magazines";
import { canUse } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function BookshelfSettingsPage() {
  const space = await workspaceUser();
  if (!space) redirect("/login?next=/dashboard/boekenkast");
  const magazines = (await listMagazinesForOwner(space.owner.id)).filter((magazine) => magazine.public);

  return (
    <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
      <h1 className="text-3xl font-semibold">Boekenkast</h1>
      {canUse(space.owner.plan, "bookshelf") ? (
        <>
          <p className="mt-2 text-ink/60">
            Publieke overzichtspagina van je catalogs.{" "}
            <Link href={`/b/${space.owner.bookshelfSlug}`} className="text-green">
              /b/{space.owner.bookshelfSlug}
            </Link>
          </p>
          <div className="mt-8 max-w-lg">
            <BookshelfForm slug={space.owner.bookshelfSlug} />
          </div>
          <p className="mt-6 text-sm text-ink/55">{magazines.length} openbare magazines in de kast.</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-ink/65">Een publieke boekenkast zit in Premium.</p>
          <Link href="/dashboard/upgrade" className="mt-5 inline-flex rounded-full bg-green px-4 py-2 text-sm text-white">
            Upgrade
          </Link>
        </>
      )}
    </DashboardChrome>
  );
}
