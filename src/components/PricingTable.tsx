"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";

export function PricingTable({ ctaHref = "/signup" }: { ctaHref?: string }) {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full bg-black/5 p-1 text-sm">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-1.5 ${yearly ? "text-ink/60" : "bg-white shadow"}`}
          >
            Maandelijks
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`rounded-full px-4 py-1.5 ${yearly ? "bg-white shadow" : "text-ink/60"}`}
          >
            Jaarlijks · 20% korting
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = yearly ? Math.round(plan.yearly / 12) : plan.monthly;
          return (
            <article
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-white p-6 ${
                plan.highlight ? "border-green shadow-lg shadow-green/10" : "border-black/8"
              }`}
            >
              {plan.highlight ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green">Meest gekozen</p>
              ) : null}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 min-h-12 text-sm text-ink/60">{plan.blurb}</p>
              <p className="mt-5 font-semibold">
                <span className="text-4xl">€{price}</span>
                <span className="text-sm font-normal text-ink/50"> / maand</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink/75">
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <Link
                href={`${ctaHref}?plan=${plan.id}`}
                className={`mt-6 rounded-full py-2.5 text-center text-sm font-medium ${
                  plan.highlight ? "bg-green text-white" : "bg-ink text-white"
                }`}
              >
                {plan.id === "free" ? "Gratis starten" : "Kies dit plan"}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
