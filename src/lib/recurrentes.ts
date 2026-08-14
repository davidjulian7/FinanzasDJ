export type FrecuenciaRecurrente = "semanal" | "quincenal" | "mensual" | "anual";

// Equivalente de cada frecuencia en una quincena (14 días / 24 quincenas al año).
export function multiplicadorQuincena(frecuencia: FrecuenciaRecurrente): number {
  switch (frecuencia) {
    case "semanal":
      return 2;
    case "quincenal":
      return 1;
    case "mensual":
      return 0.5;
    case "anual":
      return 1 / 24;
  }
}

export function montoQuincena(monto: number, frecuencia: FrecuenciaRecurrente): number {
  return monto * multiplicadorQuincena(frecuencia);
}