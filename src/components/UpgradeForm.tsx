"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export function UpgradeForm({ current }: { current: PlanId }) {
  const router = useRouter();
  const params = useSearchParams();
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanId) {
    if (plan === "free") return;
    setError(null);
    const response = await fetch("/api/billing/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    });
    const data = (await response.json()) as { error?: string; amount?: number };
    if (!response.ok) {
      setError(data.error ?? "Upgrade mislukt");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const selected = (params.get("plan") as PlanId) || current;

  return (
    <div>
      <div className="mb-6 inline-flex rounded-full bg-black/5 p-1 text-sm">
        <button type="button" onClick={() => setInterval("monthly")} className={`rounded-full px-3 py-1 ${interval === "monthly" ? "bg-white" : ""}`}>
          Maandelijks
        </button>
        <button type="button" onClick={() => setInterval("yearly")} className={`rounded-full px-3 py-1 ${interval === "yearly" ? "bg-white" : ""}`}>
          Jaarlijks
        </button>
      </div>
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.filter((plan) => plan.id !== "free").map((plan) => {
          const price = interval === "yearly" ? Math.round(plan.yearly / 12) : plan.monthly;
          return (
            <article key={plan.id} className={`rounded-2xl border bg-white p-5 ${selected === plan.id ? "border-green" : "border-black/10"}`}>
              <h2 className="font-semibold">{plan.name}</h2>
              <p className="mt-2 text-3xl font-semibold">€{price}</p>
              <p className="text-sm text-ink/50">per maand, {interval === "yearly" ? `€${plan.yearly} per jaar` : "maandelijks opgezegd"}</p>
              <ul className="mt-4 space-y-1 text-sm text-ink/70">
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void choose(plan.id)}
                className="mt-5 w-full rounded-full bg-green py-2 text-sm text-white"
              >
                Activeer {plan.name}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
