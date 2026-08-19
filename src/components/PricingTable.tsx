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
      <div className="grid items-stretch gap-4 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = yearly ? Math.round(plan.yearly / 12) : plan.monthly;
          return (
            <article
              key={plan.id}
              className={`flex h-full flex-col rounded-2xl border bg-white p-6 ${
                plan.highlight ? "border-green shadow-lg shadow-green/10" : "border-black/8"
              }`}
            >
              <p className="h-5 text-xs font-semibold uppercase tracking-wide text-green">
                {plan.highlight ? "Meest gekozen" : "\u00a0"}
              </p>
              <h3 className="mt-1 text-lg font-semibold leading-7">{plan.name}</h3>
              <p className="mt-1 line-clamp-2 h-10 text-sm leading-5 text-ink/60">{plan.blurb}</p>
              <p className="mt-5 flex h-12 items-baseline gap-1 font-semibold">
                <span className="text-4xl leading-none">€{price}</span>
                <span className="text-sm font-normal text-ink/50"> / maand</span>
              </p>
              <ul className="mt-5 mb-6 flex-1 space-y-2 text-sm leading-5 text-ink/75">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="w-4 shrink-0 text-center">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`${ctaHref}?plan=${plan.id}`}
                className={`mt-auto block rounded-full py-2.5 text-center text-sm font-medium ${
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
