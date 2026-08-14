# Manual de usuario — FinanzasDJ

Guía paso a paso para usar la aplicación sin complicarse. Si haces lo que dice aquí, podrás registrar tus gastos, controlar tus cuentas y armar tu presupuesto en pocos minutos.

---

## 1. Primeros pasos

### Crear tu cuenta (una sola vez)

1. Entra a la página de la aplicación (ej. `http://localhost:3000` en tu computadora).
2. Toca el enlace **"Crea uno gratis"**.
3. Completa:
   - **Nombre**: cómo quieres que te llamemos (ej. "Juan").
   - **Correo electrónico**: el que uses siempre.
   - **Contraseña**: mínimo 8 caracteres.
   - **Repite la contraseña**: la misma de arriba.
4. Toca **"Crear perfil"**.
5. Revisa tu correo: recibirás un enlace de confirmación. Tócalo.

> Importante: hasta no confirmar el correo, no puedes iniciar sesión.

### Iniciar sesión

1. Escribe tu **correo** y **contraseña**.
2. Toca **"Ingresar"**.

Si algo falla, la aplicación te avisa con un mensaje (ej. "Correo o contraseña incorrectos").

---

## 2. Cómo moverte por la aplicación

A la izquierda (en el celular, abajo) está el menú con todas las secciones:

| Menú | Para qué sirve |
| --- | --- |
| **Dashboard** | Tu resumen: cuánto tienes, gastos e ingresos, gráficas. |
| **Transacciones** | El historial de todos tus movimientos, con filtros y búsqueda. |
| **Cuentas** | Tus cuentas: débito, crédito, efectivo e inversiones. |
| **Presupuesto** | La regla 50/30/20 y el control de cada quincena. |
| **Apartados** | Ahorro para pagos futuros (renta, suscripciones, viajes...). |
| **Gastos recurrentes** | Pagos que se repiten cada semana, mes o año. |
| **Deudas** | Lo que debes y lo que te deben. |
| **Configuración** | Tu nombre, correo, contraseña y tus categorías. |

En el menú también puedes:
- Cambiar entre **modo oscuro / claro** (botón de sol/luna arriba o en tu menú de usuario).
- **Cerrar sesión**.

---

## 3. Dashboard (tu resumen)

Es la primera pantalla al entrar. Aquí ves todo de un vistazo:

- **4 tarjetas**: Patrimonio neto, Liquidez (débito + efectivo), Deudas de tarjetas e Inversiones.
- **4 gráficas**: gastos por categoría, evolución de tu patrimonio, ingresos vs gastos y gasto por cuenta.
- **Presupuesto 50/30/20**: cuánto gastaste de cada grupo en la quincena.
- **Transacciones recientes**: los últimos movimientos.

### El filtro de tiempo (muy importante)

Arriba tienes el selector de período: **Hoy**, **Últimos 7 días**, **Quincena**, **Este mes**, **Últimos 3 meses**, **Este año**, **Todo** o un rango personalizado (elige "Desde" y "Hasta").

> Todo lo que veas (gráficas, totales, transacciones) corresponde al período elegido. Cámbialo cuando quieras ver otro momento.

### Registrar un movimiento desde el Dashboard

1. Toca el botón flotante **"Registrar movimiento"** (abajo a la derecha).
2. Completa el formulario (explicado en la sección 4).
3. Listo: el Dashboard se actualiza solo.

---

## 4. Registrar movimientos (gastos, ingresos y transferencias)

El formulario aparece desde el botón **"Registrar movimiento"** del Dashboard o el botón **"Nuevo"** en Transacciones. Tiene 3 pestañas:

### Gasto (lo más común)

1. Pestaña **Gasto** (roja).
2. **Descripción**: ej. "Supermercado".
3. **Monto**: cuánto pagaste.
4. **Fecha**: por defecto es hoy.
5. **Cuenta**: con qué pagaste (débito, crédito, efectivo...).
6. **Categoría**: elige una (Comida, Transporte, Salud...).
7. (Opcional) **Notas**: un detalle extra.
8. Toca **"Registrar"**.

> Dato: si pagas con tarjeta de crédito, la aplicación suma automáticamente ese monto a la deuda de la tarjeta.
> ¿Te falta una categoría? Puedes crear la tuya en **Configuración → Categorías** (sección 11).

### Ingreso

Igual que el gasto, pero en la pestaña **Ingreso** (verde). Úsala para sueldo, freelance, etc.

### Transferencia

Para mover dinero entre tus propias cuentas (ej. del débito a una inversión):

1. Pestaña **Transferencia** (azul).
2. **Descripción**: ej. "Pasar a inversión".
3. **Monto** y **Fecha**.
4. **Cuenta origen**: de dónde sale.
5. **Cuenta destino**: a dónde va (no puede ser la misma).
6. Toca **"Registrar"**.

---

## 5. Cuentas

Entra a **Cuentas** para ver todas tus cuentas ordenadas por tipo: débito, tarjetas de crédito, efectivo e inversiones. Arriba ves el total de tu patrimonio.

### Crear una cuenta

1. Toca **"Agregar cuenta"**.
2. Completa:
   - **Nombre**: ej. "TDC BBVA" o "Cuenta sueldo".
   - **Tipo**: Débito, Crédito, Efectivo o Inversión.
   - **Saldo actual**: lo que tiene la cuenta hoy (en crédito, tu deuda).
   - **Límite de crédito** (solo crédito): para ver cuánto te queda disponible.
   - **Día de corte** y **día límite de pago** (solo crédito).
   - **Color** e **icono**: para reconocerla rápido.
3. Toca **"Crear cuenta"**.

> Truco: si el nombre empieza con "TDC", la aplicación lo configura solo como tarjeta de crédito.

### Gestionar una cuenta (editar, gastar, pagar tarjeta)

Toca una cuenta y verás sus pestañas:

- **Cuenta**: cambiar nombre, saldo, límite, color, etc.
- **Gasto**: registrar un gasto rápido desde esa cuenta.
- **Ingreso**: registrar un ingreso rápido.
- **Pagar** (solo crédito): pagar la tarjeta desde otra cuenta. Elige "Se paga desde", el monto, y la aplicación reduce la deuda y registra el movimiento.
- **Meses** (solo crédito): comprar algo en cuotas.

### Compras a meses (tarjeta de crédito)

1. En la tarjeta, pestaña **"Meses"**.
2. Completa: **Descripción** (ej. "TV 55 pulgadas"), **Monto**, **Cantidad de meses** (1 a 48), **Interés anual %** (pon 0 si es sin intereses) y **Fecha**.
3. La aplicación te muestra la cuota mensual antes de guardar.
4. Toca **"Registrar compra a meses"**.

Después, en "Compras a meses activas", puedes ir pagando cada cuota con el botón **"✓ Pagar cuota N"** (la aplicación lo hace sola en el corte).

---

## 6. Presupuesto 50/30/20

La idea: de cada ingreso, **50% a necesidades**, **30% a deseos** y **20% a ahorro**. La aplicación te ayuda a cumplirlo por quincena.

### Configurar la regla

1. Entra a **Presupuesto** (o el enlace "Editar" del Dashboard).
2. Elige el **mes** y la **quincena** (1ra o 2da).
3. Escribe tu **ingreso de la quincena**. Si esta quincena aún no tiene ingreso guardado, la aplicación lo sugiere automáticamente: primero usa el total de tus **ingresos registrados** (categoría Sueldo, Freelance, etc.) dentro de esa quincena y, si no hay, toma el ingreso de la **última quincena registrada**. Puedes dejarlo o cambiarlo.
4. Ajusta los porcentajes (50 / 30 / 20 o los que quieras). La aplicación te indica si suman 100% y puede ajustar los otros números automáticamente si te pasas.
5. Toca **"Guardar presupuesto"**.

### Asignar categorías a cada grupo

Cada grupo (Necesidades, Deseos, Ahorro) muestra sus categorías:

- Usa el selector **"Asignar categoría…"** para agregar categorías al grupo.
- Toca el botón **−** para quitarlas.

Ejemplo: "Comida y Supermercado" va en Necesidades; "Salidas y Ocio" va en Deseos.

> Solo cuentan en el presupuesto los gastos de categorías asignadas. Si un gasto usa una categoría sin grupo, no cuenta en la regla.

### Ver la ejecución de la quincena

Entra a **Presupuesto → quincena** (desde el menú o el enlace del Dashboard). Aquí ves:

- Tus **ingresos de la quincena** y la regla aplicada.
- Cada grupo con su barra: cuánto gastaste vs cuánto podías gastar ("Restan $X" o "Excedido por $X").
- Los **apartados** del grupo, para apartar el dinero con un toque (ver sección 7).
- Lo **reservado en recurrentes por quincena** (cada recurrente se convierte a su equivalente de quincena según su frecuencia: semanal ×2, quincenal ×1, mensual ÷2, anual ÷24) y lo reservado en apartados.

---

## 7. Apartados (ahorrar para pagos futuros)

Los apartados reservan dinero del presupuesto de cada quincena hacia un pago futuro (renta, seguro, suscripción anual...). **No mueven dinero real**: solo apartan mentalmente de tu presupuesto.

### Crear un apartado

1. Entra a **Apartados**.
2. Toca **"Nuevo apartado"**.
3. Completa:
   - **Nombre**: ej. "Renta".
   - **Monto objetivo**: cuánto necesitas juntar.
   - **Periodicidad**: mensual (se junta en 2 quincenas) o anual (24 quincenas).
   - **Día de pago** (y **mes** si es anual).
   - **Grupo (50/30/20)**: de qué grupo sale la reserva.
   - **Cuota fija** (opcional): si quieres apartar siempre lo mismo; si no, la aplicación calcula la cuota automática.
   - Color, icono y nota (opcional).
4. Toca **"Crear"**.

### Apartar cada quincena

En la pantalla de Apartados (o en la Ejecución quincenal) toca **"Apartar $X"**. Cuando lo juntaste, el apartado queda **"Listo para pagar"**.

### Pagar desde el apartado

1. Toca **"Pagar →"**.
2. La aplicación ya trae la descripción y el monto juntado.
3. Elige la **cuenta de pago** y la **fecha**.
4. Toca **"Registrar pago"**.

> Dato: ese gasto no vuelve a contar en el presupuesto 50/30/20, porque ya estaba reservado.

---

## 8. Gastos recurrentes

Para recordatorios de pagos que se repiten (suscripciones, gimnasio, renta...). **No generan movimientos solos**: solo los tienes anotados para verlos en el presupuesto y recordar cuándo vencen.

### Crear uno

1. Entra a **Gastos recurrentes**.
2. Toca **"Nuevo"**.
3. Completa: **Nombre**, **Monto**, **Frecuencia** (semanal, quincenal, mensual, anual), **Próximo cobro**, **Categoría**, **Cuenta de pago** y **Grupo de presupuesto**.
4. Toca **"Crear"**.

Arriba ves el **estimado mensual** total y cuánto va a Necesidades vs Deseos/Ahorro. Puedes **activar/desactivar** o eliminar cada recurrente con sus botones, y ver los inactivos con el botón "Ver inactivos".

---

## 9. Deudas

La pantalla tiene 3 secciones:

- **Debo (N)**: préstamos o acreedores que tienes que pagar.
- **Compras a meses (N)**: las cuotas de tus compras a meses (se cargan solas desde la tarjeta).
- **Me deben (N)**: dinero que le prestaste a alguien y todavía no te devolvió.

### Registrar una deuda

1. Toca **"Nueva deuda"**.
2. **Nombre**: ej. "Préstamo personal".
3. **Tipo**: "Por pagar (debo)" o "Por cobrar (me deben)".
4. **Persona / entidad**: quién es.
5. **Monto original** y (opcional) **saldo pendiente** actual.
6. Toca **"Crear"**.

### Registrar un pago o cobro

1. En la deuda, toca **"Registrar pago"** (o **"Registrar cobro"** si te deben).
2. Escribe el **monto**.
3. (Opcional) Elige una **cuenta asociada**: la aplicación registra el movimiento de gasto/ingreso y actualiza el saldo de la cuenta. Si no eliges cuenta, solo actualiza la deuda.
4. Toca **"Registrar pago"**.

---

## 10. Transacciones (tu historial)

Entra a **Transacciones** para ver todos tus movimientos. Arriba puedes:

- Elegir el **período** (como en el Dashboard).
- **Buscar** por texto (descripción o notas).
- Filtrar por **cuenta**, **categoría** y **tipo** (gastos, ingresos o transferencias).

### Editar o eliminar un movimiento

- Pasa el mouse por encima de la fila (en el celular, toca la fila): aparecen los botones de **lápiz** (editar) y **papelera** (eliminar).
- Eliminar no se puede deshacer: la aplicación te pide confirmación.

### Exportar a Excel/CSV

1. Ajusta los filtros que quieras.
2. Toca el botón **"CSV"**.
3. Se descarga un archivo `transacciones_....csv` que puedes abrir en Excel.

---

## 11. Configuración

La pantalla tiene 3 secciones:

### Perfil

Cambia tu nombre o tu correo y toca **"Guardar cambios"**.

### Contraseña

Escribe la actual, la nueva (mínimo 8 caracteres) y la confirmación, y toca **"Cambiar contraseña"**.

### Categorías

Cuando creas tu cuenta, la aplicación ya te crea **categorías predeterminadas** listas para usar:

- **Gastos (11)**: Comida y Supermercado, Transporte, Servicios y Alquiler, Salud, Salidas y Ocio, Shopping, Suscripciones, Viajes, Educación, Ahorro e Inversión y Pago de deudas.
- **Ingresos (4)**: Sueldo, Freelance, Otros Ingresos y Cobro de deudas.

Cada categoría tiene su color e icono, y las de gasto pueden pertenecer a un grupo 50/30/20 (Necesidades, Deseos o Ahorro).

**Crear una categoría nueva** (de gasto o de ingreso):

1. Entra a **Configuración** y baja a la sección **Categorías**.
2. Elige el tipo con las pestañas **Gasto** o **Ingreso**.
3. Escribe el **nombre** (ej. "Mascotas", "Regalos").
4. (Solo gastos, opcional) elige el **Grupo 50/30/20** al que pertenece: Necesidades, Deseos o Ahorro. Si no eliges ninguno, los gastos de esa categoría no contarán en la regla.
5. Elige un **color** (toca el círculo que más te guste).
6. Elige un **icono** (desde el selector de iconos).
7. Toca **"Crear categoría"**.

La nueva categoría aparece al instante en los formularios de transacciones, gastos recurrentes y apartados.

**Editar una categoría:**

1. En **Configuración → Categorías**, toca el botón de **lápiz** (✏️) de la categoría que quieras cambiar.
2. Modifica el **nombre**, el **color**, el **icono** o el **grupo 50/30/20**.
3. Toca **"Guardar cambios"**. Los cambios se reflejan en todos los movimientos y formularios.

**Eliminar una categoría:**

1. En **Configuración → Categorías**, toca el botón de **papelera** (🗑️) de la categoría.
2. Confirma la eliminación.

> Al eliminar, los movimientos ya registrados **conservan** la categoría (no se borran ni cambian), pero ya no podrás usarla para registros nuevos. No se puede deshacer.

> El modo claro/oscuro no está aquí: se cambia con el botón de sol/luna del encabezado o desde el menú de tu usuario en la barra lateral.

---

## 12. Consejos para usar bien la aplicación

1. **Empieza por las cuentas**: crea primero tus cuentas y tarjetas con sus saldos reales. Todo lo demás se apoya en eso.
2. **Usa categorías**: cuanto más consistente seas, mejor funcionan el presupuesto y las gráficas.
3. **Configura el presupuesto una vez por quincena**: escribe tu ingreso y los porcentajes, y después solo registra gastos.
4. **Los gastos de crédito suman a la deuda solos**: paga la tarjeta desde la pestaña "Pagar" de la cuenta, no registres el pago como gasto suelto.
5. **Para compras grandes a meses**: cárgalas en la pestaña "Meses" de la tarjeta, así la aplicación calcula las cuotas y las va marcando.
6. **El filtro de tiempo es global**: si ves números raros, revisa qué período tienes seleccionado.

---

## 13. Problemas comunes (y su solución)

| Problema | Solución |
| --- | --- |
| "Correo o contraseña incorrectos" | Revisa que el correo esté confirmado (mira tu bandeja) y que la contraseña sea correcta. |
| "Demasiados intentos" | Espera unos segundos y vuelve a intentar. Es una protección de seguridad. |
| No me llega el correo de confirmación | Revisa la carpeta de spam. Si sigue sin llegar, espera un poco: los correos automáticos tienen un límite por hora. |
| No puedo eliminar una cuenta | Si tiene movimientos asociados, no se puede borrar. Elimina primero sus movimientos. |
| "El monto supera el saldo pendiente" | En pagos de deudas, el monto no puede pasar lo que queda por pagar. |
| No veo datos en una gráfica | Cambia el período con el filtro de tiempo: seguramente no hubo movimientos en ese rango. |
| No encuentro el modo claro | Está arriba a la derecha (sol/luna) o en el menú de tu usuario en la barra lateral. |

---

## 14. Glosario rápido

- **Patrimonio neto**: todo lo que tienes (cuentas + efectivo + inversiones) menos las deudas de tarjetas.
- **Liquidez**: dinero disponible al momento (débito + efectivo).
- **Quincena**: 1ra (días 1 al 15) o 2da (días 16 al fin de mes).
- **Regla 50/30/20**: 50% necesidades, 30% deseos, 20% ahorro.
- **Apartado**: reserva de presupuesto para un pago futuro (no mueve dinero real).
- **Ejecución quincenal**: la vista que te muestra si vas bien o mal con el presupuesto de la quincena.