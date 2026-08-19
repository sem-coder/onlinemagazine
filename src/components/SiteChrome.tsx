import Link from "next/link";
import { isAdmin } from "@/lib/admin-access";
import type { User } from "@/lib/types";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-green text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H14l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15Z" />
          <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      <span className={`text-[15px] tracking-tight sm:text-base ${dark ? "text-white" : "text-ink"}`}>
        PDFmagazine.nl
      </span>
    </Link>
  );
}

export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-ink/70 md:flex">
          <Link href="/#convert">Converteren</Link>
          <Link href="/voorbeelden">Voorbeelden</Link>
          <Link href="/features">Features</Link>
          <Link href="/prijzen">Prijzen</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {isAdmin(user) ? (
                <Link href="/admin" className="hidden text-ink/70 sm:block">
                  Beheer
                </Link>
              ) : null}
              <Link href="/dashboard" className="rounded-full bg-green px-4 py-2 font-medium text-white">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-ink/70 sm:block">
                Inloggen
              </Link>
              <Link href="/signup" className="rounded-full bg-green px-4 py-2 font-medium text-white">
                Account maken
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm leading-6 text-ink/60">
            PDF naar flipbook. Deel, embed of verkoop toegang tot je magazines.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <div className="mt-3 grid gap-2 text-sm text-ink/60">
            <Link href="/voorbeelden">Voorbeelden</Link>
            <Link href="/features">Features</Link>
            <Link href="/prijzen">Prijzen</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Verdienen</p>
          <div className="mt-3 grid gap-2 text-sm text-ink/60">
            <span>Abonnementen</span>
            <span>Leadformulieren</span>
            <span>White-label (Premium)</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Account</p>
          <div className="mt-3 grid gap-2 text-sm text-ink/60">
            <Link href="/login">Inloggen</Link>
            <Link href="/signup">Registreren</Link>
            <Link href="/dashboard">Klantomgeving</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
