import type { Magazine } from "@/lib/types";

export const DEFAULT_LEAD_TITLE = "Blijf op de hoogte";
export const DEFAULT_LEAD_TEXT = "Laat je e-mail achter en sla deze catalogus op.";
export const DEFAULT_LEAD_BUTTON = "Verstuur";
export const DEFAULT_LEAD_SKIP = "Nee bedankt";
export const DEFAULT_LEAD_BG = "#ffffff";
export const DEFAULT_LEAD_COLOR = "#1a1f1c";
export const DEFAULT_LEAD_ACCENT = "#1f7a4d";
export const DEFAULT_LEAD_ACCENT_TEXT = "#ffffff";

export function clampLeadPercent(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.min(90, Math.max(0, Math.round(n)));
}

export function normalizeHexColor(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#([0-9a-fA-F]{3})$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) return hex.toLowerCase();
  return fallback;
}

export function leadFormFields(raw: Partial<Magazine> = {}) {
  return {
    leadForm: Boolean(raw.leadForm),
    leadTriggerPercent: clampLeadPercent(raw.leadTriggerPercent ?? 10),
    leadTitle: (raw.leadTitle || DEFAULT_LEAD_TITLE).trim() || DEFAULT_LEAD_TITLE,
    leadText: (raw.leadText || DEFAULT_LEAD_TEXT).trim() || DEFAULT_LEAD_TEXT,
    leadButton: (raw.leadButton || DEFAULT_LEAD_BUTTON).trim() || DEFAULT_LEAD_BUTTON,
    leadSkip: (raw.leadSkip || DEFAULT_LEAD_SKIP).trim() || DEFAULT_LEAD_SKIP,
    leadBg: normalizeHexColor(raw.leadBg, DEFAULT_LEAD_BG),
    leadColor: normalizeHexColor(raw.leadColor, DEFAULT_LEAD_COLOR),
    leadAccent: normalizeHexColor(raw.leadAccent, DEFAULT_LEAD_ACCENT),
    leadAccentText: normalizeHexColor(raw.leadAccentText, DEFAULT_LEAD_ACCENT_TEXT),
  };
}

export function leadTriggerPage(total: number, percent: number) {
  const pages = Math.max(1, total);
  const pct = clampLeadPercent(percent);
  if (pct <= 0) return 1;
  return Math.min(pages, Math.max(1, Math.ceil(pages * (pct / 100))));
}
