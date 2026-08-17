import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { EXAMPLES } from "@/lib/examples";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ExamplesPage() {
  const user = await getSessionUser();
  return (
    <div className="bg-paper">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="text-4xl font-semibold">Voorbeelden</h1>
        <p className="mt-3 max-w-2xl text-ink/65">
          Open een preview en blader. Jouw eigen PDF krijgt hetzelfde page-flip effect, plus een unieke link en embed-code.
        </p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {EXAMPLES.map((example) => (
            <li key={example.slug}>
              <Link href={`/voorbeelden/${example.slug}`} className="block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/examples/${example.slug}/page-1.svg`} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-green">{example.category}</p>
                  <h2 className="mt-1 font-semibold">{example.title}</h2>
                  <p className="mt-1 text-sm text-ink/60">{example.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
