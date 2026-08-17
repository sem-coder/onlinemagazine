import { createHmac } from "node:crypto";
import { getObject, putObject } from "@/lib/store";
import type { User } from "@/lib/types";

function usersPath() {
  const secret = process.env.AUTH_SECRET ?? "folio-dev-secret-change-me";
  const id = createHmac("sha256", secret).update("users-file").digest("hex").slice(0, 20);
  return `app-data/users-${id}.json`;
}

async function readAll(): Promise<User[]> {
  const raw = (await getObject(usersPath())) ?? (await getObject("users.json"));
  if (!raw) return [];
  try {
    return JSON.parse(raw.toString("utf8")) as User[];
  } catch {
    return [];
  }
}

async function writeAll(users: User[]) {
  await putObject(usersPath(), JSON.stringify(users, null, 2), "application/json");
}

export async function findUserById(id: string) {
  return (await readAll()).find((user) => user.id === id) ?? null;
}

export async function findUserByEmail(email: string) {
  return (await readAll()).find((user) => user.email === email) ?? null;
}

export async function saveUser(user: User) {
  const users = await readAll();
  const index = users.findIndex((item) => item.id === user.id);
  if (index === -1) users.push(user);
  else users[index] = user;
  await writeAll(users);
}
