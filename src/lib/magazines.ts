import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAGAZINE_ID_PATTERN, type Magazine } from "@/lib/types";

const ROOT = path.join(process.cwd(), "data", "magazines");

function magazineDir(id: string) {
  if (!MAGAZINE_ID_PATTERN.test(id)) throw new Error("Ongeldig magazine-id");
  return path.join(ROOT, id);
}

export function pdfPath(id: string) {
  return path.join(magazineDir(id), "magazine.pdf");
}

export function coverPath(id: string) {
  return path.join(magazineDir(id), "cover.jpg");
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

export async function saveMagazine(input: {
  id: string;
  magazine: Magazine;
  pdf: Buffer;
  cover: Buffer;
}) {
  const dir = magazineDir(input.id);
  await mkdir(dir, { recursive: true });
  await Promise.all([
    writeFile(pdfPath(input.id), input.pdf),
    writeFile(coverPath(input.id), input.cover),
    writeFile(path.join(dir, "meta.json"), JSON.stringify(input.magazine, null, 2)),
  ]);
}

export async function writeMeta(magazine: Magazine) {
  await writeFile(
    path.join(magazineDir(magazine.id), "meta.json"),
    JSON.stringify(magazine, null, 2),
  );
}

export async function getMagazine(id: string): Promise<Magazine | null> {
  try {
    const raw = await readFile(path.join(magazineDir(id), "meta.json"), "utf8");
    const magazine = JSON.parse(raw) as Partial<Magazine> & { id: string };
    return {
      id: magazine.id,
      slug: magazine.slug || magazine.id,
      title: magazine.title || "Magazine",
      originalName: magazine.originalName || "magazine.pdf",
      pageCount: magazine.pageCount || 1,
      pageWidth: magazine.pageWidth || 595,
      pageHeight: magazine.pageHeight || 842,
      createdAt: magazine.createdAt || new Date().toISOString(),
      ownerId: magazine.ownerId || "guest",
      views: magazine.views ?? 0,
      public: magazine.public ?? true,
      leadForm: magazine.leadForm ?? false,
      expiresAt: magazine.expiresAt ?? null,
    };
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
  try {
    const entries = await readdir(ROOT, { withFileTypes: true });
    const magazines = await Promise.all(
      entries.filter((entry) => entry.isDirectory()).map((entry) => getMagazine(entry.name)),
    );
    return magazines
      .filter((magazine): magazine is Magazine => magazine !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
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
  magazine.views += 1;
  await writeMeta(magazine);
}

export async function deleteMagazine(id: string, ownerId: string) {
  const magazine = await getMagazine(id);
  if (!magazine || magazine.ownerId !== ownerId) return false;
  await rm(magazineDir(id), { recursive: true, force: true });
  return true;
}

export async function readPdf(id: string) {
  return readFile(pdfPath(id));
}

export async function readCover(id: string) {
  return readFile(coverPath(id));
}

export async function claimGuestMagazines(guestId: string, userId: string) {
  const magazines = await listMagazinesForOwner(guestId);
  await Promise.all(
    magazines.map((magazine) =>
      writeMeta({ ...magazine, ownerId: userId, expiresAt: null }),
    ),
  );
  return magazines.length;
}
