"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SharePanel } from "@/components/SharePanel";
import type { Magazine } from "@/lib/types";
import { canUse } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export function MagazineSettings({ magazine, plan }: { magazine: Magazine; plan: PlanId }) {
  const router = useRouter();
  const [title, setTitle] = useState(magazine.title);
  const [slug, setSlug] = useState(magazine.slug);
  const [leadForm, setLeadForm] = useState(magazine.leadForm);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const response = await fetch(`/api/magazines/${magazine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, leadForm }),
    });
    const data = (await response.json()) as { error?: string; magazine?: Magazine };
    if (!response.ok) {
      setMessage(data.error ?? "Opslaan mislukt");
      return;
    }
    setMessage("Opgeslagen");
    if (data.magazine) setSlug(data.magazine.slug);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Flipbook verwijderen?")) return;
    await fetch(`/api/magazines/${magazine.id}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="font-semibold">Instellingen</h2>
        <label className="block text-sm">
          Titel
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
        </label>
        <label className="block text-sm">
          Eigen URL-slug {canUse(plan, "slug") ? "" : "(Professional)"}
          <input
            value={slug}
            disabled={!canUse(plan, "slug")}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-black/5"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={leadForm}
            disabled={!canUse(plan, "leads")}
            onChange={(e) => setLeadForm(e.target.checked)}
          />
          Leadformulier in de viewer {canUse(plan, "leads") ? "" : "(Professional)"}
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => void save()} className="rounded-md bg-green px-4 py-2 text-sm text-white">
            Opslaan
          </button>
          <button type="button" onClick={() => void remove()} className="rounded-md px-4 py-2 text-sm text-red-700">
            Verwijderen
          </button>
        </div>
        {message ? <p className="text-sm text-ink/60">{message}</p> : null}
      </div>
      <SharePanel magazine={{ ...magazine, title, slug }} />
    </div>
  );
}
