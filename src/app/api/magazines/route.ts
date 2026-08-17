import { NextResponse } from "next/server";
import { actorId, getSessionUser } from "@/lib/auth";
import { listMagazinesForOwner, saveMagazine, uniqueSlug } from "@/lib/magazines";
import { getPlan } from "@/lib/plans";
import { GUEST_TTL_DAYS, MAX_PAGES, MAX_PDF_BYTES, type Magazine } from "@/lib/types";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const ownerId = await actorId();
  const magazines = await listMagazinesForOwner(ownerId);
  return NextResponse.json({ magazines });
}

export async function POST(request: Request) {
  const ownerId = await actorId();
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
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) {
    return NextResponse.json({ error: "Ongeldig aantal pagina's." }, { status: 400 });
  }

  const pdfBuffer = Buffer.from(await pdf.arrayBuffer());
  if (!pdfBuffer.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
    return NextResponse.json({ error: "Dit lijkt geen geldige PDF." }, { status: 400 });
  }

  const id = nanoid(10);
  const expiresAt = user
    ? null
    : new Date(Date.now() + GUEST_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
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
    expiresAt,
  };

  await saveMagazine({
    id,
    magazine,
    pdf: pdfBuffer,
    cover: Buffer.from(await cover.arrayBuffer()),
  });

  return NextResponse.json({ magazine });
}
