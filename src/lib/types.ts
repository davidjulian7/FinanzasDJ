export type TxTipo = "gasto" | "ingreso" | "transferencia";

export interface TxRow {
  id: number;
  descripcion: string;
  monto: number;
  tipo: TxTipo;
  fecha: string;
  notas: string | null;
  accountId: number;
  accountDestinoId: number | null;
  categoryId: number | null;
  cuenta: string;
  cuentaDestino: string | null;
  categoria: string | null;
  icono: string | null;
  color: string | null;
}

export type AccountTipo = "debito" | "credito" | "efectivo" | "inversion";

export interface AccountRow {
  id: number;
  nombre: string;
  tipo: AccountTipo;
  saldoActual: number;
  saldoInicial: number;
  limiteCredito: number | null;
  fechaCorte: number | null;
  fechaPago: number | null;
  color: string;
  icono: string;
}

export interface CategoryRow {
  id: number;
  nombre: string;
  tipo: "gasto" | "ingreso";
  icono: string;
  color: string;
  grupoPresupuesto: "necesidades" | "deseos" | "ahorro" | null;
}

export interface DashboardData {
  summary: { patrimonio: number; liquidez: number; deudas: number; inversiones: number };
  totales: { ingresos: number; gastos: number };
  donut: Array<{ categoria: string; monto: number; color: string; icono: string }>;
  gastosPorCuenta: Array<{ cuenta: string; monto: number; color: string }>;
  evolucion: Array<{ label: string; valor: number }>;
  flujo: Array<{ label: string; ingresos: number; gastos: number }>;
  presupuesto: Record<
    "necesidades" | "deseos" | "ahorro",
    { presupuestado: number; gastado: number }
  >;
  ingresosMes: number;
  recientes: TxRow[];
}

export interface DebtRow {
  id: number;
  nombre: string;
  tipo: "por_pagar" | "por_cobrar";
  personaOAcreedor: string;
  montoOriginal: number;
  saldoPendiente: number;
  fechaInicio: string;
}

export interface CuotaRow {
  id: number;
  accountId: number;
  descripcion: string;
  monto: number;
  meses: number;
  tasaAnual: number;
  cuota: number;
  total: number;
  pagadas: number;
  fecha: string;
  transactionId: number;
  cuenta: string;
}

export interface BudgetItem {
  categoriaId: number;
  nombre: string;
  icono: string;
  color: string;
  grupo: "necesidades" | "deseos" | "ahorro" | null;
  presupuestado: number;
  gastado: number;
}

export interface BudgetData {
  mes: number;
  anio: number;
  ingresosMes: number;
  items: BudgetItem[];
}
