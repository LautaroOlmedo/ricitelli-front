import type { APIRoute } from "astro";
import { getProductionOrders } from "@/lib/grpc/productionOrderClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const orders = await getProductionOrders(token);
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
