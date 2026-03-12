import type { APIRoute } from "astro";
import { getCustomers, createCustomer } from "@/lib/grpc/customerClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const customers = await getCustomers(token);
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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { social_reason, market_type, group } = body;
    if (!social_reason || !market_type || !group) {
      return new Response(
        JSON.stringify({ error: "social_reason, market_type y group son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const customer = await createCustomer({ social_reason, market_type, group }, token);
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
