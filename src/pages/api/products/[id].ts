import type { APIRoute } from "astro";
import { getProductByID, updateProduct } from "@/lib/grpc/productClient";
import { COOKIE_NAME } from "@/lib/auth";

export const GET: APIRoute = async ({ params, cookies }) => {
  const id = params.id ?? "";
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const product = await getProductByID(id, token);
    return Response.json(product);
  } catch (err: any) {
    return Response.json({ error: err.details ?? err.message }, { status: err.code === 5 ? 404 : 503 });
  }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const id = params.id ?? "";
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  try {
    const token = cookies.get(COOKIE_NAME)?.value;
    const body = await request.json();
    const { name, bom } = body;
    if (!name) return Response.json({ error: "name requerido" }, { status: 400 });
    await updateProduct(id, name, bom ?? [], token);
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.details ?? err.message }, { status: err.code === 5 ? 404 : 503 });
  }
};
