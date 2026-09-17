import * as idb from "./db-client";
import * as sync from "./sync-queue";
import { notifyDataChanged } from "./data-changes";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export { DATA_CHANGED_EVENT } from "./data-changes";

const isOnline = () => typeof navigator !== "undefined" && navigator.onLine;

type StoreName = idb.StoreName;

const URL_TO_STORE: Record<string, StoreName> = {
  "/api/accounts": "accounts",
  "/api/transactions": "transactions",
  "/api/transactions/descriptions": "descriptions",
  "/api/apartados": "apartados",
  "/api/apartados/contribuciones": "apartado_contribuciones",
  "/api/debts": "debts",
  "/api/cuotas": "cuotas",
  "/api/expense-categories": "expense_categories",
  "/api/budget-groups": "budget_groups",
  "/api/recurring-expenses": "recurring_expenses",
  "/api/dashboard": "dashboard",
  "/api/budget/config": "settings",
  "/api/budget/quincena": "settings",
};

function matchStore(url: string): StoreName | null {
  const path = url.split("?")[0];
  for (const [prefix, store] of Object.entries(URL_TO_STORE)) {
    if (path === prefix || path.startsWith(prefix + "/")) return store;
  }
  return null;
}

async function rawRequest<T>(method: string, url: string, body?: unknown, cache?: RequestCache): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: cache ?? "no-store",
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch { /* noop */ }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function cacheResponse<T>(store: StoreName, data: T): Promise<void> {
  if (data === undefined || data === null) return;
  try {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        await idb.clearStore(store);
        await idb.putMany(store, data as unknown as object[]);
      }
    } else if (typeof data === "object") {
      await idb.clearStore(store);
      await idb.put(store, data as unknown as object);
    }
  } catch { /* noop */ }
}

async function request<T>(method: string, url: string, body?: unknown, cache?: RequestCache, requireOnline = false): Promise<T> {
  const store = matchStore(url);

  if (method === "GET") {
    if (isOnline()) {
      try {
        const data = await rawRequest<T>(method, url, body, cache);
        if (store) await cacheResponse(store, data);
        return data;
      } catch {
        if (store) {
          const cached = await idb.getAll(store);
          if (cached.length > 0) return cached as T;
        }
        throw new ApiError(0, "Sin conexión");
      }
    } else {
      if (store) {
        const cached = await idb.getAll(store);
        if (cached.length > 0) return cached as T;
      }
      throw new ApiError(0, "Sin conexión y sin datos en caché");
    }
  }

  if (!isOnline()) {
    if (requireOnline) {
      throw new ApiError(0, "Necesitas conexión para aplicar el ajuste. Tus saldos aún no se han guardado.");
    }
    await sync.enqueue({ method, url, body });
    return { ok: true, offline: true } as unknown as T;
  }

  const data = await rawRequest<T>(method, url, body);
  await notifyDataChanged(url);
  return data;
}

export const api = {
  get: <T>(url: string, opts?: { cache?: RequestCache }) => request<T>("GET", url, undefined, opts?.cache),
  post: <T>(url: string, body?: unknown, opts?: { requireOnline?: boolean }) =>
    request<T>("POST", url, body, undefined, opts?.requireOnline),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};

export { isOnline };
