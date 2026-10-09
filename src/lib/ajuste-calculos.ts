export interface ResultadoAjuste {
  transaccionesCreadas: number;
  diferenciaTotal: number;
  totalGastos: number;
  totalIngresos: number;
}

export function calcularDiferenciaAjuste(tipo: string, saldoActual: number, saldoReal: number): number {
  const diferenciaCentavos = Math.round(saldoReal * 100) - Math.round(saldoActual * 100);
  return (tipo === "credito" ? -diferenciaCentavos : diferenciaCentavos) / 100;
}

export function resumirAjuste(diferencias: number[]): ResultadoAjuste {
  let gastosCentavos = 0;
  let ingresosCentavos = 0;
  let transaccionesCreadas = 0;

  for (const diferencia of diferencias) {
    const centavos = Math.round(diferencia * 100);
    if (centavos === 0) continue;
    transaccionesCreadas++;
    if (centavos < 0) gastosCentavos -= centavos;
    else ingresosCentavos += centavos;
  }

  return {
    transaccionesCreadas,
    diferenciaTotal: (ingresosCentavos - gastosCentavos) / 100,
    totalGastos: gastosCentavos / 100,
    totalIngresos: ingresosCentavos / 100,
  };
}
