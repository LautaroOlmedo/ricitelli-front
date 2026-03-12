import type { APIRoute } from "astro";
import { createOrder } from "@/lib/grpc/applicationClient";
import { COOKIE_NAME } from "@/lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { customer_id, items, currency, market, destination_country, sale_type } = body;
    if (!customer_id || !items?.length) {
      return new Response(
        JSON.stringify({ error: "customer_id e items son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const result = await createOrder({ customer_id, items, currency, market, destination_country, sale_type }, token);
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
