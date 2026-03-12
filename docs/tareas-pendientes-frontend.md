# Tareas Pendientes - Frontend (Ricitelli)

Fecha de análisis: 2026-03-12
Basado en: `riccitelli-guide.md` + análisis del código actual

---

## Estado Actual del Frontend

**Implementado correctamente:**
- Dashboard con KPIs básicos (contadores de clientes, pedidos, alertas)
- Lista y creación de clientes
- Catálogo de productos (lista + creación con BOM dinámico)
- Órdenes de venta: lista, creación compleja, detalle con pipeline de estado
- Órdenes de producción: lista y detalle
- Dashboard de inventario con vista tricapa + modal de conversión SV→PT
- Chat con asistente IA con 30+ herramientas y streaming
- Creación conversacional de pedidos (máquina de estados)
- Visualización de alertas de stock bajo

---

## TAREAS PENDIENTES

---

### TAREA FE-01: Formulario de Creación de Insumos Secos (Dry Supplies)

**Prioridad:** Crítica
**Archivo a crear:** `src/pages/dry-supplies/new.astro`
**Archivos a modificar:** `src/pages/dry-supplies/index.astro`

**Descripción:**
La página de insumos secos existe en la navegación pero no permite crear nuevos insumos. Es imposible dar de alta nuevos tipos de packaging sin esta funcionalidad.

**Pasos detallados:**

1. **Crear `src/pages/dry-supplies/new.astro`** con el siguiente formulario:
   - Campo **Código (SKU)**: input text, requerido, placeholder "ej: IF1156"
   - Campo **Nombre**: input text, requerido, placeholder "ej: Cápsula Hey Malbec"
   - Campo **Categoría**: select con opciones mapeadas desde las constantes del backend:
     - `LABEL` → "Etiqueta"
     - `CONTRAETIQUETA` → "Contraetiqueta"
     - `BOX` → "Caja de cartón"
     - `CORK` → "Corcho"
     - `CAPSULE` → "Cápsula"
     - `BOTTLE` → "Botella"
     - `OTHER` → "Otro"
   - Campo **Unidad**: input text, requerido, placeholder "ej: unidades"
   - Campo **Punto de Reorden**: input number, mínimo 0, default 0, ayuda "Cantidad mínima de alerta (0 = sin alerta)"
   - Botones: "Crear Insumo" (submit) y "Cancelar" (vuelve a `/dry-supplies`)

2. **Crear endpoint `src/pages/api/dry-supplies/index.ts`** (POST):
   ```typescript
   // POST handler
   // Body: { code, name, category, unit, reorder_point }
   // Llama a drySupplyClient.createDrySupply(code, name, category, unit)
   // Retorna 201 con el insumo creado
   ```

3. **En el formulario**, manejar:
   - Estado de carga (spinner en botón durante submit)
   - Error de código duplicado (mostrar mensaje claro)
   - Redirect a `/dry-supplies` en éxito con mensaje de confirmación en query param `?created=true`

4. **En `src/pages/dry-supplies/index.astro`**:
   - Agregar botón "+ Nuevo Insumo" en el header que lleve a `/dry-supplies/new`
   - Si hay `?created=true` en la URL, mostrar un banner de éxito

**Criterios de aceptación:**
- Crear un insumo desde el formulario y que aparezca en la lista
- Intentar crear con código duplicado muestra un error descriptivo

---

### TAREA FE-02: Formulario para Agregar Stock a un Insumo Seco

**Prioridad:** Crítica
**Archivo a modificar:** `src/pages/dry-supplies/index.astro`
**Archivo a crear:** `src/pages/api/dry-supplies/[id]/stock.ts`

**Descripción:**
El backend tiene el endpoint `AddStock` para insumos, pero el frontend no expone ninguna UI para registrar ingresos de stock. El equipo de bodega no puede cargar las recepciones de packaging.

**Pasos detallados:**

1. **Agregar modal "Agregar Stock" en `src/pages/dry-supplies/index.astro`:**
   - Trigger: botón "+ Stock" en cada fila de la tabla de insumos
   - El modal debe mostrar el nombre e insumo seleccionado
   - Campos del modal:
     - **Cantidad**: input number, mínimo 1, requerido
     - **Referencia**: input text, opcional, placeholder "ej: Remito proveedor #1234, Compra octubre"
   - Botones: "Confirmar" (submit) y "Cancelar"

2. **Crear `src/pages/api/dry-supplies/[id]/stock.ts`:**
   ```typescript
   // POST handler
   // Params: id (dry supply ID)
   // Body: { quantity: number, reference?: string }
   // Llama a drySupplyClient.addStock(id, quantity, reference)
   // Retorna 200 en éxito
   ```

3. **Manejo de estado en la página:**
   - Guardar en `selectedSupplyId` y `selectedSupplyName` cuando se hace click en "+ Stock"
   - Al confirmar, hacer fetch a `/api/dry-supplies/{id}/stock` con POST
   - En éxito: cerrar modal y recargar la página para ver el stock actualizado

4. **Mostrar stock tricapa en la tabla** (actualmente probablemente no se muestra):
   - Columna "Físico", columna "Comprometido", columna "Disponible"
   - Resaltar en rojo filas donde el disponible esté bajo el punto de reorden

**Criterios de aceptación:**
- Agregar 100 unidades a un insumo y ver que su stock físico aumenta en la tabla
- El modal se cierra y la tabla se actualiza al confirmar

---

### TAREA FE-03: Página de Detalle de Insumo Seco con Historial de Movimientos

**Prioridad:** Alta
**Archivo a crear:** `src/pages/dry-supplies/[id].astro`
**Archivo a crear:** `src/pages/api/dry-supplies/[id]/index.ts`

**Descripción:**
No existe página de detalle para un insumo seco. El equipo necesita ver el historial completo de movimientos (ingresos, compromisos, consumos) para auditoría y control.

**Pasos detallados:**

1. **Crear `src/pages/api/dry-supplies/[id]/index.ts`** (GET):
   - Llama a `drySupplyClient.getDrySupplyByID(id)`
   - Llama a `drySupplyClient.getStockTricapa(id)`
   - Retorna ambos en un objeto `{ supply, tricapa }`

2. **Crear `src/pages/dry-supplies/[id].astro`:**
   - Header con nombre, código, categoría, unidad
   - Tarjeta de **Stock Tricapa**: tres métricas grandes (Físico / Comprometido / Disponible) con colores (verde=ok, naranja=bajo)
   - Sección **Punto de Reorden**: mostrar el umbral configurado
   - Sección **Historial de Movimientos**: tabla con columnas:
     - Fecha, Tipo de Movimiento (IN/COMMITTED/RELEASED/CONSUMED/ADJUSTED), Cantidad (+/-), Referencia
   - Botón "Agregar Stock" que abre el mismo modal de FE-02
   - Botón "Editar" que lleva al formulario de edición (ver FE-07)
   - Breadcrumb: Insumos > [Nombre del Insumo]

3. **En `src/pages/dry-supplies/index.astro`:**
   - Hacer que el nombre en cada fila sea un link a `/dry-supplies/{id}`

**Criterios de aceptación:**
- Navegar a un insumo muestra su stock actual y todos sus movimientos históricos
- La referencia de cada movimiento es legible

---

### TAREA FE-04: Formularios de Edición (Clientes, Productos, Insumos)

**Prioridad:** Alta
**Archivos a crear:** `src/pages/customers/[id]/edit.astro`, `src/pages/products/[id]/edit.astro`, `src/pages/dry-supplies/[id]/edit.astro`
**Archivos a crear:** endpoints API correspondientes

**Descripción:**
No existe manera de editar registros existentes. Si el equipo comete un error al cargar un cliente o producto, debe recrearlo.

**Sub-tareas:**

#### FE-04a: Editar Cliente
1. **Crear `src/pages/api/customers/[id].ts`** (GET + PATCH):
   - GET: llama a `customerClient.getCustomerByID(id)`, retorna el cliente
   - PATCH: recibe `{ social_reason?, market_type?, group? }`, llama al endpoint `UpdateCustomer` del backend
2. **Crear `src/pages/customers/[id]/edit.astro`:**
   - Carga los datos actuales del cliente vía fetch al GET endpoint
   - Formulario pre-llenado con los mismos campos de creación
   - Al guardar, hace PATCH y redirige a la lista de clientes
3. **En `src/pages/customers/index.astro`:** Agregar botón "Editar" en cada fila de la tabla.

#### FE-04b: Editar Producto
1. **Crear `src/pages/api/products/[id].ts`** (GET + PATCH):
   - GET: llama a `productClient.getProductByID(id)`
   - PATCH: recibe `{ name?, bom? }`, llama al endpoint `UpdateProduct` del backend
2. **Crear `src/pages/products/[id]/edit.astro`:**
   - Misma UI que el formulario de creación pero pre-llenado
   - Los ítems del BOM se cargan en las filas dinámicas
   - Advertencia: "Modificar el BOM afectará nuevas órdenes de producción"
3. **En `src/pages/products/index.astro`:** Agregar botón "Editar" por fila.

#### FE-04c: Editar Insumo Seco
1. **Modificar `src/pages/api/dry-supplies/[id]/index.ts`** para agregar PATCH:
   - Recibe `{ name?, reorder_point? }` (el código no es editable)
   - Llama al endpoint `UpdateDrySupply` del backend
2. **Crear `src/pages/dry-supplies/[id]/edit.astro`:**
   - Campos editables: Nombre, Punto de Reorden
   - El código/SKU se muestra como texto no editable
   - Al guardar, redirige al detalle del insumo

**Criterios de aceptación:**
- Editar el nombre de un cliente y que aparezca actualizado en la lista
- Modificar el BOM de un producto y que nuevas órdenes usen el BOM actualizado

---

### TAREA FE-05: Dashboard Comercial con Gráficos

**Prioridad:** Alta
**Archivos a modificar:** `src/pages/index.astro`
**Archivos a crear:** componentes de gráficos en `src/components/charts/`

**Descripción:**
El dashboard actual solo muestra contadores. El guide requiere gráficos de: Ventas por Mercado/País, Rendimiento por Línea de Vino, Control de Fugas, y Ratio SV vs PT.

**Pasos detallados:**

1. **Instalar librería de gráficos:**
   ```bash
   npm install chart.js
   ```

2. **Crear `src/components/charts/BarChart.astro`:**
   - Recibe props: `id: string`, `labels: string[]`, `datasets: ChartDataset[]`, `title: string`
   - Renderiza un `<canvas>` con Chart.js inicializado via `<script>`
   - Exporta el tipo `ChartDataset` para TypeScript

3. **Crear `src/components/charts/PieChart.astro`:**
   - Misma estructura, para gráficos de torta/dona

4. **Crear `src/pages/api/reports/summary.ts`** (GET):
   - Llama al endpoint `GetSalesByMarket` del backend (ver BE-07)
   - Llama al endpoint `GetProductPerformance` del backend
   - Llama a `getInventoryReport()` para el ratio SV/PT
   - Retorna todo en un objeto consolidado

5. **Actualizar `src/pages/index.astro`** para agregar las siguientes secciones:

   **Sección: Ratio SV vs PT**
   - `PieChart` con dos segmentas: "Sin Vestir" y "Producto Terminado"
   - Calcular sumando todos los productos del inventario

   **Sección: Ventas por Mercado**
   - `BarChart` con barras para DOMESTIC vs EXPORT
   - Sub-gráfico de torta con top 5 países de exportación

   **Sección: Top Productos por Rotación**
   - `BarChart` horizontal con los 10 productos más vendidos (por cantidad)
   - Filtro de período: últimos 30 días / 90 días / 12 meses (select)

   **Sección: Control de Fugas**
   - Tabla simple (no gráfico) con columnas: Tipo, Cantidad de Pedidos, Botellas, % del Total
   - Tipos: Muestra Aduana, Obsequio, Consumo Interno, Muestra Comercial

**Criterios de aceptación:**
- El ratio SV/PT muestra los datos reales del inventario
- Los gráficos se renderizan sin errores de consola
- El filtro de período en "Top Productos" actualiza el gráfico sin recargar la página

---

### TAREA FE-06: Vista Kanban para Órdenes de Venta

**Prioridad:** Media
**Archivo a crear:** `src/pages/sale-orders/kanban.astro`
**Archivo a modificar:** `src/layouts/AppLayout.astro`

**Descripción:**
El guide especifica un "Pipeline de Pedidos tipo Kanban". Actualmente solo existe una tabla. La vista Kanban permite ver el flujo de órdenes de un vistazo.

**Pasos detallados:**

1. **Crear `src/pages/sale-orders/kanban.astro`:**

   **Layout del Kanban:**
   - 5 columnas (scroll horizontal si no entra en pantalla):
     - **Nueva** (status: `NEW`) — color: gris
     - **Lista para Despacho** (status: `READY_TO_DISPATCH`) — color: azul
     - **Confirmada** (status: `CONFIRMED`) — color: amarillo
     - **Facturada** (status: `INVOICED`) — color: naranja
     - **Despachada** (status: `DISPATCHED`) — color: verde

   **Cada tarjeta de orden muestra:**
   - ID corto (últimos 8 chars del UUID)
   - Nombre del cliente
   - Mercado (DOMESTIC/EXPORT) con badge de color
   - País de destino (si es export)
   - Moneda + tipo de venta
   - Cantidad de ítems
   - Fecha de creación (formato DD/MM/YYYY)
   - Botón de avanzar estado (flecha →)

2. **Al hacer click en una tarjeta**, navegar a `/sale-orders/{id}`

3. **Al hacer click en el botón de avanzar estado:**
   - Hacer PATCH a `/api/sale-orders/{id}` con el siguiente estado
   - Mover la tarjeta a la columna siguiente con animación CSS (transition)
   - En error: mostrar toast de error

4. **Filtros en el header del kanban:**
   - Select de Mercado (Todos / Interno / Exportación)
   - Select de Moneda (Todos / ARS / USD / EUR / CAD)
   - Input de búsqueda por cliente (filtra tarjetas en tiempo real)

5. **En la navegación (`AppLayout.astro`):**
   - Agregar toggle "Vista Tabla / Vista Kanban" en la página de órdenes de venta
   - Persistir preferencia en `localStorage`

**Criterios de aceptación:**
- Todas las órdenes aparecen en su columna correspondiente
- Avanzar el estado de una tarjeta la mueve a la columna siguiente
- El filtro por mercado oculta las tarjetas que no corresponden

---

### TAREA FE-07: Página de Detalle de Cliente

**Prioridad:** Media
**Archivo a crear:** `src/pages/customers/[id].astro`
**Archivo a modificar:** `src/pages/customers/index.astro`

**Descripción:**
No existe una página de detalle para clientes. No se puede ver el historial de pedidos de un cliente ni sus datos completos desde la UI.

**Pasos detallados:**

1. **Crear `src/pages/api/customers/[id].ts`** (GET) si no existe:
   - Llama a `customerClient.getCustomerByID(id)`
   - Llama a `customerClient.getOrdersByCustomer(id)` (devuelve sus órdenes)
   - Retorna `{ customer, orders }`

2. **Crear `src/pages/customers/[id].astro`:**
   - Header: Razón Social, estado activo/inactivo, badge de tipo de mercado, badge de grupo
   - Sección **Datos del Cliente**: todos los campos
   - Sección **Órdenes del Cliente**: tabla con las últimas N órdenes
     - Columnas: ID, Estado, Moneda, Tipo, País Destino, Ítems, Fecha
     - Cada fila es un link a `/sale-orders/{id}`
   - Botones en header: "Editar", "Desactivar" (con confirm dialog)
   - Breadcrumb: Clientes > [Razón Social]

3. **En `src/pages/customers/index.astro`:**
   - Hacer que el nombre en cada fila sea un link a `/customers/{id}`
   - Agregar botón de acción "Ver" al final de cada fila

**Criterios de aceptación:**
- Navegar al detalle de un cliente muestra sus datos y todas sus órdenes
- El botón "Desactivar" muestra un diálogo de confirmación antes de ejecutar

---

### TAREA FE-08: Filtros y Búsqueda en Listados de Órdenes

**Prioridad:** Media
**Archivos a modificar:** `src/pages/sale-orders/index.astro`, `src/pages/production-orders/index.astro`

**Descripción:**
Los listados de órdenes no tienen filtros. Con volumen real de datos, encontrar una orden específica es imposible.

**Pasos detallados:**

1. **En `src/pages/sale-orders/index.astro`**, agregar barra de filtros arriba de la tabla:
   - **Buscador por cliente**: input text que filtra en tiempo real por nombre de cliente
   - **Filtro por Estado**: select múltiple o botones toggle con todos los estados
   - **Filtro por Mercado**: select (Todos / Interno / Exportación)
   - **Filtro por Tipo de Venta**: select (Todos / Venta / Muestra Aduana / Obsequio / etc.)
   - **Filtro por Rango de Fechas**: dos inputs date (desde / hasta) que llaman al endpoint `GetSaleOrdersByDateRange` del backend si se usan, o filtran localmente si las órdenes ya están cargadas
   - **Botón "Limpiar filtros"**: resetea todos los filtros

2. **Implementación técnica:**
   - Todos los filtros son client-side sobre el array de órdenes ya cargado (sin nueva petición al backend)
   - Excepto el filtro de fechas: si se especifica un rango, hacer un nuevo fetch a `/api/sale-orders?from=X&to=Y` para no cargar todas las órdenes
   - Crear endpoint `src/pages/api/sale-orders/index.ts` que acepte query params `from`, `to`, `status`, `market`

3. **En `src/pages/production-orders/index.astro`:**
   - Agregar filtro por Estado (IN_PROGRESS / COMPLETED / CANCELLED)
   - Agregar buscador por ID de orden de venta relacionada

4. **Paginación simple**: Si hay más de 50 órdenes, mostrar paginación con botones "Anterior" / "Siguiente" y contador "Mostrando X-Y de Z"

**Criterios de aceptación:**
- Filtrar por estado "DISPATCHED" muestra solo órdenes despachadas
- El filtro de fechas devuelve órdenes del rango correcto
- Con 100+ órdenes, la paginación divide en páginas de 50

---

### TAREA FE-09: Gestión de Producto - Página de Detalle

**Prioridad:** Media
**Archivo a crear:** `src/pages/products/[id].astro`
**Archivo a modificar:** `src/pages/products/index.astro`

**Descripción:**
No existe página de detalle para productos. El equipo no puede ver el BOM completo de un producto ni su inventario actual (tricapa) desde la lista.

**Pasos detallados:**

1. **Crear `src/pages/api/products/[id].ts`** (GET):
   - Llama a `productClient.getProductByID(id)`
   - Llama a `inventoryClient.getProductTricapa(id)`
   - Llama a `inventoryClient.getInventoryReport()` y filtra el producto
   - Retorna `{ product, tricapa, movements }`

2. **Crear `src/pages/products/[id].astro`:**
   - Header: Nombre del producto, estado activo/inactivo
   - Sección **Stock Tricapa**: tarjetas con Sin Vestir disponible / PT Físico / PT Comprometido / PT Disponible
   - Sección **Bill of Materials (BOM)**: tabla con:
     - Código del insumo, nombre, categoría, cantidad por unidad de producto
     - Link al detalle de cada insumo (`/dry-supplies/{id}`)
   - Sección **Historial de Movimientos del Inventario**: tabla con fecha, tipo, etapa (SV/PT), cantidad, lote, referencia
   - Botones: "Editar Producto", "Convertir SV → PT" (abre modal igual al de inventario)
   - Breadcrumb: Productos > [Nombre]

3. **En `src/pages/products/index.astro`:**
   - El nombre de cada producto debe ser un link a `/products/{id}`

**Criterios de aceptación:**
- Navegar al detalle muestra el stock actual del producto en tricapa
- El BOM lista todos los insumos con sus cantidades

---

### TAREA FE-10: Notificaciones y Alertas en Tiempo Real

**Prioridad:** Media
**Archivos a modificar:** `src/layouts/AppLayout.astro`
**Archivos a crear:** `src/components/NotificationBell.astro`

**Descripción:**
No existe sistema de notificaciones. El equipo no sabe cuando hay quiebres de stock o cuando hay órdenes pendientes de despacho sin ingresar a las páginas específicas.

**Pasos detallados:**

1. **Crear `src/pages/api/notifications.ts`** (GET):
   - Llama a `inventoryClient.getLowStockAlerts()`
   - Llama a `saleOrderClient.getSaleOrders()` y filtra las que tienen estado `READY_TO_DISPATCH`
   - Retorna `{ lowStockCount, readyToDispatchCount, items: [...] }`

2. **Crear `src/components/NotificationBell.astro`:**
   - Ícono de campana en el header de la aplicación
   - Badge con número total de notificaciones (rojo si > 0)
   - Al hacer click, despliega un dropdown con:
     - Lista de insumos con stock bajo (máx 5, con link a `/dry-supplies/{id}`)
     - Lista de órdenes listas para despacho (máx 5, con link a `/sale-orders/{id}`)
     - Link "Ver todas las alertas" → `/inventory`
   - Polling automático cada 60 segundos con `setInterval` para actualizar el contador

3. **Integrar en `src/layouts/AppLayout.astro`:**
   - Colocar `<NotificationBell />` en el header, a la derecha del nombre de la sección
   - Pasar la data inicial (SSR) para evitar flash de badge vacío

**Criterios de aceptación:**
- El badge muestra el número correcto de alertas al cargar
- Al agregar stock a un insumo y actualizar, el contador del badge baja
- El dropdown muestra los items de alerta con links funcionales

---

### TAREA FE-11: Exportación de Datos a Excel/CSV

**Prioridad:** Baja
**Archivos a modificar:** páginas de listados

**Descripción:**
El equipo de Riccitelli trabaja extensamente con Excel. Debe poder exportar los listados de órdenes e inventario.

**Pasos detallados:**

1. **Instalar librería de exportación:**
   ```bash
   npm install xlsx
   ```
   (librería SheetJS para exportar a XLSX desde el browser)

2. **Crear `src/lib/exportUtils.ts`** con:
   ```typescript
   export function exportToExcel(data: object[], filename: string): void
   export function exportToCSV(data: object[], filename: string): void
   ```
   - `exportToExcel`: usa SheetJS para generar y descargar un XLSX
   - `exportToCSV`: convierte el array a CSV y descarga como archivo `.csv`

3. **En `src/pages/sale-orders/index.astro`:**
   - Botón "Exportar Excel" que exporta las órdenes actualmente visibles (con los filtros aplicados)
   - Columnas: ID, Cliente, Estado, Mercado, Moneda, Tipo Venta, País Destino, Cant. Ítems, Fecha

4. **En `src/pages/inventory/index.astro`:**
   - Botón "Exportar Stock" que exporta la tabla de inventario completa
   - Dos hojas: Productos (con tricapa) e Insumos Secos (con tricapa y punto de reorden)

5. **En `src/pages/production-orders/index.astro`:**
   - Botón "Exportar" para exportar la lista de órdenes de producción

**Criterios de aceptación:**
- Exportar órdenes de venta genera un XLSX descargable con las columnas correctas
- El XLSX de inventario tiene dos hojas separadas para productos e insumos
- La exportación respeta los filtros activos (solo exporta lo que se ve en pantalla)

---

### TAREA FE-12: Vista de Calendario para Órdenes de Producción

**Prioridad:** Baja
**Archivo a completar:** `src/pages/production-orders/calendar.astro`
_(Este archivo está referenciado en la navegación pero no está completamente implementado)_

**Descripción:**
El layout de la aplicación ya tiene un link al calendario de producción, pero la implementación está incompleta.

**Pasos detallados:**

1. **Instalar librería de calendario:**
   ```bash
   npm install @fullcalendar/core @fullcalendar/daygrid @fullcalendar/list
   ```

2. **En `src/pages/production-orders/calendar.astro`:**
   - Inicializar FullCalendar con vista de mes (`dayGridMonth`) como default
   - Cargar todas las órdenes de producción vía `productionOrderClient.getProductionOrders()`
   - Mapear cada orden como un evento de calendario:
     - `title`: ID corto de la orden + nombre del primer producto
     - `date`: `created_at` de la orden
     - `color`: verde si COMPLETED, azul si IN_PROGRESS, rojo si CANCELLED
   - Al hacer click en un evento, navegar a `/production-orders/{id}`

3. **Agregar botones de vista en el header:**
   - "Vista Mensual" (dayGridMonth)
   - "Vista de Lista" (listMonth): muestra órdenes en formato de lista cronológica

4. **Filtro por estado** encima del calendario:
   - Checkboxes: IN_PROGRESS / COMPLETED / CANCELLED
   - Toggle/filtro que muestra/oculta los eventos por color

**Criterios de aceptación:**
- Las órdenes de producción aparecen en el día de su creación
- Los colores distinguen los estados correctamente
- Click en un evento navega al detalle de la orden

---

### TAREA FE-13: Mejoras de UX - Validaciones y Feedback

**Prioridad:** Media
**Archivos a modificar:** todos los formularios

**Descripción:**
Los formularios actuales tienen validación básica. Se deben mejorar las validaciones y el feedback al usuario.

**Pasos detallados:**

1. **En el formulario de Nuevo Pedido (`/sale-orders/new.astro`):**
   - Validar que la cantidad de cada ítem sea > 0 antes de submit
   - Validar que el precio unitario sea ≥ 0
   - Mostrar el total estimado del pedido en tiempo real (suma de cantidad × precio × tipo de cambio aproximado)
   - Si el país de destino es diferente al de la moneda (ej: cliente de Japón con moneda ARS), mostrar advertencia

2. **En el formulario de Nuevo Producto (`/products/new.astro`):**
   - Al agregar una fila de BOM, verificar que el dry supply ID existe (autocomplete desde los insumos cargados)
   - En lugar de input de texto libre para el ID del insumo, usar un select/autocomplete con los insumos existentes
   - Mostrar el nombre del insumo seleccionado al lado del selector

3. **Feedback global:**
   - Crear `src/components/ui/Toast.astro`: componente de notificación toast para mensajes de éxito/error
   - Las operaciones exitosas muestran un toast verde (ej: "Insumo creado correctamente")
   - Las operaciones con error muestran un toast rojo con el mensaje de error del backend

4. **Loading states:**
   - Todos los botones de submit deben mostrar spinner + texto "Guardando..." mientras la petición está en curso
   - Deshabilitar el botón durante la petición para evitar doble submit
   - Si la página tarda en cargar datos, mostrar skeleton loaders en lugar de pantalla en blanco

**Criterios de aceptación:**
- El autocomplete de insumos en el formulario de producto sugiere insumos existentes
- Los toasts de éxito/error aparecen en la esquina superior derecha y desaparecen solos en 3 segundos
- Los botones de submit no pueden clickearse dos veces

---

### TAREA FE-14: Autenticación - Login y Protección de Rutas

**Prioridad:** Alta
**Archivos a crear:** `src/pages/login.astro`, `src/middleware.ts`, `src/lib/auth.ts`

**Descripción:**
El sistema no tiene autenticación. Cualquier persona con la URL puede acceder a todos los datos. Se necesita una pantalla de login y protección de todas las rutas.

**Pasos detallados:**

1. **Crear `src/lib/auth.ts`:**
   ```typescript
   export function getToken(): string | null  // Lee JWT de cookie/localStorage
   export function setToken(token: string): void  // Guarda JWT en cookie HttpOnly
   export function clearToken(): void  // Elimina JWT
   export function isAuthenticated(): boolean  // Verifica si hay token válido
   ```

2. **Crear `src/pages/api/auth/login.ts`** (POST):
   - Recibe `{ username, password }`
   - Llama al endpoint `Login` del backend (ver BE-08)
   - Si éxito: setea cookie `auth_token` (HttpOnly, Secure, SameSite=Strict) y retorna `{ ok: true }`
   - Si error: retorna `{ ok: false, error: "Credenciales inválidas" }` con status 401

3. **Crear `src/pages/api/auth/logout.ts`** (POST):
   - Elimina la cookie `auth_token`
   - Retorna `{ ok: true }`

4. **Crear `src/middleware.ts`** (Astro middleware):
   - Para todas las rutas excepto `/login` y `/api/auth/*`:
     - Verificar si existe la cookie `auth_token`
     - Si no existe: redirigir a `/login`
     - Si existe: continuar con el request

5. **Crear `src/pages/login.astro`:**
   - Diseño simple centrado, con el logo de Riccitelli
   - Campos: Usuario y Contraseña
   - Botón "Ingresar"
   - Mensaje de error si las credenciales son incorrectas
   - Redirige a `/` en login exitoso

6. **Agregar botón "Cerrar Sesión"** en el sidebar/header de `AppLayout.astro`:
   - Al hacer click: llama a `POST /api/auth/logout` y redirige a `/login`

7. **En todos los gRPC clients (`src/lib/grpc/*.ts`):**
   - Agregar el token JWT al metadata de cada llamada gRPC: `authorization: Bearer {token}`

**Criterios de aceptación:**
- Navegar a `/sale-orders` sin login redirige a `/login`
- Login exitoso redirige al dashboard
- Cerrar sesión elimina el token y redirige al login
- Las llamadas al backend incluyen el token en el header

---

### TAREA FE-15: Responsividad Mobile

**Prioridad:** Baja
**Archivos a modificar:** layouts, tablas, formularios

**Descripción:**
La interfaz actual está optimizada para desktop. El equipo de operaciones de bodega puede necesitar acceder desde dispositivos móviles.

**Pasos detallados:**

1. **En `src/layouts/AppLayout.astro`:**
   - Convertir el sidebar en un menú hamburguesa en pantallas < 768px
   - El menú se despliega como un overlay cuando se hace click en el ícono de hamburguesa
   - Se cierra al hacer click afuera o al seleccionar una página

2. **Para todas las tablas de listados:**
   - En mobile (< 640px), colapsar las columnas menos importantes
   - Para sale-orders: mostrar solo Cliente + Estado + Fecha en mobile, el resto al expandir
   - Usar `hidden sm:table-cell` de Tailwind para las columnas secundarias

3. **Para los formularios:**
   - Todos los formularios deben ser de una sola columna en mobile
   - Los selects deben ser nativos en mobile (no custom dropdowns)

4. **Para el dashboard:**
   - Las tarjetas de KPI deben estar en grid de 2 columnas en mobile (actualmente probablemente son 4)
   - Los gráficos deben ajustar su height para ser legibles en mobile

**Criterios de aceptación:**
- La aplicación es usable en iPhone 12 (viewport 390px)
- El menú hamburguesa funciona correctamente
- Los formularios no requieren scroll horizontal en mobile
