import { del, get, list, put } from "@vercel/blob";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data");

export function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>) {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

export async function putObject(
  pathname: string,
  body: Buffer | string,
  contentType: string,
): Promise<string> {
  if (blobEnabled()) {
    const blob = await put(pathname, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return blob.url;
  }

  const file = path.join(ROOT, pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return pathname;
}

export async function getObject(pathname: string): Promise<Buffer | null> {
  if (blobEnabled()) {
    try {
      const result = await get(pathname, { access: "public", useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return streamToBuffer(result.stream);
    } catch {
      return null;
    }
  }

  try {
    return await readFile(path.join(ROOT, pathname));
  } catch {
    return null;
  }
}

export async function deletePrefix(prefix: string) {
  if (blobEnabled()) {
    const { blobs } = await list({ prefix, limit: 100 });
    if (blobs.length) await del(blobs.map((blob) => blob.url));
    return;
  }

  await rm(path.join(ROOT, prefix), { recursive: true, force: true });
}

export async function listObjectUrls(prefix: string) {
  if (blobEnabled()) {
    const { blobs } = await list({ prefix, limit: 1000 });
    return blobs.map((blob) => ({ pathname: blob.pathname, url: blob.url }));
  }

  const dir = path.join(ROOT, prefix);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        pathname: path.posix.join(prefix.replace(/\/$/, ""), entry.name, "meta.json"),
        url: "",
      }));
  } catch {
    return [];
  }
}
