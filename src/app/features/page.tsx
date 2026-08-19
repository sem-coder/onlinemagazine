import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  ["Page-flip", "Realistische bladzijde, spread op desktop, één pagina op mobiel."],
  ["Unieke link + QR", "Elke PDF krijgt /v/jouw-titel. Deel de URL of een QR-code."],
  ["Embed", "Iframe voor WordPress, Shopify of je eigen site. Geen redirect nodig."],
  ["Klantomgeving", "Flipbooks, opslag, team, leads en statistieken op één dashboard."],
  ["Leadformulieren", "Vang e-mailadressen in het magazine en bekijk ze terug (Professional)."],
  ["White-label", "Geen Folio-logo in de viewer vanaf Standard."],
  ["Boekenkast", "Publieke overzichtspagina van al je catalogs (Premium)."],
  ["Team", "Nodig extra gebruikers uit op hetzelfde account."],
];

export default async function FeaturesPage() {
  const user = await getSessionUser();
  return (
    <div className="bg-paper">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="text-4xl font-semibold">Features</h1>
        <p className="mt-3 max-w-2xl text-ink/65">
          Gebouwd om catalogs, magazines en brochures te publiceren — en eraan te verdienen.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {FEATURES.map(([title, text]) => (
            <article key={title} className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">{text}</p>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
