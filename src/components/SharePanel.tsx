"use client";

import { useMemo, useState } from "react";
import type { Magazine } from "@/lib/types";

export function shareUrl(magazine: Magazine, origin: string) {
  return `${origin}/v/${magazine.slug || magazine.id}`;
}

export function embedCode(magazine: Magazine, origin: string, height = 640) {
  const src = `${origin}/embed/${magazine.slug || magazine.id}`;
  return `<iframe src="${src}" width="100%" height="${height}" style="border:0" allowfullscreen loading="lazy" title="${magazine.title}"></iframe>`;
}

export function SharePanel({ magazine }: { magazine: Magazine }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = useMemo(() => shareUrl(magazine, origin || "https://onlinemagazine.vercel.app"), [magazine, origin]);
  const iframe = useMemo(() => embedCode(magazine, origin || "https://onlinemagazine.vercel.app"), [magazine, origin]);
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
        <p className="mt-1 text-sm text-ink/60">Plak deze iframe in WordPress, Shopify of je eigen HTML.</p>
        <textarea readOnly value={iframe} rows={3} className="mt-3 w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs" />
        <button type="button" onClick={() => void copy("embed")} className="mt-2 rounded-md bg-ink px-3 py-2 text-sm text-white">
          {copied === "embed" ? "Gekopieerd" : "Kopieer embed-code"}
        </button>
      </div>
    </div>
  );
}
