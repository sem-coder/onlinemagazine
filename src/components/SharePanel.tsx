"use client";

import { useMemo, useState } from "react";
import { CoverMockupDownload } from "@/components/CoverMockupDownload";
import { PromoDownload } from "@/components/PromoDownload";
import type { Magazine } from "@/lib/types";

export function shareUrl(magazine: Magazine, origin: string) {
  return `${origin}/v/${magazine.slug || magazine.id}`;
}

function wrapStyle(magazine: Magazine) {
  const portrait = magazine.pageWidth < magazine.pageHeight;
  if (portrait) {
    return "position:relative;width:100%;height:0;padding-top:130%;min-height:620px;overflow:hidden;background:#1b1d1c;";
  }
  return "position:relative;width:100%;height:0;padding-top:62.5%;min-height:420px;overflow:hidden;background:#1b1d1c;";
}

export function embedCode(magazine: Magazine, origin: string) {
  const src = `${origin}/embed/${magazine.slug || magazine.id}`;
  const title = magazine.title.replace(/"/g, "&quot;");
  const id = `pdfm-${String(magazine.slug || magazine.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rest = wrapStyle(magazine);
  return `<div id="${id}-wrap" data-pdfm-wrap="1" style="${rest}"><iframe id="${id}" src="${src}" title="${title}" allow="fullscreen *" allowfullscreen webkitallowfullscreen mozallowfullscreen style="position:absolute;top:0;left:0;width:100% !important;height:100% !important;max-height:none !important;border:0;background:#1b1d1c;"></iframe><button type="button" data-pdfm-fs="${id}" aria-label="Volledig scherm" style="position:absolute;top:12px;right:12px;z-index:2147483647;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.55);color:#f4f6f5;border-radius:999px;padding:6px 12px;font:12px/1.2 system-ui,sans-serif;cursor:pointer;">Volledig scherm</button></div>
<script src="${origin}/embed.js"></script>`;
}

export function SharePanel({
  magazine,
  canDownload = false,
  showPromo = true,
}: {
  magazine: Magazine;
  canDownload?: boolean;
  showPromo?: boolean;
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
  const portrait = magazine.pageWidth < magazine.pageHeight;

  async function copy(kind: "link" | "embed") {
    await navigator.clipboard.writeText(kind === "link" ? link : iframe);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="grid gap-5 rounded-2xl border border-black/8 bg-white p-5">
      <div>
        <p className="text-sm font-semibold">Publieke link</p>
        <p className="mt-1 text-sm text-ink/60">
          Voor mail, WhatsApp, socials of een knop op je site. Niet in een iframe plakken.
        </p>
        <div className="mt-3 flex gap-2">
          <input readOnly value={link} className="min-w-0 flex-1 rounded-md border border-black/10 px-3 py-2 text-sm" />
          <button type="button" onClick={() => void copy("link")} className="rounded-md bg-green px-3 py-2 text-sm text-white">
            {copied === "link" ? "Gekopieerd" : "Kopieer"}
          </button>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">Embed op je website</p>
        <p className="mt-1 text-sm text-ink/60">
          Gebruik deze code, niet de publieke link. Dan krijg je een schone flipbook zonder “Deel / embed”.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink/70">
          <li>Kopieer de hele HTML-blok hieronder, inclusief het script.</li>
          <li>
            WordPress: blok <span className="font-medium text-ink">Eigen HTML / Custom HTML</span>. Niet het iframe-blok
            en niet “inbedden via URL”.
          </li>
          <li>Shopify of een andere builder: HTML / Custom Liquid, in de volle contentbreedte.</li>
        </ol>
        <div className="mt-4 rounded-xl bg-[#f4f6f5] p-4 text-sm leading-6 text-ink/75">
          <p className="font-medium text-ink">Beste afmetingen</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Breedte: 100% van je contentkolom, niet in een smalle card.</li>
            <li>
              Hoogte: {portrait ? "ongeveer 1,3× de breedte, minimaal 620px" : "ongeveer 16:10, minimaal 420px"} (
              {portrait ? "staand" : "liggend"} magazine). De code hieronder doet dat automatisch.
            </li>
            <li>Op mobiel: over de volle paginabreedte, niet naast een menu in twee kolommen.</li>
            <li>Onder ± 400px hoog wordt de brochure onleesbaar.</li>
          </ul>
        </div>
        <textarea readOnly value={iframe} rows={8} className="mt-3 w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs" />
        <button type="button" onClick={() => void copy("embed")} className="mt-2 rounded-md bg-ink px-3 py-2 text-sm text-white">
          {copied === "embed" ? "Gekopieerd" : "Kopieer embed-code"}
        </button>
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
      <CoverMockupDownload magazine={magazine} />
      {showPromo ? <PromoDownload magazine={magazine} /> : null}
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
