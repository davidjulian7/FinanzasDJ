# FinanzasDJ

Aplicación web **personal** de control de finanzas: cuentas y tarjetas, transacciones, presupuesto 50/30/20, deudas y gráficas filtrables por rango de tiempo.

Stack: **Next.js 15** (App Router) + TypeScript · Tailwind CSS + shadcn/ui · **SQLite** (`better-sqlite3`) + **Drizzle ORM** · Recharts · Framer Motion · Zustand.

## Requisitos

- Node.js **18.18+** (probado con Node 24)
- Windows / macOS / Linux. En Windows con npm 11+, la primera instalación pide aprobar el script de compilación nativo de `better-sqlite3`:

```bash
npm install
npm install-scripts approve better-sqlite3   # solo si npm lo pide
```

## Instalación y arranque

```bash
npm install
npm run db:setup    # crea data/finanzas.db con migraciones + datos de ejemplo
npm run dev         # http://localhost:3000
```

PIN por defecto: **1234** (se puede cambiar desde el menú "Mi cuenta").

Para producción local:

```bash
npm run build
npm run start
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera migraciones desde el esquema Drizzle |
| `npm run db:migrate` | Aplica migraciones |
| `npm run db:seed` | Carga datos de ejemplo (no hace nada si ya hay datos) |
| `npm run db:setup` | Migrar + seed |

La base de datos vive en `data/finanzas.db` (se crea sola al arrancar). Está en `.gitignore`.

## Estructura

```
src/
├─ app/
│  ├─ (auth)/login/          → pantalla de PIN
│  ├─ (app)/dashboard/       → resumen, gráficas, presupuesto, recientes
│  ├─ (app)/transacciones/   → listado, filtros, edición, export CSV
│  ├─ (app)/cuentas/         → tarjetas de cuentas (débito/crédito/efectivo/inversión)
│  ├─ (app)/presupuestos/    → editor 50/30/20 + presupuestos por categoría
│  ├─ (app)/deudas/          → "Debo" / "Me deben" con registro de pagos y cobros
│  └─ api/                   → API routes (dashboard, transactions, accounts, budgets, debts, auth)
├─ components/               → UI reutilizable (AccountCard, TransactionModal, DateRangePicker…)
├─ lib/
│  ├─ db/                    → esquema Drizzle + conexión + seed
│  ├─ dashboard.ts           → agregaciones del dashboard (servidor)
│  ├─ services.ts            → lógica de negocio (saldos, transferencias, deudas)
│  ├─ ranges.ts              → presets de rango de fechas (hoy, semana, mes, año…)
│  ├─ format.ts · api.ts · types.ts
└─ stores/                   → Zustand: sesión (PIN) y rango de fechas
```

## Cómo funciona

- **Sin backend separado**: todo pasa por las API routes (`/app/api/...`) que leen/escriben SQLite con Drizzle.
- **Saldos automáticos**: registrar, editar o eliminar un movimiento ajusta los saldos de las cuentas (los gastos en tarjeta de crédito suman a la deuda; pagar tarjeta es una transferencia hacia ella).
- **Filtro de tiempo global**: el selector del dashboard (Hoy / 7 días / Este mes / 3 meses / Este año / Todo / rango personalizado) re-consulta los datos sin recargar la página.
- **Patrimonio**: sumatoria de cuentas (las de crédito restan). La evolución se reconstruye desde los movimientos del período.
- **Presupuesto 50/30/20**: el editor distribuye los ingresos del mes entre Necesidades / Deseos / Ahorro y asigna montos por categoría.
- **Deudas**: cada pago/cobro reduce el saldo pendiente y, opcionalmente, registra un movimiento en una cuenta.
- **CSV**: el botón de la pantalla Transacciones exporta lo filtrado (separador `;`, compatible con Excel en es-AR).
- **Tema**: oscuro por defecto, toggle a claro desde la barra o el menú de cuenta.

## Datos de ejemplo

`npm run db:seed` genera ~3 meses de movimientos coherentes con los saldos finales de las cuentas: sueldos, gastos recurrentes, pagos de tarjetas, ahorro e inversiones.

## Notas

- El login con PIN protege la interfaz; para una app local/personal es suficiente (la API no exige token).
- Moneda y formato de montos: es-AR / ARS, editable en `src/lib/format.ts`.
- Deploy en Vercel: la base es un archivo local, así que en Vercel el almacenamiento es efímero (se reseeda en cada instancia). El uso previsto es **local** (`npm run dev` / `npm start`).
