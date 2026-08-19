"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AdminUserRow } from "@/lib/admin";
import { PLANS } from "@/lib/plans";

function formatDate(iso: string | null) {
  if (!iso) return "Nog niet ingelogd";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminUsersPanel({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.planName.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function remove(user: AdminUserRow) {
    if (user.id === currentUserId) return;
    if (!confirm(`Account van ${user.name} verwijderen? Magazines van deze klant gaan ook weg.`)) return;
    setBusy(user.id);
    setMessage(null);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error ?? "Verwijderen mislukt.");
      return;
    }
    router.refresh();
  }

  async function create(form: FormData) {
    setBusy("create");
    setMessage(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        plan: form.get("plan"),
        role: form.get("role"),
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error ?? "Aanmaken mislukt.");
      return;
    }
    setCreateOpen(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op naam, e-mail of plan…"
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((open) => !open)}
          className="rounded-full bg-green px-4 py-2 text-sm font-medium text-white"
        >
          {createOpen ? "Annuleren" : "Nieuwe gebruiker"}
        </button>
      </div>

      {createOpen ? (
        <form
          className="mt-5 grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void create(new FormData(event.currentTarget));
          }}
        >
          <input name="name" required placeholder="Naam" className="rounded-md border border-black/10 px-3 py-2 text-sm" />
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className="rounded-md border border-black/10 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Wachtwoord (min. 6 tekens)"
            className="rounded-md border border-black/10 px-3 py-2 text-sm"
          />
          <select name="plan" defaultValue="free" className="rounded-md border border-black/10 px-3 py-2 text-sm">
            {PLANS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          <select name="role" defaultValue="user" className="rounded-md border border-black/10 px-3 py-2 text-sm">
            <option value="user">Gebruiker</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={busy === "create"}
            className="rounded-md bg-green px-4 py-2 text-sm font-medium text-white sm:col-span-2"
          >
            {busy === "create" ? "Aanmaken…" : "Account aanmaken"}
          </button>
        </form>
      ) : null}

      {message ? <p className="mt-4 text-sm text-red-700">{message}</p> : null}

      <div className="mt-6 space-y-3">
        {filtered.map((user) => (
          <div key={user.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  user.role === "admin" ? "bg-green/10 text-green" : "bg-black/5 text-ink/70"
                }`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/gebruikers/${user.id}`} className="font-semibold">
                    {user.name}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === "admin" ? "bg-green/10 text-green" : "bg-black/5 text-ink/60"
                    }`}
                  >
                    {user.role === "admin" ? "Admin" : "Klant"}
                  </span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-ink/60">{user.planName}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink/55">{user.email}</p>
                <p className="mt-1 text-xs text-ink/45">
                  {user.magazines} magazine{user.magazines === 1 ? "" : "s"} · {user.views} weergaven · Aangemaakt{" "}
                  {formatDate(user.createdAt)}
                  {user.lastLoginAt ? ` · Laatste login ${formatDate(user.lastLoginAt)}` : " · Nog niet ingelogd"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/gebruikers/${user.id}`}
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                >
                  Beheren
                </Link>
                {user.id !== currentUserId ? (
                  <button
                    type="button"
                    disabled={busy === user.id}
                    onClick={() => void remove(user)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    {busy === user.id ? "…" : "Verwijder"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/50">
            {search ? "Geen gebruikers gevonden." : "Nog geen gebruikers."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
