"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SharePanel } from "@/components/SharePanel";
import {
  DEFAULT_LEAD_ACCENT,
  DEFAULT_LEAD_ACCENT_TEXT,
  DEFAULT_LEAD_BG,
  DEFAULT_LEAD_BUTTON,
  DEFAULT_LEAD_COLOR,
  DEFAULT_LEAD_SKIP,
  DEFAULT_LEAD_TEXT,
  DEFAULT_LEAD_TITLE,
  leadTriggerPage,
  normalizeHexColor,
} from "@/lib/lead-form";
import { canUse } from "@/lib/plans";
import type { Magazine, PlanId } from "@/lib/types";

export function MagazineSettings({ magazine, plan }: { magazine: Magazine; plan: PlanId }) {
  const router = useRouter();
  const [title, setTitle] = useState(magazine.title);
  const [slug, setSlug] = useState(magazine.slug);
  const [leadForm, setLeadForm] = useState(magazine.leadForm);
  const [leadTriggerPercent, setLeadTriggerPercent] = useState(magazine.leadTriggerPercent ?? 10);
  const [leadTitle, setLeadTitle] = useState(magazine.leadTitle || DEFAULT_LEAD_TITLE);
  const [leadText, setLeadText] = useState(magazine.leadText || DEFAULT_LEAD_TEXT);
  const [leadButton, setLeadButton] = useState(magazine.leadButton || DEFAULT_LEAD_BUTTON);
  const [leadSkip, setLeadSkip] = useState(magazine.leadSkip || DEFAULT_LEAD_SKIP);
  const [leadBg, setLeadBg] = useState(normalizeHexColor(magazine.leadBg, DEFAULT_LEAD_BG));
  const [leadColor, setLeadColor] = useState(normalizeHexColor(magazine.leadColor, DEFAULT_LEAD_COLOR));
  const [leadAccent, setLeadAccent] = useState(normalizeHexColor(magazine.leadAccent, DEFAULT_LEAD_ACCENT));
  const [leadAccentText, setLeadAccentText] = useState(
    normalizeHexColor(magazine.leadAccentText, DEFAULT_LEAD_ACCENT_TEXT),
  );
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const leadsOk = canUse(plan, "leads");
  const triggerPage = useMemo(
    () => leadTriggerPage(magazine.pageCount, leadTriggerPercent),
    [magazine.pageCount, leadTriggerPercent],
  );

  async function save(patch: {
    leadForm?: boolean;
    leadTriggerPercent?: number;
    leadTitle?: string;
    leadText?: string;
    leadButton?: string;
    leadSkip?: string;
    leadBg?: string;
    leadColor?: string;
    leadAccent?: string;
    leadAccentText?: string;
  } = {}) {
    const nextLeadForm = patch.leadForm ?? leadForm;
    const response = await fetch(`/api/magazines/${magazine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        leadForm: nextLeadForm,
        leadTriggerPercent: patch.leadTriggerPercent ?? leadTriggerPercent,
        leadTitle: patch.leadTitle ?? leadTitle,
        leadText: patch.leadText ?? leadText,
        leadButton: patch.leadButton ?? leadButton,
        leadSkip: patch.leadSkip ?? leadSkip,
        leadBg: patch.leadBg ?? leadBg,
        leadColor: patch.leadColor ?? leadColor,
        leadAccent: patch.leadAccent ?? leadAccent,
        leadAccentText: patch.leadAccentText ?? leadAccentText,
      }),
    });
    const data = (await response.json()) as { error?: string; magazine?: Magazine };
    if (!response.ok) {
      setMessage(data.error ?? "Opslaan mislukt");
      return;
    }
    setMessage("Opgeslagen");
    if (data.magazine) setSlug(data.magazine.slug);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Flipbook verwijderen?")) return;
    await fetch(`/api/magazines/${magazine.id}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="font-semibold">Instellingen</h2>
          <label className="block text-sm">
            Titel
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
          </label>
          <label className="block text-sm">
            Eigen URL-slug {canUse(plan, "slug") ? "" : "(Professional)"}
            <input
              value={slug}
              disabled={!canUse(plan, "slug")}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-black/5"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} className="rounded-md bg-green px-4 py-2 text-sm text-white">
              Opslaan
            </button>
            <button type="button" onClick={() => void remove()} className="rounded-md px-4 py-2 text-sm text-red-700">
              Verwijderen
            </button>
          </div>
          {message ? <p className="text-sm text-ink/60">{message}</p> : null}
        </div>
        <SharePanel magazine={{ ...magazine, title, slug }} canDownload={canUse(plan, "download")} />
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Leadformulier</h2>
            <p className="mt-1 text-sm text-ink/55">
              {leadsOk
                ? leadForm
                  ? leadTriggerPercent <= 0
                    ? "Verschijnt meteen bij het openen, één keer per bezoek."
                    : `Verschijnt één keer per bezoek, na ${leadTriggerPercent}% van de brochure (rond pagina ${triggerPage} van ${magazine.pageCount}).`
                  : "Formulier staat uit. Zet ‘Formulier tonen’ aan en sla op, anders zie je het niet in de brochure."
                : "Zit in Professional. Upgrade om leads te vangen in de viewer."}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={leadForm}
              disabled={!leadsOk}
              onChange={(e) => {
                const checked = e.target.checked;
                setLeadForm(checked);
                void save({ leadForm: checked });
              }}
            />
            Formulier tonen
          </label>
        </div>

        <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${leadsOk ? "" : "pointer-events-none opacity-50"}`}>
          <label className="block text-sm sm:col-span-2">
            {leadTriggerPercent <= 0
              ? "Toon direct bij openen"
              : `Toon na ${leadTriggerPercent}% van de pagina’s`}
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={leadTriggerPercent}
              disabled={!leadsOk}
              onChange={(e) => setLeadTriggerPercent(Number(e.target.value))}
              className="mt-2 w-full accent-green"
            />
            <span className="mt-1 block text-xs text-ink/45">0% = meteen. Handig om te testen.</span>
          </label>
          <label className="block text-sm">
            Titel
            <input
              value={leadTitle}
              disabled={!leadsOk}
              onChange={(e) => setLeadTitle(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Knop
            <input
              value={leadButton}
              disabled={!leadsOk}
              onChange={(e) => setLeadButton(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Tekst
            <textarea
              value={leadText}
              disabled={!leadsOk}
              onChange={(e) => setLeadText(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Overslaan
            <input
              value={leadSkip}
              disabled={!leadsOk}
              onChange={(e) => setLeadSkip(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </label>
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField label="Achtergrond" value={leadBg} fallback={DEFAULT_LEAD_BG} onChange={setLeadBg} disabled={!leadsOk} />
            <ColorField label="Tekst" value={leadColor} fallback={DEFAULT_LEAD_COLOR} onChange={setLeadColor} disabled={!leadsOk} />
            <ColorField label="Knop" value={leadAccent} fallback={DEFAULT_LEAD_ACCENT} onChange={setLeadAccent} disabled={!leadsOk} />
            <ColorField label="Knoptekst" value={leadAccentText} fallback={DEFAULT_LEAD_ACCENT_TEXT} onChange={setLeadAccentText} disabled={!leadsOk} />
          </div>
          <p className="sm:col-span-2 text-xs text-ink/45">
            Kies je huisstijl. De knop is meestal je merkkleur.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={!leadsOk} className="rounded-md bg-green px-4 py-2 text-sm text-white disabled:opacity-50">
            Leadformulier opslaan
          </button>
          <button
            type="button"
            disabled={!leadsOk}
            onClick={() => setPreview(true)}
            className="rounded-md border border-black/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            Voorbeeld
          </button>
        </div>
      </section>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 shadow-xl" style={{ backgroundColor: leadBg, color: leadColor }}>
            <p className="font-semibold">{leadTitle}</p>
            <p className="mt-1 text-sm" style={{ opacity: 0.65 }}>
              {leadText}
            </p>
            <input readOnly placeholder="Naam" className="mt-4 w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: `${leadColor}33` }} />
            <input readOnly placeholder="E-mail" className="mt-2 w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: `${leadColor}33` }} />
            <button type="button" className="mt-4 w-full rounded-md py-2 text-sm" style={{ backgroundColor: leadAccent, color: leadAccentText }}>
              {leadButton}
            </button>
            <button type="button" onClick={() => setPreview(false)} className="mt-2 w-full text-sm" style={{ color: leadColor, opacity: 0.5 }}>
              {leadSkip}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded border border-black/10 bg-white p-0.5 disabled:opacity-50"
        />
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value.trim();
            if (/^#?[0-9a-fA-F]{0,6}$/.test(next)) {
              onChange(next.startsWith("#") || next === "" ? next || "#" : `#${next}`);
            }
          }}
          onBlur={() => onChange(normalizeHexColor(value, fallback))}
          className="w-full rounded-md border px-3 py-2 font-mono text-xs uppercase disabled:bg-black/5"
        />
      </span>
    </label>
  );
}
