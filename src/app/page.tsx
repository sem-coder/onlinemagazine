import { UploadDropzone } from "@/components/UploadDropzone.client";
import { listMagazines } from "@/lib/magazines";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const magazines = await listMagazines();

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white">
            F
          </span>
          <span className="font-display text-xl tracking-tight">Folio</span>
        </Link>
        <p className="hidden text-sm text-ink/55 sm:block">PDF in. Magazine out.</p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-20 pt-8 md:px-10">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-accent">Online magazine</p>
            <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
              Blader door je PDF alsof het gedrukt is.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-ink/70">
              Upload een catalogus, brochure of magazine. Folio zet het om naar een
              bladzijde-voor-bladzijde ervaring — met omslag, schaduw en een echte page-flip.
            </p>
          </div>
          <UploadDropzone />
        </section>

        {magazines.length > 0 ? (
          <section className="mt-20">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-3xl tracking-tight">Jouw magazines</h2>
              <p className="text-sm text-ink/50">{magazines.length} online</p>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {magazines.map((magazine) => (
                <li key={magazine.id}>
                  <Link
                    href={`/m/${magazine.id}`}
                    className="group block overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(28,25,21,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(28,25,21,0.12)]"
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-ink/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/magazines/${magazine.id}/cover`}
                        alt={magazine.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <p className="truncate font-medium">{magazine.title}</p>
                      <p className="text-sm text-ink/50">{magazine.pageCount} pagina’s</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
