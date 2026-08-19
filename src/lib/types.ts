export type PlanId = "free" | "standard" | "professional" | "premium";
export type UserRole = "admin" | "user";

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
  viewsByDay: Record<string, number>;
  public: boolean;
  leadForm: boolean;
  expiresAt: string | null;
  pdfUrl?: string | null;
  coverUrl?: string | null;
  bytes?: number;
};

export type Lead = {
  id: string;
  magazineId: string;
  name: string;
  email: string;
  createdAt: string;
};

export type TeamMember = {
  email: string;
  userId: string | null;
  invitedAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  plan: PlanId;
  planRenewsAt: string | null;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
  bookshelfSlug: string;
  teamMembers: TeamMember[];
};

export const MAGAZINE_ID_PATTERN = /^[A-Za-z0-9_-]{8,32}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_PDF_BYTES = 40 * 1024 * 1024;
export const MAX_PAGES = 400;
export const MAX_FLIP_PAGES = 800;
export const GUEST_TTL_DAYS = 7;
