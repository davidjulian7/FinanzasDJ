"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <TriangleAlert className="size-6" />
          </div>
          <CardTitle>Algo salió mal</CardTitle>
          <CardDescription>Ocurrió un error inesperado. Puedes volver a intentarlo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            <RefreshCcw className="mr-2 size-4" />
            Intentar de nuevo
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}