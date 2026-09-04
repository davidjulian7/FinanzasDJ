import * as idb from "./db-client";

export interface SyncEntry {
  id: string;
  method: string;
  url: string;
  body?: unknown;
  timestamp: number;
  retries: number;
}

const QUEUE_STORE = "sync_queue" as idb.StoreName;

let syncing = false;
let listeners: Array<(pending: number) => void> = [];

function emitChange() {
  getPendingCount().then((n) => listeners.forEach((fn) => fn(n)));
}

export function onSyncChange(fn: (pending: number) => void): () => void {
  listeners.push(fn);
  getPendingCount().then((n) => fn(n));
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export async function enqueue(entry: Omit<SyncEntry, "id" | "timestamp" | "retries">): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: SyncEntry = { ...entry, id, timestamp: Date.now(), retries: 0 };
  await idb.put(QUEUE_STORE, full);
  emitChange();
  return id;
}

export async function getAll(): Promise<SyncEntry[]> {
  return idb.getAll<SyncEntry>(QUEUE_STORE);
}

export async function remove(id: string): Promise<void> {
  await idb.remove(QUEUE_STORE, id);
  emitChange();
}

export async function updateRetry(id: string, retries: number): Promise<void> {
  const entry = await idb.getById<SyncEntry>(QUEUE_STORE, id);
  if (entry) {
    entry.retries = retries;
    await idb.put(QUEUE_STORE, entry);
  }
}

export async function getPendingCount(): Promise<number> {
  const all = await getAll();
  return all.length;
}

const isOnline = () => typeof navigator !== "undefined" && navigator.onLine;

export async function processQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  if (!isOnline()) return { synced: 0, failed: 0 };
  syncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const entries = await getAll();
    const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of sorted) {
      if (!isOnline()) break;

      try {
        const res = await fetch(entry.url, {
          method: entry.method,
          headers: entry.body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: entry.body !== undefined ? JSON.stringify(entry.body) : undefined,
          cache: "no-store",
        });

        if (res.ok) {
          await remove(entry.id);
          synced++;
        } else if (res.status >= 400 && res.status < 500) {
          await remove(entry.id);
          failed++;
        } else {
          if (entry.retries >= 10) {
            await remove(entry.id);
            failed++;
          } else {
            await updateRetry(entry.id, entry.retries + 1);
          }
        }
      } catch {
        break;
      }
    }
  } finally {
    syncing = false;
  }

  if (synced > 0) emitChange();
  return { synced, failed };
}
