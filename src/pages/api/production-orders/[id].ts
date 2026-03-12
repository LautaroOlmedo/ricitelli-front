import type { APIRoute } from "astro";
import { getProductionOrderByID } from "@/lib/grpc/productionOrderClient";
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
    const order = await getProductionOrderByID(id, token);
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
