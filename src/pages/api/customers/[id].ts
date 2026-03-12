import type { APIRoute } from "astro";
import { getCustomerByID, deactivateCustomer, updateCustomer } from "@/lib/grpc/customerClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ params, cookies }) => {
  const { id } = params;
  if (!id) return Response.json({ error: "id requerido" }, { status: 400 });
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const customer = await getCustomerByID(id, token);
    return Response.json(customer);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.code === 5 ? 404 : 503 });
  }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;
  if (!id) return Response.json({ error: "id requerido" }, { status: 400 });
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { social_reason, market_type, group } = body;
    if (!social_reason) return Response.json({ error: "social_reason requerido" }, { status: 400 });
    const customer = await updateCustomer(id, social_reason, market_type, group, token);
    return Response.json(customer);
  } catch (e: any) {
    return Response.json({ error: e.details ?? e.message }, { status: e.code === 5 ? 404 : 503 });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const { id } = params;
  if (!id) return Response.json({ error: "id requerido" }, { status: 400 });
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const customer = await deactivateCustomer(id, token);
    return Response.json(customer);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.code === 5 ? 404 : 503 });
  }
};
