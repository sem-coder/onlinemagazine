import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@/lib/types";

const FILE = path.join(process.cwd(), "data", "users.json");

async function readAll(): Promise<User[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as User[];
  } catch {
    return [];
  }
}

async function writeAll(users: User[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(users, null, 2));
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
