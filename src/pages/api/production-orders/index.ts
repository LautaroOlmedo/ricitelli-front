import type { APIRoute } from "astro";
import { getProductionOrders } from "@/lib/grpc/productionOrderClient";

export const GET: APIRoute = async () => {
  try {
    const orders = await getProductionOrders();
    return new Response(JSON.stringify(orders), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};
