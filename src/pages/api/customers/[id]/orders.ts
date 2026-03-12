import type { APIRoute } from "astro";
import { getOrdersByCustomer, placeOrder } from "@/lib/grpc/customerClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ params, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "id requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const orders = await getOrdersByCustomer(id, token);
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

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "id requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { items, currency, destination_country, sale_type } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const order = await placeOrder({
      customer_id: id,
      items,
      currency,
      destination_country,
      sale_type,
    }, token);
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
