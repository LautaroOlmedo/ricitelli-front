import type { APIRoute } from "astro";
import { getSaleOrders, createSaleOrder } from "@/lib/grpc/saleOrderClient";

export const GET: APIRoute = async () => {
  try {
    const orders = await getSaleOrders();
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { customer_id, items } = body;
    if (!customer_id) {
      return new Response(JSON.stringify({ error: "customer_id requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const order = await createSaleOrder(customer_id, items ?? []);
    return new Response(JSON.stringify(order), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};
