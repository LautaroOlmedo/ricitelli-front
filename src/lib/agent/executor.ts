// Tool executor — calls the gRPC clients based on tool name
import { getToken } from "@/lib/grpc/tokenManager";
import { getProducts, getProductByID, createProduct } from "@/lib/grpc/productClient";
import {
  getCustomers,
  getCustomerByID,
  createCustomer,
  deactivateCustomer,
  placeOrder,
  getOrdersByCustomer,
} from "@/lib/grpc/customerClient";
import { getSaleOrders, getSaleOrderByID } from "@/lib/grpc/saleOrderClient";
import {
  getProductionOrders,
  getProductionOrderByID,
} from "@/lib/grpc/productionOrderClient";
import { createOrder } from "@/lib/grpc/applicationClient";
import {
  getDrySupplies,
  getStockTricapa,
  addStock,
} from "@/lib/grpc/drySupplyClient";
import {
  getInventoryReport,
  getLowStockAlerts,
  getProductTricapa,
  convertSVtoPT,
} from "@/lib/grpc/inventoryClient";

export async function executeTool(name: string, args: any): Promise<string> {
  const tok = await getToken();
  switch (name) {
    // ── Productos ────────────────────────────────────────────
    case "listar_productos": {
      const r = await getProducts(tok);
      return JSON.stringify(r);
    }
    case "obtener_producto": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getProductByID(args.id, tok);
      return JSON.stringify(r);
    }
    case "crear_producto": {
      const bom = (args?.bods ?? []).map((b: any) => ({
        dry_supply_id: b.dry_supply_id,
        quantity_per_unit: Number(b.quantity_per_unit),
      }));
      await createProduct(args.name, bom, tok);
      return JSON.stringify({ ok: true, message: "Producto creado exitosamente" });
    }

    // ── Pedidos de Venta ─────────────────────────────────────
    case "listar_pedidos_venta": {
      const r = await getSaleOrders(tok);
      return JSON.stringify(r);
    }
    case "obtener_pedido_venta": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getSaleOrderByID(args.id, tok);
      return JSON.stringify(r);
    }

    // ── Órdenes de Producción ────────────────────────────────
    case "listar_ordenes_produccion": {
      const r = await getProductionOrders(tok);
      return JSON.stringify(r);
    }
    case "obtener_orden_produccion": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getProductionOrderByID(args.id, tok);
      return JSON.stringify(r);
    }

    // ── Servicio de Aplicación ───────────────────────────────
    case "crear_orden_completa": {
      if (!args?.customer_id || !args?.items?.length)
        throw new Error("customer_id e items son requeridos");
      const r = await createOrder({
        customer_id: args.customer_id,
        items: args.items,
        currency: args.currency,
        market: args.market,
        destination_country: args.destination_country,
        sale_type: args.sale_type,
      }, tok);
      return JSON.stringify(r);
    }

    // ── Insumos Secos ────────────────────────────────────────
    case "listar_insumos": {
      const r = await getDrySupplies(tok);
      return JSON.stringify(r);
    }
    case "obtener_tricapa_insumo": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getStockTricapa(args.id, tok);
      return JSON.stringify(r);
    }
    case "agregar_stock_insumo": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      if (!args?.quantity || args.quantity < 1) throw new Error("quantity debe ser >= 1");
      await addStock(args.id, Number(args.quantity), args.reference ?? "agente-ia", tok);
      return JSON.stringify({ ok: true, message: `Stock agregado: ${args.quantity} unidades` });
    }

    // ── Inventario ───────────────────────────────────────────
    case "reporte_inventario": {
      const r = await getInventoryReport(tok);
      return JSON.stringify(r);
    }
    case "alertas_stock_bajo": {
      const r = await getLowStockAlerts(tok);
      return JSON.stringify(r.dry_supply_alerts ?? []);
    }
    case "obtener_tricapa_producto": {
      if (!args?.product_id) throw new Error("se requiere el campo 'product_id'");
      const r = await getProductTricapa(args.product_id, tok);
      return JSON.stringify(r);
    }
    case "convertir_sv_a_pt": {
      if (!args?.product_id) throw new Error("se requiere 'product_id'");
      if (!args?.quantity || args.quantity < 1) throw new Error("quantity debe ser >= 1");
      if (!args?.lot_number) throw new Error("se requiere 'lot_number'");
      await convertSVtoPT(args.product_id, Number(args.quantity), args.lot_number, tok);
      return JSON.stringify({
        ok: true,
        message: `Conversión SV→PT exitosa: ${args.quantity} unidades, lote ${args.lot_number}`,
      });
    }

    // ── Clientes ─────────────────────────────────────────────
    case "listar_clientes": {
      const r = await getCustomers(tok);
      return JSON.stringify(r);
    }
    case "obtener_cliente": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getCustomerByID(args.id, tok);
      return JSON.stringify(r);
    }
    case "crear_cliente": {
      if (!args?.social_reason || !args?.market_type || !args?.group)
        throw new Error("social_reason, market_type y group son requeridos");
      const r = await createCustomer({
        social_reason: args.social_reason,
        market_type: args.market_type,
        group: args.group,
      }, tok);
      return JSON.stringify(r);
    }
    case "desactivar_cliente": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await deactivateCustomer(args.id, tok);
      return JSON.stringify(r);
    }
    case "pedidos_por_cliente": {
      if (!args?.customer_id) throw new Error("se requiere el campo 'customer_id'");
      const r = await getOrdersByCustomer(args.customer_id, tok);
      return JSON.stringify(r);
    }
    case "hacer_pedido_cliente": {
      if (!args?.customer_id || !args?.items?.length)
        throw new Error("customer_id e items son requeridos");
      const r = await placeOrder({
        customer_id: args.customer_id,
        items: args.items,
        currency: args.currency,
        destination_country: args.destination_country,
        sale_type: args.sale_type,
      }, tok);
      return JSON.stringify(r);
    }

    // ── Resumen ──────────────────────────────────────────────
    case "resumen_sistema": {
      const [products, sales, production, alerts] = await Promise.all([
        getProducts(tok),
        getSaleOrders(tok),
        getProductionOrders(tok),
        getLowStockAlerts(tok),
      ]);
      return JSON.stringify({
        total_productos: products.length,
        total_pedidos_venta: sales.length,
        total_ordenes_produccion: production.length,
        insumos_stock_bajo: (alerts.dry_supply_alerts ?? []).filter((a: any) => a.is_low).length,
      });
    }

    default:
      throw new Error(`herramienta desconocida: ${name}`);
  }
}
