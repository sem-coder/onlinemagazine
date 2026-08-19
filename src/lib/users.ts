import { createHmac } from "node:crypto";
import { getObject, putObject } from "@/lib/store";
import { slugify } from "@/lib/magazines";
import type { TeamMember, User } from "@/lib/types";

function usersPath() {
  const secret = process.env.AUTH_SECRET ?? "folio-dev-secret-change-me";
  const id = createHmac("sha256", secret).update("users-file").digest("hex").slice(0, 20);
  return `app-data/users-${id}.json`;
}

function normalizeUser(raw: Partial<User> & { id: string }): User {
  return {
    id: raw.id,
    email: raw.email || "",
    name: raw.name || raw.email || "Gebruiker",
    passwordHash: raw.passwordHash || "",
    plan: raw.plan || "free",
    planRenewsAt: raw.planRenewsAt ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
    bookshelfSlug: raw.bookshelfSlug || slugify(raw.name || raw.email || raw.id),
    teamMembers: raw.teamMembers ?? [],
  };
}

async function readAll(): Promise<User[]> {
  const raw = (await getObject(usersPath())) ?? (await getObject("users.json"));
  if (!raw) return [];
  try {
    return (JSON.parse(raw.toString("utf8")) as (Partial<User> & { id: string })[]).map(normalizeUser);
  } catch {
    return [];
  }
}

async function writeAll(users: User[]) {
  await putObject(usersPath(), JSON.stringify(users, null, 2), "application/json");
}

export async function listUsers() {
  return readAll();
}

export async function findUserById(id: string) {
  return (await readAll()).find((user) => user.id === id) ?? null;
}

export async function findUserByEmail(email: string) {
  return (await readAll()).find((user) => user.email === email) ?? null;
}

export async function findUserByBookshelfSlug(slug: string) {
  return (await readAll()).find((user) => user.bookshelfSlug === slug) ?? null;
}

export async function bookshelfSlugTaken(slug: string, exceptId?: string) {
  const users = await readAll();
  return users.some((user) => user.bookshelfSlug === slug && user.id !== exceptId);
}

export async function uniqueBookshelfSlug(base: string, exceptId?: string) {
  let slug = slugify(base);
  let n = 2;
  while (await bookshelfSlugTaken(slug, exceptId)) {
    slug = `${slugify(base)}-${n}`;
    n += 1;
  }
  return slug;
}

export async function findWorkspaceOwner(user: User): Promise<User> {
  const users = await readAll();
  const host = users.find(
    (item) =>
      item.id !== user.id &&
      item.teamMembers.some((member) => member.userId === user.id || member.email === user.email),
  );
  return host ?? user;
}

export async function attachTeamMembership(user: User) {
  const users = await readAll();
  let changed = false;
  for (const owner of users) {
    const index = owner.teamMembers.findIndex((member) => member.email === user.email && !member.userId);
    if (index >= 0) {
      owner.teamMembers[index] = { ...owner.teamMembers[index], userId: user.id };
      changed = true;
    }
  }
  if (changed) await writeAll(users);
}

export async function inviteTeamMember(owner: User, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Vul een geldig e-mailadres in.");
  if (normalized === owner.email) throw new Error("Dat is je eigen e-mailadres.");
  if (owner.teamMembers.some((member) => member.email === normalized)) {
    throw new Error("Deze gebruiker is al uitgenodigd.");
  }
  const existing = await findUserByEmail(normalized);
  const member: TeamMember = {
    email: normalized,
    userId: existing?.id ?? null,
    invitedAt: new Date().toISOString(),
  };
  owner.teamMembers = [...owner.teamMembers, member];
  await saveUser(owner);
  return member;
}

export async function removeTeamMember(owner: User, email: string) {
  owner.teamMembers = owner.teamMembers.filter((member) => member.email !== email.trim().toLowerCase());
  await saveUser(owner);
}

export async function saveUser(user: User) {
  const users = await readAll();
  const normalized = normalizeUser(user);
  const index = users.findIndex((item) => item.id === normalized.id);
  if (index === -1) users.push(normalized);
  else users[index] = normalized;
  await writeAll(users);
}
