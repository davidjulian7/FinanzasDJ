"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { onSyncChange, processQueue } from "@/lib/sync-queue";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const hasPending = pending > 0;

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await processQueue();
      if (result.errors.length > 0) {
        toast.error("No se pudieron aplicar algunos cambios pendientes", {
          description: [...new Set(result.errors)].join(" "),
          duration: 15000,
        });
      }
    } catch {
      toast.error("No se pudo sincronizar. Se volverá a intentar automáticamente.", { id: "sync-error" });
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    return onSyncChange((n) => setPending(n));
  }, []);

  useEffect(() => {
    if (!online || !hasPending) return;
    void syncNow();
    const interval = window.setInterval(() => void syncNow(), 30000);
    const onFocus = () => void syncNow();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [online, hasPending, syncNow]);

  if (online && pending === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-8">
      <div className="flex items-center gap-2 rounded-full border border-border bg-popover px-4 py-2 text-xs shadow-lg">
        {!online ? (
          <>
            <WifiOff className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Sin conexión</span>
            {pending > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">
                {pending} pendiente{pending > 1 ? "s" : ""}
              </span>
            )}
          </>
        ) : syncing ? (
          <>
            <RefreshCw className="size-3.5 animate-spin text-primary" />
            <span className="text-muted-foreground">Sincronizando…</span>
            {pending > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">
                {pending} pendiente{pending > 1 ? "s" : ""}
              </span>
            )}
          </>
        ) : pending > 0 ? (
          <>
            <RefreshCw className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{pending} cambio{pending > 1 ? "s" : ""} pendiente{pending > 1 ? "s" : ""}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
