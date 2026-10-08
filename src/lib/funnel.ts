import { MAGAZINE_ID_PATTERN } from "@/lib/types";
import { getMagazine } from "@/lib/magazines";
import { getObject, putObject } from "@/lib/store";

const SESSION_TTL_MS = 45 * 60 * 1000;
const MAX_OPEN = 400;
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;

type OpenSession = { max: number; t: number };

export type FunnelStore = {
  pageCount: number;
  sessions: number;
  reached: number[];
  exits: number[];
  open: Record<string, OpenSession>;
};

export type FunnelPageRow = {
  page: number;
  reached: number;
  reachedPct: number;
  exits: number;
  exitPct: number;
  last: boolean;
};

export type FunnelInsights = {
  sessions: number;
  completed: number;
  completePct: number;
  hotspot: { page: number; exits: number; exitPct: number } | null;
  pages: FunnelPageRow[];
};

function funnelPath(id: string) {
  if (!MAGAZINE_ID_PATTERN.test(id)) throw new Error("Ongeldig magazine-id");
  return `magazines/${id}/funnel.json`;
}

function zeros(n: number) {
  return Array.from({ length: Math.max(1, n) }, () => 0);
}

function sized(arr: number[] | undefined, n: number) {
  const next = zeros(n);
  (arr ?? []).forEach((value, index) => {
    if (index < n) next[index] = Math.max(0, Math.floor(Number(value) || 0));
  });
  return next;
}

function emptyStore(pageCount: number): FunnelStore {
  const n = Math.max(1, pageCount);
  return { pageCount: n, sessions: 0, reached: zeros(n), exits: zeros(n), open: {} };
}

function normalizeStore(raw: Partial<FunnelStore> | null, pageCount: number): FunnelStore {
  const n = Math.max(1, pageCount);
  const open: Record<string, OpenSession> = {};
  if (raw?.open && typeof raw.open === "object") {
    for (const [sid, sess] of Object.entries(raw.open)) {
      if (!SESSION_ID.test(sid) || !sess) continue;
      open[sid] = {
        max: Math.max(0, Math.min(n - 1, Math.floor(Number(sess.max) || 0))),
        t: Number(sess.t) || 0,
      };
    }
  }
  return {
    pageCount: n,
    sessions: Math.max(0, Math.floor(Number(raw?.sessions) || 0)),
    reached: sized(raw?.reached, n),
    exits: sized(raw?.exits, n),
    open,
  };
}

async function readStore(id: string, pageCount: number): Promise<FunnelStore> {
  const raw = await getObject(funnelPath(id));
  if (!raw) return emptyStore(pageCount);
  try {
    return normalizeStore(JSON.parse(raw.toString("utf8")) as Partial<FunnelStore>, pageCount);
  } catch {
    return emptyStore(pageCount);
  }
}

async function writeStore(id: string, store: FunnelStore) {
  await putObject(funnelPath(id), JSON.stringify(store), "application/json");
}

function foldSession(store: FunnelStore, sess: OpenSession) {
  const max = Math.max(0, Math.min(store.pageCount - 1, sess.max));
  store.exits[max] = (store.exits[max] ?? 0) + 1;
  for (let i = 0; i <= max; i += 1) {
    store.reached[i] = (store.reached[i] ?? 0) + 1;
  }
}

function foldStale(store: FunnelStore, now: number, keepSid?: string) {
  const entries = Object.entries(store.open).sort((a, b) => a[1].t - b[1].t);
  for (const [sid, sess] of entries) {
    if (sid === keepSid) continue;
    const stale = now - sess.t > SESSION_TTL_MS;
    const overflow = Object.keys(store.open).length > MAX_OPEN;
    if (stale || overflow) {
      foldSession(store, sess);
      delete store.open[sid];
    }
  }
}

function withOpenFolded(store: FunnelStore): FunnelStore {
  const clone: FunnelStore = {
    pageCount: store.pageCount,
    sessions: store.sessions,
    reached: store.reached.slice(),
    exits: store.exits.slice(),
    open: { ...store.open },
  };
  for (const sid of Object.keys(clone.open)) {
    foldSession(clone, clone.open[sid]!);
    delete clone.open[sid];
  }
  return clone;
}

export function summarizeFunnel(store: FunnelStore): FunnelInsights {
  const n = store.pageCount;
  const sessions = store.sessions;
  const denom = Math.max(1, sessions);
  const pages: FunnelPageRow[] = [];
  for (let i = 0; i < n; i += 1) {
    const reached = store.reached[i] ?? 0;
    const exits = store.exits[i] ?? 0;
    pages.push({
      page: i + 1,
      reached,
      reachedPct: Math.round((reached / denom) * 100),
      exits,
      exitPct: Math.round((exits / denom) * 100),
      last: i === n - 1,
    });
  }
  const completed = store.reached[n - 1] ?? 0;
  const dropPages = pages.filter((row) => !row.last && row.exits > 0);
  dropPages.sort((a, b) => b.exits - a.exits || a.page - b.page);
  const top = dropPages[0];
  return {
    sessions,
    completed,
    completePct: Math.round((completed / denom) * 100),
    hotspot: top ? { page: top.page, exits: top.exits, exitPct: top.exitPct } : null,
    pages,
  };
}

export async function recordFunnelPing(input: {
  magazineId: string;
  sessionId: string;
  page: number;
  done?: boolean;
}) {
  if (!MAGAZINE_ID_PATTERN.test(input.magazineId) || input.magazineId.startsWith("demo-")) {
    return { ok: false as const, status: 400, error: "Ongeldig magazine." };
  }
  if (!SESSION_ID.test(input.sessionId)) {
    return { ok: false as const, status: 400, error: "Ongeldige sessie." };
  }
  const magazine = await getMagazine(input.magazineId);
  if (!magazine || !magazine.public) {
    return { ok: false as const, status: 404, error: "Magazine niet gevonden." };
  }
  if (magazine.expiresAt && new Date(magazine.expiresAt) < new Date()) {
    return { ok: false as const, status: 404, error: "Magazine niet gevonden." };
  }

  const n = Math.max(1, magazine.pageCount);
  const page = Math.max(0, Math.min(n - 1, Math.floor(Number(input.page) || 0)));
  const now = Date.now();
  const store = await readStore(magazine.id, n);
  foldStale(store, now, input.sessionId);

  let sess = store.open[input.sessionId];
  if (!sess) {
    store.sessions += 1;
    sess = { max: page, t: now };
    store.open[input.sessionId] = sess;
    foldStale(store, now, input.sessionId);
  } else {
    sess.max = Math.max(sess.max, page);
    sess.t = now;
  }

  if (input.done) {
    foldSession(store, sess);
    delete store.open[input.sessionId];
  }

  await writeStore(magazine.id, store);
  return { ok: true as const };
}

export async function getFunnelInsights(magazineId: string, pageCount: number): Promise<FunnelInsights> {
  const store = await readStore(magazineId, pageCount);
  const now = Date.now();
  const before = Object.keys(store.open).length;
  foldStale(store, now);
  if (Object.keys(store.open).length !== before) await writeStore(magazineId, store);
  return summarizeFunnel(withOpenFolded(store));
}
