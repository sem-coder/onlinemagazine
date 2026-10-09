"use client";

import { useMemo, useState } from "react";
import { CoverMockupDownload } from "@/components/CoverMockupDownload";
import { PromoDownload } from "@/components/PromoDownload";
import type { Magazine } from "@/lib/types";

export function shareUrl(magazine: Magazine, origin: string) {
  return `${origin}/v/${magazine.slug || magazine.id}`;
}

export function embedCode(magazine: Magazine, origin: string) {
  const src = `${origin}/embed/${magazine.slug || magazine.id}`;
  const title = magazine.title.replace(/"/g, "&quot;");
  const id = `pdfm-${String(magazine.slug || magazine.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rest =
    "position:relative;width:100%;height:0;padding-top:max(640px,62.5%);overflow:hidden;background:#1b1d1c;";
  const expanded =
    "position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;padding:0;margin:0;z-index:2147483646;overflow:hidden;background:#1b1d1c;";
  const fsClick = `(function(b){var w=b.parentNode,i=document.getElementById('${id}');if(!i||!w)return;var n=document.fullscreenElement||document.webkitFullscreenElement;var fake=w.getAttribute('data-pdfm-x')==='1';function ping(on){try{i.contentWindow.postMessage({source:'pdfmagazine',type:on?'parent-fs-on':'parent-fs-off'},'*');}catch(e){}}function setFake(on){if(on){w.setAttribute('data-pdfm-x','1');w.style.cssText='${expanded}';document.documentElement.style.overflow='hidden';b.textContent='Sluiten';}else{w.removeAttribute('data-pdfm-x');w.style.cssText='${rest}';document.documentElement.style.overflow='';b.textContent='Volledig scherm';}ping(on);}if(n===i||fake){if(n===i){var x=document.exitFullscreen||document.webkitExitFullscreen;if(x)x.call(document);}setFake(false);return;}var r=i.requestFullscreen||i.webkitRequestFullscreen||i.webkitRequestFullScreen;if(!r){setFake(true);return;}var p=r.call(i);if(p&&p.catch)p.catch(function(){setFake(true);});setTimeout(function(){if(!(document.fullscreenElement||document.webkitFullscreenElement)&&w.getAttribute('data-pdfm-x')!=='1')setFake(true);},400);})(this)`;
  return `<div id="${id}-wrap" style="${rest}"><iframe id="${id}" src="${src}" title="${title}" allow="fullscreen *" allowfullscreen webkitallowfullscreen mozallowfullscreen style="position:absolute;top:0;left:0;width:100% !important;height:100% !important;max-height:none !important;border:0;background:#1b1d1c;"></iframe><button type="button" data-pdfm-fs="${id}" aria-label="Volledig scherm" onclick="${fsClick}" style="position:absolute;top:12px;right:12px;z-index:2147483647;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.55);color:#f4f6f5;border-radius:999px;padding:6px 12px;font:12px/1.2 system-ui,sans-serif;cursor:pointer;">Volledig scherm</button></div>
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
        <p className="text-sm font-semibold">Embed op je website</p>
        <p className="mt-1 text-sm text-ink/60">
          Kopieer de hele code opnieuw (inclusief knop en script) en plak die in een HTML-blok. Daarna vult de brochure
          het scherm met één klik, ook als de browser native fullscreen blokkeert.
        </p>
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
