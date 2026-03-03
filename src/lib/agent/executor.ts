// Tool executor — calls the gRPC clients based on tool name
import { getProducts, getProductByID, createProduct } from "@/lib/grpc/productClient";
import { getSaleOrders, getSaleOrderByID } from "@/lib/grpc/saleOrderClient";
import {
  getProductionOrders,
  getProductionOrderByID,
} from "@/lib/grpc/productionOrderClient";
import { createOrder } from "@/lib/grpc/applicationClient";

export async function executeTool(name: string, args: any): Promise<string> {
  switch (name) {
    case "listar_productos": {
      const r = await getProducts();
      return JSON.stringify(r);
    }
    case "obtener_producto": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getProductByID(args.id);
      return JSON.stringify(r);
    }
    case "crear_producto": {
      const bom = (args?.bods ?? []).map((b: any) => ({
        dry_supply_id: b.dry_supply_id,
        quantity_per_unit: Number(b.quantity_per_unit),
      }));
      await createProduct(args.name, bom);
      return JSON.stringify({ ok: true, message: "Producto creado exitosamente" });
    }
    case "listar_pedidos_venta": {
      const r = await getSaleOrders();
      return JSON.stringify(r);
    }
    case "obtener_pedido_venta": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getSaleOrderByID(args.id);
      return JSON.stringify(r);
    }
    case "listar_ordenes_produccion": {
      const r = await getProductionOrders();
      return JSON.stringify(r);
    }
    case "obtener_orden_produccion": {
      if (!args?.id) throw new Error("se requiere el campo 'id'");
      const r = await getProductionOrderByID(args.id);
      return JSON.stringify(r);
    }
    case "crear_orden_completa": {
      if (!args?.customer_id || !args?.items?.length)
        throw new Error("customer_id e items son requeridos");
      const r = await createOrder(args.customer_id, args.items);
      return JSON.stringify(r);
    }
    case "resumen_sistema": {
      const [products, sales, production] = await Promise.all([
        getProducts(),
        getSaleOrders(),
        getProductionOrders(),
      ]);
      return JSON.stringify({
        total_productos: products.length,
        total_pedidos_venta: sales.length,
        total_ordenes_produccion: production.length,
      });
    }
    default:
      throw new Error(`herramienta desconocida: ${name}`);
  }
}
