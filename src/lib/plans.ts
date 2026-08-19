import type { PlanId } from "@/lib/types";

export type Plan = {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  blurb: string;
  flipbooks: number | null;
  storageGb: number;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratis",
    monthly: 0,
    yearly: 0,
    blurb: "Publiceer je eerste magazines en deel ze meteen.",
    flipbooks: 5,
    storageGb: 1,
    features: [
      "5 flipbooks",
      "Deelbare link",
      "Embed op je website",
      "Onbeperkt pagina’s",
      "Folio-branding in de viewer",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    monthly: 3,
    yearly: 29,
    blurb: "Voor winkels en merken die professioneel willen delen.",
    flipbooks: null,
    storageGb: 10,
    highlight: true,
    features: [
      "Onbeperkt flipbooks",
      "Geen Folio-branding",
      "Embed + QR + download",
      "10 GB opslag",
      "3 gebruikers later",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    monthly: 5,
    yearly: 48,
    blurb: "Meet wat lezers doen en vang leads vanuit je catalogus.",
    flipbooks: null,
    storageGb: 20,
    features: [
      "Alles in Standard",
      "Lezersstatistieken",
      "Leadformulier in het magazine",
      "Eigen URL-slug",
      "20 GB opslag",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 9,
    yearly: 86,
    blurb: "White-label voor bureaus en grote catalogs.",
    flipbooks: null,
    storageGb: 40,
    features: [
      "Alles in Professional",
      "Boekenkast / overzichtspagina",
      "Eigen domein (binnenkort)",
      "Prioriteit support",
      "40 GB opslag",
    ],
  },
];

export function getPlan(id: PlanId) {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

export function canUse(plan: PlanId, feature: "brandingOff" | "stats" | "leads" | "slug" | "download") {
  const rank: Record<PlanId, number> = {
    free: 0,
    standard: 1,
    professional: 2,
    premium: 3,
  };
  const need: Record<typeof feature, number> = {
    download: 1,
    brandingOff: 1,
    slug: 2,
    stats: 2,
    leads: 2,
  };
  return rank[plan] >= need[feature];
}
