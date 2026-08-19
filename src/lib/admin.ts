import { redirect } from "next/navigation";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { effectiveRole, isAdmin, isAdminEmail } from "@/lib/admin-access";
import { listLeadsForMagazine } from "@/lib/leads";
import { listMagazines, usedStorageBytes } from "@/lib/magazines";
import { getPlan } from "@/lib/plans";
import { deleteUser, findUserById, listUsers, saveUser } from "@/lib/users";
import type { Magazine, PlanId, User, UserRole } from "@/lib/types";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  planName: string;
  planRenewsAt: string | null;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
  bookshelfSlug: string;
  teamCount: number;
  magazines: number;
  views: number;
  storageBytes: number;
};

export async function requireAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

export async function requireAdminApi() {
  const user = await getSessionUser();
  if (!user) return { error: "Log in.", status: 401 as const };
  if (!isAdmin(user)) return { error: "Alleen admins hebben toegang.", status: 403 as const };
  return { user };
}

export function toAdminUserRow(user: User, magazines: Magazine[]): AdminUserRow {
  const owned = magazines.filter((magazine) => magazine.ownerId === user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    planName: getPlan(user.plan).name,
    planRenewsAt: user.planRenewsAt,
    role: effectiveRole(user),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    bookshelfSlug: user.bookshelfSlug,
    teamCount: user.teamMembers.length,
    magazines: owned.length,
    views: owned.reduce((sum, magazine) => sum + magazine.views, 0),
    storageBytes: usedStorageBytes(owned),
  };
}

export function adminCount(users: User[]) {
  return users.filter(isAdmin).length;
}

export async function loadAdminOverview() {
  const [users, magazines] = await Promise.all([listUsers(), listMagazines()]);
  const rows = users.map((user) => toAdminUserRow(user, magazines)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const knownIds = new Set(users.map((user) => user.id));
  const orphans = magazines.filter((magazine) => !knownIds.has(magazine.ownerId));
  const leadTotals = await Promise.all(
    magazines.filter((magazine) => magazine.leadForm).map((magazine) => listLeadsForMagazine(magazine.id)),
  );
  const planCounts = {
    free: 0,
    standard: 0,
    professional: 0,
    premium: 0,
  } satisfies Record<PlanId, number>;
  for (const user of users) planCounts[user.plan] += 1;

  return {
    users: rows,
    magazines,
    orphans,
    stats: {
      users: users.length,
      admins: adminCount(users),
      magazines: magazines.length,
      views: magazines.reduce((sum, magazine) => sum + magazine.views, 0),
      leads: leadTotals.reduce((sum, leads) => sum + leads.length, 0),
      orphans: orphans.length,
      planCounts,
    },
  };
}

export async function updateAdminUser(
  actor: User,
  id: string,
  patch: { name?: string; plan?: PlanId; role?: UserRole; password?: string },
) {
  const user = await findUserById(id);
  if (!user) throw new Error("Gebruiker niet gevonden.");

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error("Naam mag niet leeg zijn.");
    user.name = name;
  }

  if (patch.plan !== undefined) {
    user.plan = patch.plan;
    user.planRenewsAt =
      patch.plan === "free"
        ? null
        : user.planRenewsAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (patch.role !== undefined) {
    if (patch.role === "user" && isAdminEmail(user.email)) {
      throw new Error("Woeler-accounts en adressen in FOLIO_ADMIN_EMAILS blijven admin.");
    }
    if (id === actor.id && patch.role !== "admin") {
      throw new Error("Je kunt je eigen admin-rechten niet verwijderen.");
    }
    if (patch.role === "user" && isAdmin(user)) {
      const users = await listUsers();
      if (adminCount(users) <= 1) throw new Error("Je kunt de laatste admin niet degraderen.");
    }
    user.role = patch.role;
  }

  if (patch.password !== undefined) {
    if (patch.password.length < 6) throw new Error("Wachtwoord moet minstens 6 tekens zijn.");
    user.passwordHash = hashPassword(patch.password);
  }

  await saveUser(user);
  return user;
}

export async function removeAdminUser(actor: User, id: string) {
  if (id === actor.id) throw new Error("Je kunt je eigen account niet verwijderen.");
  const user = await findUserById(id);
  if (!user) throw new Error("Gebruiker niet gevonden.");
  if (isAdmin(user)) {
    const users = await listUsers();
    if (adminCount(users) <= 1) throw new Error("Je kunt de laatste admin niet verwijderen.");
  }
  const ok = await deleteUser(id);
  if (!ok) throw new Error("Gebruiker niet gevonden.");
}
