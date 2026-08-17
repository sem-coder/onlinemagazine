import { NextResponse } from "next/server";
import { actorId, getSessionUser } from "@/lib/auth";
import { getMagazine, listMagazinesForOwner, saveMagazine, uniqueSlug } from "@/lib/magazines";
import { getPlan } from "@/lib/plans";
import { blobEnabled } from "@/lib/store";
import { GUEST_TTL_DAYS, MAGAZINE_ID_PATTERN, MAX_PAGES, MAX_PDF_BYTES, type Magazine } from "@/lib/types";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 60;

function isBlobFileUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

async function enforceQuota(ownerId: string) {
  const user = await getSessionUser();
  const plan = getPlan(user?.plan ?? "free");
  const existing = await listMagazinesForOwner(ownerId);
  if (plan.flipbooks !== null && existing.length >= plan.flipbooks) {
    return NextResponse.json(
      {
        error: `Je ${plan.name}-plan staat max. ${plan.flipbooks} flipbooks toe. Upgrade om meer te publiceren.`,
        upgrade: true,
      },
      { status: 402 },
    );
  }
  return null;
}

function guestExpiry(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return user ? null : new Date(Date.now() + GUEST_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  const ownerId = await actorId();
  const magazines = await listMagazinesForOwner(ownerId);
  return NextResponse.json({ magazines });
}

export async function POST(request: Request) {
  const ownerId = await actorId();
  const quota = await enforceQuota(ownerId);
  if (quota) return quota;
  const user = await getSessionUser();

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      id?: string;
      pdfUrl?: string;
      coverUrl?: string;
      title?: string;
      originalName?: string;
      pageCount?: number;
      pageWidth?: number;
      pageHeight?: number;
    };

    const id = body.id ?? "";
    if (!MAGAZINE_ID_PATTERN.test(id)) {
      return NextResponse.json({ error: "Ongeldig magazine-id." }, { status: 400 });
    }
    if (await getMagazine(id)) {
      return NextResponse.json({ error: "Dit magazine bestaat al." }, { status: 409 });
    }
    if (!body.pdfUrl || !isBlobFileUrl(body.pdfUrl) || !body.coverUrl || !isBlobFileUrl(body.coverUrl)) {
      return NextResponse.json({ error: "PDF-upload is onvolledig." }, { status: 400 });
    }
    if (!Number.isInteger(body.pageCount) || !body.pageCount || body.pageCount < 1 || body.pageCount > MAX_PAGES) {
      return NextResponse.json({ error: "Ongeldig aantal pagina's." }, { status: 400 });
    }

    const originalName = String(body.originalName ?? "magazine.pdf");
    const title = String(body.title ?? "").trim();
    const magazine: Magazine = {
      id,
      slug: await uniqueSlug(title || originalName),
      title: title || originalName.replace(/\.pdf$/i, ""),
      originalName,
      pageCount: body.pageCount,
      pageWidth: Number(body.pageWidth) || 595,
      pageHeight: Number(body.pageHeight) || 842,
      createdAt: new Date().toISOString(),
      ownerId,
      views: 0,
      public: true,
      leadForm: false,
      expiresAt: guestExpiry(user),
      pdfUrl: body.pdfUrl,
      coverUrl: body.coverUrl,
    };
    await saveMagazine({ id, magazine });
    return NextResponse.json({ magazine });
  }

  const form = await request.formData();
  const pdf = form.get("pdf");
  const cover = form.get("cover");
  const title = String(form.get("title") ?? "").trim();
  const originalName = String(form.get("originalName") ?? "magazine.pdf");
  const pageCount = Number(form.get("pageCount"));
  const pageWidth = Number(form.get("pageWidth"));
  const pageHeight = Number(form.get("pageHeight"));

  if (!(pdf instanceof File)) {
    return NextResponse.json({ error: "Upload een PDF-bestand." }, { status: 400 });
  }
  if (!(cover instanceof File)) {
    return NextResponse.json({ error: "Cover ontbreekt." }, { status: 400 });
  }
  if (pdf.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF is groter dan 40 MB." }, { status: 400 });
  }
  if (blobEnabled()) {
    return NextResponse.json(
      { error: "Upload via de pagina, niet als formulier." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) {
    return NextResponse.json({ error: "Ongeldig aantal pagina's." }, { status: 400 });
  }

  const pdfBuffer = Buffer.from(await pdf.arrayBuffer());
  if (!pdfBuffer.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
    return NextResponse.json({ error: "Dit lijkt geen geldige PDF." }, { status: 400 });
  }

  const id = nanoid(10);
  const magazine: Magazine = {
    id,
    slug: await uniqueSlug(title || originalName),
    title: title || originalName.replace(/\.pdf$/i, ""),
    originalName,
    pageCount,
    pageWidth,
    pageHeight,
    createdAt: new Date().toISOString(),
    ownerId,
    views: 0,
    public: true,
    leadForm: false,
    expiresAt: guestExpiry(user),
  };

  await saveMagazine({
    id,
    magazine,
    pdf: pdfBuffer,
    cover: Buffer.from(await cover.arrayBuffer()),
  });

  return NextResponse.json({ magazine });
}
