"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TeamMember } from "@/lib/types";

export function TeamForm({
  members,
  seats,
  isMember,
}: {
  members: TeamMember[];
  seats: number;
  isMember: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const used = 1 + members.length;

  async function invite() {
    setMessage(null);
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Uitnodigen mislukt");
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function remove(memberEmail: string) {
    await fetch("/api/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink/60">
        {used}/{seats} gebruikers. Nieuwe leden loggen in of maken een account met hetzelfde e-mailadres.
      </p>
      {isMember ? (
        <p className="text-sm text-ink/60">Alleen de eigenaar kan mensen uitnodigen.</p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void invite();
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nina.v@example.com"
            className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-green px-4 py-2 text-sm text-white">
            Uitnodigen
          </button>
        </form>
      )}
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
      <ul className="divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
        {members.length === 0 ? (
          <li className="p-4 text-sm text-ink/55">Nog geen extra gebruikers.</li>
        ) : (
          members.map((member) => (
            <li key={member.email} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{member.email}</p>
                <p className="text-ink/50">{member.userId ? "Account gekoppeld" : "Wacht op registratie"}</p>
              </div>
              {isMember ? null : (
                <button type="button" onClick={() => void remove(member.email)} className="text-red-700">
                  Verwijderen
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
