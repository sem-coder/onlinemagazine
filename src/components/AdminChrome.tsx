import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/SiteChrome";
import type { User } from "@/lib/types";

const LINKS = [
  ["/admin", "Overzicht"],
  ["/admin/gebruikers", "Gebruikers"],
];

export function AdminChrome({ user, children }: { user: User; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-green/10 px-2.5 py-0.5 text-xs font-medium text-green">Admin</span>
          </div>
          <nav className="hidden items-center gap-4 text-sm text-ink/70 md:flex">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink/55 sm:block">{user.email}</span>
            <Link href="/dashboard" className="text-ink/70">
              Dashboard
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="text-ink/60">Uitloggen</button>
            </form>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-4 overflow-auto px-5 py-2 text-sm text-ink/70 md:hidden">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap">
              {label}
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
