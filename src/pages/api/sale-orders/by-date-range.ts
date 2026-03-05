import type { APIRoute } from "astro";
import { getSaleOrdersByDateRange } from "@/lib/grpc/saleOrderClient";

export const GET: APIRoute = async ({ url }) => {
  const from = url.searchParams.get("from") ?? "";
  const to   = url.searchParams.get("to")   ?? "";

  if (!from || !to) {
    return new Response(
      JSON.stringify({ error: "Los parámetros 'from' y 'to' son requeridos (formato YYYY-MM-DD)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const orders = await getSaleOrdersByDateRange(from, to);
    return new Response(JSON.stringify(orders), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const status = e.code === 5 ? 404 : 503;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
