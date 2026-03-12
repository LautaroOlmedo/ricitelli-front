import type { APIRoute } from "astro";
import { getSaleOrderByID, updateSaleOrderStatus } from "@/lib/grpc/saleOrderClient";
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
    const order = await getSaleOrderByID(id, token);
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

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "id requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const { status: newStatus } = await request.json();
    if (!newStatus) {
      return new Response(JSON.stringify({ error: "status requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const order = await updateSaleOrderStatus(id, newStatus, token);
    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[PATCH sale-order] gRPC error:", { code: e.code, details: e.details, message: e.message });
    const httpStatus = e.code === 5 ? 404 : e.code === 3 || e.code === 9 ? 400 : 503;
    return new Response(JSON.stringify({ error: e.details ?? e.message }), {
      status: httpStatus,
      headers: { "Content-Type": "application/json" },
    });
  }
};
