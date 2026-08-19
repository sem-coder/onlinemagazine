"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminUserRow } from "@/lib/admin";
import { PLANS } from "@/lib/plans";
import type { Magazine, PlanId, UserRole } from "@/lib/types";

export function AdminUserEditor({
  user,
  magazines,
  currentUserId,
}: {
  user: AdminUserRow;
  magazines: Magazine[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [plan, setPlan] = useState<PlanId>(user.plan);
  const [role, setRole] = useState<UserRole>(user.role);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        plan,
        role,
        password: password || undefined,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Opslaan mislukt.");
      return;
    }
    setPassword("");
    setMessage("Opgeslagen.");
    router.refresh();
  }

  async function removeUser() {
    if (!confirm(`Account van ${user.name} verwijderen inclusief alle magazines?`)) return;
    setBusy(true);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setBusy(false);
      setMessage(data.error ?? "Verwijderen mislukt.");
      return;
    }
    router.push("/admin/gebruikers");
    router.refresh();
  }

  async function removeMagazine(id: string, title: string) {
    if (!confirm(`Magazine “${title}” verwijderen?`)) return;
    const response = await fetch(`/api/admin/magazines/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Magazine verwijderen mislukt.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="font-semibold">Account</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Naam
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
          <label className="block text-sm">
            Plan
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value as PlanId)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            >
              {PLANS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Rol
            <select
              value={role}
              disabled={user.id === currentUserId}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="mt-1 w-full rounded-md border px-3 py-2 disabled:opacity-60"
            >
              <option value="user">Klant</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="block text-sm">
            Nieuw wachtwoord
            <input
              type="password"
              value={password}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leeg laten om te behouden"
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
        </div>
        {message ? (
          <p className={`mt-3 text-sm ${message === "Opgeslagen." ? "text-ink/60" : "text-red-700"}`}>{message}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-md bg-green px-4 py-2 text-sm font-medium text-white"
          >
            {busy ? "Opslaan…" : "Opslaan"}
          </button>
          {user.id !== currentUserId ? (
            <button type="button" disabled={busy} onClick={() => void removeUser()} className="rounded-md px-4 py-2 text-sm text-red-700">
              Account verwijderen
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="font-semibold">Magazines</h2>
        {magazines.length === 0 ? (
          <p className="mt-2 text-sm text-ink/55">Nog geen magazines.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5">
            {magazines.map((magazine) => (
              <li key={magazine.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{magazine.title}</p>
                  <p className="text-ink/50">
                    {magazine.views} weergaven · /v/{magazine.slug}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href={`/v/${magazine.slug}`} className="text-green">
                    Openen
                  </Link>
                  <button
                    type="button"
                    onClick={() => void removeMagazine(magazine.id, magazine.title)}
                    className="text-red-700"
                  >
                    Verwijderen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
