import type { APIRoute } from "astro";
import { searchCustomersBySocialReason } from "@/lib/grpc/customerClient";

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("q") ?? "";
  if (!query.trim()) {
    return new Response(JSON.stringify({ error: "El parámetro 'q' es requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const customers = await searchCustomersBySocialReason(query);
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
