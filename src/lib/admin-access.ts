import type { User, UserRole } from "@/lib/types";

export function adminEmails() {
  return (process.env.FOLIO_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return adminEmails().includes(normalized) || normalized.endsWith("@woeler.nl");
}

export function isAdmin(user: Pick<User, "email" | "role">) {
  return user.role === "admin" || isAdminEmail(user.email);
}

export function effectiveRole(user: Pick<User, "email" | "role">): UserRole {
  return isAdmin(user) ? "admin" : "user";
}
