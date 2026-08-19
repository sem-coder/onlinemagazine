import { nanoid } from "nanoid";
import { MAGAZINE_ID_PATTERN, type Lead } from "@/lib/types";
import { getMagazine, listMagazinesForOwner } from "@/lib/magazines";
import { getObject, putObject } from "@/lib/store";

function leadsPath(magazineId: string) {
  if (!MAGAZINE_ID_PATTERN.test(magazineId)) throw new Error("Ongeldig magazine-id");
  return `magazines/${magazineId}/leads.json`;
}

async function readLeads(magazineId: string): Promise<Lead[]> {
  const raw = await getObject(leadsPath(magazineId));
  if (!raw) return [];
  try {
    return JSON.parse(raw.toString("utf8")) as Lead[];
  } catch {
    return [];
  }
}

async function writeLeads(magazineId: string, leads: Lead[]) {
  await putObject(leadsPath(magazineId), JSON.stringify(leads, null, 2), "application/json");
}

export async function addLead(input: { magazineId: string; name: string; email: string }) {
  const magazine = await getMagazine(input.magazineId);
  if (!magazine || !magazine.leadForm) return { error: "Leadformulier staat niet aan.", status: 400 as const };
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "Vul een e-mailadres in.", status: 400 as const };

  const leads = await readLeads(magazine.id);
  if (leads.some((lead) => lead.email === email)) {
    return { lead: leads.find((lead) => lead.email === email)!, duplicate: true };
  }
  const lead: Lead = {
    id: nanoid(10),
    magazineId: magazine.id,
    name: input.name.trim(),
    email,
    createdAt: new Date().toISOString(),
  };
  await writeLeads(magazine.id, [lead, ...leads]);
  return { lead, duplicate: false };
}

export async function listLeadsForMagazine(magazineId: string) {
  return readLeads(magazineId);
}

export async function listLeadsForOwner(ownerId: string) {
  const magazines = await listMagazinesForOwner(ownerId);
  const groups = await Promise.all(
    magazines.map(async (magazine) => {
      const leads = await readLeads(magazine.id);
      return leads.map((lead) => ({ ...lead, magazineTitle: magazine.title, magazineSlug: magazine.slug }));
    }),
  );
  return groups.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
