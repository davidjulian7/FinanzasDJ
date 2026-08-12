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
  budgetSubcategoryId: number | null;
  cuenta: string;
  cuentaDestino: string | null;
  categoria: string | null;
  icono: string | null;
  color: string | null;
  subcategoryNombre: string | null;
  subcategoryGroupKey: string | null;
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

export interface BudgetSubcategoryRow {
  id: number;
  budgetGroupId: number;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
  activo: boolean;
}

export interface BudgetSubcategoryWithGroup extends BudgetSubcategoryRow {
  budgetGroup: BudgetGroupRow | undefined;
}

export interface ExpenseCategoryRow {
  id: number;
  nombre: string;
  icono: string;
  color: string;
  tipo: "gasto" | "ingreso";
  budgetSubcategoryId: number | null;
  activo: boolean;
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

export interface BudgetSubcategoryWithDetails extends BudgetSubcategoryRow {
  budgetGroup?: BudgetGroupRow;
  expenseCategories?: ExpenseCategoryRow[];
  recurrents?: RecurringExpenseRow[];
  presupuestado?: number;
  gastado?: number;
}

export interface BudgetGroupWithSubcategories extends BudgetGroupRow {
  subcategories: BudgetSubcategoryWithDetails[];
}

export interface ReglaPct {
  necesidades: number;
  deseos: number;
  ahorro: number;
}

export interface BudgetConfigData {
  mes: number;
  anio: number;
  quincena: number;
  ingresosQuincena: number;
  regla: ReglaPct;
  groups: BudgetGroupWithSubcategories[];
}

export interface BudgetExecutionData {
  mes: number;
  anio: number;
  quincena: number;
  ingresosQuincena: number;
  regla: ReglaPct;
  groups: Array<{
    group: BudgetGroupRow;
    subcategories: Array<BudgetSubcategoryWithDetails & {
      expenseCategories?: ExpenseCategoryRow[];
      recurrents?: RecurringExpenseRow[];
      progreso?: number;
      disponible?: number;
    }>;
    totalPresupuestado: number;
    totalGastado: number;
    progreso: number;
  }>;
}