"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { onSyncChange, processQueue } from "@/lib/sync-queue";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

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
    if (!online || pending === 0 || syncing) return;
    setSyncing(true);
    processQueue().finally(() => setSyncing(false));
  }, [online, pending, syncing]);

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
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">
              {pending} pendiente{pending > 1 ? "s" : ""}
            </span>
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
