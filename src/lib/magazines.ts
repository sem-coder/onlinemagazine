import { MAGAZINE_ID_PATTERN, type Magazine } from "@/lib/types";
import { blobEnabled, deletePrefix, getObject, listObjectUrls, putObject } from "@/lib/store";
import { leadFormFields } from "@/lib/lead-form";

function magazinePrefix(id: string) {
  if (!MAGAZINE_ID_PATTERN.test(id)) throw new Error("Ongeldig magazine-id");
  return `magazines/${id}`;
}

function metaPath(id: string) {
  return `${magazinePrefix(id)}/meta.json`;
}

function pdfObjectPath(id: string) {
  return `${magazinePrefix(id)}/magazine.pdf`;
}

function coverObjectPath(id: string) {
  return `${magazinePrefix(id)}/cover.jpg`;
}

export function slugify(input: string) {
  const slug = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "magazine";
}

function normalizeMagazine(raw: Partial<Magazine> & { id: string }): Magazine {
  return {
    id: raw.id,
    slug: raw.slug || raw.id,
    title: raw.title || "Magazine",
    originalName: raw.originalName || "magazine.pdf",
    pageCount: raw.pageCount || 1,
    pageWidth: raw.pageWidth || 595,
    pageHeight: raw.pageHeight || 842,
    createdAt: raw.createdAt || new Date().toISOString(),
    ownerId: raw.ownerId || "guest",
    views: raw.views ?? 0,
    viewsByDay: raw.viewsByDay ?? {},
    public: raw.public ?? true,
    ...leadFormFields(raw),
    expiresAt: raw.expiresAt ?? null,
    pdfUrl: raw.pdfUrl ?? null,
    coverUrl: raw.coverUrl ?? null,
    bytes: raw.bytes ?? 0,
  };
}

export async function saveMagazine(input: {
  id: string;
  magazine: Magazine;
  pdf?: Buffer;
  cover?: Buffer;
}) {
  if (input.pdf) {
    const url = await putObject(pdfObjectPath(input.id), input.pdf, "application/pdf");
    if (blobEnabled()) input.magazine.pdfUrl = url;
  }
  if (input.cover) {
    const url = await putObject(coverObjectPath(input.id), input.cover, "image/jpeg");
    if (blobEnabled()) input.magazine.coverUrl = url;
  }
  if (blobEnabled() && !input.magazine.pdfUrl) {
    throw new Error("PDF-url ontbreekt.");
  }
  await writeMeta(input.magazine);
}

export async function writeMeta(magazine: Magazine) {
  await putObject(metaPath(magazine.id), JSON.stringify(magazine, null, 2), "application/json");
}

export async function getMagazine(id: string): Promise<Magazine | null> {
  try {
    if (!MAGAZINE_ID_PATTERN.test(id)) return null;
    const raw = await getObject(metaPath(id));
    if (!raw) return null;
    return normalizeMagazine(JSON.parse(raw.toString("utf8")) as Partial<Magazine> & { id: string });
  } catch {
    return null;
  }
}

export async function getMagazineBySlugOrId(idOrSlug: string) {
  const direct = await getMagazine(idOrSlug);
  if (direct) return direct;
  const all = await listMagazines();
  return all.find((magazine) => magazine.slug === idOrSlug) ?? null;
}

export async function listMagazines(): Promise<Magazine[]> {
  const objects = await listObjectUrls("magazines/");
  const metaFiles = objects.filter((item) => item.pathname.endsWith("/meta.json"));
  const magazines = await Promise.all(
    metaFiles.map(async (item) => {
      if (item.url) {
        try {
          const response = await fetch(item.url, { cache: "no-store" });
          if (!response.ok) return null;
          return normalizeMagazine((await response.json()) as Partial<Magazine> & { id: string });
        } catch {
          return null;
        }
      }
      const id = item.pathname.split("/")[1];
      return id ? getMagazine(id) : null;
    }),
  );
  return magazines
    .filter((magazine): magazine is Magazine => magazine !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listMagazinesForOwner(ownerId: string) {
  return (await listMagazines()).filter((magazine) => magazine.ownerId === ownerId);
}

export async function slugTaken(slug: string, exceptId?: string) {
  const all = await listMagazines();
  return all.some((magazine) => magazine.slug === slug && magazine.id !== exceptId);
}

export async function uniqueSlug(base: string, exceptId?: string) {
  let slug = slugify(base);
  let n = 2;
  while (await slugTaken(slug, exceptId)) {
    slug = `${slugify(base)}-${n}`;
    n += 1;
  }
  return slug;
}

export async function bumpViews(id: string) {
  const magazine = await getMagazine(id);
  if (!magazine) return;
  const day = new Date().toISOString().slice(0, 10);
  const viewsByDay = { ...magazine.viewsByDay };
  viewsByDay[day] = (viewsByDay[day] ?? 0) + 1;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const minDay = cutoff.toISOString().slice(0, 10);
  for (const key of Object.keys(viewsByDay)) {
    if (key < minDay) delete viewsByDay[key];
  }
  magazine.views += 1;
  magazine.viewsByDay = viewsByDay;
  await writeMeta(magazine);
}

export function usedStorageBytes(magazines: { bytes?: number }[]) {
  return magazines.reduce((sum, magazine) => sum + (magazine.bytes ?? 0), 0);
}

export async function deleteMagazine(id: string, ownerId: string) {
  const magazine = await getMagazine(id);
  if (!magazine || magazine.ownerId !== ownerId) return false;
  await deletePrefix(magazinePrefix(id));
  return true;
}

export async function readPdf(id: string) {
  const magazine = await getMagazine(id);
  if (magazine?.pdfUrl) {
    const response = await fetch(magazine.pdfUrl);
    if (!response.ok) throw new Error("PDF niet gevonden");
    return Buffer.from(await response.arrayBuffer());
  }
  const pdf = await getObject(pdfObjectPath(id));
  if (!pdf) throw new Error("PDF niet gevonden");
  return pdf;
}

export async function readCover(id: string) {
  const magazine = await getMagazine(id);
  if (magazine?.coverUrl) {
    const response = await fetch(magazine.coverUrl);
    if (!response.ok) throw new Error("Cover niet gevonden");
    return Buffer.from(await response.arrayBuffer());
  }
  const cover = await getObject(coverObjectPath(id));
  if (!cover) throw new Error("Cover niet gevonden");
  return cover;
}

export async function claimGuestMagazines(guestId: string, userId: string) {
  const magazines = await listMagazinesForOwner(guestId);
  await Promise.all(
    magazines.map((magazine) => writeMeta({ ...magazine, ownerId: userId, expiresAt: null })),
  );
  return magazines.length;
}
