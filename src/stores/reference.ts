"use client";

import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";
import { api } from "@/lib/api";
import type { AccountRow, ExpenseCategoryRow } from "@/lib/types";

interface ReferenceState {
  accounts: AccountRow[] | null;
  expenseCategories: ExpenseCategoryRow[] | null;
  loaded: boolean;
  loading: boolean;
  load: (force?: boolean) => Promise<void>;
  replaceAccounts: (accounts: AccountRow[]) => void;
  replaceExpenseCategories: (categories: ExpenseCategoryRow[]) => void;
}

let inflight: Promise<void> | null = null;

export const useReferenceStore = create<ReferenceState>()((set, get) => ({
  accounts: null,
  expenseCategories: null,
  loaded: false,
  loading: false,
  load: async (force = false) => {
    const { loaded, loading } = get();
    if ((loaded && !force) || (loading && !force)) return;
    if (inflight && !force) return inflight;
    set({ loading: true });
    inflight = Promise.all([
      api.get<AccountRow[]>("/api/accounts", { cache: "default" }),
      api.get<ExpenseCategoryRow[]>("/api/expense-categories", { cache: "default" }),
    ])
      .then(([accounts, expenseCategories]) => {
        set({ accounts, expenseCategories, loaded: true, loading: false });
      })
      .catch((e) => {
        set({ loading: false });
        inflight = null;
        throw e;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  replaceAccounts: (accounts) => set({ accounts, loaded: true }),
  replaceExpenseCategories: (expenseCategories) => set({ expenseCategories, loaded: true }),
}));

export function useReference() {
  const accounts = useReferenceStore((s) => s.accounts);
  const expenseCategories = useReferenceStore((s) => s.expenseCategories);
  const loaded = useReferenceStore((s) => s.loaded);
  const load = useReferenceStore((s) => s.load);

  useEffect(() => {
    load().catch(() => {
      /* error ya mostrado por quien lo requiera */
    });
  }, [load]);

  const emptyAccounts = useMemo(() => [] as AccountRow[], []);
  const emptyCategories = useMemo(() => [] as ExpenseCategoryRow[], []);

  return {
    accounts: accounts ?? emptyAccounts,
    expenseCategories: expenseCategories ?? emptyCategories,
    loaded,
    loading: useReferenceStore((s) => s.loading),
    reload: useCallback(() => load(true), [load]),
  };
}
