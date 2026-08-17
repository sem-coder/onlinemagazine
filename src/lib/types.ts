export type Magazine = {
  id: string;
  title: string;
  originalName: string;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  createdAt: string;
};

export const MAGAZINE_ID_PATTERN = /^[A-Za-z0-9_-]{8,21}$/;
export const MAX_PDF_BYTES = 40 * 1024 * 1024;
export const MAX_PAGES = 80;
