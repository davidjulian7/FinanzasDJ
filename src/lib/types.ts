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
  apartadoId: number | null;
  cuenta: string;
  cuentaDestino: string | null;
  categoria: string | null;
  icono: string | null;
  color: string | null;
  budgetGroupKey: string | null;
  apartado: string | null;
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

export interface BudgetGroupRow {
  id: number;
  key: "necesidades" | "deseos" | "ahorro";
  label: string;
  color: string;
  icono: string;
  orden: number;
}

export interface ExpenseCategoryRow {
  id: number;
  nombre: string;
  icono: string;
  color: string;
  tipo: "gasto" | "ingreso";
  budgetGroupId: number | null;
  activo: boolean;
  budgetGroup: BudgetGroupRow | null;
}

export interface RecurringExpenseRow {
  id: number;
  nombre: string;
  monto: number;
  frecuencia: "semanal" | "quincenal" | "mensual" | "anual";
  proximoCobro: string;
  expenseCategoryId: number;
  accountId: number;
  budgetGroupId: number;
  nota: string | null;
  activo: boolean;
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
    { presupuestado: number; gastado: number; apartado: number }
  >;
  ingresosMes: number;
  recientes: TxRow[];
  reservado: number;
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

export interface ReglaPct {
  necesidades: number;
  deseos: number;
  ahorro: number;
}

export interface BudgetConfigGroup {
  id: number;
  key: "necesidades" | "deseos" | "ahorro";
  label: string;
  color: string;
  icono: string;
  orden: number;
  categorias: ExpenseCategoryRow[];
  recurrentTotal: number;
}

export interface BudgetConfigData {
  mes: number;
  anio: number;
  quincena: number;
  ingresosQuincena: number;
  regla: ReglaPct;
  groups: BudgetConfigGroup[];
  sinGrupo: ExpenseCategoryRow[];
}

export interface BudgetExecutionGroup {
  group: BudgetGroupRow;
  categorias: Array<{ id: number; nombre: string; icono: string; color: string; gastado: number }>;
  presupuestado: number;
  gastado: number;
  progreso: number;
  disponible: number;
  reservado: number;
  recurrentTotal: number;
  apartados: ApartadoPendiente[];
}

export interface ApartadoPendiente {
  id: number;
  nombre: string;
  color: string;
  icono: string;
  cuota: number;
  registrado: boolean;
  monto: number;
  categoriaId: number | null;
  categoriaNombre: string | null;
  gastadoQuincena: number;
}

export interface ApartadoListo {
  id: number;
  nombre: string;
  color: string;
  icono: string;
  juntado: number;
  objetivo: number;
}

export interface BudgetExecutionData {
  mes: number;
  anio: number;
  quincena: number;
  ingresosQuincena: number;
  regla: ReglaPct;
  groups: BudgetExecutionGroup[];
  apartadosListos: ApartadoListo[];
}

export type ApartadoPeriodicidad = "mensual" | "anual";
export type ApartadoEstado = "activo" | "listo" | "atrasado";

export interface ApartadoRow {
  id: number;
  nombre: string;
  montoObjetivo: number;
  montoQuincena: number | null;
  periodicidad: ApartadoPeriodicidad;
  diaPago: number;
  mesPago: number | null;
  budgetGroupId: number | null;
  categoriaId: number | null;
  cuentaId: number | null;
  fechaInicio: string;
  icono: string;
  color: string;
  nota: string | null;
  activo: boolean;
  orden: number;
  cuotaSugerida: number;
  cuotaEfectiva: number;
  ultimoPago: string | null;
  vencimiento: string;
  juntado: number;
  faltante: number;
  progreso: number;
  estado: ApartadoEstado;
  grupo: BudgetGroupRow | null;
  categoria: ExpenseCategoryRow | null;
  cuenta: AccountRow | null;
  apartadoQuincena: { anio: number; mes: number; quincena: 1 | 2; registrado: boolean; monto: number };
  gastadoQuincena: number;
}
