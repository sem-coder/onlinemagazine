import { NextResponse } from "next/server";
import { actorId, getSessionUser, workspaceUser } from "@/lib/auth";
import { getMagazine, listMagazinesForOwner, saveMagazine, uniqueSlug, usedStorageBytes } from "@/lib/magazines";
import { canUse, getPlan, storageLimitBytes } from "@/lib/plans";
import { blobEnabled } from "@/lib/store";
import { leadFormFields } from "@/lib/lead-form";
import { GUEST_TTL_DAYS, MAGAZINE_ID_PATTERN, MAX_FLIP_PAGES, MAX_PDF_BYTES, type Magazine } from "@/lib/types";
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

async function enforceQuota(ownerId: string, extraBytes = 0) {
  const space = await workspaceUser();
  const plan = getPlan(space?.owner.plan ?? "free");
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
  const used = usedStorageBytes(existing);
  if (used + extraBytes > storageLimitBytes(plan.storageGb)) {
    return NextResponse.json(
      {
        error: `Je ${plan.name}-plan heeft ${plan.storageGb} GB opslag. Upgrade voor meer ruimte.`,
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

async function defaultLeadFields() {
  const space = await workspaceUser();
  return leadFormFields({ leadForm: canUse(space?.owner.plan ?? "free", "leads") });
}

export async function GET() {
  const ownerId = await actorId();
  const magazines = await listMagazinesForOwner(ownerId);
  return NextResponse.json({ magazines });
}

export async function POST(request: Request) {
  const ownerId = await actorId();
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
      bytes?: number;
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
    if (!Number.isInteger(body.pageCount) || !body.pageCount || body.pageCount < 1 || body.pageCount > MAX_FLIP_PAGES) {
      return NextResponse.json({ error: "Ongeldig aantal pagina's." }, { status: 400 });
    }

    const bytes = Math.max(0, Number(body.bytes) || 0);
    const quota = await enforceQuota(ownerId, bytes);
    if (quota) return quota;

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
      viewsByDay: {},
      public: true,
      ...await defaultLeadFields(),
      expiresAt: guestExpiry(user),
      pdfUrl: body.pdfUrl,
      coverUrl: body.coverUrl,
      bytes,
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
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_FLIP_PAGES) {
    return NextResponse.json({ error: "Ongeldig aantal pagina's." }, { status: 400 });
  }

  const quota = await enforceQuota(ownerId, pdf.size);
  if (quota) return quota;

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
    viewsByDay: {},
    public: true,
    ...await defaultLeadFields(),
    expiresAt: guestExpiry(user),
    bytes: pdf.size,
  };

  await saveMagazine({
    id,
    magazine,
    pdf: pdfBuffer,
    cover: Buffer.from(await cover.arrayBuffer()),
  });

  return NextResponse.json({ magazine });
}
