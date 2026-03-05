import type { APIRoute } from "astro";
import { getCustomers, createCustomer } from "@/lib/grpc/customerClient";

export const GET: APIRoute = async () => {
  try {
    const customers = await getCustomers();
    return new Response(JSON.stringify(customers), {
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
    const { social_reason, market_type, group } = body;
    if (!social_reason || !market_type || !group) {
      return new Response(
        JSON.stringify({ error: "social_reason, market_type y group son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const customer = await createCustomer({ social_reason, market_type, group });
    return new Response(JSON.stringify(customer), {
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
