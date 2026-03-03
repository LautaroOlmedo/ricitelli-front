// Tool definitions for the LLM agent — mirrors llm/internal/agent/tools.go

const prop = (type: string, description: string) => ({ type, description });

export const toolDefs = [
  // ── Productos ────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "listar_productos",
      description: "Lista todos los productos del catálogo con su Bill of Materials (BOM).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "obtener_producto",
      description: "Obtiene el detalle completo de un producto por su ID.",
      parameters: {
        type: "object",
        properties: { id: prop("string", "ID único del producto.") },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_producto",
      description: "Crea un nuevo producto en el catálogo con su lista de insumos secos (BOM).",
      parameters: {
        type: "object",
        properties: {
          name: prop("string", "Nombre del producto."),
          bods: {
            type: "array",
            description: "Lista de insumos secos necesarios por unidad.",
            items: {
              type: "object",
              properties: {
                dry_supply_id: prop("string", "ID del insumo seco."),
                quantity_per_unit: { type: "integer", description: "Cantidad requerida por unidad." },
              },
              required: ["dry_supply_id", "quantity_per_unit"],
            },
          },
        },
        required: ["name"],
      },
    },
  },
  // ── Pedidos de Venta ─────────────────────────────────────
  {
    type: "function",
    function: {
      name: "listar_pedidos_venta",
      description: "Lista todos los pedidos de venta registrados.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "obtener_pedido_venta",
      description: "Obtiene el detalle de un pedido de venta por su ID.",
      parameters: {
        type: "object",
        properties: { id: prop("string", "ID único del pedido de venta.") },
        required: ["id"],
      },
    },
  },
  // ── Órdenes de Producción ────────────────────────────────
  {
    type: "function",
    function: {
      name: "listar_ordenes_produccion",
      description: "Lista todas las órdenes de producción generadas.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "obtener_orden_produccion",
      description: "Obtiene el detalle de una orden de producción por su ID.",
      parameters: {
        type: "object",
        properties: { id: prop("string", "ID único de la orden de producción.") },
        required: ["id"],
      },
    },
  },
  // ── Servicio de Aplicación ───────────────────────────────
  {
    type: "function",
    function: {
      name: "crear_orden_completa",
      description:
        "Crea un pedido de venta y su orden de producción automáticamente. Usar cuando el cliente quiere encargar productos.",
      parameters: {
        type: "object",
        properties: {
          customer_id: prop("string", "ID del cliente que realiza el pedido."),
          items: {
            type: "array",
            description: "Productos solicitados con cantidad y precio.",
            items: {
              type: "object",
              properties: {
                product_id: prop("string", "ID del producto."),
                quantity: { type: "integer", description: "Cantidad de unidades." },
                unit_price: { type: "number", description: "Precio unitario." },
              },
              required: ["product_id", "quantity", "unit_price"],
            },
          },
        },
        required: ["customer_id", "items"],
      },
    },
  },
  // ── Resumen ──────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "resumen_sistema",
      description:
        "Devuelve un resumen del sistema: total de productos, pedidos de venta y órdenes de producción.",
      parameters: { type: "object", properties: {} },
    },
  },
];
