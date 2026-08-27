import type { Magazine } from "@/lib/types";

export const DEFAULT_LEAD_TITLE = "Blijf op de hoogte";
export const DEFAULT_LEAD_TEXT = "Laat je e-mail achter en sla deze catalogus op.";
export const DEFAULT_LEAD_BUTTON = "Verstuur";
export const DEFAULT_LEAD_SKIP = "Nee bedankt";

export function clampLeadPercent(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.min(90, Math.max(0, Math.round(n)));
}

export function leadFormFields(raw: Partial<Magazine> = {}) {
  return {
    leadForm: Boolean(raw.leadForm),
    leadTriggerPercent: clampLeadPercent(raw.leadTriggerPercent ?? 10),
    leadTitle: (raw.leadTitle || DEFAULT_LEAD_TITLE).trim() || DEFAULT_LEAD_TITLE,
    leadText: (raw.leadText || DEFAULT_LEAD_TEXT).trim() || DEFAULT_LEAD_TEXT,
    leadButton: (raw.leadButton || DEFAULT_LEAD_BUTTON).trim() || DEFAULT_LEAD_BUTTON,
    leadSkip: (raw.leadSkip || DEFAULT_LEAD_SKIP).trim() || DEFAULT_LEAD_SKIP,
  };
}

export function leadTriggerPage(total: number, percent: number) {
  const pages = Math.max(1, total);
  const pct = clampLeadPercent(percent);
  if (pct <= 0) return 1;
  return Math.min(pages, Math.max(1, Math.ceil(pages * (pct / 100))));
}
