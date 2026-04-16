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
          currency: prop("string", "Moneda: ARS | USD | EUR | CAD. Default ARS."),
          market: prop("string", "Mercado: DOMESTIC | EXPORT. Default DOMESTIC."),
          destination_country: prop("string", "País de destino (opcional, requerido en EXPORT)."),
          sale_type: prop("string", "Tipo de salida: SALE | SAMPLE_CUSTOMS | GIFT | INTERNAL | COMMERCIAL_SAMPLE. Default SALE."),
        },
        required: ["customer_id", "items"],
      },
    },
  },
  // ── Insumos Secos ────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "listar_insumos",
      description: "Lista todos los insumos secos (etiquetas, cajas, corchos, etc.) con su categoría y unidad.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "obtener_tricapa_insumo",
      description: "Obtiene el stock tricapa (físico, comprometido, disponible) de un insumo seco por su ID.",
      parameters: {
        type: "object",
        properties: { id: prop("string", "ID del insumo seco.") },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "agregar_stock_insumo",
      description: "Agrega stock a un insumo seco (registra una entrada de material).",
      parameters: {
        type: "object",
        properties: {
          id: prop("string", "ID del insumo seco."),
          quantity: { type: "integer", description: "Cantidad a agregar." },
          reference: prop("string", "Referencia del movimiento (ej: OC-2024-001)."),
        },
        required: ["id", "quantity"],
      },
    },
  },
  // ── Inventario ───────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "reporte_inventario",
      description:
        "Obtiene el reporte completo de inventario: stock tricapa de todos los productos (SV/PT) y alertas de insumos secos.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "alertas_stock_bajo",
      description: "Lista los insumos secos con stock disponible por debajo del umbral mínimo.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "obtener_tricapa_producto",
      description: "Obtiene el stock tricapa de un producto (SV sin vestir, PT físico/comprometido/disponible).",
      parameters: {
        type: "object",
        properties: { product_id: prop("string", "ID del producto.") },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "convertir_sv_a_pt",
      description:
        "Convierte botellas Sin Vestir (SV) en Producto Terminado (PT), asignando un número de lote.",
      parameters: {
        type: "object",
        properties: {
          product_id: prop("string", "ID del producto a convertir."),
          quantity: { type: "integer", description: "Cantidad de unidades a convertir." },
          lot_number: prop("string", "Número de lote asignado (ej: LOT-2024-001)."),
        },
        required: ["product_id", "quantity", "lot_number"],
      },
    },
  },
  // ── Clientes ─────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "listar_clientes",
      description: "Lista todos los clientes registrados con su razón social, tipo de mercado, grupo comercial y estado.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "obtener_cliente",
      description: "Obtiene el detalle de un cliente por su ID.",
      parameters: {
        type: "object",
        properties: { id: prop("string", "ID único del cliente.") },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_cliente",
      description: "Registra un nuevo cliente en el sistema.",
      parameters: {
        type: "object",
        properties: {
          social_reason: prop("string", "Razón social del cliente."),
          market_type: prop("string", "Tipo de mercado: INTERNAL | EXTERNAL."),
          group: prop("string", "Grupo comercial: DISTRIBUTOR | WINE_SHOP | RESTAURANT | HOTEL | RETAIL | PRIVATE | EXPORT_AGENT."),
        },
        required: ["social_reason", "market_type", "group"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "desactivar_cliente",
      description: "Desactiva un cliente existente por su ID.",
      parameters: {
        type: "object",
        properties: { id: prop("string", "ID único del cliente a desactivar.") },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pedidos_por_cliente",
      description: "Lista todos los pedidos de venta asociados a un cliente.",
      parameters: {
        type: "object",
        properties: { customer_id: prop("string", "ID del cliente.") },
        required: ["customer_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hacer_pedido_cliente",
      description: "Crea un pedido de venta en nombre de un cliente. El mercado (DOMESTIC/EXPORT) se infiere automáticamente del market_type del cliente.",
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
          currency: prop("string", "Moneda: ARS | USD | EUR | CAD. Default ARS."),
          destination_country: prop("string", "País destino ISO-3166 alpha-2 (requerido para clientes EXTERNAL)."),
          sale_type: prop("string", "Tipo de venta: SALE | SAMPLE_CUSTOMS | GIFT | INTERNAL | COMMERCIAL_SAMPLE. Default SALE."),
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
        "Devuelve un resumen del sistema: total de productos, pedidos de venta, órdenes de producción e insumos con stock bajo.",
      parameters: { type: "object", properties: {} },
    },
  },
  // ── Informes (PDF) ───────────────────────────────────────
  {
    type: "function",
    function: {
      name: "generar_informe_ventas",
      description:
        "Genera un informe PDF de ventas para un rango de fechas. Devuelve un link de descarga. Las fechas deben estar en formato RFC3339 (ej: 2024-01-01T00:00:00Z). Opcionalmente filtra por mercado (DOMESTIC|EXPORT) o moneda (ARS|USD|EUR|CAD).",
      parameters: {
        type: "object",
        properties: {
          from_date: prop("string", "Fecha desde en RFC3339."),
          to_date: prop("string", "Fecha hasta en RFC3339."),
          market: prop("string", "Mercado opcional (DOMESTIC o EXPORT)."),
          currency: prop("string", "Moneda opcional (ARS, USD, EUR, CAD)."),
        },
        required: ["from_date", "to_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generar_informe_produccion",
      description:
        "Genera un informe PDF de producción: SV producidas, conversiones SV→PT, consumo e ingreso de insumos, y órdenes de producción. Fechas en RFC3339.",
      parameters: {
        type: "object",
        properties: {
          from_date: prop("string", "Fecha desde en RFC3339."),
          to_date: prop("string", "Fecha hasta en RFC3339."),
          product_id: prop("string", "ID de producto opcional."),
        },
        required: ["from_date", "to_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generar_informe_general",
      description:
        "Genera un informe general que combina ventas, producción y salud de inventario. Ideal para un resumen ejecutivo. Fechas en RFC3339.",
      parameters: {
        type: "object",
        properties: {
          from_date: prop("string", "Fecha desde en RFC3339."),
          to_date: prop("string", "Fecha hasta en RFC3339."),
        },
        required: ["from_date", "to_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generar_informe_stock_bajo",
      description:
        "Genera un informe PDF de insumos secos con stock bajo e incluye la cantidad recomendada de reposición. No requiere fechas.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "generar_informe_trazabilidad_lote",
      description:
        "Genera un informe PDF con la cadena completa de movimientos de un lote específico (L-DDMMYY-NNN-XX). Útil para auditorías.",
      parameters: {
        type: "object",
        properties: {
          lot_number: prop("string", "Número de lote a trazar."),
        },
        required: ["lot_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generar_informe_cliente",
      description:
        "Genera un informe PDF comercial para un cliente específico en un rango de fechas. Incluye órdenes, montos, productos favoritos y evolución mensual.",
      parameters: {
        type: "object",
        properties: {
          customer_id: prop("string", "ID del cliente."),
          from_date: prop("string", "Fecha desde en RFC3339."),
          to_date: prop("string", "Fecha hasta en RFC3339."),
        },
        required: ["customer_id", "from_date", "to_date"],
      },
    },
  },
];
