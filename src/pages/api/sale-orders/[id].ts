import type { APIRoute } from "astro";
import { getSaleOrderByID } from "@/lib/grpc/saleOrderClient";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "id requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const order = await getSaleOrderByID(id);
    return new Response(JSON.stringify(order), {
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
