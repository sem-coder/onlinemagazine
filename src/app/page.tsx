import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { UploadDropzone } from "@/components/UploadDropzone.client";
import { PricingTable } from "@/components/PricingTable";
import { EXAMPLES } from "@/lib/examples";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();

  return (
    <div className="bg-paper">
      <SiteHeader user={user} />
      <main>
        <section id="convert" className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">Flipbook maker</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink/70">
              PDF naar flipbook, gratis, zonder ads. Kies page-flip, deel een unieke link of embed het magazine op je website.
            </p>
            <div className="mt-8">
              <UploadDropzone />
            </div>
            <p className="mt-3 text-sm text-ink/50">
              Zonder account blijft je flipbook 7 dagen online.{" "}
              <Link href="/signup" className="text-green">
                Maak een account
              </Link>{" "}
              om hem te houden.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="hero-book">
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">Preview</p>
              <p className="mt-2 text-3xl font-semibold leading-tight">PDFmagazine.nl</p>
              <p className="mt-2 text-white/80">Blader alsof het gedrukt is</p>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-4">
            {[
              ["Flipbook maker", "PDF van elk formaat, met realistische page-flip."],
              ["Gratis starten", "Geen ads over je publicatie. Link, share of embed."],
              ["Interactief", "Leadformulieren en eigen branding op betaalde plannen."],
              ["Delen", "Unieke URL, iframe-embed en QR-klare link."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-2xl border border-black/8 p-5">
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-3xl font-semibold">Voorbeelden</h2>
            <Link href="/voorbeelden" className="text-sm text-green">
              Meer voorbeelden
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMPLES.map((example) => (
              <li key={example.slug}>
                <Link href={`/voorbeelden/${example.slug}`} className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  <div className="aspect-[3/4] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/examples/${example.slug}/page-1.svg`}
                      alt={example.title}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-wide text-green">{example.category}</p>
                    <p className="font-medium">{example.title}</p>
                    <p className="text-sm text-ink/55">{example.pages} pagina’s · Bekijk</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-3xl font-semibold">Prijzen</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-ink/60">
              Verdien aan je catalogs: upgrade voor branding-af, leads en statistieken. Prijzen incl. waar van toepassing.
            </p>
            <div className="mt-10">
              <PricingTable />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
