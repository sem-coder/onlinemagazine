export type PlanId = "free" | "standard" | "professional" | "premium";

export type Magazine = {
  id: string;
  slug: string;
  title: string;
  originalName: string;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  createdAt: string;
  ownerId: string;
  views: number;
  public: boolean;
  leadForm: boolean;
  expiresAt: string | null;
};

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: PlanId;
  planRenewsAt: string | null;
  createdAt: string;
};

export const MAGAZINE_ID_PATTERN = /^[A-Za-z0-9_-]{8,32}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_PDF_BYTES = 40 * 1024 * 1024;
export const MAX_PAGES = 80;
export const GUEST_TTL_DAYS = 7;
