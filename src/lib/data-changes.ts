import * as idb from "./db-client";

export const DATA_CHANGED_EVENT = "finanzas:data-changed";

export async function notifyDataChanged(url: string): Promise<void> {
  const path = url.split("?")[0];
  const related: idb.StoreName[] = ["dashboard"];

  if (path === "/api/ajuste") {
    related.push("accounts", "transactions", "descriptions", "expense_categories");
  } else if (path.includes("/transactions")) {
    related.push("transactions", "accounts", "descriptions");
  } else if (path.includes("/accounts")) related.push("accounts");
  else if (path.includes("/apartados")) related.push("apartados", "apartado_contribuciones");
  else if (path.includes("/debts")) related.push("debts");
  else if (path.includes("/cuotas")) related.push("cuotas");
  else if (path.includes("/budget")) related.push("settings");

  // La caché debe invalidarse antes de que las vistas vuelvan a cargar sus datos.
  await Promise.all(related.map((store) => idb.clearStore(store).catch(() => {})));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
}
