import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { attachTeamMembership, findUserByEmail, findUserById, findWorkspaceOwner, saveUser, uniqueBookshelfSlug } from "@/lib/users";
import type { User } from "@/lib/types";

const COOKIE = "folio_session";
const GUEST = "folio_guest";
const SECRET = process.env.AUTH_SECRET ?? "folio-dev-secret-change-me";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === "production",
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

function encodeSession(userId: string) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token: string | undefined) {
  if (!token) return null;
  const [userId, exp, mac] = token.split(".");
  if (!userId || !exp || !mac) return null;
  if (sign(`${userId}.${exp}`) !== mac) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = decodeSession(jar.get(COOKIE)?.value);
  if (!userId) return null;
  return findUserById(userId);
}

export async function getGuestId() {
  const jar = await cookies();
  return jar.get(GUEST)?.value ?? null;
}

export async function ensureGuestId() {
  const jar = await cookies();
  const existing = jar.get(GUEST)?.value;
  if (existing) return existing;
  const id = `guest_${randomBytes(6).toString("hex")}`;
  jar.set(GUEST, id, COOKIE_OPTIONS);
  return id;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(userId), COOKIE_OPTIONS);
}

export function applySessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(COOKIE, encodeSession(userId), COOKIE_OPTIONS);
  return response;
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function registerUser(input: { email: string; name: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Vul een geldig e-mailadres in.");
  if (input.password.length < 6) throw new Error("Wachtwoord moet minstens 6 tekens zijn.");
  if (await findUserByEmail(email)) throw new Error("Dit e-mailadres heeft al een account.");
  const user: User = {
    id: randomBytes(8).toString("hex"),
    email,
    name: input.name.trim() || email.split("@")[0],
    passwordHash: hashPassword(input.password),
    plan: "free",
    planRenewsAt: null,
    createdAt: new Date().toISOString(),
    bookshelfSlug: await uniqueBookshelfSlug(input.name.trim() || email.split("@")[0]),
    teamMembers: [],
  };
  await saveUser(user);
  await attachTeamMembership(user);
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("E-mail of wachtwoord klopt niet.");
  }
  await attachTeamMembership(user);
  return user;
}

export async function actorId() {
  const user = await getSessionUser();
  if (user) {
    const owner = await findWorkspaceOwner(user);
    return owner.id;
  }
  return ensureGuestId();
}

export async function workspaceUser() {
  const user = await getSessionUser();
  if (!user) return null;
  const owner = await findWorkspaceOwner(user);
  return { user, owner, isMember: owner.id !== user.id };
}
