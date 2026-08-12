"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PresupuestoRootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab") || "configuracion";
    router.replace(`/presupuesto/${tab}`);
  }, [router, searchParams]);

  return null;
}