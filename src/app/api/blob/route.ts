import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { blobEnabled } from "@/lib/store";
import { MAGAZINE_ID_PATTERN, MAX_PDF_BYTES } from "@/lib/types";

export const runtime = "nodejs";

const BLOB_PATH = new RegExp(
  `^magazines/${MAGAZINE_ID_PATTERN.source.slice(1, -1)}/(magazine\\.pdf|cover\\.jpg)$`,
);

export async function GET() {
  return NextResponse.json({ enabled: blobEnabled() });
}

export async function POST(request: Request) {
  if (!blobEnabled()) {
    return NextResponse.json({ error: "Bestandopslag is niet geconfigureerd." }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!BLOB_PATH.test(pathname)) {
          throw new Error("Ongeldig uploadpad.");
        }
        return {
          allowedContentTypes: ["application/pdf", "image/jpeg", "application/octet-stream"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload token mislukt." },
      { status: 400 },
    );
  }
}
