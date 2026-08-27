"use client";

import { useMemo, useState } from "react";
import type { Magazine } from "@/lib/types";

export function shareUrl(magazine: Magazine, origin: string) {
  return `${origin}/v/${magazine.slug || magazine.id}`;
}

export function embedCode(magazine: Magazine, origin: string) {
  const src = `${origin}/embed/${magazine.slug || magazine.id}`;
  const title = magazine.title.replace(/"/g, "&quot;");
  return `<div style="position:relative;width:100%;height:0;padding-top:max(640px,62.5%);overflow:hidden;background:#1b1d1c;"><iframe src="${src}" title="${title}" allow="fullscreen" allowfullscreen webkitallowfullscreen style="position:absolute;top:0;left:0;width:100% !important;height:100% !important;max-height:none !important;border:0;background:#1b1d1c;"></iframe></div>`;
}

export function SharePanel({
  magazine,
  canDownload = false,
}: {
  magazine: Magazine;
  canDownload?: boolean;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = useMemo(
    () => shareUrl(magazine, origin || "https://onlinemagazine.vercel.app"),
    [magazine, origin],
  );
  const iframe = useMemo(
    () => embedCode(magazine, origin || "https://onlinemagazine.vercel.app"),
    [magazine, origin],
  );
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(link)}`;
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  async function copy(kind: "link" | "embed") {
    await navigator.clipboard.writeText(kind === "link" ? link : iframe);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="grid gap-5 rounded-2xl border border-black/8 bg-white p-5">
      <div>
        <p className="text-sm font-semibold">Publieke link</p>
        <p className="mt-1 text-sm text-ink/60">Zet deze URL op je site, in een mail of op socials.</p>
        <div className="mt-3 flex gap-2">
          <input readOnly value={link} className="min-w-0 flex-1 rounded-md border border-black/10 px-3 py-2 text-sm" />
          <button type="button" onClick={() => void copy("link")} className="rounded-md bg-green px-3 py-2 text-sm text-white">
            {copied === "link" ? "Gekopieerd" : "Kopieer"}
          </button>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">QR-code</p>
        <p className="mt-1 text-sm text-ink/60">Scan om het magazine te openen.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR-code voor ${magazine.title}`} className="mt-3 h-40 w-40 rounded-md bg-white p-2 ring-1 ring-black/10" />
        <a href={qr} download={`${magazine.slug}-qr.png`} className="mt-2 inline-block text-sm text-green">
          Download QR
        </a>
      </div>
      <div>
        <p className="text-sm font-semibold">Embed op je website</p>
        <p className="mt-1 text-sm text-ink/60">
          Kopieer de hele code, inclusief de buitenste div. Plak in een HTML-blok, niet in het iframe-blok van WordPress.
          Bezoekers kunnen het magazine dan full screen openen.
        </p>
        <textarea readOnly value={iframe} rows={6} className="mt-3 w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs" />
        <button type="button" onClick={() => void copy("embed")} className="mt-2 rounded-md bg-ink px-3 py-2 text-sm text-white">
          {copied === "embed" ? "Gekopieerd" : "Kopieer embed-code"}
        </button>
      </div>
      {canDownload ? (
        <div>
          <p className="text-sm font-semibold">Download PDF</p>
          <p className="mt-1 text-sm text-ink/60">De originele brochure, zonder conversie.</p>
          <a
            href={`/api/magazines/${magazine.id}/pdf?download=1`}
            className="mt-3 inline-flex rounded-md bg-ink px-3 py-2 text-sm text-white"
          >
            Download PDF
          </a>
        </div>
      ) : null}
    </div>
  );
}
