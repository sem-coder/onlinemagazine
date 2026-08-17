import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAGAZINE_ID_PATTERN, type Magazine } from "@/lib/types";

const ROOT = path.join(process.cwd(), "data", "magazines");

function magazineDir(id: string) {
  if (!MAGAZINE_ID_PATTERN.test(id)) {
    throw new Error("Ongeldig magazine-id");
  }
  return path.join(ROOT, id);
}

export function pdfPath(id: string) {
  return path.join(magazineDir(id), "magazine.pdf");
}

export function coverPath(id: string) {
  return path.join(magazineDir(id), "cover.jpg");
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
    writeFile(
      path.join(dir, "meta.json"),
      JSON.stringify(input.magazine, null, 2),
    ),
  ]);
}

export async function getMagazine(id: string): Promise<Magazine | null> {
  try {
    const raw = await readFile(path.join(magazineDir(id), "meta.json"), "utf8");
    return JSON.parse(raw) as Magazine;
  } catch {
    return null;
  }
}

export async function listMagazines(): Promise<Magazine[]> {
  try {
    const entries = await readdir(ROOT, { withFileTypes: true });
    const magazines = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => getMagazine(entry.name)),
    );
    return magazines
      .filter((magazine): magazine is Magazine => magazine !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function readPdf(id: string) {
  return readFile(pdfPath(id));
}

export async function readCover(id: string) {
  return readFile(coverPath(id));
}
