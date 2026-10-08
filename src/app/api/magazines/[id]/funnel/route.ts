import { NextResponse } from "next/server";
import { recordFunnelPing } from "@/lib/funnel";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { sessionId?: string; page?: number; done?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige data." }, { status: 400 });
  }

  const result = await recordFunnelPing({
    magazineId: id,
    sessionId: String(body.sessionId ?? ""),
    page: Number(body.page),
    done: Boolean(body.done),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
