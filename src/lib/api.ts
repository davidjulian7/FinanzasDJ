import * as idb from "./db-client";
import * as sync from "./sync-queue";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const DATA_CHANGED_EVENT = "finanzas:data-changed";

function notifyDataChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
}

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

function invalidateOnMutation(url: string): void {
  const path = url.split("?")[0];
  const related: StoreName[] = [];

  if (path.includes("/transactions")) related.push("transactions", "dashboard", "descriptions");
  else if (path.includes("/accounts")) related.push("accounts", "dashboard");
  else if (path.includes("/apartados")) related.push("apartados", "apartado_contribuciones", "dashboard");
  else if (path.includes("/debts")) related.push("debts", "dashboard");
  else if (path.includes("/cuotas")) related.push("cuotas", "dashboard");
  else if (path.includes("/budget")) related.push("settings", "dashboard");
  else related.push("dashboard");

  for (const store of related) idb.clearStore(store).catch(() => {});
}

let offlineQueue: Array<{ method: string; url: string; body?: unknown; resolve: (v: unknown) => void; reject: (e: Error) => void }> = [];

function processOfflineQueue(): void {
  if (!isOnline()) return;
  const queue = [...offlineQueue];
  offlineQueue = [];
  for (const item of queue) {
    rawRequest(item.method, item.url, item.body)
      .then((v) => item.resolve(v))
      .catch((e) => item.reject(e));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    processOfflineQueue();
    sync.processQueue().then(() => notifyDataChanged());
  });
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

async function request<T>(method: string, url: string, body?: unknown, cache?: RequestCache): Promise<T> {
  const store = matchStore(url);

  if (method === "GET") {
    if (isOnline()) {
      try {
        const data = await rawRequest<T>(method, url, body, cache);
        if (store && data !== undefined && data !== null) {
          const arr = Array.isArray(data) ? data : [data];
          if (arr.length > 0 && typeof arr[0] === "object" && "id" in arr[0]) {
            await idb.clearStore(store);
            await idb.putMany(store, arr as unknown as object[]);
          }
        }
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
    return new Promise<T>((resolve, reject) => {
      offlineQueue.push({ method, url, body, resolve: resolve as (v: unknown) => void, reject });
    });
  }

  try {
    const data = await rawRequest<T>(method, url, body);
    invalidateOnMutation(url);
    notifyDataChanged();
    return data;
  } catch (e) {
    if (e instanceof ApiError && e.status >= 500) {
      await sync.enqueue({ method, url, body });
      throw new ApiError(0, "Guardado offline. Se sincronizará cuando vuelva la conexión.");
    }
    throw e;
  }
}

export const api = {
  get: <T>(url: string, opts?: { cache?: RequestCache }) => request<T>("GET", url, undefined, opts?.cache),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};

export { isOnline, processOfflineQueue };
