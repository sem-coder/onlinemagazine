export type ExampleMagazine = {
  slug: string;
  title: string;
  category: string;
  pages: number;
  description: string;
  accent: string;
};

export const EXAMPLES: ExampleMagazine[] = [
  {
    slug: "magazine",
    title: "City Guide 2026",
    category: "Magazine",
    pages: 6,
    description: "Page-flip zoals een gedrukt tijdschrift, met omslag en spread.",
    accent: "#1f7a4d",
  },
  {
    slug: "catalogus",
    title: "Voorjaarscatalogus",
    category: "Catalogus",
    pages: 6,
    description: "Productcatalogus om te embedden in je webshop.",
    accent: "#0f4c81",
  },
  {
    slug: "brochure",
    title: "Projectbrochure",
    category: "Brochure",
    pages: 6,
    description: "Eén pagina per spread — ideaal voor vastgoed en campagnes.",
    accent: "#9c2b1a",
  },
  {
    slug: "menu",
    title: "Restaurantmenu",
    category: "Menu",
    pages: 4,
    description: "Compact, op telefoon en tablet, met QR naar je reservering.",
    accent: "#6b4f2a",
  },
];

export function examplePages(slug: string, count: number) {
  return Array.from({ length: count }, (_, index) => `/examples/${slug}/page-${index + 1}.svg`);
}
