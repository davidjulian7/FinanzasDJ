# FinanzasDJ

Aplicación web **personal** de control de finanzas: cuentas y tarjetas, transacciones, presupuesto 50/30/20, gastos recurrentes, apartados, deudas y gráficas filtrables por rango de tiempo.

Stack: **Next.js 15** (App Router) + TypeScript · Tailwind CSS + shadcn/ui · **Supabase** (Auth + PostgreSQL) + **Drizzle ORM** · Recharts · Framer Motion · Zustand.

## Requisitos

- Node.js **18.18+** (probado con Node 24)
- Un proyecto **Supabase** (plan Free alcanza) con las tablas migradas y RLS aplicado (ver más abajo).

## Configuración

1. Copia `.env.example` a `.env.local` y completá los valores de tu proyecto Supabase:

   | Variable | De dónde sale |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (solo se usa en el servidor) |
   | `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (modo Transaction, pooler) |

   **Seguridad**: las claves de service role y de la base de datos dan acceso total. Nunca las subas a git ni las expongas al navegador. Si alguna vez se filtraron, regeneralas desde el dashboard de Supabase.

2. En el dashboard de Supabase, en **Authentication → URL Configuration**:

   - Site URL: la dirección de tu app (ej. `http://localhost:3000` en desarrollo).
   - Redirect URLs: agregá el dominio de tu app con `/**` (ej. `http://localhost:3000/**`).

   Sin esto, los enlaces de confirmación de registro y cambio de correo no funcionan.

3. Verificá que **Authentication → Providers → Email → Confirm email** esté activado (el registro pide confirmación por correo).

## Instalación y arranque

```bash
npm install
npm run db:migrate   # aplica migraciones y el hardening de datos (FK, CHECK, índices)
npm run dev          # http://localhost:3000
```

Creá tu primer usuario desde la app (`/login` → "Crear cuenta"). El usuario queda pendiente hasta confirmar el correo que envía Supabase.

Para producción:

```bash
npm run build
npm run start
```

### RLS (Row Level Security)

El script `supabase/rls.sql` habilita RLS en las tablas del usuario y crea las políticas de acceso. Aplicalo una vez por base de datos:

```bash
npx tsx --env-file=.env.local <ruta-al-script-de-aplicacion>   # o ejecutá el SQL en Supabase → SQL Editor
```

> No uses `FORCE ROW LEVEL SECURITY`: el acceso administrativo por `DATABASE_URL` (rol owner) dejaría de ver datos.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera migraciones desde el esquema Drizzle |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Carga datos de ejemplo para un usuario existente |
| `npm run db:setup` | Migrar + seed |
| `npm run user:create` | Crea un usuario y lo deja confirmado (script admin) |

## Estructura

```
src/
├─ app/
│  ├─ (auth)/login/          → pantalla de login/registro
│  ├─ (app)/dashboard/       → resumen, gráficas, presupuesto, recientes
│  ├─ (app)/transacciones/   → listado, filtros, edición, export CSV
│  ├─ (app)/cuentas/         → tarjetas de cuentas (débito/crédito/efectivo/inversión)
│  ├─ (app)/presupuesto/     → editor 50/30/20, ejecución quincenal y apartados
│  ├─ (app)/gastos-recurrentes/ → suscripciones y gastos automáticos
│  ├─ (app)/deudas/          → "Debo" / "Me deben" con registro de pagos y cobros
│  ├─ (app)/configuracion/   → perfil, contraseña y apariencia
│  ├─ api/                   → API routes (auth, accounts, transactions, budgets, debts…)
│  └─ error.tsx + not-found.tsx
├─ components/               → UI reutilizable (AccountCard, TransactionModal, DateRangePicker…)
├─ lib/
│  ├─ db/                    → esquema Drizzle + conexión + seed
│  ├─ supabase/              → clientes de Auth (server y admin)
│  ├─ services.ts            → lógica de negocio (saldos, transferencias, deudas, cuotas)
│  ├─ rate-limit.ts          → límite de intentos distribuido (tabla auth_attempts)
│  ├─ dashboard.ts           → agregaciones del dashboard (servidor)
│  ├─ settings.ts · apartados.ts · ranges.ts · format.ts · api.ts
└─ stores/                   → Zustand: sesión y rango de fechas
```

## Cómo funciona

- **Sin backend separado**: todo pasa por las API routes (`/api/...`) que leen/escriben PostgreSQL con Drizzle.
- **Autenticación con Supabase**: login/registro por correo y contraseña con confirmación de email, sesión en cookies `SameSite=Strict` (`Secure` en producción) y protección CSRF por header `Origin`.
- **Seguridad por fila**: las tablas del usuario están protegidas con RLS; el acceso por API usa el service role del servidor, y cada consulta filtra por `user_id` de la sesión.
- **Saldos automáticos**: registrar, editar o eliminar un movimiento ajusta los saldos de las cuentas (los gastos en tarjeta de crédito suman a la deuda; pagar tarjeta es una transferencia hacia ella). Los pagos de cuotas y deudas usan transacciones con bloqueos para evitar doble cobro.
- **Filtro de tiempo global**: el selector del dashboard (Hoy / 7 días / Este mes / 3 meses / Este año / Todo / rango personalizado) re-consulta los datos sin recargar la página.
- **Patrimonio**: sumatoria de cuentas (las de crédito restan). La evolución se reconstruye desde los movimientos del período.
- **Presupuesto 50/30/20**: el editor distribuye los ingresos de la quincena entre Necesidades / Deseos / Ahorro y asigna montos por categoría, con gastos recurrentes y apartados.
- **Cuotas**: registrá una compra financiada con tasa anual y la app calcula la cuota y registra cada pago.
- **Apartados**: ahorro con objetivo y fecha (mensual/anual) vinculado a presupuesto, con ejecución quincenal.
- **Deudas**: cada pago/cobro reduce el saldo pendiente y, opcionalmente, registra un movimiento en una cuenta.
- **CSV**: el botón de la pantalla Transacciones exporta lo filtrado (separador `;`, compatible con Excel en es-AR).
- **Tema**: oscuro por defecto, toggle a claro desde la barra o el menú de cuenta.

## Deploy en Vercel

1. Creá el proyecto y conectá tu repositorio.
2. En **Settings → Environment Variables**, copiá las 4 variables de `.env.local` (las públicas con `NEXT_PUBLIC_` pueden exponerse; las otras dos quedan solo del lado del servidor).
3. En Supabase → **Authentication → URL Configuration**, actualizá Site URL y Redirect URLs con el dominio de Vercel (ej. `https://finanzasdj.vercel.app/**`).
4. Corré una vez `npm run db:migrate` desde tu máquina (o aplicá las migraciones con un job/CICD antes de subir).

Notas de producción:

- El plan Free de Supabase limita los correos automáticos (aprox. 4/hora). Para volúmenes mayores conviene configurar un SMTP propio (Resend, SendGrid…) en Authentication → SMTP.
- Las tablas RLS y las migraciones se aplican una sola vez por base de datos, no por deploy.