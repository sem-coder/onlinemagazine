import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/SiteChrome";
import type { User } from "@/lib/types";

const LINKS = [
  ["/dashboard", "Overzicht"],
  ["/dashboard/stats", "Statistieken"],
  ["/dashboard/leads", "Leads"],
  ["/dashboard/team", "Team"],
  ["/dashboard/boekenkast", "Boekenkast"],
];

export function DashboardChrome({
  user,
  owner,
  isMember,
  children,
}: {
  user: User;
  owner: User;
  isMember: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-4 text-sm text-ink/70 md:flex">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard/upgrade" className="rounded-full bg-green px-3 py-1.5 text-white">
              Upgrade
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
      {isMember ? (
        <p className="border-b border-black/5 bg-white px-5 py-2 text-center text-sm text-ink/60">
          Je werkt in het account van {owner.name}.
        </p>
      ) : null}
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
