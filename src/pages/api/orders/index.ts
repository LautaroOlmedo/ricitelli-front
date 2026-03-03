import type { APIRoute } from "astro";
import { createOrder } from "@/lib/grpc/applicationClient";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { customer_id, items } = body;
    if (!customer_id || !items?.length) {
      return new Response(
        JSON.stringify({ error: "customer_id e items son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const result = await createOrder(customer_id, items);
    return new Response(JSON.stringify(result), {
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
