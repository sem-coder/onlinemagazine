import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getSessionUser } from "@/lib/auth";
import { listMagazinesForOwner } from "@/lib/magazines";
import { canUse } from "@/lib/plans";
import { findUserByBookshelfSlug } from "@/lib/users";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function BookshelfPage({ params }: Params) {
  const { slug } = await params;
  const owner = await findUserByBookshelfSlug(slug);
  if (!owner || !canUse(owner.plan, "bookshelf")) notFound();
  const magazines = (await listMagazinesForOwner(owner.id)).filter((magazine) => magazine.public && !magazine.expiresAt);
  const user = await getSessionUser();

  return (
    <div className="bg-paper">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-ink/45">Boekenkast</p>
        <h1 className="mt-2 text-4xl font-semibold">{owner.name}</h1>
        <p className="mt-3 max-w-2xl text-ink/65">Alle openbare catalogs van {owner.name}.</p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {magazines.map((magazine) => (
            <li key={magazine.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <Link href={`/v/${magazine.slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/magazines/${magazine.id}/cover`} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="p-4">
                  <p className="font-medium">{magazine.title}</p>
                  <p className="text-sm text-ink/55">{magazine.pageCount} pagina’s</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {magazines.length === 0 ? <p className="mt-8 text-sm text-ink/55">Nog geen openbare magazines.</p> : null}
      </main>
      <SiteFooter />
    </div>
  );
}
